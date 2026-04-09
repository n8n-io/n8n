import FDBTransaction from "./FDBTransaction.js";
import { ConstraintError, InvalidAccessError, InvalidStateError, NotFoundError, TransactionInactiveError } from "./lib/errors.js";
import FakeDOMStringList from "./lib/FakeDOMStringList.js";
import FakeEventTarget from "./lib/FakeEventTarget.js";
import ObjectStore from "./lib/ObjectStore.js";
import validateKeyPath from "./lib/validateKeyPath.js";
import closeConnection from "./lib/closeConnection.js";
// Common first 3 steps of https://www.w3.org/TR/IndexedDB/#dom-idbdatabase-createobjectstore and https://www.w3.org/TR/IndexedDB/#dom-idbdatabase-deleteobjectstore
const confirmActiveVersionchangeTransaction = database => {
  // Let transaction be database’s upgrade transaction if it is not null, or throw an "InvalidStateError" DOMException otherwise.
  let transaction;
  if (database._runningVersionchangeTransaction) {
    // Find the latest versionchange transaction
    transaction = database._rawDatabase.transactions.findLast(tx => {
      return tx.mode === "versionchange";
    });
  }
  if (!transaction) {
    throw new InvalidStateError();
  }

  // If transaction’s state is not active, then throw a "TransactionInactiveError" DOMException.
  if (transaction._state !== "active") {
    throw new TransactionInactiveError();
  }
  return transaction;
};

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#database-interface
class FDBDatabase extends FakeEventTarget {
  _closePending = false;
  _closed = false;
  _runningVersionchangeTransaction = false;
  constructor(rawDatabase) {
    super();
    this._rawDatabase = rawDatabase;
    this._rawDatabase.connections.push(this);
    this.name = rawDatabase.name;
    this.version = rawDatabase.version;
    this.objectStoreNames = new FakeDOMStringList(...Array.from(rawDatabase.rawObjectStores.keys()).sort());
  }

  // http://w3c.github.io/IndexedDB/#dom-idbdatabase-createobjectstore
  createObjectStore(name, options = {}) {
    if (name === undefined) {
      throw new TypeError();
    }
    const transaction = confirmActiveVersionchangeTransaction(this);
    const keyPath = options !== null && options.keyPath !== undefined ? options.keyPath : null;
    const autoIncrement = options !== null && options.autoIncrement !== undefined ? options.autoIncrement : false;
    if (keyPath !== null) {
      validateKeyPath(keyPath);
    }
    if (this._rawDatabase.rawObjectStores.has(name)) {
      throw new ConstraintError();
    }
    if (autoIncrement && (keyPath === "" || Array.isArray(keyPath))) {
      throw new InvalidAccessError();
    }

    // Save for rollbackLog
    const objectStoreNames = [...this.objectStoreNames];
    const transactionObjectStoreNames = [...transaction.objectStoreNames];
    const rawObjectStore = new ObjectStore(this._rawDatabase, name, keyPath, autoIncrement);
    this.objectStoreNames._push(name);
    this.objectStoreNames._sort();
    transaction._scope.add(name);
    transaction._createdObjectStores.add(rawObjectStore);
    this._rawDatabase.rawObjectStores.set(name, rawObjectStore);
    transaction.objectStoreNames = new FakeDOMStringList(...this.objectStoreNames);
    transaction._rollbackLog.push(() => {
      rawObjectStore.deleted = true;
      this.objectStoreNames = new FakeDOMStringList(...objectStoreNames);
      transaction.objectStoreNames = new FakeDOMStringList(...transactionObjectStoreNames);
      transaction._scope.delete(rawObjectStore.name);
      this._rawDatabase.rawObjectStores.delete(rawObjectStore.name);
    });
    return transaction.objectStore(name);
  }

  // https://www.w3.org/TR/IndexedDB/#dom-idbdatabase-deleteobjectstore
  deleteObjectStore(name) {
    if (name === undefined) {
      throw new TypeError();
    }
    const transaction = confirmActiveVersionchangeTransaction(this);

    // Let store be the object store named name in database, or throw a "NotFoundError" DOMException if none.
    const store = this._rawDatabase.rawObjectStores.get(name);
    if (store === undefined) {
      throw new NotFoundError();
    }

    // Remove store from this’s object store set.
    // This method synchronously modifies the objectStoreNames property on the IDBDatabase instance on which it was called.
    this.objectStoreNames = new FakeDOMStringList(...Array.from(this.objectStoreNames).filter(objectStoreName => {
      return objectStoreName !== name;
    }));
    transaction.objectStoreNames = new FakeDOMStringList(...this.objectStoreNames);

    // If there is an object store handle associated with store and transaction, remove all entries from its index set.
    const objectStore = transaction._objectStoresCache.get(name);
    let prevIndexNames;
    if (objectStore) {
      prevIndexNames = [...objectStore.indexNames];
      objectStore.indexNames = new FakeDOMStringList();
    }
    transaction._rollbackLog.push(() => {
      store.deleted = false;
      this._rawDatabase.rawObjectStores.set(store.name, store);
      this.objectStoreNames._push(store.name);
      transaction.objectStoreNames._push(store.name);
      this.objectStoreNames._sort();
      if (objectStore && prevIndexNames) {
        objectStore.indexNames = new FakeDOMStringList(...prevIndexNames);
      }
    });

    // Destroy store.
    store.deleted = true;
    this._rawDatabase.rawObjectStores.delete(name);
    transaction._objectStoresCache.delete(name);
  }
  transaction(storeNames, mode, options) {
    mode = mode !== undefined ? mode : "readonly";
    if (mode !== "readonly" && mode !== "readwrite" && mode !== "versionchange") {
      throw new TypeError("Invalid mode: " + mode);
    }
    const hasActiveVersionchange = this._rawDatabase.transactions.some(transaction => {
      return transaction._state === "active" && transaction.mode === "versionchange" && transaction.db === this;
    });
    if (hasActiveVersionchange) {
      throw new InvalidStateError();
    }
    if (this._closePending) {
      throw new InvalidStateError();
    }
    if (!Array.isArray(storeNames)) {
      storeNames = [storeNames];
    }
    if (storeNames.length === 0 && mode !== "versionchange") {
      throw new InvalidAccessError();
    }
    for (const storeName of storeNames) {
      if (!this.objectStoreNames.contains(storeName)) {
        throw new NotFoundError("No objectStore named " + storeName + " in this database");
      }
    }

    // the actual algo is more complex but this passes the IDB tests: https://webidl.spec.whatwg.org/#es-dictionary
    const durability = options?.durability ?? "default";
    // invalid enums throw a TypeError: https://webidl.spec.whatwg.org/#es-enumeration
    if (durability !== "default" && durability !== "strict" && durability !== "relaxed") {
      throw new TypeError(
      // based on Firefox's error message
      `'${durability}' (value of 'durability' member of IDBTransactionOptions) ` + `is not a valid value for enumeration IDBTransactionDurability`);
    }
    const tx = new FDBTransaction(storeNames, mode, durability, this);
    this._rawDatabase.transactions.push(tx);
    this._rawDatabase.processTransactions(); // See if can start right away (async)

    return tx;
  }
  close() {
    closeConnection(this);
  }
  get [Symbol.toStringTag]() {
    return "IDBDatabase";
  }
}
export default FDBDatabase;
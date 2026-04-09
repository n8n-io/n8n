"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _FDBTransaction = _interopRequireDefault(require("./FDBTransaction.js"));
var _errors = require("./lib/errors.js");
var _FakeDOMStringList = _interopRequireDefault(require("./lib/FakeDOMStringList.js"));
var _FakeEventTarget = _interopRequireDefault(require("./lib/FakeEventTarget.js"));
var _ObjectStore = _interopRequireDefault(require("./lib/ObjectStore.js"));
var _validateKeyPath = _interopRequireDefault(require("./lib/validateKeyPath.js"));
var _closeConnection = _interopRequireDefault(require("./lib/closeConnection.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
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
    throw new _errors.InvalidStateError();
  }

  // If transaction’s state is not active, then throw a "TransactionInactiveError" DOMException.
  if (transaction._state !== "active") {
    throw new _errors.TransactionInactiveError();
  }
  return transaction;
};

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#database-interface
class FDBDatabase extends _FakeEventTarget.default {
  _closePending = false;
  _closed = false;
  _runningVersionchangeTransaction = false;
  constructor(rawDatabase) {
    super();
    this._rawDatabase = rawDatabase;
    this._rawDatabase.connections.push(this);
    this.name = rawDatabase.name;
    this.version = rawDatabase.version;
    this.objectStoreNames = new _FakeDOMStringList.default(...Array.from(rawDatabase.rawObjectStores.keys()).sort());
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
      (0, _validateKeyPath.default)(keyPath);
    }
    if (this._rawDatabase.rawObjectStores.has(name)) {
      throw new _errors.ConstraintError();
    }
    if (autoIncrement && (keyPath === "" || Array.isArray(keyPath))) {
      throw new _errors.InvalidAccessError();
    }

    // Save for rollbackLog
    const objectStoreNames = [...this.objectStoreNames];
    const transactionObjectStoreNames = [...transaction.objectStoreNames];
    const rawObjectStore = new _ObjectStore.default(this._rawDatabase, name, keyPath, autoIncrement);
    this.objectStoreNames._push(name);
    this.objectStoreNames._sort();
    transaction._scope.add(name);
    transaction._createdObjectStores.add(rawObjectStore);
    this._rawDatabase.rawObjectStores.set(name, rawObjectStore);
    transaction.objectStoreNames = new _FakeDOMStringList.default(...this.objectStoreNames);
    transaction._rollbackLog.push(() => {
      rawObjectStore.deleted = true;
      this.objectStoreNames = new _FakeDOMStringList.default(...objectStoreNames);
      transaction.objectStoreNames = new _FakeDOMStringList.default(...transactionObjectStoreNames);
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
      throw new _errors.NotFoundError();
    }

    // Remove store from this’s object store set.
    // This method synchronously modifies the objectStoreNames property on the IDBDatabase instance on which it was called.
    this.objectStoreNames = new _FakeDOMStringList.default(...Array.from(this.objectStoreNames).filter(objectStoreName => {
      return objectStoreName !== name;
    }));
    transaction.objectStoreNames = new _FakeDOMStringList.default(...this.objectStoreNames);

    // If there is an object store handle associated with store and transaction, remove all entries from its index set.
    const objectStore = transaction._objectStoresCache.get(name);
    let prevIndexNames;
    if (objectStore) {
      prevIndexNames = [...objectStore.indexNames];
      objectStore.indexNames = new _FakeDOMStringList.default();
    }
    transaction._rollbackLog.push(() => {
      store.deleted = false;
      this._rawDatabase.rawObjectStores.set(store.name, store);
      this.objectStoreNames._push(store.name);
      transaction.objectStoreNames._push(store.name);
      this.objectStoreNames._sort();
      if (objectStore && prevIndexNames) {
        objectStore.indexNames = new _FakeDOMStringList.default(...prevIndexNames);
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
      throw new _errors.InvalidStateError();
    }
    if (this._closePending) {
      throw new _errors.InvalidStateError();
    }
    if (!Array.isArray(storeNames)) {
      storeNames = [storeNames];
    }
    if (storeNames.length === 0 && mode !== "versionchange") {
      throw new _errors.InvalidAccessError();
    }
    for (const storeName of storeNames) {
      if (!this.objectStoreNames.contains(storeName)) {
        throw new _errors.NotFoundError("No objectStore named " + storeName + " in this database");
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
    const tx = new _FDBTransaction.default(storeNames, mode, durability, this);
    this._rawDatabase.transactions.push(tx);
    this._rawDatabase.processTransactions(); // See if can start right away (async)

    return tx;
  }
  close() {
    (0, _closeConnection.default)(this);
  }
  get [Symbol.toStringTag]() {
    return "IDBDatabase";
  }
}
var _default = exports.default = FDBDatabase;
module.exports = exports.default;
import FDBCursor from "./FDBCursor.js";
import FDBCursorWithValue from "./FDBCursorWithValue.js";
import FDBIndex from "./FDBIndex.js";
import FDBKeyRange from "./FDBKeyRange.js";
import FDBRequest from "./FDBRequest.js";
import canInjectKey from "./lib/canInjectKey.js";
import enforceRange from "./lib/enforceRange.js";
import { ConstraintError, DataError, InvalidAccessError, InvalidStateError, NotFoundError, ReadOnlyError, TransactionInactiveError } from "./lib/errors.js";
import extractKey from "./lib/extractKey.js";
import FakeDOMStringList from "./lib/FakeDOMStringList.js";
import Index from "./lib/Index.js";
import validateKeyPath from "./lib/validateKeyPath.js";
import valueToKey from "./lib/valueToKey.js";
import valueToKeyRange from "./lib/valueToKeyRange.js";
const confirmActiveTransaction = objectStore => {
  if (objectStore._rawObjectStore.deleted) {
    throw new InvalidStateError();
  }
  if (objectStore.transaction._state !== "active") {
    throw new TransactionInactiveError();
  }
};
const buildRecordAddPut = (objectStore, value, key) => {
  confirmActiveTransaction(objectStore);
  if (objectStore.transaction.mode === "readonly") {
    throw new ReadOnlyError();
  }
  if (objectStore.keyPath !== null) {
    if (key !== undefined) {
      throw new DataError();
    }
  }
  const clone = structuredClone(value);
  if (objectStore.keyPath !== null) {
    const tempKey = extractKey(objectStore.keyPath, clone);
    if (tempKey !== undefined) {
      valueToKey(tempKey);
    } else {
      if (!objectStore._rawObjectStore.keyGenerator) {
        throw new DataError();
      } else if (!canInjectKey(objectStore.keyPath, clone)) {
        throw new DataError();
      }
    }
  }
  if (objectStore.keyPath === null && objectStore._rawObjectStore.keyGenerator === null && key === undefined) {
    throw new DataError();
  }
  if (key !== undefined) {
    key = valueToKey(key);
  }
  return {
    key,
    value: clone
  };
};

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#object-store
class FDBObjectStore {
  _indexesCache = new Map();
  constructor(transaction, rawObjectStore) {
    this._rawObjectStore = rawObjectStore;
    this._name = rawObjectStore.name;
    this.keyPath = rawObjectStore.keyPath;
    this.autoIncrement = rawObjectStore.autoIncrement;
    this.transaction = transaction;
    this.indexNames = new FakeDOMStringList(...Array.from(rawObjectStore.rawIndexes.keys()).sort());
  }
  get name() {
    return this._name;
  }

  // http://w3c.github.io/IndexedDB/#dom-idbobjectstore-name
  set name(name) {
    const transaction = this.transaction;
    if (!transaction.db._runningVersionchangeTransaction) {
      throw new InvalidStateError();
    }
    confirmActiveTransaction(this);
    name = String(name);
    if (name === this._name) {
      return;
    }
    if (this._rawObjectStore.rawDatabase.rawObjectStores.has(name)) {
      throw new ConstraintError();
    }
    const oldName = this._name;
    const oldObjectStoreNames = [...transaction.db.objectStoreNames];
    this._name = name;
    this._rawObjectStore.name = name;
    this.transaction._objectStoresCache.delete(oldName);
    this.transaction._objectStoresCache.set(name, this);
    this._rawObjectStore.rawDatabase.rawObjectStores.delete(oldName);
    this._rawObjectStore.rawDatabase.rawObjectStores.set(name, this._rawObjectStore);
    transaction.db.objectStoreNames = new FakeDOMStringList(...Array.from(this._rawObjectStore.rawDatabase.rawObjectStores.keys()).filter(objectStoreName => {
      const objectStore = this._rawObjectStore.rawDatabase.rawObjectStores.get(objectStoreName);
      return objectStore && !objectStore.deleted;
    }).sort());
    const oldScope = new Set(transaction._scope);
    const oldTransactionObjectStoreNames = [...transaction.objectStoreNames];
    this.transaction._scope.delete(oldName);
    transaction._scope.add(name);
    transaction.objectStoreNames = new FakeDOMStringList(...Array.from(transaction._scope).sort());
    transaction._rollbackLog.push(() => {
      this._name = oldName;
      this._rawObjectStore.name = oldName;
      this.transaction._objectStoresCache.delete(name);
      this.transaction._objectStoresCache.set(oldName, this);
      this._rawObjectStore.rawDatabase.rawObjectStores.delete(name);
      this._rawObjectStore.rawDatabase.rawObjectStores.set(oldName, this._rawObjectStore);
      transaction.db.objectStoreNames = new FakeDOMStringList(...oldObjectStoreNames);
      transaction._scope = oldScope;
      transaction.objectStoreNames = new FakeDOMStringList(...oldTransactionObjectStoreNames);
    });
  }
  put(value, key) {
    if (arguments.length === 0) {
      throw new TypeError();
    }
    const record = buildRecordAddPut(this, value, key);
    return this.transaction._execRequestAsync({
      operation: this._rawObjectStore.storeRecord.bind(this._rawObjectStore, record, false, this.transaction._rollbackLog),
      source: this
    });
  }
  add(value, key) {
    if (arguments.length === 0) {
      throw new TypeError();
    }
    const record = buildRecordAddPut(this, value, key);
    return this.transaction._execRequestAsync({
      operation: this._rawObjectStore.storeRecord.bind(this._rawObjectStore, record, true, this.transaction._rollbackLog),
      source: this
    });
  }
  delete(key) {
    if (arguments.length === 0) {
      throw new TypeError();
    }
    confirmActiveTransaction(this);
    if (this.transaction.mode === "readonly") {
      throw new ReadOnlyError();
    }
    if (!(key instanceof FDBKeyRange)) {
      key = valueToKey(key);
    }
    return this.transaction._execRequestAsync({
      operation: this._rawObjectStore.deleteRecord.bind(this._rawObjectStore, key, this.transaction._rollbackLog),
      source: this
    });
  }
  get(key) {
    if (arguments.length === 0) {
      throw new TypeError();
    }
    confirmActiveTransaction(this);
    if (!(key instanceof FDBKeyRange)) {
      key = valueToKey(key);
    }
    return this.transaction._execRequestAsync({
      operation: this._rawObjectStore.getValue.bind(this._rawObjectStore, key),
      source: this
    });
  }

  // http://w3c.github.io/IndexedDB/#dom-idbobjectstore-getall
  getAll(query, count) {
    if (arguments.length > 1 && count !== undefined) {
      count = enforceRange(count, "unsigned long");
    }
    confirmActiveTransaction(this);
    const range = valueToKeyRange(query);
    return this.transaction._execRequestAsync({
      operation: this._rawObjectStore.getAllValues.bind(this._rawObjectStore, range, count),
      source: this
    });
  }

  // http://w3c.github.io/IndexedDB/#dom-idbobjectstore-getkey
  getKey(key) {
    if (arguments.length === 0) {
      throw new TypeError();
    }
    confirmActiveTransaction(this);
    if (!(key instanceof FDBKeyRange)) {
      key = valueToKey(key);
    }
    return this.transaction._execRequestAsync({
      operation: this._rawObjectStore.getKey.bind(this._rawObjectStore, key),
      source: this
    });
  }

  // http://w3c.github.io/IndexedDB/#dom-idbobjectstore-getallkeys
  getAllKeys(query, count) {
    if (arguments.length > 1 && count !== undefined) {
      count = enforceRange(count, "unsigned long");
    }
    confirmActiveTransaction(this);
    const range = valueToKeyRange(query);
    return this.transaction._execRequestAsync({
      operation: this._rawObjectStore.getAllKeys.bind(this._rawObjectStore, range, count),
      source: this
    });
  }
  clear() {
    confirmActiveTransaction(this);
    if (this.transaction.mode === "readonly") {
      throw new ReadOnlyError();
    }
    return this.transaction._execRequestAsync({
      operation: this._rawObjectStore.clear.bind(this._rawObjectStore, this.transaction._rollbackLog),
      source: this
    });
  }
  openCursor(range, direction) {
    confirmActiveTransaction(this);
    if (range === null) {
      range = undefined;
    }
    if (range !== undefined && !(range instanceof FDBKeyRange)) {
      range = FDBKeyRange.only(valueToKey(range));
    }
    const request = new FDBRequest();
    request.source = this;
    request.transaction = this.transaction;
    const cursor = new FDBCursorWithValue(this, range, direction, request);
    return this.transaction._execRequestAsync({
      operation: cursor._iterate.bind(cursor),
      request,
      source: this
    });
  }
  openKeyCursor(range, direction) {
    confirmActiveTransaction(this);
    if (range === null) {
      range = undefined;
    }
    if (range !== undefined && !(range instanceof FDBKeyRange)) {
      range = FDBKeyRange.only(valueToKey(range));
    }
    const request = new FDBRequest();
    request.source = this;
    request.transaction = this.transaction;
    const cursor = new FDBCursor(this, range, direction, request, true);
    return this.transaction._execRequestAsync({
      operation: cursor._iterate.bind(cursor),
      request,
      source: this
    });
  }

  // tslint:-next-line max-line-length
  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBObjectStore-createIndex-IDBIndex-DOMString-name-DOMString-sequence-DOMString--keyPath-IDBIndexParameters-optionalParameters
  createIndex(name, keyPath, optionalParameters = {}) {
    if (arguments.length < 2) {
      throw new TypeError();
    }
    const multiEntry = optionalParameters.multiEntry !== undefined ? optionalParameters.multiEntry : false;
    const unique = optionalParameters.unique !== undefined ? optionalParameters.unique : false;
    if (this.transaction.mode !== "versionchange") {
      throw new InvalidStateError();
    }
    confirmActiveTransaction(this);
    if (this.indexNames.contains(name)) {
      throw new ConstraintError();
    }
    validateKeyPath(keyPath);
    if (Array.isArray(keyPath) && multiEntry) {
      throw new InvalidAccessError();
    }

    // The index that is requested to be created can contain constraints on the data allowed in the index's
    // referenced object store, such as requiring uniqueness of the values referenced by the index's keyPath. If the
    // referenced object store already contains data which violates these constraints, this MUST NOT cause the
    // implementation of createIndex to throw an exception or affect what it returns. The implementation MUST still
    // create and return an IDBIndex object. Instead the implementation must queue up an operation to abort the
    // "versionchange" transaction which was used for the createIndex call.

    const indexNames = [...this.indexNames];
    this.transaction._rollbackLog.push(() => {
      const index2 = this._rawObjectStore.rawIndexes.get(name);
      if (index2) {
        index2.deleted = true;
      }
      this.indexNames = new FakeDOMStringList(...indexNames);
      this._rawObjectStore.rawIndexes.delete(name);
    });
    const index = new Index(this._rawObjectStore, name, keyPath, multiEntry, unique);
    this.indexNames._push(name);
    this.indexNames._sort();
    this._rawObjectStore.rawIndexes.set(name, index);
    index.initialize(this.transaction); // This is async by design

    return new FDBIndex(this, index);
  }

  // https://w3c.github.io/IndexedDB/#dom-idbobjectstore-index
  index(name) {
    if (arguments.length === 0) {
      throw new TypeError();
    }
    if (this._rawObjectStore.deleted || this.transaction._state === "finished") {
      throw new InvalidStateError();
    }
    const index = this._indexesCache.get(name);
    if (index !== undefined) {
      return index;
    }
    const rawIndex = this._rawObjectStore.rawIndexes.get(name);
    if (!this.indexNames.contains(name) || rawIndex === undefined) {
      throw new NotFoundError();
    }
    const index2 = new FDBIndex(this, rawIndex);
    this._indexesCache.set(name, index2);
    return index2;
  }
  deleteIndex(name) {
    if (arguments.length === 0) {
      throw new TypeError();
    }
    if (this.transaction.mode !== "versionchange") {
      throw new InvalidStateError();
    }
    confirmActiveTransaction(this);
    const rawIndex = this._rawObjectStore.rawIndexes.get(name);
    if (rawIndex === undefined) {
      throw new NotFoundError();
    }
    this.transaction._rollbackLog.push(() => {
      rawIndex.deleted = false;
      this._rawObjectStore.rawIndexes.set(name, rawIndex);
      this.indexNames._push(name);
      this.indexNames._sort();
    });
    this.indexNames = new FakeDOMStringList(...Array.from(this.indexNames).filter(indexName => {
      return indexName !== name;
    }));
    rawIndex.deleted = true; // Not sure if this is supposed to happen synchronously

    this.transaction._execRequestAsync({
      operation: () => {
        const rawIndex2 = this._rawObjectStore.rawIndexes.get(name);

        // Hack in case another index is given this name before this async request is processed. It'd be better
        // to have a real unique ID for each index.
        if (rawIndex === rawIndex2) {
          this._rawObjectStore.rawIndexes.delete(name);
        }
      },
      source: this
    });
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBObjectStore-count-IDBRequest-any-key
  count(key) {
    confirmActiveTransaction(this);
    if (key === null) {
      key = undefined;
    }
    if (key !== undefined && !(key instanceof FDBKeyRange)) {
      key = FDBKeyRange.only(valueToKey(key));
    }
    return this.transaction._execRequestAsync({
      operation: () => {
        return this._rawObjectStore.count(key);
      },
      source: this
    });
  }
  toString() {
    return "[object IDBObjectStore]";
  }
}
export default FDBObjectStore;
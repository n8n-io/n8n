import FDBCursor from "./FDBCursor.js";
import FDBCursorWithValue from "./FDBCursorWithValue.js";
import FDBKeyRange from "./FDBKeyRange.js";
import FDBRequest from "./FDBRequest.js";
import enforceRange from "./lib/enforceRange.js";
import { ConstraintError, InvalidStateError, TransactionInactiveError } from "./lib/errors.js";
import FakeDOMStringList from "./lib/FakeDOMStringList.js";
import valueToKey from "./lib/valueToKey.js";
import valueToKeyRange from "./lib/valueToKeyRange.js";
const confirmActiveTransaction = index => {
  if (index._rawIndex.deleted || index.objectStore._rawObjectStore.deleted) {
    throw new InvalidStateError();
  }
  if (index.objectStore.transaction._state !== "active") {
    throw new TransactionInactiveError();
  }
};

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#idl-def-IDBIndex
class FDBIndex {
  constructor(objectStore, rawIndex) {
    this._rawIndex = rawIndex;
    this._name = rawIndex.name;
    this.objectStore = objectStore;
    this.keyPath = rawIndex.keyPath;
    this.multiEntry = rawIndex.multiEntry;
    this.unique = rawIndex.unique;
  }
  get name() {
    return this._name;
  }

  // https://w3c.github.io/IndexedDB/#dom-idbindex-name
  set name(name) {
    const transaction = this.objectStore.transaction;
    if (!transaction.db._runningVersionchangeTransaction) {
      throw new InvalidStateError();
    }
    if (transaction._state !== "active") {
      throw new TransactionInactiveError();
    }
    if (this._rawIndex.deleted || this.objectStore._rawObjectStore.deleted) {
      throw new InvalidStateError();
    }
    name = String(name);
    if (name === this._name) {
      return;
    }
    if (this.objectStore.indexNames.contains(name)) {
      throw new ConstraintError();
    }
    const oldName = this._name;
    const oldIndexNames = [...this.objectStore.indexNames];
    this._name = name;
    this._rawIndex.name = name;
    this.objectStore._indexesCache.delete(oldName);
    this.objectStore._indexesCache.set(name, this);
    this.objectStore._rawObjectStore.rawIndexes.delete(oldName);
    this.objectStore._rawObjectStore.rawIndexes.set(name, this._rawIndex);
    this.objectStore.indexNames = new FakeDOMStringList(...Array.from(this.objectStore._rawObjectStore.rawIndexes.keys()).filter(indexName => {
      const index = this.objectStore._rawObjectStore.rawIndexes.get(indexName);
      return index && !index.deleted;
    }).sort());
    transaction._rollbackLog.push(() => {
      this._name = oldName;
      this._rawIndex.name = oldName;
      this.objectStore._indexesCache.delete(name);
      this.objectStore._indexesCache.set(oldName, this);
      this.objectStore._rawObjectStore.rawIndexes.delete(name);
      this.objectStore._rawObjectStore.rawIndexes.set(oldName, this._rawIndex);
      this.objectStore.indexNames = new FakeDOMStringList(...oldIndexNames);
    });
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBIndex-openCursor-IDBRequest-any-range-IDBCursorDirection-direction
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
    request.transaction = this.objectStore.transaction;
    const cursor = new FDBCursorWithValue(this, range, direction, request);
    return this.objectStore.transaction._execRequestAsync({
      operation: cursor._iterate.bind(cursor),
      request,
      source: this
    });
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBIndex-openKeyCursor-IDBRequest-any-range-IDBCursorDirection-direction
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
    request.transaction = this.objectStore.transaction;
    const cursor = new FDBCursor(this, range, direction, request, true);
    return this.objectStore.transaction._execRequestAsync({
      operation: cursor._iterate.bind(cursor),
      request,
      source: this
    });
  }
  get(key) {
    confirmActiveTransaction(this);
    if (!(key instanceof FDBKeyRange)) {
      key = valueToKey(key);
    }
    return this.objectStore.transaction._execRequestAsync({
      operation: this._rawIndex.getValue.bind(this._rawIndex, key),
      source: this
    });
  }

  // http://w3c.github.io/IndexedDB/#dom-idbindex-getall
  getAll(query, count) {
    if (arguments.length > 1 && count !== undefined) {
      count = enforceRange(count, "unsigned long");
    }
    confirmActiveTransaction(this);
    const range = valueToKeyRange(query);
    return this.objectStore.transaction._execRequestAsync({
      operation: this._rawIndex.getAllValues.bind(this._rawIndex, range, count),
      source: this
    });
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBIndex-getKey-IDBRequest-any-key
  getKey(key) {
    confirmActiveTransaction(this);
    if (!(key instanceof FDBKeyRange)) {
      key = valueToKey(key);
    }
    return this.objectStore.transaction._execRequestAsync({
      operation: this._rawIndex.getKey.bind(this._rawIndex, key),
      source: this
    });
  }

  // http://w3c.github.io/IndexedDB/#dom-idbindex-getallkeys
  getAllKeys(query, count) {
    if (arguments.length > 1 && count !== undefined) {
      count = enforceRange(count, "unsigned long");
    }
    confirmActiveTransaction(this);
    const range = valueToKeyRange(query);
    return this.objectStore.transaction._execRequestAsync({
      operation: this._rawIndex.getAllKeys.bind(this._rawIndex, range, count),
      source: this
    });
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBIndex-count-IDBRequest-any-key
  count(key) {
    confirmActiveTransaction(this);
    if (key === null) {
      key = undefined;
    }
    if (key !== undefined && !(key instanceof FDBKeyRange)) {
      key = FDBKeyRange.only(valueToKey(key));
    }
    return this.objectStore.transaction._execRequestAsync({
      operation: () => {
        return this._rawIndex.count(key);
      },
      source: this
    });
  }
  toString() {
    return "[object IDBIndex]";
  }
}
export default FDBIndex;
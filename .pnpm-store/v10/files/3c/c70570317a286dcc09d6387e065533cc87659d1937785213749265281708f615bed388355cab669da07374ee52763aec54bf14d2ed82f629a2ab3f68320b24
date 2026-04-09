"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _FDBCursor = _interopRequireDefault(require("./FDBCursor.js"));
var _FDBCursorWithValue = _interopRequireDefault(require("./FDBCursorWithValue.js"));
var _FDBKeyRange = _interopRequireDefault(require("./FDBKeyRange.js"));
var _FDBRequest = _interopRequireDefault(require("./FDBRequest.js"));
var _errors = require("./lib/errors.js");
var _FakeDOMStringList = _interopRequireDefault(require("./lib/FakeDOMStringList.js"));
var _valueToKey = _interopRequireDefault(require("./lib/valueToKey.js"));
var _valueToKeyRange = _interopRequireDefault(require("./lib/valueToKeyRange.js"));
var _getKeyPath = require("./lib/getKeyPath.js");
var _extractGetAllOptions = _interopRequireDefault(require("./lib/extractGetAllOptions.js"));
var _enforceRange = _interopRequireDefault(require("./lib/enforceRange.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const confirmActiveTransaction = index => {
  if (index._rawIndex.deleted || index.objectStore._rawObjectStore.deleted) {
    throw new _errors.InvalidStateError();
  }
  if (index.objectStore.transaction._state !== "active") {
    throw new _errors.TransactionInactiveError();
  }
};

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#idl-def-IDBIndex
class FDBIndex {
  constructor(objectStore, rawIndex) {
    this._rawIndex = rawIndex;
    this._name = rawIndex.name;
    this.objectStore = objectStore;
    this.keyPath = (0, _getKeyPath.getKeyPath)(rawIndex.keyPath);
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
      throw transaction._state === "active" ? new _errors.InvalidStateError() : new _errors.TransactionInactiveError();
    }
    if (transaction._state !== "active") {
      throw new _errors.TransactionInactiveError();
    }
    if (this._rawIndex.deleted || this.objectStore._rawObjectStore.deleted) {
      throw new _errors.InvalidStateError();
    }
    name = String(name);
    if (name === this._name) {
      return;
    }
    if (this.objectStore.indexNames.contains(name)) {
      throw new _errors.ConstraintError();
    }
    const oldName = this._name;
    const oldIndexNames = [...this.objectStore.indexNames];
    this._name = name;
    this._rawIndex.name = name;
    this.objectStore._indexesCache.delete(oldName);
    this.objectStore._indexesCache.set(name, this);
    this.objectStore._rawObjectStore.rawIndexes.delete(oldName);
    this.objectStore._rawObjectStore.rawIndexes.set(name, this._rawIndex);
    this.objectStore.indexNames = new _FakeDOMStringList.default(...Array.from(this.objectStore._rawObjectStore.rawIndexes.keys()).filter(indexName => {
      const index = this.objectStore._rawObjectStore.rawIndexes.get(indexName);
      return index && !index.deleted;
    }).sort());

    // https://www.w3.org/TR/IndexedDB/#abort-an-upgrade-transaction - "If handle’s index was not newly created during transaction, set handle’s name to its index’s name."
    if (!this.objectStore.transaction._createdIndexes.has(this._rawIndex)) {
      transaction._rollbackLog.push(() => {
        this._name = oldName;
        this._rawIndex.name = oldName;
        this.objectStore._indexesCache.delete(name);
        this.objectStore._indexesCache.set(oldName, this);
        this.objectStore._rawObjectStore.rawIndexes.delete(name);
        this.objectStore._rawObjectStore.rawIndexes.set(oldName, this._rawIndex);
        this.objectStore.indexNames = new _FakeDOMStringList.default(...oldIndexNames);
      });
    }
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBIndex-openCursor-IDBRequest-any-range-IDBCursorDirection-direction
  openCursor(range, direction) {
    confirmActiveTransaction(this);
    if (range === null) {
      range = undefined;
    }
    if (range !== undefined && !(range instanceof _FDBKeyRange.default)) {
      range = _FDBKeyRange.default.only((0, _valueToKey.default)(range));
    }
    const request = new _FDBRequest.default();
    request.source = this;
    request.transaction = this.objectStore.transaction;
    const cursor = new _FDBCursorWithValue.default(this, range, direction, request);
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
    if (range !== undefined && !(range instanceof _FDBKeyRange.default)) {
      range = _FDBKeyRange.default.only((0, _valueToKey.default)(range));
    }
    const request = new _FDBRequest.default();
    request.source = this;
    request.transaction = this.objectStore.transaction;
    const cursor = new _FDBCursor.default(this, range, direction, request, true);
    return this.objectStore.transaction._execRequestAsync({
      operation: cursor._iterate.bind(cursor),
      request,
      source: this
    });
  }
  get(key) {
    confirmActiveTransaction(this);
    if (!(key instanceof _FDBKeyRange.default)) {
      key = (0, _valueToKey.default)(key);
    }
    return this.objectStore.transaction._execRequestAsync({
      operation: this._rawIndex.getValue.bind(this._rawIndex, key),
      source: this
    });
  }

  // http://w3c.github.io/IndexedDB/#dom-idbindex-getall
  getAll(queryOrOptions, count) {
    const options = (0, _extractGetAllOptions.default)(queryOrOptions, count, arguments.length);
    confirmActiveTransaction(this);
    const range = (0, _valueToKeyRange.default)(options.query);
    return this.objectStore.transaction._execRequestAsync({
      operation: this._rawIndex.getAllValues.bind(this._rawIndex, range, options.count, options.direction),
      source: this
    });
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBIndex-getKey-IDBRequest-any-key
  getKey(key) {
    confirmActiveTransaction(this);
    if (!(key instanceof _FDBKeyRange.default)) {
      key = (0, _valueToKey.default)(key);
    }
    return this.objectStore.transaction._execRequestAsync({
      operation: this._rawIndex.getKey.bind(this._rawIndex, key),
      source: this
    });
  }

  // http://w3c.github.io/IndexedDB/#dom-idbindex-getallkeys
  getAllKeys(queryOrOptions, count) {
    const options = (0, _extractGetAllOptions.default)(queryOrOptions, count, arguments.length);
    confirmActiveTransaction(this);
    const range = (0, _valueToKeyRange.default)(options.query);
    return this.objectStore.transaction._execRequestAsync({
      operation: this._rawIndex.getAllKeys.bind(this._rawIndex, range, options.count, options.direction),
      source: this
    });
  }

  // https://www.w3.org/TR/IndexedDB/#dom-idbobjectstore-getallrecords
  getAllRecords(options) {
    let query;
    let count;
    let direction;
    if (options !== undefined) {
      if (options.query !== undefined) {
        query = options.query;
      }
      if (options.count !== undefined) {
        count = (0, _enforceRange.default)(options.count, "unsigned long");
      }
      if (options.direction !== undefined) {
        direction = options.direction;
      }
    }
    confirmActiveTransaction(this);
    const range = (0, _valueToKeyRange.default)(query);
    return this.objectStore.transaction._execRequestAsync({
      operation: this._rawIndex.getAllRecords.bind(this._rawIndex, range, count, direction),
      source: this
    });
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBIndex-count-IDBRequest-any-key
  count(key) {
    confirmActiveTransaction(this);
    if (key === null) {
      key = undefined;
    }
    if (key !== undefined && !(key instanceof _FDBKeyRange.default)) {
      key = _FDBKeyRange.default.only((0, _valueToKey.default)(key));
    }
    return this.objectStore.transaction._execRequestAsync({
      operation: () => {
        return this._rawIndex.count(key);
      },
      source: this
    });
  }
  get [Symbol.toStringTag]() {
    return "IDBIndex";
  }
}
var _default = exports.default = FDBIndex;
module.exports = exports.default;
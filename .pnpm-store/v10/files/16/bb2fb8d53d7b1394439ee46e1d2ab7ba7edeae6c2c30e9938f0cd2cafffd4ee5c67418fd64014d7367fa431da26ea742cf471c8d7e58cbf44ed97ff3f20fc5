"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _FDBKeyRange = _interopRequireDefault(require("./FDBKeyRange.js"));
var _FDBObjectStore = _interopRequireDefault(require("./FDBObjectStore.js"));
var _cmp = _interopRequireDefault(require("./lib/cmp.js"));
var _errors = require("./lib/errors.js");
var _extractKey = _interopRequireDefault(require("./lib/extractKey.js"));
var _valueToKey = _interopRequireDefault(require("./lib/valueToKey.js"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const getEffectiveObjectStore = cursor => {
  if (cursor.source instanceof _FDBObjectStore.default) {
    return cursor.source;
  }
  return cursor.source.objectStore;
};

// This takes a key range, a list of lower bounds, and a list of upper bounds and combines them all into a single key
// range. It does not handle gt/gte distinctions, because it doesn't really matter much anyway, since for next/prev
// cursor iteration it'd also have to look at values to be precise, which would be complicated. This should get us 99%
// of the way there.
const makeKeyRange = (range, lowers, uppers) => {
  // Start with bounds from range
  let lower = range !== undefined ? range.lower : undefined;
  let upper = range !== undefined ? range.upper : undefined;

  // Augment with values from lowers and uppers
  for (const lowerTemp of lowers) {
    if (lowerTemp === undefined) {
      continue;
    }
    if (lower === undefined || (0, _cmp.default)(lower, lowerTemp) === 1) {
      lower = lowerTemp;
    }
  }
  for (const upperTemp of uppers) {
    if (upperTemp === undefined) {
      continue;
    }
    if (upper === undefined || (0, _cmp.default)(upper, upperTemp) === -1) {
      upper = upperTemp;
    }
  }
  if (lower !== undefined && upper !== undefined) {
    return _FDBKeyRange.default.bound(lower, upper);
  }
  if (lower !== undefined) {
    return _FDBKeyRange.default.lowerBound(lower);
  }
  if (upper !== undefined) {
    return _FDBKeyRange.default.upperBound(upper);
  }
};

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#cursor
class FDBCursor {
  _gotValue = false;
  _position = undefined; // Key of previously returned record
  _objectStorePosition = undefined;
  _keyOnly = false;
  _key = undefined;
  _primaryKey = undefined;
  constructor(source, range, direction = "next", request, keyOnly = false) {
    this._range = range;
    this._source = source;
    this._direction = direction;
    this._request = request;
    this._keyOnly = keyOnly;
  }

  // Read only properties
  get source() {
    return this._source;
  }
  set source(val) {
    /* For babel */
  }
  get request() {
    return this._request;
  }
  set request(val) {
    /* For babel */
  }
  get direction() {
    return this._direction;
  }
  set direction(val) {
    /* For babel */
  }
  get key() {
    return this._key;
  }
  set key(val) {
    /* For babel */
  }
  get primaryKey() {
    return this._primaryKey;
  }
  set primaryKey(val) {
    /* For babel */
  }

  // https://w3c.github.io/IndexedDB/#iterate-a-cursor
  _iterate(key, primaryKey) {
    const sourceIsObjectStore = this.source instanceof _FDBObjectStore.default;

    // Can't use sourceIsObjectStore because TypeScript
    const records = this.source instanceof _FDBObjectStore.default ? this.source._rawObjectStore.records : this.source._rawIndex.records;
    let foundRecord;
    if (this.direction === "next") {
      const range = makeKeyRange(this._range, [key, this._position], []);
      for (const record of records.values(range)) {
        const cmpResultKey = key !== undefined ? (0, _cmp.default)(record.key, key) : undefined;
        const cmpResultPosition = this._position !== undefined ? (0, _cmp.default)(record.key, this._position) : undefined;
        if (key !== undefined) {
          if (cmpResultKey === -1) {
            continue;
          }
        }
        if (primaryKey !== undefined) {
          if (cmpResultKey === -1) {
            continue;
          }
          const cmpResultPrimaryKey = (0, _cmp.default)(record.value, primaryKey);
          if (cmpResultKey === 0 && cmpResultPrimaryKey === -1) {
            continue;
          }
        }
        if (this._position !== undefined && sourceIsObjectStore) {
          if (cmpResultPosition !== 1) {
            continue;
          }
        }
        if (this._position !== undefined && !sourceIsObjectStore) {
          if (cmpResultPosition === -1) {
            continue;
          }
          if (cmpResultPosition === 0 && (0, _cmp.default)(record.value, this._objectStorePosition) !== 1) {
            continue;
          }
        }
        if (this._range !== undefined) {
          if (!this._range.includes(record.key)) {
            continue;
          }
        }
        foundRecord = record;
        break;
      }
    } else if (this.direction === "nextunique") {
      // This could be done without iterating, if the range was defined slightly better (to handle gt/gte cases).
      // But the performance difference should be small, and that wouldn't work anyway for directions where the
      // value needs to be used (like next and prev).
      const range = makeKeyRange(this._range, [key, this._position], []);
      for (const record of records.values(range)) {
        if (key !== undefined) {
          if ((0, _cmp.default)(record.key, key) === -1) {
            continue;
          }
        }
        if (this._position !== undefined) {
          if ((0, _cmp.default)(record.key, this._position) !== 1) {
            continue;
          }
        }
        if (this._range !== undefined) {
          if (!this._range.includes(record.key)) {
            continue;
          }
        }
        foundRecord = record;
        break;
      }
    } else if (this.direction === "prev") {
      const range = makeKeyRange(this._range, [], [key, this._position]);
      for (const record of records.values(range, "prev")) {
        const cmpResultKey = key !== undefined ? (0, _cmp.default)(record.key, key) : undefined;
        const cmpResultPosition = this._position !== undefined ? (0, _cmp.default)(record.key, this._position) : undefined;
        if (key !== undefined) {
          if (cmpResultKey === 1) {
            continue;
          }
        }
        if (primaryKey !== undefined) {
          if (cmpResultKey === 1) {
            continue;
          }
          const cmpResultPrimaryKey = (0, _cmp.default)(record.value, primaryKey);
          if (cmpResultKey === 0 && cmpResultPrimaryKey === 1) {
            continue;
          }
        }
        if (this._position !== undefined && sourceIsObjectStore) {
          if (cmpResultPosition !== -1) {
            continue;
          }
        }
        if (this._position !== undefined && !sourceIsObjectStore) {
          if (cmpResultPosition === 1) {
            continue;
          }
          if (cmpResultPosition === 0 && (0, _cmp.default)(record.value, this._objectStorePosition) !== -1) {
            continue;
          }
        }
        if (this._range !== undefined) {
          if (!this._range.includes(record.key)) {
            continue;
          }
        }
        foundRecord = record;
        break;
      }
    } else if (this.direction === "prevunique") {
      let tempRecord;
      const range = makeKeyRange(this._range, [], [key, this._position]);
      for (const record of records.values(range, "prev")) {
        if (key !== undefined) {
          if ((0, _cmp.default)(record.key, key) === 1) {
            continue;
          }
        }
        if (this._position !== undefined) {
          if ((0, _cmp.default)(record.key, this._position) !== -1) {
            continue;
          }
        }
        if (this._range !== undefined) {
          if (!this._range.includes(record.key)) {
            continue;
          }
        }
        tempRecord = record;
        break;
      }
      if (tempRecord) {
        foundRecord = records.get(tempRecord.key);
      }
    }
    let result;
    if (!foundRecord) {
      this._key = undefined;
      if (!sourceIsObjectStore) {
        this._objectStorePosition = undefined;
      }

      // "this instanceof FDBCursorWithValue" would be better and not require (this as any), but causes runtime
      // error due to circular dependency.
      if (!this._keyOnly && this.toString() === "[object IDBCursorWithValue]") {
        this.value = undefined;
      }
      result = null;
    } else {
      this._position = foundRecord.key;
      if (!sourceIsObjectStore) {
        this._objectStorePosition = foundRecord.value;
      }
      this._key = foundRecord.key;
      if (sourceIsObjectStore) {
        this._primaryKey = structuredClone(foundRecord.key);
        if (!this._keyOnly && this.toString() === "[object IDBCursorWithValue]") {
          this.value = structuredClone(foundRecord.value);
        }
      } else {
        this._primaryKey = structuredClone(foundRecord.value);
        if (!this._keyOnly && this.toString() === "[object IDBCursorWithValue]") {
          if (this.source instanceof _FDBObjectStore.default) {
            // Can't use sourceIsObjectStore because TypeScript
            throw new Error("This should never happen");
          }
          const value = this.source.objectStore._rawObjectStore.getValue(foundRecord.value);
          this.value = structuredClone(value);
        }
      }
      this._gotValue = true;
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      result = this;
    }
    return result;
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBCursor-update-IDBRequest-any-value
  update(value) {
    if (value === undefined) {
      throw new TypeError();
    }
    const effectiveObjectStore = getEffectiveObjectStore(this);
    const effectiveKey = Object.hasOwn(this.source, "_rawIndex") ? this.primaryKey : this._position;
    const transaction = effectiveObjectStore.transaction;
    if (transaction._state !== "active") {
      throw new _errors.TransactionInactiveError();
    }
    if (transaction.mode === "readonly") {
      throw new _errors.ReadOnlyError();
    }
    if (effectiveObjectStore._rawObjectStore.deleted) {
      throw new _errors.InvalidStateError();
    }
    if (!(this.source instanceof _FDBObjectStore.default) && this.source._rawIndex.deleted) {
      throw new _errors.InvalidStateError();
    }
    if (!this._gotValue || !Object.hasOwn(this, "value")) {
      throw new _errors.InvalidStateError();
    }
    const clone = structuredClone(value);
    if (effectiveObjectStore.keyPath !== null) {
      let tempKey;
      try {
        tempKey = (0, _extractKey.default)(effectiveObjectStore.keyPath, clone);
      } catch (err) {
        /* Handled immediately below */
      }
      if ((0, _cmp.default)(tempKey, effectiveKey) !== 0) {
        throw new _errors.DataError();
      }
    }
    const record = {
      key: effectiveKey,
      value: clone
    };
    return transaction._execRequestAsync({
      operation: effectiveObjectStore._rawObjectStore.storeRecord.bind(effectiveObjectStore._rawObjectStore, record, false, transaction._rollbackLog),
      source: this
    });
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBCursor-advance-void-unsigned-long-count
  advance(count) {
    if (!Number.isInteger(count) || count <= 0) {
      throw new TypeError();
    }
    const effectiveObjectStore = getEffectiveObjectStore(this);
    const transaction = effectiveObjectStore.transaction;
    if (transaction._state !== "active") {
      throw new _errors.TransactionInactiveError();
    }
    if (effectiveObjectStore._rawObjectStore.deleted) {
      throw new _errors.InvalidStateError();
    }
    if (!(this.source instanceof _FDBObjectStore.default) && this.source._rawIndex.deleted) {
      throw new _errors.InvalidStateError();
    }
    if (!this._gotValue) {
      throw new _errors.InvalidStateError();
    }
    if (this._request) {
      this._request.readyState = "pending";
    }
    transaction._execRequestAsync({
      operation: () => {
        let result;
        for (let i = 0; i < count; i++) {
          result = this._iterate();

          // Not sure why this is needed
          if (!result) {
            break;
          }
        }
        return result;
      },
      request: this._request,
      source: this.source
    });
    this._gotValue = false;
  }

  // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBCursor-continue-void-any-key
  continue(key) {
    const effectiveObjectStore = getEffectiveObjectStore(this);
    const transaction = effectiveObjectStore.transaction;
    if (transaction._state !== "active") {
      throw new _errors.TransactionInactiveError();
    }
    if (effectiveObjectStore._rawObjectStore.deleted) {
      throw new _errors.InvalidStateError();
    }
    if (!(this.source instanceof _FDBObjectStore.default) && this.source._rawIndex.deleted) {
      throw new _errors.InvalidStateError();
    }
    if (!this._gotValue) {
      throw new _errors.InvalidStateError();
    }
    if (key !== undefined) {
      key = (0, _valueToKey.default)(key);
      const cmpResult = (0, _cmp.default)(key, this._position);
      if (cmpResult <= 0 && (this.direction === "next" || this.direction === "nextunique") || cmpResult >= 0 && (this.direction === "prev" || this.direction === "prevunique")) {
        throw new _errors.DataError();
      }
    }
    if (this._request) {
      this._request.readyState = "pending";
    }
    transaction._execRequestAsync({
      operation: this._iterate.bind(this, key),
      request: this._request,
      source: this.source
    });
    this._gotValue = false;
  }

  // hthttps://w3c.github.io/IndexedDB/#dom-idbcursor-continueprimarykey
  continuePrimaryKey(key, primaryKey) {
    const effectiveObjectStore = getEffectiveObjectStore(this);
    const transaction = effectiveObjectStore.transaction;
    if (transaction._state !== "active") {
      throw new _errors.TransactionInactiveError();
    }
    if (effectiveObjectStore._rawObjectStore.deleted) {
      throw new _errors.InvalidStateError();
    }
    if (!(this.source instanceof _FDBObjectStore.default) && this.source._rawIndex.deleted) {
      throw new _errors.InvalidStateError();
    }
    if (this.source instanceof _FDBObjectStore.default || this.direction !== "next" && this.direction !== "prev") {
      throw new _errors.InvalidAccessError();
    }
    if (!this._gotValue) {
      throw new _errors.InvalidStateError();
    }

    // Not sure about this
    if (key === undefined || primaryKey === undefined) {
      throw new _errors.DataError();
    }
    key = (0, _valueToKey.default)(key);
    const cmpResult = (0, _cmp.default)(key, this._position);
    if (cmpResult === -1 && this.direction === "next" || cmpResult === 1 && this.direction === "prev") {
      throw new _errors.DataError();
    }
    const cmpResult2 = (0, _cmp.default)(primaryKey, this._objectStorePosition);
    if (cmpResult === 0) {
      if (cmpResult2 <= 0 && this.direction === "next" || cmpResult2 >= 0 && this.direction === "prev") {
        throw new _errors.DataError();
      }
    }
    if (this._request) {
      this._request.readyState = "pending";
    }
    transaction._execRequestAsync({
      operation: this._iterate.bind(this, key, primaryKey),
      request: this._request,
      source: this.source
    });
    this._gotValue = false;
  }
  delete() {
    const effectiveObjectStore = getEffectiveObjectStore(this);
    const effectiveKey = Object.hasOwn(this.source, "_rawIndex") ? this.primaryKey : this._position;
    const transaction = effectiveObjectStore.transaction;
    if (transaction._state !== "active") {
      throw new _errors.TransactionInactiveError();
    }
    if (transaction.mode === "readonly") {
      throw new _errors.ReadOnlyError();
    }
    if (effectiveObjectStore._rawObjectStore.deleted) {
      throw new _errors.InvalidStateError();
    }
    if (!(this.source instanceof _FDBObjectStore.default) && this.source._rawIndex.deleted) {
      throw new _errors.InvalidStateError();
    }
    if (!this._gotValue || !Object.hasOwn(this, "value")) {
      throw new _errors.InvalidStateError();
    }
    return transaction._execRequestAsync({
      operation: effectiveObjectStore._rawObjectStore.deleteRecord.bind(effectiveObjectStore._rawObjectStore, effectiveKey, transaction._rollbackLog),
      source: this
    });
  }
  toString() {
    return "[object IDBCursor]";
  }
}
var _default = exports.default = FDBCursor;
module.exports = exports.default;
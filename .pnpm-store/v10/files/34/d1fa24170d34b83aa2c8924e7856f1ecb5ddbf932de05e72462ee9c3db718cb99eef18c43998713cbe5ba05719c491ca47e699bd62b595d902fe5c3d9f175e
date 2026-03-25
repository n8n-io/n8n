"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _FDBKeyRange = _interopRequireDefault(require("../FDBKeyRange.js"));
var _binarySearch = require("./binarySearch.js");
var _cmp = _interopRequireDefault(require("./cmp.js"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
class RecordStore {
  records = [];
  get(key) {
    if (key instanceof _FDBKeyRange.default) {
      return (0, _binarySearch.getByKeyRange)(this.records, key);
    }
    return (0, _binarySearch.getByKey)(this.records, key);
  }
  add(newRecord) {
    // Find where to put it so it's sorted by key
    let i;
    if (this.records.length === 0) {
      i = 0;
    } else {
      i = (0, _binarySearch.getIndexByKeyGTE)(this.records, newRecord.key);
      if (i === -1) {
        // If no matching key, add to end
        i = this.records.length;
      } else {
        // If matching key, advance to appropriate position based on value (used in indexes)
        while (i < this.records.length && (0, _cmp.default)(this.records[i].key, newRecord.key) === 0) {
          if ((0, _cmp.default)(this.records[i].value, newRecord.value) !== -1) {
            // Record value >= newRecord value, so insert here
            break;
          }
          i += 1; // Look at next record
        }
      }
    }
    this.records.splice(i, 0, newRecord);
  }
  delete(key) {
    const deletedRecords = [];
    const isRange = key instanceof _FDBKeyRange.default;
    while (true) {
      const idx = isRange ? (0, _binarySearch.getIndexByKeyRange)(this.records, key) : (0, _binarySearch.getIndexByKey)(this.records, key);
      if (idx === -1) {
        break;
      }
      deletedRecords.push(this.records[idx]);
      this.records.splice(idx, 1);
    }
    return deletedRecords;
  }
  deleteByValue(key) {
    const range = key instanceof _FDBKeyRange.default ? key : _FDBKeyRange.default.only(key);
    const deletedRecords = [];
    this.records = this.records.filter(record => {
      const shouldDelete = range.includes(record.value);
      if (shouldDelete) {
        deletedRecords.push(record);
      }
      return !shouldDelete;
    });
    return deletedRecords;
  }
  clear() {
    const deletedRecords = this.records.slice();
    this.records = [];
    return deletedRecords;
  }
  values(range, direction = "next") {
    return {
      [Symbol.iterator]: () => {
        let i;
        if (direction === "next") {
          i = 0;
          if (range !== undefined && range.lower !== undefined) {
            while (this.records[i] !== undefined) {
              const cmpResult = (0, _cmp.default)(this.records[i].key, range.lower);
              if (cmpResult === 1 || cmpResult === 0 && !range.lowerOpen) {
                break;
              }
              i += 1;
            }
          }
        } else {
          i = this.records.length - 1;
          if (range !== undefined && range.upper !== undefined) {
            while (this.records[i] !== undefined) {
              const cmpResult = (0, _cmp.default)(this.records[i].key, range.upper);
              if (cmpResult === -1 || cmpResult === 0 && !range.upperOpen) {
                break;
              }
              i -= 1;
            }
          }
        }
        return {
          next: () => {
            let done;
            let value;
            if (direction === "next") {
              value = this.records[i];
              done = i >= this.records.length;
              i += 1;
              if (!done && range !== undefined && range.upper !== undefined) {
                const cmpResult = (0, _cmp.default)(value.key, range.upper);
                done = cmpResult === 1 || cmpResult === 0 && range.upperOpen;
                if (done) {
                  value = undefined;
                }
              }
            } else {
              value = this.records[i];
              done = i < 0;
              i -= 1;
              if (!done && range !== undefined && range.lower !== undefined) {
                const cmpResult = (0, _cmp.default)(value.key, range.lower);
                done = cmpResult === -1 || cmpResult === 0 && range.lowerOpen;
                if (done) {
                  value = undefined;
                }
              }
            }

            // The weird "as IteratorResult<Record>" is needed because of
            // https://github.com/Microsoft/TypeScript/issues/11375 and
            // https://github.com/Microsoft/TypeScript/issues/2983
            return {
              done,
              value
            };
          }
        };
      }
    };
  }
}
var _default = exports.default = RecordStore;
module.exports = exports.default;
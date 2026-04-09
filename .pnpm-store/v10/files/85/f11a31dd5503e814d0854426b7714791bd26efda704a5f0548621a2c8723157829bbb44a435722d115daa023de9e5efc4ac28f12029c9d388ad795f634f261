"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _isPotentiallyValidKeyRange = _interopRequireDefault(require("./isPotentiallyValidKeyRange.js"));
var _enforceRange = _interopRequireDefault(require("./enforceRange.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// https://www.w3.org/TR/IndexedDB/#create-request-to-retrieve-multiple-items
const extractGetAllOptions = (queryOrOptions, count, numArguments) => {
  let query;
  let direction;
  if (queryOrOptions === undefined || queryOrOptions === null || (0, _isPotentiallyValidKeyRange.default)(queryOrOptions)) {
    // queryOrOptions is FDBKeyRange | Key | null | undefined
    query = queryOrOptions;
    if (numArguments > 1 && count !== undefined) {
      count = (0, _enforceRange.default)(count, "unsigned long");
    }
  } else {
    // queryOrOptions is FDBGetAllOptions
    const getAllOptions = queryOrOptions;
    if (getAllOptions.query !== undefined) {
      query = getAllOptions.query;
    }
    if (getAllOptions.count !== undefined) {
      count = (0, _enforceRange.default)(getAllOptions.count, "unsigned long");
    }
    if (getAllOptions.direction !== undefined) {
      direction = getAllOptions.direction;
    }
  }
  return {
    query,
    count,
    direction
  };
};
var _default = exports.default = extractGetAllOptions;
module.exports = exports.default;
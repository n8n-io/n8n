'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var lodashUnified = require('lodash-unified');
var shared = require('@vue/shared');

const keysOf = (arr) => Object.keys(arr);
const entriesOf = (arr) => Object.entries(arr);
const getProp = (obj, path, defaultValue) => {
  return {
    get value() {
      return lodashUnified.get(obj, path, defaultValue);
    },
    set value(val) {
      lodashUnified.set(obj, path, val);
    }
  };
};

Object.defineProperty(exports, 'hasOwn', {
  enumerable: true,
  get: function () { return shared.hasOwn; }
});
exports.entriesOf = entriesOf;
exports.getProp = getProp;
exports.keysOf = keysOf;
//# sourceMappingURL=objects.js.map

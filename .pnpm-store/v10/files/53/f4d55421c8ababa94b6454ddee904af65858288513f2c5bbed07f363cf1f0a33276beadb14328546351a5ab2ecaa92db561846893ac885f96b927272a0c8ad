"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  addUniqueNumber: true,
  generateUniqueNumber: true
};
exports.generateUniqueNumber = exports.addUniqueNumber = void 0;
var _addUniqueNumber = require("./factories/add-unique-number");
var _cache = require("./factories/cache");
var _generateUniqueNumber = require("./factories/generate-unique-number");
var _index = require("./types/index");
Object.keys(_index).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _index[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _index[key];
    }
  });
});
/*
 * @todo Explicitly referencing the barrel file seems to be necessary when enabling the
 * isolatedModules compiler option.
 */

const LAST_NUMBER_WEAK_MAP = new WeakMap();
const cache = (0, _cache.createCache)(LAST_NUMBER_WEAK_MAP);
const generateUniqueNumber = exports.generateUniqueNumber = (0, _generateUniqueNumber.createGenerateUniqueNumber)(cache, LAST_NUMBER_WEAK_MAP);
const addUniqueNumber = exports.addUniqueNumber = (0, _addUniqueNumber.createAddUniqueNumber)(generateUniqueNumber);
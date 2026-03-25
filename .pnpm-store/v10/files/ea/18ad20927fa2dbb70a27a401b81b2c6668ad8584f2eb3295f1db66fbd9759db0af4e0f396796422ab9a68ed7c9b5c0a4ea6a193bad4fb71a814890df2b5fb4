"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = exports.IS_READ_ONLY = exports.FIRST_KEY_INDEX = void 0;
const generic_transformers_1 = require("./generic-transformers");
var GEORADIUS_1 = require("./GEORADIUS");
Object.defineProperty(exports, "FIRST_KEY_INDEX", { enumerable: true, get: function () { return GEORADIUS_1.FIRST_KEY_INDEX; } });
Object.defineProperty(exports, "IS_READ_ONLY", { enumerable: true, get: function () { return GEORADIUS_1.IS_READ_ONLY; } });
function transformArguments(key, coordinates, radius, unit, destination, options) {
    return (0, generic_transformers_1.pushGeoRadiusStoreArguments)(['GEORADIUS'], key, coordinates, radius, unit, destination, options);
}
exports.transformArguments = transformArguments;

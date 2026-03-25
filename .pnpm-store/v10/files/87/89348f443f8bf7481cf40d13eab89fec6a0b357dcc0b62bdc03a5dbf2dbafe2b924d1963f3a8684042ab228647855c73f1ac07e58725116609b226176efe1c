"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalize = exports.parse = exports.stringify = void 0;
/* eslint-disable no-redeclare */
var fast_json_stable_stringify_1 = __importDefault(require("fast-json-stable-stringify"));
var UNDEFINED = 'undefined';
function stringify(input) {
    return input === undefined ? UNDEFINED : (0, fast_json_stable_stringify_1.default)(input);
}
exports.stringify = stringify;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parse(input) {
    return input === UNDEFINED ? undefined : JSON.parse(input);
}
exports.parse = parse;
/**
 * @internal
 */
function normalize(input, _a) {
    var _b = _a === void 0 ? {} : _a, _c = _b.parse, parser = _c === void 0 ? parse : _c;
    var result;
    if (normalize.cache.has(input)) {
        result = normalize.cache.get(input);
    }
    else {
        var data = parser(input);
        result = stringify(data);
        if (result === input)
            result = undefined;
        normalize.cache.set(input, result);
    }
    return result === undefined ? input : result;
}
exports.normalize = normalize;
/**
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
(function (normalize) {
    normalize.cache = new Map();
})(normalize || (exports.normalize = normalize = {}));

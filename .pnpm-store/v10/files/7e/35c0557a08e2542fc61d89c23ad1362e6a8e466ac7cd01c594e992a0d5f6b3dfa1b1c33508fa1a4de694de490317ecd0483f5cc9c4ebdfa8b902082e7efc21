"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringify = stringify;
exports.parse = parse;
const fast_json_stable_stringify_1 = __importDefault(require("fast-json-stable-stringify"));
const UNDEFINED = 'undefined';
function stringify(input) {
    return input === undefined ? UNDEFINED : (0, fast_json_stable_stringify_1.default)(input);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parse(input) {
    return input === UNDEFINED ? undefined : JSON.parse(input);
}

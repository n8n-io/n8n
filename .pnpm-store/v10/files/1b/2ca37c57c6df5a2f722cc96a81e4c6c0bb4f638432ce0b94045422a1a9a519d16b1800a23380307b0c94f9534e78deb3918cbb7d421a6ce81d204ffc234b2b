"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = maybe;
const next_js_1 = __importDefault(require("./next.js"));
function maybe(cb, promise) {
    if (cb) {
        promise.then(function (result) {
            (0, next_js_1.default)(function () {
                cb(null, result);
            });
        }, function (err) {
            (0, next_js_1.default)(function () {
                cb(err);
            });
        });
        return undefined;
    }
    else {
        return promise;
    }
}

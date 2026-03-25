"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stringify_js_1 = require("./stringify.js");
const v1_js_1 = require("./v1.js");
const v1ToV6_js_1 = require("./v1ToV6.js");
function v6(options, buf, offset) {
    options ??= {};
    offset ??= 0;
    let bytes = (0, v1_js_1.default)({ ...options, _v6: true }, new Uint8Array(16));
    bytes = (0, v1ToV6_js_1.default)(bytes);
    if (buf) {
        for (let i = 0; i < 16; i++) {
            buf[offset + i] = bytes[i];
        }
        return buf;
    }
    return (0, stringify_js_1.unsafeStringify)(bytes);
}
exports.default = v6;

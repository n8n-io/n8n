"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validate_js_1 = require("./validate.js");
function version(uuid) {
    if (!(0, validate_js_1.default)(uuid)) {
        throw TypeError('Invalid UUID');
    }
    return parseInt(uuid.slice(14, 15), 16);
}
exports.default = version;

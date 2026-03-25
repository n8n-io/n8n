"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useNativeSync = exports.useNative = void 0;
const version = process.env.__TESTING_RIMRAF_NODE_VERSION__ || process.version;
const versArr = version.replace(/^v/, '').split('.');
const hasNative = +versArr[0] > 14 || (+versArr[0] === 14 && +versArr[1] >= 14);
// we do NOT use native by default on Windows, because Node's native
// rm implementation is less advanced.  Change this code if that changes.
const platform_js_1 = __importDefault(require("./platform.js"));
exports.useNative = !hasNative || platform_js_1.default === 'win32'
    ? () => false
    : opt => !opt?.signal && !opt?.filter;
exports.useNativeSync = !hasNative || platform_js_1.default === 'win32'
    ? () => false
    : opt => !opt?.signal && !opt?.filter;
//# sourceMappingURL=use-native.js.map
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseArgs = void 0;
const util = __importStar(require("util"));
const pv = (typeof process === 'object' &&
    !!process &&
    typeof process.version === 'string') ?
    process.version
    : 'v0.0.0';
const pvs = pv
    .replace(/^v/, '')
    .split('.')
    .map(s => parseInt(s, 10));
/* c8 ignore start */
const [major = 0, minor = 0] = pvs;
/* c8 ignore stop */
let { parseArgs: pa } = util;
/* c8 ignore start */
if (!pa ||
    major < 16 ||
    (major === 18 && minor < 11) ||
    (major === 16 && minor < 19)) {
    /* c8 ignore stop */
    pa = require('@pkgjs/parseargs').parseArgs;
}
exports.parseArgs = pa;
//# sourceMappingURL=parse-args-cjs.cjs.map
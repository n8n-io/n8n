"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const wcwidth_1 = __importDefault(require("./wcwidth"));
const mk_wcswidth = (pwcs) => {
    let width = 0;
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < pwcs.length; i++) {
        const charCode = pwcs.charCodeAt(i);
        const w = (0, wcwidth_1.default)(charCode);
        if (w < 0) {
            return -1;
        }
        width += w;
    }
    return width;
};
exports.default = mk_wcswidth;

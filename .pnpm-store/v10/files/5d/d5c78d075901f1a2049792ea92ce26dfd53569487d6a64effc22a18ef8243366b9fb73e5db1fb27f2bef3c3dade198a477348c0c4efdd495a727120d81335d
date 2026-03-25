"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stderr = exports.stdout = void 0;
const node_util_1 = require("node:util");
const stdout = (str, ...args) => {
    if (!str && args) {
        console.log((0, node_util_1.format)(...args));
    }
    else if (!str) {
        console.log();
    }
    else if (typeof str === 'string') {
        console.log((0, node_util_1.format)(str, ...args));
    }
    else {
        console.log((0, node_util_1.format)(...str, ...args));
    }
};
exports.stdout = stdout;
const stderr = (str, ...args) => {
    if (!str && args) {
        console.error((0, node_util_1.format)(...args));
    }
    else if (!str) {
        console.error();
    }
    else if (typeof str === 'string') {
        console.error((0, node_util_1.format)(str, ...args));
    }
    else {
        console.error((0, node_util_1.format)(...str, ...args));
    }
};
exports.stderr = stderr;

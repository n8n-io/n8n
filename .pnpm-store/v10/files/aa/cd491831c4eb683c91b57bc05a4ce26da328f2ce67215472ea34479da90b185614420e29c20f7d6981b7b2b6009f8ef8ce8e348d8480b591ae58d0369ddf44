"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stderr = exports.stdout = void 0;
const node_util_1 = require("node:util");
const stdout = (str, ...args) => {
    if (!str && args) {
        process.stdout.write((0, node_util_1.format)(...args) + '\n');
    }
    else if (!str) {
        process.stdout.write('\n');
    }
    else if (typeof str === 'string') {
        process.stdout.write((str && (0, node_util_1.format)(str, ...args)) + '\n');
    }
    else {
        process.stdout.write((0, node_util_1.format)(...str, ...args) + '\n');
    }
};
exports.stdout = stdout;
const stderr = (str, ...args) => {
    if (!str && args) {
        process.stderr.write((0, node_util_1.format)(...args) + '\n');
    }
    else if (!str) {
        process.stderr.write('\n');
    }
    else if (typeof str === 'string') {
        process.stderr.write((str && (0, node_util_1.format)(str, ...args)) + '\n');
    }
    else {
        process.stderr.write((0, node_util_1.format)(...str, ...args) + '\n');
    }
};
exports.stderr = stderr;

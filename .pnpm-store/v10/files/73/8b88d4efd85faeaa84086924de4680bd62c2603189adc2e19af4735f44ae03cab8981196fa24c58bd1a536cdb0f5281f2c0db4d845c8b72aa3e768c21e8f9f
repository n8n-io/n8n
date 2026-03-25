"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = exports.isBrowser = void 0;
exports.isBrowser = typeof window !== 'undefined' ||
    typeof process === 'undefined' ||
    process?.platform === 'browser'; // main and worker thread
exports.env = exports.isBrowser ? {} : process.env || {};

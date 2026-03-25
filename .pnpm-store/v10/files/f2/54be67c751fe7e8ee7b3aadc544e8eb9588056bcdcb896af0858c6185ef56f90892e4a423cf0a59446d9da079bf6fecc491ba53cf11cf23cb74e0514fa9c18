"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeProvider = void 0;
const normalizeProvider = (input) => {
    if (typeof input === "function")
        return input;
    const promisified = Promise.resolve(input);
    return () => promisified;
};
exports.normalizeProvider = normalizeProvider;

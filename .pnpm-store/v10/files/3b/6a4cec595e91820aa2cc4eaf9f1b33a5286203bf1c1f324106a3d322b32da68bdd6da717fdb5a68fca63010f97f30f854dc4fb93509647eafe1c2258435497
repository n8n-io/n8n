"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryLocalStorageAdapter = exports.localStorageAdapter = void 0;
const helpers_1 = require("./helpers");
/**
 * Provides safe access to the globalThis.localStorage property.
 */
exports.localStorageAdapter = {
    getItem: (key) => {
        if (!(0, helpers_1.supportsLocalStorage)()) {
            return null;
        }
        return globalThis.localStorage.getItem(key);
    },
    setItem: (key, value) => {
        if (!(0, helpers_1.supportsLocalStorage)()) {
            return;
        }
        globalThis.localStorage.setItem(key, value);
    },
    removeItem: (key) => {
        if (!(0, helpers_1.supportsLocalStorage)()) {
            return;
        }
        globalThis.localStorage.removeItem(key);
    },
};
/**
 * Returns a localStorage-like object that stores the key-value pairs in
 * memory.
 */
function memoryLocalStorageAdapter(store = {}) {
    return {
        getItem: (key) => {
            return store[key] || null;
        },
        setItem: (key, value) => {
            store[key] = value;
        },
        removeItem: (key) => {
            delete store[key];
        },
    };
}
exports.memoryLocalStorageAdapter = memoryLocalStorageAdapter;
//# sourceMappingURL=local-storage.js.map
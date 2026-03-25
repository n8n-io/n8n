import { supportsLocalStorage } from './helpers';
/**
 * Provides safe access to the globalThis.localStorage property.
 */
export const localStorageAdapter = {
    getItem: (key) => {
        if (!supportsLocalStorage()) {
            return null;
        }
        return globalThis.localStorage.getItem(key);
    },
    setItem: (key, value) => {
        if (!supportsLocalStorage()) {
            return;
        }
        globalThis.localStorage.setItem(key, value);
    },
    removeItem: (key) => {
        if (!supportsLocalStorage()) {
            return;
        }
        globalThis.localStorage.removeItem(key);
    },
};
/**
 * Returns a localStorage-like object that stores the key-value pairs in
 * memory.
 */
export function memoryLocalStorageAdapter(store = {}) {
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
//# sourceMappingURL=local-storage.js.map
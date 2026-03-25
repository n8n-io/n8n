const globalObject = (function () {
    if (typeof globalThis !== "undefined") {
        return globalThis;
    }
    if (typeof self !== "undefined") {
        return self;
    }
    return window;
}());
export const { FormData, Blob, File } = globalObject;

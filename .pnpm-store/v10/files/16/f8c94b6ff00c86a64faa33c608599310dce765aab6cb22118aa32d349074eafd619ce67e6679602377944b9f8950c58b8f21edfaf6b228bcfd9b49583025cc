"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FETCH_TIMEOUT = void 0;
const openapi_core_1 = require("@redocly/openapi-core");
exports.DEFAULT_FETCH_TIMEOUT = 3000;
exports.default = async (url, { timeout, ...options } = {}) => {
    if (!timeout) {
        return fetch(url, {
            ...options,
            dispatcher: (0, openapi_core_1.getProxyAgent)(),
        });
    }
    const controller = new globalThis.AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, timeout);
    const res = await fetch(url, {
        signal: controller.signal,
        ...options,
        dispatcher: (0, openapi_core_1.getProxyAgent)(),
    });
    clearTimeout(timeoutId);
    return res;
};

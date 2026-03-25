"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFetch = void 0;
const errors_1 = require("../errors");
const getFetch = (config) => {
    if (config.fetchApi) {
        // User-provided fetch implementation, if any, takes precedence.
        return config.fetchApi;
    }
    else if (global.fetch) {
        // If a fetch implementation is present in the global scope (will work with native fetch in Node18+, Edge runtimes,
        // etc.), use that. This should prevent confusing failures in
        // Next.js projects where @vercel/fetch is mandated and
        // other implementations are stubbed out.
        return global.fetch;
    }
    else {
        // If no fetch implementation is found, throw an error.
        throw new errors_1.PineconeConfigurationError('No global or user-provided fetch implementations found. Please supply a fetch implementation.');
    }
};
exports.getFetch = getFetch;
//# sourceMappingURL=fetch.js.map
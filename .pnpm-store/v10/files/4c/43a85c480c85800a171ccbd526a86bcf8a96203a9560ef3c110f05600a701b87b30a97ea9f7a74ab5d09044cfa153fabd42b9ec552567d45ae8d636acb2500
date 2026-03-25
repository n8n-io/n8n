"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomClient = void 0;
const Client_1 = require("./Client");
class CustomClient extends Client_1.CohereClient {
    constructor(_options = {}) {
        var _a, _b;
        try {
            // if url ends with /v1, drop it for back compat
            const match = /\/v1\/?$/;
            const fixed = (_a = _options.environment) === null || _a === void 0 ? void 0 : _a.toString().replace(match, "");
            if (fixed !== ((_b = _options.environment) === null || _b === void 0 ? void 0 : _b.toString())) {
                _options.environment = fixed;
            }
        }
        catch (_c) { }
        super(_options);
        this._options = _options;
    }
}
exports.CustomClient = CustomClient;

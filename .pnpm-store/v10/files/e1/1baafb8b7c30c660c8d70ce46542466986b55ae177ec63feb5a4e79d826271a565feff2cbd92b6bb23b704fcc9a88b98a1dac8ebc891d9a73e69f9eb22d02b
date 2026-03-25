"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Completions = void 0;
const resource_1 = require("../resource.js");
class Completions extends resource_1.APIResource {
    create(body, options) {
        return this._client.post('/v1/complete', {
            body,
            timeout: this._client._options.timeout ?? 600000,
            ...options,
            stream: body.stream ?? false,
        });
    }
}
exports.Completions = Completions;
(function (Completions) {
})(Completions = exports.Completions || (exports.Completions = {}));
//# sourceMappingURL=completions.js.map
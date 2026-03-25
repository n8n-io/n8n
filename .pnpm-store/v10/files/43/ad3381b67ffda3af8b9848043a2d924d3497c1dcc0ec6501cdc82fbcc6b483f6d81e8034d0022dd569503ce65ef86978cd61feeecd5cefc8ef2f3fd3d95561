"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Speech = void 0;
const resource_1 = require("../../resource.js");
class Speech extends resource_1.APIResource {
    /**
     * Generates audio from the input text.
     */
    create(body, options) {
        return this._client.post('/openai/v1/audio/speech', {
            body,
            ...options,
            headers: { Accept: 'application/octet-stream', ...options?.headers },
            __binaryResponse: true,
        });
    }
}
exports.Speech = Speech;
//# sourceMappingURL=speech.js.map
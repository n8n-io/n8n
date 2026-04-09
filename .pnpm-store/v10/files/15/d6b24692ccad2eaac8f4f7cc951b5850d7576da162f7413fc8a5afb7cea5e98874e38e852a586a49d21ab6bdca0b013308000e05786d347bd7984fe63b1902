"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseItemsPage = exports.Responses = void 0;
const ResponsesParser_1 = require("../../lib/ResponsesParser.js");
const resource_1 = require("../../resource.js");
const InputItemsAPI = __importStar(require("./input-items.js"));
const input_items_1 = require("./input-items.js");
const ResponseStream_1 = require("../../lib/responses/ResponseStream.js");
const pagination_1 = require("../../pagination.js");
class Responses extends resource_1.APIResource {
    constructor() {
        super(...arguments);
        this.inputItems = new InputItemsAPI.InputItems(this._client);
    }
    create(body, options) {
        return this._client.post('/responses', { body, ...options, stream: body.stream ?? false })._thenUnwrap((rsp) => {
            if ('object' in rsp && rsp.object === 'response') {
                (0, ResponsesParser_1.addOutputText)(rsp);
            }
            return rsp;
        });
    }
    retrieve(responseId, query = {}, options) {
        return this._client.get(`/responses/${responseId}`, {
            query,
            ...options,
            stream: query?.stream ?? false,
        });
    }
    /**
     * Deletes a model response with the given ID.
     *
     * @example
     * ```ts
     * await client.responses.del(
     *   'resp_677efb5139a88190b512bc3fef8e535d',
     * );
     * ```
     */
    del(responseId, options) {
        return this._client.delete(`/responses/${responseId}`, {
            ...options,
            headers: { Accept: '*/*', ...options?.headers },
        });
    }
    parse(body, options) {
        return this._client.responses
            .create(body, options)
            ._thenUnwrap((response) => (0, ResponsesParser_1.parseResponse)(response, body));
    }
    /**
     * Creates a model response stream
     */
    stream(body, options) {
        return ResponseStream_1.ResponseStream.createResponse(this._client, body, options);
    }
    /**
     * Cancels a model response with the given ID. Only responses created with the
     * `background` parameter set to `true` can be cancelled.
     * [Learn more](https://platform.openai.com/docs/guides/background).
     *
     * @example
     * ```ts
     * await client.responses.cancel(
     *   'resp_677efb5139a88190b512bc3fef8e535d',
     * );
     * ```
     */
    cancel(responseId, options) {
        return this._client.post(`/responses/${responseId}/cancel`, {
            ...options,
            headers: { Accept: '*/*', ...options?.headers },
        });
    }
}
exports.Responses = Responses;
class ResponseItemsPage extends pagination_1.CursorPage {
}
exports.ResponseItemsPage = ResponseItemsPage;
Responses.InputItems = input_items_1.InputItems;
//# sourceMappingURL=responses.js.map
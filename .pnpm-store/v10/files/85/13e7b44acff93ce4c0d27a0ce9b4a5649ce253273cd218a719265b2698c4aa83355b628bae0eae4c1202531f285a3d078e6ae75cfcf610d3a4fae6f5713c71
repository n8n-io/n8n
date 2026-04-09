"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Responses = void 0;
const tslib_1 = require("../../internal/tslib.js");
const ResponsesParser_1 = require("../../lib/ResponsesParser.js");
const ResponseStream_1 = require("../../lib/responses/ResponseStream.js");
const resource_1 = require("../../core/resource.js");
const InputItemsAPI = tslib_1.__importStar(require("./input-items.js"));
const input_items_1 = require("./input-items.js");
const headers_1 = require("../../internal/headers.js");
const path_1 = require("../../internal/utils/path.js");
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
    retrieve(responseID, query = {}, options) {
        return this._client.get((0, path_1.path) `/responses/${responseID}`, {
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
     * await client.responses.delete(
     *   'resp_677efb5139a88190b512bc3fef8e535d',
     * );
     * ```
     */
    delete(responseID, options) {
        return this._client.delete((0, path_1.path) `/responses/${responseID}`, {
            ...options,
            headers: (0, headers_1.buildHeaders)([{ Accept: '*/*' }, options?.headers]),
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
     * const response = await client.responses.cancel(
     *   'resp_677efb5139a88190b512bc3fef8e535d',
     * );
     * ```
     */
    cancel(responseID, options) {
        return this._client.post((0, path_1.path) `/responses/${responseID}/cancel`, options);
    }
}
exports.Responses = Responses;
Responses.InputItems = input_items_1.InputItems;
//# sourceMappingURL=responses.js.map
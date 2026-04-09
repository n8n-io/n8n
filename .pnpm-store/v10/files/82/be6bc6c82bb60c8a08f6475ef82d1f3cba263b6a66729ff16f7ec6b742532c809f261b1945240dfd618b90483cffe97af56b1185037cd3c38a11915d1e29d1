// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
import { parseResponse, addOutputText, } from "../../lib/ResponsesParser.mjs";
import { APIResource } from "../../resource.mjs";
import * as InputItemsAPI from "./input-items.mjs";
import { InputItems } from "./input-items.mjs";
import { ResponseStream } from "../../lib/responses/ResponseStream.mjs";
import { CursorPage } from "../../pagination.mjs";
export class Responses extends APIResource {
    constructor() {
        super(...arguments);
        this.inputItems = new InputItemsAPI.InputItems(this._client);
    }
    create(body, options) {
        return this._client.post('/responses', { body, ...options, stream: body.stream ?? false })._thenUnwrap((rsp) => {
            if ('object' in rsp && rsp.object === 'response') {
                addOutputText(rsp);
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
            ._thenUnwrap((response) => parseResponse(response, body));
    }
    /**
     * Creates a model response stream
     */
    stream(body, options) {
        return ResponseStream.createResponse(this._client, body, options);
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
export class ResponseItemsPage extends CursorPage {
}
Responses.InputItems = InputItems;
//# sourceMappingURL=responses.mjs.map
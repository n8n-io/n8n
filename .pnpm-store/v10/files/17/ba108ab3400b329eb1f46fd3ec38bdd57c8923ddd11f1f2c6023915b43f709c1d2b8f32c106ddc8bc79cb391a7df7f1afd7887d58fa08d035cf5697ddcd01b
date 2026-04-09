// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
import { APIResource } from "../../../resource.mjs";
import { isRequestOptions } from "../../../core.mjs";
import { ChatCompletionStoreMessagesPage } from "./completions.mjs";
export class Messages extends APIResource {
    list(completionId, query = {}, options) {
        if (isRequestOptions(query)) {
            return this.list(completionId, {}, query);
        }
        return this._client.getAPIList(`/chat/completions/${completionId}/messages`, ChatCompletionStoreMessagesPage, { query, ...options });
    }
}
export { ChatCompletionStoreMessagesPage };
//# sourceMappingURL=messages.mjs.map
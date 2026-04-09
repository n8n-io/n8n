"use strict";
// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatCompletionStoreMessagesPage = exports.Messages = void 0;
const resource_1 = require("../../../resource.js");
const core_1 = require("../../../core.js");
const completions_1 = require("./completions.js");
Object.defineProperty(exports, "ChatCompletionStoreMessagesPage", { enumerable: true, get: function () { return completions_1.ChatCompletionStoreMessagesPage; } });
class Messages extends resource_1.APIResource {
    list(completionId, query = {}, options) {
        if ((0, core_1.isRequestOptions)(query)) {
            return this.list(completionId, {}, query);
        }
        return this._client.getAPIList(`/chat/completions/${completionId}/messages`, completions_1.ChatCompletionStoreMessagesPage, { query, ...options });
    }
}
exports.Messages = Messages;
//# sourceMappingURL=messages.js.map
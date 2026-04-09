// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.
import { APIResource } from "../../resource.mjs";
import * as CompletionsAPI from "./completions/completions.mjs";
import { ChatCompletionsPage, Completions, } from "./completions/completions.mjs";
export class Chat extends APIResource {
    constructor() {
        super(...arguments);
        this.completions = new CompletionsAPI.Completions(this._client);
    }
}
Chat.Completions = Completions;
Chat.ChatCompletionsPage = ChatCompletionsPage;
//# sourceMappingURL=chat.mjs.map
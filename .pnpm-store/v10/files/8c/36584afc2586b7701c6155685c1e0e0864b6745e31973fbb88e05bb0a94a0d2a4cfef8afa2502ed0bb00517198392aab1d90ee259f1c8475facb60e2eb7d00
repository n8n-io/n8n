"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIConversationalTask = void 0;
/**
 * Special case: provider configuration for a private models provider (OpenAI in this case).
 */
const providerHelper_js_1 = require("./providerHelper.js");
const OPENAI_API_BASE_URL = "https://api.openai.com";
class OpenAIConversationalTask extends providerHelper_js_1.BaseConversationalTask {
    constructor() {
        // Pass clientSideRoutingOnly: true to the constructor
        super("openai", OPENAI_API_BASE_URL, true);
    }
}
exports.OpenAIConversationalTask = OpenAIConversationalTask;

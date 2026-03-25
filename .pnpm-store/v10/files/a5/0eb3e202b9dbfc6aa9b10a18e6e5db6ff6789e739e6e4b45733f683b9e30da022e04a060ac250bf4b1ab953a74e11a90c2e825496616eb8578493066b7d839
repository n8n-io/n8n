/**
 * Special case: provider configuration for a private models provider (OpenAI in this case).
 */
import { BaseConversationalTask } from "./providerHelper.js";

const OPENAI_API_BASE_URL = "https://api.openai.com";

export class OpenAIConversationalTask extends BaseConversationalTask {
	constructor() {
		// Pass clientSideRoutingOnly: true to the constructor
		super("openai", OPENAI_API_BASE_URL, true);
	}
}

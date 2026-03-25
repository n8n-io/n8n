import { _convertMessagesToAnthropicPayload } from "./message_inputs.js";

//#region src/utils/prompts.ts
/**
* Convert a formatted LangChain prompt (e.g. pulled from the hub) into
* a format expected by Anthropic's JS SDK.
*
* Requires the "@langchain/anthropic" package to be installed in addition
* to the Anthropic SDK.
*
* @example
* ```ts
* import { convertPromptToAnthropic } from "langsmith/utils/hub/anthropic";
* import { pull } from "langchain/hub";
*
* import Anthropic from '@anthropic-ai/sdk';
*
* const prompt = await pull("jacob/joke-generator");
* const formattedPrompt = await prompt.invoke({
*   topic: "cats",
* });
*
* const { system, messages } = convertPromptToAnthropic(formattedPrompt);
*
* const anthropicClient = new Anthropic({
*   apiKey: 'your_api_key',
* });
*
* const anthropicResponse = await anthropicClient.messages.create({
*   model: "claude-sonnet-4-5-20250929",
*   max_tokens: 1024,
*   stream: false,
*   system,
*   messages,
* });
* ```
* @param formattedPrompt
* @returns A partial Anthropic payload.
*/
function convertPromptToAnthropic(formattedPrompt) {
	const messages = formattedPrompt.toChatMessages();
	const anthropicBody = _convertMessagesToAnthropicPayload(messages);
	if (anthropicBody.messages === void 0) anthropicBody.messages = [];
	return anthropicBody;
}

//#endregion
export { convertPromptToAnthropic };
//# sourceMappingURL=prompts.js.map
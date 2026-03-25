const require_completions = require('../converters/completions.cjs');

//#region src/utils/prompts.ts
/**
* Convert a formatted LangChain prompt (e.g. pulled from the hub) into
* a format expected by OpenAI's JS SDK.
*
* Requires the "@langchain/openai" package to be installed in addition
* to the OpenAI SDK.
*
* @example
* ```ts
* import { convertPromptToOpenAI } from "langsmith/utils/hub/openai";
* import { pull } from "langchain/hub";
*
* import OpenAI from 'openai';
*
* const prompt = await pull("jacob/joke-generator");
* const formattedPrompt = await prompt.invoke({
*   topic: "cats",
* });
*
* const { messages } = convertPromptToOpenAI(formattedPrompt);
*
* const openAIClient = new OpenAI();
*
* const openaiResponse = await openAIClient.chat.completions.create({
*   model: "gpt-4o-mini",
*   messages,
* });
* ```
* @param formattedPrompt
* @returns A partial OpenAI payload.
*/
function convertPromptToOpenAI(formattedPrompt) {
	const messages = formattedPrompt.toChatMessages();
	return { messages: require_completions.convertMessagesToCompletionsMessageParams({ messages }) };
}

//#endregion
exports.convertPromptToOpenAI = convertPromptToOpenAI;
//# sourceMappingURL=prompts.cjs.map
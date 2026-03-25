const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_anthropic = require('./anthropic.cjs');
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));
const __langchain_core_outputs = require_rolldown_runtime.__toESM(require("@langchain/core/outputs"));

//#region src/utils/bedrock/index.ts
/**
* format messages for Cohere Command-R and CommandR+ via AWS Bedrock.
*
* @param messages messages The base messages to format as a prompt.
*
* @returns The formatted prompt for Cohere.
*
* `system`: user system prompts. Overrides the default preamble for search query generation. Has no effect on tool use generations.\
* `message`: (Required) Text input for the model to respond to.\
* `chatHistory`: A list of previous messages between the user and the model, meant to give the model conversational context for responding to the user's message.\
* The following are required fields.
* - `role` - The role for the message. Valid values are USER or CHATBOT.\
* - `message` – Text contents of the message.\
*
* The following is example JSON for the chat_history field.\
* "chat_history": [
* {"role": "USER", "message": "Who discovered gravity?"},
* {"role": "CHATBOT", "message": "The man who is widely credited with discovering gravity is Sir Isaac Newton"}]\
*
* docs: https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-cohere-command-r-plus.html
*/
function formatMessagesForCohere(messages) {
	const systemMessages = messages.filter((system$1) => system$1._getType() === "system");
	const system = systemMessages.filter((m) => typeof m.content === "string").map((m) => m.content).join("\n\n");
	const conversationMessages = messages.filter((message) => message._getType() !== "system");
	const questionContent = conversationMessages.slice(-1);
	if (!questionContent.length || questionContent[0]._getType() !== "human") throw new Error("question message content must be a human message.");
	if (typeof questionContent[0].content !== "string") throw new Error("question message content must be a string.");
	const formattedMessage = questionContent[0].content;
	const formattedChatHistories = conversationMessages.slice(0, -1).map((message) => {
		let role;
		switch (message._getType()) {
			case "human":
				role = "USER";
				break;
			case "ai":
				role = "CHATBOT";
				break;
			case "system": throw new Error("chat_history can not include system prompts.");
			default: throw new Error(`Message type "${message._getType()}" is not supported.`);
		}
		if (typeof message.content !== "string") throw new Error("message content must be a string.");
		return {
			role,
			message: message.content
		};
	});
	return {
		chatHistory: formattedChatHistories,
		message: formattedMessage,
		system
	};
}
/**
* A helper class used within the `Bedrock` class. It is responsible for
* preparing the input and output for the Bedrock service. It formats the
* input prompt based on the provider (e.g., "anthropic", "ai21",
* "amazon") and extracts the generated text from the service response.
*/
var BedrockLLMInputOutputAdapter = class {
	/** Adapter class to prepare the inputs from Langchain to a format
	that LLM model expects. Also, provides a helper function to extract
	the generated text from the model response. */
	static prepareInput(provider, prompt, maxTokens = 50, temperature = 0, stopSequences = void 0, modelKwargs = {}, bedrockMethod = "invoke", guardrailConfig = void 0) {
		const inputBody = {};
		if (provider === "anthropic") {
			inputBody.prompt = prompt;
			inputBody.max_tokens_to_sample = maxTokens;
			inputBody.temperature = temperature;
			inputBody.stop_sequences = stopSequences;
		} else if (provider === "ai21") {
			inputBody.prompt = prompt;
			inputBody.maxTokens = maxTokens;
			inputBody.temperature = temperature;
			inputBody.stopSequences = stopSequences;
		} else if (provider === "meta") {
			inputBody.prompt = prompt;
			inputBody.max_gen_len = maxTokens;
			inputBody.temperature = temperature;
		} else if (provider === "amazon") {
			inputBody.inputText = prompt;
			inputBody.textGenerationConfig = {
				maxTokenCount: maxTokens,
				temperature
			};
		} else if (provider === "cohere") {
			inputBody.prompt = prompt;
			inputBody.max_tokens = maxTokens;
			inputBody.temperature = temperature;
			inputBody.stop_sequences = stopSequences;
			if (bedrockMethod === "invoke-with-response-stream") inputBody.stream = true;
		} else if (provider === "mistral") {
			inputBody.prompt = prompt;
			inputBody.max_tokens = maxTokens;
			inputBody.temperature = temperature;
			inputBody.stop = stopSequences;
		}
		if (guardrailConfig && guardrailConfig.tagSuffix && guardrailConfig.streamProcessingMode) inputBody["amazon-bedrock-guardrailConfig"] = guardrailConfig;
		return {
			...inputBody,
			...modelKwargs
		};
	}
	static prepareMessagesInput(provider, messages, maxTokens = 1024, temperature = 0, stopSequences = void 0, modelKwargs = {}, guardrailConfig = void 0, tools = []) {
		const inputBody = {};
		if (provider === "anthropic") {
			const { system, messages: formattedMessages } = require_anthropic.formatMessagesForAnthropic(messages);
			if (system !== void 0) inputBody.system = system;
			inputBody.anthropic_version = "bedrock-2023-05-31";
			inputBody.messages = formattedMessages;
			inputBody.max_tokens = maxTokens;
			inputBody.temperature = temperature;
			inputBody.stop_sequences = stopSequences;
			if (tools.length > 0) inputBody.tools = tools;
		} else if (provider === "cohere") {
			const { system, message: formattedMessage, chatHistory: formattedChatHistories } = formatMessagesForCohere(messages);
			if (system !== void 0 && system.length > 0) inputBody.preamble = system;
			inputBody.message = formattedMessage;
			inputBody.chat_history = formattedChatHistories;
			inputBody.max_tokens = maxTokens;
			inputBody.temperature = temperature;
			inputBody.stop_sequences = stopSequences;
		} else throw new Error("The messages API is currently only supported by Anthropic or Cohere");
		if (guardrailConfig && guardrailConfig.tagSuffix && guardrailConfig.streamProcessingMode) inputBody["amazon-bedrock-guardrailConfig"] = guardrailConfig;
		return {
			...inputBody,
			...modelKwargs
		};
	}
	/**
	* Extracts the generated text from the service response.
	* @param provider The provider name.
	* @param responseBody The response body from the service.
	* @returns The generated text.
	*/
	static prepareOutput(provider, responseBody) {
		if (provider === "anthropic") return responseBody.completion;
		else if (provider === "ai21") return responseBody?.completions?.[0]?.data?.text ?? "";
		else if (provider === "cohere") return responseBody?.generations?.[0]?.text ?? responseBody?.text ?? "";
		else if (provider === "meta") return responseBody.generation;
		else if (provider === "mistral") return responseBody?.outputs?.[0]?.text;
		return responseBody.results?.[0]?.outputText;
	}
	static prepareMessagesOutput(provider, response, fields) {
		const responseBody = response ?? {};
		if (provider === "anthropic") {
			if (responseBody.type === "message") return parseMessage(responseBody);
			else if (responseBody.type === "message_start") return parseMessage(responseBody.message, true);
			const chunk = require_anthropic._makeMessageChunkFromAnthropicEvent(response, { coerceContentToString: fields?.coerceContentToString });
			if (!chunk) return void 0;
			const newToolCallChunk = require_anthropic.extractToolCallChunk(chunk);
			let toolUseContent;
			const extractedContent = require_anthropic.extractToolUseContent(chunk, void 0);
			if (extractedContent) toolUseContent = extractedContent.toolUseContent;
			const chunkContent = Array.isArray(chunk.content) ? chunk.content.filter((c) => c.type !== "tool_use") : chunk.content;
			if (Array.isArray(chunkContent) && toolUseContent) chunkContent.push(toolUseContent);
			const token = require_anthropic.extractToken(chunk);
			return new __langchain_core_outputs.ChatGenerationChunk({
				message: new __langchain_core_messages.AIMessageChunk({
					content: chunkContent,
					additional_kwargs: chunk.additional_kwargs,
					tool_call_chunks: newToolCallChunk ? [newToolCallChunk] : void 0,
					usage_metadata: chunk.usage_metadata,
					response_metadata: chunk.response_metadata
				}),
				generationInfo: { ...chunk.response_metadata },
				text: token ?? ""
			});
		} else if (provider === "cohere") if (responseBody.event_type === "stream-start") return parseMessageCohere(responseBody.message, true);
		else if (responseBody.event_type === "text-generation" && typeof responseBody?.text === "string") return new __langchain_core_outputs.ChatGenerationChunk({
			message: new __langchain_core_messages.AIMessageChunk({ content: responseBody.text }),
			text: responseBody.text
		});
		else if (responseBody.event_type === "search-queries-generation") return parseMessageCohere(responseBody);
		else if (responseBody.event_type === "stream-end" && responseBody.response !== void 0 && responseBody["amazon-bedrock-invocationMetrics"] !== void 0) return new __langchain_core_outputs.ChatGenerationChunk({
			message: new __langchain_core_messages.AIMessageChunk({ content: "" }),
			text: "",
			generationInfo: {
				response: responseBody.response,
				"amazon-bedrock-invocationMetrics": responseBody["amazon-bedrock-invocationMetrics"]
			}
		});
		else if (responseBody.finish_reason === "COMPLETE" || responseBody.finish_reason === "MAX_TOKENS") return parseMessageCohere(responseBody);
		else return void 0;
		else throw new Error("The messages API is currently only supported by Anthropic or Cohere.");
	}
};
function parseMessage(responseBody, asChunk) {
	const { content, id,...generationInfo } = responseBody;
	let parsedContent;
	if (Array.isArray(content) && content.length === 1 && content[0].type === "text") parsedContent = content[0].text;
	else if (Array.isArray(content) && content.length === 0) parsedContent = "";
	else parsedContent = content;
	if (asChunk) return new __langchain_core_outputs.ChatGenerationChunk({
		message: new __langchain_core_messages.AIMessageChunk({
			content: parsedContent,
			additional_kwargs: { id }
		}),
		text: typeof parsedContent === "string" ? parsedContent : "",
		generationInfo
	});
	else {
		const toolCalls = require_anthropic.extractToolCalls(responseBody.content);
		if (toolCalls.length > 0) return {
			message: new __langchain_core_messages.AIMessage({
				content: responseBody.content,
				additional_kwargs: { id },
				tool_calls: toolCalls
			}),
			text: typeof parsedContent === "string" ? parsedContent : "",
			generationInfo
		};
		return {
			message: new __langchain_core_messages.AIMessage({
				content: parsedContent,
				additional_kwargs: { id },
				tool_calls: toolCalls
			}),
			text: typeof parsedContent === "string" ? parsedContent : "",
			generationInfo
		};
	}
}
function parseMessageCohere(responseBody, asChunk) {
	const { text,...generationInfo } = responseBody;
	let parsedContent = text;
	if (typeof text !== "string") parsedContent = "";
	if (asChunk) return new __langchain_core_outputs.ChatGenerationChunk({
		message: new __langchain_core_messages.AIMessageChunk({ content: parsedContent }),
		text: parsedContent,
		generationInfo
	});
	else return {
		message: new __langchain_core_messages.AIMessage({ content: parsedContent }),
		text: parsedContent,
		generationInfo
	};
}

//#endregion
exports.BedrockLLMInputOutputAdapter = BedrockLLMInputOutputAdapter;
//# sourceMappingURL=index.cjs.map
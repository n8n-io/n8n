const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_language_models_chat_models = require_rolldown_runtime.__toESM(require("@langchain/core/language_models/chat_models"));
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_utils_function_calling = require_rolldown_runtime.__toESM(require("@langchain/core/utils/function_calling"));

//#region src/chat_models/minimax.ts
var minimax_exports = {};
require_rolldown_runtime.__export(minimax_exports, { ChatMinimax: () => ChatMinimax });
/**
* Function that extracts the custom sender_type of a generic chat message.
* @param message Chat message from which to extract the custom sender_type.
* @returns The custom sender_type of the chat message.
*/
function extractGenericMessageCustomRole(message) {
	if (message.role !== "ai" && message.role !== "user") console.warn(`Unknown message role: ${message.role}`);
	if (message.role === "ai") return "BOT";
	if (message.role === "user") return "USER";
	return message.role;
}
/**
* Function that converts a base message to a Minimax message sender_type.
* @param message Base message to convert.
* @returns The Minimax message sender_type.
*/
function messageToMinimaxRole(message) {
	const type = message._getType();
	switch (type) {
		case "ai": return "BOT";
		case "human": return "USER";
		case "system": throw new Error("System messages not supported");
		case "function": return "FUNCTION";
		case "generic":
			if (!__langchain_core_messages.ChatMessage.isInstance(message)) throw new Error("Invalid generic chat message");
			return extractGenericMessageCustomRole(message);
		default: throw new Error(`Unknown message type: ${type}`);
	}
}
/**
* Wrapper around Minimax large language models that use the Chat endpoint.
*
* To use you should have the `MINIMAX_GROUP_ID` and `MINIMAX_API_KEY`
* environment variable set.
* @example
* ```typescript
* // Define a chat prompt with a system message setting the context for translation
* const chatPrompt = ChatPromptTemplate.fromMessages([
*   SystemMessagePromptTemplate.fromTemplate(
*     "You are a helpful assistant that translates {input_language} to {output_language}.",
*   ),
*   HumanMessagePromptTemplate.fromTemplate("{text}"),
* ]);
*
* // Create a new LLMChain with the chat model and the defined prompt
* const chainB = new LLMChain({
*   prompt: chatPrompt,
*   llm: new ChatMinimax({ temperature: 0.01 }),
* });
*
* // Call the chain with the input language, output language, and the text to translate
* const resB = await chainB.call({
*   input_language: "English",
*   output_language: "Chinese",
*   text: "I love programming.",
* });
*
* // Log the result
* console.log({ resB });
*
* ```
*/
var ChatMinimax = class extends __langchain_core_language_models_chat_models.BaseChatModel {
	static lc_name() {
		return "ChatMinimax";
	}
	get callKeys() {
		return [
			...super.callKeys,
			"functions",
			"tools",
			"defaultBotName",
			"defaultUserName",
			"plugins",
			"replyConstraints",
			"botSetting",
			"sampleMessages"
		];
	}
	get lc_secrets() {
		return {
			minimaxApiKey: "MINIMAX_API_KEY",
			apiKey: "MINIMAX_API_KEY",
			minimaxGroupId: "MINIMAX_GROUP_ID"
		};
	}
	lc_serializable = true;
	minimaxGroupId;
	minimaxApiKey;
	apiKey;
	streaming = false;
	prompt;
	modelName = "abab5.5-chat";
	model = "abab5.5-chat";
	defaultBotName = "Assistant";
	defaultUserName = "I";
	prefixMessages;
	apiUrl;
	basePath = "https://api.minimax.chat/v1";
	headers;
	temperature = .9;
	topP = .8;
	tokensToGenerate;
	skipInfoMask;
	proVersion = true;
	beamWidth;
	botSetting;
	continueLastMessage;
	maskSensitiveInfo;
	roleMeta;
	useStandardSse;
	replyConstraints;
	constructor(fields) {
		super(fields ?? {});
		this.minimaxGroupId = fields?.minimaxGroupId ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("MINIMAX_GROUP_ID");
		if (!this.minimaxGroupId) throw new Error("Minimax GroupID not found");
		this.minimaxApiKey = fields?.apiKey ?? fields?.minimaxApiKey ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("MINIMAX_API_KEY");
		if (!this.minimaxApiKey) throw new Error("Minimax ApiKey not found");
		this.apiKey = this.minimaxApiKey;
		this.streaming = fields?.streaming ?? this.streaming;
		this.prompt = fields?.prompt ?? this.prompt;
		this.temperature = fields?.temperature ?? this.temperature;
		this.topP = fields?.topP ?? this.topP;
		this.skipInfoMask = fields?.skipInfoMask ?? this.skipInfoMask;
		this.prefixMessages = fields?.prefixMessages ?? this.prefixMessages;
		this.maskSensitiveInfo = fields?.maskSensitiveInfo ?? this.maskSensitiveInfo;
		this.beamWidth = fields?.beamWidth ?? this.beamWidth;
		this.continueLastMessage = fields?.continueLastMessage ?? this.continueLastMessage;
		this.tokensToGenerate = fields?.tokensToGenerate ?? this.tokensToGenerate;
		this.roleMeta = fields?.roleMeta ?? this.roleMeta;
		this.botSetting = fields?.botSetting ?? this.botSetting;
		this.useStandardSse = fields?.useStandardSse ?? this.useStandardSse;
		this.replyConstraints = fields?.replyConstraints ?? this.replyConstraints;
		this.defaultBotName = fields?.defaultBotName ?? this.defaultBotName;
		this.modelName = fields?.model ?? fields?.modelName ?? this.model;
		this.model = this.modelName;
		this.basePath = fields?.configuration?.basePath ?? this.basePath;
		this.headers = fields?.configuration?.headers ?? this.headers;
		this.proVersion = fields?.proVersion ?? this.proVersion;
		const modelCompletion = this.proVersion ? "chatcompletion_pro" : "chatcompletion";
		this.apiUrl = `${this.basePath}/text/${modelCompletion}`;
	}
	fallbackBotName(options) {
		let botName = options?.defaultBotName ?? this.defaultBotName ?? "Assistant";
		if (this.botSetting) botName = this.botSetting[0].bot_name;
		return botName;
	}
	defaultReplyConstraints(options) {
		const constraints = options?.replyConstraints ?? this.replyConstraints;
		if (!constraints) {
			let botName = options?.defaultBotName ?? this.defaultBotName ?? "Assistant";
			if (this.botSetting) botName = this.botSetting[0].bot_name;
			return {
				sender_type: "BOT",
				sender_name: botName
			};
		}
		return constraints;
	}
	/**
	* Get the parameters used to invoke the model
	*/
	invocationParams(options) {
		return {
			model: this.model,
			stream: this.streaming,
			prompt: this.prompt,
			temperature: this.temperature,
			top_p: this.topP,
			tokens_to_generate: this.tokensToGenerate,
			skip_info_mask: this.skipInfoMask,
			mask_sensitive_info: this.maskSensitiveInfo,
			beam_width: this.beamWidth,
			use_standard_sse: this.useStandardSse,
			role_meta: this.roleMeta,
			bot_setting: options?.botSetting ?? this.botSetting,
			reply_constraints: this.defaultReplyConstraints(options),
			sample_messages: this.messageToMinimaxMessage(options?.sampleMessages, options),
			functions: options?.functions ?? (options?.tools ? options?.tools.map(__langchain_core_utils_function_calling.convertToOpenAIFunction) : void 0),
			plugins: options?.plugins
		};
	}
	/**
	* Get the identifying parameters for the model
	*/
	identifyingParams() {
		return { ...this.invocationParams() };
	}
	/**
	* Convert a list of messages to the format expected by the model.
	* @param messages
	* @param options
	*/
	messageToMinimaxMessage(messages, options) {
		return messages?.filter((message) => {
			if (__langchain_core_messages.ChatMessage.isInstance(message)) return message.role !== "system";
			return message._getType() !== "system";
		})?.map((message) => {
			const sender_type = messageToMinimaxRole(message);
			if (typeof message.content !== "string") throw new Error("ChatMinimax does not support non-string message content.");
			return {
				sender_type,
				text: message.content,
				sender_name: message.name ?? (sender_type === "BOT" ? this.fallbackBotName() : options?.defaultUserName ?? this.defaultUserName)
			};
		});
	}
	/** @ignore */
	async _generate(messages, options, runManager) {
		const tokenUsage = { totalTokens: 0 };
		this.botSettingFallback(options, messages);
		const params = this.invocationParams(options);
		const messagesMapped = [...this.messageToMinimaxMessage(messages, options) ?? [], ...this.prefixMessages ?? []];
		const data = params.stream ? await new Promise((resolve, reject) => {
			let response;
			let rejected = false;
			let resolved = false;
			this.completionWithRetry({
				...params,
				messages: messagesMapped
			}, true, options?.signal, (event) => {
				const data$1 = JSON.parse(event.data);
				if (data$1?.error_code) {
					if (rejected) return;
					rejected = true;
					reject(data$1);
					return;
				}
				const message = data$1;
				if (!message.choices[0].finish_reason) {
					let streamText;
					if (this.proVersion) {
						const messages$1 = message.choices[0].messages ?? [];
						streamText = messages$1[0].text;
					} else streamText = message.choices[0].delta;
					runManager?.handleLLMNewToken(streamText ?? "");
					return;
				}
				response = message;
				if (!this.proVersion) response.choices[0].text = message.reply;
				if (resolved || rejected) return;
				resolved = true;
				resolve(response);
			}).catch((error) => {
				if (!rejected) {
					rejected = true;
					reject(error);
				}
			});
		}) : await this.completionWithRetry({
			...params,
			messages: messagesMapped
		}, false, options?.signal);
		const { total_tokens: totalTokens } = data.usage ?? {};
		if (totalTokens) tokenUsage.totalTokens = totalTokens;
		if (data.base_resp?.status_code !== 0) throw new Error(`Minimax API error: ${data.base_resp?.status_msg}`);
		const generations = [];
		if (this.proVersion) for (const choice of data.choices) {
			const messages$1 = choice.messages ?? [];
			if (messages$1) {
				const message = messages$1[messages$1.length - 1];
				const text = message?.text ?? "";
				generations.push({
					text,
					message: minimaxResponseToChatMessage(message)
				});
			}
		}
		else for (const choice of data.choices) {
			const text = choice?.text ?? "";
			generations.push({
				text,
				message: minimaxResponseToChatMessage({
					sender_type: "BOT",
					sender_name: options?.defaultBotName ?? this.defaultBotName ?? "Assistant",
					text
				})
			});
		}
		return {
			generations,
			llmOutput: { tokenUsage }
		};
	}
	/** @ignore */
	async completionWithRetry(request, stream, signal, onmessage) {
		const makeCompletionRequest = async () => {
			const url = `${this.apiUrl}?GroupId=${this.minimaxGroupId}`;
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.apiKey}`,
					...this.headers
				},
				body: JSON.stringify(request),
				signal
			});
			if (!stream) {
				const json = await response.json();
				return json;
			} else {
				if (response.body) {
					const reader = response.body.getReader();
					const decoder = new TextDecoder("utf-8");
					let data = "";
					let continueReading = true;
					while (continueReading) {
						const { done, value } = await reader.read();
						if (done) {
							continueReading = false;
							break;
						}
						data += decoder.decode(value);
						let continueProcessing = true;
						while (continueProcessing) {
							const newlineIndex = data.indexOf("\n");
							if (newlineIndex === -1) {
								continueProcessing = false;
								break;
							}
							const line = data.slice(0, newlineIndex);
							data = data.slice(newlineIndex + 1);
							if (line.startsWith("data:")) {
								const event = new MessageEvent("message", { data: line.slice(5).trim() });
								onmessage?.(event);
							}
						}
					}
					return {};
				}
				return {};
			}
		};
		return this.caller.call(makeCompletionRequest);
	}
	_llmType() {
		return "minimax";
	}
	/** @ignore */
	_combineLLMOutput() {
		return [];
	}
	botSettingFallback(options, messages) {
		const botSettings = options?.botSetting ?? this.botSetting;
		if (!botSettings) {
			const systemMessages = messages?.filter((message) => {
				if (__langchain_core_messages.ChatMessage.isInstance(message)) return message.role === "system";
				return message._getType() === "system";
			});
			if (!systemMessages?.length) return;
			const lastSystemMessage = systemMessages[systemMessages.length - 1];
			if (typeof lastSystemMessage.content !== "string") throw new Error("ChatMinimax does not support non-string message content.");
			this.botSetting = [{
				content: lastSystemMessage.content,
				bot_name: options?.defaultBotName ?? this.defaultBotName ?? "Assistant"
			}];
		}
	}
};
function minimaxResponseToChatMessage(message) {
	switch (message.sender_type) {
		case "USER": return new __langchain_core_messages.HumanMessage(message.text || "");
		case "BOT": return new __langchain_core_messages.AIMessage(message.text || "", { function_call: message.function_call });
		case "FUNCTION": return new __langchain_core_messages.AIMessage(message.text || "");
		default: return new __langchain_core_messages.ChatMessage(message.text || "", message.sender_type ?? "unknown");
	}
}

//#endregion
exports.ChatMinimax = ChatMinimax;
Object.defineProperty(exports, 'minimax_exports', {
  enumerable: true,
  get: function () {
    return minimax_exports;
  }
});
//# sourceMappingURL=minimax.cjs.map
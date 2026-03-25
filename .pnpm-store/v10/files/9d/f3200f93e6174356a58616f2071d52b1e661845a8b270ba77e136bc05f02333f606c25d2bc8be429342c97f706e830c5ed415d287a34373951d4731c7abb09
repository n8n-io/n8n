import { __export } from "../_virtual/rolldown_runtime.js";
import { convertEventStreamToIterableReadableDataStream } from "../utils/event_source_parse.js";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage, AIMessageChunk, ChatMessage, ChatMessageChunk, HumanMessage, HumanMessageChunk, SystemMessage, SystemMessageChunk } from "@langchain/core/messages";
import { ChatGenerationChunk } from "@langchain/core/outputs";
import { getEnvironmentVariable } from "@langchain/core/utils/env";

//#region src/chat_models/friendli.ts
var friendli_exports = {};
__export(friendli_exports, { ChatFriendli: () => ChatFriendli });
function messageToFriendliRole(message) {
	const type = message._getType();
	switch (type) {
		case "ai": return "assistant";
		case "human": return "user";
		case "system": return "system";
		case "function": throw new Error("Function messages not supported");
		case "generic":
			if (!ChatMessage.isInstance(message)) throw new Error("Invalid generic chat message");
			if ([
				"system",
				"assistant",
				"user"
			].includes(message.role)) return message.role;
			throw new Error(`Unknown message type: ${type}`);
		default: throw new Error(`Unknown message type: ${type}`);
	}
}
function friendliResponseToChatMessage(message) {
	switch (message.role) {
		case "user": return new HumanMessage(message.content ?? "");
		case "assistant": return new AIMessage(message.content ?? "");
		case "system": return new SystemMessage(message.content ?? "");
		default: return new ChatMessage(message.content ?? "", message.role ?? "unknown");
	}
}
function _convertDeltaToMessageChunk(delta) {
	const role = delta.role ?? "assistant";
	const content = delta.content ?? "";
	let additional_kwargs;
	if (delta.function_call) additional_kwargs = { function_call: delta.function_call };
	else additional_kwargs = {};
	if (role === "user") return new HumanMessageChunk({ content });
	else if (role === "assistant") return new AIMessageChunk({
		content,
		additional_kwargs
	});
	else if (role === "system") return new SystemMessageChunk({ content });
	else return new ChatMessageChunk({
		content,
		role
	});
}
/**
* The ChatFriendli class is used to interact with Friendli inference Endpoint models.
* This requires your Friendli Token and Friendli Team which is autoloaded if not specified.
*/
var ChatFriendli = class extends BaseChatModel {
	lc_serializable = true;
	static lc_name() {
		return "Friendli";
	}
	get lc_secrets() {
		return {
			friendliToken: "FRIENDLI_TOKEN",
			friendliTeam: "FRIENDLI_TEAM"
		};
	}
	model = "meta-llama-3-8b-instruct";
	baseUrl = "https://inference.friendli.ai";
	friendliToken;
	friendliTeam;
	frequencyPenalty;
	maxTokens;
	stop;
	temperature;
	topP;
	modelKwargs;
	constructor(fields) {
		super(fields);
		this.model = fields?.model ?? this.model;
		this.baseUrl = fields?.baseUrl ?? this.baseUrl;
		this.friendliToken = fields?.friendliToken ?? getEnvironmentVariable("FRIENDLI_TOKEN");
		this.friendliTeam = fields?.friendliTeam ?? getEnvironmentVariable("FRIENDLI_TEAM");
		this.frequencyPenalty = fields?.frequencyPenalty ?? this.frequencyPenalty;
		this.maxTokens = fields?.maxTokens ?? this.maxTokens;
		this.stop = fields?.stop ?? this.stop;
		this.temperature = fields?.temperature ?? this.temperature;
		this.topP = fields?.topP ?? this.topP;
		this.modelKwargs = fields?.modelKwargs ?? {};
		if (!this.friendliToken) throw new Error("Missing Friendli Token");
	}
	_llmType() {
		return "friendli";
	}
	constructHeaders(stream) {
		return {
			"Content-Type": "application/json",
			Accept: stream ? "text/event-stream" : "application/json",
			Authorization: `Bearer ${this.friendliToken}`,
			"X-Friendli-Team": this.friendliTeam ?? ""
		};
	}
	constructBody(messages, stream, _options) {
		const messageList = messages.map((message) => {
			if (typeof message.content !== "string") throw new Error("Friendli does not support non-string message content.");
			return {
				role: messageToFriendliRole(message),
				content: message.content
			};
		});
		const body = JSON.stringify({
			messages: messageList,
			stream,
			model: this.model,
			max_tokens: this.maxTokens,
			frequency_penalty: this.frequencyPenalty,
			stop: this.stop,
			temperature: this.temperature,
			top_p: this.topP,
			...this.modelKwargs
		});
		return body;
	}
	/**
	* Calls the Friendli endpoint and retrieves the result.
	* @param {BaseMessage[]} messages The input messages.
	* @returns {Promise<ChatResult>} A promise that resolves to the generated chat result.
	*/
	/** @ignore */
	async _generate(messages, _options) {
		const response = await this.caller.call(async () => fetch(`${this.baseUrl}/v1/chat/completions`, {
			method: "POST",
			headers: this.constructHeaders(false),
			body: this.constructBody(messages, false, _options)
		}).then((res) => res.json()));
		const generations = [];
		for (const data of response.choices ?? []) {
			const text = data.message?.content ?? "";
			const generation = {
				text,
				message: friendliResponseToChatMessage(data.message ?? {})
			};
			if (data.finish_reason) generation.generationInfo = { finish_reason: data.finish_reason };
			generations.push(generation);
		}
		return { generations };
	}
	async *_streamResponseChunks(messages, _options, runManager) {
		const response = await this.caller.call(async () => fetch(`${this.baseUrl}/v1/chat/completions`, {
			method: "POST",
			headers: this.constructHeaders(true),
			body: this.constructBody(messages, true, _options)
		}));
		if (response.status !== 200 || !response.body) {
			const errorResponse = await response.json();
			throw new Error(JSON.stringify(errorResponse));
		}
		const stream = convertEventStreamToIterableReadableDataStream(response.body);
		for await (const chunk of stream) {
			if (chunk === "[DONE]") break;
			const parsedChunk = JSON.parse(chunk);
			if (parsedChunk.choices[0].finish_reason === null) {
				const generationChunk = new ChatGenerationChunk({
					message: _convertDeltaToMessageChunk(parsedChunk.choices[0].delta),
					text: parsedChunk.choices[0].delta.content ?? "",
					generationInfo: { finishReason: parsedChunk.choices[0].finish_reason }
				});
				yield generationChunk;
				runManager?.handleLLMNewToken(generationChunk.text ?? "");
			}
		}
	}
};

//#endregion
export { ChatFriendli, friendli_exports };
//# sourceMappingURL=friendli.js.map
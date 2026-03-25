import profiles_default from "./profiles.js";
import { toJsonSchema } from "@langchain/core/utils/json_schema";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage, AIMessageChunk, ChatMessage, ChatMessageChunk, FunctionMessageChunk, HumanMessageChunk, SystemMessageChunk, ToolMessageChunk, isAIMessage } from "@langchain/core/messages";
import { ChatGenerationChunk } from "@langchain/core/outputs";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { isInteropZodSchema } from "@langchain/core/utils/types";
import Groq from "groq-sdk";
import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";
import { JsonOutputParser, StructuredOutputParser } from "@langchain/core/output_parsers";
import { JsonOutputKeyToolsParser, convertLangChainToolCallToOpenAI, makeInvalidToolCall, parseToolCall } from "@langchain/core/output_parsers/openai_tools";
import { convertToOpenAITool } from "@langchain/core/utils/function_calling";

//#region src/chat_models.ts
/**
* Const list of fields that we'll pick from the `ChatCompletionCreateParams` interface
* to use as the options allowed to be passed to invocation methods.
*
* @internal
*/
const CREATE_PARAMS_BASE_CALL_KEYS = [
	"frequency_penalty",
	"function_call",
	"functions",
	"logit_bias",
	"logprobs",
	"max_completion_tokens",
	"max_tokens",
	"n",
	"parallel_tool_calls",
	"presence_penalty",
	"reasoning_format",
	"response_format",
	"seed",
	"service_tier",
	"stop",
	"temperature",
	"tool_choice",
	"top_logprobs",
	"top_p"
];
const ADDED_CALL_KEYS = [
	"headers",
	"promptIndex",
	"stream_options",
	"tools"
];
const ALL_CALL_KEYS = [...CREATE_PARAMS_BASE_CALL_KEYS, ...ADDED_CALL_KEYS];
/**
* Extract the custom role from a message.
* @param message - The message to extract the custom role from.
* @returns The custom role of the message.
*/
function extractGenericMessageCustomRole(message) {
	if (message.role !== "system" && message.role !== "assistant" && message.role !== "user" && message.role !== "function") throw new Error(`Unsupported message role: ${message.role}. Expected "system", "assistant", "user", or "function"`);
	return message.role;
}
/**
* Extract the role from a message.
* @param message - The message to extract the role from.
* @returns The role of the message.
*/
function messageToGroqRole(message) {
	switch (message.type) {
		case "system": return "system";
		case "ai": return "assistant";
		case "human": return "user";
		case "function": return "function";
		case "tool": return "tool";
		case "generic":
			if (!ChatMessage.isInstance(message)) throw new Error("Invalid generic chat message");
			return extractGenericMessageCustomRole(message);
		default: throw new Error(`Unknown message type: ${message.type}`);
	}
}
function convertMessagesToGroqParams(messages) {
	return messages.map((message) => {
		const completionParam = {
			role: messageToGroqRole(message),
			content: message.content,
			name: message.name,
			function_call: message.additional_kwargs.function_call,
			tool_calls: message.additional_kwargs.tool_calls,
			tool_call_id: message.tool_call_id
		};
		if (isAIMessage(message) && !!message.tool_calls?.length) completionParam.tool_calls = message.tool_calls.map(convertLangChainToolCallToOpenAI);
		else {
			if (message.additional_kwargs.tool_calls != null) completionParam.tool_calls = message.additional_kwargs.tool_calls;
			if (message.tool_call_id != null) completionParam.tool_call_id = message.tool_call_id;
		}
		return completionParam;
	});
}
function groqResponseToChatMessage(message, usageMetadata, responseMetadata) {
	const rawToolCalls = message.tool_calls;
	switch (message.role) {
		case "assistant": {
			const toolCalls = [];
			const invalidToolCalls = [];
			for (const rawToolCall of rawToolCalls ?? []) try {
				toolCalls.push(parseToolCall(rawToolCall, { returnId: true }));
			} catch (e) {
				invalidToolCalls.push(makeInvalidToolCall(rawToolCall, e.message));
			}
			return new AIMessage({
				content: message.content || "",
				additional_kwargs: { tool_calls: rawToolCalls },
				tool_calls: toolCalls,
				invalid_tool_calls: invalidToolCalls,
				usage_metadata: usageMetadata,
				response_metadata: responseMetadata
			});
		}
		default: return new ChatMessage(message.content || "", message.role ?? "unknown");
	}
}
function _convertDeltaToMessageChunk(delta, defaultRole, rawResponse, lastMessageId) {
	const role = delta.role ?? defaultRole;
	const content = delta.content ?? "";
	let additional_kwargs;
	if (delta.function_call) additional_kwargs = { function_call: delta.function_call };
	else if (delta.tool_calls) additional_kwargs = { tool_calls: delta.tool_calls };
	else additional_kwargs = {};
	if (delta.audio) additional_kwargs.audio = {
		...delta.audio,
		index: rawResponse.choices[0].index
	};
	let usage;
	let groqMessageId = lastMessageId;
	let timing;
	const xGroq = rawResponse.x_groq;
	if (xGroq?.usage) {
		usage = {
			input_tokens: xGroq.usage.prompt_tokens,
			output_tokens: xGroq.usage.completion_tokens,
			total_tokens: xGroq.usage.total_tokens
		};
		timing = {
			completion_time: xGroq.usage.completion_time,
			prompt_time: xGroq.usage.prompt_time,
			queue_time: xGroq.usage.queue_time,
			total_time: xGroq.usage.total_time
		};
	}
	if (xGroq?.id) groqMessageId = xGroq.id;
	const response_metadata = {
		usage,
		timing
	};
	if (role === "user") return new HumanMessageChunk({
		content,
		response_metadata
	});
	else if (role === "assistant") {
		const toolCallChunks = [];
		if (Array.isArray(delta.tool_calls)) for (const rawToolCall of delta.tool_calls) toolCallChunks.push({
			name: rawToolCall.function?.name,
			args: rawToolCall.function?.arguments,
			id: rawToolCall.id,
			index: rawToolCall.index,
			type: "tool_call_chunk"
		});
		return new AIMessageChunk({
			content,
			tool_call_chunks: toolCallChunks,
			additional_kwargs,
			id: groqMessageId,
			response_metadata
		});
	} else if (role === "system") return new SystemMessageChunk({
		content,
		response_metadata
	});
	else if (role === "developer") return new SystemMessageChunk({
		content,
		response_metadata,
		additional_kwargs: { __openai_role__: "developer" }
	});
	else if (role === "function") return new FunctionMessageChunk({
		content,
		additional_kwargs,
		name: delta.name,
		response_metadata
	});
	else if (role === "tool") return new ToolMessageChunk({
		content,
		additional_kwargs,
		tool_call_id: delta.tool_call_id,
		response_metadata
	});
	else return new ChatMessageChunk({
		content,
		role,
		response_metadata
	});
}
/**
* Groq chat model integration.
*
* The Groq API is compatible to the OpenAI API with some limitations. View the
* full API ref at:
* @link {https://docs.api.groq.com/md/openai.oas.html}
*
* Setup:
* Install `@langchain/groq` and set an environment variable named `GROQ_API_KEY`.
*
* ```bash
* npm install @langchain/groq
* export GROQ_API_KEY="your-api-key"
* ```
*
* ## [Constructor args](https://api.js.langchain.com/classes/langchain_groq.ChatGroq.html#constructor)
*
* ## [Runtime args](https://api.js.langchain.com/interfaces/langchain_groq.ChatGroqCallOptions.html)
*
* Runtime args can be passed as the second argument to any of the base runnable methods `.invoke`. `.stream`, `.batch`, etc.
* They can also be passed via `.withConfig`, or the second arg in `.bindTools`, like shown in the examples below:
*
* ```typescript
* // When calling `.withConfig`, call options should be passed via the first argument
* const llmWithArgsBound = llm.withConfig({
*   stop: ["\n"],
* });
*
* // When calling `.bindTools`, call options should be passed via the second argument
* const llmWithTools = llm.bindTools(
*   [...],
*   {
*     tool_choice: "auto",
*   }
* );
* ```
*
* ## Examples
*
* <details open>
* <summary><strong>Instantiate</strong></summary>
*
* ```typescript
* import { ChatGroq } from '@langchain/groq';
*
* const llm = new ChatGroq({
*   model: "llama-3.3-70b-versatile",
*   temperature: 0,
*   // other params...
* });
* ```
* </details>
*
* <br />
*
* <details>
* <summary><strong>Invoking</strong></summary>
*
* ```typescript
* const input = `Translate "I love programming" into French.`;
*
* // Models also accept a list of chat messages or a formatted prompt
* const result = await llm.invoke(input);
* console.log(result);
* ```
*
* ```txt
* AIMessage {
*   "content": "The French translation of \"I love programming\" is \"J'aime programmer\". In this sentence, \"J'aime\" is the first person singular conjugation of the French verb \"aimer\" which means \"to love\", and \"programmer\" is the French infinitive for \"to program\". I hope this helps! Let me know if you have any other questions.",
*   "additional_kwargs": {},
*   "response_metadata": {
*     "tokenUsage": {
*       "completionTokens": 82,
*       "promptTokens": 20,
*       "totalTokens": 102
*     },
*     "finish_reason": "stop"
*   },
*   "tool_calls": [],
*   "invalid_tool_calls": []
* }
* ```
* </details>
*
* <br />
*
* <details>
* <summary><strong>Streaming Chunks</strong></summary>
*
* ```typescript
* for await (const chunk of await llm.stream(input)) {
*   console.log(chunk);
* }
* ```
*
* ```txt
* AIMessageChunk {
*   "content": "",
*   "additional_kwargs": {},
*   "response_metadata": {
*     "finishReason": null
*   },
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "content": "The",
*   "additional_kwargs": {},
*   "response_metadata": {
*     "finishReason": null
*   },
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "content": " French",
*   "additional_kwargs": {},
*   "response_metadata": {
*     "finishReason": null
*   },
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "content": " translation",
*   "additional_kwargs": {},
*   "response_metadata": {
*     "finishReason": null
*   },
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "content": " of",
*   "additional_kwargs": {},
*   "response_metadata": {
*     "finishReason": null
*   },
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "content": " \"",
*   "additional_kwargs": {},
*   "response_metadata": {
*     "finishReason": null
*   },
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "content": "I",
*   "additional_kwargs": {},
*   "response_metadata": {
*     "finishReason": null
*   },
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "content": " love",
*   "additional_kwargs": {},
*   "response_metadata": {
*     "finishReason": null
*   },
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* ...
* AIMessageChunk {
*   "content": ".",
*   "additional_kwargs": {},
*   "response_metadata": {
*     "finishReason": null
*   },
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "content": "",
*   "additional_kwargs": {},
*   "response_metadata": {
*     "finishReason": "stop"
*   },
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* ```
* </details>
*
* <br />
*
* <details>
* <summary><strong>Aggregate Streamed Chunks</strong></summary>
*
* ```typescript
* import { AIMessageChunk } from '@langchain/core/messages';
* import { concat } from '@langchain/core/utils/stream';
*
* const stream = await llm.stream(input);
* let full: AIMessageChunk | undefined;
* for await (const chunk of stream) {
*   full = !full ? chunk : concat(full, chunk);
* }
* console.log(full);
* ```
*
* ```txt
* AIMessageChunk {
*   "content": "The French translation of \"I love programming\" is \"J'aime programmer\". In this sentence, \"J'aime\" is the first person singular conjugation of the French verb \"aimer\" which means \"to love\", and \"programmer\" is the French infinitive for \"to program\". I hope this helps! Let me know if you have any other questions.",
*   "additional_kwargs": {},
*   "response_metadata": {
*     "finishReason": "stop"
*   },
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* ```
* </details>
*
* <br />
*
* <details>
* <summary><strong>Bind tools</strong></summary>
*
* ```typescript
* import { z } from 'zod';
*
* const llmForToolCalling = new ChatGroq({
*   model: "llama3-groq-70b-8192-tool-use-preview",
*   temperature: 0,
*   // other params...
* });
*
* const GetWeather = {
*   name: "GetWeather",
*   description: "Get the current weather in a given location",
*   schema: z.object({
*     location: z.string().describe("The city and state, e.g. San Francisco, CA")
*   }),
* }
*
* const GetPopulation = {
*   name: "GetPopulation",
*   description: "Get the current population in a given location",
*   schema: z.object({
*     location: z.string().describe("The city and state, e.g. San Francisco, CA")
*   }),
* }
*
* const llmWithTools = llmForToolCalling.bindTools([GetWeather, GetPopulation]);
* const aiMsg = await llmWithTools.invoke(
*   "Which city is hotter today and which is bigger: LA or NY?"
* );
* console.log(aiMsg.tool_calls);
* ```
*
* ```txt
* [
*   {
*     name: 'GetWeather',
*     args: { location: 'Los Angeles, CA' },
*     type: 'tool_call',
*     id: 'call_cd34'
*   },
*   {
*     name: 'GetWeather',
*     args: { location: 'New York, NY' },
*     type: 'tool_call',
*     id: 'call_68rf'
*   },
*   {
*     name: 'GetPopulation',
*     args: { location: 'Los Angeles, CA' },
*     type: 'tool_call',
*     id: 'call_f81z'
*   },
*   {
*     name: 'GetPopulation',
*     args: { location: 'New York, NY' },
*     type: 'tool_call',
*     id: 'call_8byt'
*   }
* ]
* ```
* </details>
*
* <br />
*
* <details>
* <summary><strong>Structured Output</strong></summary>
*
* ```typescript
* import { z } from 'zod';
*
* const Joke = z.object({
*   setup: z.string().describe("The setup of the joke"),
*   punchline: z.string().describe("The punchline to the joke"),
*   rating: z.number().optional().describe("How funny the joke is, from 1 to 10")
* }).describe('Joke to tell user.');
*
* const structuredLlm = llmForToolCalling.withStructuredOutput(Joke, { name: "Joke" });
* const jokeResult = await structuredLlm.invoke("Tell me a joke about cats");
* console.log(jokeResult);
* ```
*
* ```txt
* {
*   setup: "Why don't cats play poker in the wild?",
*   punchline: 'Because there are too many cheetahs.'
* }
* ```
* </details>
*
* <br />
*/
var ChatGroq = class extends BaseChatModel {
	lc_namespace = [
		"langchain",
		"chat_models",
		"groq"
	];
	client;
	model;
	temperature = .7;
	stop;
	stopSequences;
	maxTokens;
	streaming = false;
	apiKey;
	streamUsage = true;
	topP;
	frequencyPenalty;
	presencePenalty;
	logprobs;
	n;
	logitBias;
	user;
	reasoningFormat;
	serviceTier;
	topLogprobs;
	lc_serializable = true;
	get lc_serialized_keys() {
		return [
			"client",
			"model",
			"temperature",
			"stop",
			"stopSequences",
			"maxTokens",
			"streaming",
			"apiKey",
			"streamUsage",
			"topP",
			"frequencyPenalty",
			"presencePenalty",
			"logprobs",
			"n",
			"logitBias",
			"user",
			"reasoningFormat",
			"serviceTier",
			"topLogprobs"
		];
	}
	static lc_name() {
		return "ChatGroq";
	}
	_llmType() {
		return "groq";
	}
	get lc_secrets() {
		return { apiKey: "GROQ_API_KEY" };
	}
	get callKeys() {
		return [...super.callKeys, ...ALL_CALL_KEYS];
	}
	constructor(fields) {
		super(fields);
		const apiKey = fields.apiKey || getEnvironmentVariable("GROQ_API_KEY");
		if (!apiKey) throw new Error(`Groq API key not found. Please set the GROQ_API_KEY environment variable or provide the key into "apiKey"`);
		const defaultHeaders = {
			"User-Agent": "langchainjs",
			...fields.defaultHeaders ?? {}
		};
		this.client = new Groq({
			apiKey,
			dangerouslyAllowBrowser: true,
			baseURL: fields.baseUrl,
			timeout: fields.timeout,
			httpAgent: fields.httpAgent,
			fetch: fields.fetch,
			maxRetries: 0,
			defaultHeaders,
			defaultQuery: fields.defaultQuery
		});
		this.apiKey = apiKey;
		this.temperature = fields.temperature ?? this.temperature;
		this.model = fields.model;
		this.streaming = fields.streaming ?? this.streaming;
		this.stop = fields.stopSequences ?? (typeof fields.stop === "string" ? [fields.stop] : fields.stop) ?? [];
		this.stopSequences = this.stop;
		this.maxTokens = fields.maxTokens;
		this.topP = fields.topP;
		this.frequencyPenalty = fields.frequencyPenalty;
		this.presencePenalty = fields.presencePenalty;
		this.logprobs = fields.logprobs;
		this.n = fields.n;
		this.logitBias = fields.logitBias;
		this.user = fields.user;
	}
	getLsParams(options) {
		const params = this.invocationParams(options);
		return {
			ls_provider: "groq",
			ls_model_name: this.model,
			ls_model_type: "chat",
			ls_temperature: params.temperature ?? this.temperature,
			ls_max_tokens: params.max_tokens ?? this.maxTokens,
			ls_stop: options.stop
		};
	}
	async completionWithRetry(request, options) {
		return this.caller.call(async () => this.client.chat.completions.create(request, options));
	}
	invocationParams(options, extra) {
		const params = super.invocationParams(options);
		let streamOptionsConfig = {};
		if (options?.stream_options !== void 0) streamOptionsConfig = { stream_options: options.stream_options };
		else if (this.streamUsage && this.streaming || extra?.streaming) streamOptionsConfig = { stream_options: { include_usage: true } };
		const toReturn = {
			model: this.model,
			frequency_penalty: this.frequencyPenalty,
			function_call: options?.function_call,
			functions: options?.functions,
			logit_bias: this.logitBias,
			logprobs: this.logprobs,
			n: this.n,
			parallel_tool_calls: options?.parallel_tool_calls,
			presence_penalty: this.presencePenalty,
			reasoning_format: this.reasoningFormat,
			response_format: options?.response_format,
			seed: options?.seed,
			service_tier: this.serviceTier,
			stop: options?.stop ?? this.stopSequences,
			temperature: options?.temperature ?? this.temperature,
			tool_choice: _formatToGroqToolChoice(options?.tool_choice),
			tools: options?.tools?.length ? options.tools.map((tool) => convertToOpenAITool(tool)) : void 0,
			top_logprobs: this.topLogprobs,
			top_p: this.topP,
			user: this.user,
			stream: this.streaming,
			...params,
			...streamOptionsConfig
		};
		toReturn.max_completion_tokens = options?.max_completion_tokens ?? options?.max_tokens ?? this.maxTokens;
		if (toReturn.max_completion_tokens === -1) delete toReturn.max_completion_tokens;
		return toReturn;
	}
	bindTools(tools, kwargs) {
		return this.withConfig({
			tools: tools.map((tool) => convertToOpenAITool(tool)),
			...kwargs
		});
	}
	async *_streamResponseChunks(messages, options, runManager) {
		const params = this.invocationParams(options, { streaming: true });
		const messagesMapped = convertMessagesToGroqParams(messages);
		const response = await this.completionWithRetry({
			...params,
			messages: messagesMapped,
			stream: true
		}, {
			signal: options?.signal,
			headers: options?.headers
		});
		let role;
		let lastMessageId;
		let responseMetadata;
		for await (const data of response) {
			responseMetadata = data;
			const choice = data?.choices[0];
			if (!choice) continue;
			if (choice.delta?.role) role = choice.delta.role;
			const chunk = _convertDeltaToMessageChunk(choice.delta, role, data, lastMessageId);
			const newTokenIndices = {
				prompt: options.promptIndex ?? 0,
				completion: choice.index ?? 0
			};
			if (typeof chunk.content !== "string") {
				console.log("[WARNING]: Received non-string content from OpenAI. This is currently not supported.");
				continue;
			}
			const generationInfo = { ...newTokenIndices };
			if (choice.finish_reason != null) {
				generationInfo.finish_reason = choice.finish_reason;
				generationInfo.system_fingerprint = data.system_fingerprint;
				generationInfo.model_name = data.model;
			}
			const generationChunk = new ChatGenerationChunk({
				message: chunk,
				text: chunk.content,
				generationInfo
			});
			yield generationChunk;
			await runManager?.handleLLMNewToken(generationChunk.text ?? "", newTokenIndices, void 0, void 0, void 0, { chunk: generationChunk });
		}
		if (responseMetadata) {
			if ("choices" in responseMetadata) delete responseMetadata.choices;
			yield new ChatGenerationChunk({
				message: new AIMessageChunk({
					content: "",
					response_metadata: responseMetadata
				}),
				text: ""
			});
		}
		if (options.signal?.aborted) throw new Error("AbortError");
	}
	async _generate(messages, options, runManager) {
		if (this.streaming) {
			const tokenUsage = {};
			const stream = this._streamResponseChunks(messages, options, runManager);
			const finalChunks = {};
			for await (const chunk of stream) {
				const index = chunk.generationInfo?.completion ?? 0;
				if (finalChunks[index] === void 0) finalChunks[index] = chunk;
				else finalChunks[index] = finalChunks[index].concat(chunk);
			}
			const generations = Object.entries(finalChunks).sort(([aKey], [bKey]) => parseInt(aKey, 10) - parseInt(bKey, 10)).map(([_, value]) => value);
			return {
				generations,
				llmOutput: { estimatedTokenUsage: tokenUsage }
			};
		} else return this._generateNonStreaming(messages, options, runManager);
	}
	async _generateNonStreaming(messages, options, _runManager) {
		const tokenUsage = {};
		const params = this.invocationParams(options);
		const messagesMapped = convertMessagesToGroqParams(messages);
		const data = await this.completionWithRetry({
			...params,
			stream: false,
			messages: messagesMapped
		}, {
			signal: options?.signal,
			headers: options?.headers
		});
		if ("usage" in data && data.usage) {
			const { completion_tokens: completionTokens, prompt_tokens: promptTokens, total_tokens: totalTokens } = data.usage;
			if (completionTokens) tokenUsage.completionTokens = (tokenUsage.completionTokens ?? 0) + completionTokens;
			if (promptTokens) tokenUsage.promptTokens = (tokenUsage.promptTokens ?? 0) + promptTokens;
			if (totalTokens) tokenUsage.totalTokens = (tokenUsage.totalTokens ?? 0) + totalTokens;
		}
		const generations = [];
		if ("choices" in data && data.choices) for (const part of data.choices) {
			const text = part.message?.content ?? "";
			let usageMetadata;
			if (tokenUsage.totalTokens !== void 0) usageMetadata = {
				input_tokens: tokenUsage.promptTokens ?? 0,
				output_tokens: tokenUsage.completionTokens ?? 0,
				total_tokens: tokenUsage.totalTokens
			};
			const { choices: _choices,...metadata } = data;
			const generation = {
				text,
				message: groqResponseToChatMessage(part.message ?? { role: "assistant" }, usageMetadata, metadata)
			};
			generation.generationInfo = {
				...part.finish_reason ? { finish_reason: part.finish_reason } : {},
				...part.logprobs ? { logprobs: part.logprobs } : {}
			};
			generations.push(generation);
		}
		return {
			generations,
			llmOutput: { tokenUsage }
		};
	}
	/**
	* Return profiling information for the model.
	*
	* Provides information about the model's capabilities and constraints,
	* including token limits, multimodal support, and advanced features like
	* tool calling and structured output.
	*
	* @returns {ModelProfile} An object describing the model's capabilities and constraints
	*
	* @example
	* ```typescript
	* const model = new ChatGroq({ model: "llama-3.1-8b-instant" });
	* const profile = model.profile;
	* console.log(profile.maxInputTokens); // 128000
	* console.log(profile.imageInputs); // true
	* ```
	*/
	get profile() {
		return profiles_default[this.model] ?? {};
	}
	withStructuredOutput(outputSchema, config) {
		const schema = outputSchema;
		const name = config?.name;
		const method = config?.method;
		const includeRaw = config?.includeRaw;
		let functionName = name ?? "extract";
		let outputParser;
		let llm;
		if (method === "jsonMode") {
			let outputSchema$1;
			if (isInteropZodSchema(schema)) {
				outputParser = StructuredOutputParser.fromZodSchema(schema);
				outputSchema$1 = toJsonSchema(schema);
			} else outputParser = new JsonOutputParser();
			llm = this.withConfig({
				response_format: { type: "json_object" },
				ls_structured_output_format: {
					kwargs: { method: "jsonMode" },
					schema: outputSchema$1
				}
			});
		} else if (isInteropZodSchema(schema)) {
			const asJsonSchema = toJsonSchema(schema);
			llm = this.bindTools([{
				type: "function",
				function: {
					name: functionName,
					description: asJsonSchema.description,
					parameters: asJsonSchema
				}
			}]).withConfig({
				tool_choice: {
					type: "function",
					function: { name: functionName }
				},
				ls_structured_output_format: {
					kwargs: { method: "functionCalling" },
					schema: asJsonSchema
				}
			});
			outputParser = new JsonOutputKeyToolsParser({
				returnSingle: true,
				keyName: functionName,
				zodSchema: schema
			});
		} else {
			let openAIFunctionDefinition;
			if (typeof schema.name === "string" && typeof schema.parameters === "object" && schema.parameters != null) {
				openAIFunctionDefinition = schema;
				functionName = schema.name;
			} else {
				functionName = schema.title ?? functionName;
				openAIFunctionDefinition = {
					name: functionName,
					description: schema.description ?? "",
					parameters: schema
				};
			}
			llm = this.bindTools([{
				type: "function",
				function: openAIFunctionDefinition
			}]).withConfig({
				tool_choice: {
					type: "function",
					function: { name: functionName }
				},
				ls_structured_output_format: {
					kwargs: { method: "functionCalling" },
					schema
				}
			});
			outputParser = new JsonOutputKeyToolsParser({
				returnSingle: true,
				keyName: functionName
			});
		}
		if (!includeRaw) return llm.pipe(outputParser).withConfig({ runName: "ChatGroqStructuredOutput" });
		const parserAssign = RunnablePassthrough.assign({ parsed: (input, config$1) => outputParser.invoke(input.raw, config$1) });
		const parserNone = RunnablePassthrough.assign({ parsed: () => null });
		const parsedWithFallback = parserAssign.withFallbacks({ fallbacks: [parserNone] });
		return RunnableSequence.from([{ raw: llm }, parsedWithFallback]).withConfig({ runName: "ChatGroqStructuredOutput" });
	}
};
function _formatToGroqToolChoice(toolChoice) {
	if (!toolChoice) return void 0;
	else if (toolChoice === "any" || toolChoice === "required") return "required";
	else if (toolChoice === "auto") return "auto";
	else if (toolChoice === "none") return "none";
	else if (typeof toolChoice === "string") return {
		type: "function",
		function: { name: toolChoice }
	};
	else return toolChoice;
}

//#endregion
export { ChatGroq, messageToGroqRole };
//# sourceMappingURL=chat_models.js.map
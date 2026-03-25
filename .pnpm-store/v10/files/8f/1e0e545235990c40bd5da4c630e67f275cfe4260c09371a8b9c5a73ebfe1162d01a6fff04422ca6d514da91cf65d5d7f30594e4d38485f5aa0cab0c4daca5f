import { __export } from "../../_virtual/rolldown_runtime.js";
import { _toolsInParams, isAnthropicTool } from "../../utils/bedrock/anthropic.js";
import { BedrockLLMInputOutputAdapter } from "../../utils/bedrock/index.js";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage, AIMessageChunk, ChatMessage, isAIMessage } from "@langchain/core/messages";
import { ChatGenerationChunk } from "@langchain/core/outputs";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { isLangChainTool, isStructuredTool } from "@langchain/core/utils/function_calling";
import { isInteropZodSchema } from "@langchain/core/utils/types";
import { toJsonSchema } from "@langchain/core/utils/json_schema";
import { SignatureV4 } from "@smithy/signature-v4";
import { HttpRequest } from "@smithy/protocol-http";
import { EventStreamCodec } from "@smithy/eventstream-codec";
import { fromUtf8, toUtf8 } from "@smithy/util-utf8";
import { Sha256 } from "@aws-crypto/sha256-js";
import { isOpenAITool } from "@langchain/core/language_models/base";

//#region src/chat_models/bedrock/web.ts
var web_exports = {};
__export(web_exports, {
	BedrockChat: () => BedrockChat,
	convertMessagesToPrompt: () => convertMessagesToPrompt,
	convertMessagesToPromptAnthropic: () => convertMessagesToPromptAnthropic
});
/**
* @see https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RegionsAndAvailabilityZones.html#Concepts.RegionsAndAvailabilityZones.Regions
*/
const AWS_REGIONS = [
	"us",
	"sa",
	"me",
	"mx",
	"il",
	"eu",
	"cn",
	"ca",
	"ap",
	"af",
	"us-gov",
	"apac"
];
const ALLOWED_MODEL_PROVIDERS = [
	"ai21",
	"anthropic",
	"amazon",
	"cohere",
	"meta",
	"mistral",
	"deepseek"
];
const PRELUDE_TOTAL_LENGTH_BYTES = 4;
function convertOneMessageToText(message, humanPrompt, aiPrompt) {
	if (message._getType() === "human") return `${humanPrompt} ${message.content}`;
	else if (message._getType() === "ai") return `${aiPrompt} ${message.content}`;
	else if (message._getType() === "system") return `${humanPrompt} <admin>${message.content}</admin>`;
	else if (message._getType() === "function") return `${humanPrompt} ${message.content}`;
	else if (ChatMessage.isInstance(message)) return `\n\n${message.role[0].toUpperCase() + message.role.slice(1)}: {message.content}`;
	throw new Error(`Unknown role: ${message._getType()}`);
}
function convertMessagesToPromptAnthropic(messages, humanPrompt = "\n\nHuman:", aiPrompt = "\n\nAssistant:") {
	const messagesCopy = [...messages];
	if (messagesCopy.length === 0 || messagesCopy[messagesCopy.length - 1]._getType() !== "ai") messagesCopy.push(new AIMessage({ content: "" }));
	return messagesCopy.map((message) => convertOneMessageToText(message, humanPrompt, aiPrompt)).join("");
}
/**
* Function that converts an array of messages into a single string prompt
* that can be used as input for a chat model. It delegates the conversion
* logic to the appropriate provider-specific function.
* @param messages Array of messages to be converted.
* @param options Options to be used during the conversion.
* @returns A string prompt that can be used as input for a chat model.
*/
function convertMessagesToPrompt(messages, provider) {
	if (provider === "anthropic") return convertMessagesToPromptAnthropic(messages);
	throw new Error(`Provider ${provider} does not support chat.`);
}
function formatTools(tools) {
	if (!tools || !tools.length) return [];
	if (tools.every(isLangChainTool)) return tools.map((tc) => ({
		name: tc.name,
		description: tc.description,
		input_schema: isInteropZodSchema(tc.schema) ? toJsonSchema(tc.schema) : tc.schema
	}));
	if (tools.every(isOpenAITool)) return tools.map((tc) => ({
		name: tc.function.name,
		description: tc.function.description,
		input_schema: tc.function.parameters
	}));
	if (tools.every(isAnthropicTool)) return tools;
	if (tools.some(isStructuredTool) || tools.some(isOpenAITool) || tools.some(isAnthropicTool)) throw new Error("All tools passed to BedrockChat must be of the same type.");
	throw new Error("Invalid tool format received.");
}
/**
* AWS Bedrock chat model integration.
*
* Setup:
* Install `@langchain/community` and set the following environment variables:
*
* ```bash
* npm install @langchain/openai
* export AWS_REGION="your-aws-region"
* export AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
* export AWS_ACCESS_KEY_ID="your-aws-access-key-id"
* ```
*
* ## [Constructor args](/classes/langchain_community_chat_models_bedrock.BedrockChat.html#constructor)
*
* ## [Runtime args](/interfaces/langchain_community_chat_models_bedrock_web.BedrockChatCallOptions.html)
*
* Runtime args can be passed as the second argument to any of the base runnable methods `.invoke`. `.stream`, `.batch`, etc.
* They can also be passed via `.withConfig`, or the second arg in `.bindTools`, like shown in the examples below:
*
* ```typescript
* // When calling `.withConfig`, call options should be passed via the first argument
* const llmWithArgsBound = llm.withConfig({
*   stop: ["\n"],
*   tools: [...],
* });
*
* // When calling `.bindTools`, call options should be passed via the second argument
* const llmWithTools = llm.bindTools(
*   [...],
*   {
*     stop: ["stop on this token!"],
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
* import { BedrockChat } from '@langchain/community/chat_models/bedrock/web';
*
* const llm = new BedrockChat({
*   region: process.env.AWS_REGION,
*   maxRetries: 0,
*   model: "anthropic.claude-3-5-sonnet-20240620-v1:0",
*   temperature: 0,
*   maxTokens: undefined,
*   // other params...
* });
*
* // You can also pass credentials in explicitly:
* const llmWithCredentials = new BedrockChat({
*   region: process.env.BEDROCK_AWS_REGION,
*   model: "anthropic.claude-3-5-sonnet-20240620-v1:0",
*   credentials: {
*     secretAccessKey: process.env.BEDROCK_AWS_SECRET_ACCESS_KEY!,
*     accessKeyId: process.env.BEDROCK_AWS_ACCESS_KEY_ID!,
*   },
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
*   "content": "Here's the translation to French:\n\nJ'adore la programmation.",
*   "additional_kwargs": {
*     "id": "msg_bdrk_01HCZHa2mKbMZeTeHjLDd286"
*   },
*   "response_metadata": {
*     "type": "message",
*     "role": "assistant",
*     "model": "claude-3-5-sonnet-20240620",
*     "stop_reason": "end_turn",
*     "stop_sequence": null,
*     "usage": {
*       "input_tokens": 25,
*       "output_tokens": 19
*     }
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
*   "additional_kwargs": {
*     "id": "msg_bdrk_01RhFuGR9uJ2bj5GbdAma4y6"
*   },
*   "response_metadata": {
*     "type": "message",
*     "role": "assistant",
*     "model": "claude-3-5-sonnet-20240620",
*     "stop_reason": null,
*     "stop_sequence": null
*   },
* }
* AIMessageChunk {
*   "content": "J",
* }
* AIMessageChunk {
*   "content": "'adore la",
* }
* AIMessageChunk {
*   "content": " programmation.",
* }
* AIMessageChunk {
*   "content": "",
*   "additional_kwargs": {
*     "stop_reason": "end_turn",
*     "stop_sequence": null
*   },
* }
* AIMessageChunk {
*   "content": "",
*   "response_metadata": {
*     "amazon-bedrock-invocationMetrics": {
*       "inputTokenCount": 25,
*       "outputTokenCount": 11,
*       "invocationLatency": 659,
*       "firstByteLatency": 506
*     }
*   },
*   "usage_metadata": {
*     "input_tokens": 25,
*     "output_tokens": 11,
*     "total_tokens": 36
*   }
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
*   "content": "J'adore la programmation.",
*   "additional_kwargs": {
*     "id": "msg_bdrk_017b6PuBybA51P5LZ9K6gZHm",
*     "stop_reason": "end_turn",
*     "stop_sequence": null
*   },
*   "response_metadata": {
*     "type": "message",
*     "role": "assistant",
*     "model": "claude-3-5-sonnet-20240620",
*     "stop_reason": null,
*     "stop_sequence": null,
*     "amazon-bedrock-invocationMetrics": {
*       "inputTokenCount": 25,
*       "outputTokenCount": 11,
*       "invocationLatency": 1181,
*       "firstByteLatency": 1177
*     }
*   },
*   "usage_metadata": {
*     "input_tokens": 25,
*     "output_tokens": 11,
*     "total_tokens": 36
*   }
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
* import { AIMessage } from '@langchain/core/messages';
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
* const llmWithTools = llm.bindTools([GetWeather, GetPopulation]);
* const aiMsg: AIMessage = await llmWithTools.invoke(
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
*     id: 'toolu_bdrk_01R2daqwHR931r4baVNzbe38',
*     type: 'tool_call'
*   },
*   {
*     name: 'GetWeather',
*     args: { location: 'New York, NY' },
*     id: 'toolu_bdrk_01WDadwNc7PGqVZvCN7Dr7eD',
*     type: 'tool_call'
*   },
*   {
*     name: 'GetPopulation',
*     args: { location: 'Los Angeles, CA' },
*     id: 'toolu_bdrk_014b8zLkpAgpxrPfewKinJFc',
*     type: 'tool_call'
*   },
*   {
*     name: 'GetPopulation',
*     args: { location: 'New York, NY' },
*     id: 'toolu_bdrk_01Tt8K2MUP15kNuMDFCLEFKN',
*     type: 'tool_call'
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
* const Joke = z.object({
*   setup: z.string().describe("The setup of the joke"),
*   punchline: z.string().describe("The punchline to the joke"),
*   rating: z.number().optional().describe("How funny the joke is, from 1 to 10")
* }).describe('Joke to tell user.');
*
* const structuredLlm = llm.withStructuredOutput(Joke);
* const jokeResult = await structuredLlm.invoke("Tell me a joke about cats");
* console.log(jokeResult);
* ```
*
* ```txt
* {
*   setup: "Why don't cats play poker in the jungle?",
*   punchline: 'Too many cheetahs!'
* }
* ```
* </details>
*
* <br />
*
* <details>
* <summary><strong>Response Metadata</strong></summary>
*
* ```typescript
* const aiMsgForResponseMetadata = await llm.invoke(input);
* console.log(aiMsgForResponseMetadata.response_metadata);
* ```
*
* ```txt
* "response_metadata": {
*   "type": "message",
*   "role": "assistant",
*   "model": "claude-3-5-sonnet-20240620",
*   "stop_reason": "end_turn",
*   "stop_sequence": null,
*   "usage": {
*     "input_tokens": 25,
*     "output_tokens": 19
*   }
* }
* ```
* </details>
*/
var BedrockChat = class extends BaseChatModel {
	model = "amazon.titan-tg1-large";
	modelProvider;
	region;
	credentials;
	temperature = void 0;
	maxTokens = void 0;
	fetchFn;
	endpointHost;
	modelKwargs;
	codec = new EventStreamCodec(toUtf8, fromUtf8);
	streaming = false;
	usesMessagesApi = false;
	lc_serializable = true;
	trace;
	guardrailIdentifier = "";
	guardrailVersion = "";
	guardrailConfig;
	get lc_aliases() {
		return {
			model: "model_id",
			region: "region_name"
		};
	}
	get lc_secrets() {
		return {
			"credentials.accessKeyId": "AWS_ACCESS_KEY_ID",
			"credentials.secretAccessKey": "AWS_SECRET_ACCESS_KEY",
			"credentials.sessionToken": "AWS_SECRET_ACCESS_KEY",
			awsAccessKeyId: "AWS_ACCESS_KEY_ID",
			awsSecretAccessKey: "AWS_SECRET_ACCESS_KEY",
			awsSessionToken: "AWS_SESSION_TOKEN"
		};
	}
	get lc_attributes() {
		return { region: this.region };
	}
	_identifyingParams() {
		return { model: this.model };
	}
	_llmType() {
		return "bedrock";
	}
	static lc_name() {
		return "BedrockChat";
	}
	constructor(fields) {
		const awsAccessKeyId = fields?.awsAccessKeyId ?? getEnvironmentVariable("AWS_ACCESS_KEY_ID");
		const awsSecretAccessKey = fields?.awsSecretAccessKey ?? getEnvironmentVariable("AWS_SECRET_ACCESS_KEY");
		const awsSessionToken = fields?.awsSessionToken ?? getEnvironmentVariable("AWS_SESSION_TOKEN");
		let credentials = fields?.credentials;
		if (credentials === void 0) {
			if (awsAccessKeyId === void 0 || awsSecretAccessKey === void 0) throw new Error("Please set your AWS credentials in the 'credentials' field or set env vars AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, and optionally AWS_SESSION_TOKEN.");
			credentials = {
				accessKeyId: awsAccessKeyId,
				secretAccessKey: awsSecretAccessKey,
				sessionToken: awsSessionToken
			};
		}
		fields = {
			...fields,
			awsAccessKeyId,
			awsSecretAccessKey,
			awsSessionToken
		};
		super(fields);
		this.model = fields?.model ?? this.model;
		this.modelProvider = getModelProvider(this.model);
		if (!ALLOWED_MODEL_PROVIDERS.includes(this.modelProvider)) throw new Error(`Unknown model provider: '${this.modelProvider}', only these are supported: ${ALLOWED_MODEL_PROVIDERS}`);
		const region = fields?.region ?? getEnvironmentVariable("AWS_DEFAULT_REGION");
		if (!region) throw new Error("Please set the AWS_DEFAULT_REGION environment variable or pass it to the constructor as the region field.");
		this.region = region;
		this.credentials = credentials;
		this.temperature = fields?.temperature ?? this.temperature;
		this.maxTokens = fields?.maxTokens ?? this.maxTokens;
		this.fetchFn = fields?.fetchFn ?? fetch.bind(globalThis);
		this.endpointHost = fields?.endpointHost ?? fields?.endpointUrl;
		this.modelKwargs = fields?.modelKwargs;
		this.streaming = fields?.streaming ?? this.streaming;
		this.usesMessagesApi = canUseMessagesApi(this.model);
		this.trace = fields?.trace ?? this.trace;
		this.guardrailVersion = fields?.guardrailVersion ?? this.guardrailVersion;
		this.guardrailIdentifier = fields?.guardrailIdentifier ?? this.guardrailIdentifier;
		this.guardrailConfig = fields?.guardrailConfig;
		if (fields?.applicationInferenceProfile) this.model = fields?.applicationInferenceProfile;
	}
	invocationParams(options) {
		if (options?.tool_choice) throw new Error("'tool_choice' call option is not supported by BedrockChat.");
		return {
			tools: options?.tools ? formatTools(options.tools) : void 0,
			temperature: this.temperature,
			max_tokens: this.maxTokens,
			stop: options?.stop,
			modelKwargs: this.modelKwargs,
			guardrailConfig: this.guardrailConfig
		};
	}
	getLsParams(options) {
		const params = this.invocationParams(options);
		return {
			ls_provider: "bedrock",
			ls_model_name: this.model,
			ls_model_type: "chat",
			ls_temperature: params.temperature ?? void 0,
			ls_max_tokens: params.max_tokens ?? void 0,
			ls_stop: options.stop
		};
	}
	async _generate(messages, options, runManager) {
		if (this.streaming) {
			const stream = this._streamResponseChunks(messages, options, runManager);
			let finalResult;
			for await (const chunk of stream) if (finalResult === void 0) finalResult = chunk;
			else finalResult = finalResult.concat(chunk);
			if (finalResult === void 0) throw new Error("Could not parse final output from Bedrock streaming call.");
			return {
				generations: [finalResult],
				llmOutput: finalResult.generationInfo
			};
		}
		return this._generateNonStreaming(messages, options, runManager);
	}
	async _generateNonStreaming(messages, options, _runManager) {
		const service = "bedrock-runtime";
		const endpointHost = this.endpointHost ?? `${service}.${this.region}.amazonaws.com`;
		const provider = this.modelProvider;
		const response = await this._signedFetch(messages, options, {
			bedrockMethod: "invoke",
			endpointHost,
			provider
		});
		const json = await response.json();
		if (!response.ok) throw new Error(`Error ${response.status}: ${json.message ?? JSON.stringify(json)}`);
		if (this.usesMessagesApi) {
			const outputGeneration = BedrockLLMInputOutputAdapter.prepareMessagesOutput(provider, json);
			if (outputGeneration === void 0) throw new Error("Failed to parse output generation.");
			return {
				generations: [outputGeneration],
				llmOutput: outputGeneration.generationInfo
			};
		} else {
			const text = BedrockLLMInputOutputAdapter.prepareOutput(provider, json);
			return { generations: [{
				text,
				message: new AIMessage(text)
			}] };
		}
	}
	async _signedFetch(messages, options, fields) {
		const { bedrockMethod, endpointHost, provider } = fields;
		const { max_tokens, temperature, stop, modelKwargs, guardrailConfig, tools } = this.invocationParams(options);
		const inputBody = this.usesMessagesApi ? BedrockLLMInputOutputAdapter.prepareMessagesInput(provider, messages, max_tokens, temperature, stop, modelKwargs, guardrailConfig, tools) : BedrockLLMInputOutputAdapter.prepareInput(provider, convertMessagesToPromptAnthropic(messages), max_tokens, temperature, stop, modelKwargs, fields.bedrockMethod, guardrailConfig);
		const url = new URL(`https://${endpointHost}/model/${this.model}/${bedrockMethod}`);
		const request = new HttpRequest({
			hostname: url.hostname,
			path: url.pathname,
			protocol: url.protocol,
			method: "POST",
			body: JSON.stringify(inputBody),
			query: Object.fromEntries(url.searchParams.entries()),
			headers: {
				host: url.host,
				accept: "application/json",
				"content-type": "application/json",
				...this.trace && this.guardrailIdentifier && this.guardrailVersion && {
					"X-Amzn-Bedrock-Trace": this.trace,
					"X-Amzn-Bedrock-GuardrailIdentifier": this.guardrailIdentifier,
					"X-Amzn-Bedrock-GuardrailVersion": this.guardrailVersion
				}
			}
		});
		const signer = new SignatureV4({
			credentials: this.credentials,
			service: "bedrock",
			region: this.region,
			sha256: Sha256
		});
		const signedRequest = await signer.sign(request);
		const response = await this.caller.callWithOptions({ signal: options.signal }, async () => this.fetchFn(url, {
			headers: signedRequest.headers,
			body: signedRequest.body,
			method: signedRequest.method
		}));
		return response;
	}
	async *_streamResponseChunks(messages, options, runManager) {
		const provider = this.modelProvider;
		const service = "bedrock-runtime";
		const endpointHost = this.endpointHost ?? `${service}.${this.region}.amazonaws.com`;
		const bedrockMethod = provider === "anthropic" || provider === "cohere" || provider === "meta" || provider === "mistral" ? "invoke-with-response-stream" : "invoke";
		const response = await this._signedFetch(messages, options, {
			bedrockMethod,
			endpointHost,
			provider
		});
		if (response.status < 200 || response.status >= 300) throw Error(`Failed to access underlying url '${endpointHost}': got ${response.status} ${response.statusText}: ${await response.text()}`);
		if (provider === "anthropic" || provider === "cohere" || provider === "meta" || provider === "mistral") {
			const toolsInParams = _toolsInParams(options);
			const reader = response.body?.getReader();
			const decoder = new TextDecoder();
			for await (const chunk of this._readChunks(reader)) {
				const event = this.codec.decode(chunk);
				if (event.headers[":event-type"] !== void 0 && event.headers[":event-type"].value !== "chunk" || event.headers[":content-type"].value !== "application/json") throw Error(`Failed to get event chunk: got ${chunk}`);
				const body = JSON.parse(decoder.decode(event.body));
				if (body.message) throw new Error(body.message);
				if (body.bytes !== void 0) {
					const chunkResult = JSON.parse(decoder.decode(Uint8Array.from(atob(body.bytes), (m) => m.codePointAt(0) ?? 0)));
					if (this.usesMessagesApi) {
						const chunk$1 = BedrockLLMInputOutputAdapter.prepareMessagesOutput(provider, chunkResult, { coerceContentToString: !toolsInParams });
						if (chunk$1 === void 0) continue;
						if (provider === "anthropic" && chunk$1.generationInfo?.usage !== void 0) delete chunk$1.generationInfo.usage;
						const finalMetrics = chunk$1.generationInfo?.["amazon-bedrock-invocationMetrics"];
						if (finalMetrics != null && typeof finalMetrics === "object" && isAIMessage(chunk$1.message)) chunk$1.message.usage_metadata = {
							input_tokens: finalMetrics.inputTokenCount,
							output_tokens: finalMetrics.outputTokenCount,
							total_tokens: finalMetrics.inputTokenCount + finalMetrics.outputTokenCount
						};
						if (isChatGenerationChunk(chunk$1)) {
							yield chunk$1;
							runManager?.handleLLMNewToken(chunk$1.text, void 0, void 0, void 0, void 0, { chunk: chunk$1 });
						} else runManager?.handleLLMNewToken(chunk$1.text);
					} else {
						const text = BedrockLLMInputOutputAdapter.prepareOutput(provider, chunkResult);
						const chunk$1 = new ChatGenerationChunk({
							text,
							message: new AIMessageChunk({ content: text })
						});
						yield chunk$1;
						runManager?.handleLLMNewToken(text, void 0, void 0, void 0, void 0, { chunk: chunk$1 });
					}
				}
			}
		} else {
			const json = await response.json();
			const text = BedrockLLMInputOutputAdapter.prepareOutput(provider, json);
			yield new ChatGenerationChunk({
				text,
				message: new AIMessageChunk({ content: text })
			});
			runManager?.handleLLMNewToken(text);
		}
	}
	_readChunks(reader) {
		function _concatChunks(a, b) {
			const newBuffer = new Uint8Array(a.length + b.length);
			newBuffer.set(a);
			newBuffer.set(b, a.length);
			return newBuffer;
		}
		function getMessageLength(buffer) {
			if (buffer.byteLength < PRELUDE_TOTAL_LENGTH_BYTES) return 0;
			const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
			return view.getUint32(0, false);
		}
		return { async *[Symbol.asyncIterator]() {
			let readResult = await reader.read();
			let buffer = new Uint8Array(0);
			while (!readResult.done) {
				const chunk = readResult.value;
				buffer = _concatChunks(buffer, chunk);
				let messageLength = getMessageLength(buffer);
				while (buffer.byteLength >= PRELUDE_TOTAL_LENGTH_BYTES && buffer.byteLength >= messageLength) {
					yield buffer.slice(0, messageLength);
					buffer = buffer.slice(messageLength);
					messageLength = getMessageLength(buffer);
				}
				readResult = await reader.read();
			}
		} };
	}
	_combineLLMOutput() {
		return {};
	}
	bindTools(tools, _kwargs) {
		const provider = this.modelProvider;
		if (provider !== "anthropic") throw new Error("Currently, tool calling through Bedrock is only supported for Anthropic models.");
		return this.withConfig({ tools: formatTools(tools) });
	}
};
function isChatGenerationChunk(x) {
	return x !== void 0 && typeof x.concat === "function";
}
function canUseMessagesApi(model) {
	const modelProviderName = getModelProvider(model);
	if (modelProviderName === "anthropic" && !model.includes("claude-v2") && !model.includes("claude-instant-v1")) return true;
	if (modelProviderName === "cohere") {
		if (model.includes("command-r-v1")) return true;
		if (model.includes("command-r-plus-v1")) return true;
	}
	return false;
}
function isInferenceModel(modelId) {
	const parts = modelId.split(".");
	return AWS_REGIONS.some((region) => parts[0] === region);
}
function getModelProvider(modelId) {
	const parts = modelId.split(".");
	if (isInferenceModel(modelId)) return parts[1];
	else return parts[0];
}

//#endregion
export { BedrockChat, convertMessagesToPrompt, convertMessagesToPromptAnthropic, web_exports };
//# sourceMappingURL=web.js.map
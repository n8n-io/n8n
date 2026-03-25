import { AnthropicToolsOutputParser } from "./output_parsers.js";
import { handleToolChoice } from "./utils/tools.js";
import { _convertMessagesToAnthropicPayload } from "./utils/message_inputs.js";
import { _makeMessageChunkFromAnthropicEvent, anthropicResponseToChatMessages } from "./utils/message_outputs.js";
import { wrapAnthropicClientError } from "./utils/errors.js";
import profiles_default from "./profiles.js";
import { Anthropic as Anthropic$1 } from "@anthropic-ai/sdk";
import { transformJSONSchema } from "@anthropic-ai/sdk/lib/transform-json-schema.js";
import { AIMessageChunk } from "@langchain/core/messages";
import { ChatGenerationChunk } from "@langchain/core/outputs";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { isOpenAITool } from "@langchain/core/language_models/base";
import { toJsonSchema } from "@langchain/core/utils/json_schema";
import { JsonOutputParser, StructuredOutputParser } from "@langchain/core/output_parsers";
import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";
import { isInteropZodSchema } from "@langchain/core/utils/types";
import { isLangChainTool } from "@langchain/core/utils/function_calling";

//#region src/chat_models.ts
const MODEL_DEFAULT_MAX_OUTPUT_TOKENS = {
	"claude-opus-4-1": 8192,
	"claude-opus-4": 8192,
	"claude-sonnet-4": 8192,
	"claude-sonnet-3-7-sonnet": 8192,
	"claude-3-5-sonnet": 4096,
	"claude-3-5-haiku": 4096,
	"claude-3-haiku": 2048
};
const FALLBACK_MAX_OUTPUT_TOKENS = 2048;
function defaultMaxOutputTokensForModel(model) {
	if (!model) return FALLBACK_MAX_OUTPUT_TOKENS;
	const maxTokens = Object.entries(MODEL_DEFAULT_MAX_OUTPUT_TOKENS).find(([key]) => model.startsWith(key))?.[1];
	return maxTokens ?? FALLBACK_MAX_OUTPUT_TOKENS;
}
function _toolsInParams(params) {
	return !!(params.tools && params.tools.length > 0);
}
function _documentsInParams(params) {
	for (const message of params.messages ?? []) {
		if (typeof message.content === "string") continue;
		for (const block of message.content ?? []) if (typeof block === "object" && block != null && block.type === "document" && typeof block.citations === "object" && block.citations?.enabled) return true;
	}
	return false;
}
function _thinkingInParams(params) {
	return !!(params.thinking && params.thinking.type === "enabled");
}
function isAnthropicTool(tool) {
	return "input_schema" in tool;
}
function isBuiltinTool(tool) {
	const builtInToolPrefixes = [
		"text_editor_",
		"computer_",
		"bash_",
		"web_search_",
		"web_fetch_",
		"str_replace_editor_",
		"str_replace_based_edit_tool_",
		"code_execution_",
		"memory_"
	];
	return typeof tool === "object" && tool !== null && "type" in tool && "name" in tool && typeof tool.type === "string" && builtInToolPrefixes.some((prefix) => typeof tool.type === "string" && tool.type.startsWith(prefix));
}
function _combineBetas(a, b) {
	return Array.from(new Set([...a ?? [], ...b ?? []]));
}
function extractToken(chunk) {
	if (typeof chunk.content === "string") return chunk.content;
	else if (Array.isArray(chunk.content) && chunk.content.length >= 1 && "input" in chunk.content[0]) return typeof chunk.content[0].input === "string" ? chunk.content[0].input : JSON.stringify(chunk.content[0].input);
	else if (Array.isArray(chunk.content) && chunk.content.length >= 1 && "text" in chunk.content[0] && typeof chunk.content[0].text === "string") return chunk.content[0].text;
	return void 0;
}
/**
* Anthropic chat model integration.
*
* Setup:
* Install `@langchain/anthropic` and set an environment variable named `ANTHROPIC_API_KEY`.
*
* ```bash
* npm install @langchain/anthropic
* export ANTHROPIC_API_KEY="your-api-key"
* ```
*
* ## [Constructor args](https://api.js.langchain.com/classes/langchain_anthropic.ChatAnthropic.html#constructor)
*
* ## [Runtime args](https://api.js.langchain.com/interfaces/langchain_anthropic.ChatAnthropicCallOptions.html)
*
* Runtime args can be passed as the second argument to any of the base runnable methods `.invoke`. `.stream`, `.batch`, etc.
* They can also be passed via `.bind`, or the second arg in `.bindTools`, like shown in the examples below:
*
* ```typescript
* // When calling `.bind`, call options should be passed via the first argument
* const llmWithArgsBound = llm.bindTools([...]).withConfig({
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
* import { ChatAnthropic } from '@langchain/anthropic';
*
* const llm = new ChatAnthropic({
*   model: "claude-sonnet-4-5-20250929",
*   temperature: 0,
*   maxTokens: undefined,
*   maxRetries: 2,
*   // apiKey: "...",
*   // baseUrl: "...",
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
*   "id": "msg_01QDpd78JUHpRP6bRRNyzbW3",
*   "content": "Here's the translation to French:\n\nJ'adore la programmation.",
*   "response_metadata": {
*     "id": "msg_01QDpd78JUHpRP6bRRNyzbW3",
*     "model": "claude-sonnet-4-5-20250929",
*     "stop_reason": "end_turn",
*     "stop_sequence": null,
*     "usage": {
*       "input_tokens": 25,
*       "output_tokens": 19
*     },
*     "type": "message",
*     "role": "assistant"
*   },
*   "usage_metadata": {
*     "input_tokens": 25,
*     "output_tokens": 19,
*     "total_tokens": 44
*   }
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
*   "id": "msg_01N8MwoYxiKo9w4chE4gXUs4",
*   "content": "",
*   "additional_kwargs": {
*     "id": "msg_01N8MwoYxiKo9w4chE4gXUs4",
*     "type": "message",
*     "role": "assistant",
*     "model": "claude-sonnet-4-5-20250929"
*   },
*   "usage_metadata": {
*     "input_tokens": 25,
*     "output_tokens": 1,
*     "total_tokens": 26
*   }
* }
* AIMessageChunk {
*   "content": "",
* }
* AIMessageChunk {
*   "content": "Here",
* }
* AIMessageChunk {
*   "content": "'s",
* }
* AIMessageChunk {
*   "content": " the translation to",
* }
* AIMessageChunk {
*   "content": " French:\n\nJ",
* }
* AIMessageChunk {
*   "content": "'adore la programmation",
* }
* AIMessageChunk {
*   "content": ".",
* }
* AIMessageChunk {
*   "content": "",
*   "additional_kwargs": {
*     "stop_reason": "end_turn",
*     "stop_sequence": null
*   },
*   "usage_metadata": {
*     "input_tokens": 0,
*     "output_tokens": 19,
*     "total_tokens": 19
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
*   "id": "msg_01SBTb5zSGXfjUc7yQ8EKEEA",
*   "content": "Here's the translation to French:\n\nJ'adore la programmation.",
*   "additional_kwargs": {
*     "id": "msg_01SBTb5zSGXfjUc7yQ8EKEEA",
*     "type": "message",
*     "role": "assistant",
*     "model": "claude-sonnet-4-5-20250929",
*     "stop_reason": "end_turn",
*     "stop_sequence": null
*   },
*   "usage_metadata": {
*     "input_tokens": 25,
*     "output_tokens": 20,
*     "total_tokens": 45
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
*     id: 'toolu_01WjW3Dann6BPJVtLhovdBD5',
*     type: 'tool_call'
*   },
*   {
*     name: 'GetWeather',
*     args: { location: 'New York, NY' },
*     id: 'toolu_01G6wfJgqi5zRmJomsmkyZXe',
*     type: 'tool_call'
*   },
*   {
*     name: 'GetPopulation',
*     args: { location: 'Los Angeles, CA' },
*     id: 'toolu_0165qYWBA2VFyUst5RA18zew',
*     type: 'tool_call'
*   },
*   {
*     name: 'GetPopulation',
*     args: { location: 'New York, NY' },
*     id: 'toolu_01PGNyP33vxr13tGqr7i3rDo',
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
* ChatAnthropic supports structured output through two main approaches:
*
* 1. **Function Calling with `withStructuredOutput()`**: Uses Anthropic's tool calling
*    under the hood to constrain outputs to a specific schema.
* 2. **JSON Schema Mode**: Uses Anthropic's native JSON schema support for direct
*    structured output without tool calling overhead.
*
* **Using withStructuredOutput (Function Calling)**
*
* This method leverages Anthropic's tool calling capabilities to ensure the model
* returns data matching your schema:
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
* const structuredLlm = llm.withStructuredOutput(Joke, { name: "Joke" });
* const jokeResult = await structuredLlm.invoke("Tell me a joke about cats");
* console.log(jokeResult);
* ```
*
* ```txt
* {
*   setup: "Why don't cats play poker in the jungle?",
*   punchline: 'Too many cheetahs!',
*   rating: 7
* }
* ```
*
* **Using JSON Schema Mode**
*
* For more direct control, you can use Anthropic's native JSON schema support by
* passing `method: "jsonSchema"`:
*
* ```typescript
* import { z } from 'zod';
*
* const RecipeSchema = z.object({
*   recipeName: z.string().describe("Name of the recipe"),
*   ingredients: z.array(z.string()).describe("List of ingredients needed"),
*   steps: z.array(z.string()).describe("Cooking steps in order"),
*   prepTime: z.number().describe("Preparation time in minutes")
* });
*
* const structuredLlm = llm.withStructuredOutput(RecipeSchema, {
*   method: "jsonSchema"
* });
*
* const recipe = await structuredLlm.invoke(
*   "Give me a simple recipe for chocolate chip cookies"
* );
* console.log(recipe);
* ```
*
* ```txt
* {
*   recipeName: 'Classic Chocolate Chip Cookies',
*   ingredients: [
*     '2 1/4 cups all-purpose flour',
*     '1 cup butter, softened',
*     ...
*   ],
*   steps: [
*     'Preheat oven to 375°F',
*     'Mix butter and sugars until creamy',
*     ...
*   ],
*   prepTime: 15
* }
* ```
* </details>
*
* <br />
*
* <details>
* <summary><strong>Multimodal</strong></summary>
*
* ```typescript
* import { HumanMessage } from '@langchain/core/messages';
*
* const imageUrl = "https://example.com/image.jpg";
* const imageData = await fetch(imageUrl).then(res => res.arrayBuffer());
* const base64Image = Buffer.from(imageData).toString('base64');
*
* const message = new HumanMessage({
*   content: [
*     { type: "text", text: "describe the weather in this image" },
*     {
*       type: "image_url",
*       image_url: { url: `data:image/jpeg;base64,${base64Image}` },
*     },
*   ]
* });
*
* const imageDescriptionAiMsg = await llm.invoke([message]);
* console.log(imageDescriptionAiMsg.content);
* ```
*
* ```txt
* The weather in this image appears to be beautiful and clear. The sky is a vibrant blue with scattered white clouds, suggesting a sunny and pleasant day. The clouds are wispy and light, indicating calm conditions without any signs of storms or heavy weather. The bright green grass on the rolling hills looks lush and well-watered, which could mean recent rainfall or good growing conditions. Overall, the scene depicts a perfect spring or early summer day with mild temperatures, plenty of sunshine, and gentle breezes - ideal weather for enjoying the outdoors or for plant growth.
* ```
* </details>
*
* <br />
*
* <details>
* <summary><strong>Usage Metadata</strong></summary>
*
* ```typescript
* const aiMsgForMetadata = await llm.invoke(input);
* console.log(aiMsgForMetadata.usage_metadata);
* ```
*
* ```txt
* { input_tokens: 25, output_tokens: 19, total_tokens: 44 }
* ```
* </details>
*
* <br />
*
* <details>
* <summary><strong>Stream Usage Metadata</strong></summary>
*
* ```typescript
* const streamForMetadata = await llm.stream(
*   input,
*   {
*     streamUsage: true
*   }
* );
* let fullForMetadata: AIMessageChunk | undefined;
* for await (const chunk of streamForMetadata) {
*   fullForMetadata = !fullForMetadata ? chunk : concat(fullForMetadata, chunk);
* }
* console.log(fullForMetadata?.usage_metadata);
* ```
*
* ```txt
* { input_tokens: 25, output_tokens: 20, total_tokens: 45 }
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
* {
*   id: 'msg_01STxeQxJmp4sCSpioD6vK3L',
*   model: 'claude-sonnet-4-5-20250929',
*   stop_reason: 'end_turn',
*   stop_sequence: null,
*   usage: { input_tokens: 25, output_tokens: 19 },
*   type: 'message',
*   role: 'assistant'
* }
* ```
* </details>
*
* <br />
*/
var ChatAnthropicMessages = class extends BaseChatModel {
	static lc_name() {
		return "ChatAnthropic";
	}
	get lc_secrets() {
		return {
			anthropicApiKey: "ANTHROPIC_API_KEY",
			apiKey: "ANTHROPIC_API_KEY"
		};
	}
	get lc_aliases() {
		return { modelName: "model" };
	}
	lc_serializable = true;
	anthropicApiKey;
	apiKey;
	apiUrl;
	temperature;
	topK;
	topP;
	maxTokens;
	modelName = "claude-3-5-sonnet-latest";
	model = "claude-3-5-sonnet-latest";
	invocationKwargs;
	stopSequences;
	streaming = false;
	clientOptions;
	thinking = { type: "disabled" };
	contextManagement;
	batchClient;
	streamingClient;
	streamUsage = true;
	betas;
	/**
	* Optional method that returns an initialized underlying Anthropic client.
	* Useful for accessing Anthropic models hosted on other cloud services
	* such as Google Vertex.
	*/
	createClient;
	constructor(fields) {
		super(fields ?? {});
		this.anthropicApiKey = fields?.apiKey ?? fields?.anthropicApiKey ?? getEnvironmentVariable("ANTHROPIC_API_KEY");
		if (!this.anthropicApiKey && !fields?.createClient) throw new Error("Anthropic API key not found");
		this.clientOptions = fields?.clientOptions ?? {};
		/** Keep anthropicApiKey for backwards compatibility */
		this.apiKey = this.anthropicApiKey;
		this.apiUrl = fields?.anthropicApiUrl;
		/** Keep modelName for backwards compatibility */
		this.modelName = fields?.model ?? fields?.modelName ?? this.model;
		this.model = this.modelName;
		this.invocationKwargs = fields?.invocationKwargs ?? {};
		this.topP = fields?.topP ?? this.topP;
		this.temperature = fields?.temperature ?? this.temperature;
		this.topK = fields?.topK ?? this.topK;
		this.maxTokens = fields?.maxTokens ?? defaultMaxOutputTokensForModel(this.model);
		this.stopSequences = fields?.stopSequences ?? this.stopSequences;
		this.streaming = fields?.streaming ?? false;
		this.streamUsage = fields?.streamUsage ?? this.streamUsage;
		this.thinking = fields?.thinking ?? this.thinking;
		this.contextManagement = fields?.contextManagement ?? this.contextManagement;
		this.betas = fields?.betas ?? this.betas;
		this.createClient = fields?.createClient ?? ((options) => new Anthropic$1(options));
	}
	getLsParams(options) {
		const params = this.invocationParams(options);
		return {
			ls_provider: "anthropic",
			ls_model_name: this.model,
			ls_model_type: "chat",
			ls_temperature: params.temperature ?? void 0,
			ls_max_tokens: params.max_tokens ?? void 0,
			ls_stop: options.stop
		};
	}
	/**
	* Formats LangChain StructuredTools to AnthropicTools.
	*
	* @param {ChatAnthropicCallOptions["tools"]} tools The tools to format
	* @returns {AnthropicTool[] | undefined} The formatted tools, or undefined if none are passed.
	*/
	formatStructuredToolToAnthropic(tools) {
		if (!tools || !tools.length) return void 0;
		return tools.map((tool) => {
			if (isBuiltinTool(tool)) return tool;
			if (isAnthropicTool(tool)) return tool;
			if (isOpenAITool(tool)) return {
				name: tool.function.name,
				description: tool.function.description,
				input_schema: tool.function.parameters
			};
			if (isLangChainTool(tool)) return {
				name: tool.name,
				description: tool.description,
				input_schema: isInteropZodSchema(tool.schema) ? toJsonSchema(tool.schema) : tool.schema
			};
			throw new Error(`Unknown tool type passed to ChatAnthropic: ${JSON.stringify(tool, null, 2)}`);
		});
	}
	bindTools(tools, kwargs) {
		return this.withConfig({
			tools: this.formatStructuredToolToAnthropic(tools),
			...kwargs
		});
	}
	/**
	* Get the parameters used to invoke the model
	*/
	invocationParams(options) {
		const tool_choice = handleToolChoice(options?.tool_choice);
		if (this.thinking.type === "enabled") {
			if (this.topP !== void 0 && this.topK !== -1) throw new Error("topK is not supported when thinking is enabled");
			if (this.temperature !== void 0 && this.temperature !== 1) throw new Error("temperature is not supported when thinking is enabled");
			return {
				model: this.model,
				stop_sequences: options?.stop ?? this.stopSequences,
				stream: this.streaming,
				max_tokens: this.maxTokens,
				tools: this.formatStructuredToolToAnthropic(options?.tools),
				tool_choice,
				thinking: this.thinking,
				context_management: this.contextManagement,
				...this.invocationKwargs,
				container: options?.container,
				betas: _combineBetas(this.betas, options?.betas),
				output_format: options?.output_format
			};
		}
		return {
			model: this.model,
			temperature: this.temperature,
			top_k: this.topK,
			top_p: this.topP,
			stop_sequences: options?.stop ?? this.stopSequences,
			stream: this.streaming,
			max_tokens: this.maxTokens,
			tools: this.formatStructuredToolToAnthropic(options?.tools),
			tool_choice,
			thinking: this.thinking,
			context_management: this.contextManagement,
			...this.invocationKwargs,
			container: options?.container,
			betas: _combineBetas(this.betas, options?.betas),
			output_format: options?.output_format
		};
	}
	/** @ignore */
	_identifyingParams() {
		return {
			model_name: this.model,
			...this.invocationParams()
		};
	}
	/**
	* Get the identifying parameters for the model
	*/
	identifyingParams() {
		return {
			model_name: this.model,
			...this.invocationParams()
		};
	}
	async *_streamResponseChunks(messages, options, runManager) {
		const params = this.invocationParams(options);
		const formattedMessages = _convertMessagesToAnthropicPayload(messages);
		const payload = {
			...params,
			...formattedMessages,
			stream: true
		};
		const coerceContentToString = !_toolsInParams(payload) && !_documentsInParams(payload) && !_thinkingInParams(payload);
		const stream = await this.createStreamWithRetry(payload, { headers: options.headers });
		for await (const data of stream) {
			if (options.signal?.aborted) {
				stream.controller.abort();
				throw new Error("AbortError: User aborted the request.");
			}
			const shouldStreamUsage = this.streamUsage ?? options.streamUsage;
			const result = _makeMessageChunkFromAnthropicEvent(data, {
				streamUsage: shouldStreamUsage,
				coerceContentToString
			});
			if (!result) continue;
			const { chunk } = result;
			const token = extractToken(chunk);
			const generationChunk = new ChatGenerationChunk({
				message: new AIMessageChunk({
					content: chunk.content,
					additional_kwargs: chunk.additional_kwargs,
					tool_call_chunks: chunk.tool_call_chunks,
					usage_metadata: shouldStreamUsage ? chunk.usage_metadata : void 0,
					response_metadata: chunk.response_metadata,
					id: chunk.id
				}),
				text: token ?? ""
			});
			yield generationChunk;
			await runManager?.handleLLMNewToken(token ?? "", void 0, void 0, void 0, void 0, { chunk: generationChunk });
		}
	}
	/** @ignore */
	async _generateNonStreaming(messages, params, requestOptions) {
		const response = await this.completionWithRetry({
			...params,
			stream: false,
			..._convertMessagesToAnthropicPayload(messages)
		}, requestOptions);
		const { content,...additionalKwargs } = response;
		const generations = anthropicResponseToChatMessages(content, additionalKwargs);
		const { role: _role, type: _type,...rest } = additionalKwargs;
		return {
			generations,
			llmOutput: rest
		};
	}
	/** @ignore */
	async _generate(messages, options, runManager) {
		if (this.stopSequences && options.stop) throw new Error(`"stopSequence" parameter found in input and default params`);
		const params = this.invocationParams(options);
		if (params.stream) {
			let finalChunk;
			const stream = this._streamResponseChunks(messages, options, runManager);
			for await (const chunk of stream) if (finalChunk === void 0) finalChunk = chunk;
			else finalChunk = finalChunk.concat(chunk);
			if (finalChunk === void 0) throw new Error("No chunks returned from Anthropic API.");
			return { generations: [{
				text: finalChunk.text,
				message: finalChunk.message
			}] };
		} else return this._generateNonStreaming(messages, params, {
			signal: options.signal,
			headers: options.headers
		});
	}
	/**
	* Creates a streaming request with retry.
	* @param request The parameters for creating a completion.
	* @param options
	* @returns A streaming request.
	*/
	async createStreamWithRetry(request, options) {
		if (!this.streamingClient) {
			const options_ = this.apiUrl ? { baseURL: this.apiUrl } : void 0;
			this.streamingClient = this.createClient({
				dangerouslyAllowBrowser: true,
				...this.clientOptions,
				...options_,
				apiKey: this.apiKey,
				maxRetries: 0
			});
		}
		const { betas,...rest } = request;
		const makeCompletionRequest = async () => {
			try {
				if (request?.betas?.length) {
					const stream = await this.streamingClient.beta.messages.create({
						...rest,
						betas,
						...this.invocationKwargs,
						stream: true
					}, options);
					return stream;
				}
				return await this.streamingClient.messages.create({
					...rest,
					...this.invocationKwargs,
					stream: true
				}, options);
			} catch (e) {
				const error = wrapAnthropicClientError(e);
				throw error;
			}
		};
		return this.caller.call(makeCompletionRequest);
	}
	/** @ignore */
	async completionWithRetry(request, options) {
		if (!this.batchClient) {
			const options$1 = this.apiUrl ? { baseURL: this.apiUrl } : void 0;
			this.batchClient = this.createClient({
				dangerouslyAllowBrowser: true,
				...this.clientOptions,
				...options$1,
				apiKey: this.apiKey,
				maxRetries: 0
			});
		}
		const { betas,...rest } = request;
		const makeCompletionRequest = async () => {
			try {
				if (request?.betas?.length) {
					const response = await this.batchClient.beta.messages.create({
						...rest,
						...this.invocationKwargs,
						betas
					}, options);
					return response;
				}
				return await this.batchClient.messages.create({
					...rest,
					...this.invocationKwargs
				}, options);
			} catch (e) {
				const error = wrapAnthropicClientError(e);
				throw error;
			}
		};
		return this.caller.callWithOptions({ signal: options.signal ?? void 0 }, makeCompletionRequest);
	}
	_llmType() {
		return "anthropic";
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
	* const model = new ChatAnthropic({ model: "claude-opus-4-0" });
	* const profile = model.profile;
	* console.log(profile.maxInputTokens); // 200000
	* console.log(profile.imageInputs); // true
	* ```
	*/
	get profile() {
		return profiles_default[this.model] ?? {};
	}
	withStructuredOutput(outputSchema, config) {
		let llm;
		let outputParser;
		const { schema, name, includeRaw } = {
			...config,
			schema: outputSchema
		};
		let method = config?.method ?? "functionCalling";
		if (method === "jsonMode") {
			console.warn(`"jsonMode" is not supported for Anthropic models. Falling back to "jsonSchema".`);
			method = "jsonSchema";
		}
		if (method === "jsonSchema") {
			outputParser = isInteropZodSchema(schema) ? StructuredOutputParser.fromZodSchema(schema) : new JsonOutputParser();
			const jsonSchema = transformJSONSchema(toJsonSchema(schema));
			llm = this.withConfig({
				outputVersion: "v0",
				output_format: {
					type: "json_schema",
					schema: jsonSchema
				},
				betas: ["structured-outputs-2025-11-13"],
				ls_structured_output_format: {
					kwargs: { method: "json_schema" },
					schema: jsonSchema
				}
			});
		} else if (method === "functionCalling") {
			let functionName = name ?? "extract";
			let tools;
			if (isInteropZodSchema(schema)) {
				const jsonSchema = toJsonSchema(schema);
				tools = [{
					name: functionName,
					description: jsonSchema.description ?? "A function available to call.",
					input_schema: jsonSchema
				}];
				outputParser = new AnthropicToolsOutputParser({
					returnSingle: true,
					keyName: functionName,
					zodSchema: schema
				});
			} else {
				let anthropicTools;
				if (typeof schema.name === "string" && typeof schema.description === "string" && typeof schema.input_schema === "object" && schema.input_schema != null) {
					anthropicTools = schema;
					functionName = schema.name;
				} else anthropicTools = {
					name: functionName,
					description: schema.description ?? "",
					input_schema: schema
				};
				tools = [anthropicTools];
				outputParser = new AnthropicToolsOutputParser({
					returnSingle: true,
					keyName: functionName
				});
			}
			if (this.thinking?.type === "enabled") {
				const thinkingAdmonition = "Anthropic structured output relies on forced tool calling, which is not supported when `thinking` is enabled. This method will raise OutputParserException if tool calls are not generated. Consider disabling `thinking` or adjust your prompt to ensure the tool is called.";
				console.warn(thinkingAdmonition);
				llm = this.withConfig({
					outputVersion: "v0",
					tools,
					ls_structured_output_format: {
						kwargs: { method: "functionCalling" },
						schema: toJsonSchema(schema)
					}
				});
				const raiseIfNoToolCalls = (message) => {
					if (!message.tool_calls || message.tool_calls.length === 0) throw new Error(thinkingAdmonition);
					return message;
				};
				llm = llm.pipe(raiseIfNoToolCalls);
			} else llm = this.withConfig({
				outputVersion: "v0",
				tools,
				tool_choice: {
					type: "tool",
					name: functionName
				},
				ls_structured_output_format: {
					kwargs: { method: "functionCalling" },
					schema: toJsonSchema(schema)
				}
			});
		} else throw new TypeError(`Unrecognized structured output method '${method}'. Expected 'functionCalling' or 'jsonSchema'`);
		if (!includeRaw) return llm.pipe(outputParser).withConfig({ runName: "ChatAnthropicStructuredOutput" });
		const parserAssign = RunnablePassthrough.assign({ parsed: (input, config$1) => outputParser.invoke(input.raw, config$1) });
		const parserNone = RunnablePassthrough.assign({ parsed: () => null });
		const parsedWithFallback = parserAssign.withFallbacks({ fallbacks: [parserNone] });
		return RunnableSequence.from([{ raw: llm }, parsedWithFallback]).withConfig({ runName: "StructuredOutputRunnable" });
	}
};
var ChatAnthropic = class extends ChatAnthropicMessages {};

//#endregion
export { ChatAnthropic, ChatAnthropicMessages };
//# sourceMappingURL=chat_models.js.map
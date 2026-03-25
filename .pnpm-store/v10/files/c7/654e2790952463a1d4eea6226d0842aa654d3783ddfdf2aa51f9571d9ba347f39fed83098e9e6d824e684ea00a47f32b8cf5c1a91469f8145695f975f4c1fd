import { convertOllamaMessagesToLangChain, convertToOllamaMessages } from "./utils.js";
import { AIMessage, AIMessageChunk } from "@langchain/core/messages";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { Ollama } from "ollama/browser";
import { ChatGenerationChunk } from "@langchain/core/outputs";
import { RunnableLambda, RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";
import { convertToOpenAITool } from "@langchain/core/utils/function_calling";
import { concat } from "@langchain/core/utils/stream";
import { JsonOutputParser, StructuredOutputParser } from "@langchain/core/output_parsers";
import { interopParseAsync, isInteropZodSchema } from "@langchain/core/utils/types";
import { toJsonSchema } from "@langchain/core/utils/json_schema";

//#region src/chat_models.ts
/**
* Ollama chat model integration.
*
* Setup:
* Install `@langchain/ollama` and the Ollama app.
*
* ```bash
* npm install @langchain/ollama
* ```
*
* ## [Constructor args](https://api.js.langchain.com/classes/_langchain_ollama.ChatOllama.html#constructor)
*
* ## [Runtime args](https://api.js.langchain.com/interfaces/_langchain_ollama.ChatOllamaCallOptions.html)
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
*     stop: ["\n"],
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
* import { ChatOllama } from '@langchain/ollama';
*
* const llm = new ChatOllama({
*   model: "llama-3.1:8b",
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
*   "content": "The translation of \"I love programming\" into French is:\n\n\"J'adore programmer.\"",
*   "additional_kwargs": {},
*   "response_metadata": {
*     "model": "llama3.1:8b",
*     "created_at": "2024-08-12T22:12:23.09468Z",
*     "done_reason": "stop",
*     "done": true,
*     "total_duration": 3715571291,
*     "load_duration": 35244375,
*     "prompt_eval_count": 19,
*     "prompt_eval_duration": 3092116000,
*     "eval_count": 20,
*     "eval_duration": 585789000
*   },
*   "tool_calls": [],
*   "invalid_tool_calls": [],
*   "usage_metadata": {
*     "input_tokens": 19,
*     "output_tokens": 20,
*     "total_tokens": 39
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
*   "content": "The",
*   "additional_kwargs": {},
*   "response_metadata": {},
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "content": " translation",
*   "additional_kwargs": {},
*   "response_metadata": {},
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "content": " of",
*   "additional_kwargs": {},
*   "response_metadata": {},
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "content": " \"",
*   "additional_kwargs": {},
*   "response_metadata": {},
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "content": "I",
*   "additional_kwargs": {},
*   "response_metadata": {},
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* ...
* AIMessageChunk {
*   "content": "",
*   "additional_kwargs": {},
*   "response_metadata": {},
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "content": "",
*   "additional_kwargs": {},
*   "response_metadata": {
*     "model": "llama3.1:8b",
*     "created_at": "2024-08-12T22:13:22.22423Z",
*     "done_reason": "stop",
*     "done": true,
*     "total_duration": 8599883208,
*     "load_duration": 35975875,
*     "prompt_eval_count": 19,
*     "prompt_eval_duration": 7918195000,
*     "eval_count": 20,
*     "eval_duration": 643569000
*   },
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": [],
*   "usage_metadata": {
*     "input_tokens": 19,
*     "output_tokens": 20,
*     "total_tokens": 39
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
*     id: '49410cad-2163-415e-bdcd-d26938a9c8c5',
*     type: 'tool_call'
*   },
*   {
*     name: 'GetPopulation',
*     args: { location: 'New York, NY' },
*     id: '39e230e4-63ec-4fae-9df0-21c3abe735ad',
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
*   punchline: 'Why did the cat join a band? Because it wanted to be the purr-cussionist!',
*   rating: 8,
*   setup: 'A cat walks into a music store and asks the owner...'
* }
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
* { input_tokens: 19, output_tokens: 20, total_tokens: 39 }
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
*   model: 'llama3.1:8b',
*   created_at: '2024-08-12T22:17:42.274795Z',
*   done_reason: 'stop',
*   done: true,
*   total_duration: 6767071209,
*   load_duration: 31628209,
*   prompt_eval_count: 19,
*   prompt_eval_duration: 6124504000,
*   eval_count: 20,
*   eval_duration: 608785000
* }
* ```
* </details>
*
* <br />
*/
var ChatOllama = class extends BaseChatModel {
	static lc_name() {
		return "ChatOllama";
	}
	model = "llama3";
	numa;
	numCtx;
	numBatch;
	numGpu;
	mainGpu;
	lowVram;
	f16Kv;
	logitsAll;
	vocabOnly;
	useMmap;
	useMlock;
	embeddingOnly;
	numThread;
	numKeep;
	seed;
	numPredict;
	topK;
	topP;
	tfsZ;
	typicalP;
	repeatLastN;
	temperature;
	repeatPenalty;
	presencePenalty;
	frequencyPenalty;
	mirostat;
	mirostatTau;
	mirostatEta;
	penalizeNewline;
	streaming;
	format;
	keepAlive;
	client;
	checkOrPullModel = false;
	baseUrl = "http://127.0.0.1:11434";
	think;
	constructor(fields) {
		super(fields ?? {});
		this.client = new Ollama({
			fetch: fields?.fetch,
			host: fields?.baseUrl,
			headers: fields?.headers
		});
		this.baseUrl = fields?.baseUrl ?? this.baseUrl;
		this.model = fields?.model ?? this.model;
		this.numa = fields?.numa;
		this.numCtx = fields?.numCtx;
		this.numBatch = fields?.numBatch;
		this.numGpu = fields?.numGpu;
		this.mainGpu = fields?.mainGpu;
		this.lowVram = fields?.lowVram;
		this.f16Kv = fields?.f16Kv;
		this.logitsAll = fields?.logitsAll;
		this.vocabOnly = fields?.vocabOnly;
		this.useMmap = fields?.useMmap;
		this.useMlock = fields?.useMlock;
		this.embeddingOnly = fields?.embeddingOnly;
		this.numThread = fields?.numThread;
		this.numKeep = fields?.numKeep;
		this.seed = fields?.seed;
		this.numPredict = fields?.numPredict;
		this.topK = fields?.topK;
		this.topP = fields?.topP;
		this.tfsZ = fields?.tfsZ;
		this.typicalP = fields?.typicalP;
		this.repeatLastN = fields?.repeatLastN;
		this.temperature = fields?.temperature;
		this.repeatPenalty = fields?.repeatPenalty;
		this.presencePenalty = fields?.presencePenalty;
		this.frequencyPenalty = fields?.frequencyPenalty;
		this.mirostat = fields?.mirostat;
		this.mirostatTau = fields?.mirostatTau;
		this.mirostatEta = fields?.mirostatEta;
		this.penalizeNewline = fields?.penalizeNewline;
		this.streaming = fields?.streaming;
		this.format = fields?.format;
		this.keepAlive = fields?.keepAlive;
		this.think = fields?.think;
		this.checkOrPullModel = fields?.checkOrPullModel ?? this.checkOrPullModel;
	}
	_llmType() {
		return "ollama";
	}
	/**
	* Download a model onto the local machine.
	*
	* @param {string} model The name of the model to download.
	* @param {PullModelOptions | undefined} options Options for pulling the model.
	* @returns {Promise<void>}
	*/
	async pull(model, options) {
		const { stream, insecure, logProgress } = {
			stream: true,
			...options
		};
		if (stream) {
			for await (const chunk of await this.client.pull({
				model,
				insecure,
				stream
			})) if (logProgress) console.log(chunk);
		} else {
			const response = await this.client.pull({
				model,
				insecure
			});
			if (logProgress) console.log(response);
		}
	}
	bindTools(tools, kwargs) {
		return this.withConfig({
			tools: tools.map((tool) => convertToOpenAITool(tool)),
			...kwargs
		});
	}
	getLsParams(options) {
		const params = this.invocationParams(options);
		return {
			ls_provider: "ollama",
			ls_model_name: this.model,
			ls_model_type: "chat",
			ls_temperature: params.options?.temperature ?? void 0,
			ls_max_tokens: params.options?.num_predict ?? void 0,
			ls_stop: options.stop
		};
	}
	invocationParams(options) {
		return {
			model: this.model,
			format: options?.format ?? this.format,
			keep_alive: this.keepAlive,
			think: this.think,
			options: {
				numa: this.numa,
				num_ctx: this.numCtx,
				num_batch: this.numBatch,
				num_gpu: this.numGpu,
				main_gpu: this.mainGpu,
				low_vram: this.lowVram,
				f16_kv: this.f16Kv,
				logits_all: this.logitsAll,
				vocab_only: this.vocabOnly,
				use_mmap: this.useMmap,
				use_mlock: this.useMlock,
				embedding_only: this.embeddingOnly,
				num_thread: this.numThread,
				num_keep: this.numKeep,
				seed: this.seed,
				num_predict: this.numPredict,
				top_k: this.topK,
				top_p: this.topP,
				tfs_z: this.tfsZ,
				typical_p: this.typicalP,
				repeat_last_n: this.repeatLastN,
				temperature: this.temperature,
				repeat_penalty: this.repeatPenalty,
				presence_penalty: this.presencePenalty,
				frequency_penalty: this.frequencyPenalty,
				mirostat: this.mirostat,
				mirostat_tau: this.mirostatTau,
				mirostat_eta: this.mirostatEta,
				penalize_newline: this.penalizeNewline,
				stop: options?.stop
			},
			tools: options?.tools?.length ? options.tools.map((tool) => convertToOpenAITool(tool)) : void 0
		};
	}
	/**
	* Check if a model exists on the local machine.
	*
	* @param {string} model The name of the model to check.
	* @returns {Promise<boolean>} Whether or not the model exists.
	*/
	async checkModelExistsOnMachine(model) {
		const { models } = await this.client.list();
		return !!models.find((m) => m.name === model || m.name === `${model}:latest`);
	}
	async _generate(messages, options, runManager) {
		if (this.checkOrPullModel) {
			if (!await this.checkModelExistsOnMachine(this.model)) await this.pull(this.model, { logProgress: true });
		}
		let finalChunk;
		for await (const chunk of this._streamResponseChunks(messages, options, runManager)) if (!finalChunk) finalChunk = chunk.message;
		else finalChunk = concat(finalChunk, chunk.message);
		const nonChunkMessage = new AIMessage({
			id: finalChunk?.id,
			content: finalChunk?.content ?? "",
			tool_calls: finalChunk?.tool_calls,
			response_metadata: finalChunk?.response_metadata,
			usage_metadata: finalChunk?.usage_metadata
		});
		return { generations: [{
			text: typeof nonChunkMessage.content === "string" ? nonChunkMessage.content : "",
			message: nonChunkMessage
		}] };
	}
	async *_streamResponseChunks(messages, options, runManager) {
		if (this.checkOrPullModel) {
			if (!await this.checkModelExistsOnMachine(this.model)) await this.pull(this.model, { logProgress: true });
		}
		const params = this.invocationParams(options);
		const ollamaMessages = convertToOllamaMessages(messages);
		const usageMetadata = {
			input_tokens: 0,
			output_tokens: 0,
			total_tokens: 0
		};
		const stream = await this.client.chat({
			...params,
			messages: ollamaMessages,
			stream: true
		});
		let lastMetadata;
		for await (const chunk of stream) {
			if (options.signal?.aborted) this.client.abort();
			const { message: responseMessage,...rest } = chunk;
			usageMetadata.input_tokens += rest.prompt_eval_count ?? 0;
			usageMetadata.output_tokens += rest.eval_count ?? 0;
			usageMetadata.total_tokens = usageMetadata.input_tokens + usageMetadata.output_tokens;
			lastMetadata = rest;
			const token = this.think ? responseMessage.thinking ?? responseMessage.content ?? "" : responseMessage.content ?? "";
			yield new ChatGenerationChunk({
				text: token,
				message: convertOllamaMessagesToLangChain(responseMessage)
			});
			await runManager?.handleLLMNewToken(token);
		}
		yield new ChatGenerationChunk({
			text: "",
			message: new AIMessageChunk({
				content: "",
				response_metadata: lastMetadata,
				usage_metadata: usageMetadata
			})
		});
	}
	withStructuredOutput(outputSchema, config) {
		if (config?.method === void 0 || config?.method === "jsonSchema") {
			const outputSchemaIsZod = isInteropZodSchema(outputSchema);
			const jsonSchema = outputSchemaIsZod ? toJsonSchema(outputSchema) : outputSchema;
			const functionName = config?.name ?? "extract";
			const llm = this.bindTools([{
				type: "function",
				function: {
					name: functionName,
					description: jsonSchema.description,
					parameters: jsonSchema
				}
			}]).withConfig({
				format: "json",
				ls_structured_output_format: {
					kwargs: { method: "jsonSchema" },
					schema: toJsonSchema(outputSchema)
				}
			});
			/**
			* Create a parser that handles both tool calls and JSON content
			*/
			const outputParser = RunnableLambda.from(async (input) => {
				/**
				* Ensure input is an AI message (either AIMessage or AIMessageChunk)
				*/
				if (!AIMessage.isInstance(input) && !AIMessageChunk.isInstance(input)) throw new Error("Input is not an AIMessage or AIMessageChunk.");
				/**
				* First, check if there are tool calls - extract args from the tool call
				*/
				if (input.tool_calls && input.tool_calls.length > 0) {
					const toolCall = input.tool_calls.find((tc) => tc.name === functionName);
					if (toolCall && toolCall.args) {
						/**
						* Validate with schema if Zod schema is provided
						*/
						if (outputSchemaIsZod) return await interopParseAsync(outputSchema, toolCall.args);
						return toolCall.args;
					}
				}
				/**
				* Fallback: parse content as JSON (when format: "json" is set)
				*/
				const content = typeof input.content === "string" ? input.content : "";
				if (!content) throw new Error("No tool calls found and content is empty. Cannot parse structured output.");
				/**
				* Use the appropriate parser based on schema type
				*/
				if (outputSchemaIsZod) {
					const zodParser = StructuredOutputParser.fromZodSchema(outputSchema);
					return await zodParser.parse(content);
				} else {
					const jsonParser = new JsonOutputParser();
					return await jsonParser.parse(content);
				}
			});
			if (!config?.includeRaw) return llm.pipe(outputParser);
			const parserAssign = RunnablePassthrough.assign({ parsed: (input, config$1) => outputParser.invoke(input.raw, config$1) });
			const parserNone = RunnablePassthrough.assign({ parsed: () => null });
			const parsedWithFallback = parserAssign.withFallbacks({ fallbacks: [parserNone] });
			return RunnableSequence.from([{ raw: llm }, parsedWithFallback]);
		} else return super.withStructuredOutput(outputSchema, config);
	}
};

//#endregion
export { ChatOllama };
//# sourceMappingURL=chat_models.js.map
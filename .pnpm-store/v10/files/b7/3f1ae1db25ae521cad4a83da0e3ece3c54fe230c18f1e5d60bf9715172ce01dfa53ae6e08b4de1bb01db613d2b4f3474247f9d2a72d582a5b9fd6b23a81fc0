const require_zod_to_genai_parameters = require('./utils/zod_to_genai_parameters.cjs');
const require_common = require('./utils/common.cjs');
const require_output_parsers = require('./output_parsers.cjs');
const require_tools = require('./utils/tools.cjs');
const require_profiles = require('./profiles.cjs');
let _google_generative_ai = require("@google/generative-ai");
let _langchain_core_utils_env = require("@langchain/core/utils/env");
let _langchain_core_language_models_chat_models = require("@langchain/core/language_models/chat_models");
let _langchain_core_utils_types = require("@langchain/core/utils/types");
let _langchain_core_utils_standard_schema = require("@langchain/core/utils/standard_schema");
let _langchain_core_language_models_structured_output = require("@langchain/core/language_models/structured_output");

//#region src/chat_models.ts
/**
* Google Generative AI chat model integration.
*
* Setup:
* Install `@langchain/google-genai` and set an environment variable named `GOOGLE_API_KEY`.
*
* ```bash
* npm install @langchain/google-genai
* export GOOGLE_API_KEY="your-api-key"
* ```
*
* ## [Constructor args](https://api.js.langchain.com/classes/langchain_google_genai.ChatGoogleGenerativeAI.html#constructor)
*
* ## [Runtime args](https://api.js.langchain.com/interfaces/langchain_google_genai.GoogleGenerativeAIChatCallOptions.html)
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
* import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
*
* const llm = new ChatGoogleGenerativeAI({
*   model: "gemini-1.5-flash",
*   temperature: 0,
*   maxRetries: 2,
*   // apiKey: "...",
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
*   "content": "There are a few ways to translate \"I love programming\" into French, depending on the level of formality and nuance you want to convey:\n\n**Formal:**\n\n* **J'aime la programmation.** (This is the most literal and formal translation.)\n\n**Informal:**\n\n* **J'adore programmer.** (This is a more enthusiastic and informal translation.)\n* **J'aime beaucoup programmer.** (This is a slightly less enthusiastic but still informal translation.)\n\n**More specific:**\n\n* **J'aime beaucoup coder.** (This specifically refers to writing code.)\n* **J'aime beaucoup développer des logiciels.** (This specifically refers to developing software.)\n\nThe best translation will depend on the context and your intended audience. \n",
*   "response_metadata": {
*     "finishReason": "STOP",
*     "index": 0,
*     "safetyRatings": [
*       {
*         "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
*         "probability": "NEGLIGIBLE"
*       },
*       {
*         "category": "HARM_CATEGORY_HATE_SPEECH",
*         "probability": "NEGLIGIBLE"
*       },
*       {
*         "category": "HARM_CATEGORY_HARASSMENT",
*         "probability": "NEGLIGIBLE"
*       },
*       {
*         "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
*         "probability": "NEGLIGIBLE"
*       }
*     ]
*   },
*   "usage_metadata": {
*     "input_tokens": 10,
*     "output_tokens": 149,
*     "total_tokens": 159
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
*   "content": "There",
*   "response_metadata": {
*     "index": 0
*   }
*   "usage_metadata": {
*     "input_tokens": 10,
*     "output_tokens": 1,
*     "total_tokens": 11
*   }
* }
* AIMessageChunk {
*   "content": " are a few ways to translate \"I love programming\" into French, depending on",
* }
* AIMessageChunk {
*   "content": " the level of formality and nuance you want to convey:\n\n**Formal:**\n\n",
* }
* AIMessageChunk {
*   "content": "* **J'aime la programmation.** (This is the most literal and formal translation.)\n\n**Informal:**\n\n* **J'adore programmer.** (This",
* }
* AIMessageChunk {
*   "content": " is a more enthusiastic and informal translation.)\n* **J'aime beaucoup programmer.** (This is a slightly less enthusiastic but still informal translation.)\n\n**More",
* }
* AIMessageChunk {
*   "content": " specific:**\n\n* **J'aime beaucoup coder.** (This specifically refers to writing code.)\n* **J'aime beaucoup développer des logiciels.** (This specifically refers to developing software.)\n\nThe best translation will depend on the context and",
* }
* AIMessageChunk {
*   "content": " your intended audience. \n",
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
*   "content": "There are a few ways to translate \"I love programming\" into French, depending on the level of formality and nuance you want to convey:\n\n**Formal:**\n\n* **J'aime la programmation.** (This is the most literal and formal translation.)\n\n**Informal:**\n\n* **J'adore programmer.** (This is a more enthusiastic and informal translation.)\n* **J'aime beaucoup programmer.** (This is a slightly less enthusiastic but still informal translation.)\n\n**More specific:**\n\n* **J'aime beaucoup coder.** (This specifically refers to writing code.)\n* **J'aime beaucoup développer des logiciels.** (This specifically refers to developing software.)\n\nThe best translation will depend on the context and your intended audience. \n",
*   "usage_metadata": {
*     "input_tokens": 10,
*     "output_tokens": 277,
*     "total_tokens": 287
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
*     type: 'tool_call'
*   },
*   {
*     name: 'GetWeather',
*     args: { location: 'New York, NY' },
*     type: 'tool_call'
*   },
*   {
*     name: 'GetPopulation',
*     args: { location: 'Los Angeles, CA' },
*     type: 'tool_call'
*   },
*   {
*     name: 'GetPopulation',
*     args: { location: 'New York, NY' },
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
* const structuredLlm = llm.withStructuredOutput(Joke, { name: "Joke" });
* const jokeResult = await structuredLlm.invoke("Tell me a joke about cats");
* console.log(jokeResult);
* ```
*
* ```txt
* {
*   setup: "Why don\\'t cats play poker?",
*   punchline: "Why don\\'t cats play poker? Because they always have an ace up their sleeve!"
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
* The weather in the image appears to be clear and sunny. The sky is mostly blue with a few scattered white clouds, indicating fair weather. The bright sunlight is casting shadows on the green, grassy hill, suggesting it is a pleasant day with good visibility. There are no signs of rain or stormy conditions.
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
* { input_tokens: 10, output_tokens: 149, total_tokens: 159 }
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
*   finishReason: 'STOP',
*   index: 0,
*   safetyRatings: [
*     {
*       category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
*       probability: 'NEGLIGIBLE'
*     },
*     {
*       category: 'HARM_CATEGORY_HATE_SPEECH',
*       probability: 'NEGLIGIBLE'
*     },
*     { category: 'HARM_CATEGORY_HARASSMENT', probability: 'NEGLIGIBLE' },
*     {
*       category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
*       probability: 'NEGLIGIBLE'
*     }
*   ]
* }
* ```
* </details>
*
* <br />
*
* <details>
* <summary><strong>Document Messages</strong></summary>
*
* This example will show you how to pass documents such as PDFs to Google
* Generative AI through messages.
*
* ```typescript
* const pdfPath = "/Users/my_user/Downloads/invoice.pdf";
* const pdfBase64 = await fs.readFile(pdfPath, "base64");
*
* const response = await llm.invoke([
*   ["system", "Use the provided documents to answer the question"],
*   [
*     "user",
*     [
*       {
*         type: "application/pdf", // If the `type` field includes a single slash (`/`), it will be treated as inline data.
*         data: pdfBase64,
*       },
*       {
*         type: "text",
*         text: "Summarize the contents of this PDF",
*       },
*     ],
*   ],
* ]);
*
* console.log(response.content);
* ```
*
* ```txt
* This is a billing invoice from Twitter Developers for X API Basic Access. The transaction date is January 7, 2025,
* and the amount is $194.34, which has been paid. The subscription period is from January 7, 2025 21:02 to February 7, 2025 00:00 (UTC).
* The tax is $0.00, with a tax rate of 0%. The total amount is $194.34. The payment was made using a Visa card ending in 7022,
* expiring in 12/2026. The billing address is Brace Sproul, 1234 Main Street, San Francisco, CA, US 94103. The company being billed is
* X Corp, located at 865 FM 1209 Building 2, Bastrop, TX, US 78602. Terms and conditions apply.
* ```
* </details>
*
* <br />
*/
var ChatGoogleGenerativeAI = class extends _langchain_core_language_models_chat_models.BaseChatModel {
	static lc_name() {
		return "ChatGoogleGenerativeAI";
	}
	lc_serializable = true;
	get lc_secrets() {
		return { apiKey: "GOOGLE_API_KEY" };
	}
	lc_namespace = [
		"langchain",
		"chat_models",
		"google_genai"
	];
	get lc_aliases() {
		return { apiKey: "google_api_key" };
	}
	model;
	temperature;
	maxOutputTokens;
	topP;
	topK;
	stopSequences = [];
	safetySettings;
	apiKey;
	streaming = false;
	json;
	streamUsage = true;
	convertSystemMessageToHumanContent;
	thinkingConfig;
	client;
	get _isMultimodalModel() {
		return this.model.includes("vision") || this.model.startsWith("gemini-1.5") || this.model.startsWith("gemini-2") || this.model.startsWith("gemma-3-") && !this.model.startsWith("gemma-3-1b") || this.model.startsWith("gemini-3");
	}
	constructor(modelOrFields, fieldsArg) {
		const fields = typeof modelOrFields === "string" ? {
			...fieldsArg ?? {},
			model: modelOrFields
		} : modelOrFields;
		super(fields);
		this._addVersion("@langchain/google-genai", "2.1.24");
		this.model = fields.model.replace(/^models\//, "");
		this.maxOutputTokens = fields.maxOutputTokens ?? this.maxOutputTokens;
		if (this.maxOutputTokens && this.maxOutputTokens < 0) throw new Error("`maxOutputTokens` must be a positive integer");
		this.temperature = fields.temperature ?? this.temperature;
		if (this.temperature && (this.temperature < 0 || this.temperature > 2)) throw new Error("`temperature` must be in the range of [0.0,2.0]");
		this.topP = fields.topP ?? this.topP;
		if (this.topP && this.topP < 0) throw new Error("`topP` must be a positive integer");
		if (this.topP && this.topP > 1) throw new Error("`topP` must be below 1.");
		this.topK = fields.topK ?? this.topK;
		if (this.topK && this.topK < 0) throw new Error("`topK` must be a positive integer");
		this.stopSequences = fields.stopSequences ?? this.stopSequences;
		this.apiKey = fields.apiKey ?? (0, _langchain_core_utils_env.getEnvironmentVariable)("GOOGLE_API_KEY");
		if (!this.apiKey) throw new Error("Please set an API key for Google GenerativeAI in the environment variable GOOGLE_API_KEY or in the `apiKey` field of the ChatGoogleGenerativeAI constructor");
		this.safetySettings = fields.safetySettings ?? this.safetySettings;
		if (this.safetySettings && this.safetySettings.length > 0) {
			if (new Set(this.safetySettings.map((s) => s.category)).size !== this.safetySettings.length) throw new Error("The categories in `safetySettings` array must be unique");
		}
		this.streaming = fields.streaming ?? this.streaming;
		this.json = fields.json;
		this.thinkingConfig = fields.thinkingConfig ?? this.thinkingConfig;
		this.client = new _google_generative_ai.GoogleGenerativeAI(this.apiKey).getGenerativeModel({
			model: this.model,
			safetySettings: this.safetySettings,
			generationConfig: {
				stopSequences: this.stopSequences,
				maxOutputTokens: this.maxOutputTokens,
				temperature: this.temperature,
				topP: this.topP,
				topK: this.topK,
				...this.json ? { responseMimeType: "application/json" } : {},
				...this.thinkingConfig ? { thinkingConfig: this.thinkingConfig } : {}
			}
		}, {
			apiVersion: fields.apiVersion,
			baseUrl: fields.baseUrl,
			customHeaders: fields.customHeaders
		});
		this.streamUsage = fields.streamUsage ?? this.streamUsage;
	}
	useCachedContent(cachedContent, modelParams, requestOptions) {
		if (!this.apiKey) return;
		this.client = new _google_generative_ai.GoogleGenerativeAI(this.apiKey).getGenerativeModelFromCachedContent(cachedContent, modelParams, requestOptions);
	}
	get useSystemInstruction() {
		return typeof this.convertSystemMessageToHumanContent === "boolean" ? !this.convertSystemMessageToHumanContent : this.computeUseSystemInstruction;
	}
	get computeUseSystemInstruction() {
		if (this.model === "gemini-1.0-pro-001") return false;
		else if (this.model.startsWith("gemini-pro-vision")) return false;
		else if (this.model.startsWith("gemini-1.0-pro-vision")) return false;
		else if (this.model === "gemini-pro") return false;
		return true;
	}
	getLsParams(options) {
		return {
			ls_provider: "google_genai",
			ls_model_name: this.model,
			ls_model_type: "chat",
			ls_temperature: this.client.generationConfig.temperature,
			ls_max_tokens: this.client.generationConfig.maxOutputTokens,
			ls_stop: options.stop
		};
	}
	_combineLLMOutput() {
		return [];
	}
	_llmType() {
		return "googlegenerativeai";
	}
	bindTools(tools, kwargs) {
		return this.withConfig({
			tools: require_tools.convertToolsToGenAI(tools)?.tools,
			...kwargs
		});
	}
	invocationParams(options) {
		const toolsAndConfig = options?.tools?.length ? require_tools.convertToolsToGenAI(options.tools, {
			toolChoice: options.tool_choice,
			allowedFunctionNames: options.allowedFunctionNames
		}) : void 0;
		if (options?.responseSchema) {
			this.client.generationConfig.responseSchema = options.responseSchema;
			this.client.generationConfig.responseMimeType = "application/json";
		} else {
			this.client.generationConfig.responseSchema = void 0;
			this.client.generationConfig.responseMimeType = this.json ? "application/json" : void 0;
		}
		return {
			...toolsAndConfig?.tools ? { tools: toolsAndConfig.tools } : {},
			...toolsAndConfig?.toolConfig ? { toolConfig: toolsAndConfig.toolConfig } : {}
		};
	}
	async _generate(messages, options, runManager) {
		options.signal?.throwIfAborted();
		const prompt = require_common.convertBaseMessagesToContent(messages, this._isMultimodalModel, this.useSystemInstruction, this.model);
		let actualPrompt = prompt;
		if (prompt[0].role === "system") {
			const [systemInstruction] = prompt;
			this.client.systemInstruction = systemInstruction;
			actualPrompt = prompt.slice(1);
		}
		const parameters = this.invocationParams(options);
		if (this.streaming) {
			const tokenUsage = {};
			const stream = this._streamResponseChunks(messages, options, runManager);
			const finalChunks = [];
			for await (const chunk of stream) {
				const index = chunk.generationInfo?.completion ?? 0;
				if (finalChunks[index] === void 0) finalChunks[index] = chunk;
				else finalChunks[index] = finalChunks[index].concat(chunk);
			}
			return {
				generations: finalChunks.filter((c) => c !== void 0),
				llmOutput: { estimatedTokenUsage: tokenUsage }
			};
		}
		const res = await this.completionWithRetry({
			...parameters,
			contents: actualPrompt
		});
		let usageMetadata;
		if ("usageMetadata" in res.response) usageMetadata = require_common.convertUsageMetadata(res.response.usageMetadata, this.model);
		const generationResult = require_common.mapGenerateContentResultToChatResult(res.response, { usageMetadata });
		if (generationResult.generations?.length > 0) await runManager?.handleLLMNewToken(generationResult.generations[0]?.text ?? "");
		return generationResult;
	}
	async *_streamResponseChunks(messages, options, runManager) {
		const prompt = require_common.convertBaseMessagesToContent(messages, this._isMultimodalModel, this.useSystemInstruction, this.model);
		let actualPrompt = prompt;
		if (prompt[0].role === "system") {
			const [systemInstruction] = prompt;
			this.client.systemInstruction = systemInstruction;
			actualPrompt = prompt.slice(1);
		}
		const request = {
			...this.invocationParams(options),
			contents: actualPrompt
		};
		const stream = await this.caller.callWithOptions({ signal: options?.signal }, async () => {
			const { stream } = await this.client.generateContentStream(request, { signal: options?.signal });
			return stream;
		});
		let usageMetadata;
		let prevPromptTokenCount = 0;
		let prevCandidatesTokenCount = 0;
		let prevTotalTokenCount = 0;
		let index = 0;
		for await (const response of stream) {
			if (options.signal?.aborted) return;
			if ("usageMetadata" in response && response.usageMetadata !== void 0 && this.streamUsage !== false && options.streamUsage !== false) {
				usageMetadata = require_common.convertUsageMetadata(response.usageMetadata, this.model);
				const newPromptTokenCount = response.usageMetadata.promptTokenCount ?? 0;
				usageMetadata.input_tokens = Math.max(0, newPromptTokenCount - prevPromptTokenCount);
				prevPromptTokenCount = newPromptTokenCount;
				const newCandidatesTokenCount = response.usageMetadata.candidatesTokenCount ?? 0;
				usageMetadata.output_tokens = Math.max(0, newCandidatesTokenCount - prevCandidatesTokenCount);
				prevCandidatesTokenCount = newCandidatesTokenCount;
				const newTotalTokenCount = response.usageMetadata.totalTokenCount ?? 0;
				usageMetadata.total_tokens = Math.max(0, newTotalTokenCount - prevTotalTokenCount);
				prevTotalTokenCount = newTotalTokenCount;
			}
			const chunk = require_common.convertResponseContentToChatGenerationChunk(response, {
				usageMetadata,
				index
			});
			index += 1;
			if (!chunk) continue;
			yield chunk;
			await runManager?.handleLLMNewToken(chunk.text ?? "");
		}
	}
	async completionWithRetry(request, options) {
		return this.caller.callWithOptions({ signal: options?.signal }, async () => {
			try {
				return await this.client.generateContent(request, { signal: options?.signal });
			} catch (e) {
				if (e.message?.includes("400 Bad Request")) e.status = 400;
				throw e;
			}
		});
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
	* const model = new ChatGoogleGenerativeAI({ model: "gemini-1.5-flash" });
	* const profile = model.profile;
	* console.log(profile.maxInputTokens); // 2000000
	* console.log(profile.imageInputs); // true
	* ```
	*/
	get profile() {
		return require_profiles.default[this.model] ?? {};
	}
	withStructuredOutput(outputSchema, config) {
		const schema = outputSchema;
		const name = config?.name;
		const method = config?.method;
		const includeRaw = config?.includeRaw;
		if (method === "jsonMode") throw new Error(`ChatGoogleGenerativeAI only supports "jsonSchema" or "functionCalling" as a method.`);
		let llm;
		let outputParser;
		if (method === "functionCalling") {
			let functionName = name ?? "extract";
			let geminiFunctionDeclaration;
			if ((0, _langchain_core_utils_types.isInteropZodSchema)(schema) || (0, _langchain_core_utils_standard_schema.isSerializableSchema)(schema)) {
				const jsonSchema = require_zod_to_genai_parameters.schemaToGenerativeAIParameters(schema);
				geminiFunctionDeclaration = {
					name: functionName,
					description: jsonSchema.description ?? "A function available to call.",
					parameters: jsonSchema
				};
			} else if (typeof schema.name === "string" && typeof schema.parameters === "object" && schema.parameters != null) {
				geminiFunctionDeclaration = schema;
				geminiFunctionDeclaration.parameters = require_zod_to_genai_parameters.removeAdditionalProperties(schema.parameters);
				functionName = schema.name;
			} else geminiFunctionDeclaration = {
				name: functionName,
				description: schema.description ?? "",
				parameters: require_zod_to_genai_parameters.removeAdditionalProperties(schema)
			};
			const tools = [{ functionDeclarations: [geminiFunctionDeclaration] }];
			llm = this.bindTools(tools).withConfig({ allowedFunctionNames: [functionName] });
			outputParser = (0, _langchain_core_language_models_structured_output.createFunctionCallingParser)(schema, functionName, require_output_parsers.GoogleGenerativeAIToolsOutputParser);
		} else {
			const jsonSchema = require_zod_to_genai_parameters.schemaToGenerativeAIParameters(schema);
			llm = this.withConfig({ responseSchema: jsonSchema });
			outputParser = (0, _langchain_core_language_models_structured_output.createContentParser)(schema);
		}
		return (0, _langchain_core_language_models_structured_output.assembleStructuredOutputPipeline)(llm, outputParser, includeRaw, includeRaw ? "StructuredOutputRunnable" : "ChatGoogleGenerativeAIStructuredOutput");
	}
};

//#endregion
exports.ChatGoogleGenerativeAI = ChatGoogleGenerativeAI;
//# sourceMappingURL=chat_models.cjs.map
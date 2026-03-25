const require_tools = require('../utils/tools.cjs');
const require_base = require('./base.cjs');
const require_completions = require('./completions.cjs');
const require_responses = require('./responses.cjs');

//#region src/chat_models/index.ts
/**
* OpenAI chat model integration.
*
* To use with Azure, import the `AzureChatOpenAI` class.
*
* Setup:
* Install `@langchain/openai` and set an environment variable named `OPENAI_API_KEY`.
*
* ```bash
* npm install @langchain/openai
* export OPENAI_API_KEY="your-api-key"
* ```
*
* ## [Constructor args](https://api.js.langchain.com/classes/langchain_openai.ChatOpenAI.html#constructor)
*
* ## [Runtime args](https://api.js.langchain.com/interfaces/langchain_openai.ChatOpenAICallOptions.html)
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
* import { ChatOpenAI } from '@langchain/openai';
*
* const llm = new ChatOpenAI({
*   model: "gpt-4o-mini",
*   temperature: 0,
*   maxTokens: undefined,
*   timeout: undefined,
*   maxRetries: 2,
*   // apiKey: "...",
*   // configuration: {
*   //   baseURL: "...",
*   // }
*   // organization: "...",
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
*   "id": "chatcmpl-9u4Mpu44CbPjwYFkTbeoZgvzB00Tz",
*   "content": "J'adore la programmation.",
*   "response_metadata": {
*     "tokenUsage": {
*       "completionTokens": 5,
*       "promptTokens": 28,
*       "totalTokens": 33
*     },
*     "finish_reason": "stop",
*     "system_fingerprint": "fp_3aa7262c27"
*   },
*   "usage_metadata": {
*     "input_tokens": 28,
*     "output_tokens": 5,
*     "total_tokens": 33
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
*   "id": "chatcmpl-9u4NWB7yUeHCKdLr6jP3HpaOYHTqs",
*   "content": ""
* }
* AIMessageChunk {
*   "content": "J"
* }
* AIMessageChunk {
*   "content": "'adore"
* }
* AIMessageChunk {
*   "content": " la"
* }
* AIMessageChunk {
*   "content": " programmation",,
* }
* AIMessageChunk {
*   "content": ".",,
* }
* AIMessageChunk {
*   "content": "",
*   "response_metadata": {
*     "finish_reason": "stop",
*     "system_fingerprint": "fp_c9aa9c0491"
*   },
* }
* AIMessageChunk {
*   "content": "",
*   "usage_metadata": {
*     "input_tokens": 28,
*     "output_tokens": 5,
*     "total_tokens": 33
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
*   "id": "chatcmpl-9u4PnX6Fy7OmK46DASy0bH6cxn5Xu",
*   "content": "J'adore la programmation.",
*   "response_metadata": {
*     "prompt": 0,
*     "completion": 0,
*     "finish_reason": "stop",
*   },
*   "usage_metadata": {
*     "input_tokens": 28,
*     "output_tokens": 5,
*     "total_tokens": 33
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
* const llmWithTools = llm.bindTools(
*   [GetWeather, GetPopulation],
*   {
*     // strict: true  // enforce tool args schema is respected
*   }
* );
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
*     id: 'call_uPU4FiFzoKAtMxfmPnfQL6UK'
*   },
*   {
*     name: 'GetWeather',
*     args: { location: 'New York, NY' },
*     type: 'tool_call',
*     id: 'call_UNkEwuQsHrGYqgDQuH9nPAtX'
*   },
*   {
*     name: 'GetPopulation',
*     args: { location: 'Los Angeles, CA' },
*     type: 'tool_call',
*     id: 'call_kL3OXxaq9OjIKqRTpvjaCH14'
*   },
*   {
*     name: 'GetPopulation',
*     args: { location: 'New York, NY' },
*     type: 'tool_call',
*     id: 'call_s9KQB1UWj45LLGaEnjz0179q'
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
*   rating: z.number().nullable().describe("How funny the joke is, from 1 to 10")
* }).describe('Joke to tell user.');
*
* const structuredLlm = llm.withStructuredOutput(Joke, {
*   name: "Joke",
*   strict: true, // Optionally enable OpenAI structured outputs
* });
* const jokeResult = await structuredLlm.invoke("Tell me a joke about cats");
* console.log(jokeResult);
* ```
*
* ```txt
* {
*   setup: 'Why was the cat sitting on the computer?',
*   punchline: 'Because it wanted to keep an eye on the mouse!',
*   rating: 7
* }
* ```
* </details>
*
* <br />
*
* <details>
* <summary><strong>JSON Object Response Format</strong></summary>
*
* ```typescript
* const jsonLlm = llm.withConfig({ response_format: { type: "json_object" } });
* const jsonLlmAiMsg = await jsonLlm.invoke(
*   "Return a JSON object with key 'randomInts' and a value of 10 random ints in [0-99]"
* );
* console.log(jsonLlmAiMsg.content);
* ```
*
* ```txt
* {
*   "randomInts": [23, 87, 45, 12, 78, 34, 56, 90, 11, 67]
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
* { input_tokens: 28, output_tokens: 5, total_tokens: 33 }
* ```
* </details>
*
* <br />
*
* <details>
* <summary><strong>Logprobs</strong></summary>
*
* ```typescript
* const logprobsLlm = new ChatOpenAI({ model: "gpt-4o-mini", logprobs: true });
* const aiMsgForLogprobs = await logprobsLlm.invoke(input);
* console.log(aiMsgForLogprobs.response_metadata.logprobs);
* ```
*
* ```txt
* {
*   content: [
*     {
*       token: 'J',
*       logprob: -0.000050616763,
*       bytes: [Array],
*       top_logprobs: []
*     },
*     {
*       token: "'",
*       logprob: -0.01868736,
*       bytes: [Array],
*       top_logprobs: []
*     },
*     {
*       token: 'ad',
*       logprob: -0.0000030545007,
*       bytes: [Array],
*       top_logprobs: []
*     },
*     { token: 'ore', logprob: 0, bytes: [Array], top_logprobs: [] },
*     {
*       token: ' la',
*       logprob: -0.515404,
*       bytes: [Array],
*       top_logprobs: []
*     },
*     {
*       token: ' programm',
*       logprob: -0.0000118755715,
*       bytes: [Array],
*       top_logprobs: []
*     },
*     { token: 'ation', logprob: 0, bytes: [Array], top_logprobs: [] },
*     {
*       token: '.',
*       logprob: -0.0000037697225,
*       bytes: [Array],
*       top_logprobs: []
*     }
*   ],
*   refusal: null
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
* {
*   tokenUsage: { completionTokens: 5, promptTokens: 28, totalTokens: 33 },
*   finish_reason: 'stop',
*   system_fingerprint: 'fp_3aa7262c27'
* }
* ```
* </details>
*
* <br />
*
* <details>
* <summary><strong>JSON Schema Structured Output</strong></summary>
*
* ```typescript
* const llmForJsonSchema = new ChatOpenAI({
*   model: "gpt-4o-2024-08-06",
* }).withStructuredOutput(
*   z.object({
*     command: z.string().describe("The command to execute"),
*     expectedOutput: z.string().describe("The expected output of the command"),
*     options: z
*       .array(z.string())
*       .describe("The options you can pass to the command"),
*   }),
*   {
*     method: "jsonSchema",
*     strict: true, // Optional when using the `jsonSchema` method
*   }
* );
*
* const jsonSchemaRes = await llmForJsonSchema.invoke(
*   "What is the command to list files in a directory?"
* );
* console.log(jsonSchemaRes);
* ```
*
* ```txt
* {
*   command: 'ls',
*   expectedOutput: 'A list of files and subdirectories within the specified directory.',
*   options: [
*     '-a: include directory entries whose names begin with a dot (.).',
*     '-l: use a long listing format.',
*     '-h: with -l, print sizes in human readable format (e.g., 1K, 234M, 2G).',
*     '-t: sort by time, newest first.',
*     '-r: reverse order while sorting.',
*     '-S: sort by file size, largest first.',
*     '-R: list subdirectories recursively.'
*   ]
* }
* ```
* </details>
*
* <br />
*
* <details>
* <summary><strong>Audio Outputs</strong></summary>
*
* ```typescript
* import { ChatOpenAI } from "@langchain/openai";
*
* const modelWithAudioOutput = new ChatOpenAI({
*   model: "gpt-4o-audio-preview",
*   // You may also pass these fields to `.withConfig` as a call argument.
*   modalities: ["text", "audio"], // Specifies that the model should output audio.
*   audio: {
*     voice: "alloy",
*     format: "wav",
*   },
* });
*
* const audioOutputResult = await modelWithAudioOutput.invoke("Tell me a joke about cats.");
* const castMessageContent = audioOutputResult.content[0] as Record<string, any>;
*
* console.log({
*   ...castMessageContent,
*   data: castMessageContent.data.slice(0, 100) // Sliced for brevity
* })
* ```
*
* ```txt
* {
*   id: 'audio_67117718c6008190a3afad3e3054b9b6',
*   data: 'UklGRqYwBgBXQVZFZm10IBAAAAABAAEAwF0AAIC7AAACABAATElTVBoAAABJTkZPSVNGVA4AAABMYXZmNTguMjkuMTAwAGRhdGFg',
*   expires_at: 1729201448,
*   transcript: 'Sure! Why did the cat sit on the computer? Because it wanted to keep an eye on the mouse!'
* }
* ```
* </details>
*
* <br />
*
* <details>
* <summary><strong>Audio Outputs</strong></summary>
*
* ```typescript
* import { ChatOpenAI } from "@langchain/openai";
*
* const modelWithAudioOutput = new ChatOpenAI({
*   model: "gpt-4o-audio-preview",
*   // You may also pass these fields to `.withConfig` as a call argument.
*   modalities: ["text", "audio"], // Specifies that the model should output audio.
*   audio: {
*     voice: "alloy",
*     format: "wav",
*   },
* });
*
* const audioOutputResult = await modelWithAudioOutput.invoke("Tell me a joke about cats.");
* const castAudioContent = audioOutputResult.additional_kwargs.audio as Record<string, any>;
*
* console.log({
*   ...castAudioContent,
*   data: castAudioContent.data.slice(0, 100) // Sliced for brevity
* })
* ```
*
* ```txt
* {
*   id: 'audio_67117718c6008190a3afad3e3054b9b6',
*   data: 'UklGRqYwBgBXQVZFZm10IBAAAAABAAEAwF0AAIC7AAACABAATElTVBoAAABJTkZPSVNGVA4AAABMYXZmNTguMjkuMTAwAGRhdGFg',
*   expires_at: 1729201448,
*   transcript: 'Sure! Why did the cat sit on the computer? Because it wanted to keep an eye on the mouse!'
* }
* ```
* </details>
*
* <br />
*/
var ChatOpenAI = class ChatOpenAI extends require_base.BaseChatOpenAI {
	/**
	* Whether to use the responses API for all requests. If `false` the responses API will be used
	* only when required in order to fulfill the request.
	*/
	useResponsesApi = false;
	responses;
	completions;
	get lc_serializable_keys() {
		return [...super.lc_serializable_keys, "useResponsesApi"];
	}
	get callKeys() {
		return [...super.callKeys, "useResponsesApi"];
	}
	constructor(fields) {
		super(fields);
		this.fields = fields;
		this.useResponsesApi = fields?.useResponsesApi ?? false;
		this.responses = fields?.responses ?? new require_responses.ChatOpenAIResponses(fields);
		this.completions = fields?.completions ?? new require_completions.ChatOpenAICompletions(fields);
	}
	_useResponsesApi(options) {
		const usesBuiltInTools = options?.tools?.some(require_tools.isBuiltInTool);
		const hasResponsesOnlyKwargs = options?.previous_response_id != null || options?.text != null || options?.truncation != null || options?.include != null || options?.reasoning?.summary != null || this.reasoning?.summary != null;
		const hasCustomTools = options?.tools?.some(require_tools.isOpenAICustomTool) || options?.tools?.some(require_tools.isCustomTool);
		return this.useResponsesApi || usesBuiltInTools || hasResponsesOnlyKwargs || hasCustomTools;
	}
	getLsParams(options) {
		const optionsWithDefaults = this._combineCallOptions(options);
		if (this._useResponsesApi(options)) return this.responses.getLsParams(optionsWithDefaults);
		return this.completions.getLsParams(optionsWithDefaults);
	}
	invocationParams(options) {
		const optionsWithDefaults = this._combineCallOptions(options);
		if (this._useResponsesApi(options)) return this.responses.invocationParams(optionsWithDefaults);
		return this.completions.invocationParams(optionsWithDefaults);
	}
	/** @ignore */
	async _generate(messages, options, runManager) {
		if (this._useResponsesApi(options)) return this.responses._generate(messages, options);
		return this.completions._generate(messages, options, runManager);
	}
	async *_streamResponseChunks(messages, options, runManager) {
		if (this._useResponsesApi(options)) {
			yield* this.responses._streamResponseChunks(messages, this._combineCallOptions(options), runManager);
			return;
		}
		yield* this.completions._streamResponseChunks(messages, this._combineCallOptions(options), runManager);
	}
	withConfig(config) {
		const newModel = new ChatOpenAI(this.fields);
		newModel.defaultOptions = {
			...this.defaultOptions,
			...config
		};
		return newModel;
	}
};

//#endregion
exports.ChatOpenAI = ChatOpenAI;
//# sourceMappingURL=index.cjs.map
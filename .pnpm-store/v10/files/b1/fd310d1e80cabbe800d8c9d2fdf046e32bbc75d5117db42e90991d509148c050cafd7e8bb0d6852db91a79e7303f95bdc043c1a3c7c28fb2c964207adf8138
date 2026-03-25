const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_openai = require_rolldown_runtime.__toESM(require("@langchain/openai"));

//#region src/chat_models/togetherai.ts
var togetherai_exports = {};
require_rolldown_runtime.__export(togetherai_exports, { ChatTogetherAI: () => ChatTogetherAI });
/**
* TogetherAI chat model integration.
*
* The TogetherAI API is compatible to the OpenAI API with some limitations. View the
* full API ref at:
* @link {https://docs.together.ai/reference/chat-completions}
*
* Setup:
* Install `@langchain/community` and set an environment variable named `TOGETHER_AI_API_KEY`.
*
* ```bash
* npm install @langchain/community
* export TOGETHER_AI_API_KEY="your-api-key"
* ```
*
* ## [Constructor args](https://api.js.langchain.com/classes/_langchain_community.chat_models_togetherai.ChatTogetherAI.html#constructor)
*
* ## [Runtime args](https://api.js.langchain.com/interfaces/_langchain_community.chat_models_togetherai.ChatTogetherAICallOptions.html)
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
* import { ChatTogetherAI } from '@langchain/community/chat_models/togetherai';
*
* const llm = new ChatTogetherAI({
*   model: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
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
*   "id": "8b23ea7bcc4c924b-MUC",
*   "content": "\"J'adore programmer\"",
*   "additional_kwargs": {},
*   "response_metadata": {
*     "tokenUsage": {
*       "completionTokens": 8,
*       "promptTokens": 19,
*       "totalTokens": 27
*     },
*     "finish_reason": "eos"
*   },
*   "tool_calls": [],
*   "invalid_tool_calls": [],
*   "usage_metadata": {
*     "input_tokens": 19,
*     "output_tokens": 8,
*     "total_tokens": 27
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
*   "id": "8b23eb602fb19263-MUC",
*   "content": "\"",
*   "additional_kwargs": {},
*   "response_metadata": {
*     "prompt": 0,
*     "completion": 0,
*     "finish_reason": null
*   },
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "id": "8b23eb602fb19263-MUC",
*   "content": "J",
*   "additional_kwargs": {},
*   "response_metadata": {
*     "prompt": 0,
*     "completion": 0,
*     "finish_reason": null
*   },
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "id": "8b23eb602fb19263-MUC",
*   "content": "'",
*   "additional_kwargs": {},
*   "response_metadata": {
*     "prompt": 0,
*     "completion": 0,
*     "finish_reason": null
*   },
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "id": "8b23eb602fb19263-MUC",
*   "content": "ad",
*   "additional_kwargs": {},
*   "response_metadata": {
*     "prompt": 0,
*     "completion": 0,
*     "finish_reason": null
*   },
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "id": "8b23eb602fb19263-MUC",
*   "content": "ore",
*   "additional_kwargs": {},
*   "response_metadata": {
*     "prompt": 0,
*     "completion": 0,
*     "finish_reason": null
*   },
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "id": "8b23eb602fb19263-MUC",
*   "content": " programmer",
*   "additional_kwargs": {},
*   "response_metadata": {
*     "prompt": 0,
*     "completion": 0,
*     "finish_reason": null
*   },
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "id": "8b23eb602fb19263-MUC",
*   "content": "\"",
*   "additional_kwargs": {},
*   "response_metadata": {
*     "prompt": 0,
*     "completion": 0,
*     "finish_reason": null
*   },
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "id": "8b23eb602fb19263-MUC",
*   "content": "",
*   "additional_kwargs": {},
*   "response_metadata": {
*     "prompt": 0,
*     "completion": 0,
*     "finish_reason": "eos"
*   },
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "content": "",
*   "additional_kwargs": {},
*   "response_metadata": {},
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": [],
*   "usage_metadata": {
*     "input_tokens": 19,
*     "output_tokens": 8,
*     "total_tokens": 27
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
*   "id": "8b23ecd42e469236-MUC",
*   "content": "\"J'adore programmer\"",
*   "additional_kwargs": {},
*   "response_metadata": {
*     "prompt": 0,
*     "completion": 0,
*     "finish_reason": "eos"
*   },
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": [],
*   "usage_metadata": {
*     "input_tokens": 19,
*     "output_tokens": 8,
*     "total_tokens": 27
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
*   "Which city is hotter today and which is bigger: LA or NY? Respond with JSON and use tools."
* );
* console.log(aiMsg.tool_calls);
* ```
*
* ```txt
* [
*   {
*     name: 'GetWeather',
*     args: { location: 'Los Angeles' },
*     type: 'tool_call',
*     id: 'call_q8i4zx1udqjjnou2bzbrg8ms'
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
*   setup: 'Why did the cat join a band',
*   punchline: 'Because it wanted to be the purr-cussionist'
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
* { input_tokens: 19, output_tokens: 65, total_tokens: 84 }
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
*   tokenUsage: { completionTokens: 91, promptTokens: 19, totalTokens: 110 },
*   finish_reason: 'eos'
* }
* ```
* </details>
*
* <br />
*/
var ChatTogetherAI = class extends __langchain_openai.ChatOpenAICompletions {
	static lc_name() {
		return "ChatTogetherAI";
	}
	_llmType() {
		return "togetherAI";
	}
	get lc_secrets() {
		return {
			togetherAIApiKey: "TOGETHER_AI_API_KEY",
			apiKey: "TOGETHER_AI_API_KEY"
		};
	}
	lc_serializable = true;
	constructor(fields) {
		const togetherAIApiKey = fields?.apiKey || fields?.togetherAIApiKey || (0, __langchain_core_utils_env.getEnvironmentVariable)("TOGETHER_AI_API_KEY");
		if (!togetherAIApiKey) throw new Error(`TogetherAI API key not found. Please set the TOGETHER_AI_API_KEY environment variable or provide the key into "togetherAIApiKey"`);
		super({
			...fields,
			model: fields?.model || "mistralai/Mixtral-8x7B-Instruct-v0.1",
			apiKey: togetherAIApiKey,
			configuration: { baseURL: "https://api.together.xyz/v1/" }
		});
	}
	getLsParams(options) {
		const params = super.getLsParams(options);
		params.ls_provider = "together";
		return params;
	}
	toJSON() {
		const result = super.toJSON();
		if ("kwargs" in result && typeof result.kwargs === "object" && result.kwargs != null) {
			delete result.kwargs.openai_api_key;
			delete result.kwargs.configuration;
		}
		return result;
	}
	/**
	* Calls the TogetherAI API with retry logic in case of failures.
	* @param request The request to send to the TogetherAI API.
	* @param options Optional configuration for the API call.
	* @returns The response from the TogetherAI API.
	*/
	async completionWithRetry(request, options) {
		delete request.frequency_penalty;
		delete request.presence_penalty;
		delete request.logit_bias;
		delete request.functions;
		if (request.stream === true) return super.completionWithRetry(request, options);
		return super.completionWithRetry(request, options);
	}
};

//#endregion
exports.ChatTogetherAI = ChatTogetherAI;
Object.defineProperty(exports, 'togetherai_exports', {
  enumerable: true,
  get: function () {
    return togetherai_exports;
  }
});
//# sourceMappingURL=togetherai.cjs.map
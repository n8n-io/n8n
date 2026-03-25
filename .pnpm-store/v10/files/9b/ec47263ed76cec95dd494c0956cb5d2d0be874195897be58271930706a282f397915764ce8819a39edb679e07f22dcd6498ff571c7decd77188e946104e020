const require_common = require('./common.cjs');
const require_completions = require('./completions.cjs');
const require_responses = require('./responses.cjs');
const require_index = require('../../chat_models/index.cjs');

//#region src/azure/chat_models/index.ts
/**
* Azure OpenAI chat model integration.
*
* Setup:
* Install `@langchain/openai` and set the following environment variables:
*
* ```bash
* npm install @langchain/openai
* export AZURE_OPENAI_API_KEY="your-api-key"
* export AZURE_OPENAI_API_DEPLOYMENT_NAME="your-deployment-name"
* export AZURE_OPENAI_API_VERSION="your-version"
* export AZURE_OPENAI_BASE_PATH="your-base-path"
* ```
*
* ## [Constructor args](https://api.js.langchain.com/classes/langchain_openai.AzureChatOpenAI.html#constructor)
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
* import { AzureChatOpenAI } from '@langchain/openai';
*
* const llm = new AzureChatOpenAI({
*   azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY, // In Node.js defaults to process.env.AZURE_OPENAI_API_KEY
*   azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME, // In Node.js defaults to process.env.AZURE_OPENAI_API_INSTANCE_NAME
*   azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME, // In Node.js defaults to process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME
*   azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION, // In Node.js defaults to process.env.AZURE_OPENAI_API_VERSION
*   temperature: 0,
*   maxTokens: undefined,
*   timeout: undefined,
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
* const structuredLlm = llm.withStructuredOutput(Joke, { name: "Joke" });
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
*/
var AzureChatOpenAI = class extends require_index.ChatOpenAI {
	azureOpenAIApiVersion;
	azureOpenAIApiKey;
	azureADTokenProvider;
	azureOpenAIApiInstanceName;
	azureOpenAIApiDeploymentName;
	azureOpenAIBasePath;
	azureOpenAIEndpoint;
	_llmType() {
		return "azure_openai";
	}
	get lc_aliases() {
		return {
			...super.lc_aliases,
			...require_common.AZURE_ALIASES
		};
	}
	get lc_secrets() {
		return {
			...super.lc_secrets,
			...require_common.AZURE_SECRETS
		};
	}
	get lc_serializable_keys() {
		return [...super.lc_serializable_keys, ...require_common.AZURE_SERIALIZABLE_KEYS];
	}
	getLsParams(options) {
		const params = super.getLsParams(options);
		params.ls_provider = "azure";
		return params;
	}
	constructor(fields) {
		super({
			...fields,
			completions: new require_completions.AzureChatOpenAICompletions(fields),
			responses: new require_responses.AzureChatOpenAIResponses(fields)
		});
		require_common._constructAzureFields.call(this, fields);
	}
	/** @internal */
	_getStructuredOutputMethod(config) {
		const ensuredConfig = { ...config };
		if (this.model.startsWith("gpt-4o")) {
			if (ensuredConfig?.method === void 0) return "functionCalling";
		}
		return super._getStructuredOutputMethod(ensuredConfig);
	}
	toJSON() {
		return require_common._serializeAzureChat.call(this, super.toJSON());
	}
};

//#endregion
exports.AzureChatOpenAI = AzureChatOpenAI;
//# sourceMappingURL=index.cjs.map
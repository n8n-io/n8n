let _langchain_google_gauth = require("@langchain/google-gauth");

//#region src/chat_models.ts
/**
* Integration with Google Vertex AI chat models.
*
* Setup:
* Install `@langchain/google-vertexai` and set your stringified
* Vertex AI credentials as an environment variable named `GOOGLE_APPLICATION_CREDENTIALS`.
*
* ```bash
* npm install @langchain/google-vertexai
* export GOOGLE_APPLICATION_CREDENTIALS="path/to/credentials"
* ```
*
* ## [Constructor args](https://api.js.langchain.com/classes/_langchain_google_vertexai.index.ChatVertexAI.html#constructor.new_ChatVertexAI)
*
* ## [Runtime args](https://api.js.langchain.com/interfaces/langchain_google_common_types.GoogleAIBaseLanguageModelCallOptions.html)
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
* import { ChatVertexAI } from '@langchain/google-vertexai';
*
* const llm = new ChatVertexAI({
*   model: "gemini-1.5-pro",
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
* AIMessageChunk {
*   "content": "\"J'adore programmer\" \n\nHere's why this is the best translation:\n\n* **J'adore** means \"I love\" and conveys a strong passion.\n* **Programmer** is the French verb for \"to program.\"\n\nThis translation is natural and idiomatic in French. \n",
*   "additional_kwargs": {},
*   "response_metadata": {},
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": [],
*   "usage_metadata": {
*     "input_tokens": 9,
*     "output_tokens": 63,
*     "total_tokens": 72
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
*   "content": "\"",
*   "additional_kwargs": {},
*   "response_metadata": {},
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "content": "J'adore programmer\" \n",
*   "additional_kwargs": {},
*   "response_metadata": {},
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
*   "invalid_tool_calls": [],
*   "usage_metadata": {
*     "input_tokens": 9,
*     "output_tokens": 8,
*     "total_tokens": 17
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
*   "content": "\"J'adore programmer\" \n",
*   "additional_kwargs": {},
*   "response_metadata": {
*     "finishReason": "stop"
*   },
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": [],
*   "usage_metadata": {
*     "input_tokens": 9,
*     "output_tokens": 8,
*     "total_tokens": 17
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
*     name: 'GetPopulation',
*     args: { location: 'New York City, NY' },
*     id: '33c1c1f47e2f492799c77d2800a43912',
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
*   setup: 'What do you call a cat that loves to bowl?',
*   punchline: 'An alley cat!'
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
* { input_tokens: 9, output_tokens: 8, total_tokens: 17 }
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
* { input_tokens: 9, output_tokens: 8, total_tokens: 17 }
* ```
* </details>
*
* <br />
*/
var ChatVertexAI = class extends _langchain_google_gauth.ChatGoogle {
	lc_namespace = [
		"langchain",
		"chat_models",
		"vertexai"
	];
	static lc_name() {
		return "ChatVertexAI";
	}
	constructor(modelOrFields, paramsArg) {
		const fields = typeof modelOrFields === "string" ? {
			...paramsArg ?? {},
			model: modelOrFields
		} : modelOrFields ?? {};
		super({
			...fields,
			platformType: "gcp"
		});
		this._addVersion("@langchain/google-vertexai", "2.1.24");
	}
};

//#endregion
exports.ChatVertexAI = ChatVertexAI;
//# sourceMappingURL=chat_models.cjs.map
import { getCohereClient } from "./client.js";
import { AIMessage, AIMessageChunk, isAIMessage } from "@langchain/core/messages";
import { isOpenAITool } from "@langchain/core/language_models/base";
import { isLangChainTool } from "@langchain/core/utils/function_calling";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatGenerationChunk } from "@langchain/core/outputs";
import * as uuid from "uuid";
import { isInteropZodSchema } from "@langchain/core/utils/types";
import { toJsonSchema } from "@langchain/core/utils/json_schema";

//#region src/chat_models.ts
function convertToDocuments(observations) {
	/** Converts observations into a 'document' dict */
	const documents = [];
	let observationsList = [];
	if (typeof observations === "string") observationsList = [{ output: observations }];
	else if (observations instanceof Map || typeof observations === "object" && observations !== null && !Array.isArray(observations)) observationsList = [observations];
	else if (!Array.isArray(observations)) observationsList = [{ output: observations }];
	for (let doc of observationsList) {
		if (!(doc instanceof Map) && (typeof doc !== "object" || doc === null)) doc = { output: doc };
		documents.push(doc);
	}
	return documents;
}
function convertMessageToCohereMessage(message, toolResults) {
	const getRole = (role) => {
		switch (role) {
			case "system": return "SYSTEM";
			case "human": return "USER";
			case "ai": return "CHATBOT";
			case "tool": return "TOOL";
			default: throw new Error(`Unknown message type: '${role}'. Accepted types: 'human', 'ai', 'system', 'tool'`);
		}
	};
	const getContent = (content) => {
		if (typeof content === "string") return content;
		throw new Error(`ChatCohere does not support non text message content. Received: ${JSON.stringify(content, null, 2)}`);
	};
	const getToolCall = (message$1) => {
		if (isAIMessage(message$1) && message$1.tool_calls) return message$1.tool_calls.map((toolCall) => ({
			name: toolCall.name,
			parameters: toolCall.args
		}));
		return [];
	};
	if (message._getType().toLowerCase() === "ai") return {
		role: getRole(message._getType()),
		message: getContent(message.content),
		toolCalls: getToolCall(message)
	};
	else if (message._getType().toLowerCase() === "tool") return {
		role: getRole(message._getType()),
		message: getContent(message.content),
		toolResults
	};
	else if (message._getType().toLowerCase() === "human" || message._getType().toLowerCase() === "system") return {
		role: getRole(message._getType()),
		message: getContent(message.content)
	};
	else throw new Error("Got unknown message type. Supported types are AIMessage, ToolMessage, HumanMessage, and SystemMessage");
}
function isCohereTool(tool) {
	return "name" in tool && "description" in tool && "parameterDefinitions" in tool;
}
function isToolMessage(message) {
	return message._getType() === "tool";
}
function _convertJsonSchemaToCohereTool(jsonSchema) {
	const parameterDefinitionsProperties = "properties" in jsonSchema ? jsonSchema.properties : {};
	let parameterDefinitionsRequired = "required" in jsonSchema ? jsonSchema.required : [];
	const parameterDefinitionsFinal = {};
	Object.keys(parameterDefinitionsProperties).forEach((propertyName) => {
		parameterDefinitionsFinal[propertyName] = parameterDefinitionsProperties[propertyName];
		if (parameterDefinitionsRequired === void 0) parameterDefinitionsRequired = [];
		parameterDefinitionsFinal[propertyName].required = parameterDefinitionsRequired.includes(propertyName);
	});
	return parameterDefinitionsFinal;
}
function _formatToolsToCohere(tools) {
	if (!tools) return void 0;
	else if (tools.every(isCohereTool)) return tools;
	else if (tools.every(isOpenAITool)) return tools.map((tool) => {
		return {
			name: tool.function.name,
			description: tool.function.description ?? "",
			parameterDefinitions: _convertJsonSchemaToCohereTool(tool.function.parameters)
		};
	});
	else if (tools.every(isLangChainTool)) return tools.map((tool) => {
		const parameterDefinitionsFromZod = isInteropZodSchema(tool.schema) ? toJsonSchema(tool.schema) : tool.schema;
		return {
			name: tool.name,
			description: tool.description ?? "",
			parameterDefinitions: _convertJsonSchemaToCohereTool(parameterDefinitionsFromZod)
		};
	});
	else throw new Error(`Can not pass in a mix of tool schema types to ChatCohere.`);
}
/**
* Integration for Cohere chat models.
*
* Setup:
* Install `@langchain/cohere` and set a environment variable called `COHERE_API_KEY`.
*
* ```bash
* npm install @langchain/cohere
* export COHERE_API_KEY="your-api-key"
* ```
*
* ## [Constructor args](https://api.js.langchain.com/classes/langchain_cohere.ChatCohere.html#constructor)
*
* ## [Runtime args](https://api.js.langchain.com/interfaces/langchain_cohere.ChatCohereCallOptions.html)
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
* import { ChatCohere } from '@langchain/cohere';
*
* const llm = new ChatCohere({
*   model: "command-r-plus",
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
*   "content": "\"J'adore programmer.\"",
*   "additional_kwargs": {
*     ...
*   },
*   "response_metadata": {
*     "estimatedTokenUsage": {
*       "completionTokens": 6,
*       "promptTokens": 75,
*       "totalTokens": 81
*     },
*     "response_id": "54cebd43-737f-458b-bff4-01b220eaf373",
*     "generationId": "48a567da-0f88-4606-bba6-becbeee464bd",
*     "chatHistory": [
*       {
*         "role": "USER",
*         "message": "Translate \"I love programming\" into French."
*       },
*       {
*         "role": "CHATBOT",
*         "message": "\"J'adore programmer.\""
*       }
*     ],
*     "finishReason": "COMPLETE",
*     "meta": {
*       "apiVersion": {
*         "version": "1"
*       },
*       "billedUnits": {
*         "inputTokens": 9,
*         "outputTokens": 6
*       },
*       "tokens": {
*         "inputTokens": 75,
*         "outputTokens": 6
*       }
*     }
*   },
*   "tool_calls": [],
*   "invalid_tool_calls": [],
*   "usage_metadata": {
*     "input_tokens": 75,
*     "output_tokens": 6,
*     "total_tokens": 81
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
*   "content": "",
*   "additional_kwargs": {
*     "eventType": "stream-start",
*     "is_finished": false,
*     "generationId": "d62c8989-8af5-4357-af79-4ea8e6eb2baa"
*   },
*   "response_metadata": {
*     "eventType": "stream-start",
*     "is_finished": false,
*     "generationId": "d62c8989-8af5-4357-af79-4ea8e6eb2baa"
*   },
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "content": "\"",
*   "additional_kwargs": {},
*   "response_metadata": {},
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "content": "J",
*   "additional_kwargs": {},
*   "response_metadata": {},
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "content": "'",
*   "additional_kwargs": {},
*   "response_metadata": {},
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "content": "adore",
*   "additional_kwargs": {},
*   "response_metadata": {},
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "content": " programmer",
*   "additional_kwargs": {},
*   "response_metadata": {},
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "content": ".\"",
*   "additional_kwargs": {},
*   "response_metadata": {},
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": []
* }
* AIMessageChunk {
*   "content": "",
*   "additional_kwargs": {
*     "eventType": "stream-end"
*   },
*   "response_metadata": {
*     "eventType": "stream-end",
*     "response_id": "687f94a6-13b7-4c2c-98be-9ca5573c722f",
*     "text": "\"J'adore programmer.\"",
*     "generationId": "d62c8989-8af5-4357-af79-4ea8e6eb2baa",
*     "chatHistory": [
*       {
*         "role": "USER",
*         "message": "Translate \"I love programming\" into French."
*       },
*       {
*         "role": "CHATBOT",
*         "message": "\"J'adore programmer.\""
*       }
*     ],
*     "finishReason": "COMPLETE",
*     "meta": {
*       "apiVersion": {
*         "version": "1"
*       },
*       "billedUnits": {
*         "inputTokens": 9,
*         "outputTokens": 6
*       },
*       "tokens": {
*         "inputTokens": 75,
*         "outputTokens": 6
*       }
*     }
*   },
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": [],
*   "usage_metadata": {
*     "input_tokens": 75,
*     "output_tokens": 6,
*     "total_tokens": 81
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
*   "content": "\"J'adore programmer.\"",
*   "additional_kwargs": {
*     ...
*   },
*   "response_metadata": {
*     "is_finished": false,
*     "generationId": "303e0215-96f4-4da5-8c2a-10da3840afce303e0215-96f4-4da5-8c2a-10da3840afce",
*     "response_id": "6a8cb7ef-f1b9-44f6-a1df-67aa506d3f0f",
*     "text": "\"J'adore programmer.\"",
*     "chatHistory": [
*       {
*         "role": "USER",
*         "message": "Translate \"I love programming\" into French."
*       },
*       {
*         "role": "CHATBOT",
*         "message": "\"J'adore programmer.\""
*       }
*     ],
*     "finishReason": "COMPLETE",
*     "meta": {
*       "apiVersion": {
*         "version": "1"
*       },
*       "billedUnits": {
*         "inputTokens": 9,
*         "outputTokens": 6
*       },
*       "tokens": {
*         "inputTokens": 75,
*         "outputTokens": 6
*       }
*     }
*   },
*   "tool_calls": [],
*   "tool_call_chunks": [],
*   "invalid_tool_calls": [],
*   "usage_metadata": {
*     "input_tokens": 75,
*     "output_tokens": 6,
*     "total_tokens": 81
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
*     args: { location: 'LA' },
*     id: 'ce8076ee-2ed3-429d-938c-14f3218c',
*     type: 'tool_call'
*   },
*   {
*     name: 'GetWeather',
*     args: { location: 'NY' },
*     id: '23d1a96e-3a2c-46f4-9d9e-cccd02c6',
*     type: 'tool_call'
*   },
*   {
*     name: 'GetPopulation',
*     args: { location: 'LA' },
*     id: '2bf9d627-310f-46ff-93a9-86baeae9',
*     type: 'tool_call'
*   },
*   {
*     name: 'GetPopulation',
*     args: { location: 'NY' },
*     id: 'c95e6ac0-ee9b-48de-86b2-12548fd1',
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
*   punchline: 'Because she wanted to be a first-aid kit.',
*   rating: 5,
*   setup: 'Why did the cat join the Red Cross?'
* }
* ```
* </details>
*
* <br />
*
* <summary><strong>Usage Metadata</strong></summary>
*
* ```typescript
* const aiMsgForMetadata = await llm.invoke(input);
* console.log(aiMsgForMetadata.usage_metadata);
* ```
*
* ```txt
* { input_tokens: 75, output_tokens: 6, total_tokens: 81 }
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
*   estimatedTokenUsage: { completionTokens: 6, promptTokens: 75, totalTokens: 81 },
*   response_id: 'a688ad65-4db2-4a7a-b6aa-124aa2410319',
*   generationId: 'ee259727-18c5-43f7-b9bd-a2a60c0c040b',
*   chatHistory: [
*     {
*       role: 'USER',
*       message: 'Translate "I love programming" into French.'
*     },
*     { role: 'CHATBOT', message: `"J'adore programmer."` }
*   ],
*   finishReason: 'COMPLETE',
*   meta: {
*     apiVersion: { version: '1' },
*     billedUnits: { inputTokens: 9, outputTokens: 6 },
*     tokens: { inputTokens: 75, outputTokens: 6 }
*   }
* }
* ```
* </details>
*
* <br />
*/
var ChatCohere = class extends BaseChatModel {
	static lc_name() {
		return "ChatCohere";
	}
	lc_serializable = true;
	client;
	model = "command-r-plus";
	temperature = .3;
	streaming = false;
	streamUsage = true;
	constructor(fields) {
		super(fields ?? {});
		this.client = getCohereClient(fields);
		this.model = fields?.model ?? this.model;
		this.temperature = fields?.temperature ?? this.temperature;
		this.streaming = fields?.streaming ?? this.streaming;
		this.streamUsage = fields?.streamUsage ?? this.streamUsage;
	}
	getLsParams(options) {
		const params = this.invocationParams(options);
		return {
			ls_provider: "cohere",
			ls_model_name: this.model,
			ls_model_type: "chat",
			ls_temperature: this.temperature ?? void 0,
			ls_max_tokens: typeof params.maxTokens === "number" ? params.maxTokens : void 0,
			ls_stop: Array.isArray(params.stopSequences) ? params.stopSequences : void 0
		};
	}
	_llmType() {
		return "cohere";
	}
	invocationParams(options) {
		if (options.tool_choice) throw new Error("'tool_choice' call option is not supported by ChatCohere.");
		const params = {
			model: this.model,
			preamble: options.preamble,
			conversationId: options.conversationId,
			promptTruncation: options.promptTruncation,
			connectors: options.connectors,
			searchQueriesOnly: options.searchQueriesOnly,
			documents: options.documents,
			temperature: options.temperature ?? this.temperature,
			forceSingleStep: options.forceSingleStep,
			tools: options.tools
		};
		return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== void 0));
	}
	bindTools(tools, kwargs) {
		return this.withConfig({
			tools: _formatToolsToCohere(tools),
			...kwargs
		});
	}
	/** @ignore */
	_getChatRequest(messages, options) {
		const params = this.invocationParams(options);
		const toolResults = this._messagesToCohereToolResultsCurrChatTurn(messages);
		const chatHistory = [];
		let messageStr = "";
		let tempToolResults = [];
		if (!params.forceSingleStep) {
			for (let i = 0; i < messages.length - 1; i += 1) {
				const message = messages[i];
				if (message._getType().toLowerCase() === "tool") {
					tempToolResults = tempToolResults.concat(this._messageToCohereToolResults(messages, i));
					if (i === messages.length - 1 || !(messages[i + 1]._getType().toLowerCase() === "tool")) {
						const cohere_message = convertMessageToCohereMessage(message, tempToolResults);
						chatHistory.push(cohere_message);
						tempToolResults = [];
					}
				} else chatHistory.push(convertMessageToCohereMessage(message, []));
			}
			messageStr = toolResults.length > 0 ? "" : messages[messages.length - 1].content.toString();
		} else {
			messageStr = "";
			for (let i = 0; i < messages.length - 1; i += 1) {
				const message = messages[i];
				if (isAIMessage(message) && message.tool_calls) continue;
				if (message._getType().toLowerCase() === "tool") {
					tempToolResults = tempToolResults.concat(this._messageToCohereToolResults(messages, i));
					if (i === messages.length - 1 || !(messages[i + 1]._getType().toLowerCase() === "tool")) {
						const cohereMessage = convertMessageToCohereMessage(message, tempToolResults);
						chatHistory.push(cohereMessage);
						tempToolResults = [];
					}
				} else chatHistory.push(convertMessageToCohereMessage(message, []));
			}
			for (let i = messages.length - 1; i >= 0; i -= 1) {
				const message = messages[i];
				if (message._getType().toLowerCase() === "human" && message.content) {
					messageStr = message.content.toString();
					break;
				}
			}
		}
		const req = {
			message: messageStr,
			chatHistory,
			toolResults: toolResults.length > 0 ? toolResults : void 0,
			...params
		};
		return req;
	}
	_getCurrChatTurnMessages(messages) {
		const currentChatTurnMessages = [];
		for (let i = messages.length - 1; i >= 0; i -= 1) {
			const message = messages[i];
			currentChatTurnMessages.push(message);
			if (message._getType().toLowerCase() === "human") break;
		}
		return currentChatTurnMessages.reverse();
	}
	_messagesToCohereToolResultsCurrChatTurn(messages) {
		/** Get tool_results from messages. */
		const toolResults = [];
		const currChatTurnMessages = this._getCurrChatTurnMessages(messages);
		for (const message of currChatTurnMessages) if (isToolMessage(message)) {
			const toolMessage = message;
			const previousAiMsgs = currChatTurnMessages.filter((msg) => isAIMessage(msg) && msg.tool_calls !== void 0);
			if (previousAiMsgs.length > 0) {
				const previousAiMsg = previousAiMsgs[previousAiMsgs.length - 1];
				if (previousAiMsg.tool_calls) toolResults.push(...previousAiMsg.tool_calls.filter((lcToolCall) => lcToolCall.id === toolMessage.tool_call_id).map((lcToolCall) => ({
					call: {
						name: lcToolCall.name,
						parameters: lcToolCall.args
					},
					outputs: convertToDocuments(toolMessage.content)
				})));
			}
		}
		return toolResults;
	}
	_messageToCohereToolResults(messages, toolMessageIndex) {
		/** Get tool_results from messages. */
		const toolResults = [];
		const toolMessage = messages[toolMessageIndex];
		if (!isToolMessage(toolMessage)) throw new Error("The message index does not correspond to an instance of ToolMessage");
		const messagesUntilTool = messages.slice(0, toolMessageIndex);
		const previousAiMessage = messagesUntilTool.filter((message) => isAIMessage(message) && message.tool_calls).slice(-1)[0];
		if (previousAiMessage.tool_calls) toolResults.push(...previousAiMessage.tool_calls.filter((lcToolCall) => lcToolCall.id === toolMessage.tool_call_id).map((lcToolCall) => ({
			call: {
				name: lcToolCall.name,
				parameters: lcToolCall.args
			},
			outputs: convertToDocuments(toolMessage.content)
		})));
		return toolResults;
	}
	_formatCohereToolCalls(toolCalls = null) {
		if (!toolCalls) return [];
		const formattedToolCalls = [];
		for (const toolCall of toolCalls) formattedToolCalls.push({
			id: uuid.v4().substring(0, 32),
			function: {
				name: toolCall.name,
				arguments: toolCall.parameters
			},
			type: "function"
		});
		return formattedToolCalls;
	}
	_convertCohereToolCallToLangchain(toolCalls) {
		return toolCalls.map((toolCall) => ({
			name: toolCall.function.name,
			args: toolCall.function.arguments,
			id: toolCall.id,
			type: "tool_call"
		}));
	}
	/** @ignore */
	async _generate(messages, options, runManager) {
		const tokenUsage = {};
		const request = this._getChatRequest(messages, options);
		if (this.streaming) {
			const stream = this._streamResponseChunks(messages, options, runManager);
			const finalChunks = {};
			for await (const chunk of stream) {
				const index = chunk.generationInfo?.completion ?? 0;
				if (finalChunks[index] === void 0) finalChunks[index] = chunk;
				else finalChunks[index] = finalChunks[index].concat(chunk);
			}
			const generations$1 = Object.entries(finalChunks).sort(([aKey], [bKey]) => parseInt(aKey, 10) - parseInt(bKey, 10)).map(([_, value]) => value);
			return {
				generations: generations$1,
				llmOutput: { estimatedTokenUsage: tokenUsage }
			};
		}
		const response = await this.caller.callWithOptions({ signal: options.signal }, async () => {
			let response$1;
			try {
				response$1 = await this.client.chat(request);
			} catch (e) {
				e.status = e.status ?? e.statusCode;
				throw e;
			}
			return response$1;
		});
		if (response.meta?.tokens) {
			const { inputTokens, outputTokens } = response.meta.tokens;
			if (outputTokens) tokenUsage.completionTokens = (tokenUsage.completionTokens ?? 0) + outputTokens;
			if (inputTokens) tokenUsage.promptTokens = (tokenUsage.promptTokens ?? 0) + inputTokens;
			tokenUsage.totalTokens = (tokenUsage.totalTokens ?? 0) + (tokenUsage.promptTokens ?? 0) + (tokenUsage.completionTokens ?? 0);
		}
		const generationInfo = { ...response };
		delete generationInfo.text;
		if (response.toolCalls && response.toolCalls.length > 0) generationInfo.toolCalls = this._formatCohereToolCalls(response.toolCalls);
		let toolCalls = [];
		if ("toolCalls" in generationInfo) toolCalls = this._convertCohereToolCallToLangchain(generationInfo.toolCalls);
		const generations = [{
			text: response.text,
			message: new AIMessage({
				content: response.text,
				additional_kwargs: generationInfo,
				tool_calls: toolCalls,
				usage_metadata: {
					input_tokens: tokenUsage.promptTokens ?? 0,
					output_tokens: tokenUsage.completionTokens ?? 0,
					total_tokens: tokenUsage.totalTokens ?? 0
				}
			}),
			generationInfo
		}];
		return {
			generations,
			llmOutput: { estimatedTokenUsage: tokenUsage }
		};
	}
	async *_streamResponseChunks(messages, options, runManager) {
		const request = this._getChatRequest(messages, options);
		const stream = await this.caller.call(async () => {
			let stream$1;
			try {
				stream$1 = await this.client.chatStream(request);
			} catch (e) {
				e.status = e.status ?? e.statusCode;
				throw e;
			}
			return stream$1;
		});
		for await (const chunk of stream) if (chunk.eventType === "text-generation") {
			yield new ChatGenerationChunk({
				text: chunk.text,
				message: new AIMessageChunk({ content: chunk.text })
			});
			await runManager?.handleLLMNewToken(chunk.text);
		} else if (chunk.eventType !== "stream-end") yield new ChatGenerationChunk({
			text: "",
			message: new AIMessageChunk({
				content: "",
				additional_kwargs: { ...chunk }
			}),
			generationInfo: { ...chunk }
		});
		else if (chunk.eventType === "stream-end" && (this.streamUsage || options.streamUsage)) {
			const input_tokens = chunk.response.meta?.tokens?.inputTokens ?? 0;
			const output_tokens = chunk.response.meta?.tokens?.outputTokens ?? 0;
			const chunkGenerationInfo = { ...chunk.response };
			if (chunk.response.toolCalls && chunk.response.toolCalls.length > 0) chunkGenerationInfo.toolCalls = this._formatCohereToolCalls(chunk.response.toolCalls);
			let toolCallChunks = [];
			const toolCalls = chunkGenerationInfo.toolCalls ?? [];
			if (toolCalls.length > 0) toolCallChunks = toolCalls.map((toolCall) => ({
				name: toolCall.function.name,
				args: toolCall.function.arguments,
				id: toolCall.id,
				index: toolCall.index,
				type: "tool_call_chunk"
			}));
			yield new ChatGenerationChunk({
				text: "",
				message: new AIMessageChunk({
					content: "",
					additional_kwargs: { eventType: "stream-end" },
					tool_call_chunks: toolCallChunks,
					usage_metadata: {
						input_tokens,
						output_tokens,
						total_tokens: input_tokens + output_tokens
					}
				}),
				generationInfo: {
					eventType: "stream-end",
					...chunkGenerationInfo
				}
			});
		}
	}
	_combineLLMOutput(...llmOutputs) {
		return llmOutputs.reduce((acc, llmOutput) => {
			if (llmOutput && llmOutput.estimatedTokenUsage) {
				let completionTokens = acc.estimatedTokenUsage?.completionTokens ?? 0;
				let promptTokens = acc.estimatedTokenUsage?.promptTokens ?? 0;
				let totalTokens = acc.estimatedTokenUsage?.totalTokens ?? 0;
				completionTokens += llmOutput.estimatedTokenUsage.completionTokens ?? 0;
				promptTokens += llmOutput.estimatedTokenUsage.promptTokens ?? 0;
				totalTokens += llmOutput.estimatedTokenUsage.totalTokens ?? 0;
				acc.estimatedTokenUsage = {
					completionTokens,
					promptTokens,
					totalTokens
				};
			}
			return acc;
		}, { estimatedTokenUsage: {
			completionTokens: 0,
			promptTokens: 0,
			totalTokens: 0
		} });
	}
	get lc_secrets() {
		return {
			apiKey: "COHERE_API_KEY",
			api_key: "COHERE_API_KEY"
		};
	}
	get lc_aliases() {
		return {
			apiKey: "cohere_api_key",
			api_key: "cohere_api_key"
		};
	}
};

//#endregion
export { ChatCohere };
//# sourceMappingURL=chat_models.js.map
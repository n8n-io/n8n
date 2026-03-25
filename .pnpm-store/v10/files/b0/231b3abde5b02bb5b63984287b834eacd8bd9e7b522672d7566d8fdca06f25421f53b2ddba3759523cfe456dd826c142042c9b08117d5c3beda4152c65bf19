import { convertToBedrockToolChoice, convertToConverseTools, supportedToolChoiceValuesForModel } from "./utils/tools.js";
import { convertToConverseMessages } from "./utils/message_inputs.js";
import { convertConverseMessageToLangChainMessage, handleConverseStreamContentBlockDelta, handleConverseStreamContentBlockStart, handleConverseStreamMetadata } from "./utils/message_outputs.js";
import { AIMessageChunk } from "@langchain/core/messages";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { BedrockRuntimeClient, ConverseCommand, ConverseStreamCommand } from "@aws-sdk/client-bedrock-runtime";
import { ChatGenerationChunk } from "@langchain/core/outputs";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { RunnableLambda, RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";
import { getSchemaDescription, isInteropZodSchema } from "@langchain/core/utils/types";
import { toJsonSchema } from "@langchain/core/utils/json_schema";

//#region src/chat_models.ts
/**
* AWS Bedrock Converse chat model integration.
*
* Setup:
* Install `@langchain/aws` and set the following environment variables:
*
* ```bash
* npm install @langchain/aws
* export BEDROCK_AWS_REGION="your-aws-region"
* export BEDROCK_AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
* export BEDROCK_AWS_ACCESS_KEY_ID="your-aws-access-key-id"
* ```
*
* ## [Constructor args](https://api.js.langchain.com/classes/langchain_aws.ChatBedrockConverse.html#constructor)
*
* ## [Runtime args](https://api.js.langchain.com/interfaces/langchain_aws.ChatBedrockConverseCallOptions.html)
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
* import { ChatBedrockConverse } from '@langchain/aws';
*
* const llm = new ChatBedrockConverse({
*   model: "anthropic.claude-3-5-sonnet-20240620-v1:0",
*   temperature: 0,
*   maxTokens: undefined,
*   timeout: undefined,
*   maxRetries: 2,
*   region: process.env.BEDROCK_AWS_REGION,
*   credentials: {
*     secretAccessKey: process.env.BEDROCK_AWS_SECRET_ACCESS_KEY!,
*     accessKeyId: process.env.BEDROCK_AWS_ACCESS_KEY_ID!,
*   },
*   // Configure client options (e.g., custom request handler)
*   // clientOptions: {
*   //   requestHandler: myCustomRequestHandler,
*   // },
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
*   "id": "81a27f7a-550c-473d-8307-c2fbb9c74956",
*   "content": "Here's the translation to French:\n\nJ'adore la programmation.",
*   "response_metadata": {
*     "$metadata": {
*       "httpStatusCode": 200,
*       "requestId": "81a27f7a-550c-473d-8307-c2fbb9c74956",
*       "attempts": 1,
*       "totalRetryDelay": 0
*     },
*     "metrics": {
*       "latencyMs": 1109
*     },
*     "stopReason": "end_turn",
*     "usage": {
*       "inputTokens": 25,
*       "outputTokens": 19,
*       "totalTokens": 44
*     }
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
*   "content": ""
*   "response_metadata": {
*     "messageStart": {
*       "p": "abcdefghijk",
*       "role": "assistant"
*     }
*   }
* }
* AIMessageChunk {
*   "content": "Here"
* }
* AIMessageChunk {
*   "content": "'s"
* }
* AIMessageChunk {
*   "content": " the translation"
* }
* AIMessageChunk {
*   "content": " to"
* }
* AIMessageChunk {
*   "content": " French:\n\nJ"
* }
* AIMessageChunk {
*   "content": "'adore la"
* }
* AIMessageChunk {
*   "content": " programmation."
* }
* AIMessageChunk {
*   "content": ""
*   "response_metadata": {
*     "contentBlockStop": {
*       "contentBlockIndex": 0,
*       "p": "abcdefghijk"
*     }
*   }
* }
* AIMessageChunk {
*   "content": ""
*   "response_metadata": {
*     "messageStop": {
*       "stopReason": "end_turn"
*     }
*   }
* }
* AIMessageChunk {
*   "content": ""
*   "response_metadata": {
*     "metadata": {
*       "metrics": {
*         "latencyMs": 838
*       },
*       "p": "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123",
*       "usage": {
*         "inputTokens": 25,
*         "outputTokens": 19,
*         "totalTokens": 44
*       }
*     }
*   }
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
*   "content": "Here's the translation to French:\n\nJ'adore la programmation.",
*   "response_metadata": {
*     "messageStart": {
*       "p": "ab",
*       "role": "assistant"
*     },
*     "contentBlockStop": {
*       "contentBlockIndex": 0,
*       "p": "abcdefghijklmnopqrstuvwxyzABCDEFGHIJK"
*     },
*     "messageStop": {
*       "stopReason": "end_turn"
*     },
*     "metadata": {
*       "metrics": {
*         "latencyMs": 838
*       },
*       "p": "abcdefghijklmnopqrstuvwxyz",
*       "usage": {
*         "inputTokens": 25,
*         "outputTokens": 19,
*         "totalTokens": 44
*       }
*     }
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
*     id: 'tooluse_hIaiqfweRtSiJyi6J4naJA',
*     name: 'GetWeather',
*     args: { location: 'Los Angeles, CA' },
*     type: 'tool_call'
*   },
*   {
*     id: 'tooluse_nOS8B0UlTd2FdpH4MSHw9w',
*     name: 'GetWeather',
*     args: { location: 'New York, NY' },
*     type: 'tool_call'
*   },
*   {
*     id: 'tooluse_XxMpZiETQ5aVS5opVDyIaw',
*     name: 'GetPopulation',
*     args: { location: 'Los Angeles, CA' },
*     type: 'tool_call'
*   },
*   {
*     id: 'tooluse_GpYvAfldT2aR8VQfH-p4PQ',
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
* The weather in this image appears to be clear and pleasant. The sky is a vibrant blue with scattered white clouds, suggesting a sunny day with good visibility. The clouds are light and wispy, indicating fair weather conditions. There's no sign of rain, storm, or any adverse weather patterns. The lush green grass on the rolling hills looks well-watered and healthy, which could indicate recent rainfall or generally favorable weather conditions. Overall, the image depicts a beautiful, calm day with blue skies and sunshine - perfect weather for enjoying the outdoors.
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
* const streamForMetadata = await llm.stream(input);
* let fullForMetadata: AIMessageChunk | undefined;
* for await (const chunk of streamForMetadata) {
*   fullForMetadata = !fullForMetadata ? chunk : concat(fullForMetadata, chunk);
* }
* console.log(fullForMetadata?.usage_metadata);
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
* <summary><strong>Response Metadata</strong></summary>
*
* ```typescript
* const aiMsgForResponseMetadata = await llm.invoke(input);
* console.log(aiMsgForResponseMetadata.response_metadata);
* ```
*
* ```txt
* {
*   '$metadata': {
*     httpStatusCode: 200,
*     requestId: '5de2a2e5-d1dc-4dff-bb02-31361f4107bc',
*     extendedRequestId: undefined,
*     cfId: undefined,
*     attempts: 1,
*     totalRetryDelay: 0
*   },
*   metrics: { latencyMs: 1163 },
*   stopReason: 'end_turn',
*   usage: { inputTokens: 25, outputTokens: 19, totalTokens: 44 }
* }
* ```
* </details>
*
* <br />
*/
var ChatBedrockConverse = class extends BaseChatModel {
	static lc_name() {
		return "ChatBedrockConverse";
	}
	/**
	* Replace with any secrets this class passes to `super`.
	* See {@link ../../langchain-cohere/src/chat_model.ts} for
	* an example.
	*/
	get lc_secrets() {
		return { apiKey: "API_KEY_NAME" };
	}
	get lc_aliases() {
		return {
			apiKey: "API_KEY_NAME",
			model: "model_id",
			region: "region_name"
		};
	}
	model = "anthropic.claude-3-haiku-20240307-v1:0";
	streaming = false;
	region;
	temperature = void 0;
	maxTokens = void 0;
	endpointHost;
	topP;
	additionalModelRequestFields;
	streamUsage = true;
	guardrailConfig;
	performanceConfig;
	client;
	clientOptions;
	/**
	* Which types of `tool_choice` values the model supports.
	*
	* Inferred if not specified. Inferred as ['auto', 'any', 'tool'] if a 'claude-3'
	* model is used, ['auto', 'any'] if a 'mistral-large' model is used, empty otherwise.
	*/
	supportsToolChoiceValues;
	constructor(fields) {
		super(fields ?? {});
		const { profile, filepath, configFilepath, ignoreCache, mfaCodeProvider, roleAssumer, roleArn, webIdentityTokenFile, roleAssumerWithWebIdentity,...rest } = fields ?? {};
		const credentials = rest?.credentials ?? defaultProvider({
			profile,
			filepath,
			configFilepath,
			ignoreCache,
			mfaCodeProvider,
			roleAssumer,
			roleArn,
			webIdentityTokenFile,
			roleAssumerWithWebIdentity
		});
		const region = rest?.region ?? getEnvironmentVariable("AWS_DEFAULT_REGION");
		if (!region) throw new Error("Please set the AWS_DEFAULT_REGION environment variable or pass it to the constructor as the region field.");
		this.client = fields?.client ?? new BedrockRuntimeClient({
			...fields?.clientOptions,
			region,
			credentials,
			endpoint: rest.endpointHost ? `https://${rest.endpointHost}` : void 0
		});
		this.region = region;
		this.model = rest?.model ?? this.model;
		this.streaming = rest?.streaming ?? this.streaming;
		this.temperature = rest?.temperature;
		this.maxTokens = rest?.maxTokens;
		this.endpointHost = rest?.endpointHost;
		this.topP = rest?.topP;
		this.additionalModelRequestFields = rest?.additionalModelRequestFields;
		this.streamUsage = rest?.streamUsage ?? this.streamUsage;
		this.guardrailConfig = rest?.guardrailConfig;
		this.performanceConfig = rest?.performanceConfig;
		this.clientOptions = rest?.clientOptions;
		if (rest?.supportsToolChoiceValues === void 0) this.supportsToolChoiceValues = supportedToolChoiceValuesForModel(this.model);
		else this.supportsToolChoiceValues = rest.supportsToolChoiceValues;
	}
	getLsParams(options) {
		const params = this.invocationParams(options);
		return {
			ls_provider: "amazon_bedrock",
			ls_model_name: this.model,
			ls_model_type: "chat",
			ls_temperature: params.inferenceConfig?.temperature ?? this.temperature,
			ls_max_tokens: params.inferenceConfig?.maxTokens ?? void 0,
			ls_stop: options.stop
		};
	}
	bindTools(tools, kwargs) {
		return this.withConfig({
			tools: convertToConverseTools(tools),
			...kwargs
		});
	}
	_llmType() {
		return "chat_bedrock_converse";
	}
	invocationParams(options) {
		let toolConfig;
		if (options?.tools && options.tools.length) {
			const tools = convertToConverseTools(options.tools);
			toolConfig = {
				tools,
				toolChoice: options.tool_choice ? convertToBedrockToolChoice(options.tool_choice, tools, {
					model: this.model,
					supportsToolChoiceValues: this.supportsToolChoiceValues
				}) : void 0
			};
		}
		const candidateInferenceConfig = {
			maxTokens: this.maxTokens,
			temperature: this.temperature,
			topP: this.topP,
			stopSequences: options?.stop
		};
		const hasInferenceValues = candidateInferenceConfig.maxTokens !== void 0 || candidateInferenceConfig.temperature !== void 0 || candidateInferenceConfig.topP !== void 0 || Array.isArray(candidateInferenceConfig.stopSequences) && candidateInferenceConfig.stopSequences.length > 0;
		return {
			inferenceConfig: hasInferenceValues ? candidateInferenceConfig : void 0,
			toolConfig,
			additionalModelRequestFields: this.additionalModelRequestFields ?? options?.additionalModelRequestFields,
			guardrailConfig: this.guardrailConfig ?? options?.guardrailConfig,
			performanceConfig: options?.performanceConfig
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
		const { converseMessages, converseSystem } = convertToConverseMessages(messages);
		const params = this.invocationParams(options);
		const command = new ConverseCommand({
			modelId: this.model,
			messages: converseMessages,
			...Array.isArray(converseSystem) && converseSystem.length > 0 ? { system: converseSystem } : {},
			requestMetadata: options.requestMetadata,
			...params
		});
		const response = await this.client.send(command, { abortSignal: options.signal });
		const { output,...responseMetadata } = response;
		if (!output?.message) throw new Error("No message found in Bedrock response.");
		const message = convertConverseMessageToLangChainMessage(output.message, responseMetadata);
		return { generations: [{
			text: typeof message.content === "string" ? message.content : "",
			message
		}] };
	}
	async *_streamResponseChunks(messages, options, runManager) {
		const { converseMessages, converseSystem } = convertToConverseMessages(messages);
		const params = this.invocationParams(options);
		let { streamUsage } = this;
		if (options.streamUsage !== void 0) streamUsage = options.streamUsage;
		const command = new ConverseStreamCommand({
			modelId: this.model,
			messages: converseMessages,
			...Array.isArray(converseSystem) && converseSystem.length > 0 ? { system: converseSystem } : {},
			requestMetadata: options.requestMetadata,
			...params
		});
		const response = await this.client.send(command, { abortSignal: options.signal });
		if (response.stream) for await (const chunk of response.stream) if (chunk.contentBlockStart) yield handleConverseStreamContentBlockStart(chunk.contentBlockStart);
		else if (chunk.contentBlockDelta) {
			const textChatGeneration = handleConverseStreamContentBlockDelta(chunk.contentBlockDelta);
			yield textChatGeneration;
			await runManager?.handleLLMNewToken(textChatGeneration.text, void 0, void 0, void 0, void 0, { chunk: textChatGeneration });
		} else if (chunk.metadata) yield handleConverseStreamMetadata(chunk.metadata, { streamUsage });
		else yield new ChatGenerationChunk({
			text: "",
			message: new AIMessageChunk({
				content: "",
				response_metadata: { ...chunk }
			})
		});
	}
	withStructuredOutput(outputSchema, config) {
		const schema = outputSchema;
		const name = config?.name;
		const description = getSchemaDescription(schema) ?? "A function available to call.";
		const method = config?.method;
		const includeRaw = config?.includeRaw;
		if (method === "jsonMode") throw new Error(`ChatBedrockConverse does not support 'jsonMode'.`);
		let functionName = name ?? "extract";
		let tools;
		if (isInteropZodSchema(schema)) tools = [{
			type: "function",
			function: {
				name: functionName,
				description,
				parameters: toJsonSchema(schema)
			}
		}];
		else {
			if ("name" in schema) functionName = schema.name;
			tools = [{
				type: "function",
				function: {
					name: functionName,
					description,
					parameters: schema
				}
			}];
		}
		const supportsToolChoiceValues = this.supportsToolChoiceValues ?? [];
		let toolChoiceObj;
		if (supportsToolChoiceValues.includes("tool")) toolChoiceObj = { tool_choice: tools[0].function.name };
		else if (supportsToolChoiceValues.includes("any")) toolChoiceObj = { tool_choice: "any" };
		const llm = this.bindTools(tools, toolChoiceObj);
		const outputParser = RunnableLambda.from((input) => {
			if (!input.tool_calls || input.tool_calls.length === 0) throw new Error("No tool calls found in the response.");
			const toolCall = input.tool_calls.find((tc) => tc.name === functionName);
			if (!toolCall) throw new Error(`No tool call found with name ${functionName}.`);
			return toolCall.args;
		});
		if (!includeRaw) return llm.pipe(outputParser).withConfig({ runName: "StructuredOutput" });
		const parserAssign = RunnablePassthrough.assign({ parsed: (input, config$1) => outputParser.invoke(input.raw, config$1) });
		const parserNone = RunnablePassthrough.assign({ parsed: () => null });
		const parsedWithFallback = parserAssign.withFallbacks({ fallbacks: [parserNone] });
		return RunnableSequence.from([{ raw: llm }, parsedWithFallback]).withConfig({ runName: "StructuredOutputRunnable" });
	}
};

//#endregion
export { ChatBedrockConverse };
//# sourceMappingURL=chat_models.js.map
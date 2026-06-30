import type { AgentAction, AgentFinish } from '@langchain/classic/agents';
import type { ToolsAgentAction } from '@langchain/classic/dist/agents/tool_calling/output_parser';
import type { BaseChatMemory } from '@langchain/classic/memory';
import { DynamicStructuredTool, type Tool } from '@langchain/classic/tools';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, type BaseMessagePromptTemplateLike } from '@langchain/core/prompts';
import { isChatInstance } from '@n8n/ai-utilities';
import { AiConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { BINARY_ENCODING, jsonParse, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type {
	IBinaryData,
	IExecuteFunctions,
	ISupplyDataFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';
import type { ZodObject } from 'zod';
import { z } from 'zod';

import { getConnectedTools } from '@utils/helpers';
import { type N8nOutputParser } from '@utils/output_parsers/N8nOutputParser';

/* -----------------------------------------------------------
   Output Parser Helper
----------------------------------------------------------- */
/**
 * Retrieve the output parser schema.
 * If the parser does not return a valid schema, default to a schema with a single text field.
 */
export function getOutputParserSchema(
	outputParser: N8nOutputParser,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): ZodObject<any, any, any, any> {
	const schema =
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(outputParser.getSchema() as ZodObject<any, any, any, any>) ?? z.object({ text: z.string() });
	return schema;
}

/* -----------------------------------------------------------
   Binary Data Helpers
----------------------------------------------------------- */
function isTextFile(mimeType: string): boolean {
	return (
		mimeType.startsWith('text/') ||
		mimeType === 'application/json' ||
		mimeType === 'application/xml' ||
		mimeType === 'application/csv' ||
		mimeType === 'application/x-yaml' ||
		mimeType === 'application/yaml'
	);
}

function isImageFile(mimeType: string): boolean {
	return mimeType.startsWith('image/');
}

function isPdfFile(mimeType: string): boolean {
	return mimeType === 'application/pdf';
}

// Fallback used only when the AiConfig cannot be resolved from the DI container
// (e.g. in unit tests). At runtime the configured value is authoritative.
const DEFAULT_MAX_PASSTHROUGH_BINARY_SIZE_BYTES = 50 * 1024 * 1024;

type BinaryPassthroughOptions = {
	passthroughBinaryImages?: boolean;
	passthroughBinaryPdfs?: boolean;
};

/**
 * Decides whether a binary entry should be passed through to the model, based on
 * its type and the enabled passthrough options. Checking this before any
 * processing avoids encoding/streaming binary the agent is configured to ignore.
 */
function shouldPassthroughBinary(data: IBinaryData, options: BinaryPassthroughOptions): boolean {
	if (isImageFile(data.mimeType)) return options.passthroughBinaryImages === true;
	if (isPdfFile(data.mimeType)) return options.passthroughBinaryPdfs === true;
	// Text-like files are attached whenever a binary message is built.
	if (isTextFile(data.mimeType)) return true;
	return false;
}

// How a file (PDF) attachment must be encoded for the connected model.
// - 'standard': LangChain standard data content block (Gemini, Anthropic, OpenAI Completions)
// - 'openai-responses': OpenAI Responses API native part, which rejects the standard block
type BinaryContentFormat = 'standard' | 'openai-responses';

// Structural view of the ChatOpenAI internals we probe. `_useResponsesApi` is
// protected and `useResponsesApi` is public; neither is part of BaseChatModel, so
// we read them defensively and treat their absence as "not OpenAI Responses".
type ResponsesApiModel = {
	_useResponsesApi?: (options?: unknown) => boolean;
	useResponsesApi?: boolean;
};

/**
 * OpenAI's Responses API rejects the standard `file` content block (it expects an
 * `input_file` part), so when the connected model talks to that API we must emit a
 * provider-native block instead. Gemini, Anthropic, and OpenAI's Completions API all
 * consume the standard block.
 *
 * Detection relies on ChatOpenAI's `_useResponsesApi()` because LangChain exposes no
 * public API for it; `_useResponsesApi()` (unlike the `useResponsesApi` flag alone)
 * also covers models that auto-select the Responses API (e.g. gpt-5/o-series). Note it
 * is evaluated without invoke-time call options, so Responses usage triggered solely by
 * call-time tools/kwargs is not detected here. Guarded so an unexpected shape degrades
 * to the standard block rather than throwing.
 */
function resolveBinaryContentFormat(model?: BaseChatModel): BinaryContentFormat {
	if (!model) return 'standard';
	const candidate = model as unknown as ResponsesApiModel;
	try {
		const usesResponsesApi =
			typeof candidate._useResponsesApi === 'function'
				? candidate._useResponsesApi(undefined)
				: candidate.useResponsesApi === true;
		return usesResponsesApi ? 'openai-responses' : 'standard';
	} catch {
		return 'standard';
	}
}

/**
 * Processes a binary data to be used in agent passthrough.
 * @param ctx - The execution context
 * @param data - The binary data
 * @param type - The type of the binary data ('image_url' or 'file')
 * @returns The binary data formatted for agent passthrough
 */
async function processBinaryForAgentPassthrough(
	ctx: IExecuteFunctions | ISupplyDataFunctions,
	data: IBinaryData,
	type: 'image_url' | 'file',
	contentFormat: BinaryContentFormat = 'standard',
) {
	// Resolve the binary contents to a raw base64 string. In filesystem mode the
	// binary is stored by id and must be streamed before it can be encoded.
	let base64Data: string;
	if (data.id) {
		const binaryBuffer = await ctx.helpers.binaryToBuffer(
			await ctx.helpers.getBinaryStream(data.id),
		);
		base64Data = Buffer.from(binaryBuffer).toString(BINARY_ENCODING);
	} else {
		base64Data = data.data.includes('base64,') ? data.data.split('base64,')[1] : data.data;
	}

	// Guard against oversized attachments. Providers that accept inline (base64)
	// documents cap the request payload, so we reject early with a clear message
	// instead of surfacing an opaque provider-side error. The limit is
	// configurable via N8N_AI_AGENT_MAX_PASSTHROUGH_BINARY_SIZE_BYTES.
	const maxSizeInBytes =
		Container.get(AiConfig)?.maxAgentPassthroughBinarySizeBytes ??
		DEFAULT_MAX_PASSTHROUGH_BINARY_SIZE_BYTES;
	// Decode the base64 length exactly (Buffer.byteLength accounts for padding).
	const sizeInBytes = Buffer.byteLength(base64Data, 'base64');
	if (sizeInBytes > maxSizeInBytes) {
		const fileName = data.fileName ?? 'binary file';
		const sizeInMb = (sizeInBytes / (1024 * 1024)).toFixed(1);
		const limitInMb = (maxSizeInBytes / (1024 * 1024)).toFixed(1);
		throw new NodeOperationError(
			ctx.getNode(),
			`The file "${fileName}" is ${sizeInMb} MB, which exceeds the ${limitInMb} MB limit for passing binary data to the model`,
			{
				description:
					'Reduce the file size, or disable the binary passthrough option for this input.',
			},
		);
	}

	// PDFs (and other documents) are passed as a file content block. OpenAI's
	// Responses API needs its native `input_file` part; every other supported
	// provider consumes the LangChain standard data content block.
	if (type === 'file') {
		if (contentFormat === 'openai-responses') {
			return {
				type: 'input_file',
				file_data: `data:${data.mimeType};base64,${base64Data}`,
				filename: data.fileName ?? 'attachment.pdf',
			};
		}
		return {
			type: 'file',
			source_type: 'base64',
			mime_type: data.mimeType,
			data: base64Data,
			// OpenAI's Completions API requires a filename for file blocks (it warns and
			// uses a placeholder otherwise); other providers ignore this metadata.
			metadata: { filename: data.fileName ?? 'attachment.pdf' },
		};
	}

	return {
		type: 'image_url',
		image_url: {
			url: `data:${data.mimeType};base64,${base64Data}`,
		},
	};
}

/**
 * Extracts binary messages (images, PDFs, and text files) from the given binary map.
 * When operating in filesystem mode, the binary stream is first converted to a buffer.
 *
 * Images are converted to base64 data URLs.
 * PDFs are converted to base64 data URLs (for models that natively support PDF input).
 * Text files are read as UTF-8 text and included in the message content.
 *
 * @param ctx - The execution context
 * @param itemIndex - The current item index
 * @param options - The enabled binary passthrough options
 * @param contentFormat - How file attachments must be encoded for the connected model
 * @returns A HumanMessage containing the binary messages (images and text files).
 */
export async function extractBinaryMessages(
	ctx: IExecuteFunctions | ISupplyDataFunctions,
	itemIndex: number,
	options: BinaryPassthroughOptions,
	contentFormat: BinaryContentFormat = 'standard',
): Promise<HumanMessage> {
	const binaryData = ctx.getInputData()?.[itemIndex]?.binary ?? {};
	const binaryMessages = await Promise.all(
		Object.values(binaryData)
			// only process the binary we are actually going to pass through
			.filter((data) => shouldPassthroughBinary(data, options))
			.map(async (data) => {
				// Handle images and PDFs
				if (isImageFile(data.mimeType)) {
					return await processBinaryForAgentPassthrough(ctx, data, 'image_url', contentFormat);
				} else if (isPdfFile(data.mimeType)) {
					return await processBinaryForAgentPassthrough(ctx, data, 'file', contentFormat);
				} else {
					// Handle text files
					let textContent: string;
					if (data.id) {
						const binaryBuffer = await ctx.helpers.binaryToBuffer(
							await ctx.helpers.getBinaryStream(data.id),
						);
						textContent = binaryBuffer.toString('utf-8');
					} else {
						// Data might be base64 encoded with or without data URL prefix
						if (data.data.includes('base64,')) {
							const base64Data = data.data.split('base64,')[1];
							textContent = Buffer.from(base64Data, 'base64').toString('utf-8');
						} else {
							// Default: binary data is base64-encoded without prefix
							textContent = Buffer.from(data.data, 'base64').toString('utf-8');
						}
					}

					return {
						type: 'text',
						text: `File: ${data.fileName ?? 'attachment'}\nContent:\n${textContent}`,
					};
				}
			}),
	);
	return new HumanMessage({
		content: [...binaryMessages],
	});
}

/* -----------------------------------------------------------
   Agent Output Format Helpers
----------------------------------------------------------- */
/**
 * Fixes empty content messages in agent steps.
 *
 * This function is necessary when using RunnableSequence.from in LangChain.
 * If a tool doesn't have any arguments, LangChain returns input: '' (empty string).
 * This can throw an error for some providers (like Anthropic) which expect the input to always be an object.
 * This function replaces empty string inputs with empty objects to prevent such errors.
 *
 * @param steps - The agent steps to fix
 * @returns The fixed agent steps
 */
export function fixEmptyContentMessage(
	steps: AgentFinish | ToolsAgentAction[],
): AgentFinish | ToolsAgentAction[] {
	if (!Array.isArray(steps)) return steps;

	steps.forEach((step) => {
		if ('messageLog' in step && step.messageLog !== undefined) {
			if (Array.isArray(step.messageLog)) {
				step.messageLog.forEach((message: BaseMessage) => {
					if ('content' in message && Array.isArray(message.content)) {
						(message.content as Array<{ input?: string | object }>).forEach((content) => {
							if (content.input === '') {
								content.input = {};
							}
						});
					}
				});
			}
		}
	});

	return steps;
}

/**
 * Ensures consistent handling of outputs regardless of the model used,
 * providing a unified output format for further processing.
 *
 * This method is necessary to handle different output formats from various language models.
 * Specifically, it checks if the agent step is the final step (contains returnValues) and determines
 * if the output is a simple string (e.g., from OpenAI models) or an array of outputs (e.g., from Anthropic models).
 *
 * Examples:
 * 1. Anthropic model output:
 * ```json
 *    {
 *      "output": [
 *        {
 *          "index": 0,
 *          "type": "text",
 *          "text": "The result of the calculation is approximately 1001.8166..."
 *        }
 *      ]
 *    }
 *```
 * 2. OpenAI model output:
 * ```json
 *    {
 *      "output": "The result of the calculation is approximately 1001.82..."
 *    }
 * ```
 *
 * @param steps - The agent finish or agent action steps.
 * @returns The modified agent finish steps or the original steps.
 */
export function handleAgentFinishOutput(
	steps: AgentFinish | AgentAction[],
): AgentFinish | AgentAction[] {
	type AgentMultiOutputFinish = AgentFinish & {
		returnValues: { output: Array<{ text: string; type: string; index: number }> };
	};
	const agentFinishSteps = steps as AgentMultiOutputFinish | AgentFinish;

	if (agentFinishSteps.returnValues) {
		const isMultiOutput = Array.isArray(agentFinishSteps.returnValues?.output);
		if (isMultiOutput) {
			const multiOutputSteps = agentFinishSteps.returnValues.output as Array<{
				index: number;
				type: string;
				text?: string;
				thinking?: string;
			}>;

			// Filter out thinking blocks and join text blocks
			const textOutputs = multiOutputSteps
				.filter((output) => output.type === 'text' && output.text)
				.map((output) => output.text)
				.join('\n')
				.trim();

			if (textOutputs) {
				agentFinishSteps.returnValues.output = textOutputs;
			} else {
				const thinkingOutputs = multiOutputSteps
					.filter((output) => output.type === 'thinking' && output.thinking)
					.map((output) => output.thinking)
					.join('\n')
					.trim();

				if (thinkingOutputs) {
					agentFinishSteps.returnValues.output = thinkingOutputs;
				} else {
					// no output was found
					agentFinishSteps.returnValues.output = '';
				}
			}
			return agentFinishSteps;
		}
	}

	return agentFinishSteps;
}

/**
 * Wraps the parsed output so that it can be stored in memory.
 * If memory is connected, the output is stringified.
 *
 * @param output - The parsed output object
 * @param memory - The connected memory (if any)
 * @returns The formatted output object
 */
export function handleParsedStepOutput(
	output: Record<string, unknown>,
	memory?: BaseChatMemory,
): { returnValues: Record<string, unknown>; log: string } {
	return {
		returnValues: memory ? { output: JSON.stringify(output) } : output,
		log: 'Final response formatted',
	};
}

/**
 * Parses agent steps using the provided output parser.
 * If the agent used the 'format_final_json_response' tool, the output is parsed accordingly.
 *
 * @param steps - The agent finish or action steps
 * @param outputParser - The output parser (if defined)
 * @param memory - The connected memory (if any)
 * @returns The parsed steps with the final output
 */
export const getAgentStepsParser =
	(outputParser?: N8nOutputParser, memory?: BaseChatMemory) =>
	async (steps: AgentFinish | AgentAction[]): Promise<AgentFinish | AgentAction[]> => {
		// Check if the steps contain the 'format_final_json_response' tool invocation.
		if (Array.isArray(steps)) {
			const responseParserTool = steps.find((step) => step.tool === 'format_final_json_response');
			if (responseParserTool && outputParser) {
				const toolInput = responseParserTool.toolInput;
				// Ensure the tool input is a string
				const parserInput = toolInput instanceof Object ? JSON.stringify(toolInput) : toolInput;
				const returnValues = (await outputParser.parse(parserInput)) as Record<string, unknown>;
				return handleParsedStepOutput(returnValues, memory);
			}
		}

		// Otherwise, if the steps contain a returnValues field, try to parse them manually.
		if (outputParser && typeof steps === 'object' && (steps as AgentFinish).returnValues) {
			const finalResponse = (steps as AgentFinish).returnValues;
			let parserInput: string;

			if (finalResponse instanceof Object) {
				if ('output' in finalResponse) {
					try {
						const parsedOutput = jsonParse<Record<string, unknown>>(finalResponse.output);
						// Check if the parsed output already has the expected structure
						// If it already has { output: ... }, use it as-is to avoid double wrapping
						// Otherwise, wrap it in { output: ... } as expected by the parser
						if (
							parsedOutput !== null &&
							typeof parsedOutput === 'object' &&
							'output' in parsedOutput &&
							Object.keys(parsedOutput).length === 1
						) {
							// Already has the expected structure, use as-is
							parserInput = JSON.stringify(parsedOutput);
						} else {
							// Needs wrapping for the parser
							parserInput = JSON.stringify({ output: parsedOutput });
						}
					} catch (error) {
						// Fallback to the raw output if parsing fails.
						parserInput = finalResponse.output;
					}
				} else {
					// If the output is not an object, we will stringify it as it is
					parserInput = JSON.stringify(finalResponse);
				}
			} else {
				parserInput = finalResponse;
			}

			const returnValues = (await outputParser.parse(parserInput)) as Record<string, unknown>;
			return handleParsedStepOutput(returnValues, memory);
		}

		return handleAgentFinishOutput(steps);
	};

/* -----------------------------------------------------------
   Agent Setup Helpers
----------------------------------------------------------- */
/**
 * Retrieves the language model from the input connection.
 * Throws an error if the model is not a valid chat instance or does not support tools.
 *
 * @param ctx - The execution context
 * @returns The validated chat model
 */
export async function getChatModel(
	ctx: IExecuteFunctions | ISupplyDataFunctions | IWebhookFunctions,
	index: number = 0,
): Promise<BaseChatModel | undefined> {
	const connectedModels = await ctx.getInputConnectionData(NodeConnectionTypes.AiLanguageModel, 0);

	let model;

	if (Array.isArray(connectedModels) && index !== undefined) {
		if (connectedModels.length <= index) {
			return undefined;
		}
		// We get the models in reversed order from the workflow so we need to reverse them to match the right index
		const reversedModels = [...connectedModels].reverse();
		model = reversedModels[index] as BaseChatModel;
	} else {
		model = connectedModels as BaseChatModel;
	}

	if (!isChatInstance(model) || !model.bindTools) {
		throw new NodeOperationError(
			ctx.getNode(),
			'Tools Agent requires Chat Model which supports Tools calling',
		);
	}
	return model;
}

/**
 * Retrieves the memory instance from the input connection if it is connected
 *
 * @param ctx - The execution context
 * @returns The connected memory (if any)
 */
export async function getOptionalMemory(
	ctx: IExecuteFunctions | ISupplyDataFunctions | IWebhookFunctions,
): Promise<BaseChatMemory | undefined> {
	return (await ctx.getInputConnectionData(NodeConnectionTypes.AiMemory, 0)) as
		| BaseChatMemory
		| undefined;
}

/**
 * Retrieves the connected tools and (if an output parser is defined)
 * appends a structured output parser tool.
 *
 * @param ctx - The execution context
 * @param outputParser - The optional output parser
 * @returns The array of connected tools
 */
export async function getTools(
	ctx: IExecuteFunctions | ISupplyDataFunctions | IWebhookFunctions,
	outputParser?: N8nOutputParser,
): Promise<Array<DynamicStructuredTool | Tool>> {
	const tools = (await getConnectedTools(ctx, true, false)) as Array<DynamicStructuredTool | Tool>;

	// If an output parser is available, create a dynamic tool to validate the final output.
	if (outputParser) {
		const schema = getOutputParserSchema(outputParser);
		const structuredOutputParserTool = new DynamicStructuredTool({
			schema,
			name: 'format_final_json_response',
			description:
				'Use this tool to format your final response to the user in a structured JSON format. This tool validates your output against a schema to ensure it meets the required format. ONLY use this tool when you have completed all necessary reasoning and are ready to provide your final answer. Do not use this tool for intermediate steps or for asking questions. The output from this tool will be directly returned to the user.',
			// We do not use a function here because we intercept the output with the parser.
			func: async () => '',
		});
		tools.push(structuredOutputParserTool);
	}
	return tools;
}

/**
 * Prepares the prompt messages for the agent.
 *
 * @param ctx - The execution context
 * @param itemIndex - The current item index
 * @param options - Options containing systemMessage and other parameters
 * @returns The array of prompt messages
 */
export async function prepareMessages(
	ctx: IExecuteFunctions | ISupplyDataFunctions,
	itemIndex: number,
	options: {
		systemMessage?: string;
		passthroughBinaryImages?: boolean;
		passthroughBinaryPdfs?: boolean;
		outputParser?: N8nOutputParser;
		// The connected chat model, used to pick the right file content-block format.
		model?: BaseChatModel;
	},
): Promise<BaseMessagePromptTemplateLike[]> {
	const useSystemMessage = options.systemMessage ?? ctx.getNode().typeVersion < 1.9;

	const messages: BaseMessagePromptTemplateLike[] = [];

	if (useSystemMessage) {
		messages.push([
			'system',
			`{system_message}${options.outputParser ? '\n\n{formatting_instructions}' : ''}`,
		]);
	} else if (options.outputParser) {
		messages.push(['system', '{formatting_instructions}']);
	}

	messages.push(['placeholder', '{chat_history}'], ['human', '{input}']);

	// If there is binary data and the node option permits it, add a binary message.
	// extractBinaryMessages only processes the binary types that are enabled.
	const hasBinaryData = ctx.getInputData()?.[itemIndex]?.binary !== undefined;
	if (hasBinaryData && (options.passthroughBinaryImages || options.passthroughBinaryPdfs)) {
		// Known limitation: the format is resolved from the primary model only, and the
		// prompt (incl. this block) is shared with the fallback model. A fallback from a
		// different provider family (e.g. OpenAI Responses -> Gemini) will receive a
		// mismatched file block and fail; cross-provider PDF fallback is unsupported.
		const contentFormat = resolveBinaryContentFormat(options.model);
		const binaryMessage = await extractBinaryMessages(ctx, itemIndex, options, contentFormat);

		if (binaryMessage.content.length !== 0) {
			messages.push(binaryMessage);
		} else {
			ctx.logger.debug('Not attaching binary message, since its content was empty');
		}
	}

	// We add the agent scratchpad last, so that the agent will not run in loops
	// by adding binary messages between each interaction
	messages.push(['placeholder', '{agent_scratchpad}']);
	return messages;
}

/**
 * Creates the chat prompt from messages.
 *
 * @param messages - The messages array
 * @returns The ChatPromptTemplate instance
 */
export function preparePrompt(messages: BaseMessagePromptTemplateLike[]): ChatPromptTemplate {
	return ChatPromptTemplate.fromMessages(messages);
}

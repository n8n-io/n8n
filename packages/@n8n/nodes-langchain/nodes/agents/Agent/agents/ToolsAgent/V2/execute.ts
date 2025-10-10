import type { StreamEvent } from '@langchain/core/dist/tracers/event_stream';
import type { IterableReadableStream } from '@langchain/core/dist/utils/stream';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type {
	AIMessageChunk,
	MessageContentComplex,
	MessageContentText,
} from '@langchain/core/messages';
import type { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import {
	AgentExecutor,
	type AgentRunnableSequence,
	createToolCallingAgent,
} from 'langchain/agents';
import type { BaseChatMemory } from 'langchain/memory';
import type { DynamicStructuredTool, Tool } from 'langchain/tools';
import omit from 'lodash/omit';
import { jsonParse, NodeOperationError, sleep } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData, ISupplyDataFunctions } from 'n8n-workflow';
import assert from 'node:assert';

import { getPromptInputByType } from '@utils/helpers';
import {
	getOptionalOutputParser,
	type N8nOutputParser,
} from '@utils/output_parsers/N8nOutputParser';

import {
	fixEmptyContentMessage,
	getAgentStepsParser,
	getChatModel,
	getOptionalMemory,
	getTools,
	prepareMessages,
	preparePrompt,
} from '../common';
import { SYSTEM_MESSAGE } from '../prompt';

/**
 * Creates an agent executor with the given configuration
 */
function createAgentExecutor(
	model: BaseChatModel,
	tools: Array<DynamicStructuredTool | Tool>,
	prompt: ChatPromptTemplate,
	options: { maxIterations?: number; returnIntermediateSteps?: boolean },
	outputParser?: N8nOutputParser,
	memory?: BaseChatMemory,
	fallbackModel?: BaseChatModel | null,
) {
	const agent = createToolCallingAgent({
		llm: model,
		tools,
		prompt,
		streamRunnable: false,
	});

	let fallbackAgent: AgentRunnableSequence | undefined;
	if (fallbackModel) {
		fallbackAgent = createToolCallingAgent({
			llm: fallbackModel,
			tools,
			prompt,
			streamRunnable: false,
		});
	}
	const runnableAgent = RunnableSequence.from([
		fallbackAgent ? agent.withFallbacks([fallbackAgent]) : agent,
		getAgentStepsParser(outputParser, memory),
		fixEmptyContentMessage,
	]) as AgentRunnableSequence;

	runnableAgent.singleAction = false;
	runnableAgent.streamRunnable = false;

	return AgentExecutor.fromAgentAndTools({
		agent: runnableAgent,
		memory,
		tools,
		returnIntermediateSteps: options.returnIntermediateSteps === true,
		maxIterations: options.maxIterations ?? 10,
	});
}

type ContentBlock = {
	type: string;
	text?: string;
	thinking?: Array<{ type: 'text'; text: string }>;
};

type ComplexBlock = MessageContentComplex; // as in your codebase
type Block = ContentBlock | ComplexBlock;

// --- type guards ---
function isBlock(x: unknown): x is Block {
	return typeof x === 'object' && x !== null && 'type' in x;
}

/**
 * Collapse provider content (string or array-of-blocks) to plain text for UI/output.
 * - Remove ALL chain-of-thought (thinking) from user-visible output.
 * - Keep only plain 'text' blocks when content is an array.
 * - For strings, remove <think>...</think> sections entirely (not just tags).
 * - Preserves whitespace by default (collapse only if explicitly asked).
 */
export function flattenContentToText(
	content: string | Block[] | undefined | null,
	opts?: { collapseWhitespace?: boolean },
): string {
	if (content == null) return '';

	// 1) STRING INPUT
	if (typeof content === 'string') {
		// Remove entire <think>...</think> segments (non-greedy), case-insensitive.
		// This avoids leaking chain-of-thought and mirrors reasoning model guidance.
		// Examples: "text <think>hidden</think> more" -> "text  more"
		let out = content.replace(/<think>[\s\S]*?<\/think>/gi, '');

		//  Preserve whitespace by default; only collapse when requested
		if (opts?.collapseWhitespace === true) {
			out = out.replace(/\s+/g, ' ').trim();
		}
		return out;
	}

	// check to avoid iterating plain objects
	if (!Array.isArray(content)) return '';

	// 2) ARRAY INPUT
	let out = '';
	for (const b of content) {
		if (!isBlock(b)) continue;

		switch (b.type) {
			case 'text':
				if (typeof b.text === 'string') out += b.text;
				break;
			case 'thinking':
				// ignore chain-of-thought
				break;
			case 'image_url':
			case 'reference':
			case 'document_url':
			case 'input_audio':
			case 'file':
			default:
				// ignore
				break;
		}
	}

	if (opts?.collapseWhitespace === true) {
		out = out.replace(/\s+/g, ' ').trim();
	}

	return out;
}

async function processEventStream(
	ctx: IExecuteFunctions,
	eventStream: IterableReadableStream<StreamEvent>,
	itemIndex: number,
	returnIntermediateSteps: boolean = false,
): Promise<{ output: string; intermediateSteps?: any[] }> {
	const agentResult: { output: string; intermediateSteps?: any[] } = {
		output: '',
	};

	if (returnIntermediateSteps) {
		agentResult.intermediateSteps = [];
	}

	ctx.sendChunk('begin', itemIndex);
	for await (const event of eventStream) {
		// Stream chat model tokens as they come in
		switch (event.event) {
			case 'on_chat_model_stream': {
				const chunk = event.data?.chunk as AIMessageChunk;
				if (chunk?.content !== undefined) {
					const cont = chunk.content;
					// Only process if content is a string or array of blocks
					if (typeof cont === 'string' || Array.isArray(cont)) {
						// Preserve whitespace boundaries during streaming so tests & UI match.
						const chunkText = flattenContentToText(cont, { collapseWhitespace: false });
						// Always emit item—even empty—so downstream can rely on chunk ordering.
						ctx.sendChunk('item', itemIndex, chunkText);
						agentResult.output += chunkText;
					} else {
						// unexpected content format — ignore or log
					}
				}
				break;
			}
			case 'on_chat_model_end':
				// Capture full LLM response with tool calls for intermediate steps
				if (returnIntermediateSteps && event.data) {
					const chatModelData = event.data as any;
					const output = chatModelData.output;

					// Check if this LLM response contains tool calls
					if (output?.tool_calls && output.tool_calls.length > 0) {
						for (const toolCall of output.tool_calls) {
							agentResult.intermediateSteps!.push({
								action: {
									tool: toolCall.name,
									toolInput: toolCall.args,
									log:
										output.content ||
										`Calling ${toolCall.name} with input: ${JSON.stringify(toolCall.args)}`,
									messageLog: [output], // Include the full LLM response
									toolCallId: toolCall.id,
									type: toolCall.type,
								},
							});
						}
					}
				}
				break;
			case 'on_tool_end':
				// Capture tool execution results and match with action
				if (returnIntermediateSteps && event.data && agentResult.intermediateSteps!.length > 0) {
					const toolData = event.data as any;
					// Find the matching intermediate step for this tool call
					const matchingStep = agentResult.intermediateSteps!.find(
						(step) => !step.observation && step.action.tool === event.name,
					);
					if (matchingStep) {
						matchingStep.observation = toolData.output;
					}
				}
				break;
			default:
				break;
		}
	}
	ctx.sendChunk('end', itemIndex);

	return agentResult;
}

/* -----------------------------------------------------------
   Main Executor Function
----------------------------------------------------------- */
/**
 * The main executor method for the Tools Agent.
 *
 * This function retrieves necessary components (model, memory, tools), prepares the prompt,
 * creates the agent, and processes each input item. The error handling for each item is also
 * managed here based on the node's continueOnFail setting.
 *
 * @param this Execute context. SupplyDataContext is passed when agent is as a tool
 *
 * @returns The array of execution data for all processed items
 */
export async function toolsAgentExecute(
	this: IExecuteFunctions | ISupplyDataFunctions,
): Promise<INodeExecutionData[][]> {
	this.logger.debug('Executing Tools Agent V2');

	const returnData: INodeExecutionData[] = [];
	const items = this.getInputData();
	const batchSize = this.getNodeParameter('options.batching.batchSize', 0, 1) as number;
	const delayBetweenBatches = this.getNodeParameter(
		'options.batching.delayBetweenBatches',
		0,
		0,
	) as number;
	const needsFallback = this.getNodeParameter('needsFallback', 0, false) as boolean;
	const memory = await getOptionalMemory(this);
	const model = await getChatModel(this, 0);
	assert(model, 'Please connect a model to the Chat Model input');
	const fallbackModel = needsFallback ? await getChatModel(this, 1) : null;

	if (needsFallback && !fallbackModel) {
		throw new NodeOperationError(
			this.getNode(),
			'Please connect a model to the Fallback Model input or disable the fallback option',
		);
	}

	// Check if streaming is enabled
	const enableStreaming = this.getNodeParameter('options.enableStreaming', 0, true) as boolean;

	for (let i = 0; i < items.length; i += batchSize) {
		const batch = items.slice(i, i + batchSize);
		const batchPromises = batch.map(async (_item, batchItemIndex) => {
			const itemIndex = i + batchItemIndex;

			const input = getPromptInputByType({
				ctx: this,
				i: itemIndex,
				inputKey: 'text',
				promptTypeKey: 'promptType',
			});
			if (input === undefined) {
				throw new NodeOperationError(this.getNode(), 'The "text" parameter is empty.');
			}
			const outputParser = await getOptionalOutputParser(this, itemIndex);
			const tools = await getTools(this, outputParser);
			const options = this.getNodeParameter('options', itemIndex, {}) as {
				systemMessage?: string;
				maxIterations?: number;
				returnIntermediateSteps?: boolean;
				passthroughBinaryImages?: boolean;
			};

			// Prepare the prompt messages and prompt template.
			const messages = await prepareMessages(this, itemIndex, {
				systemMessage: options.systemMessage,
				passthroughBinaryImages: options.passthroughBinaryImages ?? true,
				outputParser,
			});
			const prompt: ChatPromptTemplate = preparePrompt(messages);

			// Create executors for primary and fallback models
			const executor = createAgentExecutor(
				model,
				tools,
				prompt,
				options,
				outputParser,
				memory,
				fallbackModel,
			);
			// Invoke with fallback logic
			const invokeParams = {
				input,
				system_message: options.systemMessage ?? SYSTEM_MESSAGE,
				formatting_instructions:
					'IMPORTANT: For your response to user, you MUST use the `format_final_json_response` tool with your complete answer formatted according to the required schema. Do not attempt to format the JSON manually - always use this tool. Your response will be rejected if it is not properly formatted through this tool. Only use this tool once you are ready to provide your final answer.',
			};
			const executeOptions = { signal: this.getExecutionCancelSignal() };

			// Check if streaming is actually available
			const isStreamingAvailable = 'isStreaming' in this ? this.isStreaming?.() : undefined;

			if (
				'isStreaming' in this &&
				enableStreaming &&
				isStreamingAvailable &&
				this.getNode().typeVersion >= 2.1
			) {
				// Get chat history respecting the context window length configured in memory
				let chatHistory;
				if (memory) {
					// Load memory variables to respect context window length
					const memoryVariables = await memory.loadMemoryVariables({});
					chatHistory = memoryVariables['chat_history'];
				}
				const eventStream = executor.streamEvents(
					{
						...invokeParams,
						chat_history: chatHistory ?? undefined,
					},
					{
						version: 'v2',
						...executeOptions,
					},
				);

				return await processEventStream(
					this,
					eventStream,
					itemIndex,
					options.returnIntermediateSteps,
				);
			} else {
				// Handle regular execution

				let response: any;
				response = await executor.invoke(invokeParams, executeOptions);

				// If provider put structured blocks into response.output (array or tagged string), flatten them.
				// If provider put structured blocks into response.output (array or tagged string), flatten them.
				if (response && typeof response.output !== 'undefined') {
					try {
						const out = response.output;

						if (Array.isArray(out)) {
							response.output = flattenContentToText(out);
						} else if (out && typeof out === 'object') {
							// only flatten if it has a usable `content` field
							const hasUsableContent =
								Object.prototype.hasOwnProperty.call(out as Record<string, unknown>, 'content') &&
								(typeof (out as { content?: unknown }).content === 'string' ||
									Array.isArray((out as { content?: unknown }).content));

							if (hasUsableContent) {
								response.output = flattenContentToText(
									(out as { content: string | Block[] }).content,
								);
							}
							// else: keep object as-is (e.g. { text: "success" })
						} else if (typeof out === 'string') {
							response.output = flattenContentToText(out);
						}
					} catch {
						// leave output as-is rather than throwing
					}
				}

				return response;
			}
		});
		const batchResults = await Promise.allSettled(batchPromises);
		// This is only used to check if the output parser is connected
		// so we can parse the output if needed. Actual output parsing is done in the loop above
		const outputParser = await getOptionalOutputParser(this, 0);
		batchResults.forEach((result, index) => {
			const itemIndex = i + index;
			if (result.status === 'rejected') {
				const error = result.reason as Error;
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error.message },
						pairedItem: { item: itemIndex },
					});
					return;
				} else {
					throw new NodeOperationError(this.getNode(), error);
				}
			}
			const response = result.value;
			// If memory and outputParser are connected, parse the output.
			if (memory && outputParser) {
				const parsedOutput = jsonParse<{ output: Record<string, unknown> }>(
					response.output as string,
				);
				response.output = parsedOutput?.output ?? parsedOutput;
			}

			// Omit internal keys before returning the result.
			const itemResult = {
				json: omit(
					response,
					'system_message',
					'formatting_instructions',
					'input',
					'chat_history',
					'agent_scratchpad',
				),
				pairedItem: { item: itemIndex },
			};

			returnData.push(itemResult);
		});

		if (i + batchSize < items.length && delayBetweenBatches > 0) {
			await sleep(delayBetweenBatches);
		}
	}

	return [returnData];
}

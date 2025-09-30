import type { StreamEvent } from '@langchain/core/dist/tracers/event_stream';
import type { IterableReadableStream } from '@langchain/core/dist/utils/stream';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AIMessageChunk, MessageContentText } from '@langchain/core/messages';
import { AIMessage } from '@langchain/core/messages';
import type { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { getPromptInputByType } from '@utils/helpers';
import {
	getOptionalOutputParser,
	type N8nOutputParser,
} from '@utils/output_parsers/N8nOutputParser';
import { type AgentRunnableSequence, createToolCallingAgent } from 'langchain/agents';
import type { BaseChatMemory } from 'langchain/memory';
import type { DynamicStructuredTool, Tool } from 'langchain/tools';
import omit from 'lodash/omit';
import {
	jsonParse,
	NodeConnectionTypes,
	nodeNameToToolName,
	NodeOperationError,
	sleep,
} from 'n8n-workflow';
import type {
	EngineRequest,
	GenericValue,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	ISupplyDataFunctions,
	EngineResponse,
} from 'n8n-workflow';
import assert from 'node:assert';

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
import type { ToolCall } from '@langchain/core/messages/tool';

type ToolCallRequest = {
	tool: string;
	toolInput: Record<string, unknown>;
	toolCallId: string;
	type?: string;
	log?: string;
	messageLog?: unknown[];
};

function createEngineRequests(
	ctx: IExecuteFunctions | ISupplyDataFunctions,
	toolCalls: ToolCallRequest[],
	itemIndex: number,
) {
	const connectedSubnodes = ctx.getParentNodes(ctx.getNode().name, {
		connectionType: NodeConnectionTypes.AiTool,
		depth: 1,
	});
	return toolCalls.map((toolCall) => ({
		nodeName:
			connectedSubnodes.find(
				(node: { name: string }) => nodeNameToToolName(node.name) === toolCall.tool,
			)?.name ?? toolCall.tool,
		input: toolCall.toolInput,
		type: NodeConnectionTypes.AiTool,
		id: toolCall.toolCallId,
		metadata: {
			itemIndex,
		},
	}));
}

/**
 * Creates an agent executor with the given configuration
 */
function createAgentSequence(
	model: BaseChatModel,
	tools: Array<DynamicStructuredTool | Tool>,
	prompt: ChatPromptTemplate,
	_options: { maxIterations?: number; returnIntermediateSteps?: boolean },
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

	runnableAgent.singleAction = true;
	runnableAgent.streamRunnable = false;

	return runnableAgent;
}

type IntermediateStep = {
	action: {
		tool: string;
		toolInput: Record<string, unknown>;
		log: string;
		messageLog: unknown[];
		toolCallId: string;
		type: string;
	};
	observation?: string;
};

type AgentResult = {
	output: string;
	intermediateSteps?: IntermediateStep[];
	toolCalls?: ToolCallRequest[];
};

async function processEventStream(
	ctx: IExecuteFunctions,
	eventStream: IterableReadableStream<StreamEvent>,
	itemIndex: number,
	returnIntermediateSteps: boolean = false,
	memory?: BaseChatMemory,
	input?: string,
): Promise<AgentResult> {
	const agentResult: AgentResult = {
		output: '',
	};

	if (returnIntermediateSteps) {
		agentResult.intermediateSteps = [];
	}

	const toolCalls: ToolCallRequest[] = [];

	ctx.sendChunk('begin', itemIndex);
	for await (const event of eventStream) {
		// Stream chat model tokens as they come in
		switch (event.event) {
			case 'on_chat_model_stream':
				const chunk = event.data?.chunk as AIMessageChunk;
				if (chunk?.content) {
					const chunkContent = chunk.content;
					let chunkText = '';
					if (Array.isArray(chunkContent)) {
						for (const message of chunkContent) {
							if (message?.type === 'text') {
								chunkText += (message as MessageContentText)?.text;
							}
						}
					} else if (typeof chunkContent === 'string') {
						chunkText = chunkContent;
					}
					ctx.sendChunk('item', itemIndex, chunkText);

					agentResult.output += chunkText;
				}
				break;
			case 'on_chat_model_end':
				// Capture full LLM response with tool calls for intermediate steps
				if (event.data) {
					const chatModelData = event.data as {
						output?: { tool_calls?: ToolCall[]; content?: string };
					};
					const output = chatModelData.output;

					// Check if this LLM response contains tool calls
					if (output?.tool_calls && output.tool_calls.length > 0) {
						// Collect tool calls for request building
						for (const toolCall of output.tool_calls) {
							toolCalls.push({
								tool: toolCall.name,
								toolInput: toolCall.args,
								toolCallId: toolCall.id || 'unknown',
								type: toolCall.type || 'tool_call',
								log:
									output.content ||
									`Calling ${toolCall.name} with input: ${JSON.stringify(toolCall.args)}`,
								messageLog: [output],
							});
						}

						// Also add to intermediate steps if needed
						if (returnIntermediateSteps) {
							for (const toolCall of output.tool_calls) {
								agentResult.intermediateSteps!.push({
									action: {
										tool: toolCall.name,
										toolInput: toolCall.args,
										log:
											output.content ||
											`Calling ${toolCall.name} with input: ${JSON.stringify(toolCall.args)}`,
										messageLog: [output], // Include the full LLM response
										toolCallId: toolCall.id || 'unknown',
										type: toolCall.type || 'tool_call',
									},
								});
							}
						}
					}
				}
				break;
			case 'on_tool_end':
				// Capture tool execution results and match with action
				if (returnIntermediateSteps && event.data && agentResult.intermediateSteps!.length > 0) {
					const toolData = event.data as { output?: string };
					// Find the matching intermediate step for this tool call
					const matchingStep = agentResult.intermediateSteps!.find(
						(step) => !step.observation && step.action.tool === event.name,
					);
					if (matchingStep) {
						matchingStep.observation = toolData.output || '';
					}
				}
				break;
			default:
				break;
		}
	}
	ctx.sendChunk('end', itemIndex);

	// Save conversation to memory if memory is connected
	if (memory && input && agentResult.output) {
		await memory.saveContext({ input }, { output: agentResult.output });
	}

	// Include collected tool calls in the result
	if (toolCalls.length > 0) {
		agentResult.toolCalls = toolCalls;
	}

	return agentResult;
}

export type RequestResponseMetadata = {
	itemIndex?: number;
	previousRequests: ToolCallData[];
};

type ToolCallData = {
	action: {
		tool: string;
		toolInput: Record<string, unknown>;
		log: string | number | true | object;
		toolCallId: IDataObject | GenericValue | GenericValue[] | IDataObject[];
		type: string | number | true | object;
	};
	observation: string;
};

function buildSteps(
	response: EngineResponse<RequestResponseMetadata> | undefined,
	itemIndex: number,
): ToolCallData[] {
	const steps: ToolCallData[] = [];

	if (response) {
		const responses = response?.actionResponses ?? [];
		for (const tool of responses) {
			if (tool.action?.metadata?.itemIndex !== itemIndex) continue;
			const toolInput: IDataObject = {
				...tool.action.input,
				id: tool.action.id,
			};
			if (!toolInput || !tool.data) {
				continue;
			}

			const step = steps.find((step) => step.action.toolCallId === toolInput.id);
			if (step) {
				continue;
			}
			// Create a synthetic AI message for the messageLog
			// This represents the AI's decision to call the tool
			const syntheticAIMessage = new AIMessage({
				content: `Calling ${tool.action.nodeName} with input: ${JSON.stringify(toolInput)}`,
				tool_calls: [
					{
						id: (toolInput?.id as string) ?? 'reconstructed_call',
						name: nodeNameToToolName(tool.action.nodeName),
						args: toolInput,
						type: 'tool_call',
					},
				],
			});

			const toolResult = {
				action: {
					tool: nodeNameToToolName(tool.action.nodeName),
					toolInput: (toolInput.input as IDataObject) || {},
					log: toolInput.log || syntheticAIMessage.content,
					messageLog: [syntheticAIMessage],
					toolCallId: toolInput?.id,
					type: toolInput.type || 'tool_call',
				},
				observation: JSON.stringify(tool.data),
			};

			steps.push(toolResult);
		}
	}
	return steps;
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
	response?: EngineResponse<RequestResponseMetadata>,
): Promise<INodeExecutionData[][] | EngineRequest<RequestResponseMetadata>> {
	this.logger.debug('Executing Tools Agent V3');

	const returnData: INodeExecutionData[] = [];
	let request: EngineRequest<RequestResponseMetadata> | undefined = undefined;

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

	for (let i = 0; i < items.length; i += batchSize) {
		const batch = items.slice(i, i + batchSize);
		const batchPromises = batch.map(async (_item, batchItemIndex) => {
			const itemIndex = i + batchItemIndex;

			if (response && response?.metadata?.itemIndex === itemIndex) {
				return null;
			}

			const steps = buildSteps(response, itemIndex);

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
			const options = this.getNodeParameter('options', itemIndex, { enableStreaming: true }) as {
				systemMessage?: string;
				maxIterations?: number;
				returnIntermediateSteps?: boolean;
				passthroughBinaryImages?: boolean;
				enableStreaming?: boolean;
			};

			// Prepare the prompt messages and prompt template.
			const messages = await prepareMessages(this, itemIndex, {
				systemMessage: options.systemMessage,
				passthroughBinaryImages: options.passthroughBinaryImages ?? true,
				outputParser,
			});
			const prompt: ChatPromptTemplate = preparePrompt(messages);

			// Create executors for primary and fallback models
			const executor = createAgentSequence(
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
				steps,
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
				options.enableStreaming &&
				isStreamingAvailable &&
				this.getNode().typeVersion >= 2.1
			) {
				let chatHistory = undefined;
				if (memory) {
					// Load memory variables to respect context window length
					const memoryVariables = await memory.loadMemoryVariables({});
					chatHistory = memoryVariables['chat_history'];
				}
				const eventStream = executor.streamEvents(
					{
						...invokeParams,
						chat_history: chatHistory,
					},
					{
						version: 'v2',
						...executeOptions,
					},
				);

				const result = await processEventStream(
					this,
					eventStream,
					itemIndex,
					options.returnIntermediateSteps,
					memory,
					input,
				);

				// If result contains tool calls, build the request object like the normal flow
				if (result.toolCalls && result.toolCalls.length > 0) {
					const actions = createEngineRequests(this, result.toolCalls, itemIndex);

					return {
						actions,
						metadata: { previousRequests: buildSteps(response, itemIndex) },
					};
				}

				return result;
			} else {
				// Handle regular execution
				let chatHistory = undefined;
				if (memory) {
					// Load memory variables to respect context window length
					const memoryVariables = await memory.loadMemoryVariables({});
					chatHistory = memoryVariables['chat_history'];
				}
				const response = await executor.invoke({
					...invokeParams,
					chat_history: chatHistory,
				});

				if ('returnValues' in response) {
					// Save conversation to memory including any tool call context
					if (memory && input && response.returnValues.output) {
						// If there were tool calls in this conversation, include them in the context
						let fullOutput = response.returnValues.output as string;

						if (steps.length > 0) {
							// Include tool call information in the conversation context
							const toolContext = steps
								.map(
									(step) =>
										`Tool: ${step.action.tool}, Input: ${JSON.stringify(step.action.toolInput)}, Result: ${step.observation}`,
								)
								.join('; ');
							fullOutput = `[Used tools: ${toolContext}] ${fullOutput}`;
						}

						await memory.saveContext({ input }, { output: fullOutput });
					}
					// Include intermediate steps if requested
					const result = { ...response.returnValues };
					if (options.returnIntermediateSteps && steps.length > 0) {
						result.intermediateSteps = steps;
					}
					return result;
				}

				// If response contains tool calls, we need to return this in the right format
				const actions = createEngineRequests(this, response, itemIndex);

				return {
					actions,
					metadata: { previousRequests: buildSteps(response, itemIndex) },
				};
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
					} as INodeExecutionData);
					return;
				} else {
					throw new NodeOperationError(this.getNode(), error);
				}
			}
			const response = result.value;

			if ('actions' in response) {
				if (!request) {
					request = {
						actions: response.actions,
						metadata: response.metadata,
					};
				} else {
					request.actions.push(...response.actions);
				}
				return;
			}

			// If memory and outputParser are connected, parse the output.
			if (memory && outputParser) {
				const parsedOutput = jsonParse<{ output: Record<string, unknown> }>(
					response.output as string,
				);
				response.output = parsedOutput?.output ?? parsedOutput;
			}

			// Omit internal keys before returning the result.
			const itemResult: INodeExecutionData = {
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
	// Check if we have any Request objects (tool calls)
	if (request) {
		return request;
	}

	// Otherwise return execution data
	return [returnData];
}

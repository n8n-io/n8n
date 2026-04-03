import type { StreamEvent } from '@langchain/core/dist/tracers/event_stream';
import type { IterableReadableStream } from '@langchain/core/dist/utils/stream';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AIMessageChunk, MessageContentText } from '@langchain/core/messages';
import type { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import {
	AgentExecutor,
	type AgentRunnableSequence,
	createToolCallingAgent,
} from '@langchain/classic/agents';
import type { BaseChatMemory } from '@langchain/classic/memory';
import type { DynamicStructuredTool, Tool } from '@langchain/classic/tools';
import omit from 'lodash/omit';
import { jsonParse, NodeOperationError, sleep } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData, ISupplyDataFunctions } from 'n8n-workflow';
import assert from 'node:assert';

import { loadMemory, saveToMemory } from '@utils/agent-execution';
import type { ToolCallData } from '@utils/agent-execution';
import { getPromptInputByType } from '@utils/helpers';
import {
	getOptionalOutputParser,
	type N8nOutputParser,
} from '@utils/output_parsers/N8nOutputParser';
import { buildTracingMetadata, getTracingConfig } from '@utils/tracing';

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
import { ChatOpenAI } from '@langchain/openai';

/**
 * Creates an agent executor with the given configuration.
 * Memory is handled by the caller (not AgentExecutor) so tool calls get persisted.
 */
export function createAgentExecutor(
	model: BaseChatModel,
	tools: Array<DynamicStructuredTool | Tool>,
	prompt: ChatPromptTemplate,
	options: { maxIterations?: number },
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
		// Don't pass memory here — we save it ourselves to keep tool call messages
		tools,
		returnIntermediateSteps: true,
		maxIterations: options.maxIterations ?? 10,
	});
}

function isExecuteFunctions(
	context: IExecuteFunctions | ISupplyDataFunctions,
): context is IExecuteFunctions {
	return 'getExecuteData' in context;
}

async function processEventStream(
	ctx: IExecuteFunctions,
	eventStream: IterableReadableStream<StreamEvent>,
	itemIndex: number,
): Promise<{ output: string; intermediateSteps: ToolCallData[] }> {
	const agentResult: { output: string; intermediateSteps: ToolCallData[] } = {
		output: '',
		intermediateSteps: [],
	};
	const toolRunToStep = new Map<string, ToolCallData>();
	const mappedSteps = new Set<ToolCallData>();

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
				if (event.data) {
					const chatModelData = event.data as Record<string, unknown>;
					const output = chatModelData.output as Record<string, unknown> | undefined;

					const toolCalls = output?.tool_calls as
						| Array<{
								name: string;
								args: Record<string, unknown>;
								id: string;
								type: string;
						  }>
						| undefined;
					if (toolCalls && toolCalls.length > 0) {
						for (const toolCall of toolCalls) {
							agentResult.intermediateSteps.push({
								action: {
									tool: toolCall.name,
									toolInput: toolCall.args,
									log:
										(output?.content as string) ||
										`Calling ${toolCall.name} with input: ${JSON.stringify(toolCall.args)}`,
									messageLog: [output] as unknown as ToolCallData['action']['messageLog'],
									toolCallId: toolCall.id,
									type: toolCall.type,
								},
								observation: '',
							});
						}
					}
				}
				break;
			case 'on_tool_start':
				if (event.run_id) {
					const step = agentResult.intermediateSteps.find(
						(s) => !s.observation && s.action.tool === event.name && !mappedSteps.has(s),
					);
					if (step) {
						toolRunToStep.set(event.run_id, step);
						mappedSteps.add(step);
					}
				}
				break;
			case 'on_tool_end':
				if (event.data) {
					const toolData = event.data as Record<string, unknown>;
					// Prefer run_id match, fall back to name-based match
					const step =
						(event.run_id && toolRunToStep.get(event.run_id)) ||
						agentResult.intermediateSteps.find(
							(s) => !s.observation && s.action.tool === event.name,
						);
					if (step) {
						step.observation = toolData.output as string;
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

function checkIsResponsesApi(model: BaseChatModel | null | undefined): boolean {
	try {
		const isUsingResponsesApi =
			!!model && model instanceof ChatOpenAI && 'useResponsesApi' in model && model.useResponsesApi;
		return isUsingResponsesApi;
	} catch (error) {
		return false;
	}
}

/** Main executor for the Tools Agent V2. */
export async function toolsAgentExecute(
	this: IExecuteFunctions | ISupplyDataFunctions,
): Promise<INodeExecutionData[][]> {
	const version = this.getNode().typeVersion;
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

	// FIXME: remove when this is fixed: https://github.com/langchain-ai/langchainjs/pull/9082
	// Responses API + tools is broken when using langchain default call handling. In V3 calls are handled differently, so it works.
	if (checkIsResponsesApi(model)) {
		throw new NodeOperationError(
			this.getNode(),
			`This model is not supported in ${version} version of the Agent node. Please upgrade the Agent node to the latest version.`,
		);
	}

	if (checkIsResponsesApi(fallbackModel)) {
		throw new NodeOperationError(
			this.getNode(),
			`This fallback model is not supported in ${version} version of the Agent node. Please upgrade the Agent node to the latest version.`,
		);
	}

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
				tracingMetadata?: { values?: Array<{ key: string; value: unknown }> };
			};

			// Prepare the prompt messages and prompt template.
			const messages = await prepareMessages(this, itemIndex, {
				systemMessage: options.systemMessage,
				passthroughBinaryImages: options.passthroughBinaryImages ?? true,
				outputParser,
			});
			const prompt: ChatPromptTemplate = preparePrompt(messages);

			const executor = createAgentExecutor(
				model,
				tools,
				prompt,
				options,
				outputParser,
				memory,
				fallbackModel,
			);
			const additionalMetadata = buildTracingMetadata(options.tracingMetadata?.values, this.logger);
			if (Object.keys(additionalMetadata).length > 0) {
				this.logger.debug('Tracing metadata', { additionalMetadata });
			}
			const tracingConfig = isExecuteFunctions(this)
				? getTracingConfig(this, { additionalMetadata })
				: undefined;
			const executorWithTracing = tracingConfig ? executor.withConfig(tracingConfig) : executor;

			const invokeParams = {
				input,
				system_message: options.systemMessage ?? SYSTEM_MESSAGE,
				formatting_instructions:
					'IMPORTANT: For your response to user, you MUST use the `format_final_json_response` tool with your complete answer formatted according to the required schema. Do not attempt to format the JSON manually - always use this tool. Your response will be rejected if it is not properly formatted through this tool. Only use this tool once you are ready to provide your final answer.',
			};
			const executeOptions = { signal: this.getExecutionCancelSignal() };

			const chatHistory = memory ? await loadMemory(memory, model) : undefined;

			// Check if streaming is actually available
			const isStreamingAvailable = 'isStreaming' in this ? this.isStreaming?.() : undefined;

			if (
				'isStreaming' in this &&
				enableStreaming &&
				isStreamingAvailable &&
				this.getNode().typeVersion >= 2.1
			) {
				const eventStream = executorWithTracing.streamEvents(
					{
						...invokeParams,
						chat_history: chatHistory ?? undefined,
					},
					{
						version: 'v2',
						...executeOptions,
					},
				);

				const result = await processEventStream(this, eventStream, itemIndex);

				if (memory && input !== undefined && result.output) {
					await saveToMemory(input, result.output, memory, result.intermediateSteps);
				}

				if (!options.returnIntermediateSteps) {
					return { output: result.output };
				}
				return result;
			} else {
				const response = await executorWithTracing.invoke(
					{
						...invokeParams,
						chat_history: chatHistory ?? undefined,
					},
					executeOptions,
				);

				const steps = (response.intermediateSteps ?? []) as ToolCallData[];
				if (memory && input !== undefined && response.output) {
					await saveToMemory(input, response.output as string, memory, steps);
				}

				if (!options.returnIntermediateSteps) {
					delete response.intermediateSteps;
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

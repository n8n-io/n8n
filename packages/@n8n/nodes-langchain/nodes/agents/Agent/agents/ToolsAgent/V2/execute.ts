import type { StreamEvent } from '@langchain/core/dist/tracers/event_stream';
import type { IterableReadableStream } from '@langchain/core/dist/utils/stream';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
// Removed direct message type imports; using runtime guards instead
import type { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import {
	AgentExecutor,
	type AgentRunnableSequence,
	createToolCallingAgent,
} from 'langchain/agents';
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type {
	Serialized,
	SerializedNotImplemented,
	SerializedSecret,
} from '@langchain/core/load/serializable';
import type { LLMResult } from '@langchain/core/outputs';
import { getModelNameForTiktoken } from '@langchain/core/language_models/base';
import type { BaseChatMemory } from 'langchain/memory';
import type { DynamicStructuredTool, Tool } from 'langchain/tools';
import omit from 'lodash/omit';
import { jsonParse, NodeOperationError, sleep } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	ISupplyDataFunctions,
	IDataObject,
} from 'n8n-workflow';
import type { TiktokenModel } from 'js-tiktoken';
import assert from 'node:assert';

import { getPromptInputByType } from '@utils/helpers';
import {
	getOptionalOutputParser,
	type N8nOutputParser,
} from '@utils/output_parsers/N8nOutputParser';
import { estimateTokensFromStringList } from '@utils/tokenizer/token-estimator';

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

/* -----------------------------------------------------------
   Token Usage Aggregator
----------------------------------------------------------- */
import type { AgentTokenUsageRecord } from '../common';

// helper removed (unused)

class AgentTokenUsageCollector extends BaseCallbackHandler {
	name = 'AgentTokenUsageCollector';

	// Track usage per model key
	usageByModel: Record<string, AgentTokenUsageRecord> = {};

	// Track usage per (model, estimate-kind)
	private usageByModelAndKind: Record<string, AgentTokenUsageRecord> = {};

	// Track runId -> model key and prompt estimates for fallback
	private runToModelKey: Record<string, string> = {};
	private promptEstimateByRun: Record<string, number> = {};

	constructor(
		private readonly tiktokenModel: TiktokenModel = getModelNameForTiktoken(
			'gpt-4o',
		) as TiktokenModel,
	) {
		super();
	}

	async handleLLMStart(
		llm: Serialized | SerializedSecret | SerializedNotImplemented,
		prompts: string[],
		runId: string,
	): Promise<void> {
		try {
			// Serialized object does not expose instance; infer identity from kwargs where possible
			const modelName = (() => {
				if (typeof llm === 'object' && llm !== null && 'kwargs' in llm) {
					const kwargs = (llm as { kwargs?: unknown }).kwargs;
					if (kwargs && typeof kwargs === 'object') {
						const k = kwargs as Record<string, unknown>;
						if (typeof k.model === 'string') return k.model;
						if (typeof k.modelName === 'string') return k.modelName;
					}
				}
				return 'unknown';
			})();
			const modelType = (() => {
				if (typeof llm === 'object' && llm !== null) {
					if ('id' in llm) {
						const idVal = (llm as { id?: unknown }).id;
						if (Array.isArray(idVal) && typeof idVal[0] === 'string') return idVal[0];
					}
					if ('lc_namespace' in llm) {
						const nsVal = (llm as { lc_namespace?: unknown }).lc_namespace;
						if (Array.isArray(nsVal) && typeof nsVal[0] === 'string') return nsVal[0];
					}
				}
				return 'unknown';
			})();
			const key = `${modelType}:${modelName}`;
			this.runToModelKey[runId] = key;

			// Estimate prompt tokens for fallback when usage is not provided
			const estimatedPrompt = await estimateTokensFromStringList(
				Array.isArray(prompts) ? prompts : [],
				this.tiktokenModel,
			);
			this.promptEstimateByRun[runId] = estimatedPrompt;
		} catch {
			// ignore estimation failures
		}
	}

	private addUsage(
		modelKey: string,
		modelType: string,
		modelName: string,
		promptTokens: number,
		completionTokens: number,
		isEstimate: boolean,
	) {
		const totalTokens = (promptTokens || 0) + (completionTokens || 0);
		if (!this.usageByModel[modelKey]) {
			this.usageByModel[modelKey] = {
				modelType,
				modelName,
				promptTokens: 0,
				completionTokens: 0,
				totalTokens: 0,
				isEstimate,
			};
		}
		const agg = this.usageByModel[modelKey];
		agg.promptTokens += promptTokens || 0;
		agg.completionTokens += completionTokens || 0;
		agg.totalTokens += totalTokens;
		// If any entry is an actual value, mark isEstimate as false
		if (!isEstimate) agg.isEstimate = false;

		// Aggregate per (model, estimate-kind)
		const kindKey = `${modelKey}:${isEstimate ? 'estimate' : 'actual'}`;
		if (!this.usageByModelAndKind[kindKey]) {
			this.usageByModelAndKind[kindKey] = {
				modelType,
				modelName,
				promptTokens: 0,
				completionTokens: 0,
				totalTokens: 0,
				isEstimate,
			};
		}
		const aggKind = this.usageByModelAndKind[kindKey];
		aggKind.promptTokens += promptTokens || 0;
		aggKind.completionTokens += completionTokens || 0;
		aggKind.totalTokens += totalTokens;
	}

	recordUsage(
		modelKey: string,
		modelType: string,
		modelName: string,
		promptTokens: number,
		completionTokens: number,
		isEstimate: boolean,
	) {
		this.addUsage(modelKey, modelType, modelName, promptTokens, completionTokens, isEstimate);
	}

	getUsageRecords(): AgentTokenUsageRecord[] {
		return Object.values(this.usageByModelAndKind);
	}

	async handleLLMEnd(output: LLMResult, runId: string): Promise<void> {
		try {
			const key = this.runToModelKey[runId] ?? 'unknown:unknown';
			const separatorIndex = key.indexOf(':');
			const modelType = separatorIndex === -1 ? key : key.slice(0, separatorIndex);
			const modelName = separatorIndex === -1 ? '' : key.slice(separatorIndex + 1);

			let completionTokens = 0;
			let promptTokens = 0;
			const llmOutput = output?.llmOutput;
			if (llmOutput && typeof llmOutput === 'object' && 'tokenUsage' in llmOutput) {
				const tokenUsage = (llmOutput as { tokenUsage?: unknown }).tokenUsage;
				if (tokenUsage && typeof tokenUsage === 'object') {
					const tu = tokenUsage as Record<string, unknown>;
					const ct = tu.completionTokens;
					const pt = tu.promptTokens;
					if (typeof ct === 'number') completionTokens = ct;
					if (typeof pt === 'number') promptTokens = pt;
				}
			}

			if (completionTokens > 0 || promptTokens > 0) {
				this.addUsage(key, modelType, modelName, promptTokens || 0, completionTokens || 0, false);
				return;
			}

			// Fallback: estimate using generations and stored prompt estimate
			const generationsTexts: string[] = [];
			const gens = Array.isArray(output?.generations) ? (output?.generations as unknown[]) : [];
			for (const gen of gens) {
				if (Array.isArray(gen)) {
					for (const g of gen) {
						if (g && typeof g === 'object' && 'text' in (g as Record<string, unknown>)) {
							const t = (g as Record<string, unknown>).text;
							if (typeof t === 'string') generationsTexts.push(t);
						}
					}
				}
			}
			const estimatedCompletion = await estimateTokensFromStringList(
				generationsTexts,
				this.tiktokenModel,
			);
			const estimatedPrompt = this.promptEstimateByRun[runId] ?? 0;
			this.addUsage(key, modelType, modelName, estimatedPrompt, estimatedCompletion, true);
		} catch {
			// ignore
		} finally {
			delete this.runToModelKey[runId];
			delete this.promptEstimateByRun[runId];
		}
	}
}

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

async function processEventStream(
	ctx: IExecuteFunctions,
	eventStream: IterableReadableStream<StreamEvent>,
	itemIndex: number,
	returnIntermediateSteps: boolean = false,
	usageCollector?: AgentTokenUsageCollector,
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
			case 'on_chat_model_start': {
				// Nothing to do here beyond letting the collector record prompt estimates
				break;
			}
			case 'on_chat_model_stream':
				{
					let chunkContent: unknown;
					if (event.data && typeof event.data === 'object' && 'chunk' in event.data) {
						const c = (event.data as { chunk?: unknown }).chunk;
						if (c && typeof c === 'object' && 'content' in (c as Record<string, unknown>)) {
							chunkContent = (c as Record<string, unknown>).content;
						}
					}

					if (chunkContent !== undefined) {
						let chunkText = '';
						if (Array.isArray(chunkContent)) {
							for (const message of chunkContent) {
								if (
									message &&
									typeof message === 'object' &&
									'text' in (message as Record<string, unknown>)
								) {
									const t = (message as Record<string, unknown>).text as unknown;
									if (typeof t === 'string') chunkText += t;
								}
							}
						} else if (typeof chunkContent === 'string') {
							chunkText = chunkContent;
						}
						ctx.sendChunk('item', itemIndex, chunkText);

						agentResult.output += chunkText;
					}
				}
				break;
			case 'on_chat_model_end':
				// Capture full LLM response with tool calls for intermediate steps
				if (returnIntermediateSteps && event.data) {
					let output: any;
					if (typeof event.data === 'object' && event.data !== null && 'output' in event.data) {
						output = (event.data as Record<string, unknown>).output;
					}

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
				// Try to capture usage metadata when available in stream events
				if (usageCollector && event.data) {
					try {
						const data = event.data as Record<string, unknown>;
						const usage =
							(data?.usage_metadata as unknown) ||
							(typeof data?.output === 'object' &&
							data.output !== null &&
							'llmOutput' in data.output &&
							typeof (data.output as Record<string, unknown>).llmOutput === 'object' &&
							(data.output as Record<string, unknown>).llmOutput !== null &&
							'tokenUsage' in
								((data.output as Record<string, unknown>).llmOutput as Record<string, unknown>)
								? ((data.output as Record<string, unknown>).llmOutput as Record<string, unknown>)
										.tokenUsage
								: undefined);
						const modelName = (() => {
							if (
								typeof data?.kwargs === 'object' &&
								data?.kwargs &&
								'model' in (data.kwargs as Record<string, unknown>)
							) {
								const model = (data.kwargs as Record<string, unknown>).model;
								return typeof model === 'string' ? model : 'unknown';
							}
							const model = data?.model;
							return typeof model === 'string' ? model : 'unknown';
						})();
						const modelType = event.name ?? 'unknown';
						if (usage && typeof usage === 'object' && usage !== null) {
							const usageObj = usage as Record<string, unknown>;
							const promptTokens =
								typeof usageObj.input_tokens === 'number'
									? usageObj.input_tokens
									: typeof usageObj.promptTokens === 'number'
										? usageObj.promptTokens
										: 0;
							const completionTokens =
								typeof usageObj.output_tokens === 'number'
									? usageObj.output_tokens
									: typeof usageObj.completionTokens === 'number'
										? usageObj.completionTokens
										: 0;
							const key = `${modelType}:${modelName}`;
							usageCollector.recordUsage(
								key,
								modelType,
								modelName,
								promptTokens,
								completionTokens,
								false,
							);
						}
					} catch {
						// ignore
					}
				}
				break;
			case 'on_tool_end':
				// Capture tool execution results and match with action
				if (returnIntermediateSteps && event.data && agentResult.intermediateSteps!.length > 0) {
					const toolData = event.data as Record<string, unknown>;
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
				collectTokenUsage?: boolean;
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
			// Prepare token usage collector if enabled
			const collectTokenUsage = options.collectTokenUsage === true;
			const usageCollector = collectTokenUsage ? new AgentTokenUsageCollector() : undefined;

			// Invoke with fallback logic
			const invokeParams = {
				input,
				system_message: options.systemMessage ?? SYSTEM_MESSAGE,
				formatting_instructions:
					'IMPORTANT: For your response to user, you MUST use the `format_final_json_response` tool with your complete answer formatted according to the required schema. Do not attempt to format the JSON manually - always use this tool. Your response will be rejected if it is not properly formatted through this tool. Only use this tool once you are ready to provide your final answer.',
			};
			const signal = this.getExecutionCancelSignal();
			const executeOptions: { signal?: AbortSignal; callbacks?: BaseCallbackHandler[] } = {};
			if (signal) {
				executeOptions.signal = signal;
			}
			if (usageCollector) executeOptions.callbacks = [usageCollector];

			// Check if streaming is actually available
			const isStreamingAvailable = 'isStreaming' in this ? this.isStreaming?.() : undefined;

			if (
				'isStreaming' in this &&
				enableStreaming &&
				isStreamingAvailable &&
				this.getNode().typeVersion >= 2.1
			) {
				const chatHistory = await memory?.chatHistory.getMessages();
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

				const streamResult = await processEventStream(
					this,
					eventStream,
					itemIndex,
					options.returnIntermediateSteps,
					usageCollector,
				);
				// attach usage for later aggregation
				return {
					...streamResult,
					__tokenUsage: usageCollector?.getUsageRecords(),
				};
			} else {
				// Handle regular execution
				const res = await executor.invoke(invokeParams, executeOptions);
				if (usageCollector && typeof res === 'object' && res !== null) {
					(res as Record<string, unknown>).__tokenUsage = usageCollector.getUsageRecords();
				}
				return res;
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
					'__tokenUsageByModel',
					'__tokenUsage',
				),
				pairedItem: { item: itemIndex },
			};

			// Attach token usage records (estimate vs actual per model)
			let usageRecords: AgentTokenUsageRecord[] | undefined;
			if (response && typeof response === 'object' && '__tokenUsage' in response) {
				const val = (response as Record<string, unknown>).__tokenUsage as unknown;
				if (Array.isArray(val)) {
					usageRecords = val.filter(
						(v): v is AgentTokenUsageRecord =>
							v &&
							typeof v === 'object' &&
							typeof (v as Record<string, unknown>).modelType === 'string' &&
							typeof (v as Record<string, unknown>).modelName === 'string' &&
							typeof (v as Record<string, unknown>).promptTokens === 'number' &&
							typeof (v as Record<string, unknown>).completionTokens === 'number' &&
							typeof (v as Record<string, unknown>).totalTokens === 'number' &&
							typeof (v as Record<string, unknown>).isEstimate === 'boolean',
					);
				}
			}
			if (usageRecords && usageRecords.length > 0) {
				(itemResult.json as IDataObject).tokenUsage = usageRecords as unknown as IDataObject;
			}

			returnData.push(itemResult);
		});

		if (i + batchSize < items.length && delayBetweenBatches > 0) {
			await sleep(delayBetweenBatches);
		}
	}

	return [returnData];
}

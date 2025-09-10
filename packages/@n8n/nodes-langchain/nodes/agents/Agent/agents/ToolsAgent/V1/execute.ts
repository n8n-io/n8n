import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { RunnableSequence } from '@langchain/core/runnables';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import omit from 'lodash/omit';
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type {
	Serialized,
	SerializedNotImplemented,
	SerializedSecret,
} from '@langchain/core/load/serializable';
import type { LLMResult } from '@langchain/core/outputs';
import { getModelNameForTiktoken } from '@langchain/core/language_models/base';
import { estimateTokensFromStringList } from '@utils/tokenizer/token-estimator';
import { jsonParse, NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import type { AgentTokenUsageRecord } from '../common';
import type { TiktokenModel } from 'js-tiktoken';

import { getPromptInputByType } from '@utils/helpers';
import { getOptionalOutputParser } from '@utils/output_parsers/N8nOutputParser';

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
   Main Executor Function
----------------------------------------------------------- */
/**
 * The main executor method for the Tools Agent.
 *
 * This function retrieves necessary components (model, memory, tools), prepares the prompt,
 * creates the agent, and processes each input item. The error handling for each item is also
 * managed here based on the node's continueOnFail setting.
 *
 * @returns The array of execution data for all processed items
 */
export async function toolsAgentExecute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	this.logger.debug('Executing Tools Agent');

	const returnData: INodeExecutionData[] = [];
	const items = this.getInputData();
	const outputParser = await getOptionalOutputParser(this);
	const tools = await getTools(this, outputParser);

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			const model = (await getChatModel(this)) as BaseLanguageModel;
			const memory = await getOptionalMemory(this);

			// Token usage collector (per item)
			class AgentTokenUsageCollector extends BaseCallbackHandler {
				name = 'AgentTokenUsageCollector';

				usageByModel: Record<
					string,
					{
						modelType: string;
						modelName: string;
						promptTokens: number;
						completionTokens: number;
						totalTokens: number;
						isEstimate: boolean;
					}
				> = {};

				private usageByModelAndKind: Record<
					string,
					{
						modelType: string;
						modelName: string;
						promptTokens: number;
						completionTokens: number;
						totalTokens: number;
						isEstimate: boolean;
					}
				> = {};

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
						const estimatedPrompt = await estimateTokensFromStringList(
							Array.isArray(prompts) ? prompts : [],
							this.tiktokenModel,
						);
						this.promptEstimateByRun[runId] = estimatedPrompt;
					} catch {}
				}

				private addUsage(
					modelKey: string,
					modelType: string,
					modelName: string,
					promptTokens: number,
					completionTokens: number,
					isEstimate: boolean,
				) {
					const total = (promptTokens || 0) + (completionTokens || 0);
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
					agg.totalTokens += total;
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
					aggKind.totalTokens += total;
				}

				getUsageRecords(): Array<{
					modelType: string;
					modelName: string;
					promptTokens: number;
					completionTokens: number;
					totalTokens: number;
					isEstimate: boolean;
				}> {
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
							this.addUsage(
								key,
								modelType,
								modelName,
								promptTokens || 0,
								completionTokens || 0,
								false,
							);
							return;
						}
						const generationsTexts: string[] = [];
						const gens = Array.isArray(output?.generations)
							? (output?.generations as unknown[])
							: [];
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
					} finally {
						delete this.runToModelKey[runId];
						delete this.promptEstimateByRun[runId];
					}
				}
			}

			const optionsAll = this.getNodeParameter('options', itemIndex, {}) as {
				collectTokenUsage?: boolean;
			};
			const collectTokenUsage = optionsAll.collectTokenUsage === true;
			const usageCollector = collectTokenUsage ? new AgentTokenUsageCollector() : undefined;

			const input = getPromptInputByType({
				ctx: this,
				i: itemIndex,
				inputKey: 'text',
				promptTypeKey: 'promptType',
			});
			if (input === undefined) {
				throw new NodeOperationError(this.getNode(), 'The “text” parameter is empty.');
			}

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
			const prompt = preparePrompt(messages);

			// Create the base agent that calls tools.
			const agent = createToolCallingAgent({
				llm: model,
				tools,
				prompt,
				streamRunnable: false,
			});
			agent.streamRunnable = false;
			// Wrap the agent with parsers and fixes.
			const runnableAgent = RunnableSequence.from([
				agent,
				getAgentStepsParser(outputParser, memory),
				fixEmptyContentMessage,
			]);
			const executor = AgentExecutor.fromAgentAndTools({
				agent: runnableAgent,
				memory,
				tools,
				returnIntermediateSteps: options.returnIntermediateSteps === true,
				maxIterations: options.maxIterations ?? 10,
			});

			// Invoke the executor with the given input and system message.
			const response = await executor.invoke(
				{
					input,
					system_message: options.systemMessage ?? SYSTEM_MESSAGE,
					formatting_instructions:
						'IMPORTANT: For your response to user, you MUST use the `format_final_json_response` tool with your complete answer formatted according to the required schema. Do not attempt to format the JSON manually - always use this tool. Your response will be rejected if it is not properly formatted through this tool. Only use this tool once you are ready to provide your final answer.',
				},
				{
					signal: this.getExecutionCancelSignal(),
					...(usageCollector ? { callbacks: [usageCollector] } : {}),
				},
			);
			const usageRecords: AgentTokenUsageRecord[] | undefined = usageCollector?.getUsageRecords();

			// If memory and outputParser are connected, parse the output.
			if (memory && outputParser) {
				const outputStr =
					typeof response === 'object' &&
					response !== null &&
					'output' in (response as Record<string, unknown>)
						? ((response as Record<string, unknown>).output as string)
						: '';
				const parsedOutput = jsonParse<{ output: Record<string, unknown> }>(outputStr);
				if (typeof response === 'object' && response !== null) {
					(response as Record<string, unknown>).output = parsedOutput?.output ?? parsedOutput;
				}
			}

			// Omit internal keys before returning the result.
			const baseJson: IDataObject =
				typeof response === 'object' && response !== null
					? (omit(
							response as IDataObject,
							'system_message',
							'formatting_instructions',
							'input',
							'chat_history',
							'agent_scratchpad',
							'__tokenUsageByModel',
							'__tokenUsage',
						) as IDataObject)
					: { output: response };

			if (usageRecords && usageRecords.length > 0) {
				baseJson.tokenUsage = usageRecords;
			}

			const itemResult = { json: baseJson };

			returnData.push(itemResult);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: { error: error.message },
					pairedItem: { item: itemIndex },
				});
				continue;
			}
			throw error;
		}
	}

	return [returnData];
}

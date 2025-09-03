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
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

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

				constructor(private readonly tiktokenModel: string = getModelNameForTiktoken('gpt-4o')) {
					super();
				}

				async handleLLMStart(
					llm: Serialized | SerializedSecret | SerializedNotImplemented,
					prompts: string[],
					runId: string,
				): Promise<void> {
					try {
						const llmAny = llm as any;
						const modelName = llmAny?.kwargs?.model ?? llmAny?.kwargs?.modelName ?? 'unknown';
						const modelType = llmAny?.id?.[0] ?? llmAny?.lc_namespace?.[0] ?? 'unknown';
						const key = `${modelType}:${modelName}`;
						this.runToModelKey[runId] = key;
						const estimatedPrompt = await estimateTokensFromStringList(
							Array.isArray(prompts) ? prompts : [],
							this.tiktokenModel as any,
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
						const [modelType, modelName] = key.split(':');
						const completionTokens = (output?.llmOutput as any)?.tokenUsage?.completionTokens ?? 0;
						const promptTokens = (output?.llmOutput as any)?.tokenUsage?.promptTokens ?? 0;
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
						const generationsTexts =
							output?.generations?.flatMap((gen) => gen.map((g) => (g as any).text ?? '')) ?? [];
						const estimatedCompletion = await estimateTokensFromStringList(
							generationsTexts,
							this.tiktokenModel as any,
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
			const response: any = await executor.invoke(
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
			if (usageCollector) {
				response.__tokenUsage = usageCollector.getUsageRecords();
			}

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
			};

			const usageRecords = response?.__tokenUsage as
				| Array<{
						modelType: string;
						modelName: string;
						promptTokens: number;
						completionTokens: number;
						totalTokens: number;
						isEstimate: boolean;
				  }>
				| undefined;
			if (usageRecords && usageRecords.length > 0) {
				(itemResult.json as any).tokenUsage = usageRecords;
			}

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

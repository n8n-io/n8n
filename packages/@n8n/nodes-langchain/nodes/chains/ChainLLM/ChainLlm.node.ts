import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError, sleep } from 'n8n-workflow';

import { getPromptInputByType } from '@utils/helpers';
import { getOptionalOutputParser } from '@utils/output_parsers/N8nOutputParser';

// Import from centralized module
import {
	executeChain,
	formatResponse,
	getInputs,
	nodeProperties,
	type MessageTemplate,
} from './methods';
import {
	getCustomErrorMessage as getCustomOpenAiErrorMessage,
	isOpenAiError,
} from '../../vendors/OpenAi/helpers/error-handling';

/**
 * Basic LLM Chain Node Implementation
 * Allows connecting to language models with optional structured output parsing
 */
export class ChainLlm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Basic LLM Chain',
		name: 'chainLlm',
		icon: 'fa:link',
		iconColor: 'black',
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6],
		description: 'A simple chain to prompt a large language model',
		defaults: {
			name: 'Basic LLM Chain',
			color: '#909298',
		},
		codex: {
			alias: ['LangChain'],
			categories: ['AI'],
			subcategories: {
				AI: ['Chains', 'Root Nodes'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.chainllm/',
					},
				],
			},
		},
		inputs: `={{ ((parameter) => { ${getInputs.toString()}; return getInputs(parameter) })($parameter) }}`,
		outputs: [NodeConnectionTypes.Main],
		credentials: [],
		properties: nodeProperties,
	};

	/**
	 * Main execution method for the node
	 */
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.debug('Executing Basic LLM Chain');
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const { batchSize, delayBetweenBatches } = this.getNodeParameter('batching', 0, {
			batchSize: 100,
			delayBetweenBatches: 0,
		}) as {
			batchSize: number;
			delayBetweenBatches: number;
		};
		// Get output parser if configured
		const outputParser = await getOptionalOutputParser(this);

		// Process items in batches
		for (let i = 0; i < items.length; i += batchSize) {
			const batch = items.slice(i, i + batchSize);
			const batchPromises = batch.map(async (_item, batchItemIndex) => {
				const itemIndex = i + batchItemIndex;

				// Get the language model
				const llm = (await this.getInputConnectionData(
					NodeConnectionTypes.AiLanguageModel,
					0,
				)) as BaseLanguageModel;

				// Get user prompt based on node version
				let prompt: string;

				if (this.getNode().typeVersion <= 1.3) {
					prompt = this.getNodeParameter('prompt', itemIndex) as string;
				} else {
					prompt = getPromptInputByType({
						ctx: this,
						i: itemIndex,
						inputKey: 'text',
						promptTypeKey: 'promptType',
					});
				}

				// Validate prompt
				if (prompt === undefined) {
					throw new NodeOperationError(this.getNode(), "The 'prompt' parameter is empty.");
				}

				// Get chat messages if configured
				const messages = this.getNodeParameter(
					'messages.messageValues',
					itemIndex,
					[],
				) as MessageTemplate[];

				return (await executeChain({
					context: this,
					itemIndex,
					query: prompt,
					llm,
					outputParser,
					messages,
				})) as object[];
			});

			const batchResults = await Promise.allSettled(batchPromises);

			batchResults.forEach((promiseResult, batchItemIndex) => {
				const itemIndex = i + batchItemIndex;
				if (promiseResult.status === 'rejected') {
					const error = promiseResult.reason as Error;
					// Handle OpenAI specific rate limit errors
					if (error instanceof NodeApiError && isOpenAiError(error.cause)) {
						const openAiErrorCode: string | undefined = (error.cause as any).error?.code;
						if (openAiErrorCode) {
							const customMessage = getCustomOpenAiErrorMessage(openAiErrorCode);
							if (customMessage) {
								error.message = customMessage;
							}
						}
					}

					if (this.continueOnFail()) {
						returnData.push({
							json: { error: error.message },
							pairedItem: { item: itemIndex },
						});
						return;
					}
					throw new NodeOperationError(this.getNode(), error);
				}

				const responses = promiseResult.value;
				responses.forEach((response: object) => {
					returnData.push({
						json: formatResponse(response, this.getNode().typeVersion >= 1.6 || !!outputParser),
					});
				});
			});

			if (i + batchSize < items.length && delayBetweenBatches > 0) {
				await sleep(delayBetweenBatches);
			}
		}

		return [returnData];
	}
}

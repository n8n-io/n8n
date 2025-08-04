import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError, sleep } from 'n8n-workflow';

import { getOptionalOutputParser } from '@utils/output_parsers/N8nOutputParser';

// Import from centralized module
import { formatResponse, getInputs, nodeProperties } from './methods';
import { processItem } from './methods/processItem';
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
		version: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7],
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
		const outputParser = await getOptionalOutputParser(this);
		// If the node version is 1.6(and LLM is using `response_format: json_object`) or higher or an output parser is configured,
		//  we unwrap the response and return the object directly as JSON
		const shouldUnwrapObjects = this.getNode().typeVersion >= 1.6 || !!outputParser;

		const batchSize = this.getNodeParameter('batching.batchSize', 0, 5) as number;
		const delayBetweenBatches = this.getNodeParameter(
			'batching.delayBetweenBatches',
			0,
			0,
		) as number;

		if (this.getNode().typeVersion >= 1.7 && batchSize > 1) {
			// Process items in batches
			for (let i = 0; i < items.length; i += batchSize) {
				const batch = items.slice(i, i + batchSize);
				const batchPromises = batch.map(async (_item, batchItemIndex) => {
					return await processItem(this, i + batchItemIndex);
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
					responses.forEach((response: unknown) => {
						returnData.push({
							json: formatResponse(response, shouldUnwrapObjects),
						});
					});
				});

				if (i + batchSize < items.length && delayBetweenBatches > 0) {
					await sleep(delayBetweenBatches);
				}
			}
		} else {
			// Process each input item
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				try {
					const responses = await processItem(this, itemIndex);

					// Process each response and add to return data
					responses.forEach((response) => {
						returnData.push({
							json: formatResponse(response, shouldUnwrapObjects),
						});
					});
				} catch (error) {
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

					// Continue on failure if configured
					if (this.continueOnFail()) {
						returnData.push({ json: { error: error.message }, pairedItem: { item: itemIndex } });
						continue;
					}

					throw error;
				}
			}
		}

		return [returnData];
	}
}

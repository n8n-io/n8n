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
		const batchSize = this.getNodeParameter('batching.batchSize', 0, 1) as number;
		const delayBetweenBatches = this.getNodeParameter(
			'batching.delayBetweenBatches',
			0,
			1000,
		) as number;

		// Get output parser if configured
		const outputParser = await getOptionalOutputParser(this);

		const promises = items.map(async (_item, itemIndex) => {
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

			const result = await executeChain({
				context: this,
				itemIndex,
				query: prompt,
				llm,
				outputParser,
				messages,
			});

			if (itemIndex % batchSize === 0) {
				await sleep(delayBetweenBatches);
			}
			return result;
		});

		// If the node version is 1.6(and LLM is using `response_format: json_object`) or higher or an output parser is configured,
		//  we unwrap the response and return the object directly as JSON
		const shouldUnwrapObjects = this.getNode().typeVersion >= 1.6 || !!outputParser;
		const continueOnFail = this.continueOnFail();

		(await Promise.allSettled(promises)).forEach((promise, index) => {
			if (promise.status === 'rejected') {
				const error = promise.reason;
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

				if (continueOnFail) {
					returnData.push({ json: { error: error.message }, pairedItem: { item: index } });
					return;
				}
				throw new NodeOperationError(this.getNode(), promise.reason);
			}

			const responses = promise.value as object[];
			responses.forEach((response: object) => {
				returnData.push({
					json: formatResponse(response, shouldUnwrapObjects),
				});
			});
		});

		return [returnData];
	}
}

import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { OutputFixingParser, StructuredOutputParser } from '@langchain/classic/output_parsers';
import { sleep } from '@n8n/utils/sleep';
import { NodeOperationError, NodeConnectionTypes } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { getBatchingOptionFields } from '@n8n/ai-utilities';
import { wrapLangChainParserError } from '@utils/output_parsers/langchainParserError';

import {
	buildClassificationSchema,
	findReservedCategory,
	FALLBACK_KEY,
	type Category,
	type ClassificationResult,
} from './classification';
import { processItem } from './processItem';

const SYSTEM_PROMPT_TEMPLATE =
	"Please classify the text provided by the user into one of the following categories: {categories}, and use the provided formatting instructions below. Don't explain, and only output the json.";

const configuredOutputs = (parameters: INodeParameters) => {
	const categories = ((parameters.categories as IDataObject)?.categories as IDataObject[]) ?? [];
	const fallback = (parameters.options as IDataObject)?.fallback as string;
	const ret = categories.map((cat) => {
		return { type: 'main', displayName: cat.category };
	});
	if (fallback === 'other') ret.push({ type: 'main', displayName: 'Other' });
	return ret;
};

/**
 * Sends one classified item to the branches it matched.
 *
 * Every branch gets its own copy. In multi-class mode one item routes to
 * several branches, and a shared object would carry one branch's changes onto
 * the rest.
 */
/** The label the Other branch reports, where there is no category to name. */
const OTHER_LABEL = 'Other';

function routeItem(options: {
	result: ClassificationResult;
	item: INodeExecutionData;
	itemIndex: number;
	categories: Category[];
	hasOtherBranch: boolean;
	withConfidence: boolean;
	returnData: INodeExecutionData[][];
}): void {
	const { result, item, itemIndex, categories, hasOtherBranch, withConfidence, returnData } =
		options;

	// The same map on every branch. An absolute score from a model is a weak
	// signal, but the order between the categories still tells the reader something.
	const scores = result.scores
		? Object.fromEntries(
				categories
					.filter((category) => result.scores?.[category.category] !== undefined)
					.map((category) => [category.category, result.scores?.[category.category]]),
			)
		: undefined;

	const copy = (label: string, decisionKey: string): INodeExecutionData => {
		const json = { ...item.json };

		if (withConfidence) {
			const confidence = result.scores?.[decisionKey];
			json.classification = {
				category: label,
				...(confidence !== undefined && { confidence }),
				...(scores && Object.keys(scores).length > 0 && { scores }),
			};
		}

		return { ...item, json, pairedItem: { item: itemIndex } };
	};

	categories.forEach((category, index) => {
		if (result.matched.includes(category.category))
			returnData[index].push(copy(category.category, category.category));
	});

	if (hasOtherBranch && result.fallback)
		returnData[returnData.length - 1].push(copy(OTHER_LABEL, FALLBACK_KEY));
}

export class TextClassifier implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Text Classifier',
		name: 'textClassifier',
		icon: 'node:text-classifier',
		iconColor: 'black',
		group: ['transform'],
		version: [1, 1.1],
		description: 'Classify your text into distinct categories',
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Chains', 'Root Nodes'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.text-classifier/',
					},
				],
			},
		},
		defaults: {
			name: 'Text Classifier',
		},
		inputs: [
			{ displayName: '', type: NodeConnectionTypes.Main },
			{
				displayName: 'Model',
				maxConnections: 1,
				type: NodeConnectionTypes.AiLanguageModel,
				required: true,
			},
		],
		outputs: `={{(${configuredOutputs})($parameter)}}`,
		builderHint: {
			inputs: {
				ai_languageModel: { required: true },
			},
			searchHint:
				'Each category defined creates a separate output branch. Output 0 corresponds to the first category, output 1 to the second, and so on. Use .output(index).to() to connect from a specific category. @example textClassifier.output(0).to(nodeA) and textClassifier.output(1).to(nodeB)',
		},
		properties: [
			{
				displayName: 'Text to Classify',
				name: 'inputText',
				type: 'string',
				required: true,
				default: '',
				description: 'Use an expression to reference data in previous nodes or enter static text',
				typeOptions: {
					rows: 2,
				},
			},
			{
				displayName: 'Categories',
				name: 'categories',
				placeholder: 'Add Category',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'categories',
						displayName: 'Categories',
						values: [
							{
								displayName: 'Category',
								name: 'category',
								type: 'string',
								default: '',
								description: 'Category to add',
								required: true,
							},
							{
								displayName: 'Description',
								name: 'description',
								type: 'string',
								default: '',
								description: "Describe your category if it's not obvious",
							},
						],
					},
				],
			},
			{
				displayName:
					'Confidence scores are estimates from the model, not measured probabilities. They can change between runs, so treat them as a rough signal, not a threshold.',
				name: 'confidenceScoresNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						'/options.includeConfidenceScores': [true],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'Allow Multiple Classes To Be True',
						name: 'multiClass',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'When No Clear Match',
						name: 'fallback',
						type: 'options',
						default: 'discard',
						description: 'What to do with items that don’t match the categories exactly',
						options: [
							{
								name: 'Discard Item',
								value: 'discard',
								description: 'Ignore the item and drop it from the output',
							},
							{
								name: "Output on Extra, 'Other' Branch",
								value: 'other',
								description: "Create a separate output branch called 'Other'",
							},
						],
					},
					{
						displayName: 'Include Confidence Scores',
						name: 'includeConfidenceScores',
						type: 'boolean',
						default: false,
						description:
							"Whether to add a classification field to each item with the model's confidence score for every category",
					},
					{
						displayName: 'System Prompt Template',
						name: 'systemPromptTemplate',
						type: 'string',
						default: SYSTEM_PROMPT_TEMPLATE,
						description: 'String to use directly as the system prompt template',
						typeOptions: {
							rows: 6,
						},
					},
					{
						displayName: 'Enable Auto-Fixing',
						name: 'enableAutoFixing',
						type: 'boolean',
						default: true,
						description:
							'Whether to enable auto-fixing (may trigger an additional LLM call if output is broken)',
					},
					getBatchingOptionFields({
						show: {
							'@version': [{ _cnd: { gte: 1.1 } }],
						},
					}),
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const batchSize = this.getNodeParameter('options.batching.batchSize', 0, 5) as number;
		const delayBetweenBatches = this.getNodeParameter(
			'options.batching.delayBetweenBatches',
			0,
			0,
		) as number;

		const llm = (await this.getInputConnectionData(
			NodeConnectionTypes.AiLanguageModel,
			0,
		)) as BaseLanguageModel;

		const categories = this.getNodeParameter('categories.categories', 0, []) as Category[];

		if (categories.length === 0) {
			throw new NodeOperationError(this.getNode(), 'At least one category must be defined');
		}

		const options = this.getNodeParameter('options', 0, {}) as {
			multiClass: boolean;
			fallback?: string;
			systemPromptTemplate?: string;
			enableAutoFixing: boolean;
			includeConfidenceScores?: boolean;
		};
		const multiClass = options?.multiClass ?? false;
		const fallback = options?.fallback ?? 'discard';
		const withConfidence = options?.includeConfidenceScores ?? false;

		// Only with the option on, so a workflow that already has such a category
		// keeps running
		const reserved = withConfidence ? findReservedCategory(categories) : undefined;
		if (reserved) {
			throw new NodeOperationError(
				this.getNode(),
				`The category name "${reserved}" is reserved when confidence scores are on`,
				{
					description:
						'The node reports the scores under that name. Rename the category, or turn off Include Confidence Scores.',
				},
			);
		}

		const schema = buildClassificationSchema(categories, fallback === 'other', withConfidence);

		const structuredParser = StructuredOutputParser.fromZodSchema(schema);

		const parser = options.enableAutoFixing
			? OutputFixingParser.fromLLM(llm, structuredParser)
			: structuredParser;

		const multiClassPrompt = multiClass
			? 'Categories are not mutually exclusive, and multiple can be true'
			: 'Categories are mutually exclusive, and only one can be true';

		const fallbackPrompt = {
			other: 'If no categories apply, select the "fallback" option.',
			discard: 'If there is not a very fitting category, select none of the categories.',
		}[fallback];

		const returnData: INodeExecutionData[][] = Array.from(
			{ length: categories.length + (fallback === 'other' ? 1 : 0) },
			(_) => [],
		);

		if (this.getNode().typeVersion >= 1.1 && batchSize > 1) {
			for (let i = 0; i < items.length; i += batchSize) {
				const batch = items.slice(i, i + batchSize);
				const batchPromises = batch.map(async (_item, batchItemIndex) => {
					const itemIndex = i + batchItemIndex;

					return await processItem(
						this,
						itemIndex,
						llm,
						parser,
						categories,
						multiClassPrompt,
						fallbackPrompt,
					);
				});

				const batchResults = await Promise.allSettled(batchPromises);

				batchResults.forEach((response, batchItemIndex) => {
					const index = i + batchItemIndex;
					if (response.status === 'rejected') {
						const error = wrapLangChainParserError(response.reason, this.getNode(), index);
						if (this.continueOnFail()) {
							returnData[0].push({
								json: { error: error.message },
								pairedItem: { item: index },
							});
							return;
						} else {
							throw new NodeOperationError(this.getNode(), error);
						}
					} else {
						routeItem({
							result: response.value,
							item: items[index],
							itemIndex: index,
							categories,
							hasOtherBranch: fallback === 'other',
							withConfidence,
							returnData,
						});
					}
				});

				// Add delay between batches if not the last batch
				if (i + batchSize < items.length && delayBetweenBatches > 0) {
					await sleep(delayBetweenBatches);
				}
			}
		} else {
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				const item = items[itemIndex];

				try {
					const output = await processItem(
						this,
						itemIndex,
						llm,
						parser,
						categories,
						multiClassPrompt,
						fallbackPrompt,
					);

					routeItem({
						result: output,
						item,
						itemIndex,
						categories,
						hasOtherBranch: fallback === 'other',
						withConfidence,
						returnData,
					});
				} catch (error) {
					const executionError = wrapLangChainParserError(error, this.getNode(), itemIndex);
					if (this.continueOnFail()) {
						returnData[0].push({
							json: { error: executionError.message },
							pairedItem: { item: itemIndex },
						});

						continue;
					}

					throw executionError;
				}
			}
		}

		return returnData;
	}
}

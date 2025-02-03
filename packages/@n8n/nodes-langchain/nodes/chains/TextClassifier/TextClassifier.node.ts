import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { HumanMessage } from '@langchain/core/messages';
import { SystemMessagePromptTemplate, ChatPromptTemplate } from '@langchain/core/prompts';
import { OutputFixingParser, StructuredOutputParser } from 'langchain/output_parsers';
import { NodeOperationError, NodeConnectionType } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { z } from 'zod';

import { getTracingConfig } from '@utils/tracing';

const SYSTEM_PROMPT_TEMPLATE =
	"Please classify the text provided by the user into one of the following categories: {categories}, and use the provided formatting instructions below. Don't explain, and only output the json.";

const configuredOutputs = (parameters: INodeParameters) => {
	const categories = ((parameters.categories as IDataObject)?.categories as IDataObject[]) ?? [];
	const fallback = (parameters.options as IDataObject)?.fallback as string;
	const ret = categories.map((cat) => {
		return { type: NodeConnectionType.Main, displayName: cat.category };
	});
	if (fallback === 'other') ret.push({ type: NodeConnectionType.Main, displayName: 'Other' });
	return ret;
};

export class TextClassifier implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Text Classifier',
		name: 'textClassifier',
		icon: 'fa:tags',
		iconColor: 'black',
		group: ['transform'],
		version: 1,
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
			{ displayName: '', type: NodeConnectionType.Main },
			{
				displayName: 'Model',
				maxConnections: 1,
				type: NodeConnectionType.AiLanguageModel,
				required: true,
			},
		],
		outputs: `={{(${configuredOutputs})($parameter)}}`,
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
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const llm = (await this.getInputConnectionData(
			NodeConnectionType.AiLanguageModel,
			0,
		)) as BaseLanguageModel;

		const categories = this.getNodeParameter('categories.categories', 0, []) as Array<{
			category: string;
			description: string;
		}>;

		if (categories.length === 0) {
			throw new NodeOperationError(this.getNode(), 'At least one category must be defined');
		}

		const options = this.getNodeParameter('options', 0, {}) as {
			multiClass: boolean;
			fallback?: string;
			systemPromptTemplate?: string;
			enableAutoFixing: boolean;
		};
		const multiClass = options?.multiClass ?? false;
		const fallback = options?.fallback ?? 'discard';

		const schemaEntries = categories.map((cat) => [
			cat.category,
			z
				.boolean()
				.describe(
					`Should be true if the input has category "${cat.category}" (description: ${cat.description})`,
				),
		]);
		if (fallback === 'other')
			schemaEntries.push([
				'fallback',
				z.boolean().describe('Should be true if none of the other categories apply'),
			]);
		const schema = z.object(Object.fromEntries(schemaEntries));

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
		for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
			const item = items[itemIdx];
			item.pairedItem = { item: itemIdx };
			const input = this.getNodeParameter('inputText', itemIdx) as string;
			const inputPrompt = new HumanMessage(input);

			const systemPromptTemplateOpt = this.getNodeParameter(
				'options.systemPromptTemplate',
				itemIdx,
				SYSTEM_PROMPT_TEMPLATE,
			) as string;
			const systemPromptTemplate = SystemMessagePromptTemplate.fromTemplate(
				`${systemPromptTemplateOpt ?? SYSTEM_PROMPT_TEMPLATE}
{format_instructions}
${multiClassPrompt}
${fallbackPrompt}`,
			);

			const messages = [
				await systemPromptTemplate.format({
					categories: categories.map((cat) => cat.category).join(', '),
					format_instructions: parser.getFormatInstructions(),
				}),
				inputPrompt,
			];
			const prompt = ChatPromptTemplate.fromMessages(messages);
			const chain = prompt.pipe(llm).pipe(parser).withConfig(getTracingConfig(this));

			try {
				const output = await chain.invoke(messages);

				categories.forEach((cat, idx) => {
					if (output[cat.category]) returnData[idx].push(item);
				});
				if (fallback === 'other' && output.fallback) returnData[returnData.length - 1].push(item);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData[0].push({
						json: { error: error.message },
						pairedItem: { item: itemIdx },
					});

					continue;
				}

				throw error;
			}
		}

		return returnData;
	}
}

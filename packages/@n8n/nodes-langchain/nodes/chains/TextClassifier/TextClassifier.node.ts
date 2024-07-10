import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { NodeConnectionType } from 'n8n-workflow';

import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { HumanMessage } from '@langchain/core/messages';
import { SystemMessagePromptTemplate, ChatPromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { z } from 'zod';
import { getTracingConfig } from '../../../utils/tracing';
import { getPromptInputByType } from '../../../utils/helpers';

const SYSTEM_PROMPT_TEMPLATE =
	"Please classify the text provided by the user into one of the following categories: {categories}, and use the provided formatting instructions below. Don't explain, and only output the json.";

const configuredOutputs = (parameters: INodeParameters) => {
	const categories = ((parameters.categories as IDataObject)?.categories as IDataObject[]) ?? [];
	const fallback = parameters?.fallback as boolean;
	const ret = categories.map((cat) => {
		return { type: NodeConnectionType.Main, displayName: cat.category };
	});
	if (fallback) ret.push({ type: NodeConnectionType.Main, displayName: 'Other' });
	return ret;
};

export class TextClassifier implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Text Classifier',
		name: 'textClassifier',
		icon: 'fa:tags',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.chainllm/',
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
				displayName: 'Allow Multiple Classes To Be True',
				name: 'multiClass',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Add Fallback Option',
				name: 'fallback',
				type: 'boolean',
				default: false,
				description: 'Whether to add a "fallback" option if no other categories match',
			},
			{
				displayName: 'Prompt',
				name: 'promptType',
				type: 'options',
				options: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'Take from previous node automatically',
						value: 'auto',
						description: 'Looks for an input field called chatInput',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'Define below',
						value: 'define',
						description:
							'Use an expression to reference data in previous nodes or enter static text',
					},
				],
				default: 'auto',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. Hello, how can you help me?',
				typeOptions: {
					rows: 2,
				},
				displayOptions: {
					show: {
						promptType: ['define'],
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
						displayName: 'System Prompt Template',
						name: 'systemPromptTemplate',
						type: 'string',
						default: SYSTEM_PROMPT_TEMPLATE,
						description: 'String to use directly as the system prompt template',
						typeOptions: {
							rows: 6,
						},
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

		const categories = (
			this.getNodeParameter('categories', 0) as {
				categories: [{ category: string; description: string }];
			}
		)?.categories;

		const options = this.getNodeParameter('options', 0, {}) as {
			systemPromptTemplate?: string;
		};
		const multiClass = this.getNodeParameter('multiClass', 0) as boolean;
		const fallback = this.getNodeParameter('fallback', 0) as boolean;

		const schemaEntries = categories.map((cat) => [
			cat.category,
			z
				.boolean()
				.describe(
					`Should be true if the input has category "${cat.category}" (description: ${cat.description})`,
				),
		]);
		if (fallback)
			schemaEntries.push([
				'fallback',
				z.boolean().describe('Should be true if none of the other categories apply'),
			]);
		const schema = z.object(Object.fromEntries(schemaEntries));

		const parser = StructuredOutputParser.fromZodSchema(schema);

		const multiClassPrompt = multiClass
			? 'Categories are not mutually exclusive, and multiple can be true'
			: 'Categories are mutually exclusive, and only one can be true';
		const fallbackPrompt = fallback
			? 'If no categories apply, select the "fallback" option.'
			: 'One of the options must always be true.';

		const systemPromptTemplate = SystemMessagePromptTemplate.fromTemplate(
			`${options.systemPromptTemplate ?? SYSTEM_PROMPT_TEMPLATE}
{format_instructions}
${multiClassPrompt}
${fallbackPrompt}`,
		);

		const returnData: INodeExecutionData[][] = Array.from(
			{ length: categories.length + (fallback ? 1 : 0) },
			(_) => [],
		);
		for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
			const input = getPromptInputByType({
				ctx: this,
				i: itemIdx,
				inputKey: 'text',
				promptTypeKey: 'promptType',
			});
			const inputPrompt = new HumanMessage(input);
			const messages = [
				await systemPromptTemplate.format({
					categories: JSON.stringify(categories),
					format_instructions: parser.getFormatInstructions(),
				}),
				inputPrompt,
			];
			const prompt = ChatPromptTemplate.fromMessages(messages);
			const chain = prompt.pipe(llm).pipe(parser).withConfig(getTracingConfig(this));

			const output = await chain.invoke(messages);
			categories.forEach((cat, idx) => {
				if (output[cat.category]) returnData[idx].push(items[itemIdx]);
			});
			if (fallback && output.fallback) returnData[returnData.length - 1].push(items[itemIdx]);
		}
		return returnData;
	}
}

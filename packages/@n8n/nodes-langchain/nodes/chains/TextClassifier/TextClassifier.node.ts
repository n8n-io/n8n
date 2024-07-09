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
import { PromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { z } from 'zod';
import { getTracingConfig } from '../../../utils/tracing';

const SYSTEM_PROMPT_TEMPLATE =
	"Please classify the text provided by the user into one of the following categories: {categories}, and use the provided formatting instructions below. Don't explain, and only output the json.";

const configuredOutputs = (parameters: INodeParameters) => {
	const categories = ((parameters.categories as IDataObject)?.categories as IDataObject[]) ?? [];
	const ret = categories.map((cat) => {
		return { type: NodeConnectionType.Main, displayName: cat.category };
	});
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
				placeholder: 'Add some categories',
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
						description: 'String to use directly as the human message template',
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
		const input = this.evaluateExpression('{{ $json["chatInput"] }}', 0) as string;

		const options = this.getNodeParameter('options', 0, {}) as {
			systemPromptTemplate?: string;
		};
		const multiClass = this.getNodeParameter('multiClass', 0) as boolean;

		const schema = z.object(
			Object.fromEntries(
				categories.map((cat) => [
					cat.category,
					z
						.boolean()
						.describe(
							`Should be true if the input has category "${cat.category}" (description: ${cat.description})`,
						),
				]),
			),
		);

		const parser = StructuredOutputParser.fromZodSchema(schema);

		const multiClassPrompt = multiClass
			? 'Categories are not mutually exclusive, and multiple can be true'
			: 'Categories are mutually exclusive, and only one can be true';

		const systemPromptTemplate = PromptTemplate.fromTemplate(
			(options.systemPromptTemplate ?? SYSTEM_PROMPT_TEMPLATE) +
				'\n{format_instructions}\n' +
				multiClassPrompt,
		);
		const inputPrompt = new HumanMessage(input);
		const messages = [
			await systemPromptTemplate.format({
				categories: JSON.stringify(categories),
				format_instructions: parser.getFormatInstructions(),
			}),
			inputPrompt,
		];

		const responses = (await llm.withConfig(getTracingConfig(this)).invoke(messages)) as {
			content: string;
		};
		const output = await parser.parse(responses.content);
		return Array.from({ length: categories.length }, (_, i) =>
			output[categories[i].category] ? items : [],
		);
	}
}

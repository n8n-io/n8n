import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	NodeOperationError,
	jsonParse,
} from 'n8n-workflow';

import {
	ChatPromptTemplate,
	HumanMessagePromptTemplate,
	SystemMessagePromptTemplate,
} from 'langchain/prompts';
import type { ChatOpenAI } from 'langchain/chat_models/openai';
import { JsonOutputFunctionsParser } from 'langchain/output_parsers';

function getPromptTemplate(prompt: string) {
	return new ChatPromptTemplate({
		promptMessages: [
			SystemMessagePromptTemplate.fromTemplate(prompt),
			HumanMessagePromptTemplate.fromTemplate('{inputText}'),
		],
		inputVariables: ['inputText'],
	});
}

export class ChainStructuredOutput implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Structured Output Chain',
		name: 'chainStructuredOutput',
		icon: 'fa:link',
		group: ['transform'],
		version: 1,
		description:
			'Processes input text and structures the output according to a specified JSON schema',
		defaults: {
			name: 'Structured Output Chain',
			color: '#909298',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Chains'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [
			'main',
			{
				displayName: 'Model',
				maxConnections: 1,
				type: 'languageModel',
				filter: {
					nodes: ['@n8n/nodes-langchain.lmChatOpenAi'],
				},
				required: true,
			},
		],
		outputs: ['main'],
		credentials: [],
		properties: [
			{
				displayName:
					'This Chain depends on OpenAI functions. So it can only be used with supported OpenAI models.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				default: '',
				required: true,
			},
			{
				displayName: 'Input Text',
				name: 'inputText',
				type: 'string',
				default: '={{ $json.input }}',
				typeOptions: {
					rows: 4,
				},
				required: true,
			},
			{
				displayName: 'JSON Schema',
				name: 'jsonSchema',
				type: 'json',
				description: 'JSON Schema to structure the output',
				default: '',
				typeOptions: {
					rows: 10,
					editor: 'json',
					editorLanguage: 'json',
				},
				required: true,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.verbose('Executing Structured Output Chain');
		const model = (await this.getInputConnectionData('languageModel', 0)) as ChatOpenAI;

		const outputParser = new JsonOutputFunctionsParser();

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const prompt = this.getNodeParameter('prompt', i) as string;
			const inputText = this.getNodeParameter('inputText', i) as string;
			const schema = this.getNodeParameter('jsonSchema', i) as string;

			let parameters: {
				[key: string]: unknown;
			};
			try {
				parameters = jsonParse(schema);
			} catch (error) {
				throw new NodeOperationError(this.getNode(), 'Error during parsing of JSON Schema.');
			}
			const functionCallingModel = model.bind({
				functions: [
					{
						name: 'output_formatter',
						description: 'Should always be used to properly format output',
						parameters,
					},
				],
				function_call: { name: 'output_formatter' },
			});

			const chain = getPromptTemplate(prompt).pipe(functionCallingModel).pipe(outputParser);

			const response = await chain.invoke({
				inputText,
			});

			returnData.push({ json: { response } });
		}

		return this.prepareOutputData(returnData);
	}
}

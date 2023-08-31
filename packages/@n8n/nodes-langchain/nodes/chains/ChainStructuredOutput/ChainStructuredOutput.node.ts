import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

// import { loadSummarizationChain } from 'langchain/chains';
// import type { BaseLanguageModel } from 'langchain/dist/base_language';
import { getAndValidateSupplyInput } from '../../../utils/getAndValidateSupplyInput';
import { N8nJsonLoader } from '../../document_loaders/DocumentJSONInputLoader/DocumentJSONInputLoader.node';
import { Document } from 'langchain/document';
import { N8nBinaryLoader } from '../../document_loaders/DocumentBinaryInputLoader/DocumentBinaryInputLoader.node';
import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from 'langchain/dist/prompts';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { JsonOutputFunctionsParser } from 'langchain/dist/output_parsers/openai_functions';

function getPromptTemplate(prompt: string) {
	return new ChatPromptTemplate({
		promptMessages: [
			SystemMessagePromptTemplate.fromTemplate(prompt),
			HumanMessagePromptTemplate.fromTemplate("{inputText}"),
		],
		inputVariables: ["inputText"],
	});
}

export class ChainStructuredOutput implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Structured Output Chain',
		name: 'chainStructuredOutput',
		icon: 'fa:link',
		group: ['transform'],
		version: 1,
		description: 'Chain to run to output structured data following a schema',
		defaults: {
			name: 'Summarization Chain',
			color: '#432032',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Chains'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: ['main', 'document', 'languageModel'],
		inputNames: ['', 'Document', 'Language Model'],
		outputs: ['main', 'chain'],
		outputNames: ['', 'Chain'],
		credentials: [],
		properties: [
			{
				displayName:
					'This Chain depends on OpenAI functions. So it can only be used with supported OpenAI models',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Run Once for All Items',
						value: 'runOnceForAllItems',
						description: 'Run this chain only once, no matter how many input items there are',
					},
					{
						name: 'Run Once for Each Item',
						value: 'runOnceForEachItem',
						description: 'Run this chain as many times as there are input items',
					},
				],
				default: 'runOnceForAllItems',
			},
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				default: '',
				required: true,
			},
			{
				displayName: 'JSON Schema',
				name: 'jsonSchema',
				type: 'json',
				description: 'JSON Schema to structure the output.',
				default: '',
				required: true,
			}
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.verbose('Executing Vector Store QA Chain');
		const runMode = this.getNodeParameter('mode', 0) as string;
		const prompt = this.getNodeParameter('prompt', 0) as string;
		const schema = this.getNodeParameter('prompt', 0) as string;

		const model = (await getAndValidateSupplyInput(
			this,
			'languageModel',
			true,
		)) as ChatOpenAI;


		// Binding "function_call" below makes the model always call the specified function.
		// If you want to allow the model to call functions selectively, omit it.
		const functionCallingModel = model.bind({
			functions: [
				{
					name: "output_formatter",
					description: "Should always be used to properly format output",
					// @ts-ignore
					parameters: schema,
				},
			],
			function_call: { name: "output_formatter" },
		});
		const outputParser = new JsonOutputFunctionsParser();


		const items = this.getInputData();
		if (runMode === 'runOnceForAllItems') {
			const chain = prompt.pipe(functionCallingModel).pipe(outputParser);

			const response = await chain.call({
				input_documents: processedDocuments,
			});

			return this.prepareOutputData([{ json: { response } }]);
		}

		// Run for each item
		const returnData: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			let processedDocuments: Document[];
			if (documentInput instanceof N8nJsonLoader || documentInput instanceof N8nBinaryLoader) {
				processedDocuments = await documentInput.process([items[itemIndex]]);
			} else {
				processedDocuments = documentInput;
			}

			const response = await chain.call({
				input_documents: processedDocuments,
			});

			returnData.push({ json: { response } });
		}

		return this.prepareOutputData(returnData);
	}
}

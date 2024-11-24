/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { N8nCodeOutputParser } from '../../../utils/output_parsers/N8nCodeOutputParser';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';

export class OutputParserCode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Code Output Parser',
		name: 'outputParserCode',
		icon: 'fa:code',
		group: ['transform'],
		version: 1,
		description: "Parse the model's response using custom code",
		defaults: {
			name: 'Code Output Parser',
		},

		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Output Parsers'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.outputparsercode/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiOutputParser],
		outputNames: ['Output Parser'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiChain, NodeConnectionType.AiAgent]),
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'JavaScript',
						value: 'javaScript',
					},
					{
						name: 'Python (Beta)',
						value: 'python',
					},
				],
				default: 'javaScript',
			},
			{
				displayName: 'JavaScript',
				name: 'jsCode',
				type: 'string',
				displayOptions: {
					show: {
						language: ['javaScript'],
					},
				},
				typeOptions: {
					editor: 'jsEditor',
				},
				default: '// Example: convert the incoming query to uppercase and return it\nreturn query.toUpperCase()',
				hint: 'You can access the input the tool receives via the input property "query". The returned value should be a single string.',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-missing-final-period
				description: 'E.g. Converts any text to uppercase',
				noDataExpression: true,
			},
			{
				displayName: 'Python',
				name: 'pythonCode',
				type: 'string',
				displayOptions: {
					show: {
						language: ['python'],
					},
				},
				typeOptions: {
					editor: 'codeNodeEditor',
					editorLanguage: 'python',
				},
				default: '# Example: convert the incoming query to uppercase and return it\nreturn query.upper()',
				hint: 'You can access the input the tool receives via the input property "query". The returned value should be a single string.',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-missing-final-period
				description: 'E.g. Converts any text to uppercase',
				noDataExpression: true,
			},
			{
				displayName: 'Instructions',
				name: 'instructions',
				type: 'string',
				default: '',
				placeholder: '',
				typeOptions: {
					rows: 3,
				},
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const language = this.getNodeParameter('language', itemIndex) as string;
		let code = '';
		if (language === 'javaScript') {
			code = this.getNodeParameter('jsCode', itemIndex) as string;
		} else {
			code = this.getNodeParameter('pythonCode', itemIndex) as string;
		}
        const instructions = this.getNodeParameter('instructions', itemIndex) as string;
        const config = { itemIndex, code, language, instructions, nodeContext: this };
		const parser = new N8nCodeOutputParser(config);

		return {
			response: parser,
		};
	}
}

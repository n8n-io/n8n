/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
	ExecutionError,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import type { Sandbox } from 'n8n-nodes-base/dist/nodes/Code/Sandbox';
import { getSandboxContext } from 'n8n-nodes-base/dist/nodes/Code/Sandbox';
import { JavaScriptSandbox } from 'n8n-nodes-base/dist/nodes/Code/JavaScriptSandbox';
import { PythonSandbox } from 'n8n-nodes-base/dist/nodes/Code/PythonSandbox';

import { DynamicTool } from '@langchain/core/tools';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';

export class ToolCode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Code Tool',
		name: 'toolCode',
		icon: 'fa:code',
		group: ['transform'],
		version: [1, 1.1],
		description: 'Write a tool in JS or Python',
		defaults: {
			name: 'Code Tool',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
				Tools: ['Recommended Tools'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolcode/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiTool],
		outputNames: ['Tool'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiAgent]),
			{
				displayName:
					'See an example of a conversational agent with custom tool written in JavaScript <a href="/templates/1963" target="_blank">here</a>.',
				name: 'noticeTemplateExample',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'My_Tool',
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'e.g. My_Tool',
				validateType: 'string-alphanumeric',
				description:
					'The name of the function to be called, could contain letters, numbers, and underscores only',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.1 } }],
					},
				},
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				placeholder:
					'Call this tool to get a random color. The input should be a string with comma separted names of colors to exclude.',
				typeOptions: {
					rows: 3,
				},
			},

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
				default:
					'// Example: convert the incoming query to uppercase and return it\nreturn query.toUpperCase()',
				// TODO: Add proper text here later
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
					editor: 'codeNodeEditor', // TODO: create a separate `pythonEditor` component
					editorLanguage: 'python',
				},
				default:
					'# Example: convert the incoming query to uppercase and return it\nreturn query.upper()',
				// TODO: Add proper text here later
				hint: 'You can access the input the tool receives via the input property "query". The returned value should be a single string.',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-missing-final-period
				description: 'E.g. Converts any text to uppercase',
				noDataExpression: true,
			},
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		const node = this.getNode();
		const workflowMode = this.getMode();

		const name = this.getNodeParameter('name', itemIndex) as string;
		const description = this.getNodeParameter('description', itemIndex) as string;

		const language = this.getNodeParameter('language', itemIndex) as string;
		let code = '';
		if (language === 'javaScript') {
			code = this.getNodeParameter('jsCode', itemIndex) as string;
		} else {
			code = this.getNodeParameter('pythonCode', itemIndex) as string;
		}

		const getSandbox = (query: string, index = 0) => {
			const context = getSandboxContext.call(this, index);
			context.query = query;

			let sandbox: Sandbox;
			if (language === 'javaScript') {
				sandbox = new JavaScriptSandbox(context, code, index, this.helpers);
			} else {
				sandbox = new PythonSandbox(context, code, index, this.helpers);
			}

			sandbox.on(
				'output',
				workflowMode === 'manual'
					? this.sendMessageToUI.bind(this)
					: (...args: unknown[]) =>
							console.log(`[Workflow "${this.getWorkflow().id}"][Node "${node.name}"]`, ...args),
			);
			return sandbox;
		};

		const runFunction = async (query: string): Promise<string> => {
			const sandbox = getSandbox(query, itemIndex);
			return await (sandbox.runCode() as Promise<string>);
		};

		return {
			response: new DynamicTool({
				name,
				description,

				func: async (query: string): Promise<string> => {
					const { index } = this.addInputData(NodeConnectionType.AiTool, [[{ json: { query } }]]);

					let response: string = '';
					let executionError: ExecutionError | undefined;
					try {
						response = await runFunction(query);
					} catch (error: unknown) {
						executionError = error as ExecutionError;
						response = `There was an error: "${executionError.message}"`;
					}

					if (typeof response === 'number') {
						response = (response as number).toString();
					}

					if (typeof response !== 'string') {
						// TODO: Do some more testing. Issues here should actually fail the workflow
						executionError = new NodeOperationError(this.getNode(), 'Wrong output type returned', {
							description: `The response property should be a string, but it is an ${typeof response}`,
						});
						response = `There was an error: "${executionError.message}"`;
					}

					if (executionError) {
						void this.addOutputData(NodeConnectionType.AiTool, index, executionError);
					} else {
						void this.addOutputData(NodeConnectionType.AiTool, index, [[{ json: { response } }]]);
					}
					return response;
				},
			}),
		};
	}
}

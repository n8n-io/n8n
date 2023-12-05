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

import { DynamicTool } from 'langchain/tools';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';

export class ToolCode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Custom Code Tool',
		name: 'toolCode',
		icon: 'fa:code',
		group: ['transform'],
		version: 1,
		description: 'Write a tool in JS or Python',
		defaults: {
			name: 'Custom Code Tool',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
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
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'My_Tool',
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
					editor: 'codeNodeEditor',
					editorLanguage: 'javaScript',
				},
				default: '',
				// TODO: Add proper text here later
				hint: 'You can access the input the tool receives via the input property "query". The returned value should be a single string.',
				description:
					'JavaScript code to execute.<br><br>Tip: You can use luxon vars like <code>$today</code> for dates and <code>$jmespath</code> for querying JSON structures. <a href="https://docs.n8n.io/nodes/n8n-nodes-base.function">Learn more</a>.',
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
				default: '',
				// TODO: Add proper text here later
				hint: 'You can access the input the tool receives via the input property "query". The returned value should be a single string.',
				description:
					'Python code to execute.<br><br>Tip: You can use built-in methods and variables like <code>_today</code> for dates and <code>_jmespath</code> for querying JSON structures. <a href="https://docs.n8n.io/code/builtin/">Learn more</a>.',
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
			return sandbox.runCode() as Promise<string>;
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
						executionError = new NodeOperationError(
							this.getNode(),
							`The code did not return a valid value. Instead of a string did a value of type '${typeof response}' get returned.`,
						);
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

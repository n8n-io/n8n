/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';
import { ExecutionError, NodeOperationError } from 'n8n-workflow';
import { DynamicTool } from 'langchain/tools';
import { getSandboxContext, Sandbox } from 'n8n-nodes-base/dist/nodes/Code/Sandbox';
import { JavaScriptSandbox } from 'n8n-nodes-base/dist/nodes/Code/JavaScriptSandbox';
import { PythonSandbox } from 'n8n-nodes-base/dist/nodes/Code/PythonSandbox';

export class LangChainDynamicTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain - DynamicTool',
		name: 'langChainDynamicTool',
		icon: 'fa:screwdriver-wrench',
		group: ['transform'],
		version: 1,
		description: 'DynamicTool',
		defaults: {
			name: 'LangChain - DynamicTool',
			color: '#400080',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['tool'],
		outputNames: ['Tool'],
		properties: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'My Tool',
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
				hint: 'Use "query" to get the input the tool received, and return a single string as output.',
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
				hint: 'Use "query" to get the input the tool received, and return a single string as output.',
				description:
					'Python code to execute.<br><br>Tip: You can use luxon vars like <code>_today</code> for dates and <code>$_mespath</code> for querying JSON structures. <a href="https://docs.n8n.io/nodes/n8n-nodes-base.function">Learn more</a>.',
				noDataExpression: true,
			},
		],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		const itemIndex = 0;

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
					? this.sendMessageToUI
					: (...args) =>
							console.log(`[Workflow "${this.getWorkflow().id}"][Node "${node.name}"]`, ...args),
			);
			return sandbox;
		};

		return {
			response: new DynamicTool({
				name,
				description,

				func: async (query: string): Promise<string> => {
					this.addInputData('tool', [[{ json: { query } }]]);

					const sandbox = getSandbox(query, itemIndex);

					let response: string = '';
					let executionError: ExecutionError | undefined;
					try {
						// @ts-ignore
						response = await sandbox.runCode();
					} catch (error) {
						executionError = error;
						response = `There was an error: "${error.message}"`;
					}

					if (typeof response === 'number') {
						response = (response as number).toString();
					}

					if (typeof response !== 'string') {
						executionError = new NodeOperationError(
							this.getNode(),
							`The code did not return a valid value. Instead of a string did a value of type '${typeof response}' get returned.`,
						);
						response = `There was an error: "${executionError!.message}"`;
					}

					if (executionError) {
						this.addOutputData('tool', [[{ json: { error: executionError } }]]);
					} else {
						this.addOutputData('tool', [[{ json: { response } }]]);
					}
					return response;
				},
			}),
		};
	}
}

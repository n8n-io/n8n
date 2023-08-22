/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type {
	IExecuteFunctions,
	IExecuteWorkflowInfo,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IWorkflowBase,
	SupplyData,
} from 'n8n-workflow';
import { ExecutionError, NodeOperationError } from 'n8n-workflow';
import { getSandboxContext, Sandbox } from 'n8n-nodes-base/dist/nodes/Code/Sandbox';
import { JavaScriptSandbox } from 'n8n-nodes-base/dist/nodes/Code/JavaScriptSandbox';
import { PythonSandbox } from 'n8n-nodes-base/dist/nodes/Code/PythonSandbox';

import { DynamicTool } from 'langchain/tools';
import get from 'lodash/get';

export class ToolDynamicTool implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain - DynamicTool',
		name: 'dynamicTool',
		icon: 'fa:screwdriver',
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
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Code',
						value: 'code',
					},
					{
						name: 'Execute Workflow',
						value: 'executeWorkflow',
					},
				],
				default: 'code',
			},

			{
				displayName:
					'The workflow will receive "query" as input and the output of the last node will be returned as response',
				name: 'executeNotice',
				type: 'notice',
				default: '',
			},

			// Execute Workflow
			{
				displayName: 'Source',
				name: 'source',
				type: 'options',
				displayOptions: {
					show: {
						mode: ['executeWorkflow'],
					},
				},
				options: [
					{
						name: 'Database',
						value: 'database',
						description: 'Load the workflow from the database by ID',
					},
					{
						name: 'Parameter',
						value: 'parameter',
						description: 'Load the workflow from a parameter',
					},
				],
				default: 'database',
				description: 'Where to get the workflow to execute from',
			},

			// ----------------------------------
			//         source:database
			// ----------------------------------
			{
				displayName: 'Workflow ID',
				name: 'workflowId',
				type: 'string',
				displayOptions: {
					show: {
						mode: ['executeWorkflow'],
						source: ['database'],
					},
				},
				default: '',
				required: true,
				description: 'The workflow to execute',
			},

			// ----------------------------------
			//         source:parameter
			// ----------------------------------
			{
				displayName: 'Workflow JSON',
				name: 'workflowJson',
				type: 'string',
				typeOptions: {
					editor: 'json',
					rows: 10,
				},
				displayOptions: {
					show: {
						mode: ['executeWorkflow'],
						source: ['parameter'],
					},
				},
				default: '\n\n\n',
				required: true,
				description: 'The workflow JSON code to execute',
			},
			{
				displayName: 'Response Property Name',
				name: 'responsePropertyName',
				type: 'string',
				displayOptions: {
					show: {
						mode: ['executeWorkflow'],
					},
				},
				default: 'response',
				description: 'The name of the property of the last node that will be returned as response',
			},

			// Code
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				displayOptions: {
					show: {
						mode: ['code'],
					},
				},
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
						mode: ['code'],
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
						mode: ['code'],
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
		const mode = this.getNodeParameter('mode', itemIndex) as string;

		let runFunction: (query: string) => Promise<string>;

		if (mode === 'code') {
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

			runFunction = async (query: string): Promise<string> => {
				const sandbox = getSandbox(query, itemIndex);
				return sandbox.runCode();
			};
		} else if (mode === 'executeWorkflow') {
			runFunction = async (query: string): Promise<string> => {
				try {
					const source = this.getNodeParameter('source', itemIndex) as string;
					const responsePropertyName = this.getNodeParameter(
						'responsePropertyName',
						itemIndex,
					) as string;

					const workflowInfo: IExecuteWorkflowInfo = {};
					if (source === 'database') {
						// Read workflow from database
						workflowInfo.id = this.getNodeParameter('workflowId', 0) as string;
					} else if (source === 'parameter') {
						// ReworkflowInfoad workflow from parameter
						const workflowJson = this.getNodeParameter('workflowJson', 0) as string;
						workflowInfo.code = JSON.parse(workflowJson) as IWorkflowBase;
					}

					const items = [{ json: { query } }] as INodeExecutionData[];

					const receivedData = await this.executeWorkflow(workflowInfo, items);

					let response = get(receivedData, [0, 0, 'json', responsePropertyName]);
					if (response === undefined) {
						response = `There was an error: "The workflow did not return an item with the property '${responsePropertyName}'"`;
					}

					return response;
				} catch (error) {
					return `There was an error: "${error.message}"`;
				}
			};
		}

		return {
			response: new DynamicTool({
				name,
				description,

				func: async (query: string): Promise<string> => {
					this.addInputData('tool', [[{ json: { query } }]]);

					let response: string = '';
					let executionError: ExecutionError | undefined;
					try {
						response = await runFunction(query);
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

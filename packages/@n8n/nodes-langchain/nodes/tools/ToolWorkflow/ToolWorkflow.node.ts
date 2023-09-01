import type {
	IExecuteFunctions,
	IExecuteWorkflowInfo,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IWorkflowBase,
	SupplyData,
	ExecutionError,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { DynamicTool } from 'langchain/tools';
import get from 'lodash/get';

export class ToolWorkflow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Workflow Tool',
		name: 'toolWorkflow',
		icon: 'fa:screwdriver',
		group: ['transform'],
		version: 1,
		description: 'Create a tool via a workflow',
		defaults: {
			name: 'Workflow Tool',
			color: '#400080',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
			},
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
				displayName:
					'The workflow will receive "query" as input and the output of the last node will be returned as response',
				name: 'executeNotice',
				type: 'notice',
				default: '',
			},

			{
				displayName: 'Source',
				name: 'source',
				type: 'options',
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
				default: 'response',
				description: 'The name of the property of the last node that will be returned as response',
			},
		],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		const itemIndex = 0;

		const name = this.getNodeParameter('name', itemIndex) as string;
		const description = this.getNodeParameter('description', itemIndex) as string;

		const runFunction = async (query: string): Promise<string> => {
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

		return {
			response: new DynamicTool({
				name,
				description,

				func: async (query: string): Promise<string> => {
					void this.addInputData('tool', [[{ json: { query } }]]);

					let response: string = '';
					let executionError: ExecutionError | undefined;
					try {
						response = await runFunction(query);
					} catch (error) {
						// TODO: Do some more testing. Issues here should actually fail the workflow
						executionError = error;
						response = `There was an error: "${error.message}"`;
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
						void this.addOutputData('tool', [[{ json: { error: executionError } }]]);
					} else {
						void this.addOutputData('tool', [[{ json: { response } }]]);
					}
					return response;
				},
			}),
		};
	}
}

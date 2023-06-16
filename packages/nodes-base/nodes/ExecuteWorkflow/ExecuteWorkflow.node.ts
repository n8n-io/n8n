import { readFile as fsReadFile } from 'fs/promises';

import type {
	IExecuteFunctions,
	IExecuteWorkflowInfo,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IWorkflowBase,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export class ExecuteWorkflow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Execute Workflow',
		name: 'executeWorkflow',
		icon: 'fa:sign-in-alt',
		group: ['transform'],
		version: 1,
		subtitle: '={{"Workflow: " + $parameter["workflowId"]}}',
		description: 'Execute another workflow',
		defaults: {
			name: 'Execute Workflow',
			color: '#ff6d5a',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'hidden',
				noDataExpression: true,
				default: 'call_workflow',
				options: [
					{
						name: 'Call Another Workflow',
						value: 'call_workflow',
					},
				],
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
						name: 'Local File',
						value: 'localFile',
						description: 'Load the workflow from a locally saved file',
					},
					{
						name: 'Parameter',
						value: 'parameter',
						description: 'Load the workflow from a parameter',
					},
					{
						name: 'URL',
						value: 'url',
						description: 'Load the workflow from an URL',
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
			//         source:localFile
			// ----------------------------------
			{
				displayName: 'Workflow Path',
				name: 'workflowPath',
				type: 'string',
				displayOptions: {
					show: {
						source: ['localFile'],
					},
				},
				default: '',
				placeholder: '/data/workflow.json',
				required: true,
				description: 'The path to local JSON workflow file to execute',
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

			// ----------------------------------
			//         source:url
			// ----------------------------------
			{
				displayName: 'Workflow URL',
				name: 'workflowUrl',
				type: 'string',
				displayOptions: {
					show: {
						source: ['url'],
					},
				},
				default: '',
				placeholder: 'https://example.com/workflow.json',
				required: true,
				description: 'The URL from which to load the workflow from',
			},
			{
				displayName:
					'Any data you pass into this node will be output by the Execute Workflow Trigger. <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow/" target="_blank">More info</a>',
				name: 'executeWorkflowNotice',
				type: 'notice',
				default: '',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const source = this.getNodeParameter('source', 0) as string;

		const workflowInfo: IExecuteWorkflowInfo = {};

		try {
			if (source === 'database') {
				// Read workflow from database
				workflowInfo.id = this.getNodeParameter('workflowId', 0) as string;
			} else if (source === 'localFile') {
				// Read workflow from filesystem
				const workflowPath = this.getNodeParameter('workflowPath', 0) as string;

				let workflowJson;
				try {
					workflowJson = await fsReadFile(workflowPath, { encoding: 'utf8' });
				} catch (error) {
					if (error.code === 'ENOENT') {
						throw new NodeOperationError(
							this.getNode(),
							`The file "${workflowPath}" could not be found.`,
						);
					}

					throw error;
				}

				workflowInfo.code = JSON.parse(workflowJson) as IWorkflowBase;
			} else if (source === 'parameter') {
				// Read workflow from parameter
				const workflowJson = this.getNodeParameter('workflowJson', 0) as string;
				workflowInfo.code = JSON.parse(workflowJson) as IWorkflowBase;
			} else if (source === 'url') {
				// Read workflow from url
				const workflowUrl = this.getNodeParameter('workflowUrl', 0) as string;

				const requestOptions = {
					headers: {
						accept: 'application/json,text/*;q=0.99',
					},
					method: 'GET',
					uri: workflowUrl,
					json: true,
					gzip: true,
				};

				const response = await this.helpers.request(requestOptions);
				workflowInfo.code = response;
			}

			const receivedData = await this.executeWorkflow(workflowInfo, items);

			return receivedData;
		} catch (error) {
			if (this.continueOnFail()) {
				return this.prepareOutputData([{ json: { error: error.message } }]);
			}

			throw error;
		}
	}
}

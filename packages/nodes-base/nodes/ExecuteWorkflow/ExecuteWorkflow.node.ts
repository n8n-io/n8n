import type {
	IExecuteFunctions,
	IExecuteWorkflowInfo,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { getWorkflowInfo } from './GenericFunctions';

export class ExecuteWorkflow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Execute Workflow',
		name: 'executeWorkflow',
		icon: 'fa:sign-in-alt',
		group: ['transform'],
		version: [1, 1.1],
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
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Run Once for All Items',
						value: 'runOnceForAllItems',
					},
					{
						name: 'Run Once for Each Item',
						value: 'runOnceForEachItem',
					},
				],
				default: 'runOnceForAllItems',
			},
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
		const source = this.getNodeParameter('source', 0) as string;
		const mode = this.getNodeParameter('mode', 0) as string;

		try {
			const items = this.getInputData();
			if (mode === 'runOnceForAllItems') {
				const workflowInfo: IExecuteWorkflowInfo = await getWorkflowInfo.call(this, source);
				return await this.executeWorkflow(workflowInfo, items);
			} else {
				const returnData = [];
				for (let i = 0; i < items.length; i++) {
					const workflowInfo: IExecuteWorkflowInfo = await getWorkflowInfo.call(this, source, i);
					returnData.push((await this.executeWorkflow(workflowInfo, [items[i]]))[0]);
				}
				return [returnData.flat()];
			}
			// } else {
			// 	const returnData = [];
			// 	for (let i = 0; i < items.length; i++) {
			// 		const workflowInfo: IExecuteWorkflowInfo = await getWorkflowInfo.call(this, source, i);
			// 		returnData.push(await this.executeWorkflow(workflowInfo, items));
			// 	}
			// 	return [returnData.flat().flat()];
			// }
		} catch (error) {
			if (this.continueOnFail()) {
				return [[{ json: { error: error.message } }]];
			}
			throw error;
		}
	}
}

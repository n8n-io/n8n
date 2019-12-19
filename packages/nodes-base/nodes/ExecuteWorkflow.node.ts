import { OptionsWithUri } from 'request';

import { IExecuteFunctions } from 'n8n-core';
import {
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';


export class ExecuteWorkflow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Execute Workflow',
		name: 'executeWorkflow',
		icon: 'fa:network-wired',
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
				displayName: 'Workflow',
				name: 'workflowId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getWorkflows',
				},
				default: '',
				required: true,
				description: 'The workflow to execute.',
			},
		]
	};

	methods = {
		loadOptions: {
			async getWorkflows(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const options: OptionsWithUri = {
					method: 'GET',
					uri: this.getRestApiUrl() + '/workflows',
					json: true
				};

				const returnData: INodePropertyOptions[] = [];

				const responseData = await this.helpers.request!(options);
				for (const workflowData of responseData.data) {
					returnData.push({
						name: workflowData.name,
						value: workflowData.id,
					});
				}

				return returnData;
			}
		},
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const workflowId = this.getNodeParameter('workflowId', 0) as string;
		const receivedData = await this.executeWorkflow(workflowId, items);

		return receivedData;
	}
}

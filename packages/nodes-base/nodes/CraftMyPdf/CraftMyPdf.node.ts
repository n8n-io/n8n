import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

import { accountOperations } from './descriptions/AccountDescription';
import { craftMyPdfApiRequest } from './GenericFunctions';

export class CraftMyPdf implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'CraftMyPdf',
		name: 'craftMyPdf',
		icon: 'file:craftMyPdf.svg',
		group: ['transform'],
		version: 1,
		description: 'Consume the CraftMyPDF API',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'CraftMyPDF',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'craftMyPdfApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Account',
						value: 'account',
					},
					{
						name: 'Transaction',
						value: 'transaction',
					},
				],
				default: 'account',
			},

			...accountOperations,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][] | null> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let responseData;

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'account') {
					if (operation === 'get') {
						// Account Management API: Get account info
						// https://craftmypdf.com/docs/index.html#tag/Account-Management-API/operation/get-account-info
						responseData = await craftMyPdfApiRequest.call(this, 'GET', '/get-account-info');

						returnData.push(responseData as INodeExecutionData);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message, json: {} });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}

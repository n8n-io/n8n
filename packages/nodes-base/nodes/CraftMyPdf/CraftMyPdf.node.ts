import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

import { accountOperations } from './descriptions/AccountDescription';
import { imageFields, imageOperations } from './descriptions/ImageDescription';
import { transactionFields, transactionOperations } from './descriptions/TransactionDescription';
import { craftMyPdfApiRequest, validateJSON } from './GenericFunctions';

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
						name: 'Image',
						value: 'image',
					},
					{
						name: 'Transaction',
						value: 'transaction',
					},
				],
				default: 'account',
			},

			...accountOperations,

			...imageOperations,
			...imageFields,

			...transactionOperations,
			...transactionFields,
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
				if (resource === 'image') {
					if (operation === 'create') {
						// Image Generation API: Create an image
						// https://craftmypdf.com/docs/index.html#tag/Image-Generation-API/operation/create-image
						const data = validateJSON(this.getNodeParameter('data', i) as string);
						if (data === undefined) {
							throw new NodeOperationError(this.getNode(), 'Data: Invalid JSON', {
								itemIndex: i,
							});
						}
						const export_type = this.getNodeParameter('export_type', i) as string;
						const output_file = this.getNodeParameter('output_file', i) as string;

						const body = {
							template_id: this.getNodeParameter('templateId', i) as string,
							data,
							load_data_from: this.getNodeParameter('load_data_from', i) as string,
							version: this.getNodeParameter('version', i) as string,
							export_type,
							expiration: this.getNodeParameter('expiration', i) as string,
							output_file,
							output_type: this.getNodeParameter('output_type', i) as string,
						};

						if (export_type === 'json') {
							responseData = await craftMyPdfApiRequest.call(
								this,
								'POST',
								'/create-image',
								{},
								body,
							);
							returnData.push(responseData as INodeExecutionData);
						}
						if (export_type === 'file') {
							responseData = await craftMyPdfApiRequest.call(
								this,
								'POST',
								'/create-image',
								{},
								body,
								{
									useStream: true,
									resolveWithFullResponse: true,
									encoding: null,
									json: false,
								},
							);

							const binaryData = await this.helpers.prepareBinaryData(
								responseData.body as Buffer,
								output_file,
							);
							returnData.push({
								json: {},
								binary: {
									[output_file]: binaryData,
								},
							});
						}
					}
				}
				if (resource === 'transaction') {
					if (operation === 'list') {
						// Account Management API: List transactions
						// https://craftmypdf.com/docs/index.html#tag/Account-Management-API/operation/list-transactions
						responseData = await craftMyPdfApiRequest.call(this, 'GET', '/list-transactions');

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

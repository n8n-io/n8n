import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	awsApiRequestREST,
	IExpenseDocument,
	simplify,
} from './GenericFunctions';

export class AwsTextract implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Textract',
		name: 'awsTextract',
		icon: 'file:textract.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Sends data to Amazon Textract',
		defaults: {
			name: 'AWS Textract',
			color: '#5aa08d',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Document',
						value: 'document',
					},
				],
				default: 'document',
				description: 'The resource to perform',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'analyze Expense',
						value: 'analyzeExpense',
					},
				],
				default: 'analyzeExpense',
				description: 'The operation to perform',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				displayOptions: {
					show: {
						resource: [
							'document',
						],
						operation: [
							'analyzeExpense',
						],
					},
				},
				description: 'Object property name which holds binary data',
				required: true,
			},
			{
				displayName: 'Simplify Response',
				name: 'simple',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: [
							'document',
						],
						operation: [
							'analyzeExpense',
						],
					},
				},
				default: true,
				description: 'Return a simplified version of the response instead of the raw data.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'document') {
					//https://docs.aws.amazon.com/textract/latest/dg/API_AnalyzeExpense.html
					if (operation === 'analyzeExpense') {
						const binaryProperty = this.getNodeParameter('binaryPropertyName', i) as string;
						const simple = this.getNodeParameter('simple', i) as boolean;

						if (items[i].binary === undefined) {
							throw new NodeOperationError(this.getNode(), 'No binary data exists on item!');
						}

						if ((items[i].binary as IBinaryKeyData)[binaryProperty] === undefined) {
							throw new NodeOperationError(this.getNode(), `No binary data property "${binaryProperty}" does not exists on item!`);
						}

						const binaryPropertyData = (items[i].binary as IBinaryKeyData)[binaryProperty];

						const body: IDataObject = {
							Document: {
								Bytes: binaryPropertyData.data,
							},
						};
						
						const action = 'Textract.AnalyzeExpense';
						responseData = await awsApiRequestREST.call(this, 'textract', 'POST', '', JSON.stringify(body), { 'x-amz-target': action, 'Content-Type': 'application/x-amz-json-1.1' }) as IExpenseDocument;
						if (simple) {
							responseData = simplify(responseData);
						}
					}
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as unknown as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}

import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IBinaryKeyData,
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {
	awsApiRequestREST,
	IExpenseDocument,
	simplify,
	validateCrendetials,
} from './GenericFunctions';

export class AwsTextract implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Textract',
		name: 'awsTextract',
		icon: 'file:textract.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Sends data to Amazon Textract',
		defaults: {
			name: 'AWS Textract',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'aws',
				required: true,
				testedBy: 'awsTextractApiCredentialTest',
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Analyze Receipt or Invoice',
						value: 'analyzeExpense',
					},
				],
				default: 'analyzeExpense',
				description: '',
			},
			{
				displayName: 'Input Data Field Name',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				displayOptions: {
					show: {
						operation: [
							'analyzeExpense',
						],
					},
				},
				required: true,
				description: 'The name of the input field containing the binary file data to be uploaded. Supported file types: PNG, JPEG',
			},
			{
				displayName: 'Simplify Response',
				name: 'simple',
				type: 'boolean',
				displayOptions: {
					show: {
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

	methods = {
		credentialTest: {
			async awsTextractApiCredentialTest(this: ICredentialTestFunctions, credential: ICredentialsDecrypted): Promise<INodeCredentialTestResult> {
				try {
					await validateCrendetials.call(this, credential.data as ICredentialDataDecryptedObject, 'sts');
				} catch (error) {
					return {
						status: 'Error',
						message: 'The security token included in the request is invalid',
					};
				}

				return {
					status: 'OK',
					message: 'Connection successful!',
				};
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < items.length; i++) {
			try {
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

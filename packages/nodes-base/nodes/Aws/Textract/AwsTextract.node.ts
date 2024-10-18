import {
	NodeConnectionType,
	type ICredentialDataDecryptedObject,
	type ICredentialsDecrypted,
	type ICredentialTestFunctions,
	type IDataObject,
	type IExecuteFunctions,
	type INodeCredentialTestResult,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import type { IExpenseDocument } from './GenericFunctions';
import { awsApiRequestREST, simplify, validateCredentials } from './GenericFunctions';

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
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Analyze Receipt or Invoice',
						value: 'analyzeExpense',
					},
					{
						name: 'Analyze Document',
						value: 'analyzeDocument',
					},
				],
				default: 'analyzeExpense',
			},
			{
				displayName: 'Input Data Field Name',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				displayOptions: {
					show: {
						operation: ['analyzeExpense', 'analyzeDocument'],
					},
				},
				required: true,
				description:
					'The name of the input field containing the binary file data to be uploaded. Supported file types: PNG, JPEG.',
			},
			{
				displayName: 'Simplify',
				name: 'simple',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['analyzeExpense'],
					},
				},
				default: true,
				description:
					'Whether to return a simplified version of the response instead of the raw data',
			},
			{
				displayName: 'Feature Types',
				name: 'featureTypes',
				type: 'multiOptions',
				noDataExpression: true,
				options: [
					{
						name: 'Forms',
						value: 'FORMS',
					},
					{
						name: 'Tables',
						value: 'TABLES',
					},
					{
						name: 'Queries',
						value: 'QUERIES',
					},
				],
				default: ['FORMS', 'TABLES', 'QUERIES'], // Initially selected options
				description: 'A list of the types of analysis to perform',
				displayOptions: {
					// the resources and operations to display this element with
					show: {
						operation: ['analyzeDocument'],
					},
				},
			},
			{
				displayName: 'Queries Config',
				name: 'queriesConfig',
				placeholder: 'Add Queries Config',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				description: 'Contains Queries and the alias for those Queries, as determined by the input',
				options: [
					{
						name: 'addedQueries',
						displayName: 'Queries Config',
						values: [
							{
								displayName: 'Query',
								name: 'Alias',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Text',
								name: 'Text',
								type: 'string',
								default: '',
								description: 'Text of the query to add',
							},
						],
					},
				],
				displayOptions: {
					// the resources and operations to display this element with
					show: {
						operation: ['analyzeDocument'],
					},
				},
			},
		],
	};

	methods = {
		credentialTest: {
			async awsTextractApiCredentialTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				try {
					await validateCredentials.call(
						this,
						credential.data as ICredentialDataDecryptedObject,
						'sts',
					);
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
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < items.length; i++) {
			try {
				//https://docs.aws.amazon.com/textract/latest/dg/API_AnalyzeExpense.html
				if (operation === 'analyzeExpense') {
					const simple = this.getNodeParameter('simple', i) as boolean;
					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
					const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);

					const body: IDataObject = {
						Document: {
							Bytes: binaryData.data,
						},
					};

					const action = 'Textract.AnalyzeExpense';
					responseData = (await awsApiRequestREST.call(
						this,
						'textract',
						'POST',
						'',
						JSON.stringify(body),
						{ 'x-amz-target': action, 'Content-Type': 'application/x-amz-json-1.1' },
					)) as IExpenseDocument;
					if (simple) {
						responseData = simplify(responseData);
					}
				}
				//https://docs.aws.amazon.com/textract/latest/dg/API_AnalyzeDocument.html
				else if (operation === 'analyzeDocument') {
					const binaryProperty = this.getNodeParameter('binaryPropertyName', i) as string;
					const queriesConfig = this.getNodeParameter('queriesConfig', i) as IQueriesConfig;
					if (items[i].binary === undefined) {
						throw new NodeOperationError(this.getNode(), 'No binary data exists on item!', {
							itemIndex: i,
						});
					}

					if ((items[i].binary as IBinaryKeyData)[binaryProperty] === undefined) {
						throw new NodeOperationError(
							this.getNode(),
							`No binary data property "${binaryProperty}" does not exists on item!`,
							{ itemIndex: i },
						);
					}

					const binaryPropertyData = (items[i].binary as IBinaryKeyData)[binaryProperty];

					const body: IDataObject = {
						Document: {
							Bytes: binaryPropertyData.data,
						},
						FeatureTypes: this.getNodeParameter('featureTypes', i) as Array<String>,
						QueriesConfig: {
							Queries: queriesConfig.addedQueries,
						},
					};

					const action = 'Textract.AnalyzeDocument';
					responseData = (await awsApiRequestREST.call(
						this,
						'textract',
						'POST',
						'',
						JSON.stringify(body),
						{ 'x-amz-target': action, 'Content-Type': 'application/x-amz-json-1.1' },
					)) as IExpenseDocument;
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

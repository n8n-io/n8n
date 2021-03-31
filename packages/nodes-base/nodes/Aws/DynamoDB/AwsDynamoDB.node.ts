import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	awsApiRequestREST,
} from '../GenericFunctions';

import {
	operationFields,
} from './OperationDescription';

import {
	IAttributeValueUi,
	IRequestBody,
	PartitionKeyDetails,
} from './types';

import {
	adjustExpressionAttributeValues,
	simplifyItem,
	validateJSON,
} from './utils';

export class AwsDynamoDB implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS DynamoDB',
		name: 'awsDynamoDb',
		icon: 'file:dynamodb.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Consume the AWS DynamoDB API',
		defaults: {
				name: 'AWS DynamoDB',
				color: '#2273b9',
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
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				description: 'Operation to perform.',
				default: 'get',
				options: [
					{
						name: 'Create/Update',
						value: 'createUpdate',
						description: 'Create or update an item in a table.',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete an item from a table.',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve an item from a table.',
					},
					{
						name: 'Query',
						value: 'query',
						description: 'Retrieve all items based on a partition key.',
					},
					{
						name: 'Scan',
						value: 'scan',
						description: 'Retrieve all items based on any property.',
					},
				],
			},
			...operationFields,
		],
	};

	methods = {
		loadOptions: {
			async getTables(this: ILoadOptionsFunctions) {
				const headers = {
					'Content-Type': 'application/x-amz-json-1.0',
					'X-Amz-Target': 'DynamoDB_20120810.ListTables',
				};

				const responseData = await awsApiRequestREST.call(this, 'dynamodb', 'POST', '/', JSON.stringify({}), headers);

				return responseData.TableNames.map((table: string) => ({ name: table, value: table }));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const operation = this.getNodeParameter('operation', 0);

		let responseData;
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {

			if (operation === 'createUpdate') {

				// ----------------------------------
				//          createUpdate
				// ----------------------------------

				// https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html

				// ...

			} else if (operation === 'delete') {

				// ----------------------------------
				//              delete
				// ----------------------------------

				// https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_DeleteItem.html

				const partitionKeyName = this.getNodeParameter('partitionKeyName', i) as string;
				const partitionKeyType = this.getNodeParameter('partitionKeyType', i) as string;

				const body: IRequestBody = {
					TableName: this.getNodeParameter('tableName', i) as string,
					Key: {
						[partitionKeyName]: {
							[partitionKeyType]: this.getNodeParameter('partitionKeyValue', i) as string,
						},
					},
				};

				const headers = {
					'Content-Type': 'application/x-amz-json-1.0',
					'X-Amz-Target': 'DynamoDB_20120810.DeleteItem',
				};

				responseData = await awsApiRequestREST.call(this, 'dynamodb', 'POST', '/', JSON.stringify(body), headers);
				responseData = { success: true };

			} else if (operation === 'get') {

				// ----------------------------------
				//              get
				// ----------------------------------

				// https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_GetItem.html

				const jsonEnabled = this.getNodeParameter('jsonEnabled', 0) as boolean;

				const body: IRequestBody = {
					TableName: this.getNodeParameter('tableName', i) as string,
				};

				if (jsonEnabled) {

					const jsonItem = this.getNodeParameter('jsonItem', i) as string;
					body.Key = validateJSON(jsonItem);

				} else {

					const partitionKey = this.getNodeParameter('partitionKey', i) as PartitionKeyDetails;

					if (!partitionKey.details) {
						throw new Error('Please specify name, type and value of the partition key for the item to retrieve.');
					}

					const { name, type, value } = partitionKey.details;

					if ([name, type, value].some(property => property === undefined)) {
						throw new Error('Please specify name, type and value of the partition key for the item to retrieve.');
					}

					body.Key = {
						[name]: {
							[type]: value,
						},
					};

				}

				const additionalFields = this.getNodeParameter('additionalFields', i) as {
					readConsistencyModel: 'eventuallyConsistent' | 'stronglyConsistent';
				};

				if (additionalFields.readConsistencyModel) {
					body.ConsistentRead = additionalFields.readConsistencyModel === 'stronglyConsistent';
				}

				const headers = {
					'Content-Type': 'application/x-amz-json-1.0',
					'X-Amz-Target': 'DynamoDB_20120810.GetItem',
				};

				responseData = await awsApiRequestREST.call(this, 'dynamodb', 'POST', '/', JSON.stringify(body), headers);

				if (!responseData.Item) {
					responseData = [];
				}

				const simple = this.getNodeParameter('simple', 0) as boolean;

				if (responseData.Item && simple) {
					responseData = simplifyItem(responseData.Item);
				}

			} else if (operation === 'query') {

				// ----------------------------------
				//             query
				// ----------------------------------

				// https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html

				const eavUi = this.getNodeParameter('expressionAttributeValues.details', i) as IAttributeValueUi[];

				const body: IRequestBody = {
					TableName: this.getNodeParameter('tableName', i) as string,
					KeyConditionExpression: this.getNodeParameter('keyConditionExpression', i) as string,
					ExpressionAttributeValues: adjustExpressionAttributeValues(eavUi),
					ConsistentRead: true,
				};

				const {
					projectionExpression,
					indexName,
				} = this.getNodeParameter('additionalFields', i) as {
					projectionExpression: string;
					indexName: string;
				};

				if (projectionExpression) {
					body.ProjectionExpression = projectionExpression;
				}

				if (indexName) {
					body.IndexName = indexName;
				}

				const headers = {
					'Content-Type': 'application/x-amz-json-1.0',
					'X-Amz-Target': 'DynamoDB_20120810.Query',
				};

				responseData = await awsApiRequestREST.call(this, 'dynamodb', 'POST', '/', JSON.stringify(body), headers);

				if (responseData.Items) {
					responseData = responseData.Items.map(simplifyItem);
				}

			} else if (operation === 'scan') {

				// ----------------------------------
				//             scan
				// ----------------------------------

				// https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html

				const body: IRequestBody = {
					TableName: this.getNodeParameter('tableName', i) as string,
					ConsistentRead: true,
				};

				const {
					expressionAttributeValues: { details: eav },
					filterExpression,
					keyConditionExpression,
					projectionExpression,
				} = this.getNodeParameter('additionalFields', i) as {
					expressionAttributeValues: { details: IAttributeValueUi[] };
					filterExpression: string;
					keyConditionExpression: string;
					projectionExpression: string;
				};

				if (eav) {
					body.ExpressionAttributeValues = adjustExpressionAttributeValues(eav);
				}

				if (filterExpression) {
					body.FilterExpression = filterExpression;
				}

				if (keyConditionExpression) {
					body.KeyConditionExpression = keyConditionExpression;
				}

				if (projectionExpression) {
					body.ProjectionExpression = projectionExpression;
				}

				const headers = {
					'X-Amz-Target': 'DynamoDB_20120810.Scan',
					'Content-Type': 'application/x-amz-json-1.0',
				};

				responseData = await awsApiRequestREST.call(this, 'dynamodb', 'POST', '/', JSON.stringify(body), headers);

				if (responseData.Items) {
					responseData = responseData.Items.map(simplifyItem);
				}

			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];

	}
}

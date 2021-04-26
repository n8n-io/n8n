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
} from './types';

import {
	adjustExpressionAttributeValues,
	populatePartitionKey,
	simplify,
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
						description: 'Retrieve items based on a partition key.',
					},
					{
						name: 'Scan',
						value: 'scan',
						description: 'Retrieve items based on any property.',
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

				const eavUi = this.getNodeParameter('expressionAttributeValues.details', i) as IAttributeValueUi[];

				const body: IRequestBody = {
					TableName: this.getNodeParameter('tableName', i) as string,
					ConditionExpression: this.getNodeParameter('conditionExpression', i) as string,
					ExpressionAttributeValues: adjustExpressionAttributeValues(eavUi),
				};

				body.Item = items[i].json;

				const headers = {
					'Content-Type': 'application/x-amz-json-1.0',
					'X-Amz-Target': 'DynamoDB_20120810.PutItem',
				};

				console.log(body);

				responseData = await awsApiRequestREST.call(this, 'dynamodb', 'POST', '/', JSON.stringify(body), headers);
				responseData = { success: true };

			} else if (operation === 'delete') {

				// ----------------------------------
				//              delete
				// ----------------------------------

				// https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_DeleteItem.html

				const body: IRequestBody = {
					TableName: this.getNodeParameter('tableName', i) as string,
				};

				const jsonEnabled = this.getNodeParameter('jsonEnabled', 0) as boolean;

				if (jsonEnabled) {
					const jsonItem = this.getNodeParameter('jsonItem', i) as string;
					body.Key = validateJSON(jsonItem);
				} else {
					body.Key = populatePartitionKey.call(this, i);
				}

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

				const body: IRequestBody = {
					TableName: this.getNodeParameter('tableName', i) as string,
				};

				const jsonEnabled = this.getNodeParameter('jsonEnabled', 0) as boolean;

				if (jsonEnabled) {
					const jsonItem = this.getNodeParameter('jsonItem', i) as string;
					body.Key = validateJSON(jsonItem);
				} else {
					body.Key = populatePartitionKey.call(this, i);
				}

				const { readConsistencyModel } = this.getNodeParameter('additionalFields', i) as {
					readConsistencyModel: 'eventuallyConsistent' | 'stronglyConsistent';
				};

				if (readConsistencyModel) {
					body.ConsistentRead = readConsistencyModel === 'stronglyConsistent';
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

				if (simple) {
					responseData = simplify(responseData.Item);
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
				};

				const {
					indexName,
					projectionExpression,
					readConsistencyModel,
				} = this.getNodeParameter('additionalFields', i) as {
					indexName: string;
					projectionExpression: string;
					readConsistencyModel: 'eventuallyConsistent' | 'stronglyConsistent';
				};

				if (indexName) {
					body.IndexName = indexName;
				}

				if (projectionExpression) {
					body.ProjectionExpression = projectionExpression;
				}

				if (readConsistencyModel) {
					body.ConsistentRead = readConsistencyModel === 'stronglyConsistent';
				}

				const headers = {
					'Content-Type': 'application/x-amz-json-1.0',
					'X-Amz-Target': 'DynamoDB_20120810.Query',
				};

				responseData = await awsApiRequestREST.call(this, 'dynamodb', 'POST', '/', JSON.stringify(body), headers);

				if (responseData.Items) {
					responseData = responseData.Items.map(simplify);
				}

			} else if (operation === 'scan') {

				// ----------------------------------
				//             scan
				// ----------------------------------

				// https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html
				const body: IRequestBody = {TableName: this.getNodeParameter('tableName', i) as string};

				const expressionAttributeValues = this.getNodeParameter('expressionAttributeValues.details', i, null) as IAttributeValueUi[];
				const filterExpression = this.getNodeParameter('filterExpression', i) as string;

				const {
					indexName,
					projectionExpression,
					readConsistencyModel,
				} = this.getNodeParameter('additionalFields', i) as {
					indexName: string;
					projectionExpression: string;
					readConsistencyModel: 'eventuallyConsistent' | 'stronglyConsistent';
				};

				if (expressionAttributeValues) {
					body.ExpressionAttributeValues = adjustExpressionAttributeValues(expressionAttributeValues);
				}

				if (filterExpression) {
					body.FilterExpression = filterExpression;
				}

				if (indexName) {
					body.IndexName = indexName;
				}

				if (projectionExpression) {
					body.ProjectionExpression = projectionExpression;
				}

				if (readConsistencyModel) {
					body.ConsistentRead = readConsistencyModel === 'stronglyConsistent';
				}

				const dbItems = [];

				do {
					// always reset headers, otherwise we run into a
					// 'com.amazon.coral.service#SerializationException' Exception on amazons side
					const headers = {'X-Amz-Target': 'DynamoDB_20120810.Scan', 'Content-Type': 'application/x-amz-json-1.0',};
					const response = await awsApiRequestREST.call(this, 'dynamodb', 'POST', '/', JSON.stringify(body), headers);

					if (response.Items) {
						dbItems.push(...response.Items);
					}

					body.ExclusiveStartKey = response.LastEvaluatedKey;
				} while (typeof body.ExclusiveStartKey === 'object');

				responseData = dbItems.map(simplify);
			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];

	}
}

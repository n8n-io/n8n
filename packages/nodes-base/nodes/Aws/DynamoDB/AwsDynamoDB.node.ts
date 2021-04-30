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
	awsApiRequest,
	awsApiRequestAllItems,
} from './GenericFunctions';

import {
	itemFields,
	itemOperations,
} from './ItemDescription';

import {
	IAttributeValueUi,
	IRequestBody,
} from './types';

import {
	adjustExpressionAttributeValues,
	decodeItem,
	simplify,
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
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Item',
						value: 'item',
					},
				],
				default: 'item',
				description: 'The resource to operate on.',
			},
			...itemOperations,
			...itemFields,
		],
	};

	methods = {
		loadOptions: {
			async getTables(this: ILoadOptionsFunctions) {
				const headers = {
					'Content-Type': 'application/x-amz-json-1.0',
					'X-Amz-Target': 'DynamoDB_20120810.ListTables',
				};

				const responseData = await awsApiRequest.call(this, 'dynamodb', 'POST', '/', {}, headers);

				return responseData.TableNames.map((table: string) => ({ name: table, value: table }));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		let responseData;
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {
			if (resource === 'item') {
				if (operation === 'upsert') {

					// ----------------------------------
					//          upsert
					// ----------------------------------

					// https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html

					const eavUi = this.getNodeParameter('expressionAttributeValues.details', i) as IAttributeValueUi[];

					const body: IRequestBody = {
						TableName: this.getNodeParameter('tableName', i) as string,
						//ConditionExpression: this.getNodeParameter('conditionExpression', i) as string,
						//ExpressionAttributeValues: adjustExpressionAttributeValues(eavUi),
					};

					body.Item = items[i].json;

					const headers = {
						'Content-Type': 'application/x-amz-json-1.0',
						'X-Amz-Target': 'DynamoDB_20120810.PutItem',
					};

					responseData = await awsApiRequest.call(this, 'dynamodb', 'POST', '/', body, headers);
					//responseData = { success: true };

				} else if (operation === 'delete') {

					// ----------------------------------
					//              delete
					// ----------------------------------
					// https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_DeleteItem.html

					const body: IRequestBody = {
						TableName: this.getNodeParameter('tableName', i) as string,
						Key: {},
						ExpressionAttributeValues: {},
						ExpressionAttributeNames: {},
						ReturnValues: this.getNodeParameter('returnValues', 0) as string,
					};

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const simple = this.getNodeParameter('simple', 0, false) as boolean;

					const items = this.getNodeParameter('keysUi.keyValues', i, []) as IDataObject[];
					for (const item of items) {
						//@ts-ignore
						body.Key![item.key as string] = { [(item.type as string).toUpperCase()]: item.value };
					}

					delete body.keysUi;

					if (additionalFields.expressionAttributeValuesUi) {
						const attributeValues = (additionalFields.expressionAttributeValuesUi as IDataObject || {}).expressionAttributeValuesValues as IDataObject[] || [];
						for (const attributeValue of attributeValues) {
							//@ts-ignore
							body.ExpressionAttributeValues![attributeValue.key as string] = { [(attributeValue.type as string).toUpperCase()]: attributeValue.value };
						}
					}

					if (additionalFields.expressionAttributeNamesUi) {
						const data = (additionalFields.expressionAttributeNamesUi as IDataObject || {}).expressionAttributeNamesValues as IDataObject[];
						body.ExpressionAttributeNames = data.reduce((obj, value) => Object.assign(obj, { [`${value.key}`]: value.value }), {});
					}

					if (Object.keys(body.ExpressionAttributeNames as IDataObject).length === 0) {
						delete body.ExpressionAttributeNames;
					}

					if (Object.keys(body.ExpressionAttributeValues as IDataObject).length === 0) {
						delete body.ExpressionAttributeValues;
					}

					const headers = {
						'Content-Type': 'application/x-amz-json-1.0',
						'X-Amz-Target': 'DynamoDB_20120810.DeleteItem',
					};

					if (additionalFields.conditionExpression) {
						body.ConditionExpression = additionalFields.conditionExpression as string;
					}

					responseData = await awsApiRequest.call(this, 'dynamodb', 'POST', '/', body, headers);

					if (simple === true) {
						responseData = decodeItem(responseData.Attributes);
					}

				} else if (operation === 'get') {

					// ----------------------------------
					//              get
					// ----------------------------------

					// https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_GetItem.html

					const tableName = this.getNodeParameter('tableName', 0) as string;
					const simple = this.getNodeParameter('simple', 0, false) as boolean;
					const select = this.getNodeParameter('select', 0) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const body: IRequestBody = {
						TableName: tableName,
						Key: {},
						Select: select,
					};

					Object.assign(body, additionalFields);

					if (additionalFields.expressionAttributeNames) {
						const values = this.getNodeParameter('additionalFields.expressionAttributeNames.expressionAttributeNamesValues', i, []) as IDataObject[];
						body.ExpressionAttributeNames = values.reduce((obj, value) => Object.assign(obj, { [`${value.key}`]: value.value }), {}) as { [key: string]: string };
					}

					if (additionalFields.consistentRead) {
						body.ConsistentRead = additionalFields.consistentRead as boolean;
					}

					if (additionalFields.projectionExpression) {
						body.ProjectionExpression = additionalFields.projectionExpression as string;
					}

					const items = this.getNodeParameter('keysUi.keyValues', i, []) as IDataObject[];
					for (const item of items) {
						//@ts-ignore
						body.Key![item.key as string] = { [(item.type as string).toUpperCase()]: item.value };
					}

					const headers = {
						'X-Amz-Target': 'DynamoDB_20120810.GetItem',
						'Content-Type': 'application/x-amz-json-1.0',
					};

					responseData = await awsApiRequest.call(this, 'dynamodb', 'POST', '/', body, headers);

					responseData = responseData.Item;

					if (simple && responseData) {
						responseData = decodeItem(responseData);
					}

				} else if (operation === 'getAll') {

					// ----------------------------------
					//             getAll
					// ----------------------------------

					// https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html

					const eavUi = this.getNodeParameter('expressionAttributeUi.expressionAttributeValues', i, []) as IAttributeValueUi[];
					const simple = this.getNodeParameter('simple', 0, false) as boolean;
					const select = this.getNodeParameter('select', 0) as string;
					const returnAll = this.getNodeParameter('returnAll', 0) as boolean;

					const body: IRequestBody = {
						TableName: this.getNodeParameter('tableName', i) as string,
						KeyConditionExpression: this.getNodeParameter('keyConditionExpression', i) as string,
						ExpressionAttributeValues: adjustExpressionAttributeValues(eavUi),
						ExpressionAttributeNames: {},
					};

					const {
						indexName,
						projectionExpression,
						readConsistencyModel,
						expressionAttributeNamesUi,
					} = this.getNodeParameter('options', i) as {
						indexName: string;
						projectionExpression: string;
						readConsistencyModel: 'eventuallyConsistent' | 'stronglyConsistent';
						expressionAttributeNamesUi: IDataObject;
					};

					if (expressionAttributeNamesUi) {
						const values = expressionAttributeNamesUi.expressionAttributeNamesValues as IDataObject[] || [];
						body.ExpressionAttributeNames = values.reduce((obj, value) => Object.assign(obj, { [`${value.key}`]: value.value }), {}) as { [key: string]: string };
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

					if (select) {
						body.Select = select;
					}

					const headers = {
						'Content-Type': 'application/json',
						'X-Amz-Target': 'DynamoDB_20120810.Query',
					};

					if (Object.keys(body.ExpressionAttributeNames as IDataObject).length === 0) {
						delete body.ExpressionAttributeNames;
					}

					if (returnAll === true && select !== 'COUNT') {
						responseData = await awsApiRequestAllItems.call(this, 'dynamodb', 'POST', '/', body, headers);
					} else {
						body.Limit = this.getNodeParameter('limit', 0, 1) as number;
						responseData = await awsApiRequest.call(this, 'dynamodb', 'POST', '/', body, headers);
						if (select !== 'COUNT') {
							responseData = responseData.Items;
						}
					}
					if (simple === true) {
						responseData = responseData.map(simplify);
					}
				}

				Array.isArray(responseData)
					? returnData.push(...responseData)
					: returnData.push(responseData);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];

	}
}

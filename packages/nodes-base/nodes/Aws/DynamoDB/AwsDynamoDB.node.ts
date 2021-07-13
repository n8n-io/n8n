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
	copyInputItem,
} from './GenericFunctions';

import {
	itemFields,
	itemOperations,
} from './ItemDescription';

import {
	IAttributeNameUi,
	IAttributeValueUi,
	IRequestBody,
} from './types';

import {
	adjustExpressionAttributeName,
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
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
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

			try {

				if (resource === 'item') {

					if (operation === 'upsert') {

						// ----------------------------------
						//             upsert
						// ----------------------------------

						// https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html

						const eavUi = this.getNodeParameter('additionalFields.eavUi.eavValues', i, []) as IAttributeValueUi[];
						const conditionExpession = this.getNodeParameter('conditionExpression', i, '') as string;
						const eanUi = this.getNodeParameter('additionalFields.eanUi.eanValues', i, []) as IAttributeNameUi[];

						const body: IRequestBody = {
							TableName: this.getNodeParameter('tableName', i) as string,
						};

						const expressionAttributeValues = adjustExpressionAttributeValues(eavUi);

						if (Object.keys(expressionAttributeValues).length) {
							body.ExpressionAttributeValues = expressionAttributeValues;
						}

						const expressionAttributeName = adjustExpressionAttributeName(eanUi);

						if (Object.keys(expressionAttributeName).length) {
							body.expressionAttributeNames = expressionAttributeName;
						}

						if (conditionExpession) {
							body.ConditionExpression = conditionExpession;
						}

						const columnString = this.getNodeParameter('columns', 0) as string;
						const columns = columnString.split(',').map(column => column.trim());

						body.Item = copyInputItem(items[i], columns);

						const headers = {
							'Content-Type': 'application/x-amz-json-1.0',
							'X-Amz-Target': 'DynamoDB_20120810.PutItem',
						};

						responseData = await awsApiRequest.call(this, 'dynamodb', 'POST', '/', body, headers);

						responseData = { success: true };

					} else if (operation === 'delete') {

						// ----------------------------------
						//              delete
						// ----------------------------------

						// https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_DeleteItem.html

						// tslint:disable-next-line: no-any
						const body: { [key: string]: any } = {
							TableName: this.getNodeParameter('tableName', i) as string,
							Key: {},
							ReturnValues: this.getNodeParameter('returnValues', 0) as string,
						};

						const eavUi = this.getNodeParameter('additionalFields.eavUi.eavValues', i, []) as IAttributeValueUi[];
						const eanUi = this.getNodeParameter('additionalFields.eanUi.eanValues', i, []) as IAttributeNameUi[];
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const simple = this.getNodeParameter('simple', 0, false) as boolean;

						const items = this.getNodeParameter('keysUi.keyValues', i, []) as [{ key: string, type: string, value: string }];

						for (const item of items) {
							body.Key[item.key] = { [item.type.toUpperCase()]: item.value };
						}

						const expressionAttributeValues = adjustExpressionAttributeValues(eavUi);

						if (Object.keys(expressionAttributeValues).length) {
							body.ExpressionAttributeValues = expressionAttributeValues;
						}

						const expressionAttributeName = adjustExpressionAttributeName(eanUi);

						if (Object.keys(expressionAttributeName).length) {
							body.expressionAttributeNames = expressionAttributeName;
						}

						const headers = {
							'Content-Type': 'application/x-amz-json-1.0',
							'X-Amz-Target': 'DynamoDB_20120810.DeleteItem',
						};

						if (additionalFields.conditionExpression) {
							body.ConditionExpression = additionalFields.conditionExpression as string;
						}

						responseData = await awsApiRequest.call(this, 'dynamodb', 'POST', '/', body, headers);

						if (!Object.keys(responseData).length) {
							responseData = { success: true };
						} else if (simple === true) {
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
						const eanUi = this.getNodeParameter('additionalFields.eanUi.eanValues', i, []) as IAttributeNameUi[];

						// tslint:disable-next-line: no-any
						const body: { [key: string]: any } = {
							TableName: tableName,
							Key: {},
							Select: select,
						};

						Object.assign(body, additionalFields);

						const expressionAttributeName = adjustExpressionAttributeName(eanUi);

						if (Object.keys(expressionAttributeName).length) {
							body.expressionAttributeNames = expressionAttributeName;
						}

						if (additionalFields.readType) {
							body.ConsistentRead = additionalFields.readType === 'stronglyConsistentRead';
						}

						if (additionalFields.projectionExpression) {
							body.ProjectionExpression = additionalFields.projectionExpression as string;
						}

						const items = this.getNodeParameter('keysUi.keyValues', i, []) as IDataObject[];

						for (const item of items) {
							body.Key[item.key as string] = { [(item.type as string).toUpperCase()]: item.value };
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

						const eavUi = this.getNodeParameter('eavUi.eavValues', i, []) as IAttributeValueUi[];
						const simple = this.getNodeParameter('simple', 0, false) as boolean;
						const select = this.getNodeParameter('select', 0) as string;
						const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
						const eanUi = this.getNodeParameter('additionalFields.eanUi.eanValues', i, []) as IAttributeNameUi[];

						const body: IRequestBody = {
							TableName: this.getNodeParameter('tableName', i) as string,
							KeyConditionExpression: this.getNodeParameter('keyConditionExpression', i) as string,
							ExpressionAttributeValues: adjustExpressionAttributeValues(eavUi),
						};

						const {
							indexName,
							projectionExpression,
						} = this.getNodeParameter('options', i) as {
							indexName: string;
							projectionExpression: string;
						};

						const expressionAttributeName = adjustExpressionAttributeName(eanUi);

						if (Object.keys(expressionAttributeName).length) {
							body.expressionAttributeNames = expressionAttributeName;
						}

						if (indexName) {
							body.IndexName = indexName;
						}

						if (projectionExpression && select !== 'COUNT') {
							body.ProjectionExpression = projectionExpression;
						}

						if (select) {
							body.Select = select;
						}

						const headers = {
							'Content-Type': 'application/json',
							'X-Amz-Target': 'DynamoDB_20120810.Query',
						};

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

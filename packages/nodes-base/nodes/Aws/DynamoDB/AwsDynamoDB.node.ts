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
import { addAdditionalFields } from '../../Telegram/GenericFunctions';

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
	copyInputItem,
	simplify,
	validateJSON,
	mapToAttributeValues,
} from './utils';

enum EAttributeValueType {
	S = 'S', SS = 'SS', M = 'M', L = 'L', NS = 'NS', N = 'N', BOOL = 'BOOL', B = 'B', BS = 'BS', NULL = 'NULL',
}

interface IAttributeValueValue {
	[type: string]: string | string[] | IAttributeValue[];
}

interface IAttributeValue {
	[attribute: string]: IAttributeValueValue;
}

interface IExpressionAttributeValue {
	attribute: string;
	type: EAttributeValueType;
	value: string;
}

function decodeItem(item: IAttributeValue): IDataObject {
	const _item: IDataObject = {};
	for (const entry of Object.entries(item)) {
		const [attribute, value]: [string, object] = entry;
		const [type, content]: [string, object] = Object.entries(value)[0];
		_item[attribute] = decodeAttribute(type as EAttributeValueType, content as IAttributeValue);
	}

	return _item;
}

function decodeAttribute(type: EAttributeValueType, attribute: IAttributeValue) {
	switch (type) {
		case 'S':
			return String(attribute);
		case 'SS':
		case 'NS':
			return attribute;
		case 'N':
			return Number(attribute);
		case 'BOOL':
			return Boolean(attribute);
		default:
			return null;
	}
}

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
						value: 'upsert',
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
					Key: {},
					ExpressionAttributeValues: {},
					ExpressionAttributeNames: {},
				};

				const jsonParameters = this.getNodeParameter('jsonParameters', 0) as boolean;
				const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;

				Object.assign(body, additionalFields);

				if (jsonParameters) {
					let json;
					const itemsJson = this.getNodeParameter('keysJson', i) as string;
					json = validateJSON(itemsJson);
					if (json === undefined) {
						throw new Error('Items must be a valid JSON');
					}
					body.Key = json;

					const expressionAttributeValueJson = this.getNodeParameter('expressionAttributeValueJson', i) as string;
					json = validateJSON(expressionAttributeValueJson);
					if (json === undefined) {
						throw new Error('Items must be a valid JSON');
					}
					//@ts-ignore
					body.ExpressionAttributeValues = json;

				} else {
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
						
						delete body.expressionAttributeValuesUi;

						//body.ExpressionAttributeValues = mapToAttributeValues(copyInputItem(items[i], attributeValues)) as unknown as IAttributeValue;
					}

					if (additionalFields.expressionAttributeNamesUi) {
						const data = (additionalFields.expressionAttributeNamesUi as IDataObject || {}).expressionAttributeNamesValues as IDataObject[];
						body.ExpressionAttributeNames = data.reduce((obj, value) => Object.assign(obj, { [`${value.key}`]: value.value }), {});
						delete body.expressionAttributeNamesUi;
					}
				}


				


				const headers = {
					'Content-Type': 'application/x-amz-json-1.0',
					'X-Amz-Target': 'DynamoDB_20120810.DeleteItem',
				};

				console.log(body);

				responseData = await awsApiRequestREST.call(this, 'dynamodb', 'POST', '/', JSON.stringify(body), headers);
				//responseData = { success: true };

			} else if (operation === 'get') {

				// ----------------------------------
				//              get
				// ----------------------------------

				// https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_GetItem.html

				const tableName = this.getNodeParameter('tableName', 0) as string;
				const simple = this.getNodeParameter('simple', 0) as boolean;
				const jsonParameters = this.getNodeParameter('jsonParameters', 0) as boolean;
				const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

				const body: IRequestBody = {
					TableName: tableName,
					Key: {},
				};

				Object.assign(body, additionalFields);

				if (body.ExpressionAttributeNames) {
					const values = this.getNodeParameter('additionalFields.ExpressionAttributeNames.ExpressionAttributeNamesValues', i, []) as IDataObject[];
					body.ExpressionAttributeNames = values.reduce((obj, value) => Object.assign(obj, { [`${value.key}`]: value.value }), {}) as { [key: string]: string };
				}

				if (jsonParameters) {
					const itemsJson = this.getNodeParameter('keysJson', i) as string;
					const json = validateJSON(itemsJson);
					if (json === undefined) {
						throw new Error('Items must be a valid JSON');
					}
					body.Key = json;

				} else {
					const items = this.getNodeParameter('keysUi.keyValues', i, []) as IDataObject[];
					for (const item of items) {
						//@ts-ignore
						body.Key![item.key as string] = { [(item.type as string).toUpperCase()]: item.value };
					}
				}

				const headers = {
					'X-Amz-Target': 'DynamoDB_20120810.GetItem',
					'Content-Type': 'application/x-amz-json-1.0',
				};

				responseData = await awsApiRequestREST.call(this, 'dynamodb', 'POST', '/', JSON.stringify(body), headers);

				responseData = responseData.Item;

				if (simple) {
					responseData = decodeItem(responseData);
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

				const eavUi = this.getNodeParameter('expressionAttributeValues.details', i) as IAttributeValueUi[];

				const body: IRequestBody = {
					TableName: this.getNodeParameter('tableName', i) as string,
					FilterExpression: this.getNodeParameter('filterExpression', i) as string,
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
					'X-Amz-Target': 'DynamoDB_20120810.Scan',
					'Content-Type': 'application/x-amz-json-1.0',
				};

				responseData = await awsApiRequestREST.call(this, 'dynamodb', 'POST', '/', JSON.stringify(body), headers);

				if (responseData.Items) {
					responseData = responseData.Items.map(simplify);
				}

			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];

	}
}

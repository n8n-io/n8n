/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeParameterValue,
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
	FieldsUiValues,
	IAttributeNameUi,
	IAttributeValueUi,
	IRequestBody,
	PutItemUi,
} from './types';

import {
	adjustExpressionAttributeName,
	adjustExpressionAttributeValues,
	adjustPutItem,
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
				noDataExpression: true,
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

						const dataToSend = this.getNodeParameter('dataToSend', 0) as 'defineBelow' | 'autoMapInputData';
						const item: { [key: string]: string } = {};

						if (dataToSend === 'autoMapInputData') {

							const incomingKeys = Object.keys(items[i].json);
							const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i) as string;
							const inputsToIgnore = rawInputsToIgnore.split(',').map(c => c.trim());

							for (const key of incomingKeys) {
								if (inputsToIgnore.includes(key)) continue;
								item[key] = items[i].json[key] as string;
							}

							body.Item = adjustPutItem(item as PutItemUi);

						} else {

							const fields = this.getNodeParameter('fieldsUi.fieldValues', i, []) as FieldsUiValues;
							fields.forEach(({ fieldId, fieldValue }) => item[fieldId] = fieldValue);
							body.Item = adjustPutItem(item as PutItemUi);

						}

						const headers = {
							'Content-Type': 'application/x-amz-json-1.0',
							'X-Amz-Target': 'DynamoDB_20120810.PutItem',
						};

						responseData = await awsApiRequest.call(this, 'dynamodb', 'POST', '/', body, headers);
						responseData = item;

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
							let value = item.value as NodeParameterValue;
							// All data has to get send as string even numbers
							// @ts-ignore
							value = ![null, undefined].includes(value) ? value?.toString() : '';
							body.Key[item.key as string] = { [item.type as string]: value };
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
							let value = item.value as NodeParameterValue;
							// All data has to get send as string even numbers
							// @ts-ignore
							value = ![null, undefined].includes(value) ? value?.toString() : '';
							body.Key[item.key as string] = { [item.type as string]: value };
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
						const scan = this.getNodeParameter('scan', 0) as boolean;
						const eanUi = this.getNodeParameter('options.eanUi.eanValues', i, []) as IAttributeNameUi[];

						const body: IRequestBody = {
							TableName: this.getNodeParameter('tableName', i) as string,
						};

						if (scan === true) {
							const filterExpression = this.getNodeParameter('filterExpression', i) as string;
							if (filterExpression) {
								body['FilterExpression'] = filterExpression;
							}
						} else {
							body['KeyConditionExpression'] = this.getNodeParameter('keyConditionExpression', i) as string;
						}

						const {
							indexName,
							projectionExpression,
							filterExpression,
						} = this.getNodeParameter('options', i) as {
							indexName: string;
							projectionExpression: string;
							filterExpression: string;
						};

						const expressionAttributeName = adjustExpressionAttributeName(eanUi);

						if (Object.keys(expressionAttributeName).length) {
							body.ExpressionAttributeNames = expressionAttributeName;
						}

						const expressionAttributeValues = adjustExpressionAttributeValues(eavUi);

						if (Object.keys(expressionAttributeValues).length) {
							body.ExpressionAttributeValues = expressionAttributeValues;
						}

						if (indexName) {
							body.IndexName = indexName;
						}

						if (projectionExpression && select !== 'COUNT') {
							body.ProjectionExpression = projectionExpression;
						}

						if (filterExpression) {
							body.FilterExpression = filterExpression;
						}

						if (select) {
							body.Select = select;
						}

						const headers = {
							'Content-Type': 'application/json',
							'X-Amz-Target': (scan) ? 'DynamoDB_20120810.Scan' : 'DynamoDB_20120810.Query',
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

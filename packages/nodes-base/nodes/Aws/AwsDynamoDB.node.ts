import {IExecuteFunctions} from 'n8n-core';
import {
		IDataObject,
		INodeExecutionData,
		INodeType,
		INodeTypeDescription,
} from 'n8n-workflow';

import { awsApiRequestREST } from './GenericFunctions';

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

interface IRequestBody {
	TableName: string;
	Key?: object;
	IndexName?: string;
	ProjectionExpression?: string;
	KeyConditionExpression?: string;
	ExpressionAttributeValues?: IAttributeValue;
	ConsistentRead?: boolean;
	FilterExpression?: string;
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

function decodeItem(item: IAttributeValue): IDataObject {
	const _item: IDataObject = {};
	for (const entry of Object.entries(item)) {
		const [attribute, value]: [string, object] = entry;
		const [type, content]: [string, object] = Object.entries(value)[0];
		_item[attribute] = decodeAttribute(type as EAttributeValueType, content as IAttributeValue);
	}

	return _item;
}

export class AwsDynamoDB implements INodeType {
		description: INodeTypeDescription = {
				displayName: 'AWS DynamoDB',
				name: 'awsDynamoDb',
				icon: 'file:dynamodb.svg',
				group: ['transform'],
				version: 1,
				description: 'Query data on AWS DynamoDB',
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
								description: 'Handle single Items',
							},
							{
								name: 'Query',
								value: 'query',
								description: 'Query database',
							},
							{
								name: 'Scan',
								value: 'scan',
								description: 'Scan a table',
							},
						],
						default: 'item',
						description: 'The resource to operate on.',
					},
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						displayOptions: {
							show: {
								resource: ['item'],
							},
						},
						options: [
							{
								name: 'GetItem',
								value: 'get',
								description: 'Read an item.',
							},
						],
						default: 'get',
						description: 'The operation to perform.',
					},
					{
						displayName: 'Table',
						name: 'table',
						type: 'string',
						required: true,
						displayOptions: {
							show: {
								resource: ['item', 'query', 'scan'],
							},
						},
						default: '',
						description: 'Specify the table you want to operate on',
					},
					{
						displayName: 'Item',
						name: 'item',
						type: 'string',
						required: true,
						displayOptions: {
							show: {
								resource: ['item'],
								operation: ['get'],
							},
						},
						default: '',
						description: 'Specify the Item you want to operate on',
					},
					{
						displayName: 'Key Condition Expression',
						name: 'key-condition-expression',
						type: 'string',
						required: true,
						displayOptions: {
							show: {
								resource: ['query'],
							},
						},
						placeholder: 'id = :id',
						default: '',
						description: 'A string that determines the items to be read from the table or index.',
					},
					{
						displayName: 'FilterExpression',
						name: 'filter-expression',
						type: 'string',
						default: '',
						placeholder: 'id = :id',
						displayOptions: {
							show: {
								resource: ['scan'],
							},
						},
					},
					{
						displayName: 'Expression Attribute Values',
						name: 'expression-attribute-values',
						placeholder: 'Add Metadata',
						type: 'fixedCollection',
						default: '',
						required: true,
						typeOptions: {
							multipleValues: true,
							minValue: 1,
						},
						displayOptions: {
							show: {
								resource: ['query', 'scan'],
							},
						},
						description: 'Attributes',
						options: [
							{
								name: 'values',
								displayName: 'Attribute Values',
								values: [
									{
										displayName: 'Attribute',
										name: 'attribute',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Type',
										name: 'type',
										type: 'options',
										options: ['S', 'N'].map((o) => Object({name: o, value: o})),
										default: 'S',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: '',
									},
								],
							},
						],
					},
					{
						displayName: 'Additional Fields',
						name: 'additional-fields',
						type: 'collection',
						placeholder: 'Add Field',
						default: {},
						displayOptions: {
							show: {
								resource: ['query', 'scan'],
							},
						},
						options: [
							{
								displayName: 'Projection Expression',
								name: 'projection-expression',
								type: 'string',
								placeholder: 'id, name',
								default: '',
								description: 'Attributes to select',
							},
							{
								displayName: 'IndexName',
								name: 'index-name',
								type: 'string',
								default: '',
								description: 'Specify any global/local secondary index',
							},
						],
					},
				],
		};

		async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
				const resource = this.getNodeParameter('resource', 0) as string;

				if (resource === 'item') {
					const operation = this.getNodeParameter('operation', 0) as string;
					if (operation === 'get') {
						const tableName = this.getNodeParameter('table', 0) as string;
						const item = this.getNodeParameter('item', 0) as string;

						const body: IRequestBody = {
							TableName: tableName,
							Key: {id: {S: item}},
						};

						const headers = {
							'X-Amz-Target': 'DynamoDB_20120810.GetItem',
							'Content-Type': 'application/x-amz-json-1.0',
						};
						const response = await awsApiRequestREST.call(this, 'dynamodb', 'POST', '/', JSON.stringify(body), headers);

						return [this.helpers.returnJsonArray(decodeItem(response.Item))];
					}
				}

				if (resource === 'query') {
					const tableName = this.getNodeParameter('table', 0) as string;
					const keyConditionExpression = this.getNodeParameter('key-condition-expression', 0) as string;
					const expressionValues = this.getNodeParameter('expression-attribute-values', 0) as {values: IExpressionAttributeValue[]};
					const additionalFields = this.getNodeParameter('additional-fields', 0) as IDataObject;

					const expressionAttributeValues: IAttributeValue = {};
					for (const {attribute, type, value} of expressionValues.values) {
						const prefixedAttribute = attribute.charAt(0) === ':' ? attribute : ':' + attribute; // often forgotten to prepend a ':'
						expressionAttributeValues[prefixedAttribute] = {[type]: value};
					}

					const body: IRequestBody = {
						TableName: tableName,
						KeyConditionExpression: keyConditionExpression,
						ExpressionAttributeValues: expressionAttributeValues,
						ConsistentRead: true,
					};

					if (additionalFields['projection-expression']) {
						body.ProjectionExpression = additionalFields['projection-expression'] as string;
					}

					if (additionalFields['index-name']) {
						body.IndexName = additionalFields['index-name'] as string;
					}

					const headers = {
						'X-Amz-Target': 'DynamoDB_20120810.Query',
						'Content-Type': 'application/x-amz-json-1.0',
					};
					const response = await awsApiRequestREST.call(this, 'dynamodb', 'POST', '/', JSON.stringify(body), headers);
					const items = response.Items.map(decodeItem);

					return [this.helpers.returnJsonArray(items)];
				}

				if (resource === 'scan') {
					const tableName = this.getNodeParameter('table', 0) as string;
					const filterExpression = this.getNodeParameter('filter-expression', 0) as string;
					const additionalFields = this.getNodeParameter('additional-fields', 0) as IDataObject;
					const expressionValues = this.getNodeParameter('expression-attribute-values', 0) as {values: IExpressionAttributeValue[]};

					const expressionAttributeValues: IAttributeValue = {};
					for (const {attribute, type, value} of expressionValues.values) {
						const prefixedAttribute = attribute.charAt(0) === ':' ? attribute : ':' + attribute; // often forgotten to prepend a ':'
						expressionAttributeValues[prefixedAttribute] = {[type]: value};
					}

					const body: IRequestBody = {
						TableName: tableName,
						ConsistentRead: true,
					};

					if (filterExpression) {
						body.FilterExpression = filterExpression;
						body.ExpressionAttributeValues = expressionAttributeValues;
					}

					if (additionalFields['projection-expression']) {
						body.ProjectionExpression = additionalFields['projection-expression'] as string;
					}

					const headers = {
						'X-Amz-Target': 'DynamoDB_20120810.Scan',
						'Content-Type': 'application/x-amz-json-1.0',
					};
					const response = await awsApiRequestREST.call(this, 'dynamodb', 'POST', '/', JSON.stringify(body), headers);
					const items = response.Items.map(decodeItem);

					return [this.helpers.returnJsonArray(items)];
				}

				return [[]];
		}
}

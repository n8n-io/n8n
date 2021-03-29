import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	awsApiRequestREST,
} from './GenericFunctions';

import {
	isEmpty,
} from 'lodash';

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
						name: 'Delete',
						value: 'delete',
						description: 'Delete an item.',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve an item.',
					},
					{
						name: 'Query',
						value: 'query',
						description: 'Search based on a partition key.',
					},
					{
						name: 'Scan',
						value: 'scan',
						description: 'Search through all the database.',
					},
				],
			},
			{
				displayName: 'Table Name',
				name: 'tableName',
				description: 'Name of the table to operate on.',
				type: 'string',
				required: true,
				default: '',
			},

			// ----------------------------------
			//              delete
			// ----------------------------------
			{
				displayName: 'Partition Key Value',
				name: 'partitionKeyValue',
				description: 'Value of the partition key of the item to delete.',
				default: '',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'delete',
						],
					},
				},
			},
			{
				displayName: 'Partition Key Type',
				name: 'partitionKeyType',
				description: 'Type of the partition key of the item to retrieve.',
				default: 'S',
				type: 'options',
				required: true,
				options: [
					{
						name: 'Binary',
						value: 'B',
					},
					{
						name: 'Number',
						value: 'N',
					},
					{
						name: 'String',
						value: 'S',
					},
				],
				displayOptions: {
					show: {
						operation: [
							'delete',
						],
					},
				},
			},

			// ----------------------------------
			//              get
			// ----------------------------------
			{
				displayName: 'Partition Key Value',
				name: 'partitionKeyValue',
				description: 'Value of the partition key of the item to retrieve.',
				default: '',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'get',
						],
					},
				},
			},
			{
				displayName: 'Partition Key Type',
				name: 'partitionKeyType',
				description: 'Type of the partition key of the item to retrieve.',
				default: 'S',
				type: 'options',
				required: true,
				options: [
					{
						name: 'Binary',
						value: 'B',
					},
					{
						name: 'Number',
						value: 'N',
					},
					{
						name: 'String',
						value: 'S',
					},
				],
				displayOptions: {
					show: {
						operation: [
							'get',
						],
					},
				},
			},

			// ----------------------------------
			//              query
			// ----------------------------------
			{
				displayName: 'Key Condition Expression',
				name: 'keyConditionExpression',
				description: 'Condition to determine the items to be retrieved. The condition must perform an equality test<br>on a single partition key value, in this format: <code>partitionKeyName = :partitionkeyval</code>',
				placeholder: 'id = :id',
				default: '',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'query',
						],
					},
				},
			},
			{
				displayName: 'Expression Attribute Values',
				name: 'expressionAttributeValues',
				description: 'Substitution tokens for attribute names in an expression.',
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
						operation: [
							'query',
						],
					},
				},
				options: [
					{
						name: 'details',
						displayName: 'Details',
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
								options: [
									{
										name: 'Number',
										value: 'N',
									},
									{
										name: 'String',
										value: 'S',
									},
								],
								default: 'S',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: [
							'query',
						],
					},
				},
				options: [
					{
						displayName: 'Index Name',
						name: 'indexName',
						description: 'Name of the index to query. This index can be any <br>secondary local or global index on the table.',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Projection Expression',
						name: 'projectionExpression',
						description: 'Comma-separated list of attributes to retrieve.',
						type: 'string',
						placeholder: 'id, name',
						default: '',
					},
				],
			},

			// ----------------------------------
			//             scan
			// ----------------------------------
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: [
							'scan',
						],
					},
				},
				options: [
					{
						displayName: 'Expression Attribute Values',
						name: 'expressionAttributeValues',
						description: 'Substitution tokens for attribute names in an expression.',
						placeholder: 'Add Metadata',
						type: 'fixedCollection',
						default: '',
						typeOptions: {
							multipleValues: true,
							minValue: 1,
						},
						options: [
							{
								name: 'details',
								displayName: 'Details',
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
										options: [
											{
												name: 'Number',
												value: 'N',
											},
											{
												name: 'String',
												value: 'S',
											},
										],
										default: 'S',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
									},
								],
							},
						],
					},
					{
						displayName: 'Filter Expression',
						name: 'filterExpression',
						description: 'Condition to apply after the scan operation, but before the data is returned.',
						type: 'string',
						default: '',
						placeholder: 'id = :id',
					},
					{
						displayName: 'Index Name',
						name: 'indexName',
						description: 'Name of the index to query. This index can be any <br>secondary local or global index on the table.',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Key Condition Expression',
						name: 'keyConditionExpression',
						description: 'Condition that determines the items to be retrieved. The condition must perform an equality test<br>on a single partition key value, in this format: <code>partitionKeyName = :partitionkeyval</code>',
						placeholder: 'id = :id',
						default: '',
						type: 'string',
					},
					{
						displayName: 'Projection Expression',
						name: 'projectionExpression',
						description: 'Comma-separated list of attributes to retrieve.',
						type: 'string',
						placeholder: 'id, name',
						default: '',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const operation = this.getNodeParameter('operation', 0);

		let responseData;
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {

			if (operation === 'delete') {

				// ----------------------------------
				//              delete
				// ----------------------------------

				// https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_DeleteItem.html

				const partitionKeyType = this.getNodeParameter('partitionKeyType', i) as string;

				const body: IRequestBody = {
					TableName: this.getNodeParameter('tableName', i) as string,
					Key: {
						id: {
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

				const partitionKeyType = this.getNodeParameter('partitionKeyType', i) as string;

				const body: IRequestBody = {
					TableName: this.getNodeParameter('tableName', i) as string,
					Key: {
						id: {
							[partitionKeyType]: this.getNodeParameter('partitionKeyValue', i) as string,
						},
					},
				};

				const headers = {
					'Content-Type': 'application/x-amz-json-1.0',
					'X-Amz-Target': 'DynamoDB_20120810.GetItem',
				};

				responseData = await awsApiRequestREST.call(this, 'dynamodb', 'POST', '/', JSON.stringify(body), headers);

				if (responseData.Item) {
					responseData = decodeItem(responseData.Item);
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
					responseData = responseData.Items.map(decodeItem);
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
					responseData = responseData.Items.map(decodeItem);
				}

			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];

	}
}

function decodeItem(item: IAttributeValue): IDataObject {
	const output: IDataObject = {};

	for (const [attribute, value] of Object.entries(item)) {
		const [type, content] = Object.entries(value)[0] as [AttributeValueType, string];
		output[attribute] = decodeAttribute(type, content);
	}

	return output;
}

function decodeAttribute(type: AttributeValueType, attribute: string) {
	switch (type) {
		case 'BOOL':
			return Boolean(attribute);
		case 'N':
			return Number(attribute);
		case 'S':
			return String(attribute);
		case 'SS':
		case 'NS':
			return attribute;
		default:
			return null;
	}
}

interface IRequestBody {
	[key: string]: string | IAttributeValue | undefined | boolean | object;
	TableName: string;
	Key?: object;
	IndexName?: string;
	ProjectionExpression?: string;
	KeyConditionExpression?: string;
	ExpressionAttributeValues?: IAttributeValue;
	ConsistentRead?: boolean;
	FilterExpression?: string;
}

interface IAttributeValue {
	[attribute: string]: IAttributeValueValue;
}

type IAttributeValueValue = {
	[type in AttributeValueType]: string;
};

interface IAttributeValueUi {
	attribute: string;
	type: AttributeValueType;
	value: string;
}

type AttributeValueType =
	| 'B'			// binary
	| 'BOOL'	// boolean
	| 'BS'		// binary set
	| 'L'    	// list
	| 'M' 		// map
	| 'N' 		// number
	| 'NULL'
	| 'NS'   	// number set
	| 'S' 		// string
	| 'SS';   // string set

function adjustExpressionAttributeValues(eavUi: IAttributeValueUi[]) {
	if (isEmpty(eavUi)) {
		throw new Error('Expression attribute values must not be empty.');
	}

	const adjustAttribute = (attribute: string) => attribute = attribute.charAt(0) === ':' ? attribute : `:${attribute}`;

	const eav: IAttributeValue = {};

	eavUi.forEach(({ attribute, type, value }) => {
		eav[adjustAttribute(attribute)] = { [type]: value } as IAttributeValueValue;
	});

	return eav;
}

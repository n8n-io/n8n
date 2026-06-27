/**
 * TEMPLATE: Programmatic Node (execute method)
 *
 * The most common node type. Processes input items through an execute() method
 * with resource/operation routing. Supports CRUD operations, pagination,
 * binary data, and error handling with continueOnFail.
 *
 * Usage: Copy this file, rename the class/references, and implement your operations.
 *
 * Replace all occurrences of:
 *   - __ServiceName__     → Your service class name (PascalCase, e.g. "Airtable")
 *   - __serviceName__     → Your service internal name (camelCase, e.g. "airtable")
 *   - __serviceNameApi__  → Your credential name (camelCase, e.g. "airtableApi")
 *   - __servicename__     → Icon filename (lowercase, e.g. "airtable")
 */
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	IDataObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	__serviceName__ApiRequest,
	__serviceName__ApiRequestAllItems,
} from './GenericFunctions';

export class __ServiceName__ implements INodeType {
	description: INodeTypeDescription = {
		displayName: '__ServiceName__',
		name: '__serviceName__',
		icon: 'file:__servicename__.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with __ServiceName__ API',
		defaults: {
			name: '__ServiceName__',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: '__serviceNameApi__',
				required: true,
			},
		],
		properties: [
			// ---- Resource ----
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

			// ---- Operations ----
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['item'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new item',
						action: 'Create an item',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete an item',
						action: 'Delete an item',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Retrieve an item',
						action: 'Get an item',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Retrieve multiple items',
						action: 'Get many items',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update an item',
						action: 'Update an item',
					},
				],
				default: 'create',
			},

			// ---- Create Fields ----
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['create'],
					},
				},
				description: 'The name of the item to create',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
						description: 'Comma-separated list of tags',
					},
				],
			},

			// ---- Get / Delete / Update Fields ----
			{
				displayName: 'Item ID',
				name: 'itemId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['get', 'update', 'delete'],
					},
				},
				description: 'The ID of the item',
			},

			// ---- Get Many Fields ----
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				description: 'Whether to return all results or only up to a given limit',
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['getAll'],
					},
				},
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				typeOptions: {
					minValue: 1,
				},
				description: 'Max number of results to return',
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['getAll'],
						returnAll: [false],
					},
				},
			},

			// ---- Update Fields ----
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			// Example: dynamic dropdown options loaded from API
			async getProjects(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const response = (await __serviceName__ApiRequest.call(
					this,
					'GET',
					'/projects',
				)) as Array<{ id: string; name: string }>;

				return response.map((project) => ({
					name: project.name,
					value: project.id,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'item') {
					// ---- Create ----
					if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
							{},
						) as IDataObject;

						const body: IDataObject = { name, ...additionalFields };

						const response = await __serviceName__ApiRequest.call(
							this,
							'POST',
							'/items',
							body,
						);

						returnData.push({
							json: response as IDataObject,
							pairedItem: { item: i },
						});
					}

					// ---- Get ----
					if (operation === 'get') {
						const itemId = this.getNodeParameter('itemId', i) as string;

						const response = await __serviceName__ApiRequest.call(
							this,
							'GET',
							`/items/${itemId}`,
						);

						returnData.push({
							json: response as IDataObject,
							pairedItem: { item: i },
						});
					}

					// ---- Get Many ----
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (returnAll) {
							const responseItems = await __serviceName__ApiRequestAllItems.call(
								this,
								'data',
								'GET',
								'/items',
							);
							const executionData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray(responseItems),
								{ itemData: { item: i } },
							);
							returnData.push(...executionData);
						} else {
							const limit = this.getNodeParameter('limit', i) as number;
							const response = (await __serviceName__ApiRequest.call(
								this,
								'GET',
								'/items',
								{},
								{ limit },
							)) as IDataObject;

							const responseItems = (response.data as IDataObject[]) || [];
							const executionData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray(responseItems),
								{ itemData: { item: i } },
							);
							returnData.push(...executionData);
						}
					}

					// ---- Update ----
					if (operation === 'update') {
						const itemId = this.getNodeParameter('itemId', i) as string;
						const updateFields = this.getNodeParameter(
							'updateFields',
							i,
							{},
						) as IDataObject;

						if (!Object.keys(updateFields).length) {
							throw new NodeOperationError(
								this.getNode(),
								'At least one update field must be set',
								{ itemIndex: i },
							);
						}

						const response = await __serviceName__ApiRequest.call(
							this,
							'PATCH',
							`/items/${itemId}`,
							updateFields,
						);

						returnData.push({
							json: response as IDataObject,
							pairedItem: { item: i },
						});
					}

					// ---- Delete ----
					if (operation === 'delete') {
						const itemId = this.getNodeParameter('itemId', i) as string;

						await __serviceName__ApiRequest.call(
							this,
							'DELETE',
							`/items/${itemId}`,
						);

						returnData.push({
							json: { success: true, id: itemId },
							pairedItem: { item: i },
						});
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

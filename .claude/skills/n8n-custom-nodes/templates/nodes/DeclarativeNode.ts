/**
 * TEMPLATE: Declarative Node (routing-based, no execute method)
 *
 * Uses requestDefaults and routing on property options instead of writing
 * an execute() method. The n8n engine handles request construction
 * automatically. Best for simple REST API wrappers.
 *
 * Replace all occurrences of:
 *   - __ServiceName__     → Your service class name (PascalCase)
 *   - __serviceName__     → Your service internal name (camelCase)
 *   - __serviceNameApi__  → Your credential name (camelCase)
 *   - __servicename__     → Icon filename (lowercase)
 */
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class __ServiceName__ implements INodeType {
	description: INodeTypeDescription = {
		displayName: '__ServiceName__',
		name: '__serviceName__',
		icon: 'file:__servicename__.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Use the __ServiceName__ API',
		defaults: {
			name: '__ServiceName__',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: '__serviceNameApi__',
				required: true,
			},
		],
		requestDefaults: {
			returnFullResponse: true,
			baseURL: '={{$credentials.baseUrl.replace(new RegExp("/$"), "")}}',
			headers: {
				'Content-Type': 'application/json',
			},
		},
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
						action: 'Create an item',
						routing: {
							request: {
								method: 'POST',
								url: '/api/v1/items',
							},
						},
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete an item',
						routing: {
							request: {
								method: 'DELETE',
								url: '=/api/v1/items/{{$parameter.itemId}}',
							},
						},
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get an item',
						routing: {
							request: {
								method: 'GET',
								url: '=/api/v1/items/{{$parameter.itemId}}',
							},
						},
					},
					{
						name: 'Get Many',
						value: 'getAll',
						action: 'Get many items',
						routing: {
							request: {
								method: 'GET',
								url: '/api/v1/items',
							},
							send: {
								paginate: true,
							},
							output: {
								postReceive: [
									{
										type: 'rootProperty',
										properties: {
											property: 'data',
										},
									},
								],
							},
						},
					},
					{
						name: 'Update',
						value: 'update',
						action: 'Update an item',
						routing: {
							request: {
								method: 'PATCH',
								url: '=/api/v1/items/{{$parameter.itemId}}',
							},
						},
					},
				],
				default: 'get',
			},

			// ---- Item ID (for get/update/delete) ----
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
			},

			// ---- Create/Update fields sent as request body ----
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
				routing: {
					send: {
						type: 'body',
						property: 'name',
					},
				},
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
						operation: ['create', 'update'],
					},
				},
				options: [
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						routing: {
							send: {
								type: 'body',
								property: 'description',
							},
						},
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						options: [
							{ name: 'Active', value: 'active' },
							{ name: 'Archived', value: 'archived' },
						],
						default: 'active',
						routing: {
							send: {
								type: 'body',
								property: 'status',
							},
						},
					},
				],
			},

			// ---- Limit (sent as query parameter) ----
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				typeOptions: { minValue: 1 },
				displayOptions: {
					show: {
						resource: ['item'],
						operation: ['getAll'],
					},
				},
				routing: {
					send: {
						type: 'query',
						property: 'limit',
					},
				},
			},
		],
	};
}

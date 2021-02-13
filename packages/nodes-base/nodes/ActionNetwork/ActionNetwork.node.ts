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
	actionNetworkApiRequestREST, constructODIFilterString, constructPersonSignupHelperPayload
} from './GenericFunctions';

export class ActionNetwork implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Action Network',
		name: 'actionNetwork',
		icon: 'file:actionnetwork.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["method"] + ": " + $parameter["resource"]}}',
		description: 'Interact with an Action Network group\'s data',
		defaults: {
			name: 'Action Network',
			color: '#9dd3ed',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'ActionNetworkGroupApiToken',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'API Version',
				name: 'version',
				type: 'options',
				options: [
					{
						name: 'Version 2',
						value: 'v2',
					},
				],
				default: 'v2',
				description: 'API version',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Person',
						value: 'people',
					},
				],
				default: 'people',
				description: 'The resource to work with.',
			},
			{
				displayName: 'Operation',
				name: 'method',
				type: 'options',
				options: [
					{
						name: 'List People',
						value: 'GET',
						description: 'Retrieve a collection of person resources',
					},
					{
						name: 'Create/Update Person',
						value: 'POST',
						description: 'Create a new person',
					},
				],
				default: 'GET',
				description: 'The operation to perform on this resource.',
				displayOptions: {
					show: {
						resource: ['people']
					}
				}
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				default: 1,
				displayOptions: {
					show: {
						method: ['GET']
					}
				}
			},
			{
				displayName: 'Filter Logic',
				name: 'filter_logic',
				type: 'options',
				required: false,
				options: [
					{ value: 'and', name: "All" },
					{ value: 'or', name: "Any" }
				],
				displayOptions: {
					show: {
						resource: [
							'people',
						],
						method: [
							'GET'
						]
					},
				},
				default: 'and',
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'fixedCollection',
				default: '',
				placeholder: 'Add Filter',
				displayOptions: {
					show: {
						resource: [
							'people',
						],
						method: [
							'GET'
						]
					},
				},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'filters',
						displayName: 'Filters',
						values: [
							{
								displayName: 'Filter Property',
								name: 'property',
								type: 'options',
								default: '',
								options: [
									{ name: 'identifier', value: 'identifier' },
									{ name: 'created_date', value: 'created_date' },
									{ name: 'modified_date', value: 'modified_date' },
									{ name: 'family_name', value: 'family_name' },
									{ name: 'given_name', value: 'given_name' },
									{ name: 'email_address', value: 'email_address' },
									{ name: 'region', value: 'region' },
									{ name: 'postal_code', value: 'postal_code' },
								]
							},
							{
								displayName: 'Operation',
								name: 'operation',
								type: 'options',
								options: [
									{
										name: 'eq',
										value: 'eq',
									},
									{
										name: 'lt',
										value: 'lt',
									},
									{
										name: 'gt',
										value: 'gt',
									},
								],
								default: 'eq',
							},
							{
								displayName: 'Matching Term',
								name: 'search_term',
								type: 'string',
								default: '',
							},
						]
					}
				]
			},
			{
				displayName: 'First / Given Name',
				name: 'given_name',
				type: 'string',
				required: false,
				displayOptions: {
					show: {
						resource: [
							'people',
						],
						method: [
							'POST'
						]
					},
				},
				default: '',
			},
			{
				displayName: 'Last / Family Name',
				name: 'family_name',
				type: 'string',
				required: false,
				displayOptions: {
					show: {
						resource: [
							'people',
						],
						method: [
							'POST'
						]
					},
				},
				default: '',
			},
			{
				displayName: 'Additional Fields',
				name: 'additional_fields',
				type: 'fixedCollection',
				default: '',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						resource: [
							'people',
						],
						method: [
							'POST'
						]
					},
				},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'email_addresses',
						displayName: 'Email Addresses',
						values: [
							{
								displayName: 'Address',
								name: 'address',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Primary',
								name: 'primary',
								type: 'boolean',
								default: true,
							},
							{
								displayName: 'Status',
								name: 'status',
								type: 'options',
								options: [
									{
										name: 'unsubscribed',
										value: 'unsubscribed',
									},
									{
										name: 'subscribed',
										value: 'subscribed',
									},
								],
								default: 'subscribed',
							},
						],
					},
					{
						name: 'postal_addresses',
						displayName: 'Postal Addresses',
						values: [
							{
								displayName: 'street_address',
								name: 'street_address',
								type: 'string',
								default: '',
							},
							{
								displayName: 'locality',
								name: 'locality',
								type: 'string',
								default: '',
							},
							{
								displayName: 'region',
								name: 'region',
								type: 'string',
								default: '',
							},
							{
								displayName: 'postal_code',
								name: 'postal_code',
								type: 'string',
								default: '',
							},
							{
								displayName: 'country',
								name: 'country',
								type: 'string',
								default: '',
							},
							{
								displayName: 'language',
								name: 'language',
								type: 'string',
								default: '',
							},
							{
								displayName: 'latitude',
								name: 'latitude',
								type: 'number',
								default: '',
							},
							{
								displayName: 'longitude',
								name: 'longitude',
								type: 'number',
								default: '',
							},
							{
								displayName: 'accuracy',
								name: 'address',
								type: 'options',
								options: [
									{
										value: 'Approximate',
										name: 'Approximate'
									}
								],
								default: 'Approximate',
							},
							{
								displayName: 'Primary',
								name: 'primary',
								type: 'boolean',
								default: true,
							},
						],
					},
					{
						name: 'phone_numbers',
						displayName: 'Phone Numbers',
						values: [
							{
								displayName: 'Number',
								name: 'number',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Type',
								name: 'number_type',
								type: 'options',
								options: [
									{
										name: 'Mobile',
										value: 'Mobile',
									},
								],
								default: 'Mobile',
							},
							{
								displayName: 'Primary',
								name: 'primary',
								type: 'boolean',
								default: true,
							},
							{
								displayName: 'Status',
								name: 'status',
								type: 'options',
								options: [
									{
										name: 'unsubscribed',
										value: 'unsubscribed',
									},
									{
										name: 'subscribed',
										value: 'subscribed',
									},
								],
								default: 'subscribed',
							},
						],
					},
					{
						name: 'add_tags',
						displayName: 'Tags',
						type: 'string',
						default: '',
					},
					{
						name: 'custom_fields',
						displayName: 'Custom Fields',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								description: 'Custom field name as defined in Action Network',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								description: 'Custom field value',
								default: '',
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;
		const version = this.getNodeParameter('version', 0) as string;
		const resource = this.getNodeParameter('resource', 0) as string;
		const method = this.getNodeParameter('method', 0) as string;
		for (let i = 0; i < items.length; i++) {
			if (resource === 'people') {
				if (method === 'GET') {
					// Docs: https://actionnetwork.org/docs/v2/get-people/
					const page = this.getNodeParameter('page', 0) as string;
					let url = `/api/${version}/${resource}?page=${page || 1}`

					// OData filtering
					// Docs: https://actionnetwork.org/docs/v2#odata
					// @ts-ignore
					const { filters } = this.getNodeParameter('filters', 0, []) as IDataObject[] | undefined;
					if (filters) {
						const filter_logic = this.getNodeParameter('filter_logic', 0, 'and') as string;
						url += `&filter=${encodeURIComponent(constructODIFilterString(filters, filter_logic))}`
					}

					responseData = await actionNetworkApiRequestREST.call(this, method, url)
				}
				if (method === 'POST') {
					// Docs: https://actionnetwork.org/docs/v2/person_signup_helper
					const additional_fields = this.getNodeParameter('additional_fields', i) as any
					const body = constructPersonSignupHelperPayload({
						family_name: this.getNodeParameter('family_name', i),
						given_name: this.getNodeParameter('given_name', i),
						postal_addresses: additional_fields.postal_addresses,
						email_addresses: additional_fields.email_addresses,
						phone_numbers: additional_fields.phone_numbers,
						add_tags: additional_fields.add_tags,
						custom_fields: additional_fields.custom_fields
					})

					responseData = await actionNetworkApiRequestREST.call(
						this, method, `/api/${version}/${resource}`, JSON.stringify(body)
					)
				}
			}

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}

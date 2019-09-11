import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';

import {
	activeCampaignApiRequest,
	activeCampaignApiRequestAllItems,
} from './GenericFunctions';

interface CustomProperty {
	name: string;
	value: string;
}


/**
 * Add the additional fields to the body
 *
 * @param {IDataObject} body The body object to add fields to
 * @param {IDataObject} additionalFields The fields to add
 */
function addAdditionalFields(body: IDataObject, additionalFields: IDataObject) {
	for (const key of Object.keys(additionalFields)) {
		if (key === 'customProperties' && (additionalFields.customProperties as IDataObject).property !== undefined) {
			for (const customProperty of (additionalFields.customProperties as IDataObject)!.property! as CustomProperty[]) {
				body[customProperty.name] = customProperty.value;
			}
		} else {
			body[key] = additionalFields[key];
		}
	}
}

export class ActiveCampaign implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ActiveCampaign',
		name: 'activeCampaign',
		icon: 'file:activeCampaign.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Create and edit data in ActiveCampaign',
		defaults: {
			name: 'ActiveCampaign',
			color: '#356ae6',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'activeCampaignApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Contact',
						value: 'contact',
					},
				],
				default: 'contact',
				description: 'The resource to operate on.',
			},



			// ----------------------------------
			//         operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'contact',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a contact',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a contact',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get data of a contact',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get data of all contact',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a contact',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},



			// ----------------------------------
			//         contact
			// ----------------------------------

			// ----------------------------------
			//         contact:create
			// ----------------------------------
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'contact',
						],
					},
				},
				description: 'The email of the contact to create',
			},
			{
				displayName: 'Update if exists',
				name: 'updateIfExists',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'contact',
						],
					},
				},
				default: false,
				description: 'Update user if it exists already. If not set and user exists it will error instead.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'contact',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'First Name',
						name: 'firstName',
						type: 'string',
						default: '',
						description: 'The first name of the contact to create',
					},
					{
						displayName: 'Last Name',
						name: 'lastName',
						type: 'string',
						default: '',
						description: 'The last name of the contact to create',
					},
					{
						displayName: 'Phone',
						name: 'phone',
						type: 'string',
						default: '',
						description: 'Phone number of the contact.',
					},
					{
						displayName: 'Custom Properties',
						name: 'customProperties',
						placeholder: 'Add Custom Property',
						description: 'Adds a custom property to set also values which have not been predefined.',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'property',
								displayName: 'Property',
								values: [
									{
										displayName: 'Property Name',
										name: 'name',
										type: 'string',
										default: '',
										description: 'Name of the property to set.',
									},
									{
										displayName: 'Property Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value of the property to set.',
									},
								]
							},
						],
					},
				],
			},

			// ----------------------------------
			//         contact:delete
			// ----------------------------------
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'delete',
						],
						resource: [
							'contact',
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the contact to delete.',
			},

			// ----------------------------------
			//         person:get
			// ----------------------------------
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'get',
						],
						resource: [
							'contact',
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the contact to get.',
			},

			// ----------------------------------
			//         contact:getAll
			// ----------------------------------
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'getAll',
						],
						resource: [
							'contact',
						],
					},
				},
				default: false,
				description: 'If all results should be returned or only up to a given limit.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'getAll',
						],
						resource: [
							'contact',
						],
						returnAll: [
							false,
						],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 500,
				},
				default: 100,
				description: 'How many results to return.',
			},

			// ----------------------------------
			//         contact:update
			// ----------------------------------
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'update',
						],
						resource: [
							'contact',
						],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the contact to update.',
			},
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				description: 'The fields to update.',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'update',
						],
						resource: [
							'contact',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						default: '',
						description: 'Email of the contact.',
					},
					{
						displayName: 'First Name',
						name: 'firstName',
						type: 'string',
						default: '',
						description: 'First name of the contact',
					},
					{
						displayName: 'Last Name',
						name: 'lastName',
						type: 'string',
						default: '',
						description: 'Last name of the contact',
					},
					{
						displayName: 'Phone',
						name: 'phone',
						type: 'string',
						default: '',
						description: 'Phone number of the contact.',
					},
					{
						displayName: 'Custom Properties',
						name: 'customProperties',
						placeholder: 'Add Custom Property',
						description: 'Adds a custom property to set also values which have not been predefined.',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'property',
								displayName: 'Property',
								values: [
									{
										displayName: 'Property Name',
										name: 'name',
										type: 'string',
										default: '',
										description: 'Name of the property to set.',
									},
									{
										displayName: 'Property Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value of the property to set.',
									},
								]
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

		let resource: string;
		let operation: string;

		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		let requestMethod: string;
		let endpoint: string;
		let returnAll = false;
		let dataKey: string | undefined;

		for (let i = 0; i < items.length; i++) {
			dataKey = undefined;
			resource = this.getNodeParameter('resource', 0) as string;
			operation = this.getNodeParameter('operation', 0) as string;

			requestMethod = 'GET';
			endpoint = '';
			body = {} as IDataObject;
			qs = {} as IDataObject;

			if (resource === 'contact') {
				if (operation === 'create') {
					// ----------------------------------
					//         contact:create
					// ----------------------------------

					requestMethod = 'POST';

					const updateIfExists = this.getNodeParameter('updateIfExists', i) as boolean;
					if (updateIfExists === true) {
						endpoint = '/api/3/contact/sync';
					} else {
						endpoint = '/api/3/contacts';
					}

					dataKey = 'contact';
					body.contact = {
						email: this.getNodeParameter('email', i) as string,
					} as IDataObject;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					addAdditionalFields(body.contact as IDataObject, additionalFields);

				} else if (operation === 'delete') {
					// ----------------------------------
					//         contact:delete
					// ----------------------------------

					requestMethod = 'DELETE';

					const contactId = this.getNodeParameter('contactId', i) as number;
					endpoint = `/api/3/contacts/${contactId}`;

				} else if (operation === 'get') {
					// ----------------------------------
					//         contact:get
					// ----------------------------------

					requestMethod = 'GET';

					const contactId = this.getNodeParameter('contactId', i) as number;
					endpoint = `/api/3/contacts/${contactId}`;

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         persons:getAll
					// ----------------------------------

					requestMethod = 'GET';

					returnAll = this.getNodeParameter('returnAll', i) as boolean;
					if (returnAll === false) {
						qs.limit = this.getNodeParameter('limit', i) as number;
					}

					dataKey = 'contacts';
					endpoint = `/api/3/contacts`;

				} else if (operation === 'update') {
					// ----------------------------------
					//         contact:update
					// ----------------------------------

					requestMethod = 'PUT';

					const contactId = this.getNodeParameter('contactId', i) as number;
					endpoint = `/api/3/contacts/${contactId}`;

					dataKey = 'contact';
					body.contact = {} as IDataObject;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					addAdditionalFields(body.contact as IDataObject, updateFields);

				}
			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}

			let responseData;
			if (returnAll === true) {
				responseData = await activeCampaignApiRequestAllItems.call(this, requestMethod, endpoint, body, qs, dataKey);
			} else {
				responseData = await activeCampaignApiRequest.call(this, requestMethod, endpoint, body, qs, dataKey);
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

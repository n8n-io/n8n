import { IExecuteFunctions, IHookFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';

import { OptionsWithUri } from 'request';

/**
 * Make an API request to ActiveCampaign
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function activeCampaignApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject,
	query?: IDataObject,
	dataKeys?: string[],
) {
	// tslint:disable-line:no-any
	const credentials = await this.getCredentials('activeCampaignApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	if (query === undefined) {
		query = {};
	}

	query.api_key = credentials.apiKey;
	query.api_output = 'json';

	const options: OptionsWithUri = {
		method,
		qs: query,
		uri: `${credentials.apiUrl}${endpoint}`,
		json: true,
	};

	if (Object.keys(body).length !== 0) {
		options.form = body;
	}

	const returnData: IDataObject = {};
	try {
		const responseData = await this.helpers.request(options);

		if (responseData.result_code === 0) {
			throw new Error(`ActiveCampaign error response: ${responseData.result_message}`);
		}

		if (dataKeys === undefined) {
			return responseData;
		}

		for (const dataKey of dataKeys) {
			returnData[dataKey] = responseData[dataKey];
		}

		return returnData;
	} catch (error) {
		// @ts-ignore:next-line
		if (error.statusCode === 403) {
			// Return a clear error
			throw new Error('The ActiveCampaign credentials are not valid!');
		}

		// If that data does not exist for some reason return the actual error
		throw error;
	}
}

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
		if (
			key === 'customProperties' &&
			(additionalFields.customProperties as IDataObject).property !== undefined
		) {
			for (const customProperty of (additionalFields.customProperties as IDataObject)!
				.property! as CustomProperty[]) {
				body[customProperty.name] = customProperty.value;
			}
		} else {
			body[key] = additionalFields[key];
		}
	}
}

export class ActiveCampaignLegacy implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ActiveCampaign (Legacy)',
		name: 'activeCampaignLegacy',
		icon: 'file:activeCampaign.png',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Create and edit data in ActiveCampaign (Legacy API)',
		defaults: {
			name: 'ActiveCampaignLegacy',
			color: '#356ae6',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'activeCampaignApi',
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
						resource: ['contact'],
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
						operation: ['create'],
						resource: ['contact'],
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
						operation: ['create'],
						resource: ['contact'],
					},
				},
				default: false,
				description:
					'Update user if it exists already. If not set and user exists it will error instead.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['contact'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'First Name',
						name: 'first_name',
						type: 'string',
						default: '',
						description: 'The first name of the contact to create',
					},
					{
						displayName: 'Last Name',
						name: 'last_name',
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
						description:
							'Adds a custom property to set also values which have not been predefined.',
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
								],
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
						operation: ['delete'],
						resource: ['contact'],
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
						operation: ['get'],
						resource: ['contact'],
					},
				},
				default: 0,
				required: true,
				description: 'ID of the contact to get.',
			},

			// TODO: Does not work as expted so remove for now
			// // ----------------------------------
			// //         contact:getAll
			// // ----------------------------------
			// {
			// 	displayName: 'Full User Data',
			// 	name: 'fullUserData',
			// 	type: 'boolean',
			// 	displayOptions: {
			// 		show: {
			// 			operation: [
			// 				'getAll',
			// 			],
			// 			resource: [
			// 				'contact',
			// 			],
			// 		},
			// 	},
			// 	default: false,
			// 	description: 'If all data of the user should be returned or an abbreviated version.',
			// },
			// {
			// 	displayName: 'Return All',
			// 	name: 'returnAll',
			// 	type: 'boolean',
			// 	displayOptions: {
			// 		show: {
			// 			operation: [
			// 				'getAll',
			// 			],
			// 			resource: [
			// 				'contact',
			// 			],
			// 		},
			// 	},
			// 	default: false,
			// 	description: 'If all results should be returned or only results of a given page.',
			// },
			// {
			// 	displayName: 'Page',
			// 	name: 'page',
			// 	type: 'number',
			// 	displayOptions: {
			// 		show: {
			// 			operation: [
			// 				'getAll',
			// 			],
			// 			resource: [
			// 				'contact',
			// 			],
			// 			returnAll: [
			// 				false,
			// 			],
			// 		},
			// 	},
			// 	typeOptions: {
			// 		minValue: 1,
			// 		maxValue: 500,
			// 	},
			// 	default: 1,
			// 	description: 'Maximum 20 results per page get returned. Set which page to return.',
			// },

			// ----------------------------------
			//         contact:update
			// ----------------------------------
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['update'],
						resource: ['contact'],
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
						operation: ['update'],
						resource: ['contact'],
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
						name: 'first_name',
						type: 'string',
						default: '',
						description: 'First name of the contact',
					},
					{
						displayName: 'Last Name',
						name: 'last_name',
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
						description:
							'Adds a custom property to set also values which have not been predefined.',
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
								],
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
		const endpoint = '/admin/api.php';
		let dataKeys: string[] | undefined;

		for (let i = 0; i < items.length; i++) {
			resource = this.getNodeParameter('resource', 0) as string;
			operation = this.getNodeParameter('operation', 0) as string;
			dataKeys = undefined;

			requestMethod = 'GET';
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
						qs.api_action = 'contact_sync';
					} else {
						qs.api_action = 'contact_add';
					}

					dataKeys = ['subscriber_id'];

					body.email = this.getNodeParameter('email', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					addAdditionalFields(body as IDataObject, additionalFields);
				} else if (operation === 'delete') {
					// ----------------------------------
					//         contact:delete
					// ----------------------------------

					requestMethod = 'GET';
					qs.api_action = 'contact_delete';

					const contactId = this.getNodeParameter('contactId', i) as number;
					qs.id = contactId;
				} else if (operation === 'get') {
					// ----------------------------------
					//         contact:get
					// ----------------------------------

					requestMethod = 'GET';
					qs.api_action = 'contact_view';

					const contactId = this.getNodeParameter('contactId', i) as number;
					qs.id = contactId;

					// TODO: Does not work as expted so remove for now
					// } else if (operation === 'getAll') {
					// 	// ----------------------------------
					// 	//         contact:getAll
					// 	// ----------------------------------

					// 	requestMethod = 'GET';
					// 	qs.api_action = 'contact_list';ActiveCampaignLegacy
					// 	qs.ids = 'ALL';

					// 	returnAll = this.getNodeParameter('returnAll', i) as boolean;
					// 	if (returnAll === false) {
					// 		qs.page = this.getNodeParameter('page', i) as number;
					// 	}

					// 	const fullUserData = this.getNodeParameter('fullUserData', i) as boolean;
					// 	qs.full = fullUserData === true ? 1 : 0;
				} else if (operation === 'update') {
					// ----------------------------------
					//         contact:update
					// ----------------------------------

					requestMethod = 'POST';

					const contactId = this.getNodeParameter('contactId', i) as number;
					qs.api_action = 'contact_edit';
					qs.overwrite = 0;

					dataKeys = ['subscriber_id'];

					body.id = contactId;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					addAdditionalFields(body as IDataObject, updateFields);
				}
			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}

			let responseData;
			responseData = await activeCampaignApiRequest.call(
				this,
				requestMethod,
				endpoint,
				body,
				qs,
				dataKeys,
			);

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}

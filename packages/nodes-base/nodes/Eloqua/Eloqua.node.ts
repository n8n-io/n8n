import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { eloquaApiRequest } from './GenericFunctions';

export class Eloqua implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Oracle Eloqua',
		name: 'eloqua',
		icon: 'file:eloqua.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Oracle Eloqua REST API',
		defaults: {
			name: 'Oracle Eloqua',
			color: '#FC636B',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'eloquaApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['httpBasicAuth'],
					},
				},
			},
			{
				name: 'eloquaOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
		],
		properties: [
			// ----------------------------------
			//         Authentication
			// ----------------------------------
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Basic Authentication',
						value: 'httpBasicAuth',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'httpBasicAuth',
				description: 'The authentication method to use.',
			},
			// ----------------------------------
			//         resources
			// ----------------------------------
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Contact',
						value: 'contact',
					},
					{
						name: 'Custom Object',
						value: 'customObject',
					},
					{
						name: 'Custom Object Data',
						value: 'customObjectData',
					},
				],
				default: 'contact',
				description: 'The resource to operate on.',
			},
			// ----------------------------------
			//         operations - Contact & Custom Object & Custom Object Data (v2)
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['contact', 'customObject', 'customObjectData'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create an entry',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete an entry',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get data of an entry',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get data of all entries',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update an entry',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},
			// ----------------------------------
			//         fields - Contacts
			// ----------------------------------
			{
				displayName: 'Email Address',
				name: 'emailAddress',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						resource: ['contact'],
					},
				},
				description: 'The email address of the contact.',
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['update', 'get', 'delete'],
						resource: ['contact'],
					},
				},
				description: 'The ID of the contact.',
			},
			{
				displayName: 'Additional Fields',
				name: 'optionalFields',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						resource: ['contact'],
					},
				},
				default: {},
				description: 'Additional optional Fields of the contact',
				placeholder: 'Add Field',
				options: [
					{
						displayName: 'Current Status',
						name: 'currentStatus',
						type: 'string',
						default: '',
						description: 'The contacts current status.',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description:
							'The name of the contact. Name is ignored by the API and overwritten with the Email Address value.',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'The description of the contact.',
					},
					{
						displayName: 'First Name',
						name: 'firstName',
						type: 'string',
						default: '',
						description: 'The contacts first name.',
					},
					{
						displayName: 'Last Name',
						name: 'lastName',
						type: 'string',
						default: '',
						description: 'The contacts last name.',
					},
					{
						displayName: 'Email Format Preference',
						name: 'emailFormatPreference',
						type: 'string',
						default: '',
						description: 'The contacts email format preference.',
					},
					{
						displayName: 'Is subscribed?',
						name: 'isSubscribed',
						type: 'string',
						default: '',
						description: 'Whether or not the contact is subscribed.',
					},
					{
						displayName: 'Has bouncebacks?',
						name: 'isBounceback',
						type: 'string',
						default: '',
						description: 'Whether or not the contact has any associated bouncebacks.',
					},
					{
						displayName: 'Account Name',
						name: 'accountName',
						type: 'string',
						default: '',
						description: 'The account name in which the contact belongs.',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: 'The contacts title.',
					},
					{
						displayName: 'Subscription Date',
						name: 'subscriptionDate',
						type: 'string',
						default: '',
						description: 'The contacts subscription date.',
					},
					{
						displayName: 'Unsubscription Date',
						name: 'unsubscriptionDate',
						type: 'string',
						default: '',
						description: 'The contacts unsubscription date.',
					},
					{
						displayName: 'Bounceback Date',
						name: 'bouncebackDate',
						type: 'string',
						default: '',
						description: 'The contacts bounceback date.',
					},
					{
						displayName: 'Address 1',
						name: 'address1',
						type: 'string',
						default: '',
						description: 'The contacts first address.',
					},
					{
						displayName: 'Address 2',
						name: 'address2',
						type: 'string',
						default: '',
						description: 'The contacts second address.',
					},
					{
						displayName: 'Address 3',
						name: 'address3',
						type: 'string',
						default: '',
						description: 'The contacts third address.',
					},
					{
						displayName: 'City',
						name: 'city',
						type: 'string',
						default: '',
						description: 'The contacts city.',
					},
					{
						displayName: 'Province',
						name: 'province',
						type: 'string',
						default: '',
						description: 'The contacts province.',
					},
					{
						displayName: 'Postal Code',
						name: 'postalCode',
						type: 'string',
						default: '',
						description: 'The contacts postal code.',
					},
					{
						displayName: 'Country',
						name: 'country',
						type: 'string',
						default: '',
						description: 'The contacts country.',
					},
					{
						displayName: 'Business Phone',
						name: 'businessPhone',
						type: 'string',
						default: '',
						description: 'The contacts business phone number.',
					},
					{
						displayName: 'Mobile Phone',
						name: 'mobilePhone',
						type: 'string',
						default: '',
						description: 'The contacts mobile phone number.',
					},
					{
						displayName: 'Fax',
						name: 'fax',
						type: 'string',
						default: '',
						description: 'The contacts fax number.',
					},
					{
						displayName: 'Sales Person',
						name: 'salesPerson',
						type: 'string',
						default: '',
						description: 'The contacts account representative.',
					},
				],
			},
			{
				displayName: 'Custom Contact Fields',
				name: 'customFields',
				placeholder: 'Add Custom Field',
				description: 'Adds a custom field to set the value of.',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						resource: ['contact'],
					},
				},
				default: {},
				options: [
					{
						name: 'property',
						displayName: 'Field',
						values: [
							{
								displayName: 'Field ID',
								name: 'id',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getContactFields',
								},
								default: '',
								description: 'ID of the field to set.',
							},
							{
								displayName: 'Field Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the field to set.',
							},
						],
					},
				],
			},
			// ----------------------------------
			//         QueryParameters - contacts - getAll
			// ----------------------------------
			{
				displayName: 'Query Parameters',
				name: 'queryParameters',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['getAll'],
						resource: ['contact'],
					},
				},
				default: {},
				description: 'Query parameters to filter the results by',
				placeholder: 'Add Parameter',
				options: [
					{
						displayName: 'Count',
						name: 'count',
						type: 'number',
						default: 100,
						description:
							'Maximum number of entities to return. Must be less than or equal to 1000 and greater than or equal to 1.',
					},
					{
						displayName: 'Depth',
						name: 'depth',
						type: 'string',
						default: '',
						description:
							'Level of detail returned by the request. Eloqua APIs can retrieve entities at three different levels of depth: minimal, partial, and complete. Any other values passed are reset to minimal by default.',
					},
					{
						displayName: 'lastUpdatedAt',
						name: 'lastUpdatedAt',
						type: 'number',
						default: 0,
						description: 'Unix timestamp for the date and time the custom object was last updated.',
					},
					{
						displayName: 'Order By',
						name: 'orderBy',
						type: 'string',
						default: '',
						description: 'Specifies the field by which list results are ordered.',
					},
					{
						displayName: 'Page',
						name: 'page',
						type: 'number',
						default: 1,
						description:
							'Specifies which page of entities to return (the count parameter defines the number of entities per page). If the page parameter is not supplied, 1 will be used by default.',
					},
					{
						displayName: 'Search',
						name: 'search',
						type: 'string',
						default: '',
						description:
							'Specifies the search criteria used to retrieve entities. See the tutorial for information about using this parameter.',
					},
					{
						displayName: 'View ID',
						name: 'viewId',
						type: 'number',
						default: '',
						description:
							'Id of the contact view to filter results. Must be a valid contact view id. Example: ?viewId=100006.',
					},
				],
			},
			// ----------------------------------
			//         fields - Custom Object
			// ----------------------------------
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						resource: ['customObject'],
					},
				},
				description: 'The name of the custom object.',
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['update', 'get', 'delete'],
						resource: ['customObject'],
					},
				},
				description: 'The ID of the custom object.',
			},
			{
				displayName: 'Additional Fields',
				name: 'optionalFields',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						resource: ['customObject'],
					},
				},
				default: {},
				description: 'Additional optional Fields of the custom Object',
				placeholder: 'Add Field',
				options: [
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'The description of the custom object.',
					},
					{
						displayName: 'Email Address Field ID',
						name: 'emailAddressFieldId',
						type: 'string',
						default: '',
						description:
							'For your custom object record to have an email address field, you must create a custom object field which will act as an email address. You can then use the desired custom object fields id as the value for this parameter.',
					},
					{
						displayName: 'Display Name Field Id',
						name: 'displayNameFieldId',
						type: 'string',
						default: '',
						description:
							'For your custom object record to have a meaningful name field, you must create a custom object field which will act as a name. You can then use the desired custom object fields id as the value for this parameter.',
					},
					{
						displayName: 'Unique Code Field ID',
						name: 'uniqueCodeFieldId',
						type: 'string',
						default: '',
						description:
							'For your custom object record to have a unique identifier, you must create a <a href="http://docs.oracle.com/cloud/latest/marketingcs_gs/OMCAB/index.html#Developers/RESTAPI/2.0%20Endpoints/Custom%20objects/Custom-object-fields.htm">custom object field</a> which will act as a GUID. You can then use the desired custom object fields id as the value for this parameter.',
					},
					{
						displayName: 'Delete Linked Custom Object Data',
						name: 'deleteLinkedCustomObjectData',
						type: 'string',
						default: '',
						description:
							'Whether or not custom object records are deleted when linked contact records are deleted. Does not apply to records that are unmapped or account deletion. Deleting records is irreversible and data cannot be recovered. The default value is <code>false</code>. This feature is released under our Controlled Availability program. You can request access to this feature by submitting a request to <a href="https://support.oracle.com/epmos/faces/MosIndex.jspx">My Oracle Support</a>.',
					},
				],
			},
			{
				displayName: 'Custom custom Object Fields',
				name: 'customFields',
				placeholder: 'Add Custom Field',
				description: 'Adds a custom field to set the value of.',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						resource: ['customObject'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Field',
						name: 'fields',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								default: '',
								required: true,
								type: 'string',
								description: 'Name of the Custom Object Field',
							},
							{
								displayName: 'Data Type',
								name: 'dataType',
								default: 'text',
								required: true,
								type: 'options',
								options: [
									{
										name: 'Text',
										value: 'text',
									},
									{
										name: 'Large Text',
										value: 'largeText',
									},
									{
										name: 'Number',
										value: 'number',
									},
									{
										name: 'numeric',
										value: 'numeric',
									},
									{
										name: 'Date',
										value: 'date',
									},
								],
								description: 'Data Type of the Custom Object Field',
							},
							{
								displayName: 'Display Type',
								name: 'displayType',
								default: 'text',
								required: true,
								type: 'options',
								options: [
									{
										name: 'Text',
										value: 'text',
									},
									{
										name: 'Text Area',
										value: 'textArea',
									},
									{
										name: 'Single Select',
										value: 'singleSelect',
									},
									{
										name: 'Multi Select',
										value: 'multiSelect',
									},
									{
										name: 'Radio Button',
										value: 'radio',
									},
									{
										name: 'Checkbox',
										value: 'checkbox',
									},
									{
										name: 'Hidden',
										value: 'hidden',
									},
									{
										name: 'Submit',
										value: 'submit',
									},
								],
								description: 'Display Type of the Custom Object Field',
							},
							{
								displayName: 'Field Key',
								name: 'key',
								type: 'string',
								required: true,
								default: '',
								description: 'Key of the field to set.',
							},
							{
								displayName: 'Field Value',
								name: 'value',
								type: 'string',
								required: true,
								default: '',
								description: 'Value of the field to set.',
							},
						],
					},
				],
			},
			// ----------------------------------
			//         QueryParameters - Custom Object - getAll
			// ----------------------------------
			{
				displayName: 'Query Parameters',
				name: 'queryParameters',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['getAll'],
						resource: ['customObject'],
					},
				},
				default: {},
				description: 'Query parameters to filter the results by',
				placeholder: 'Add Parameter',
				options: [
					{
						displayName: 'Count',
						name: 'count',
						type: 'number',
						default: 100,
						description:
							'Maximum number of entities to return. Must be less than or equal to 1000 and greater than or equal to 1.',
					},
					{
						displayName: 'Depth',
						name: 'depth',
						type: 'string',
						default: '',
						description:
							'Level of detail returned by the request. Eloqua APIs can retrieve entities at three different levels of depth: minimal, partial, and complete. Any other values passed are reset to minimal by default.',
					},
					{
						displayName: 'lastUpdatedAt',
						name: 'lastUpdatedAt',
						type: 'number',
						default: 0,
						description: 'Unix timestamp for the date and time the custom object was last updated.',
					},
					{
						displayName: 'Order By',
						name: 'orderBy',
						type: 'string',
						default: '',
						description: 'Specifies the field by which list results are ordered.',
					},
					{
						displayName: 'Page',
						name: 'page',
						type: 'number',
						default: 1,
						description:
							'Specifies which page of entities to return (the count parameter defines the number of entities per page). If the page parameter is not supplied, 1 will be used by default.',
					},
					{
						displayName: 'Search',
						name: 'search',
						type: 'string',
						default: '',
						description:
							'Specifies the search criteria used to retrieve entities. See the tutorial for information about using this parameter.',
					},
				],
			},
			// ----------------------------------
			//         fields - Custom Object Data
			// ----------------------------------
			{
				displayName: 'Parent ID',
				name: 'parentId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['create', 'update', 'delete', 'get', 'getAll'],
						resource: ['customObjectData'],
					},
				},
				description: 'The Id of the custom object data parent.',
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['update', 'get', 'delete'],
						resource: ['customObjectData'],
					},
				},
				description: 'The ID of the custom object data entry.',
			},
			{
				displayName: 'Additional Fields',
				name: 'optionalFields',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						resource: ['customObjectData'],
					},
				},
				default: {},
				description: 'Additional optional Fields of the custom Object',
				placeholder: 'Add Field',
				options: [
					{
						displayName: 'Current Status',
						name: 'currentStatus',
						type: 'string',
						default: '',
						description: 'The description of the custom object.',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'The name of the custom object data.',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'The description of the custom object.',
					},
					{
						displayName: 'Source Template ID',
						name: 'sourceTemplateId',
						type: 'string',
						default: '',
						description: 'Id of the template used to create the asset.',
					},
					{
						displayName: 'Contact ID',
						name: 'contactId',
						type: 'string',
						default: '',
						description: 'The contact record Id associated to this custom object data.',
					},
					{
						displayName: 'Unique Code',
						name: 'uniqueCode',
						type: 'string',
						default: '',
						description: 'The unique code associated to the custom object data.',
					},
					{
						displayName: 'Custom Object Record Status',
						name: 'customObjectRecordStatus',
						type: 'string',
						default: '',
						description: 'The record status of the custom object data.',
					},
					{
						displayName: 'Is Mapped?',
						name: 'isMapped',
						type: 'string',
						default: '',
						description: 'Whether or not the custom object data is mapped to a custom object.',
					},
				],
			},
			{
				displayName: 'Custom custom Object Fields',
				name: 'customObjectDataCustomFields',
				placeholder: 'Add Custom Field',
				description: 'Adds a custom field to set the value of.',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						resource: ['customObjectData'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Field',
						name: 'fields',
						values: [
							{
								displayName: 'Field ID',
								name: 'id',
								type: 'string',
								required: true,
								default: '',
								description: 'ID of the field to set.',
							},
							{
								displayName: 'Field Value',
								name: 'value',
								type: 'string',
								required: true,
								default: '',
								description: 'Value of the field to set.',
							},
						],
					},
				],
			},
			// ----------------------------------
			//         QueryParameters - Custom Object Data - getAll
			// ----------------------------------
			{
				displayName: 'Query Parameters',
				name: 'queryParameters',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['getAll'],
						resource: ['customObjectData'],
					},
				},
				default: {},
				description: 'Query parameters to filter the results by',
				placeholder: 'Add Parameter',
				options: [
					{
						displayName: 'Count',
						name: 'count',
						type: 'number',
						default: 100,
						description:
							'Maximum number of entities to return. Must be less than or equal to 1000 and greater than or equal to 1.',
					},
					{
						displayName: 'Depth',
						name: 'depth',
						type: 'string',
						default: '',
						description:
							'Level of detail returned by the request. Eloqua APIs can retrieve entities at three different levels of depth: minimal, partial, and complete. Any other values passed are reset to minimal by default.',
					},
					{
						displayName: 'Order By',
						name: 'orderBy',
						type: 'string',
						default: '',
						description: 'Specifies the field by which list results are ordered.',
					},
					{
						displayName: 'Page',
						name: 'page',
						type: 'number',
						default: 1,
						description:
							'Specifies which page of entities to return (the count parameter defines the number of entities per page). If the page parameter is not supplied, 1 will be used by default.',
					},
					{
						displayName: 'Search',
						name: 'search',
						type: 'string',
						default: '',
						description:
							'Specifies the search criteria used to retrieve entities. See the tutorial for information about using this parameter.',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the available custom fields to display them to user so that he can
			// select them easily
			async getContactFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const response = await eloquaApiRequest.call(
					this,
					'GET',
					'/api/REST/1.0/assets/contact/fields',
					{},
					{},
				);
				for (const element of response.elements) {
					const fieldName = element.name;
					const fieldId = element.id;
					returnData.push({
						name: fieldName,
						value: fieldId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const staticData = this.getWorkflowStaticData('node') as IDataObject;
		let endpoint = '';
		let requestMethod = '';

		let body: any = {};
		let qs: IDataObject = {};
		let responseData;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'contact') {
					// ----------------------------------
					//         contact:create
					// ----------------------------------
					if (operation === 'create') {
						requestMethod = 'POST';
						endpoint = '/api/REST/1.0/data/contact';
						body = this.getNodeParameter('optionalFields', i) as IDataObject;
						body.emailAddress = this.getNodeParameter('emailAddress', i) as string;
						const { property } = this.getNodeParameter('customFields', i) as IDataObject;
						body.fieldValues = property;
						qs = {} as IDataObject;

						responseData = await eloquaApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							staticData,
							qs,
						);
					}
					// ----------------------------------
					//         contact:update
					// ----------------------------------
					else if (operation === 'update') {
						requestMethod = 'PUT';
						const contactId = this.getNodeParameter('id', i) as string;
						endpoint = `/api/REST/1.0/data/contact/${contactId}`;
						body = this.getNodeParameter('optionalFields', i) as IDataObject;
						body.id = contactId;
						body.emailAddress = this.getNodeParameter('emailAddress', i) as string;
						const { property } = this.getNodeParameter('customFields', i) as IDataObject;
						body.fieldValues = property;
						qs = {} as IDataObject;

						responseData = await eloquaApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							staticData,
							qs,
						);
					}
					// ----------------------------------
					//         contact:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const contactId = this.getNodeParameter('id', i) as string;
						endpoint = `/api/REST/1.0/data/contact/${contactId}`;
						qs = {} as IDataObject;

						responseData = await eloquaApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							staticData,
							qs,
						);
					}
					// ----------------------------------
					//         contact:get
					// ----------------------------------
					else if (operation === 'get') {
						requestMethod = 'GET';
						const contactId = this.getNodeParameter('id', i) as string;
						endpoint = `/api/REST/1.0/data/contact/${contactId}`;
						qs = {} as IDataObject;

						responseData = await eloquaApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							staticData,
							qs,
						);
					}
					// ----------------------------------
					//         contact:getAll
					// ----------------------------------
					else if (operation === 'getAll') {
						requestMethod = 'GET';
						endpoint = '/api/REST/1.0/data/contacts';
						qs = this.getNodeParameter('queryParameters', i) as IDataObject;

						responseData = await eloquaApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							staticData,
							qs,
						);
					}
				} else if (resource === 'customObject') {
					// ----------------------------------
					//         customObject:create
					// ----------------------------------
					if (operation === 'create') {
						requestMethod = 'POST';
						endpoint = '/api/REST/2.0/assets/customObject';

						body = this.getNodeParameter('optionalFields', i) as IDataObject;
						body.name = this.getNodeParameter('name', i) as string;
						const { fields } = this.getNodeParameter('customFields', i) as any;
						body.fields = fields;

						qs = {} as IDataObject;

						responseData = await eloquaApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							staticData,
							qs,
						);
					}
					// ----------------------------------
					//         customObject:update
					// ----------------------------------
					else if (operation === 'update') {
						requestMethod = 'PUT';
						const objectId = this.getNodeParameter('id', i) as string;
						endpoint = `/api/REST/2.0/assets/customObject/${objectId}`;

						body = this.getNodeParameter('optionalFields', i) as IDataObject;
						body.id = objectId;
						body.name = this.getNodeParameter('name', i) as string;
						const { fields } = this.getNodeParameter('customFields', i) as any;
						body.fields = fields;

						qs = {} as IDataObject;

						responseData = await eloquaApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							staticData,
							qs,
						);
					}
					// ----------------------------------
					//         customObject:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const objectId = this.getNodeParameter('id', i) as string;
						endpoint = `/api/REST/2.0/assets/customObject/${objectId}`;
						qs = {} as IDataObject;

						responseData = await eloquaApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							staticData,
							qs,
						);
					}
					// ----------------------------------
					//         customObject:get
					// ----------------------------------
					else if (operation === 'get') {
						requestMethod = 'GET';
						const objectId = this.getNodeParameter('id', i) as string;
						endpoint = `/api/REST/2.0/assets/customObject/${objectId}`;
						qs = {} as IDataObject;

						responseData = await eloquaApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							staticData,
							qs,
						);
					}
					// ----------------------------------
					//         customObject:getALL
					// ----------------------------------
					else if (operation === 'getAll') {
						requestMethod = 'GET';
						endpoint = '/api/REST/2.0/assets/customObjects';
						qs = this.getNodeParameter('queryParameters', i) as IDataObject;

						responseData = await eloquaApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							staticData,
							qs,
						);
					}
				} else if (resource === 'customObjectData') {
					// ----------------------------------
					//         customObjectData:create
					// ----------------------------------
					if (operation === 'create') {
						requestMethod = 'POST';
						const parentId = this.getNodeParameter('parentId', i) as string;
						endpoint = `/api/REST/2.0/data/customObject/${parentId}/instance`;

						body = this.getNodeParameter('optionalFields', i) as IDataObject;
						// body.accountId = '12345'; TODO: Check if Read Only
						const { fields } = this.getNodeParameter('customObjectDataCustomFields', i) as any;
						body.fieldValues = fields;

						qs = {} as IDataObject;

						responseData = await eloquaApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							staticData,
							qs,
						);
					}
					// ----------------------------------
					//         customObjectData:update
					// ----------------------------------
					else if (operation === 'update') {
						requestMethod = 'PUT';
						const parentId = this.getNodeParameter('parentId', i) as string;
						const objectDataId = this.getNodeParameter('id', i) as string;
						endpoint = `/api/REST/2.0/data/customObject/${parentId}/instance/${objectDataId}`;

						body = this.getNodeParameter('optionalFields', i) as IDataObject;
						body.id = objectDataId;
						const { fields } = this.getNodeParameter('customFields', i) as any;
						body.fieldValues = fields;

						qs = {} as IDataObject;

						responseData = await eloquaApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							staticData,
							qs,
						);
					}
					// ----------------------------------
					//         customObject:delete
					// ----------------------------------
					else if (operation === 'delete') {
						requestMethod = 'DELETE';
						const parentId = this.getNodeParameter('parentId', i) as string;
						const objectDataId = this.getNodeParameter('id', i) as string;
						endpoint = `/api/REST/2.0/data/customObject/${parentId}/instance/${objectDataId}`;

						qs = {} as IDataObject;

						responseData = await eloquaApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							staticData,
							qs,
						);
					}
					// ----------------------------------
					//         customObjectData:get
					// ----------------------------------
					else if (operation === 'get') {
						requestMethod = 'GET';
						const parentId = this.getNodeParameter('parentId', i) as string;
						const objectDataId = this.getNodeParameter('id', i) as string;
						endpoint = `/api/REST/2.0/data/customObject/${parentId}/instance/${objectDataId}`;

						qs = {} as IDataObject;

						responseData = await eloquaApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							staticData,
							qs,
						);
					}
					// ----------------------------------
					//         customObjectData:getALL
					// ----------------------------------
					else if (operation === 'getAll') {
						requestMethod = 'GET';
						const parentId = this.getNodeParameter('parentId', i) as string;
						endpoint = `/api/REST/2.0/data/customObject/${parentId}/instances`;

						qs = this.getNodeParameter('queryParameters', i) as IDataObject;

						responseData = await eloquaApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							staticData,
							qs,
						);
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData);
				}
			} catch (error: any) {
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

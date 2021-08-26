import { customerAdditionalFieldsOptions } from './../QuickBooks/descriptions/Customer/CustomerAdditionalFieldsOptions';
import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeOperationError
} from 'n8n-workflow';

import { eloquaApiRequest } from './GenericFunctions';

export class Eloqua implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Oracle Eloqua',
		name: 'eloqua',
		icon: 'file:oracle-logo.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Oracle Eloqua REST API',
		defaults: {
			name: 'Oracle Eloqua',
			color: '#FC636B'
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'eloqua',
				required: true
			}
		],
		properties: [
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
						value: 'contact'
					},
					{
						name: 'Custom Object',
						value: 'customObject'
					},
					{
						name: 'Custom Object Data',
						value: 'customObjectData'
					}
				],
				default: 'contact',
				description: 'The resource to operate on.'
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
						resource: ['contact', 'customObject']
					}
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create an entry'
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete an entry'
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get data of an entry'
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get data of all entries'
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update an entry'
					}
				],
				default: 'create',
				description: 'The operation to perform.'
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
						resource: ['contact']
					}
				},
				description: 'The name of the custom object.'
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
						resource: ['contact']
					}
				},
				description: 'The name of the custom object.'
			},
			{
				displayName: 'Additional Fields',
				name: 'optionalFields',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						resource: ['conctact']
					}
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
						description: "The contact's current status."
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'The name of the contact.'
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'The description of the contact.'
					},
					{
						displayName: 'First Name',
						name: 'firstName',
						type: 'string',
						default: '',
						description: "The contact's first name."
					},
					{
						displayName: 'Last Name',
						name: 'lastName',
						type: 'string',
						default: '',
						description: "The contact's last name."
					},
					{
						displayName: 'Email Format Preference',
						name: 'emailFormatPreference',
						type: 'string',
						default: '',
						description: "The contact's email format preference."
					},
					{
						displayName: 'Is subscribed?',
						name: 'isSubscribed',
						type: 'string',
						default: '',
						description: 'Whether or not the contact is subscribed.'
					},
					{
						displayName: 'Has bouncebacks?',
						name: 'isBounceback',
						type: 'string',
						default: '',
						description:
							'Whether or not the contact has any associated bouncebacks.'
					},
					{
						displayName: 'Account Name',
						name: 'accountName',
						type: 'string',
						default: '',
						description: 'The account name in which the contact belongs.'
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: "The contact's title."
					},
					{
						displayName: 'Subscription Date',
						name: 'subscriptionDate',
						type: 'string',
						default: '',
						description: "The contact's subscription date."
					},
					{
						displayName: 'Unsubscription Date',
						name: 'unsubscriptionDate',
						type: 'string',
						default: '',
						description: "The contact's unsubscription date."
					},
					{
						displayName: 'Bounceback Date',
						name: 'bouncebackDate',
						type: 'string',
						default: '',
						description: "The contact's bounceback date."
					},
					{
						displayName: 'Address 1',
						name: 'address1',
						type: 'string',
						default: '',
						description: "The contact's first address."
					},
					{
						displayName: 'Address 2',
						name: 'address2',
						type: 'string',
						default: '',
						description: "The contact's second address."
					},
					{
						displayName: 'Address 3',
						name: 'address3',
						type: 'string',
						default: '',
						description: "The contact's third address."
					},
					{
						displayName: 'City',
						name: 'city',
						type: 'string',
						default: '',
						description: "The contact's city."
					},
					{
						displayName: 'Province',
						name: 'province',
						type: 'string',
						default: '',
						description: "The contact's province."
					},
					{
						displayName: 'Postal Code',
						name: 'postalCode',
						type: 'string',
						default: '',
						description: "The contact's postal code."
					},
					{
						displayName: 'Country',
						name: 'country',
						type: 'string',
						default: '',
						description: "The contact's country."
					},
					{
						displayName: 'Business Phone',
						name: 'businessPhone',
						type: 'string',
						default: '',
						description: "The contact's business phone number."
					},
					{
						displayName: 'Mobile Phone',
						name: 'mobilePhone',
						type: 'string',
						default: '',
						description: "The contact's mobile phone number."
					},
					{
						displayName: 'Fax',
						name: 'fax',
						type: 'string',
						default: '',
						description: "The contact's fax number."
					},
					{
						displayName: 'Sales Person',
						name: 'salesPerson',
						type: 'string',
						default: '',
						description: "The contact's account representative."
					}
				]
			},
			{
				displayName: 'Custom Additional Object Fields',
				name: 'customAdditionalFields',
				type: 'collection',
				typeOptions: {
					multipleValues: true
				},
				placeholder: 'Add Custom Object Field',
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						resource: ['customObject']
					}
				},
				default: {},
				options: []
			},
			// ----------------------------------
			//         QueryParameters - Contacts - getAll
			// ----------------------------------
			{
				displayName: 'Query Parameters',
				name: 'queryParameters',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['getAll'],
						resource: ['customObject']
					}
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
							'Maximum number of entities to return. Must be less than or equal to 1000 and greater than or equal to 1.'
					},
					{
						displayName: 'Depth',
						name: 'depth',
						type: 'string',
						default: '',
						description:
							'Level of detail returned by the request. Eloqua APIs can retrieve entities at three different levels of depth: minimal, partial, and complete. Any other values passed are reset to minimal by default.'
					},
					{
						displayName: 'lastUpdatedAt',
						name: 'lastUpdatedAt',
						type: 'number',
						default: 0,
						description:
							'Unix timestamp for the date and time the custom object was last updated.'
					},
					{
						displayName: 'Order By',
						name: 'orderBy',
						type: 'string',
						default: '',
						description:
							'Specifies the field by which list results are ordered.'
					},
					{
						displayName: 'Page',
						name: 'page',
						type: 'number',
						default: 1,
						description:
							'Specifies which page of entities to return (the count parameter defines the number of entities per page). If the page parameter is not supplied, 1 will be used by default.'
					},
					{
						displayName: 'Search',
						name: 'search',
						type: 'string',
						default: '',
						description:
							'Specifies the search criteria used to retrieve entities. See the tutorial for information about using this parameter.'
					},
					{
						displayName: 'View ID',
						name: 'viewId',
						type: 'number',
						default: '',
						description:
							'Id of the contact view to filter results. Must be a valid contact view id. Example: ?viewId=100006.'
					}
				]
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
						resource: ['customObject']
					}
				},
				description: 'The name of the custom object.'
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
						resource: ['customObject']
					}
				},
				description: 'The name of the custom object.'
			},
			{
				displayName: 'Additional Fields',
				name: 'optionalFields',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						resource: ['customObject']
					}
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
						description: 'The description of the custom object.'
					},
					{
						displayName: 'Email Address Field ID',
						name: 'emailAddressFieldId',
						type: 'string',
						default: '',
						description:
							"For your custom object record to have an email address field, you must create a custom object field which will act as an email address. You can then use the desired custom object field's id as the value for this parameter."
					},
					{
						displayName: 'Display Name Field Id',
						name: 'displayNameFieldId',
						type: 'string',
						default: '',
						description:
							"For your custom object record to have a meaningful name field, you must create a custom object field which will act as a name. You can then use the desired custom object field's id as the value for this parameter."
					},
					{
						displayName: 'Unique Code Field ID',
						name: 'uniqueCodeFieldId',
						type: 'string',
						default: '',
						description:
							"For your custom object record to have a unique identifier, you must create a <a href='http://docs.oracle.com/cloud/latest/marketingcs_gs/OMCAB/index.html#Developers/RESTAPI/2.0%20Endpoints/Custom%20objects/Custom-object-fields.htm'>custom object field</a> which will act as a GUID. You can then use the desired custom object field's id as the value for this parameter."
					},
					{
						displayName: 'Delete Linked Custom Object Data',
						name: 'deleteLinkedCustomObjectData',
						type: 'string',
						default: '',
						description:
							"Whether or not custom object records are deleted when linked contact records are deleted. Does not apply to records that are unmapped or account deletion. Deleting records is irreversible and data cannot be recovered. The default value is <code>false</code>. This feature is released under our Controlled Availability program. You can request access to this feature by submitting a request to <a href='https://support.oracle.com/epmos/faces/MosIndex.jspx'>My Oracle Support</a>."
					}
				]
			},
			{
				displayName: 'Custom Additional Object Fields',
				name: 'customAdditionalFields',
				type: 'collection',
				typeOptions: {
					multipleValues: true
				},
				placeholder: 'Add Custom Object Field',
				displayOptions: {
					show: {
						operation: ['create', 'update'],
						resource: ['customObject']
					}
				},
				default: {},
				options: [
					{
						displayName: 'Name',
						name: 'name',
						default: '',
						type: 'string',
						description: 'Name of the Custom Object Field'
					},
					{
						displayName: 'Data Type',
						name: 'dataType',
						default: '',
						type: 'string',
						description: 'Data Type of the Custom Object Field'
					},
					{
						displayName: 'Display Type',
						name: 'displayType',
						default: '',
						type: 'string',
						description: 'Display Type of the Custom Object Field'
					},
					{
						displayName: 'Custom Key Value Pairs',
						name: 'keyValuePair',
						placeholder: 'Add custom key/value pair',
						description:
							'Adds a custom key value pair to set also values which have not been predefined.',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: false
						},
						default: {},
						options: [
							{
								name: 'property',
								displayName: 'Custom Field',
								values: [
									{
										displayName: 'Key',
										name: 'key',
										type: 'string',
										default: '',
										description: 'Key of the field to set.'
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value of the field to set.'
									}
								]
							}
						]
					}
				]
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
						resource: ['customObject']
					}
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
							'Maximum number of entities to return. Must be less than or equal to 1000 and greater than or equal to 1.'
					},
					{
						displayName: 'Depth',
						name: 'depth',
						type: 'string',
						default: '',
						description:
							'Level of detail returned by the request. Eloqua APIs can retrieve entities at three different levels of depth: minimal, partial, and complete. Any other values passed are reset to minimal by default.'
					},
					{
						displayName: 'lastUpdatedAt',
						name: 'lastUpdatedAt',
						type: 'number',
						default: 0,
						description:
							'Unix timestamp for the date and time the custom object was last updated.'
					},
					{
						displayName: 'Order By',
						name: 'orderBy',
						type: 'string',
						default: '',
						description:
							'Specifies the field by which list results are ordered.'
					},
					{
						displayName: 'Page',
						name: 'page',
						type: 'number',
						default: 1,
						description:
							'Specifies which page of entities to return (the count parameter defines the number of entities per page). If the page parameter is not supplied, 1 will be used by default.'
					},
					{
						displayName: 'Search',
						name: 'search',
						type: 'string',
						default: '',
						description:
							'Specifies the search criteria used to retrieve entities. See the tutorial for information about using this parameter.'
					}
				]
			}
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		let endpoint = '';
		let requestMethod = '';

		let body: IDataObject = {};
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
						body.address1 = 'P.O.Box 72202 - 00200';
						body.email = this.getNodeParameter('email', i) as string;
						qs = {} as IDataObject;

						responseData = await eloquaApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
					// ----------------------------------
					//         contact:getAll
					// ----------------------------------
					if (operation === 'getAll') {
						requestMethod = 'GET';
						endpoint = '/api/REST/1.0/data/contacts';
						qs = {} as IDataObject;

						responseData = await eloquaApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
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
						qs = {} as IDataObject;
						body.fields = [];
						const customAdditionalFields = this.getNodeParameter(
							'customAdditionalFields',
							i
						) as any;
						for (let j = 0; j < customAdditionalFields.length; j++) {
							body.fields[j] = {};
							const name = customAdditionalFields[j].name;
							if (name) {
								body.fields[j].name = name;
							}
							const dataType = customAdditionalFields[j].dataType;
							if (dataType) {
								body.fields[j].dataType = dataType;
							}
							const displayType = customAdditionalFields[j].displayType;
							if (displayType) {
								body.fields[j].displayType = displayType;
							}
							const keyValuePair = customAdditionalFields[j].keyValuePair;
							if (keyValuePair && keyValuePair.property) {
								let property = null;
								if (Array.isArray(keyValuePair.property)) {
									property = keyValuePair.property[0];
								} else {
									property = keyValuePair.property;
								}
								body.fields[j][property.key] = property.value;
								// Just in case many entries become posssible, if so set multiplyValues to true and uncomment code
								// for (let i = 0; i < property.length; i++){
								//     if(property[i].key && property[i].value){
								//         body.fields[j][property[i].key] = property[i].value;
								//     }
								// }
							}
						}

						responseData = await eloquaApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
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
						qs = {} as IDataObject;
						body.fields = [];
						const customAdditionalFields = this.getNodeParameter(
							'customAdditionalFields',
							i
						) as any;
						for (let j = 0; j < customAdditionalFields.length; j++) {
							body.fields[j] = {};
							const name = customAdditionalFields[j].name;
							if (name) {
								body.fields[j].name = name;
							}
							const dataType = customAdditionalFields[j].dataType;
							if (dataType) {
								body.fields[j].dataType = dataType;
							}
							const displayType = customAdditionalFields[j].displayType;
							if (displayType) {
								body.fields[j].displayType = displayType;
							}
							const keyValuePair = customAdditionalFields[j].keyValuePair;
							if (keyValuePair && keyValuePair.property) {
								let property = null;
								if (Array.isArray(keyValuePair.property)) {
									property = keyValuePair.property[0];
								} else {
									property = keyValuePair.property;
								}
								body.fields[j][property.key] = property.value;
								// Just in case many entries become posssible, if so set multiplyValues to true and uncomment code
								// for (let i = 0; i < property.length; i++){
								//     if(property[i].key && property[i].value){
								//         body.fields[j][property[i].key] = property[i].value;
								//     }
								// }
							}
						}

						responseData = await eloquaApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
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
							qs
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
							qs
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
							qs
						);
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData);
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

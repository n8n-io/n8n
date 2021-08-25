import { INodeParameters } from './../../../workflow/src/Interfaces';
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

import { eloquaApiRequest, IProduct } from './GenericFunctions';

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
/* function addAdditionalFields(body: IDataObject, additionalFields: IDataObject) {
	for (const key of Object.keys(additionalFields)) {
		if (
			key === 'customProperties' &&
			(additionalFields.customProperties as IDataObject).property !== undefined
		) {
			for (const customProperty of (additionalFields.customProperties as IDataObject)!
				.property! as CustomProperty[]) {
				body[customProperty.name] = customProperty.value;
			}
		} else if (
			key === 'fieldValues' &&
			(additionalFields.fieldValues as IDataObject).property !== undefined
		) {
			body.fieldValues = (additionalFields.fieldValues as IDataObject).property;
		} else if (
			key === 'fields' &&
			(additionalFields.fields as IDataObject).property !== undefined
		) {
			body.fields = (additionalFields.fields as IDataObject).property;
		} else {
			body[key] = additionalFields[key];
		}
	}
} */

export class Eloqua implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Eloqua',
		name: 'Eloqua',
		icon: 'file:eloqua.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Create and edit data in Eloqua',
		defaults: {
			name: 'Eloqua',
			color: '#f80000'
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
						displayName: 'Type',
						name: 'type',
						type: 'string',
						default: '',
						description:
							"The asset's type in Eloqua. This is a read-only property."
					},
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
						displayName: 'Custom Key Value Pairs',
						name: 'keyValuePair',
						placeholder: 'Add custom key/value pair',
						description:
							'Adds a custom key value pair to set also values which have not been predefined.',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true
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

<<<<<<< HEAD

=======
>>>>>>> d2ffc25e1e35e91c1a23c922674d2426b39a85d0
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
						body.emailAddress = 'asdghiufjahksdfklasdjkf@asdfasdfasf.com';
						qs = {} as IDataObject;
						console.log(body);

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
						requestMethod = 'POST';
						endpoint = '/api/REST/1.0/data/contacts';
						qs = {} as IDataObject;
						console.log(body);

						responseData = await eloquaApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
						);
					}
				}
				if (resource === 'customObject') {
					// ----------------------------------
					//         customObject:create
					// ----------------------------------
					if (operation === 'create') {
						console.log('here');
						requestMethod = 'POST';
						endpoint = '/api/REST/2.0/assets/customObject';
						// body.address1 = 'P.O.Box 72202 - 00200';
						body.name = 'jerry' + Math.random().toString();
						// body.emailAddress ="asdghiufjahksdfklasdjkf@asdfasdfgasdfasf.com"
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
					//         customObjectGetALL
					// ----------------------------------
					if (operation === 'getAll') {
						requestMethod = 'GET';
						endpoint = '/api/REST/2.0/assets/customObjects';
						qs = this.getNodeParameter('queryParameters', i) as IDataObject;
						console.log(qs);

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

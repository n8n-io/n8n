import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription
} from 'n8n-workflow';

import { eventbriteApiRequest, eventbriteApiRequestAllItems } from './GenericFunctions';

export class Eventbrite implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Eventbrite',
		name: 'eventbrite',
		icon: 'file:eventbrite.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Eventbrite REST API',
		defaults: {
			name: 'Eventbrite',
			color: '#dc5237'
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'eventbriteApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['privateKey']
					}
				}
			},
			{
				name: 'eventbriteOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2']
					}
				}
			}
		],
		properties: [
            // ----------------------------------
			//         Authentication select
			// ----------------------------------
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Private Key',
						value: 'privateKey'
					},
					{
						name: 'OAuth2',
						value: 'oAuth2'
					}
				],
				default: 'privateKey',
				description: 'The authentification method to use.'
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
						name: 'Attendee',
						value: 'attendee'
					}
				],
				default: 'attendee',
				description: 'The resource to operate on.'
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
						resource: ['attendee']
					}
				},
				options: [
					{
						name: 'Retrieve By Attendee ID',
						value: 'retrieve',
						description: 'Retrieve an Attendee by Attendee ID.'
					},
					{
						name: 'List By Event ID',
						value: 'listByEvent',
						description:
							'List Attendees by Event ID. Returns a paginated response.'
					},
					{
						name: 'List by Organization ID',
						value: 'listByOrganization',
						description:
							"List Attendees of an Organization's Events by Organization ID. Returns a paginated response."
					}
				],
				default: 'retrieve',
				description: 'The operation to perform.'
			},
			// ----------------------------------
			//         fields
			// ----------------------------------
			{
				displayName: 'Organization ID',
				name: 'organizationId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getOrganizations'
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['listByOrganization'],
						resource: ['attendee']
					}
				},
				description: 'Organization ID to query for.'
			},
			// for the load options query
			{
				displayName: 'Organization ID',
				name: 'organizationIdForEventsQuery',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getOrganizations'
				},
				default: '',
				required: false,
				displayOptions: {
					show: {
						operation: ['listByEvent', 'retrieve'],
						resource: ['attendee']
					}
				},
				description:
					'Organization ID to query for. ID used to query events for selection in the event ID field.'
			},
			{
				displayName: 'Event ID',
				name: 'eventId',
			    type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'organizationIdForEventsQuery',
					],
					loadOptionsMethod: 'getEvents',
				},
			    default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['listByEvent', 'retrieve'],
						resource: ['attendee']
					}
				},
				description: 'Event ID to query for.'
			},
			{
				displayName: 'Attendee ID',
				name: 'attendeeId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['retrieve'],
						resource: ['attendee']
					}
				},
				description: 'Attendee ID to query for.'
			},
			{
				displayName: 'Get All Entries',
				name: 'getAll',
				type: 'boolean',
				default: true,
				required: true,
				displayOptions: {
					show: {
						operation: ['listByEvent', 'listByOrganization'],
						resource: ['attendee']
					}
				},
				description:
					'Choose with paginated queries to request all pages. Might take a long time if you request a big data set.'
			}
		]
	};

	methods = {
		loadOptions: {
			// Get all the available organizations to display them to user so that he can
			// select them easily
			async getOrganizations(
				this: ILoadOptionsFunctions
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const organizations = await eventbriteApiRequestAllItems.call(
					this,
					'organizations',
					'GET',
					'/users/me/organizations'
				);
				for (const organization of organizations) {
					const organizationName = organization.name;
					const organizationId = organization.id;
					if (organizationName !== "") {
						returnData.push({
							name: organizationName,
							value: organizationId
						});
					} else {
						returnData.push({
							name: organizationId.toString(),
							value: organizationId
						});
					}
				}

				return returnData;
			},
			// Get all the available events to display them to user so that he can
			// select them easily
			async getEvents(
				this: ILoadOptionsFunctions
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const organization = this.getCurrentNodeParameter('organizationIdForEventsQuery');
				const events = await eventbriteApiRequestAllItems.call(
					this,
					'events',
					'GET',
					`/organizations/${organization}/events`
				);
				for (const event of events) {
					const eventName = event.name.text;
					const eventId = event.id;
					if (eventName !== "") {
						returnData.push({
							name: eventName,
							value: eventId
						});
					} else {
						returnData.push({
							name: eventId.toString(),
							value: eventId
						});
					}
				}
				return returnData;
			}
		}
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
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
						body.emailAddress = this.getNodeParameter(
							'emailAddress',
							i
						) as string;
						const { property } = this.getNodeParameter(
							'customFields',
							i
						) as IDataObject;
						body.fieldValues = property;
						qs = {} as IDataObject;

						responseData = await eventbriteApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
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
						body.emailAddress = this.getNodeParameter(
							'emailAddress',
							i
						) as string;
						const { property } = this.getNodeParameter(
							'customFields',
							i
						) as IDataObject;
						body.fieldValues = property;
						qs = {} as IDataObject;

						responseData = await eventbriteApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
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

						responseData = await eventbriteApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
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

						responseData = await eventbriteApiRequest.call(
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
					else if (operation === 'getAll') {
						requestMethod = 'GET';
						endpoint = '/api/REST/1.0/data/contacts';
						qs = {} as IDataObject;

						responseData = await eventbriteApiRequest.call(
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
						const { fields } = this.getNodeParameter('customFields', i) as any;
						body.fields = fields;

						qs = {} as IDataObject;

						responseData = await eventbriteApiRequest.call(
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
						const { fields } = this.getNodeParameter('customFields', i) as any;
						body.fields = fields;

						qs = {} as IDataObject;

						responseData = await eventbriteApiRequest.call(
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

						responseData = await eventbriteApiRequest.call(
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

						responseData = await eventbriteApiRequest.call(
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

						responseData = await eventbriteApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
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

						responseData = await eventbriteApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
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

						responseData = await eventbriteApiRequest.call(
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
						const parentId = this.getNodeParameter('parentId', i) as string;
						const objectDataId = this.getNodeParameter('id', i) as string;
						endpoint = `/api/REST/2.0/data/customObject/${parentId}/instance/${objectDataId}`;

						qs = {} as IDataObject;

						responseData = await eventbriteApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
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

						responseData = await eventbriteApiRequest.call(
							this,
							requestMethod,
							endpoint,
							body,
							qs
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

						responseData = await eventbriteApiRequest.call(
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

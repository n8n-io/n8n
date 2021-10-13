import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
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
			color: '#dc5237',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'eventbriteApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['privateKey'],
					},
				},
			},
			{
				name: 'eventbriteOAuth2Api',
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
			//         Authentication select
			// ----------------------------------
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Private Key',
						value: 'privateKey',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'privateKey',
				description: 'The authentification method to use.',
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
						value: 'attendee',
					},
				],
				default: 'attendee',
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
						resource: ['attendee'],
					},
				},
				options: [
					{
						name: 'Retrieve By Attendee ID',
						value: 'retrieve',
						description: 'Retrieve an Attendee by Attendee ID.',
					},
					{
						name: 'List By Event ID',
						value: 'listByEvent',
						description: 'List Attendees by Event ID. Returns a paginated response.',
					},
					{
						name: 'List by Organization ID',
						value: 'listByOrganization',
						description:
							'List Attendees of an Organizationss Events by Organization ID. Returns a paginated response.',
					},
				],
				default: 'retrieve',
				description: 'The operation to perform.',
			},
			// ----------------------------------
			//         fields
			// ----------------------------------
			{
				displayName: 'Organization ID',
				name: 'organizationId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getOrganizations',
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['listByOrganization'],
						resource: ['attendee'],
					},
				},
				description: 'Organization ID to query for.',
			},
			// for the load options query
			{
				displayName: 'Organization ID',
				name: 'organizationIdForEventsQuery',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getOrganizations',
				},
				default: '',
				required: false,
				displayOptions: {
					show: {
						operation: ['listByEvent', 'retrieve'],
						resource: ['attendee'],
					},
				},
				description:
					'Organization ID to query for. ID used to query events for selection in the event ID field.',
			},
			{
				displayName: 'Event ID',
				name: 'eventId',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['organizationIdForEventsQuery'],
					loadOptionsMethod: 'getEvents',
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['listByEvent', 'retrieve'],
						resource: ['attendee'],
					},
				},
				description: 'Event ID to query for.',
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
						resource: ['attendee'],
					},
				},
				description: 'Attendee ID to query for.',
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
						resource: ['attendee'],
					},
				},
				description:
					'Choose with paginated queries to request all pages. Might take a long time if you request a big data set.',
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the available organizations to display them to user so that he can
			// select them easily
			async getOrganizations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const organizations = await eventbriteApiRequestAllItems.call(
					this,
					'organizations',
					'GET',
					'/users/me/organizations',
				);
				for (const organization of organizations) {
					const organizationName = organization.name;
					const organizationId = organization.id;
					if (organizationName !== '') {
						returnData.push({
							name: organizationName,
							value: organizationId,
						});
					} else {
						returnData.push({
							name: organizationId.toString(),
							value: organizationId,
						});
					}
				}

				return returnData;
			},
			// Get all the available events to display them to user so that he can
			// select them easily
			async getEvents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const organization = this.getCurrentNodeParameter('organizationIdForEventsQuery');
				const events = await eventbriteApiRequestAllItems.call(
					this,
					'events',
					'GET',
					`/organizations/${organization}/events`,
				);
				for (const event of events) {
					const eventName = event.name.text;
					const eventId = event.id;
					if (eventName !== '') {
						returnData.push({
							name: eventName,
							value: eventId,
						});
					} else {
						returnData.push({
							name: eventId.toString(),
							value: eventId,
						});
					}
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
		let endpoint = '';
		let requestMethod = '';

		// tslint:disable-next-line: prefer-const -> This is disabled because it is not an issue currently with only GET requests, but might be needed as non-constant in future with Create or Update requests.
		let body: IDataObject = {};
		let qs: IDataObject = {};
		let responseData;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'attendee') {
					// ----------------------------------
					//         attendee: Retrieve
					// ----------------------------------
					if (operation === 'retrieve') {
						requestMethod = 'GET';
						const eventId = this.getNodeParameter('eventId', i) as string;
						const attendeeId = this.getNodeParameter('attendeeId', i) as string;
						endpoint = `/events/${eventId}/attendees/${attendeeId}/`;

						qs = {} as IDataObject;

						responseData = await eventbriteApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
					// ----------------------------------
					//         attendee:listByEvent
					// ----------------------------------
					else if (operation === 'listByEvent') {
						requestMethod = 'GET';
						const eventId = this.getNodeParameter('eventId', i) as string;
						const propertyName = 'attendees';
						endpoint = `/events/${eventId}/attendees/`;

						qs = {} as IDataObject;

						const getAll = this.getNodeParameter('getAll', i) as boolean;
						if (getAll) {
							responseData = await eventbriteApiRequestAllItems.call(
								this,
								propertyName,
								requestMethod,
								endpoint,
								body,
								qs,
							);
						} else {
							responseData = await eventbriteApiRequest.call(
								this,
								requestMethod,
								endpoint,
								body,
								qs,
							);
						}
					}
					// ----------------------------------
					//         attendee:listByOrganization
					// ----------------------------------
					else if (operation === 'listByOrganization') {
						requestMethod = 'GET';
						const organizationId = this.getNodeParameter('organizationId', i) as string;
						const propertyName = 'attendees';
						endpoint = `/organizations/${organizationId}/attendees/`;

						qs = {} as IDataObject;

						const getAll = this.getNodeParameter('getAll', i) as boolean;
						if (getAll) {
							responseData = await eventbriteApiRequestAllItems.call(
								this,
								propertyName,
								requestMethod,
								endpoint,
								body,
								qs,
							);
						} else {
							responseData = await eventbriteApiRequest.call(
								this,
								requestMethod,
								endpoint,
								body,
								qs,
							);
						}
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					// @ts-ignore:next-line
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}

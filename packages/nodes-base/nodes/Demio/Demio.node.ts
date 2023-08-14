import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { demioApiRequest } from './GenericFunctions';

import { eventFields, eventOperations } from './EventDescription';

import { reportFields, reportOperations } from './ReportDescription';

export class Demio implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Demio',
		name: 'demio',
		icon: 'file:demio.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Demio API',
		defaults: {
			name: 'Demio',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'demioApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Event',
						value: 'event',
					},
					{
						name: 'Report',
						value: 'report',
					},
				],
				default: 'event',
			},
			// Event
			...eventOperations,
			...eventFields,
			// Report
			...reportOperations,
			...reportFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the events to display them to user so that they can
			// select them easily
			async getEvents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const events = await demioApiRequest.call(this, 'GET', '/events', {}, { type: 'upcoming' });
				for (const event of events) {
					returnData.push({
						name: event.name,
						value: event.id,
					});
				}
				return returnData;
			},

			// Get all the sessions to display them to user so that they can
			// select them easily
			async getEventSessions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const eventId = this.getCurrentNodeParameter('eventId') as string;
				const qs: IDataObject = {};

				const resource = this.getCurrentNodeParameter('resource') as string;

				if (resource !== 'report') {
					qs.active = true;
				}

				const returnData: INodePropertyOptions[] = [];
				const { dates } = await demioApiRequest.call(this, 'GET', `/event/${eventId}`, {});
				for (const date of dates) {
					returnData.push({
						name: date.datetime,
						value: date.date_id,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'event') {
					if (operation === 'get') {
						const id = this.getNodeParameter('eventId', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (additionalFields.date_id !== undefined) {
							responseData = await demioApiRequest.call(
								this,
								'GET',
								`/event/${id}/date/${additionalFields.date_id}`,
							);
						} else {
							Object.assign(qs, additionalFields);
							responseData = await demioApiRequest.call(this, 'GET', `/event/${id}`, {}, qs);
						}
					}
					if (operation === 'getAll') {
						const filters = this.getNodeParameter('filters', i);
						const returnAll = this.getNodeParameter('returnAll', i);

						Object.assign(qs, filters);

						responseData = await demioApiRequest.call(this, 'GET', '/events', {}, qs);

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i);
							responseData = responseData.splice(0, limit);
						}
					}
					if (operation === 'register') {
						const eventId = this.getNodeParameter('eventId', i) as string;
						const firstName = this.getNodeParameter('firstName', i) as string;
						const email = this.getNodeParameter('email', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);

						const body: IDataObject = {
							name: firstName,
							email,
							id: eventId,
						};

						Object.assign(body, additionalFields);

						if (additionalFields.customFieldsUi) {
							const customFields =
								((additionalFields.customFieldsUi as IDataObject)
									?.customFieldsValues as IDataObject[]) || [];
							const data = customFields.reduce(
								(obj, value) => Object.assign(obj, { [`${value.fieldId}`]: value.value }),
								{},
							);
							Object.assign(body, data);
							delete additionalFields.customFields;
						}

						responseData = await demioApiRequest.call(this, 'PUT', '/event/register', body);
					}
				}
				if (resource === 'report') {
					if (operation === 'get') {
						const sessionId = this.getNodeParameter('dateId', i) as string;
						const filters = this.getNodeParameter('filters', i);

						Object.assign(qs, filters);

						responseData = await demioApiRequest.call(
							this,
							'GET',
							`/report/${sessionId}/participants`,
							{},
							qs,
						);
						responseData = responseData.participants;
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
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

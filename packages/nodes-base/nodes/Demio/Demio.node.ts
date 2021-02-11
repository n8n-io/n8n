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
	demioApiRequest,
} from './GenericFunctions';

import {
	eventOperations,
	eventFields,
} from './EventDescription';

import {
	reportOperations,
	reportFields,
} from './ReportDescription';

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
			color: '#02bf6f',
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
				description: 'Resource to consume.',
			},
			// Event
			...eventOperations,
			...eventFields,
			// Report
			...reportOperations,
			...reportFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			if (resource === 'event') {
				if (operation === 'get') {
					const id = this.getNodeParameter('eventId', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (additionalFields.date_id === !null) {
						responseData = await demioApiRequest.call(this, 'GET', `event/${id}/date/${additionalFields.date_id}`);
					} else {
						Object.assign(qs, additionalFields);
						responseData = await demioApiRequest.call(this, 'GET', `/event/${id}`, {}, qs);
					}
				}
				if (operation === 'getAll') {
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					Object.assign(qs, additionalFields);

					responseData = await demioApiRequest.call(this, 'GET', `/events`, {}, qs);
				}
				if (operation === 'register') {
					const firstName = this.getNodeParameter('firstName', i) as string;
					const email = this.getNodeParameter('email', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const body: IDataObject = {
						name: firstName,
						email,
					};

					Object.assign(body, additionalFields);

					responseData = await demioApiRequest.call(this, 'PUT', `/event/register`, body);
				}
			}
			if (resource === 'report') {
				if (operation === 'get') {
					const eventDateId = this.getNodeParameter('eventDateId', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					Object.assign(qs, additionalFields);

					responseData = await demioApiRequest.call(this, 'GET', `/report/${eventDateId}/participants`, {}, qs);
					responseData = responseData.participants;
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

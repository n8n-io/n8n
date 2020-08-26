import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import { customerIoApiRequest, validateJSON } from './GenericFunctions';
import { campaignOperations, campaignFields } from './CampaignDescription';
import { customerOperations, customerFields } from './CustomerDescription';
import { eventOperations, eventFields } from './EventDescription';
import { segmentOperations, segmentFields } from './SegmentDescription';
import { DateTime } from '../DateTime.node';


export class CustomerIo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Customer.io',
		name: 'customerio',
		icon: 'file:customerio.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Customer.io API',
		defaults: {
			name: 'CustomerIo',
			color: '#ffcd00',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'customerIoApi',
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
						name: 'Customer',
						value: 'customer',
					},
					{
						name: 'Event',
						value: 'event',
					},
					{
						name: 'Campaign',
						value: 'campaign',
					},
					{
						name: 'Segment',
						value: 'segment',
					},
				],
				default: 'customer',
				description: 'Resource to consume.',
			},
				// CAMPAIGN
				...campaignOperations,
				...campaignFields,
				// CUSTOMER
				...customerOperations,
				...customerFields,
				// EVENT
				...eventOperations,
				...eventFields,
				// SEGMENT
				...segmentOperations,
				...segmentFields
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: IDataObject[] = [];
		const items = this.getInputData();
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const body : IDataObject = {};

		for (let i = 0; i < items.length; i++) {

			if (resource === 'campaign') {
				if (operation === 'get') {
					const campaignId = this.getNodeParameter('campaignId', i) as number;
					const endpoint = `/campaigns/${campaignId}`;

					responseData = await customerIoApiRequest.call(this, 'GET', endpoint, body, 'beta');
				}

				if (operation === 'getAll') {
					const endpoint = `/campaigns`;

					responseData = await customerIoApiRequest.call(this, 'GET', endpoint, body, 'beta');
					responseData = responseData.campaigns;
				}

				if (operation === 'getMetrics') {
					const campaignId = this.getNodeParameter('campaignId', i) as number;
					const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;

					if (jsonParameters) {
						const additionalFieldsJson = this.getNodeParameter('additionalFieldsJson', i) as string;

						if (additionalFieldsJson !== '') {

							if (validateJSON(additionalFieldsJson) !== undefined) {

								Object.assign(body, JSON.parse(additionalFieldsJson));

							} else {
								throw new Error('Additional fields must be a valid JSON');
							}
						}
					} else {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const period = this.getNodeParameter('period', i) as string;
						let endpoint = `/campaigns/${campaignId}/metrics`;

						if (period !== 'days') {
							endpoint = `${endpoint}?period=${period}`;
						}
						if (additionalFields.steps) {
							body.steps = additionalFields.steps as number;
						}
						if (additionalFields.type) {
							if (additionalFields.type === 'urbanAirship') {
								additionalFields.type = 'urban_airship';
							} else {
								body.type = additionalFields.type as string;
							}
						}

						responseData = await customerIoApiRequest.call(this, 'GET', endpoint, body, 'beta');
						responseData = responseData.metric;
					}
				}
			}

			if (resource === 'customer') {
				if (operation === 'create') {
					const id = this.getNodeParameter('id', i) as number;
					const email = this.getNodeParameter('email', i) as string;
					const createdAt = this.getNodeParameter('createdAt', i) as string;
					const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;

					body.email = email;
					body.created_at = new Date(createdAt).getTime() / 1000;

					if (jsonParameters) {
						const additionalFieldsJson = this.getNodeParameter('additionalFieldsJson', i) as string;

						if (additionalFieldsJson !== '') {

							if (validateJSON(additionalFieldsJson) !== undefined) {

								Object.assign(body, JSON.parse(additionalFieldsJson));

							} else {
								throw new Error('Additional fields must be a valid JSON');
							}
						}
					} else {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (additionalFields.customProperties) {
							const data : any = {};
							//@ts-ignore
							additionalFields.customProperties.customProperty.map(property => {
								data[property.key] = property.value;
							});

							body.data = data;
						}
					}

					const endpoint = `/customers/${id}`;

					responseData = await customerIoApiRequest.call(this, 'PUT', endpoint, body, 'tracking');
				}

				if (operation === 'update') {
					const id = this.getNodeParameter('id', i) as number;
					const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;

					if (jsonParameters) {
						const additionalFieldsJson = this.getNodeParameter('additionalFieldsJson', i) as string;

						if (additionalFieldsJson !== '') {

							if (validateJSON(additionalFieldsJson) !== undefined) {

								Object.assign(body, JSON.parse(additionalFieldsJson));

							} else {
								throw new Error('Additional fields must be a valid JSON');
							}
						}
					} else {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (additionalFields.customProperties) {
							const data : any = {};
							//@ts-ignore
							additionalFields.customProperties.customProperty.map(property => {
								data[property.key] = property.value;
							});

							body.data = data;
						}

						if (additionalFields.email) {
							body.email = additionalFields.email as string;
						}

						if (additionalFields.createdAt) {
							body.created_at = new Date(additionalFields.createdAt as string).getTime() / 1000;
						}
					}

					const endpoint = `/customers/${id}`;

					responseData = await customerIoApiRequest.call(this, 'PUT', endpoint, body, 'tracking');
				}

				if (operation === 'delete') {
					const id = this.getNodeParameter('id', i) as number;

					body.id = id;

					const endpoint = `/customers/${id}`;

					responseData = await customerIoApiRequest.call(this, 'DELETE', endpoint, body, 'tracking');
				}
			}

			if (resource === 'event') {
				if (operation === 'track') {
					const id = this.getNodeParameter('id', i) as number;
					const name = this.getNodeParameter('name', i) as string;
					const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;

					body.name = name;

					if (jsonParameters) {
						const additionalFieldsJson = this.getNodeParameter('additionalFieldsJson', i) as string;

						if (additionalFieldsJson !== '') {

							if (validateJSON(additionalFieldsJson) !== undefined) {

								Object.assign(body, JSON.parse(additionalFieldsJson));

							} else {
								throw new Error('Additional fields must be a valid JSON');
							}
						}
					} else {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const data : any = {};

						if (additionalFields.customAttributes) {
							//@ts-ignore
							additionalFields.customAttributes.customAttribute.map(property => {
								data[property.key] = property.value;
							});
						}

						if (additionalFields.type) {
							data.type = additionalFields.type as string;
						}

						body.data = data;
					}

					const endpoint = `/customers/${id}/events`;

					responseData = await customerIoApiRequest.call(this, 'POST', endpoint, body, 'tracking');
				}

				if (operation === 'trackAnonymous') {
					const name = this.getNodeParameter('name', i) as string;
					const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;

					body.name = name;

					if (jsonParameters) {
						const additionalFieldsJson = this.getNodeParameter('additionalFieldsJson', i) as string;

						if (additionalFieldsJson !== '') {

							if (validateJSON(additionalFieldsJson) !== undefined) {

								Object.assign(body, JSON.parse(additionalFieldsJson));

							} else {
								throw new Error('Additional fields must be a valid JSON');
							}
						}
					} else {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const data : any = {};

						if (additionalFields.customAttributes) {
							//@ts-ignore
							additionalFields.customAttributes.customAttribute.map(property => {
								data[property.key] = property.value;
							});
						}
						body.data = data;
					}

					const endpoint = `/events`;
					responseData = await customerIoApiRequest.call(this, 'POST', endpoint, body, 'tracking');
				}
			}

			if (resource === 'segment') {
				const id = this.getNodeParameter('id', i) as number;
				const ids = this.getNodeParameter('ids', i) as string;
				const idArray : string[] = [];

				ids.split(',').map(id => {
					idArray.push(id);
				});

				body.id = id;
				body.ids = idArray;

				let endpoint = ``;

				if (operation === 'add') {
					endpoint = `/segments/${id}/add_customers`;
				} else {
					endpoint = `/segments/${id}/remove_customers`;
				}

				responseData = await customerIoApiRequest.call(this, 'POST', endpoint, body, 'tracking');
			}

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as unknown as IDataObject);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}

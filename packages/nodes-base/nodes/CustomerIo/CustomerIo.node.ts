import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { customerIoApiRequest, validateJSON } from './GenericFunctions';
import { campaignFields, campaignOperations } from './CampaignDescription';
import { customerFields, customerOperations } from './CustomerDescription';
import { eventFields, eventOperations } from './EventDescription';
import { segmentFields, segmentOperations } from './SegmentDescription';

export class CustomerIo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Customer.io',
		name: 'customerIo',
		icon: 'file:customerio.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Customer.io API',
		defaults: {
			name: 'CustomerIo',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'customerIoApi',
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
			...segmentFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: IDataObject[] = [];
		const items = this.getInputData();
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const body: IDataObject = {};

		let responseData;
		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'campaign') {
					if (operation === 'get') {
						const campaignId = this.getNodeParameter('campaignId', i) as number;
						const endpoint = `/campaigns/${campaignId}`;

						responseData = await customerIoApiRequest.call(this, 'GET', endpoint, body, 'beta');
						responseData = responseData.campaign;
					}

					if (operation === 'getAll') {
						const endpoint = `/campaigns`;

						responseData = await customerIoApiRequest.call(this, 'GET', endpoint, body, 'beta');
						responseData = responseData.campaigns;
					}

					if (operation === 'getMetrics') {
						const campaignId = this.getNodeParameter('campaignId', i) as number;
						const jsonParameters = this.getNodeParameter('jsonParameters', i);

						if (jsonParameters) {
							const additionalFieldsJson = this.getNodeParameter(
								'additionalFieldsJson',
								i,
							) as string;

							if (additionalFieldsJson !== '') {
								if (validateJSON(additionalFieldsJson) !== undefined) {
									Object.assign(body, JSON.parse(additionalFieldsJson));
								} else {
									throw new NodeOperationError(
										this.getNode(),
										'Additional fields must be a valid JSON',
										{ itemIndex: i },
									);
								}
							}
						} else {
							const additionalFields = this.getNodeParameter('additionalFields', i);
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
					if (operation === 'upsert') {
						const id = this.getNodeParameter('id', i) as number;
						const jsonParameters = this.getNodeParameter('jsonParameters', i);

						if (jsonParameters) {
							const additionalFieldsJson = this.getNodeParameter(
								'additionalFieldsJson',
								i,
							) as string;

							if (additionalFieldsJson !== '') {
								if (validateJSON(additionalFieldsJson) !== undefined) {
									Object.assign(body, JSON.parse(additionalFieldsJson));
								} else {
									throw new NodeOperationError(
										this.getNode(),
										'Additional fields must be a valid JSON',
										{ itemIndex: i },
									);
								}
							}
						} else {
							const additionalFields = this.getNodeParameter('additionalFields', i);

							if (additionalFields.customProperties) {
								const data: any = {}; // tslint:disable-line:no-any
								//@ts-ignore
								additionalFields.customProperties.customProperty.map((property) => {
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

						responseData = Object.assign({ id }, body);
					}

					if (operation === 'delete') {
						const id = this.getNodeParameter('id', i) as number;

						body.id = id;

						const endpoint = `/customers/${id}`;

						await customerIoApiRequest.call(this, 'DELETE', endpoint, body, 'tracking');

						responseData = {
							success: true,
						};
					}
				}

				if (resource === 'event') {
					if (operation === 'track') {
						const customerId = this.getNodeParameter('customerId', i) as number;
						const eventName = this.getNodeParameter('eventName', i) as string;
						const jsonParameters = this.getNodeParameter('jsonParameters', i);

						body.name = eventName;

						if (jsonParameters) {
							const additionalFieldsJson = this.getNodeParameter(
								'additionalFieldsJson',
								i,
							) as string;

							if (additionalFieldsJson !== '') {
								if (validateJSON(additionalFieldsJson) !== undefined) {
									Object.assign(body, JSON.parse(additionalFieldsJson));
								} else {
									throw new NodeOperationError(
										this.getNode(),
										'Additional fields must be a valid JSON',
										{ itemIndex: i },
									);
								}
							}
						} else {
							const additionalFields = this.getNodeParameter('additionalFields', i);
							const data: any = {}; // tslint:disable-line:no-any

							if (additionalFields.customAttributes) {
								//@ts-ignore
								additionalFields.customAttributes.customAttribute.map((property) => {
									data[property.key] = property.value;
								});
							}

							if (additionalFields.type) {
								data.type = additionalFields.type as string;
							}

							body.data = data;
						}

						const endpoint = `/customers/${customerId}/events`;

						await customerIoApiRequest.call(this, 'POST', endpoint, body, 'tracking');
						responseData = {
							success: true,
						};
					}

					if (operation === 'trackAnonymous') {
						const eventName = this.getNodeParameter('eventName', i) as string;
						const jsonParameters = this.getNodeParameter('jsonParameters', i);

						body.name = eventName;

						if (jsonParameters) {
							const additionalFieldsJson = this.getNodeParameter(
								'additionalFieldsJson',
								i,
							) as string;

							if (additionalFieldsJson !== '') {
								if (validateJSON(additionalFieldsJson) !== undefined) {
									Object.assign(body, JSON.parse(additionalFieldsJson));
								} else {
									throw new NodeOperationError(
										this.getNode(),
										'Additional fields must be a valid JSON',
										{ itemIndex: i },
									);
								}
							}
						} else {
							const additionalFields = this.getNodeParameter('additionalFields', i);
							const data: any = {}; // tslint:disable-line:no-any

							if (additionalFields.customAttributes) {
								//@ts-ignore
								additionalFields.customAttributes.customAttribute.map((property) => {
									data[property.key] = property.value;
								});
							}
							body.data = data;
						}

						const endpoint = `/events`;
						await customerIoApiRequest.call(this, 'POST', endpoint, body, 'tracking');

						responseData = {
							success: true,
						};
					}
				}

				if (resource === 'segment') {
					const segmentId = this.getNodeParameter('segmentId', i) as number;
					const customerIds = this.getNodeParameter('customerIds', i) as string;

					body.id = segmentId;
					body.ids = customerIds.split(',');

					let endpoint = '';

					if (operation === 'add') {
						endpoint = `/segments/${segmentId}/add_customers`;
					} else {
						endpoint = `/segments/${segmentId}/remove_customers`;
					}

					responseData = await customerIoApiRequest.call(this, 'POST', endpoint, body, 'tracking');

					responseData = {
						success: true,
					};
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as unknown as IDataObject);
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

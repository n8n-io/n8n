import type { IExecuteFunctions } from 'n8n-core';
import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { driftApiRequest } from './GenericFunctions';
import { contactFields, contactOperations } from './ContactDescription';
import type { IContact } from './ContactInterface';

export class Drift implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Drift',
		name: 'drift',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:drift.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Drift API',
		defaults: {
			name: 'Drift',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'driftApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['accessToken'],
					},
				},
			},
			{
				name: 'driftOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'accessToken',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Contact',
						value: 'contact',
					},
				],
				default: 'contact',
			},
			...contactOperations,
			...contactFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'contact') {
					//https://devdocs.drift.com/docs/creating-a-contact
					if (operation === 'create') {
						const email = this.getNodeParameter('email', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const body: IContact = {
							email,
						};
						if (additionalFields.name) {
							body.name = additionalFields.name as string;
						}
						if (additionalFields.phone) {
							body.phone = additionalFields.phone as string;
						}
						responseData = await driftApiRequest.call(this, 'POST', '/contacts', {
							attributes: body,
						});
						responseData = responseData.data;
					}
					//https://devdocs.drift.com/docs/updating-a-contact
					if (operation === 'update') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: IContact = {};
						if (updateFields.name) {
							body.name = updateFields.name as string;
						}
						if (updateFields.phone) {
							body.phone = updateFields.phone as string;
						}
						if (updateFields.email) {
							body.email = updateFields.email as string;
						}
						responseData = await driftApiRequest.call(this, 'PATCH', `/contacts/${contactId}`, {
							attributes: body,
						});
						responseData = responseData.data;
					}
					//https://devdocs.drift.com/docs/retrieving-contact
					if (operation === 'get') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						responseData = await driftApiRequest.call(this, 'GET', `/contacts/${contactId}`);
						responseData = responseData.data;
					}
					//https://devdocs.drift.com/docs/listing-custom-attributes
					if (operation === 'getCustomAttributes') {
						responseData = await driftApiRequest.call(this, 'GET', '/contacts/attributes');
						responseData = responseData.data.properties;
					}
					//https://devdocs.drift.com/docs/removing-a-contact
					if (operation === 'delete') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						responseData = await driftApiRequest.call(this, 'DELETE', `/contacts/${contactId}`);
						responseData = { success: true };
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

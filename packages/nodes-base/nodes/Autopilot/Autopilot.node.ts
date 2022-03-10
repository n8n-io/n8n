import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	autopilotApiRequest,
	autopilotApiRequestAllItems,
} from './GenericFunctions';

import {
	contactFields,
	contactOperations,
} from './ContactDescription';

import {
	contactJourneyFields,
	contactJourneyOperations,
} from './ContactJourneyDescription';

import {
	contactListFields,
	contactListOperations,
} from './ContactListDescription';

import {
	listFields,
	listOperations,
} from './ListDescription';

export class Autopilot implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Autopilot',
		name: 'autopilot',
		icon: 'file:autopilot.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Autopilot API',
		defaults: {
			name: 'Autopilot',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'autopilotApi',
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
						name: 'Contact',
						value: 'contact',
					},
					{
						name: 'Contact Journey',
						value: 'contactJourney',
					},
					{
						name: 'Contact List',
						value: 'contactList',
					},
					{
						name: 'List',
						value: 'list',
					},
				],
				default: 'contact',
				description: 'The resource to operate on.',
			},

			...contactOperations,
			...contactFields,
			...contactJourneyOperations,
			...contactJourneyFields,
			...contactListOperations,
			...contactListFields,
			...listOperations,
			...listFields,
		],
	};

	methods = {
		loadOptions: {
			async getCustomFields(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const customFields = await autopilotApiRequest.call(
					this,
					'GET',
					'/contacts/custom_fields',
				);
				for (const customField of customFields) {
					returnData.push({
						name: customField.name,
						value: `${customField.name}-${customField.fieldType}`,
					});
				}
				return returnData;
			},
			async getLists(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { lists } = await autopilotApiRequest.call(
					this,
					'GET',
					'/lists',
				);
				for (const list of lists) {
					returnData.push({
						name: list.title,
						value: list.list_id,
					});
				}
				return returnData;
			},
			async getTriggers(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { triggers } = await autopilotApiRequest.call(
					this,
					'GET',
					'/triggers',
				);
				for (const trigger of triggers) {
					returnData.push({
						name: trigger.journey,
						value: trigger.trigger_id,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'contact') {
					if (operation === 'upsert') {
						const email = this.getNodeParameter('email', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							Email: email,
						};

						Object.assign(body, additionalFields);

						if (body.customFieldsUi) {
							const customFieldsValues = (body.customFieldsUi as IDataObject).customFieldsValues as IDataObject[];

							body.custom = {};

							for (const customField of customFieldsValues) {
								const [name, fieldType] = (customField.key as string).split('-');

								const fieldName = name.replace(/\s/g, '--');

								//@ts-ignore
								body.custom[`${fieldType}--${fieldName}`] = customField.value;
							}
							delete body.customFieldsUi;
						}

						if (body.autopilotList) {
							body._autopilot_list = body.autopilotList;
							delete body.autopilotList;
						}

						if (body.autopilotSessionId) {
							body._autopilot_session_id = body.autopilotSessionId;
							delete body.autopilotSessionId;
						}

						if (body.newEmail) {
							body._NewEmail = body.newEmail;
							delete body.newEmail;
						}

						responseData = await autopilotApiRequest.call(
							this,
							'POST',
							`/contact`,
							{ contact: body },
						);
					}

					if (operation === 'delete') {
						const contactId = this.getNodeParameter('contactId', i) as string;

						responseData = await autopilotApiRequest.call(
							this,
							'DELETE',
							`/contact/${contactId}`,
						);

						responseData = { success: true };
					}

					if (operation === 'get') {
						const contactId = this.getNodeParameter('contactId', i) as string;

						responseData = await autopilotApiRequest.call(
							this,
							'GET',
							`/contact/${contactId}`,
						);
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (returnAll === false) {
							qs.limit = this.getNodeParameter('limit', i) as number;
						}
						responseData = await autopilotApiRequestAllItems.call(
							this,
							'contacts',
							'GET',
							`/contacts`,
							{},
							qs,
						);

						if (returnAll === false) {
							responseData = responseData.splice(0, qs.limit);
						}
					}
				}
				if (resource === 'contactJourney') {
					if (operation === 'add') {

						const triggerId = this.getNodeParameter('triggerId', i) as string;

						const contactId = this.getNodeParameter('contactId', i) as string;

						responseData = await autopilotApiRequest.call(
							this,
							'POST',
							`/trigger/${triggerId}/contact/${contactId}`,
						);

						responseData = { success: true };
					}
				}
				if (resource === 'contactList') {
					if (['add', 'remove', 'exist'].includes(operation)) {

						const listId = this.getNodeParameter('listId', i) as string;

						const contactId = this.getNodeParameter('contactId', i) as string;

						const method: { [key: string]: string } = {
							'add': 'POST',
							'remove': 'DELETE',
							'exist': 'GET',
						};

						const endpoint = `/list/${listId}/contact/${contactId}`;

						if (operation === 'exist') {
							try {
								await autopilotApiRequest.call(this, method[operation], endpoint);
								responseData = { exist: true };
							} catch (error) {
								responseData = { exist: false };
							}
						} else if (operation === 'add' || operation === 'remove') {
							responseData = await autopilotApiRequest.call(this, method[operation], endpoint);
							responseData['success'] = true;
						}
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						const listId = this.getNodeParameter('listId', i) as string;

						if (returnAll === false) {
							qs.limit = this.getNodeParameter('limit', i) as number;
						}
						responseData = await autopilotApiRequestAllItems.call(
							this,
							'contacts',
							'GET',
							`/list/${listId}/contacts`,
							{},
							qs,
						);

						if (returnAll === false) {
							responseData = responseData.splice(0, qs.limit);
						}
					}
				}
				if (resource === 'list') {
					if (operation === 'create') {

						const name = this.getNodeParameter('name', i) as string;

						const body: IDataObject = {
							name,
						};

						responseData = await autopilotApiRequest.call(
							this,
							'POST',
							`/list`,
							body,
						);
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						if (returnAll === false) {
							qs.limit = this.getNodeParameter('limit', i) as number;
						}
						responseData = await autopilotApiRequest.call(
							this,
							'GET',
							'/lists',
						);

						responseData = responseData.lists;

						if (returnAll === false) {
							responseData = responseData.splice(0, qs.limit);
						}
					}
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else if (responseData !== undefined) {
					returnData.push(responseData as IDataObject);
				}

			} catch (error) {

				if (this.continueOnFail()) {
					returnData.push({ error: error.toString() });
					continue;
				}

				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}

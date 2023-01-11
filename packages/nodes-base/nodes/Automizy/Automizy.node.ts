import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeExecutionWithMetadata,
} from 'n8n-workflow';

import { automizyApiRequest, automizyApiRequestAllItems } from './GenericFunctions';

import { contactFields, contactOperations } from './ContactDescription';

import { listFields, listOperations } from './ListDescription';

export class Automizy implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Automizy',
		name: 'automizy',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:automizy.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Automizy API',
		defaults: {
			name: 'Automizy',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'automizyApi',
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
						name: 'Contact',
						value: 'contact',
					},
					{
						name: 'List',
						value: 'list',
					},
				],
				default: 'contact',
			},

			...contactOperations,
			...contactFields,

			...listOperations,
			...listFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the tags to display them to user so that he can
			// select them easily
			async getLists(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const lists = await automizyApiRequestAllItems.call(
					this,
					'smartLists',
					'GET',
					'/smart-lists',
				);
				for (const list of lists) {
					returnData.push({
						name: list.name,
						value: list.id,
					});
				}
				return returnData;
			},
			async getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const tags = await automizyApiRequestAllItems.call(
					this,
					'contactTags',
					'GET',
					'/contacts/tag-manager',
				);
				for (const tag of tags) {
					returnData.push({
						name: tag.name,
						value: tag.name,
					});
				}
				return returnData;
			},
			async getCustomFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const customFields = await automizyApiRequestAllItems.call(
					this,
					'customFields',
					'GET',
					'/custom-fields',
				);
				for (const customField of customFields) {
					returnData.push({
						name: customField.name,
						value: customField.id,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			if (resource === 'contact') {
				if (operation === 'create') {
					const listId = this.getNodeParameter('listId', i) as string;

					const email = this.getNodeParameter('email', i) as string;

					const additionalFields = this.getNodeParameter('additionalFields', i);

					const body: IDataObject = {
						email,
					};

					Object.assign(body, additionalFields);

					if (body.customFieldsUi) {
						const customFieldsValues = (body.customFieldsUi as IDataObject)
							.customFieldsValues as IDataObject[];

						body.customFields = {};

						for (const customField of customFieldsValues) {
							//@ts-ignore
							body.customFields[customField.key] = customField.value;
						}

						delete body.customFieldsUi;
					}

					responseData = await automizyApiRequest.call(
						this,
						'POST',
						`/smart-lists/${listId}/contacts`,
						body,
					);
					responseData = responseData.contacts;
					responseData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);
				}

				if (operation === 'delete') {
					const contactId = this.getNodeParameter('contactId', i) as string;

					responseData = await automizyApiRequest.call(this, 'DELETE', `/contacts/${contactId}`);

					responseData = { success: true };
					responseData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);
				}

				if (operation === 'get') {
					const contactId = this.getNodeParameter('contactId', i) as string;

					responseData = await automizyApiRequest.call(this, 'GET', `/contacts/${contactId}`);
					responseData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);
				}

				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i);

					const listId = this.getNodeParameter('listId', i) as string;

					const additionalFields = this.getNodeParameter('additionalFields', i);

					if (additionalFields.direction && additionalFields.sortBy) {
						qs.order = `${additionalFields.sortBy}:${additionalFields.direction}`;
					}

					if (additionalFields.fields) {
						qs.fields = additionalFields.fields;
					}

					if (returnAll) {
						responseData = await automizyApiRequestAllItems.call(
							this,
							'contacts',
							'GET',
							`/smart-lists/${listId}/contacts`,
							{},
							qs,
						);
					} else {
						qs.limit = this.getNodeParameter('limit', i);

						responseData = await automizyApiRequest.call(
							this,
							'GET',
							`/smart-lists/${listId}/contacts`,
							{},
							qs,
						);
					}

					responseData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);
				}

				if (operation === 'update') {
					const email = this.getNodeParameter('email', i) as string;

					const updateFields = this.getNodeParameter('updateFields', i);

					const body: IDataObject = {};

					Object.assign(body, updateFields);

					if (body.customFieldsUi) {
						const customFieldsValues = (body.customFieldsUi as IDataObject)
							.customFieldsValues as IDataObject[];

						body.customFields = {};

						for (const customField of customFieldsValues) {
							//@ts-ignore
							body.customFields[customField.key] = customField.value;
						}

						delete body.customFieldsUi;
					}

					responseData = await automizyApiRequest.call(this, 'PATCH', `/contacts/${email}`, body);
					responseData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);
				}
			}

			if (resource === 'list') {
				if (operation === 'create') {
					const name = this.getNodeParameter('name', i) as string;

					const body: IDataObject = {
						name,
					};

					responseData = await automizyApiRequest.call(this, 'POST', '/smart-lists', body);
					responseData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);
				}

				if (operation === 'delete') {
					const listId = this.getNodeParameter('listId', i) as string;

					responseData = await automizyApiRequest.call(this, 'DELETE', `/smart-lists/${listId}`);

					responseData = { success: true };
					responseData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);
				}

				if (operation === 'get') {
					const listId = this.getNodeParameter('listId', i) as string;

					responseData = await automizyApiRequest.call(this, 'GET', `/smart-lists/${listId}`);
					responseData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);
				}

				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i);

					const additionalFields = this.getNodeParameter('additionalFields', i);

					if (additionalFields.direction && additionalFields.sortBy) {
						qs.order = `${additionalFields.sortBy}:${additionalFields.direction}`;
					}

					if (additionalFields.fields) {
						qs.fields = additionalFields.fields;
					}

					if (returnAll) {
						responseData = await automizyApiRequestAllItems.call(
							this,
							'smartLists',
							'GET',
							'/smart-lists',
							{},
							qs,
						);
					} else {
						qs.limit = this.getNodeParameter('limit', i);

						responseData = await automizyApiRequest.call(this, 'GET', '/smart-lists', {}, qs);

						responseData = responseData.smartLists;
					}

					responseData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);
				}

				if (operation === 'update') {
					const listId = this.getNodeParameter('listId', i) as string;

					const name = this.getNodeParameter('name', i) as string;

					const body: IDataObject = {
						name,
					};

					responseData = await automizyApiRequest.call(
						this,
						'PATCH',
						`/smart-lists/${listId}`,
						body,
					);

					responseData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: { item: i } },
					);
				}
			}
		}

		returnData.push(...(responseData as NodeExecutionWithMetadata[]));

		return this.prepareOutputData(returnData);
	}
}

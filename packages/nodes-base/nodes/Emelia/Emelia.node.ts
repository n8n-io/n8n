import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';

import { emeliaApiTest, emeliaGraphqlRequest, loadResource } from './GenericFunctions';

import { campaignFields, campaignOperations } from './CampaignDescription';

import { contactListFields, contactListOperations } from './ContactListDescription';

import { isEmpty } from 'lodash';

export class Emelia implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Emelia',
		name: 'emelia',
		icon: 'file:emelia.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Emelia API',
		defaults: {
			name: 'Emelia',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'emeliaApi',
				required: true,
				testedBy: 'emeliaApiTest',
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
						name: 'Campaign',
						value: 'campaign',
					},
					{
						name: 'Contact List',
						value: 'contactList',
					},
				],
				default: 'campaign',
				required: true,
			},
			...campaignOperations,
			...campaignFields,
			...contactListOperations,
			...contactListFields,
		],
	};

	methods = {
		credentialTest: {
			emeliaApiTest,
		},

		loadOptions: {
			async getCampaigns(this: ILoadOptionsFunctions) {
				return loadResource.call(this, 'campaign');
			},

			async getContactLists(this: ILoadOptionsFunctions) {
				return loadResource.call(this, 'contactList');
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'campaign') {
					// **********************************
					//            campaign
					// **********************************

					if (operation === 'addContact') {
						// ----------------------------------
						//       campaign: addContact
						// ----------------------------------

						const contact = {
							email: this.getNodeParameter('contactEmail', i) as string,
						};

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (!isEmpty(additionalFields)) {
							Object.assign(contact, additionalFields);
						}

						if (additionalFields.customFieldsUi) {
							const customFields =
								(((additionalFields.customFieldsUi as IDataObject) || {})
									.customFieldsValues as IDataObject[]) || [];
							const data = customFields.reduce(
								(obj, value) => Object.assign(obj, { [`${value.fieldName}`]: value.value }),
								{},
							);
							Object.assign(contact, data);
							//@ts-ignore
							delete contact.customFieldsUi;
						}

						const responseData = await emeliaGraphqlRequest.call(this, {
							query: `
									mutation AddContactToCampaignHook($id: ID!, $contact: JSON!) {
										addContactToCampaignHook(id: $id, contact: $contact)
								}`,
							operationName: 'AddContactToCampaignHook',
							variables: {
								id: this.getNodeParameter('campaignId', i),
								contact,
							},
						});

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({
								contactId: responseData.data.addContactToCampaignHook,
							}),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'create') {
						// ----------------------------------
						//        campaign: create
						// ----------------------------------

						const responseData = await emeliaGraphqlRequest.call(this, {
							operationName: 'createCampaign',
							query: `
									mutation createCampaign($name: String!) {
										createCampaign(name: $name) {
											_id
											name
											status
											createdAt
											provider
											startAt
											estimatedEnd
										}
									}`,
							variables: {
								name: this.getNodeParameter('campaignName', i),
							},
						});

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData.data.createCampaign),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'get') {
						// ----------------------------------
						//        campaign: get
						// ----------------------------------

						const responseData = await emeliaGraphqlRequest.call(this, {
							query: `
									query campaign($id: ID!){
										campaign(id: $id){
											_id
											name
											status
											createdAt
											schedule{
												dailyContact
												dailyLimit
												minInterval
												maxInterval
												trackLinks
												trackOpens
												timeZone
												days
												start
												end
												eventToStopMails
											}
											provider
											startAt
											recipients{
												total_count
											}
											estimatedEnd
										}
									}`,
							operationName: 'campaign',
							variables: {
								id: this.getNodeParameter('campaignId', i),
							},
						});

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(responseData.data.campaign),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'getAll') {
						// ----------------------------------
						//        campaign: getAll
						// ----------------------------------

						const responseData = await emeliaGraphqlRequest.call(this, {
							query: `
									query all_campaigns {
										all_campaigns {
											_id
											name
											status
											createdAt
											stats {
												mailsSent
												uniqueOpensPercent
												opens
												linkClickedPercent
												repliedPercent
												bouncedPercent
												unsubscribePercent
												progressPercent
											}
										}
									}`,
							operationName: 'all_campaigns',
						});

						let campaigns = responseData.data.all_campaigns;

						const returnAll = this.getNodeParameter('returnAll', i);

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							campaigns = campaigns.slice(0, limit);
						}

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(campaigns),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'pause') {
						// ----------------------------------
						//        campaign: pause
						// ----------------------------------

						await emeliaGraphqlRequest.call(this, {
							query: `
									mutation pauseCampaign($id: ID!) {
										pauseCampaign(id: $id)
									}`,
							operationName: 'pauseCampaign',
							variables: {
								id: this.getNodeParameter('campaignId', i),
							},
						});

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ success: true }),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'start') {
						// ----------------------------------
						//        campaign: start
						// ----------------------------------

						await emeliaGraphqlRequest.call(this, {
							query: `
									mutation startCampaign($id: ID!) {
										startCampaign(id: $id)
									}`,
							operationName: 'startCampaign',
							variables: {
								id: this.getNodeParameter('campaignId', i),
							},
						});

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ success: true }),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'duplicate') {
						// ----------------------------------
						//        campaign: duplicate
						// ----------------------------------

						const options = this.getNodeParameter('options', i) as IDataObject;
						const variables = {
							fromId: this.getNodeParameter('campaignId', i),
							name: this.getNodeParameter('campaignName', i),
							copySettings: true,
							copyMails: true,
							copyContacts: false,
							copyProvider: true,
							...options,
						};
						const {
							data: { duplicateCampaign },
						} = await emeliaGraphqlRequest.call(this, {
							query: `
									mutation duplicateCampaign(
										$fromId: ID!
										$name: String!
										$copySettings: Boolean!
										$copyMails: Boolean!
										$copyContacts: Boolean!
										$copyProvider: Boolean!
									) {
										duplicateCampaign(
											fromId: $fromId
											name: $name
											copySettings: $copySettings
											copyMails: $copyMails
											copyContacts: $copyContacts
											copyProvider: $copyProvider
										)
									}`,
							operationName: 'duplicateCampaign',
							variables,
						});

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ _id: duplicateCampaign }),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
				} else if (resource === 'contactList') {
					// **********************************
					//           ContactList
					// **********************************

					if (operation === 'add') {
						// ----------------------------------
						//      contactList: add
						// ----------------------------------

						const contact = {
							email: this.getNodeParameter('contactEmail', i) as string,
						};

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (!isEmpty(additionalFields)) {
							Object.assign(contact, additionalFields);
						}

						if (additionalFields.customFieldsUi) {
							const customFields =
								(((additionalFields.customFieldsUi as IDataObject) || {})
									.customFieldsValues as IDataObject[]) || [];
							const data = customFields.reduce(
								(obj, value) => Object.assign(obj, { [`${value.fieldName}`]: value.value }),
								{},
							);
							Object.assign(contact, data);
							//@ts-ignore
							delete contact.customFieldsUi;
						}

						const responseData = await emeliaGraphqlRequest.call(this, {
							query: `
									mutation AddContactsToListHook($id: ID!, $contact: JSON!) {
										addContactsToListHook(id: $id, contact: $contact)
									}`,
							operationName: 'AddContactsToListHook',
							variables: {
								id: this.getNodeParameter('contactListId', i),
								contact,
							},
						});

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ contactId: responseData.data.addContactsToListHook }),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					} else if (operation === 'getAll') {
						// ----------------------------------
						//       contactList: getAll
						// ----------------------------------

						const responseData = await emeliaGraphqlRequest.call(this, {
							query: `
									query contact_lists{
										contact_lists{
											_id
											name
											contactCount
											fields
											usedInCampaign
										}
									}`,
							operationName: 'contact_lists',
						});

						let contactLists = responseData.data.contact_lists;

						const returnAll = this.getNodeParameter('returnAll', i);

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							contactLists = contactLists.slice(0, limit);
						}

						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(contactLists),
							{ itemData: { item: i } },
						);
						returnData.push(...executionData);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}

				throw error;
			}
		}
		return this.prepareOutputData(returnData);
	}
}

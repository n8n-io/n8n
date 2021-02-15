import {
	IExecuteFunctions
} from 'n8n-core';

import {
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription
} from 'n8n-workflow';

import {
	emeliaGrapqlRequest,
} from './GenericFunctions';

interface Campaign {
	_id: string;
	name: string;
}

interface ContactsList {
	_id: string;
	name: string;
	contactCount: number;
}

export class Emelia implements INodeType {
	description: INodeTypeDescription;
	methods: {
		loadOptions: {
			getCampaigns(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]>;
			getContactsLists(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]>;
		};
	};

	constructor() {
		this.description = {
			displayName: 'Emelia',
			name: 'emelia',
			icon: 'file:emelia.png',
			group: ['input'],
			version: 1,
			subtitle: '={{$parameter["operation"]}}',
			description: 'Consume Emelia GraphQL API',
			defaults: {
				name: 'Emelia',
				color: '#e18063',
			},
			inputs: ['main'],
			outputs: ['main'],
			credentials: [
				{
					name: 'emeliaApi',
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
							name: 'Campaign',
							value: 'campaign',
						},
						{
							name: 'Contacts Lists',
							value: 'contactsLists',
						},
					],
					default: 'campaign',
					required: true,
					description: 'The resource to operate on.',
				},
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					required: true,
					displayOptions: {
						show: {
							resource: ['campaign'],
						},
					},
					options: [
						{
							name: 'Add Contact to a campaign',
							value: 'addContactToCampaign',
							description: `Add a contact to an existant campaign, if its RUNNING the campaign will be automatically added to the loop.`
						},
					],
					default: 'addContactToCampaign',
					description: 'The operation to perform.',
				},
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					required: true,
					displayOptions: {
						show: {
							resource: ['contactsLists'],
						},
					},
					options: [
						{
							name: 'Add Contact to a list',
							value: 'addContactToList',
							description: `Add a contact to an existant list. If the campaign is already started you should use "Add Contact to a campaign" method instead.`
						},
					],
					default: 'addContactToList',
					description: 'The operation to perform.',
				},
				{
					displayName: 'Campaign',
					name: 'campaignId',
					type: 'options',
					typeOptions: {
						loadOptionsMethod: 'getCampaigns',
					},
					required: true,
					displayOptions: {
						show: {
							operation: ['addContactToCampaign'],
							resource: ['campaign'],
						}
					},
					default: '',
				},
				{
					displayName: 'List',
					name: 'contactsListsId',
					type: 'options',
					typeOptions: {
						loadOptionsMethod: 'getContactsLists',
					},
					required: true,
					displayOptions: {
						show: {
							operation: ['addContactToList'],
							resource: ['contactsLists'],
						},
					},
					default: '',
				},
				{
					displayName: 'JSON Contact Data',
					name: 'contactData',
					type: 'string',
					required: true,
					default: '{}',
					description:
						'Contact data to send to Emelia, must be in JSON format. All items must have an `email` field. Every fields will be added on contact details on Emelia',
					displayOptions: {
						show: {
							operation: ['addContactToCampaign', 'addContactToList'],
						},
					},
				},
			]
		};

		this.methods = {
			loadOptions: {
				async getCampaigns() {
					const responseData = await emeliaGrapqlRequest.call(this, {
						query: 'query GetCampaigns {\ncampaigns {\n_id\nname\n}\n}',
						operationName: 'GetCampaigns',
						variables: '{}',
					});

					return responseData.data.campaigns.map((campaign: Campaign) => ({
						name: campaign.name,
						value: campaign._id,
					}));
				},
				async getContactsLists() {
					const responseData = await emeliaGrapqlRequest.call(this, {
						query:
							'query GetContactsLists {\ncontact_lists {\n_id\nname\ncontactCount\n}\n}',
						operationName: 'GetContactsLists',
						variables: '{}',
					});

					return responseData.data.contact_lists.map((list: ContactsList) => ({
						name: list.name,
						value: list._id,
					}));
				}
			}
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: Array<{success: boolean, contactId: string}> = [];
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < items.length; i++) {
			if (resource === 'campaign') {
				if (operation === 'addContactToCampaign') {
					const campaignId = this.getNodeParameter('campaignId', 0);
					const contactData = this.getNodeParameter('contactData', i);
					const responseData = await emeliaGrapqlRequest.call(this, {
						query:
							'mutation AddContactToCampaignHook($id: ID!, $contact: JSON!)  {addContactToCampaignHook(id: $id, contact: $contact) }',
						operationName: 'AddContactToCampaignHook',
						variables: {
							id: campaignId,
							contact:
								typeof contactData === 'object'
									? contactData
									: JSON.parse(contactData as string),
						},
					});

					returnData.push({
						success: true,
						contactId: responseData.data.addContactToCampaignHook,
					});
				}
			}
			if (resource === 'contactsLists') {
				if (operation === 'addContactToList') {
					const listId = this.getNodeParameter('contactsListsId', 0);
					const contactData = this.getNodeParameter('contactData', i);
					const responseData = await emeliaGrapqlRequest.call(this, {
						query:
							'mutation AddContactsToListHook($id: ID!, $contact: JSON!)  {addContactsToListHook(id: $id, contact: $contact) }',
						operationName: 'AddContactsToListHook',
						variables: {
							id: listId,
							contact:
								typeof contactData === 'object'
									? contactData
									: JSON.parse(contactData as string),
						},
					});

					returnData.push({
						success: true,
						contactId: responseData.data.addContactsToListHook,
					});
				}
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}

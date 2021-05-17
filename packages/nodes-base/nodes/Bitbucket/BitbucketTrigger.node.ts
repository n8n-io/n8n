import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	bitbucketApiRequest,
	bitbucketApiRequestAllItems,
} from './GenericFunctions';

export class BitbucketTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Bitbucket Trigger',
		name: 'bitbucketTrigger',
		icon: 'file:bitbucket.png',
		group: ['trigger'],
		version: 1,
		description: 'Handle Bitbucket events via webhooks',
		defaults: {
			name: 'Bitbucket Trigger',
			color: '#0052cc',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'bitbucketApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				required: true,
				options: [
					{
						name: 'User',
						value: 'user',
					},
					{
						name: 'Team',
						value: 'team',
					},
					{
						name: 'Repository',
						value: 'repository',
					},
				],
				default: 'user',
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				displayOptions: {
					show: {
						resource: [
							'user',
						],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getUsersEvents',
				},
				options: [],
				required: true,
				default: [],
				description: 'The events to listen to.',
			},
			{
				displayName: 'Team',
				name: 'team',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'team',
						],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getTeams',
				},
				required: true,
				default: '',
				description: 'The team of which to listen to the events.',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				displayOptions: {
					show: {
						resource: [
							'team',
						],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getTeamEvents',
				},
				options: [],
				required: true,
				default: [],
				description: 'The events to listen to.',
			},
			{
				displayName: 'Repository',
				name: 'repository',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'repository',
						],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getRepositories',
				},
				required: true,
				default: '',
				description: 'The repository of which to listen to the events.',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				displayOptions: {
					show: {
						resource: [
							'repository',
						],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getRepositoriesEvents',
				},
				options: [],
				required: true,
				default: [],
				description: 'The events to listen to.',
			},
		],

	};

	methods = {
		loadOptions: {
			// Get all the events to display them to user so that he can
			// select them easily
			async getUsersEvents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const events = await bitbucketApiRequestAllItems.call(this, 'values', 'GET', '/hook_events/user');
				for (const event of events) {
					const eventName = event.event;
					const eventId = event.event;
					const eventDescription = event.description;
					returnData.push({
						name: eventName,
						value: eventId,
						description: eventDescription,
					});
				}
				return returnData;
			},
			// Get all the events to display them to user so that he can
			// select them easily
			async getTeamEvents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const events = await bitbucketApiRequestAllItems.call(this, 'values', 'GET', '/hook_events/team');
				for (const event of events) {
					const eventName = event.event;
					const eventId = event.event;
					const eventDescription = event.description;
					returnData.push({
						name: eventName,
						value: eventId,
						description: eventDescription,
					});
				}
				return returnData;
			},
			// Get all the events to display them to user so that he can
			// select them easily
			async getRepositoriesEvents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const events = await bitbucketApiRequestAllItems.call(this, 'values', 'GET', '/hook_events/repository');
				for (const event of events) {
					const eventName = event.event;
					const eventId = event.event;
					const eventDescription = event.description;
					returnData.push({
						name: eventName,
						value: eventId,
						description: eventDescription,
					});
				}
				return returnData;
			},
			// Get all the repositories to display them to user so that he can
			// select them easily
			async getRepositories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('bitbucketApi');
				const returnData: INodePropertyOptions[] = [];
				const repositories = await bitbucketApiRequestAllItems.call(this, 'values', 'GET', `/repositories/${credentials!.username}`);
				for (const repository of repositories) {
					const repositoryName = repository.slug;
					const repositoryId = repository.slug;
					const repositoryDescription = repository.description;
					returnData.push({
						name: repositoryName,
						value: repositoryId,
						description: repositoryDescription,
					});
				}
				return returnData;
			},
			// Get all the teams to display them to user so that he can
			// select them easily
			async getTeams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs: IDataObject = {
					role: 'member',
				};
				const teams = await bitbucketApiRequestAllItems.call(this, 'values', 'GET', '/teams', {}, qs);
				for (const team of teams) {
					const teamName = team.display_name;
					const teamId = team.username;
					returnData.push({
						name: teamName,
						value: teamId,
					});
				}
				return returnData;
			},
		},
	};
	// @ts-ignore
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				let endpoint = '';
				const credentials = await this.getCredentials('bitbucketApi');
				const resource = this.getNodeParameter('resource', 0) as string;
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId === undefined) {
					return false;
				}
				if (resource === 'user') {
					endpoint = `/users/${credentials!.username}/hooks/${webhookData.webhookId}`;
				}
				if (resource === 'team') {
					const team = this.getNodeParameter('team', 0) as string;
					endpoint = `/teams/${team}/hooks/${webhookData.webhookId}`;
				}
				if (resource === 'repository') {
					const repository = this.getNodeParameter('repository', 0) as string;
					endpoint = `/repositories/${credentials!.username}/${repository}/hooks/${webhookData.webhookId}`;
				}
				try {
					await bitbucketApiRequest.call(this, 'GET', endpoint);
				} catch (error) {
					return false;
				}
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				let responseData;
				let endpoint = '';
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const events = this.getNodeParameter('events') as string[];
				const resource = this.getNodeParameter('resource', 0) as string;
				const credentials = await this.getCredentials('bitbucketApi');

				if (resource === 'user') {
					endpoint = `/users/${credentials!.username}/hooks`;
				}
				if (resource === 'team') {
					const team = this.getNodeParameter('team', 0) as string;
					endpoint = `/teams/${team}/hooks`;
				}
				if (resource === 'repository') {
					const repository = this.getNodeParameter('repository', 0) as string;
					endpoint = `/repositories/${credentials!.username}/${repository}/hooks`;
				}
				const body: IDataObject = {
					description: 'n8n webhook',
					url: webhookUrl,
					active: true,
					events,
				};
				responseData = await bitbucketApiRequest.call(this, 'POST', endpoint, body);
				webhookData.webhookId = responseData.uuid.replace('{', '').replace('}', '');
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				let endpoint = '';
				const webhookData = this.getWorkflowStaticData('node');
				const credentials = await this.getCredentials('bitbucketApi');
				const resource = this.getNodeParameter('resource', 0) as string;
				if (resource === 'user') {
					endpoint = `/users/${credentials!.username}/hooks/${webhookData.webhookId}`;
				}
				if (resource === 'team') {
					const team = this.getNodeParameter('team', 0) as string;
					endpoint = `/teams/${team}/hooks/${webhookData.webhookId}`;
				}
				if (resource === 'repository') {
					const repository = this.getNodeParameter('repository', 0) as string;
					endpoint = `/repositories/${credentials!.username}/${repository}/hooks/${webhookData.webhookId}`;
				}
				try {
					await bitbucketApiRequest.call(this, 'DELETE', endpoint);
				} catch(error) {
					return false;
				}
				delete webhookData.webhookId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const headerData = this.getHeaderData() as IDataObject;
		const webhookData = this.getWorkflowStaticData('node');
		if (headerData['x-hook-uuid'] !== webhookData.webhookId) {
			return {};
		}
		return {
			workflowData: [
				this.helpers.returnJsonArray(req.body),
			],
		};
	}
}

import { OptionsWithUri } from 'request';

import { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeCredentialTestResult,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import { bitbucketApiRequest, bitbucketApiRequestAllItems } from './GenericFunctions';

export class BitbucketTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Bitbucket Trigger',
		name: 'bitbucketTrigger',
		icon: 'file:bitbucket.svg',
		group: ['trigger'],
		version: 1,
		description: 'Handle Bitbucket events via webhooks',
		defaults: {
			name: 'Bitbucket Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'bitbucketApi',
				required: true,
				testedBy: 'bitbucketApiTest',
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
				noDataExpression: true,
				required: true,
				options: [
					{
						name: 'Repository',
						value: 'repository',
					},
					{
						name: 'Workspace',
						value: 'workspace',
					},
				],
				default: 'workspace',
			},
			{
				displayName: 'Workspace Name or ID',
				name: 'workspace',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['workspace', 'repository'],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getWorkspaces',
				},
				required: true,
				default: '',
				description:
					'The repository of which to listen to the events. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Event Names or IDs',
				name: 'events',
				type: 'multiOptions',
				displayOptions: {
					show: {
						resource: ['workspace'],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getWorkspaceEvents',
				},
				options: [],
				required: true,
				default: [],
				description:
					'The events to listen to. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Repository Name or ID',
				name: 'repository',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['repository'],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getRepositories',
					loadOptionsDependsOn: ['workspace'],
				},
				required: true,
				default: '',
				description:
					'The repository of which to listen to the events. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Event Names or IDs',
				name: 'events',
				type: 'multiOptions',
				displayOptions: {
					show: {
						resource: ['repository'],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getRepositoriesEvents',
				},
				options: [],
				required: true,
				default: [],
				description:
					'The events to listen to. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
		],
	};

	methods = {
		credentialTest: {
			async bitbucketApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data;

				const options: OptionsWithUri = {
					method: 'GET',
					auth: {
						user: credentials!.username as string,
						password: credentials!.appPassword as string,
					},
					uri: 'https://api.bitbucket.org/2.0/user',
					json: true,
					timeout: 5000,
				};

				try {
					const response = await this.helpers.request(options);
					if (!response.username) {
						return {
							status: 'Error',
							message: `Token is not valid: ${response.error}`,
						};
					}
				} catch (error) {
					return {
						status: 'Error',
						message: `Settings are not valid: ${error}`,
					};
				}
				return {
					status: 'OK',
					message: 'Authentication successful!',
				};
			},
		},
		loadOptions: {
			async getWorkspaceEvents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const events = await bitbucketApiRequestAllItems.call(
					this,
					'values',
					'GET',
					'/hook_events/workspace',
				);
				for (const event of events) {
					returnData.push({
						name: event.event,
						value: event.event,
						description: event.description,
					});
				}
				return returnData;
			},
			async getRepositoriesEvents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const events = await bitbucketApiRequestAllItems.call(
					this,
					'values',
					'GET',
					'/hook_events/repository',
				);
				for (const event of events) {
					returnData.push({
						name: event.event,
						value: event.event,
						description: event.description,
					});
				}
				return returnData;
			},
			async getRepositories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const workspace = this.getCurrentNodeParameter('workspace') as string;
				const repositories = await bitbucketApiRequestAllItems.call(
					this,
					'values',
					'GET',
					`/repositories/${workspace}`,
				);
				for (const repository of repositories) {
					returnData.push({
						name: repository.slug,
						value: repository.slug,
						description: repository.description,
					});
				}
				return returnData;
			},
			async getWorkspaces(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const workspaces = await bitbucketApiRequestAllItems.call(
					this,
					'values',
					'GET',
					`/workspaces`,
				);
				for (const workspace of workspaces) {
					returnData.push({
						name: workspace.name,
						value: workspace.slug,
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
				const resource = this.getNodeParameter('resource', 0);
				const workspace = this.getNodeParameter('workspace', 0) as string;
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				if (resource === 'workspace') {
					endpoint = `/workspaces/${workspace}/hooks`;
				}
				if (resource === 'repository') {
					const repository = this.getNodeParameter('repository', 0) as string;
					endpoint = `/repositories/${workspace}/${repository}/hooks`;
				}
				const { values: hooks } = await bitbucketApiRequest.call(this, 'GET', endpoint);
				for (const hook of hooks) {
					if (webhookUrl === hook.url && hook.active === true) {
						webhookData.webhookId = hook.uuid.replace('{', '').replace('}', '');
						return true;
					}
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				let endpoint = '';
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const events = this.getNodeParameter('events') as string[];
				const resource = this.getNodeParameter('resource', 0);
				const workspace = this.getNodeParameter('workspace', 0) as string;

				if (resource === 'workspace') {
					endpoint = `/workspaces/${workspace}/hooks`;
				}
				if (resource === 'repository') {
					const repository = this.getNodeParameter('repository', 0) as string;
					endpoint = `/repositories/${workspace}/${repository}/hooks`;
				}
				const body: IDataObject = {
					description: 'n8n webhook',
					url: webhookUrl,
					active: true,
					events,
				};
				const responseData = await bitbucketApiRequest.call(this, 'POST', endpoint, body);
				webhookData.webhookId = responseData.uuid.replace('{', '').replace('}', '');
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				let endpoint = '';
				const webhookData = this.getWorkflowStaticData('node');
				const workspace = this.getNodeParameter('workspace', 0) as string;
				const resource = this.getNodeParameter('resource', 0);
				if (resource === 'workspace') {
					endpoint = `/workspaces/${workspace}/hooks/${webhookData.webhookId}`;
				}
				if (resource === 'repository') {
					const repository = this.getNodeParameter('repository', 0) as string;
					endpoint = `/repositories/${workspace}/${repository}/hooks/${webhookData.webhookId}`;
				}
				try {
					await bitbucketApiRequest.call(this, 'DELETE', endpoint);
				} catch (error) {
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
			workflowData: [this.helpers.returnJsonArray(req.body)],
		};
	}
}

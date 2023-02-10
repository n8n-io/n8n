import type { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import { clickupApiRequest } from './GenericFunctions';

import { createHmac } from 'crypto';

export class ClickUpTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ClickUp Trigger',
		name: 'clickUpTrigger',
		icon: 'file:clickup.svg',
		group: ['trigger'],
		version: 1,
		description: 'Handle ClickUp events via webhooks (Beta)',
		defaults: {
			name: 'ClickUp Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'clickUpApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['accessToken'],
					},
				},
			},
			{
				name: 'clickUpOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
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
				displayName: 'Team Name or ID',
				name: 'team',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getTeams',
				},
				required: true,
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				options: [
					{
						name: '*',
						value: '*',
					},
					{
						name: 'folder.created',
						value: 'folderCreated',
					},
					{
						name: 'folder.deleted',
						value: 'folderDeleted',
					},
					{
						name: 'folder.updated',
						value: 'folderUpdated',
					},
					{
						name: 'goal.created',
						value: 'goalCreated',
					},
					{
						name: 'goal.deleted',
						value: 'goalDeleted',
					},
					{
						name: 'goal.updated',
						value: 'goalUpdated',
					},
					{
						name: 'keyResult.created',
						value: 'keyResultCreated',
					},
					{
						name: 'keyResult.deleted',
						value: 'keyResultDelete',
					},
					{
						name: 'keyResult.updated',
						value: 'keyResultUpdated',
					},
					{
						name: 'list.created',
						value: 'listCreated',
					},
					{
						name: 'list.deleted',
						value: 'listDeleted',
					},
					{
						name: 'list.updated',
						value: 'listUpdated',
					},
					{
						name: 'space.created',
						value: 'spaceCreated',
					},
					{
						name: 'space.deleted',
						value: 'spaceDeleted',
					},
					{
						name: 'space.updated',
						value: 'spaceUpdated',
					},
					{
						name: 'task.assignee.updated',
						value: 'taskAssigneeUpdated',
					},
					{
						name: 'task.comment.posted',
						value: 'taskCommentPosted',
					},
					{
						name: 'task.comment.updated',
						value: 'taskCommentUpdated',
					},
					{
						name: 'task.created',
						value: 'taskCreated',
					},
					{
						name: 'task.deleted',
						value: 'taskDeleted',
					},
					{
						name: 'task.dueDate.updated',
						value: 'taskDueDateUpdated',
					},
					{
						name: 'task.moved',
						value: 'taskMoved',
					},
					{
						name: 'task.status.updated',
						value: 'taskStatusUpdated',
					},
					{
						name: 'task.tag.updated',
						value: 'taskTagUpdated',
					},
					{
						name: 'task.timeEstimate.updated',
						value: 'taskTimeEstimateUpdated',
					},
					{
						name: 'task.timeTracked.updated',
						value: 'taskTimeTrackedUpdated',
					},
					{
						name: 'task.updated',
						value: 'taskUpdated',
					},
				],
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Folder ID',
						name: 'folderId',
						type: 'string',
						default: '',
					},
					{
						displayName: 'List ID',
						name: 'listId',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Space ID',
						name: 'spaceId',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Task ID',
						name: 'taskId',
						type: 'string',
						default: '',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the available teams to display them to user so that he can
			// select them easily
			async getTeams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { teams } = await clickupApiRequest.call(this, 'GET', '/team');
				for (const team of teams) {
					const teamName = team.name;
					const teamId = team.id;
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
				const teamId = this.getNodeParameter('team') as string;
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId === undefined) {
					return false;
				}
				const endpoint = `/team/${teamId}/webhook`;
				const { webhooks } = await clickupApiRequest.call(this, 'GET', endpoint);
				if (Array.isArray(webhooks)) {
					for (const webhook of webhooks) {
						if (webhook.id === webhookData.webhookId) {
							return true;
						}
					}
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const filters = this.getNodeParameter('filters') as IDataObject;
				const teamId = this.getNodeParameter('team') as string;
				const events = this.getNodeParameter('events') as string[];
				const endpoint = `/team/${teamId}/webhook`;
				const body: IDataObject = {
					endpoint: webhookUrl,
					events,
				};
				if (events.includes('*')) {
					body.events = '*';
				}
				if (filters.listId) {
					body.list_id = (filters.listId as string).replace('#', '');
				}
				if (filters.taskId) {
					body.task_id = (filters.taskId as string).replace('#', '');
				}
				if (filters.spaceId) {
					body.space_id = (filters.spaceId as string).replace('#', '');
				}
				if (filters.folderId) {
					body.folder_id = (filters.folderId as string).replace('#', '');
				}
				const { webhook } = await clickupApiRequest.call(this, 'POST', endpoint, body);
				webhookData.webhookId = webhook.id;
				webhookData.secret = webhook.secret;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const endpoint = `/webhook/${webhookData.webhookId}`;
				try {
					await clickupApiRequest.call(this, 'DELETE', endpoint);
				} catch (error) {
					return false;
				}
				delete webhookData.webhookId;
				delete webhookData.secret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const webhookData = this.getWorkflowStaticData('node');
		const headerData = this.getHeaderData() as IDataObject;
		const req = this.getRequestObject();
		const computedSignature = createHmac('sha256', webhookData.secret as string)
			.update(JSON.stringify(req.body))
			.digest('hex');
		if (headerData['x-signature'] !== computedSignature) {
			// Signature is not valid so ignore call
			return {};
		}
		return {
			workflowData: [this.helpers.returnJsonArray(req.body)],
		};
	}
}

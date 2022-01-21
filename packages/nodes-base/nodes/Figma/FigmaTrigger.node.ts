import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	figmaApiRequest,
} from './GenericFunctions';

import {
	snakeCase,
} from 'change-case';

import {
	randomBytes,
} from 'crypto';

export class FigmaTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Figma Trigger (Beta)',
		name: 'figmaTrigger',
		icon: 'file:figma.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["triggerOn"]}}',
		description: 'Starts the workflow when Figma events occur',
		defaults: {
			name: 'Figma Trigger (Beta)',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'figmaApi',
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
				displayName: 'Team ID',
				name: 'teamId',
				type: 'string',
				required: true,
				default: '',
				description: 'Trigger will monitor this Figma Team for changes. Team ID can be found in the URL of a Figma Team page when viewed in a web browser: figma.com/files/team/{TEAM-ID}/',
			},
			{
				displayName: 'Trigger On',
				name: 'triggerOn',
				type: 'options',
				options: [
					{
						name: 'File Commented',
						value: 'fileComment',
						description: 'Triggers when someone comments on a file',
					},
					{
						name: 'File Deleted',
						value: 'fileDelete',
						description: 'Triggers whenever a file has been deleted. Does not trigger on all files within a folder, if the folder is deleted',
					},
					{
						name: 'File Updated',
						value: 'fileUpdate',
						description: 'Triggers whenever a file saves or is deleted. This occurs whenever a file is closed or within 30 seconds after changes have been made',
					},
					{
						name: 'File Version Updated',
						value: 'fileVersionUpdate',
						description: 'Triggers whenever a named version is created in the version history of a file',
					},
					{
						name: 'Library Publish',
						value: 'libraryPublish',
						description: 'Triggers whenever a library file is published',
					},
				],
				default: '',
				required: true,
			},
		],
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const teamId = this.getNodeParameter('teamId') as string;
				const triggerOn = this.getNodeParameter('triggerOn') as string;
				// Check all the webhooks which exist already if it is identical to the
				// one that is supposed to get created.
				const { webhooks } = await figmaApiRequest.call(this, 'GET', `/v2/teams/${teamId}/webhooks`);
				for (const webhook of webhooks) {
					if (webhook.endpoint === webhookUrl
						&& webhook.team_id === teamId
						&& webhook.event_type === snakeCase(triggerOn).toUpperCase()
						&& webhook.status === 'ACTIVE') {
						webhookData.webhookId = webhook.id as string;
						return true;
					}
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const triggerOn = this.getNodeParameter('triggerOn') as string;
				const teamId = this.getNodeParameter('teamId') as string;
				const endpoint = '/v2/webhooks';

				const body: IDataObject = {
					event_type: snakeCase(triggerOn).toUpperCase(),
					team_id: teamId,
					description: `n8n-webhook:${webhookUrl}`,
					endpoint: webhookUrl,
					passcode: randomBytes(10).toString('hex') as string,
				};

				const responseData = await figmaApiRequest.call(this, 'POST', endpoint, body);

				if (responseData.id === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				webhookData.webhookId = responseData.id as string;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId !== undefined) {

					const endpoint = `/v2/webhooks/${webhookData.webhookId}`;
					try {
						await figmaApiRequest.call(this, 'DELETE', endpoint);
					} catch (error) {
						return false;
					}
					// Remove from the static workflow data so that it is clear
					// that no webhooks are registred anymore
					delete webhookData.webhookId;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();

		if (bodyData.event_type === 'PING') {
			const res = this.getResponseObject();
			res.status(200).end();
			return {
				noWebhookResponse: true,
			};
		}

		return {
			workflowData: [
				this.helpers.returnJsonArray(bodyData),
			],
		};
	}
}

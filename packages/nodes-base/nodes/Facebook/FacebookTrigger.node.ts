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

import { OptionsWithUri } from 'request';

import * as _ from 'lodash'
import * as uuid from 'uuid/v4';

export class FacebookTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Facebook Trigger',
		name: 'facebookTrigger',
		icon: 'file:facebook.png',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["appId"] + "/" + $parameter["object"]}}',
		description: 'Starts the workflow when a Facebook events occurs.',
		defaults: {
			name: 'Facebook Trigger',
			color: '#772244',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'facebookGraphApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'setup',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: 'webhook',
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Object',
				name: 'object',
				type: 'options',
				options: [
					{
						name: 'Ad Account',
						value: 'ad_account',
						description: 'Get updates about Ad Account',
					},
					{
						name: 'Application',
						value: 'application',
						description: 'Get updates about the app',
					},
					{
						name: 'Certificate Transparency',
						value: 'certificate_transparency',
						description: 'Get updates about Certificate Transparency',
					},
					{
						name: 'Group',
						value: 'group',
						description: 'Get updates about activity in groups and events in groups for Workplace',
					},
					{
						name: 'Instagram',
						value: 'instagram',
						description: 'Get updates about comments on your media',
					},
					{
						name: 'Link',
						value: 'link',
						description: 'Get updates about links for rich previews by an external provider',
					},
					{
						name: 'Page',
						value: 'page',
						description: 'Page updates',
					},
					{
						name: 'Permissions',
						value: 'permissions',
						description: 'Updates regarding granting or revoking permissions',
					},
					{
						name: 'User',
						value: 'user',
						description: 'User profile updates',
					},
					{
						name: 'Whatsapp business account',
						value: 'whatsapp_business_account',
						description: 'Get updates about Whatsapp business account',
					},
					{
						name: 'Workplace Security',
						value: 'workplace_security',
						description: 'Get updates about Workplace Security',
					},
				],
				required: true,
				default: 'user',
				description: 'The object to subscribe to',
			},
			{
				displayName: 'App ID',
				name: 'appId',
				type: 'string',
				required: true,
				default: '',
				description: 'Facebook app ID',
			},
			{
				displayName: 'Other options',
				name: 'otherOptions',
				type: 'collection',
				default: {},
				description: 'Other options',
				placeholder: 'Add option',
				options: [
					{
						displayName: 'Include values',
						name: 'includeValues',
						type: 'boolean',
						default: true,
						description: 'Indicates if change notifications should include the new values.',
					},
				],
			},
		],
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const graphApiCredentials = this.getCredentials('facebookGraphApi');
				const webhookUrl = this.getNodeWebhookUrl('setup') as string;
				const object = this.getNodeParameter('object') as string;
				const appId = this.getNodeParameter('appId') as string;


				if (webhookData.webhookId === undefined) {
					// No webhook id is set so no webhook can exist
					return false;
				}


				const endpoint = `https://graph.facebook.com/v8.0/${appId}/subscriptions`;

				const requestOptions : OptionsWithUri = {
					headers: {
						accept: 'application/json,text/*;q=0.99',
					},
					method: 'GET',
					uri: endpoint,
					json: true,
					gzip: true,
					qs: {
						access_token: graphApiCredentials!.accessToken,
					},
				};

				const { data } = await this.helpers.request(requestOptions);
				for (const webhook of data) {
					if (webhook.target === webhookUrl && webhook.object === object && webhook.status === true) {
						webhookData.webhookId = uuid();
						return true;
					}
				}

				// If it did not error then the webhook exists
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('setup') as string;
				const defaultWebhookUrl = this.getNodeWebhookUrl('default') as string;

				if (webhookUrl.includes('//localhost')) {
					throw new Error('The Webhook can not work on "localhost". Please, either setup n8n on a custom domain or start with "--tunnel"!');
				}

				const object = this.getNodeParameter('object') as string;
				const appId = this.getNodeParameter('appId') as string;
				const otherOptions = this.getNodeParameter('otherOptions') as IDataObject;
				const graphApiCredentials = this.getCredentials('facebookGraphApi');

				const endpoint = `https://graph.facebook.com/v8.0/${appId}/subscriptions`;

				const body = {
					object: object,
					callback_url: webhookUrl,
					verify_token: uuid(),
				} as IDataObject;

				if (otherOptions.includeValues !== undefined) {
					body.include_values = otherOptions.includeValues;
				}

				const requestOptions : OptionsWithUri = {
					headers: {
						accept: 'application/json,text/*;q=0.99',
					},
					method: 'POST',
					uri: endpoint,
					json: true,
					gzip: true,
					qs: {
						access_token: graphApiCredentials!.accessToken,
					},
					body: body,
				};

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.verifyToken = body.verify_token;
				const responseData = await this.helpers.request(requestOptions);

				if (responseData.success !== true) {
					// Facebook did not return success, so something went wrong
					throw new Error('Facebook webhook creation response did not contain the expected data.');
				}

				webhookData.webhookId = uuid();

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId !== undefined) {
					const appId = this.getNodeParameter('appId') as string;
					const graphApiCredentials = this.getCredentials('facebookGraphApi');

					const endpoint = `https://graph.facebook.com/v8.0/${appId}/subscriptions`;
					const requestOptions : OptionsWithUri = {
						headers: {
							accept: 'application/json,text/*;q=0.99',
						},
						method: 'DELETE',
						uri: endpoint,
						json: true,
						gzip: true,
						qs: {
							access_token: graphApiCredentials!.accessToken,
						},
					};

					try {
						await this.helpers.request(requestOptions);
					} catch (e) {
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
		const bodyData = this.getBodyData() as IDataObject;
		const query = this.getQueryData() as IDataObject;

		// Check if we're getting facebook's challenge request (https://developers.facebook.com/docs/graph-api/webhooks/getting-started)
		if (query.hasOwnProperty('hub.challenge')) {
			const challenge = query['hub.challenge'];
			const webhookData = this.getWorkflowStaticData('node');

			if (webhookData.verifyToken !== query['hub.verify_token']) {
				const res = this.getResponseObject();
				res.write("Invalid verification token");
				res.status(500).end();
				return {};
			}

			const res = this.getResponseObject();
			res.write(challenge);
			res.status(200).end();
			return {
				noWebhookResponse: true,
			};
		}

		// Is a regular webhoook call

		return {
			workflowData: [
				this.helpers.returnJsonArray(bodyData.entry as IDataObject[])
			],
		};
	}
}

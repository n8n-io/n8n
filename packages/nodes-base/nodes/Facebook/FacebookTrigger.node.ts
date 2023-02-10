import type { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { v4 as uuid } from 'uuid';

import { snakeCase } from 'change-case';

import { facebookApiRequest, getAllFields, getFields } from './GenericFunctions';

import { createHmac } from 'crypto';

export class FacebookTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Facebook Trigger',
		name: 'facebookTrigger',
		icon: 'file:facebook.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["appId"] +"/"+ $parameter["object"]}}',
		description: 'Starts the workflow when Facebook events occur',
		defaults: {
			name: 'Facebook Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'facebookGraphAppApi',
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
				displayName: 'APP ID',
				name: 'appId',
				type: 'string',
				required: true,
				default: '',
				description: 'Facebook APP ID',
			},
			{
				displayName: 'Object',
				name: 'object',
				type: 'options',
				options: [
					{
						name: 'Ad Account',
						value: 'adAccount',
						description: 'Get updates about Ad Account',
					},
					{
						name: 'Application',
						value: 'application',
						description: 'Get updates about the app',
					},
					{
						name: 'Certificate Transparency',
						value: 'certificateTransparency',
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
						name: 'Whatsapp Business Account',
						value: 'whatsappBusinessAccount',
						description: 'Get updates about Whatsapp business account',
					},
					{
						name: 'Workplace Security',
						value: 'workplaceSecurity',
						description: 'Get updates about Workplace Security',
					},
				],
				required: true,
				default: 'user',
				description: 'The object to subscribe to',
			},
			//https://developers.facebook.com/docs/graph-api/webhooks/reference/page
			{
				displayName: 'Field Names or IDs',
				name: 'fields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getObjectFields',
					loadOptionsDependsOn: ['object'],
				},
				default: [],
				description:
					'The set of fields in this object that are subscribed to. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				placeholder: 'Add option',
				options: [
					{
						displayName: 'Include Values',
						name: 'includeValues',
						type: 'boolean',
						default: true,
						description: 'Whether change notifications should include the new values',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the available organizations to display them to user so that he can
			// select them easily
			async getObjectFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const object = this.getCurrentNodeParameter('object') as string;
				return getFields(object) as INodePropertyOptions[];
			},
		},
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const object = this.getNodeParameter('object') as string;
				const appId = this.getNodeParameter('appId') as string;

				const { data } = await facebookApiRequest.call(this, 'GET', `/${appId}/subscriptions`, {});

				for (const webhook of data) {
					if (
						webhook.target === webhookUrl &&
						webhook.object === object &&
						webhook.status === true
					) {
						return true;
					}
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const object = this.getNodeParameter('object') as string;
				const appId = this.getNodeParameter('appId') as string;
				const fields = this.getNodeParameter('fields') as string[];
				const options = this.getNodeParameter('options') as IDataObject;

				const body = {
					object: snakeCase(object),
					callback_url: webhookUrl,
					verify_token: uuid(),
					fields: fields.includes('*') ? getAllFields(object) : fields,
				} as IDataObject;

				if (options.includeValues !== undefined) {
					body.include_values = options.includeValues;
				}

				const responseData = await facebookApiRequest.call(
					this,
					'POST',
					`/${appId}/subscriptions`,
					body,
				);

				webhookData.verifyToken = body.verify_token;

				if (responseData.success !== true) {
					// Facebook did not return success, so something went wrong
					throw new NodeApiError(this.getNode(), responseData, {
						message: 'Facebook webhook creation response did not contain the expected data.',
					});
				}
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const appId = this.getNodeParameter('appId') as string;
				const object = this.getNodeParameter('object') as string;

				try {
					await facebookApiRequest.call(this, 'DELETE', `/${appId}/subscriptions`, {
						object: snakeCase(object),
					});
				} catch (error) {
					return false;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();
		const query = this.getQueryData() as IDataObject;
		const res = this.getResponseObject();
		const req = this.getRequestObject();
		const headerData = this.getHeaderData() as IDataObject;
		const credentials = await this.getCredentials('facebookGraphAppApi');
		// Check if we're getting facebook's challenge request (https://developers.facebook.com/docs/graph-api/webhooks/getting-started)
		if (this.getWebhookName() === 'setup') {
			if (query['hub.challenge']) {
				//TODO
				//compare hub.verify_token with the saved token
				//const webhookData = this.getWorkflowStaticData('node');
				// if (webhookData.verifyToken !== query['hub.verify_token']) {
				// 	return {};
				// }
				res.status(200).send(query['hub.challenge']).end();
				return {
					noWebhookResponse: true,
				};
			}
		}

		// validate signature if app secret is set
		if (credentials.appSecret !== '') {
			const computedSignature = createHmac('sha1', credentials.appSecret as string)
				.update(req.rawBody)
				.digest('hex');
			if (headerData['x-hub-signature'] !== `sha1=${computedSignature}`) {
				return {};
			}
		}

		return {
			workflowData: [this.helpers.returnJsonArray(bodyData.entry as IDataObject[])],
		};
	}
}

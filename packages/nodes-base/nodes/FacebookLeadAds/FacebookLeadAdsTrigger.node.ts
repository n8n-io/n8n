import { createHmac } from 'crypto';
import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import {
	appWebhookSubscriptionCreate,
	appWebhookSubscriptionDelete,
	appWebhookSubscriptionList,
	facebookEntityDetail,
	installAppOnPage,
} from './GenericFunctions';
import { listSearch } from './methods';
import type { FacebookFormLeadData, FacebookPageEvent } from './types';

export class FacebookLeadAdsTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Facebook Lead Ads Trigger',
		name: 'facebookLeadAdsTrigger',
		icon: 'file:facebook.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Handle Facebook Lead Ads events via webhooks',
		defaults: {
			name: 'Facebook Lead Ads Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'facebookLeadAdsOAuth2Api',
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
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				default: 'leadAdded',
				options: [
					{
						name: 'New Lead',
						value: 'leadAdded',
					},
				],
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'The page linked to the form for retrieving new leads',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'pageList',
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: '121637951029080',
					},
				],
			},
			{
				displayName: 'Form',
				name: 'form',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'The form to monitor for fetching lead details upon submission',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'formList',
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: '121637951029080',
					},
				],
			},
		],
	};

	methods = {
		listSearch,
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const credential = await this.getCredentials('facebookLeadAdsOAuth2Api');
				const appId = credential.clientId as string;

				const webhooks = await appWebhookSubscriptionList.call(this, appId);

				return webhooks.some(
					(webhook) =>
						webhook.object === 'page' &&
						webhook.callback_url === webhookUrl &&
						webhook.fields.find((field) => field.name === 'leadgen') &&
						webhook.active,
				);
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const credential = await this.getCredentials('facebookLeadAdsOAuth2Api');
				const appId = credential.clientId as string;
				const pageId = this.getNodeParameter('page', '', { extractValue: true }) as string;
				const verifyToken = uuid();
				const staticData = this.getWorkflowStaticData('node');
				staticData.verifyToken = verifyToken;

				await appWebhookSubscriptionCreate.call(this, appId, {
					object: 'page',
					callback_url: webhookUrl,
					verify_token: verifyToken,
					fields: ['leadgen'],
					include_values: true,
				});

				await installAppOnPage.call(this, pageId, 'leadgen');

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const credential = await this.getCredentials('facebookLeadAdsOAuth2Api');
				const appId = credential.clientId as string;

				await appWebhookSubscriptionDelete.call(this, appId, 'page');

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData() as unknown as FacebookPageEvent;
		const query = this.getQueryData() as IDataObject;
		const res = this.getResponseObject();
		const req = this.getRequestObject();
		const headerData = this.getHeaderData() as IDataObject;
		const credentials = await this.getCredentials('facebookLeadAdsOAuth2Api');
		const formId = this.getNodeParameter('form', '', { extractValue: true }) as string;

		// Check if we're getting facebook's challenge request (https://developers.facebook.com/docs/graph-api/webhooks/getting-started)
		if (this.getWebhookName() === 'setup') {
			if (query['hub.challenge']) {
				//compare hub.verify_token with the saved token
				const staticData = this.getWorkflowStaticData('node');
				if (staticData.verifyToken !== query['hub.verify_token']) {
					return {};
				}

				res.status(200).send(query['hub.challenge']).end();

				return { noWebhookResponse: true };
			}
		}

		// validate signature if app secret is set
		if (credentials.appSecret) {
			const computedSignature = createHmac('sha1', credentials.appSecret as string)
				.update(req.rawBody)
				.digest('hex');
			if (headerData['x-hub-signature'] !== `sha1=${computedSignature}`) {
				return {};
			}
		}

		if (bodyData.object !== 'page') {
			return {};
		}

		const events = await Promise.all(
			bodyData.entry
				.map((entry) =>
					entry.changes
						.filter((change) => change.field === 'leadgen' && change.value.form_id === formId)
						.map((change) => ({ ...change.value, entry_id: entry.id })),
				)
				.flat()
				.map(async (event) => {
					const leadFormData = (await facebookEntityDetail.call(
						this,
						event.leadgen_id,
						'id,field_data,created_time',
					)) as FacebookFormLeadData;

					return { ...event, ...leadFormData };
				}),
		);

		if (events.length === 0) {
			return {};
		}

		return {
			workflowData: [this.helpers.returnJsonArray(events)],
		};
	}
}

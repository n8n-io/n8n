import { createHmac } from 'crypto';
import {
	NodeOperationError,
	type IDataObject,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
	NodeConnectionTypes,
} from 'n8n-workflow';

import {
	appWebhookSubscriptionCreate,
	appWebhookSubscriptionDelete,
	appWebhookSubscriptionList,
	facebookEntityDetail,
	installAppOnPage,
} from './GenericFunctions';
import { listSearch } from './methods';
import type { FacebookForm, FacebookFormLeadData, FacebookPageEvent } from './types';

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
		outputs: [NodeConnectionTypes.Main],
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
				displayName:
					'Due to Facebook API limitations, you can use just one Facebook Lead Ads trigger for each Facebook App',
				name: 'facebookLeadAdsNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				default: 'newLead',
				options: [
					{
						name: 'New Lead',
						value: 'newLead',
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
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Simplify Output',
						name: 'simplifyOutput',
						type: 'boolean',
						default: true,
						description:
							'Whether to return a simplified version of the webhook event instead of all fields',
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
				const credentials = await this.getCredentials('facebookLeadAdsOAuth2Api');
				const appId = credentials.clientId as string;

				const webhooks = await appWebhookSubscriptionList.call(this, appId);

				const subscription = webhooks.find(
					(webhook) =>
						webhook.object === 'page' &&
						webhook.fields.find((field) => field.name === 'leadgen') &&
						webhook.active,
				);

				if (!subscription) {
					return false;
				}

				if (subscription.callback_url !== webhookUrl) {
					throw new NodeOperationError(
						this.getNode(),
						`The Facebook App ID ${appId} already has a webhook subscription. Delete it or use another App before executing the trigger. Due to Facebook API limitations, you can have just one trigger per App.`,
						{ level: 'warning' },
					);
				}

				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const credentials = await this.getCredentials('facebookLeadAdsOAuth2Api');
				const appId = credentials.clientId as string;
				const pageId = this.getNodeParameter('page', '', { extractValue: true }) as string;
				const verifyToken = this.getNode().id;

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
				const credentials = await this.getCredentials('facebookLeadAdsOAuth2Api');
				const appId = credentials.clientId as string;

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
		const pageId = this.getNodeParameter('page', '', { extractValue: true }) as string;
		const formId = this.getNodeParameter('form', '', { extractValue: true }) as string;

		// Check if we're getting facebook's challenge request (https://developers.facebook.com/docs/graph-api/webhooks/getting-started)
		if (this.getWebhookName() === 'setup') {
			if (query['hub.challenge']) {
				if (this.getNode().id !== query['hub.verify_token']) {
					return {};
				}

				res.status(200).send(query['hub.challenge']).end();

				return { noWebhookResponse: true };
			}
		}

		const computedSignature = createHmac('sha256', credentials.clientSecret as string)
			.update(req.rawBody)
			.digest('hex');
		if (headerData['x-hub-signature-256'] !== `sha256=${computedSignature}`) {
			return {};
		}

		if (bodyData.object !== 'page') {
			return {};
		}

		const events = await Promise.all(
			bodyData.entry
				.map((entry) =>
					entry.changes
						.filter(
							(change) =>
								change.field === 'leadgen' &&
								change.value.page_id === pageId &&
								change.value.form_id === formId,
						)
						.map((change) => change.value),
				)
				.flat()
				.map(async (event) => {
					const [lead, form] = await Promise.all([
						facebookEntityDetail.call(
							this,
							event.leadgen_id,
							'field_data,created_time,ad_id,ad_name,adset_id,adset_name,form_id',
						) as Promise<FacebookFormLeadData>,
						facebookEntityDetail.call(
							this,
							event.form_id,
							'id,name,locale,status,page,questions',
						) as Promise<FacebookForm>,
					]);

					const simplifyOutput = this.getNodeParameter('options.simplifyOutput', true) as boolean;

					if (simplifyOutput) {
						return {
							id: lead.id,
							data: lead.field_data.reduce(
								(acc, field) => ({
									...acc,
									[field.name]: field.values && field.values.length > 0 ? field.values[0] : null,
								}),
								{},
							),
							form: {
								id: form.id,
								name: form.name,
								locale: form.locale,
								status: form.status,
							},
							ad: { id: lead.ad_id, name: lead.ad_name },
							adset: { id: lead.adset_id, name: lead.adset_name },
							page: form.page,
							created_time: lead.created_time,
						};
					}

					return {
						id: lead.id,
						field_data: lead.field_data,
						form,
						ad: { id: lead.ad_id, name: lead.ad_name },
						adset: { id: lead.adset_id, name: lead.adset_name },
						page: form.page,
						created_time: lead.created_time,
						event,
					};
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

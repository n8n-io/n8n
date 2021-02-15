import {
	IHookFunctions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	emeliaApiRequest,
	emeliaGrapqlRequest,
} from './GenericFunctions';

interface Campaign {
	_id: string;
	name: string;
}

export class EmeliaTrigger implements INodeType {
	description: INodeTypeDescription;
	methods: {
		loadOptions: {
			getCampaigns(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]>
		}
	};
	// @ts-ignore
	webhookMethods: {
		default: {
			create(this: IHookFunctions): Promise<boolean>
			delete(this: IHookFunctions): Promise<boolean>
		}
	};

	constructor() {
		this.description = {
			displayName: 'Emelia Trigger',
			name: 'emeliaTrigger',
			icon: 'file:emelia.png',
			group: ['trigger'],
			version: 1,
			description: 'Handle Emelia campaign activity events via webhooks',
			defaults: {
				name: 'Emelia Trigger',
				color: '#e18063',
			},
			inputs: [],
			outputs: ['main'],
			credentials: [
				{
					name: 'emeliaApi',
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
					displayName: 'Campaign',
					name: 'campaignId',
					type: 'options',
					typeOptions: {
						loadOptionsMethod: 'getCampaigns',
					},
					required: true,
					default: '',
				},
				{
					displayName: 'Events',
					name: 'events',
					type: 'multiOptions',
					default: ['REPLIED'],
					options: [
						{
							value: 'REPLIED',
							name: 'Email replied',
						},
						{
							value: 'OPENED',
							name: 'Email opened',
						},
						{
							value: 'CLICKED',
							name: 'Link clicked',
						},
						{
							value: 'SENT',
							name: 'Email sent',
						},
						{
							name: 'Email bounced',
							value: 'BOUNCED',
						},
						{
							value: 'UNSUBSCRIBED',
							name: 'Unsubscribed contact',
						},
					],
				},
			],
		}

		this.methods = {
			loadOptions: {
				async getCampaigns() {
					const responseData = await emeliaGrapqlRequest.call(this, {
						query:
							'query GetCampaigns {\ncampaigns {\n_id\nname\n}\n}',
						operationName: 'GetCampaigns',
						variables: '{}',
					});

					return responseData.data.campaigns.map(
						(campaign: Campaign) => ({
							name: campaign.name,
							value: campaign._id,
						}),
					);
				},
			},
		};

		this.webhookMethods = {
			default: {
				async create(this: IHookFunctions): Promise<boolean> {
					const webhookUrl = this.getNodeWebhookUrl(
						'default',
					) as string;
					const webhookData = this.getWorkflowStaticData('node');
					const events = this.getNodeParameter('events', [
						'REPLIED',
					]) as string[];
					const campaignId = this.getNodeParameter(
						'campaignId',
						'',
					) as string;
					const body = {
						hookUrl: webhookUrl,
						events,
						campaignId,
					};
					const { webhookId } = await emeliaApiRequest.call(
						this,
						'POST',
						'/webhook/webhook',
						body,
					);
					webhookData.webhookId = webhookId;
					return true;
				},
				async delete(this: IHookFunctions): Promise<boolean> {
					const webhookData = this.getWorkflowStaticData('node')
					const webhookUrl = this.getNodeWebhookUrl(
						'default',
					) as string;
					const campaignId = this.getNodeParameter(
						'campaignId',
						'',
					) as string;

					try {
						const body = {
							hookUrl: webhookUrl,
							campaignId,
						};

						await emeliaApiRequest.call(
							this,
							'DELETE',
							'/webhook/webhook',
							body,
						);
					} catch (error) {
						return false;
					}
					delete webhookData.webhookId;
					return true;
				},
			},
		}
	}

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		return {
			workflowData: [this.helpers.returnJsonArray(req.body)],
		};
	}
}

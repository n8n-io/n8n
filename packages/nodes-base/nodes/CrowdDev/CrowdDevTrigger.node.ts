import {
	type IHookFunctions,
	type IWebhookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookResponseData,
	type IHttpRequestOptions,
	NodeConnectionTypes,
} from 'n8n-workflow';

interface ICrowdDevCreds {
	url: string;
	tenantId: string;
	token: string;
	allowUnauthorizedCerts: boolean;
}

const credsName = 'crowdDevApi';

const getCreds = async (hookFns: IHookFunctions) =>
	hookFns.getCredentials(credsName) as unknown as ICrowdDevCreds;

const createRequest = (
	creds: ICrowdDevCreds,
	opts: Partial<IHttpRequestOptions>,
): IHttpRequestOptions => {
	const defaults: IHttpRequestOptions = {
		baseURL: `${creds.url}/api/tenant/${creds.tenantId}`,
		url: '',
		json: true,
		skipSslCertificateValidation: creds.allowUnauthorizedCerts,
	};
	return Object.assign(defaults, opts);
};

export class CrowdDevTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'crowd.dev Trigger',
		name: 'crowdDevTrigger',
		icon: { light: 'file:crowdDev.svg', dark: 'file:crowdDev.dark.svg' },
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when crowd.dev events occur.',
		defaults: {
			name: 'crowd.dev Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'crowdDevApi',
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
				displayName: 'Trigger',
				name: 'trigger',
				description: 'What will trigger an automation',
				type: 'options',
				required: true,
				default: 'new_activity',
				options: [
					{
						name: 'New Activity',
						value: 'new_activity',
					},
					{
						name: 'New Member',
						value: 'new_member',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const creds = await getCreds(this);
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				if (webhookData.webhookId !== undefined) {
					try {
						const options = createRequest(creds, {
							url: `/automation/${webhookData.webhookId}`,
							method: 'GET',
						});
						const data = await this.helpers.httpRequestWithAuthentication.call(
							this,
							credsName,
							options,
						);
						if (data.settings.url === webhookUrl) {
							return true;
						}
					} catch (error) {
						return false;
					}
				}

				// If it did not error then the webhook exists
				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const creds = await getCreds(this);
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const params = {
					trigger: this.getNodeParameter('trigger') as string,
				};

				const options = createRequest(creds, {
					url: '/automation',
					method: 'POST',
					body: {
						data: {
							settings: {
								url: webhookUrl,
							},
							type: 'webhook',
							trigger: params.trigger,
						},
					},
				});

				const responseData = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'crowdDevApi',
					options,
				);
				if (responseData === undefined || responseData.id === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				webhookData.webhookId = responseData.id as string;

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const creds = await getCreds(this);
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId !== undefined) {
					try {
						const options = createRequest(creds, {
							url: `/automation/${webhookData.webhookId}`,
							method: 'DELETE',
						});
						await this.helpers.httpRequestWithAuthentication.call(this, credsName, options);
					} catch (error) {
						return false;
					}

					// Remove from the static workflow data so that it is clear
					// that no webhooks are registered anymore
					delete webhookData.webhookId;
					delete webhookData.webhookEvents;
					delete webhookData.hookSecret;
				}

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();

		return {
			workflowData: [this.helpers.returnJsonArray(bodyData)],
		};
	}
}

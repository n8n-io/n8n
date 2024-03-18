/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
/* eslint-disable n8n-nodes-base/node-param-options-type-unsorted-items */
import type {
	INodeType,
	INodeTypeDescription,
	IHookFunctions,
	IWebhookFunctions,
	IWebhookResponseData,
	IDataObject,
} from 'n8n-workflow';

import { honeyBookApiRequest } from './honeyBookApi';

export class HoneyBookTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Trigger',
		name: 'honeyBookTrigger',
		icon: 'file:honeybook.svg',
		group: ['trigger', 'HoneyBook'],
		version: 1,
		subtitle: '={{$parameter["trigger"]}}',
		description: 'Consume HB API',
		defaults: {
			name: 'Trigger',
		},
		inputs: [],
		outputs: ['main'],
		defaultCredentials: 'honeyBookApi',
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
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Project moved to completed',
						value: 'project_moved_to_completed',
					},
					{
						name: 'Contract is signed',
						value: 'contract_signed',
					},
					{
						name: 'Questionnaire submitted',
						value: 'questionnaire_submitted',
					},
					{
						name: 'Smart file is completed',
						value: 'smart_file_completed',
					},
					{
						name: 'All signatures are signed',
						value: 'all_signatures_signed',
					},
					{
						name: 'First payment paid',
						value: 'first_payment_paid',
					},
					{
						name: 'Invoice paid in full',
						value: 'invoice_paid_in_full',
					},
					{
						name: 'Session is scheduled',
						value: 'session_scheduled',
					},
				],
				default: null,
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				/**
				 * n8n calls this before creating/updating the webhook,
				 * I think it's redundant to make 2 calls to the API every time.
				 * the create endpoint in our API will accept an optional existingSubscriptionId param and drop it if it exists.
				 * this way we always end up with the most up-to-date webhook configuration.
				 */
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const trigger = this.getNodeParameter('trigger') as string;
				const body: IDataObject = {
					existing_subscription_id: webhookData.subscriptionId,
					webhook_url: webhookUrl,
					trigger,
				};
				const { _id } = await honeyBookApiRequest.call(
					this,
					'POST',
					'/automations/subscriptions',
					body,
				);
				webhookData.subscriptionId = _id;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				await honeyBookApiRequest.call(
					this,
					'DELETE',
					`/automations/subscriptions/${webhookData.subscriptionId}`,
				);
				delete webhookData.subscriptionId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		return {
			workflowData: [this.helpers.returnJsonArray(req.body as IDataObject[])],
		};
	}
}

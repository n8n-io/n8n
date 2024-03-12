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
		credentials: [
			{
				name: 'honeyBookApi',
				required: true,
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
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
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

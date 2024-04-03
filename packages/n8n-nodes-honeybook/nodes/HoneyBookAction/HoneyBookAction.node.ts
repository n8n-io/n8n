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
import {
	createTaskProperties,
	movePipelineStageProperties,
	sendEmailProperties,
	sendFilesProperties,
	withActionShowFilter,
} from './properties';
import { getPipelineStages, getEmailTemplates, getFileTemplates, getTeamMembers } from './loaders';

export class HoneyBookAction implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Action',
		name: 'honeyBookAction',
		icon: 'hb-icon:ArrowLineRight24.svg',
		group: ['input', 'HoneyBook'],
		version: 1,
		subtitle: '={{$parameter["action"] || "Set an action in the sidebar"}}',
		description: 'An action is something that happens when the automation runs.',
		defaults: {
			name: 'Action',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'honeyBookApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Action',
				name: 'action',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Send email',
						value: 'send_email',
					},
					{
						name: 'Send file via email',
						value: 'send_file_via_email',
					},
					{
						name: 'Create task',
						value: 'create_task',
					},
					{
						name: 'Move pipeline stage',
						value: 'move_pipeline_stage',
					},
				],
				default: null,
			},
			...withActionShowFilter('send_email', sendEmailProperties),
			...withActionShowFilter('send_file_via_email', sendFilesProperties),
			...withActionShowFilter('create_task', createTaskProperties),
			...withActionShowFilter('move_pipeline_stage', movePipelineStageProperties),
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

	methods = {
		loadOptions: {
			getPipelineStages,
			getEmailTemplates,
			getFileTemplates,
			getTeamMembers,
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		return {
			workflowData: [this.helpers.returnJsonArray(req.body as IDataObject[])],
		};
	}
}

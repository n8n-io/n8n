import {
	type IDataObject,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';

import { createPage } from './templates';

const CHAT_TRIGGER_PATH_IDENTIFIER = 'n8n-chat';

export class ChatTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'n8n Chat Trigger',
		name: 'chatTrigger',
		icon: 'fa:comments',
		group: ['trigger'],
		version: 1,
		description: 'Runs the flow when an n8n generated webchat is submitted',
		defaults: {
			name: 'n8n Chat Trigger',
		},
		inputs: [],
		outputs: ['main'],
		webhooks: [
			{
				name: 'setup',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: CHAT_TRIGGER_PATH_IDENTIFIER,
				hidden: true,
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: '={{$parameter["responseMode"]}}',
				path: CHAT_TRIGGER_PATH_IDENTIFIER,
			},
		],
		eventTriggerDescription: 'Waiting for you to submit the chat',
		activationMessage: 'You can now make calls to your production Chat URL.',
		triggerPanel: {
			header: 'Pull in a test chat submission',
			executionsHelp: {
				inactive:
					"Chat Trigger have two modes: test and production. <br /> <br /> <b>Use test mode while you build your workflow</b>. Click the 'Test Step' button, then fill out the test chat that opens in a popup tab. The executions will show up in the editor.<br /> <br /> <b>Use production mode to run your workflow automatically</b>. <a data-key=\"activate\">Activate</a> the workflow, then make requests to the production URL. Then every time there's a chat submission via the Production Chat URL, the workflow will execute. These executions will show up in the executions list, but not in the editor.",
				active:
					"Chat Trigger have two modes: test and production. <br /> <br /> <b>Use test mode while you build your workflow</b>. Click the 'Test Step' button, then fill out the test chat that opens in a popup tab. The executions will show up in the editor.<br /> <br /> <b>Use production mode to run your workflow automatically</b>. <a data-key=\"activate\">Activate</a> the workflow, then make requests to the production URL. Then every time there's a chat submission via the Production Chat URL, the workflow will execute. These executions will show up in the executions list, but not in the editor.",
			},
			activationHint:
				'<a data-key="activate">Activate</a> this workflow to have it also run automatically for new chat submissions created via the Production URL.',
		},
		properties: [
			{
				displayName: 'Chat Title',
				name: 'chatTitle',
				type: 'string',
				default: '',
				placeholder: 'e.g. Contact us',
				required: true,
				description: 'Shown at the top of the chat',
			},
			{
				displayName: 'Respond When',
				name: 'responseMode',
				type: 'options',
				options: [
					{
						name: 'Chat Is Submitted',
						value: 'onReceived',
						description: 'As soon as this node receives the chat submission',
					},
					{
						name: 'Workflow Finishes',
						value: 'lastNode',
						description: 'When the last node of the workflow is executed',
					},
				],
				default: 'onReceived',
				description: 'When to respond to the chat submission',
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const webhookName = this.getWebhookName();
		const mode = this.getMode() === 'manual' ? 'test' : 'production';

		// Show the chat on GET request
		if (webhookName === 'setup') {
			const formTitle = this.getNodeParameter('chatTitle', '') as string;
			const instanceId = await this.getInstanceId();

			const page = createPage({
				title: formTitle,
				mode,
				instanceId,
			});

			const res = this.getResponseObject();
			res.status(200).send(page).end();
			return {
				noWebhookResponse: true,
			};
		}

		const bodyData = (this.getBodyData().data as IDataObject) ?? {};

		const returnData: IDataObject = {};
		returnData.submittedAt = bodyData.submittedAt;
		returnData.formMode = mode;

		const webhookResponse: IDataObject = { status: 200 };

		return {
			webhookResponse,
			workflowData: [this.helpers.returnJsonArray(returnData)],
		};
	}
}

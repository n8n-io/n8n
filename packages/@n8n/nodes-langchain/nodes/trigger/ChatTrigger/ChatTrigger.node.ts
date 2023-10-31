import type {
	IDataObject,
	IWebhookFunctions,
	IWebhookResponseData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { createPage } from './templates';
import { validateAuth } from './GenericFunctions';

const CHAT_TRIGGER_PATH_IDENTIFIER = 'chat';

export class ChatTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Chat Trigger',
		name: 'chatTrigger',
		icon: 'fa:comments',
		group: ['trigger'],
		version: 1,
		description: 'Runs the flow when an n8n generated webchat is submitted',
		defaults: {
			name: 'Chat Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-class-description-credentials-name-unsuffixed
				name: 'httpBasicAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: ['basicAuth'],
					},
				},
			},
		],
		webhooks: [
			{
				name: 'setup',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: CHAT_TRIGGER_PATH_IDENTIFIER,
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'responseNode',
				path: CHAT_TRIGGER_PATH_IDENTIFIER,
				ndvHideMethod: true,
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
				'<a data-key="activate">Activate</a> this workflow to have it also run automatically for new chat messages created via the Production URL.',
		},
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Basic Auth',
						value: 'basicAuth',
					},
					{
						name: 'Header Auth',
						value: 'headerAuth',
					},
					{
						name: 'None',
						value: 'none',
					},
				],
				default: 'none',
				description: 'The way to authenticate',
			},
			{
				displayName: 'Initial Messages',
				name: 'initialMessages',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				placeholder: 'Add Message',
				default: '',
				description: 'Default messages shown at the start of the chat, one per line',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Get Started',
						name: 'getStarted',
						type: 'string',
						default: 'New Conversation',
						placeholder: 'e.g. New Conversation',
						description: 'Shown at the start of the chat, in the middle of the chat window',
					},
					{
						displayName: 'Input Placeholder',
						name: 'inputPlaceholder',
						type: 'string',
						default: 'Type your question..',
						placeholder: 'e.g. Type your message here',
						description: 'Shown as placeholder text in the chat input field',
					},
					{
						displayName: 'Subtitle',
						name: 'subtitle',
						type: 'string',
						default: "Start a chat. We're here to help you 24/7.",
						placeholder: "e.g. We're here for you",
						description: 'Shown at the top of the chat, under the title',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: 'Hi there! 👋',
						placeholder: 'e.g. Welcome',
						description: 'Shown at the top of the chat',
					},
				],
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const webhookName = this.getWebhookName();
		const mode = this.getMode() === 'manual' ? 'test' : 'production';
		const res = this.getResponseObject();

		try {
			await validateAuth(this);
		} catch (error) {
			if (error) {
				res.writeHead(error.responseCode, { 'WWW-Authenticate': 'Basic realm="Webhook"' });
				res.end(error.message);
				return { noWebhookResponse: true };
			}
			throw error;
		}

		// Show the chat on GET request
		if (webhookName === 'setup') {
			const webhookUrlRaw = this.getNodeWebhookUrl('default') as string;
			const webhookUrl =
				mode === 'test' ? webhookUrlRaw.replace('/webhook', '/webhook-test') : webhookUrlRaw;
			const authentication = this.getNodeParameter('authentication') as
				| 'none'
				| 'basicAuth'
				| 'headerAuth';
			const additionalFields = this.getNodeParameter('additionalFields', {});
			const initialMessagesRaw = this.getNodeParameter('initialMessages', '') as string;
			const initialMessages = initialMessagesRaw
				.split('\n')
				.filter((line) => line)
				.map((line) => line.trim());
			const instanceId = await this.getInstanceId();

			const page = createPage({
				i18n: {
					en: additionalFields as Record<string, string>,
				},
				initialMessages,
				webhookUrl,
				mode,
				instanceId,
				authentication,
			});

			res.status(200).send(page).end();
			return {
				noWebhookResponse: true,
			};
		}

		const bodyData = this.getBodyData() ?? {};
		const returnData: IDataObject = {};
		returnData.sessionId = bodyData.sessionId;
		returnData.action = bodyData.action;
		returnData.message = bodyData.message;

		const webhookResponse: IDataObject = { status: 200 };
		return {
			webhookResponse,
			workflowData: [this.helpers.returnJsonArray(returnData)],
		};
	}
}

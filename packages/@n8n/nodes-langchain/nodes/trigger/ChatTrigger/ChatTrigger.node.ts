import {
	type IDataObject,
	type IWebhookFunctions,
	type IWebhookResponseData,
	type INodeType,
	type INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';
import { pick } from 'lodash';
import type { BaseChatMemory } from 'langchain/memory';
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
		// TODO: This will be reworked, so we also have to update then here
		supportsCORS: true,
		maxNodes: 1,
		inputs: `={{ (() => {
			if (!['hostedChat', 'webhook'].includes($parameter.mode)) {
				return [];
			}
			if ($parameter.options?.loadPreviousSession !== 'memory') {
				return [];
			}

			return [
				{
					displayName: 'Memory',
					maxConnections: 1,
					type: '${NodeConnectionType.AiMemory}',
					required: true,
				}
			];
		 })() }}`,
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
				ndvHideUrl: true,
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: '={{$parameter.options?.["responseMode"] || "lastNode" }}',
				path: CHAT_TRIGGER_PATH_IDENTIFIER,
				ndvHideMethod: true,
			},
		],
		eventTriggerDescription: 'Waiting for you to submit the chat',
		activationMessage: 'You can now make calls to your production Chat URL.',
		triggerPanel: {
			hideContent: '={{ $parameter.mode === "testChat" }}',
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
				displayOptions: {
					hide: {
						mode: ['testChat'],
					},
				},
				options: [
					{
						name: 'Basic Auth',
						value: 'basicAuth',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'n8n User Auth',
						value: 'n8nUserAuth',
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
				displayName: 'The chat will only be accessible to authenticated n8n users',
				name: 'notice',
				type: 'notice',
				displayOptions: {
					show: {
						authentication: ['n8nUserAuth'],
					},
				},
				default: '',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				displayName: 'Open Built-in Chat and execute workflow',
				name: 'openChat',
				type: 'button',
				typeOptions: {
					action: 'openChat',
				},
				default: '',
			},
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{
						name: 'Hosted Chat',
						value: 'hostedChat',
						description: 'Make webhook and Chat-Website available',
					},
					// TODO: Reminder, if we change value of "testChat" also update in ChatEmbedModal.vue. Delete this line before merge!
					{
						name: 'Test Chat',
						value: 'testChat',
						description: 'Only use to test with the debug Chat',
					},
					{
						name: 'Webhook',
						value: 'webhook',
						description: 'Make webhook available',
					},
				],
				default: 'testChat',
			},
			{
				displayName: 'Initial Messages',
				name: 'initialMessages',
				type: 'string',
				displayOptions: {
					show: {
						mode: ['hostedChat'],
					},
				},
				typeOptions: {
					rows: 3,
				},
				default: 'Hi there! 👋\nMy name is Nathan. How can I assist you today?',
				description: 'Default messages shown at the start of the chat, one per line',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						mode: ['hostedChat', 'webhook'],
					},
				},
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Input Placeholder',
						name: 'inputPlaceholder',
						type: 'string',
						displayOptions: {
							show: {
								'/mode': ['hostedChat'],
							},
						},
						default: 'Type your question..',
						placeholder: 'e.g. Type your message here',
						description: 'Shown as placeholder text in the chat input field',
					},
					{
						displayName: 'Load Previous Session',
						name: 'loadPreviousSession',
						type: 'options',
						options: [
							// TODO: Think about how options should be called
							{
								name: 'Not Supported',
								value: 'notSupported',
								description: 'Loading of messages of previous session is not supported',
							},
							{
								name: 'From Memory',
								value: 'memory',
								description: 'Load session messages from memory',
							},
							{
								name: 'Manually',
								value: 'manually',
								description: 'Manually return messages of session',
							},
						],
						default: 'notSupported',
						description: 'If loading messages of a previous session should be supported',
					},
					{
						displayName: 'Response Mode',
						name: 'responseMode',
						type: 'options',
						options: [
							{
								name: 'When Last Node Finishes',
								value: 'lastNode',
								description: 'Returns data of the last-executed node',
							},
							{
								name: "Using 'Respond to Webhook' Node",
								value: 'responseNode',
								description: 'Response defined in that node',
							},
						],
						default: 'lastNode',
						description: 'When and how to respond to the webhook',
					},
					{
						displayName: 'Show Welcome Screen',
						name: 'showWelcomeScreen',
						type: 'boolean',
						displayOptions: {
							show: {
								'/mode': ['hostedChat'],
							},
						},
						default: false,
						description: 'Whether to show the welcome screen at the start of the chat',
					},
					{
						displayName: 'Start Conversation Button Text',
						name: 'getStarted',
						type: 'string',
						displayOptions: {
							show: {
								showWelcomeScreen: [true],
								'/mode': ['hostedChat'],
							},
						},
						default: 'New Conversation',
						placeholder: 'e.g. New Conversation',
						description: 'Shown as part of the welcome screen, in the middle of the chat window',
					},
					{
						displayName: 'Subtitle',
						name: 'subtitle',
						type: 'string',
						displayOptions: {
							show: {
								'/mode': ['hostedChat'],
							},
						},
						default: "Start a chat. We're here to help you 24/7.",
						placeholder: "e.g. We're here for you",
						description: 'Shown at the top of the chat, under the title',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						displayOptions: {
							show: {
								'/mode': ['hostedChat'],
							},
						},
						default: 'Hi there! 👋',
						placeholder: 'e.g. Welcome',
						description: 'Shown at the top of the chat',
					},
				],
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const res = this.getResponseObject();

		const nodeMode = this.getNodeParameter('mode', 'testChat') as string;
		if (nodeMode === 'testChat') {
			res.status(404).end();
			return {
				noWebhookResponse: true,
			};
		}

		const webhookName = this.getWebhookName();
		const mode = this.getMode() === 'manual' ? 'test' : 'production';
		const bodyData = this.getBodyData() ?? {};

		const options = this.getNodeParameter('options', {}) as {
			getStarted?: string;
			inputPlaceholder?: string;
			loadPreviousSession?: 'manually' | 'memory' | 'notSupported';
			showWelcomeScreen?: boolean;
			subtitle?: string;
			title?: string;
		};

		if (nodeMode === 'hostedChat') {
			try {
				await validateAuth(this);
			} catch (error) {
				if (error) {
					res.writeHead(error.responseCode as number, {
						'www-authenticate': 'Basic realm="Webhook"',
					});
					res.end(error.message as string);
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
					| 'n8nUserAuth';
				const initialMessagesRaw = this.getNodeParameter('initialMessages', '') as string;
				const initialMessages = initialMessagesRaw
					.split('\n')
					.filter((line) => line)
					.map((line) => line.trim());
				const instanceId = this.getInstanceId();

				const i18nConfig = pick(options, ['getStarted', 'inputPlaceholder', 'subtitle', 'title']);

				const page = createPage({
					i18n: {
						en: i18nConfig,
					},
					showWelcomeScreen: options.showWelcomeScreen,
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
		}

		if (bodyData.action === 'loadPreviousSession') {
			if (options?.loadPreviousSession === 'memory') {
				const memory = (await this.getInputConnectionData(NodeConnectionType.AiMemory, 0)) as
					| BaseChatMemory
					| undefined;
				const messages = await memory?.chatHistory.getMessages();

				return {
					webhookResponse: { data: messages },
				};
			} else if (options?.loadPreviousSession === 'notSupported') {
				// If messages of a previous session should not be loaded, simply return an empty array
				return {
					webhookResponse: { data: [] },
				};
			}
		}

		const returnData: IDataObject = { ...bodyData };
		const webhookResponse: IDataObject = { status: 200 };
		return {
			webhookResponse,
			workflowData: [this.helpers.returnJsonArray(returnData)],
		};
	}
}

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
			hideContent: true,
		},
		properties: [
			/**
			 * @note If we change this property, also update it in ChatEmbedModal.vue
			 */
			{
				displayName: 'Make Chat Publicly Available',
				name: 'public',
				type: 'boolean',
				default: false,
				description:
					'Whether the chat should be publicly available or only accessible through the manual chat interface',
			},
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{
						name: 'Hosted Chat',
						value: 'hostedChat',
						description: 'Chat by going to a URL hosted by n8n (plus chat within the editor)',
					},
					{
						name: 'Embedded Chat',
						value: 'webhook',
						description:
							'Chat through a widget embedded in another page, or by calling a webhook (plus chat within the editor)',
					},
				],
				default: 'hostedChat',
				displayOptions: {
					show: {
						public: [true],
					},
				},
			},
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				displayOptions: {
					show: {
						public: [true],
					},
				},
				options: [
					{
						name: 'Basic Auth',
						value: 'basicAuth',
						description: 'Simple username and password (the same one for all users)',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'n8n User Auth',
						value: 'n8nUserAuth',
						description: 'Require user to be logged in with their n8n account',
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
						public: [true],
					},
				},
				default: '',
			},
			{
				displayName: 'Initial Messages',
				name: 'initialMessages',
				type: 'string',
				displayOptions: {
					show: {
						mode: ['hostedChat'],
						public: [true],
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
						public: [true],
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

		const isPublic = this.getNodeParameter('public', false) as boolean;
		const nodeMode = this.getNodeParameter('mode', 'hostedChat') as string;
		if (!isPublic) {
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

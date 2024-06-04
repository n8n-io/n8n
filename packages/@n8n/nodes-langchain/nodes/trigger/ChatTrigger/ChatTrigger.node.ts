import {
	type IDataObject,
	type IWebhookFunctions,
	type IWebhookResponseData,
	type INodeType,
	type INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';
import { pick } from 'lodash';
import type { BaseChatMemory } from '@langchain/community/memory/chat_memory';
import { createPage } from './templates';
import { validateAuth } from './GenericFunctions';
import type { LoadPreviousSessionChatOption } from './types';

const CHAT_TRIGGER_PATH_IDENTIFIER = 'chat';

export class ChatTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Chat Trigger',
		name: 'chatTrigger',
		icon: 'fa:comments',
		group: ['trigger'],
		version: 1,
		description: 'Runs the workflow when an n8n generated webchat is submitted',
		defaults: {
			name: 'Chat Trigger',
		},
		codex: {
			categories: ['Core Nodes'],
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.chattrigger/',
					},
				],
			},
		},
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
				ndvHideUrl: '={{ !$parameter.public }}',
			},
		],
		eventTriggerDescription: 'Waiting for you to submit the chat',
		activationMessage: 'You can now make calls to your production chat URL.',
		triggerPanel: false,
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
						description: 'Chat on a page served by n8n',
					},
					{
						name: 'Embedded Chat',
						value: 'webhook',
						description: 'Chat through a widget embedded in another page, or by calling a webhook',
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
				displayName:
					'Chat will be live at the URL above once you activate this workflow. Live executions will show up in the ‘executions’ tab',
				name: 'hostedChatNotice',
				type: 'notice',
				displayOptions: {
					show: {
						mode: ['hostedChat'],
						public: [true],
					},
				},
				default: '',
			},
			{
				displayName:
					'Follow the instructions <a href="https://www.npmjs.com/package/@n8n/chat" target="_blank">here</a> to embed chat in a webpage (or just call the webhook URL at the top of this section). Chat will be live once you activate this workflow',
				name: 'embeddedChatNotice',
				type: 'notice',
				displayOptions: {
					show: {
						mode: ['webhook'],
						public: [true],
					},
				},
				default: '',
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
				displayName: 'Initial Message(s)',
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
							{
								name: 'Off',
								value: 'notSupported',
								description: 'Loading messages of previous session is turned off',
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
						description: 'If loading messages of a previous session should be enabled',
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
						displayName: 'Require Button Click to Start Chat',
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
			loadPreviousSession?: LoadPreviousSessionChatOption;
			showWelcomeScreen?: boolean;
			subtitle?: string;
			title?: string;
		};

		if (nodeMode === 'hostedChat') {
			try {
				await validateAuth(this);
			} catch (error) {
				if (error) {
					res.writeHead((error as IDataObject).responseCode as number, {
						'www-authenticate': 'Basic realm="Webhook"',
					});
					res.end((error as IDataObject).message as string);
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
					loadPreviousSession: options.loadPreviousSession,
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
				const messages = ((await memory?.chatHistory.getMessages()) ?? [])
					.filter((message) => !message?.additional_kwargs?.hideFromUI)
					.map((message) => message?.toJSON());
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

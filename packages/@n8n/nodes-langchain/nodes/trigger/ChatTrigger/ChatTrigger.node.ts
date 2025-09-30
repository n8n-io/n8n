import type { BaseChatMemory } from '@langchain/community/memory/chat_memory';
import pick from 'lodash/pick';
import {
	Node,
	NodeConnectionTypes,
	NodeOperationError,
	assertParamIsBoolean,
	validateNodeParameters,
	assertParamIsString,
} from 'n8n-workflow';
import type {
	IDataObject,
	IWebhookFunctions,
	IWebhookResponseData,
	INodeTypeDescription,
	MultiPartFormData,
	INodeExecutionData,
	IBinaryData,
	INodeProperties,
} from 'n8n-workflow';

import { cssVariables } from './constants';
import { validateAuth } from './GenericFunctions';
import { createPage } from './templates';
import { assertValidLoadPreviousSessionOption } from './types';

const CHAT_TRIGGER_PATH_IDENTIFIER = 'chat';
const allowFileUploadsOption: INodeProperties = {
	displayName: 'Allow File Uploads',
	name: 'allowFileUploads',
	type: 'boolean',
	default: false,
	description: 'Whether to allow file uploads in the chat',
};
const allowedFileMimeTypeOption: INodeProperties = {
	displayName: 'Allowed File Mime Types',
	name: 'allowedFilesMimeTypes',
	type: 'string',
	default: '*',
	placeholder: 'e.g. image/*, text/*, application/pdf',
	description:
		'Allowed file types for upload. Comma-separated list of <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types" target="_blank">MIME types</a>.',
};

const respondToWebhookResponseMode = {
	name: "Using 'Respond to Webhook' Node",
	value: 'responseNode',
	description: 'Response defined in that node',
};

const lastNodeResponseMode = {
	name: 'When Last Node Finishes',
	value: 'lastNode',
	description: 'Returns data of the last-executed node',
};

const streamingResponseMode = {
	name: 'Streaming',
	value: 'streaming',
	description: 'Streaming response from specified nodes (e.g. Agents)',
};

const respondNodesResponseMode = {
	name: 'Using Response Nodes',
	value: 'responseNodes',
	description:
		"Send responses to the chat by using 'Respond to Chat' or 'Respond to Webhook' nodes",
};

const commonOptionsFields: INodeProperties[] = [
	// CORS parameters are only valid for when chat is used in hosted or webhook mode
	{
		displayName: 'Allowed Origins (CORS)',
		name: 'allowedOrigins',
		type: 'string',
		default: '*',
		description:
			'Comma-separated list of URLs allowed for cross-origin non-preflight requests. Use * (default) to allow all origins.',
		displayOptions: {
			show: {
				'/mode': ['hostedChat', 'webhook'],
			},
		},
	},
	{
		...allowFileUploadsOption,
		displayOptions: {
			show: {
				'/mode': ['hostedChat'],
			},
		},
	},
	{
		...allowedFileMimeTypeOption,
		displayOptions: {
			show: {
				'/mode': ['hostedChat'],
			},
		},
	},
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
	{
		displayName: 'Custom Chat Styling',
		name: 'customCss',
		type: 'string',
		typeOptions: {
			rows: 10,
			editor: 'cssEditor',
		},
		displayOptions: {
			show: {
				'/mode': ['hostedChat'],
			},
		},
		default: `
${cssVariables}

/* You can override any class styles, too. Right-click inspect in Chat UI to find class to override. */
.chat-message {
	max-width: 50%;
}
`.trim(),
		description: 'Override default styling of the public chat interface with CSS',
	},
];

export class ChatTrigger extends Node {
	description: INodeTypeDescription = {
		displayName: 'Chat Trigger',
		name: 'chatTrigger',
		icon: 'fa:comments',
		iconColor: 'black',
		group: ['trigger'],
		version: [1, 1.1, 1.2, 1.3],
		defaultVersion: 1.3,
		description: 'Runs the workflow when an n8n generated webchat is submitted',
		defaults: {
			name: 'When chat message received',
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
					type: '${NodeConnectionTypes.AiMemory}',
					required: true,
				}
			];
		 })() }}`,
		outputs: [NodeConnectionTypes.Main],
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
						public: [false],
						'@version': [1, 1.1],
					},
				},
				placeholder: 'Add Field',
				default: {},
				options: [allowFileUploadsOption, allowedFileMimeTypeOption],
			},
			// Options for versions 1.0 and 1.1 (without streaming)
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						mode: ['hostedChat', 'webhook'],
						public: [true],
						'@version': [1, 1.1],
					},
				},
				placeholder: 'Add Field',
				default: {},
				options: [
					...commonOptionsFields,
					{
						displayName: 'Response Mode',
						name: 'responseMode',
						type: 'options',
						options: [lastNodeResponseMode, respondToWebhookResponseMode],
						default: 'lastNode',
						description: 'When and how to respond to the webhook',
					},
				],
			},
			// Options for version 1.2 (with streaming)
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						mode: ['hostedChat', 'webhook'],
						public: [true],
						'@version': [1.2],
					},
				},
				placeholder: 'Add Field',
				default: {},
				options: [
					...commonOptionsFields,
					{
						displayName: 'Response Mode',
						name: 'responseMode',
						type: 'options',
						options: [lastNodeResponseMode, respondToWebhookResponseMode, streamingResponseMode],
						default: 'lastNode',
						description: 'When and how to respond to the webhook',
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						public: [false],
						'@version': [{ _cnd: { gte: 1.3 } }],
					},
				},
				placeholder: 'Add Field',
				default: {},
				options: [
					allowFileUploadsOption,
					allowedFileMimeTypeOption,
					{
						displayName: 'Response Mode',
						name: 'responseMode',
						type: 'options',
						options: [lastNodeResponseMode, respondNodesResponseMode],
						default: 'lastNode',
						description: 'When and how to respond to the chat',
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						mode: ['hostedChat', 'webhook'],
						public: [true],
						'@version': [{ _cnd: { gte: 1.3 } }],
					},
				},
				placeholder: 'Add Field',
				default: {},
				options: [
					...commonOptionsFields,
					{
						displayName: 'Response Mode',
						name: 'responseMode',
						type: 'options',
						options: [lastNodeResponseMode, streamingResponseMode, respondToWebhookResponseMode],
						default: 'lastNode',
						description: 'When and how to respond to the chat',
						displayOptions: { show: { '/mode': ['webhook'] } },
					},
					{
						displayName: 'Response Mode',
						name: 'responseMode',
						type: 'options',
						options: [lastNodeResponseMode, streamingResponseMode, respondNodesResponseMode],
						default: 'lastNode',
						description: 'When and how to respond to the webhook',
						displayOptions: { show: { '/mode': ['hostedChat'] } },
					},
				],
			},
		],
	};

	private async handleFormData(context: IWebhookFunctions) {
		const req = context.getRequestObject() as MultiPartFormData.Request;
		const options = context.getNodeParameter('options', {}) as IDataObject;
		const { data, files } = req.body;

		const returnItem: INodeExecutionData = {
			json: data,
		};

		if (files && Object.keys(files).length) {
			returnItem.json.files = [] as Array<Omit<IBinaryData, 'data'>>;
			returnItem.binary = {};

			const count = 0;
			for (const fileKey of Object.keys(files)) {
				const processedFiles: MultiPartFormData.File[] = [];
				if (Array.isArray(files[fileKey])) {
					processedFiles.push(...files[fileKey]);
				} else {
					processedFiles.push(files[fileKey]);
				}

				let fileIndex = 0;
				for (const file of processedFiles) {
					let binaryPropertyName = 'data';

					// Remove the '[]' suffix from the binaryPropertyName if it exists
					if (binaryPropertyName.endsWith('[]')) {
						binaryPropertyName = binaryPropertyName.slice(0, -2);
					}
					if (options.binaryPropertyName) {
						binaryPropertyName = `${options.binaryPropertyName.toString()}${count}`;
					}

					const binaryFile = await context.nodeHelpers.copyBinaryFile(
						file.filepath,
						file.originalFilename ?? file.newFilename,
						file.mimetype,
					);

					const binaryKey = `${binaryPropertyName}${fileIndex}`;

					const binaryInfo = {
						...pick(binaryFile, ['fileName', 'fileSize', 'fileType', 'mimeType', 'fileExtension']),
						binaryKey,
					};

					returnItem.binary = Object.assign(returnItem.binary ?? {}, {
						[`${binaryKey}`]: binaryFile,
					});
					returnItem.json.files = [
						...(returnItem.json.files as Array<Omit<IBinaryData, 'data'>>),
						binaryInfo,
					];
					fileIndex += 1;
				}
			}
		}

		return returnItem;
	}

	async webhook(ctx: IWebhookFunctions): Promise<IWebhookResponseData> {
		const res = ctx.getResponseObject();

		const isPublic = ctx.getNodeParameter('public', false);
		assertParamIsBoolean('public', isPublic, ctx.getNode());

		const nodeMode = ctx.getNodeParameter('mode', 'hostedChat');
		assertParamIsString('mode', nodeMode, ctx.getNode());

		if (!isPublic) {
			res.status(404).end();
			return {
				noWebhookResponse: true,
			};
		}

		const options = ctx.getNodeParameter('options', {});
		validateNodeParameters(
			options,
			{
				getStarted: { type: 'string' },
				inputPlaceholder: { type: 'string' },
				loadPreviousSession: { type: 'string' },
				showWelcomeScreen: { type: 'boolean' },
				subtitle: { type: 'string' },
				title: { type: 'string' },
				allowFileUploads: { type: 'boolean' },
				allowedFilesMimeTypes: { type: 'string' },
				customCss: { type: 'string' },
				responseMode: { type: 'string' },
			},
			ctx.getNode(),
		);

		const loadPreviousSession = options.loadPreviousSession;
		assertValidLoadPreviousSessionOption(loadPreviousSession, ctx.getNode());

		const enableStreaming = options.responseMode === 'streaming';

		const req = ctx.getRequestObject();
		const webhookName = ctx.getWebhookName();
		const mode = ctx.getMode() === 'manual' ? 'test' : 'production';
		const bodyData = ctx.getBodyData() ?? {};

		try {
			await validateAuth(ctx);
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
		if (nodeMode === 'hostedChat') {
			// Show the chat on GET request
			if (webhookName === 'setup') {
				const webhookUrlRaw = ctx.getNodeWebhookUrl('default');
				if (!webhookUrlRaw) {
					throw new NodeOperationError(ctx.getNode(), 'Default webhook url not set');
				}

				const webhookUrl =
					mode === 'test' ? webhookUrlRaw.replace('/webhook', '/webhook-test') : webhookUrlRaw;
				const authentication = ctx.getNodeParameter('authentication') as
					| 'none'
					| 'basicAuth'
					| 'n8nUserAuth';
				const initialMessagesRaw = ctx.getNodeParameter('initialMessages', '');
				assertParamIsString('initialMessage', initialMessagesRaw, ctx.getNode());
				const instanceId = ctx.getInstanceId();

				const i18nConfig: Record<string, string> = {};
				const keys = ['getStarted', 'inputPlaceholder', 'subtitle', 'title'] as const;
				for (const key of keys) {
					if (options[key] !== undefined) {
						i18nConfig[key] = options[key];
					}
				}

				const page = createPage({
					i18n: {
						en: i18nConfig,
					},
					showWelcomeScreen: options.showWelcomeScreen,
					loadPreviousSession,
					initialMessages: initialMessagesRaw,
					webhookUrl,
					mode,
					instanceId,
					authentication,
					allowFileUploads: options.allowFileUploads,
					allowedFilesMimeTypes: options.allowedFilesMimeTypes,
					customCss: options.customCss,
					enableStreaming,
				});

				res.status(200).send(page).end();
				return {
					noWebhookResponse: true,
				};
			}
		}

		if (bodyData.action === 'loadPreviousSession') {
			if (options?.loadPreviousSession === 'memory') {
				const memory = (await ctx.getInputConnectionData(NodeConnectionTypes.AiMemory, 0)) as
					| BaseChatMemory
					| undefined;
				const messages = ((await memory?.chatHistory.getMessages()) ?? [])
					.filter((message) => !message?.additional_kwargs?.hideFromUI)
					.map((message) => message?.toJSON());
				return {
					webhookResponse: { data: messages },
				};
			} else if (!options?.loadPreviousSession || options?.loadPreviousSession === 'notSupported') {
				// If messages of a previous session should not be loaded, simply return an empty array
				return {
					webhookResponse: { data: [] },
				};
			}
		}

		let returnData: INodeExecutionData[];
		const webhookResponse: IDataObject = { status: 200 };

		// Handle streaming responses
		if (enableStreaming) {
			// Set up streaming response headers
			res.writeHead(200, {
				'Content-Type': 'application/json; charset=utf-8',
				'Transfer-Encoding': 'chunked',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
			});

			// Flush headers immediately
			res.flushHeaders();

			if (req.contentType === 'multipart/form-data') {
				returnData = [await this.handleFormData(ctx)];
			} else {
				returnData = [{ json: bodyData }];
			}

			return {
				workflowData: [ctx.helpers.returnJsonArray(returnData)],
				noWebhookResponse: true,
			};
		}

		if (req.contentType === 'multipart/form-data') {
			returnData = [await this.handleFormData(ctx)];
			return {
				webhookResponse,
				workflowData: [returnData],
			};
		} else {
			returnData = [{ json: bodyData }];
		}

		return {
			webhookResponse,
			workflowData: [ctx.helpers.returnJsonArray(returnData)],
		};
	}
}

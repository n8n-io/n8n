import type { BaseChatMemory } from '@langchain/community/memory/chat_memory';
import pick from 'lodash/pick';
import { autoSaveHighlightedDataProperty } from 'n8n-nodes-base/dist/utils/highlightedData';
import {
	Node,
	NodeConnectionTypes,
	NodeOperationError,
	assertParamIsBoolean,
	validateNodeParameters,
	assertParamIsString,
	getHighlightedInputKey,
	HIGHLIGHTED_SESSION_KEY,
	CHAT_TRIGGER_PATH_SUFFIX,
	buildCredentialConnectionsRequiredResponse,
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
	CredentialCheckResult,
	IUser,
} from 'n8n-workflow';
import * as a from 'node:assert';
import { ChatTriggerConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import { buildChatShellViewModel, connectBarText } from './connect-panel';
import { cssVariables } from './constants';
import {
	establishChatSessionIdentity,
	handleChatTokenRefresh,
	resolveInnerFrameIdentity,
	validateAuth,
} from './GenericFunctions';
import {
	buildChatRefreshUrl,
	buildInnerFrameSrc,
	CHAT_FRAME_SANDBOX,
	isChatOAuth2Enabled,
	isChatRefreshRequest,
	isShellInnerRequest,
} from './shell';
import { createPage } from './templates';
import { assertValidLoadPreviousSessionOption, type ChatFrameIdentity } from './types';

const isPublicChatTriggerDisabled = () => Container.get(ChatTriggerConfig).disablePublicChat;

/**
 * Merges the server-verified identity into the emitted item's `json`.
 *
 * Under `n8nUserAuth` the `user` key belongs to the server. The item's `json` starts as
 * the caller's own request body, so any `user` the caller sent is dropped — whether or
 * not a verified one replaces it, since a workflow reading `json.user` must never get an
 * attacker-controlled value in the slot the trusted one occupies. Under the other auth
 * modes no server identity exists, `user` is ordinary body data, and the body passes
 * through untouched.
 *
 * Only a plain object body is merged into. A string (`text/plain`), a scalar or an array
 * body can carry no `user` key, and object rest would silently shred it into
 * `{ 0: …, 1: … }`, so those pass through as they are.
 */
function isPlainObject(value: unknown): value is IDataObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function withAuthenticatedUser(
	json: IDataObject,
	user: IUser | undefined,
	serverOwnsUserKey: boolean,
): IDataObject {
	if (!serverOwnsUserKey || !isPlainObject(json)) return json;
	const { user: claimedUser, ...rest } = json;
	if (!user) return rest;
	// Field by field, so a future `IUser` field cannot leak into workflow data.
	return {
		...rest,
		user: {
			id: user.id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
		},
	};
}

const allowFileUploadsOption: INodeProperties = {
	displayName: 'Allow File Uploads',
	name: 'allowFileUploads',
	type: 'boolean',
	default: false,
	description: 'Whether to allow file uploads in the chat',
};
const includeUserInOutputOption: INodeProperties = {
	displayName: 'Include User in Output',
	name: 'includeUserInOutput',
	type: 'boolean',
	default: true,
	// Hidden until the chat OAuth2 rollout reaches GA. Display only — `webhook()`
	// checks the same flag itself.
	envFeatureFlag: 'CHAT_TRIGGER_OAUTH2',
	// No `mode` gate, unlike its neighbour: `n8nUserAuth` also works in `webhook`
	// mode through the cookie check, and that path emits an item too.
	description: "Whether to include the logged-in user's ID, email and name in the trigger output",
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
	description: 'Send responses to the chat by using one or more Chat nodes',
};

const responseModeBuilderHint =
	"'streaming' (preferred for Agent-backed chats): the connected Agent streams its reply to the widget directly — no extra wiring. Place logging or side-effects on a PARALLEL branch off the trigger or Agent, never inline after the Agent. 'lastNode': the last-executed node's output is sent to the widget — that node MUST emit `{ output: '<reply text>' }` (typically the Agent itself, or a Set node re-shaping data). NEVER terminate the chain with a Data Table insert, HTTP Request, or other side-effect node — their output is not a chat reply and the widget will error. 'responseNodes' / 'responseNode': requires explicit response nodes inside the flow (`@n8n/n8n-nodes-langchain.chat` for chat-hub mode, `n8n-nodes-base.respondToWebhook` for webhook mode).";

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
		builderHint: {
			propertyHint:
				"This ONLY rehydrates the chat widget UI when the user reopens it — it does NOT give the Agent memory. The Agent gets memory from its own memory subnode regardless of this setting. Only set to 'memory' if the user wants the widget to restore visible history on reload; if so, you MUST also attach a memory subnode to this trigger (use the same memory node as the Agent so widget history matches what the Agent remembers). Otherwise leave as 'notSupported'.",
		},
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
		icon: 'node:chat-trigger',
		iconColor: 'black',
		group: ['trigger'],
		version: [1, 1.1, 1.2, 1.3, 1.4, 1.5],
		defaultVersion: 1.5,
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
		builderHint: {
			searchHint:
				"Pair with `@n8n/n8n-nodes-langchain.agent` for chatbot workflows. Reply delivery is controlled by `options.responseMode` — `streaming` (Agent streams directly to widget) is simplest and preferred. For `lastNode` mode, the workflow's last-executed node MUST output `{ output: '<reply>' }` — typically the Agent itself or a Set node re-shaping data; ending the chain with a Data Table insert, HTTP Request, or other side-effect node will fail. Put logging or persistence on a parallel branch, not inline after the Agent.",
			relatedNodes: [
				{
					nodeType: '@n8n/n8n-nodes-langchain.agent',
					relationHint:
						"Main reply producer; use `responseMode: 'streaming'` so the Agent streams directly to the widget.",
				},
				{
					nodeType: 'n8n-nodes-base.set',
					relationHint:
						"Append at the end of a `responseMode: 'lastNode'` chain to re-shape the last node's output into `{ output: '<reply text>' }` when the natural last step (e.g. a Data Table insert) doesn't produce chat-shaped data.",
				},
				{
					nodeType: '@n8n/n8n-nodes-langchain.chat',
					relationHint:
						"Required for `responseMode: 'responseNodes'`. Place inside the flow wherever you want to emit a reply chunk.",
				},
			],
			inputs: {
				ai_memory: {
					required: true,
					displayOptions: {
						show: {
							mode: ['hostedChat', 'webhook'],
							'options.loadPreviousSession': ['memory'],
						},
					},
				},
			},
		},
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
				path: CHAT_TRIGGER_PATH_SUFFIX,
				ndvHideUrl: true,
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode:
					'={{$parameter.options?.["responseMode"] ?? ($parameter.availableInChat ? "streaming" : "lastNode") }}',
				path: CHAT_TRIGGER_PATH_SUFFIX,
				ndvHideMethod: true,
				ndvHideUrl: isPublicChatTriggerDisabled() ? true : '={{ !$parameter.public }}',
			},
		],
		eventTriggerDescription: 'Waiting for you to submit the chat',
		activationMessage: isPublicChatTriggerDisabled()
			? 'Public chat is disabled by instance policy.'
			: 'You can now make calls to your production chat URL.',
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
					'Chat will be live at the URL above once this workflow is published. Live executions will show up in the ‘executions’ tab',
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
					'Follow the instructions <a href="https://www.npmjs.com/package/@n8n/chat" target="_blank">here</a> to embed chat in a webpage (or just call the webhook URL at the top of this section). Chat will be live once you publish this workflow',
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
				builderHint: {
					propertyHint:
						"Default to 'none'. n8n exposes inbound trigger URLs publicly by design. Only select an authentication method when the user explicitly asks to authenticate inbound traffic.",
				},
			},
			{
				displayName: 'Require Workflow Execute Permission',
				name: 'requireExecuteAccess',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						authentication: ['n8nUserAuth'],
						mode: ['hostedChat'],
						public: [true],
					},
				},
				description:
					'Whether the triggering user must also have permission to execute the workflow in the project it belongs to',
			},
			{
				...includeUserInOutputOption,
				displayOptions: {
					show: {
						authentication: ['n8nUserAuth'],
						public: [true],
						'@version': [{ _cnd: { gte: 1.5 } }],
					},
				},
			},
			{
				...includeUserInOutputOption,
				// Off below 1.5: `n8nUserAuth` has been selectable since the node shipped, so chats
				// built long before this feature must keep their output shape. Still visible, so they
				// can opt in without being rebuilt — which would change their public chat URL.
				default: false,
				displayOptions: {
					show: {
						authentication: ['n8nUserAuth'],
						public: [true],
						'@version': [{ _cnd: { lt: 1.5 } }],
					},
				},
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
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				displayName: 'Make Available in n8n Chat Hub',
				name: 'availableInChat',
				type: 'boolean',
				default: false,
				noDataExpression: true,
				description:
					'Whether to make the agent available in n8n Chat Hub for n8n instance users to chat with',
			},
			{
				displayName:
					'Your Chat Trigger node is out of date. To update, delete this node and insert a new Chat Trigger node.',
				name: 'availableInChatNotice',
				type: 'notice',
				displayOptions: {
					show: {
						availableInChat: [true],
						'@version': [{ _cnd: { lt: 1.2 } }],
					},
				},
				default: '',
			},
			{
				displayName:
					'Your n8n users will be able to use this agent in <a href="/home/chat/" target="_blank">Chat</a> once this workflow is published. Make sure to share this workflow with at least Project Chat User access to all users who should use it.',
				name: 'availableInChatNotice',
				type: 'notice',
				displayOptions: {
					show: {
						availableInChat: [true],
						'@version': [{ _cnd: { gte: 1.2 } }],
					},
				},
				default: '',
			},
			{
				displayName: 'Agent Icon',
				name: 'agentIcon',
				type: 'icon',
				default: { type: 'icon', value: 'bot' },
				noDataExpression: true,
				description: 'The icon of the agent on n8n Chat',
				displayOptions: {
					show: {
						availableInChat: [true],
						'@version': [{ _cnd: { gte: 1.2 } }],
					},
				},
			},
			{
				displayName: 'Agent Name',
				name: 'agentName',
				type: 'string',
				default: '',
				noDataExpression: true,
				description:
					'The name of the agent on n8n Chat. Name of the workflow is used if left empty.',
				displayOptions: {
					show: {
						availableInChat: [true],
						'@version': [{ _cnd: { gte: 1.2 } }],
					},
				},
			},
			{
				displayName: 'Agent Description',
				name: 'agentDescription',
				type: 'string',
				typeOptions: {
					rows: 2,
				},
				default: '',
				noDataExpression: true,
				description: 'The description of the agent on n8n Chat',
				displayOptions: {
					show: {
						availableInChat: [true],
						'@version': [{ _cnd: { gte: 1.2 } }],
					},
				},
			},
			{
				displayName: 'Suggestions',
				name: 'suggestedPrompts',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true, fixedCollection: { layout: 'inline' } },
				default: {},
				noDataExpression: true,
				placeholder: 'Add Prompt',
				description:
					'Suggested prompts shown to users in n8n Chat Hub to start a conversation with the agent',
				displayOptions: {
					show: {
						availableInChat: [true],
						'@version': [{ _cnd: { gte: 1.2 } }],
					},
				},
				options: [
					{
						name: 'prompts',
						displayName: 'Prompts',
						values: [
							{
								displayName: 'Icon',
								name: 'icon',
								type: 'icon',
								noDataExpression: true,
								default: { type: 'icon', value: 'comment' },
							},
							{
								displayName: 'Prompt Text',
								name: 'text',
								type: 'string',
								default: '',
								noDataExpression: true,
								required: true,
							},
						],
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
						builderHint: { propertyHint: responseModeBuilderHint },
					},
					autoSaveHighlightedDataProperty,
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
						displayOptions: { show: { '/availableInChat': [false] } },
						builderHint: { propertyHint: responseModeBuilderHint },
					},
					{
						displayName: 'Response Mode',
						name: 'responseMode',
						type: 'options',
						options: [streamingResponseMode, lastNodeResponseMode],
						default: 'streaming',
						description: 'When and how to respond to the webhook',
						displayOptions: { show: { '/availableInChat': [true] } },
						builderHint: { propertyHint: responseModeBuilderHint },
					},
					autoSaveHighlightedDataProperty,
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
						options: [lastNodeResponseMode, respondNodesResponseMode, streamingResponseMode],
						default: 'lastNode',
						description: 'When and how to respond to the chat',
						displayOptions: { show: { '/availableInChat': [false] } },
						builderHint: { propertyHint: responseModeBuilderHint },
					},
					{
						displayName: 'Response Mode',
						name: 'responseMode',
						type: 'options',
						options: [streamingResponseMode, lastNodeResponseMode, respondNodesResponseMode],
						default: 'streaming',
						description: 'When and how to respond to the chat',
						displayOptions: { show: { '/availableInChat': [true] } },
						builderHint: { propertyHint: responseModeBuilderHint },
					},
					autoSaveHighlightedDataProperty,
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
						displayOptions: { show: { '/mode': ['webhook'], '/availableInChat': [false] } },
						builderHint: { propertyHint: responseModeBuilderHint },
					},
					{
						displayName: 'Response Mode',
						name: 'responseMode',
						type: 'options',
						options: [streamingResponseMode, lastNodeResponseMode],
						default: 'streaming',
						description: 'When and how to respond to the chat',
						displayOptions: { show: { '/mode': ['webhook'], '/availableInChat': [true] } },
						builderHint: { propertyHint: responseModeBuilderHint },
					},
					{
						displayName: 'Response Mode',
						name: 'responseMode',
						type: 'options',
						options: [lastNodeResponseMode, streamingResponseMode, respondNodesResponseMode],
						default: 'lastNode',
						description: 'When and how to respond to the chat',
						displayOptions: { show: { '/mode': ['hostedChat'], '/availableInChat': [false] } },
						builderHint: { propertyHint: responseModeBuilderHint },
					},
					{
						displayName: 'Response Mode',
						name: 'responseMode',
						type: 'options',
						options: [streamingResponseMode, lastNodeResponseMode, respondNodesResponseMode],
						default: 'streaming',
						description: 'When and how to respond to the chat',
						displayOptions: { show: { '/mode': ['hostedChat'], '/availableInChat': [true] } },
						builderHint: { propertyHint: responseModeBuilderHint },
					},
					autoSaveHighlightedDataProperty,
				],
			},
		],
	};

	private async handleFormData(context: IWebhookFunctions) {
		const req = context.getRequestObject() as MultiPartFormData.Request;
		a.ok(req.contentType === 'multipart/form-data', 'Expected multipart/form-data');
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

		const isPublic = isPublicChatTriggerDisabled() ? false : ctx.getNodeParameter('public', false);
		assertParamIsBoolean('public', isPublic, ctx.getNode());

		const nodeMode = ctx.getNodeParameter('mode', 'hostedChat');
		assertParamIsString('mode', nodeMode, ctx.getNode());

		const mode = ctx.getMode() === 'manual' ? 'test' : 'production';

		// Only the editor's session-scoped canvas test route may execute a non-public chat
		if (!isPublic && (mode !== 'test' || !ctx.isChatSessionTest())) {
			res.status(404).end();
			return {
				noWebhookResponse: true,
			};
		}

		const availableInChat = ctx.getNodeParameter('availableInChat', false);
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
				[autoSaveHighlightedDataProperty.name]: { type: 'boolean' },
			},
			ctx.getNode(),
		);

		const loadPreviousSession = options.loadPreviousSession;
		assertValidLoadPreviousSessionOption(loadPreviousSession, ctx.getNode());

		const enableStreaming = availableInChat
			? !options.responseMode || options.responseMode === 'streaming'
			: options.responseMode === 'streaming';

		const req = ctx.getRequestObject();
		const webhookName = ctx.getWebhookName();
		const bodyData = ctx.getBodyData() ?? {};

		const authentication = ctx.getNodeParameter('authentication', 'none');
		let authedUser: IUser | undefined;
		// The editor's canvas chat can't supply webhook credentials, so its session-scoped
		// test route (flagged by the backend at registration) is exempt from auth. Every
		// other request — production or sessionless test — enforces the configured auth.
		if (mode === 'test' && ctx.isChatSessionTest()) {
			// Auth is skipped here, but the editor user who started the run is known, so
			// report them under the same conditions production would. This lookup is identity,
			// not authorization: it stays outside the `catch` below, which reads its error as
			// an auth challenge and would answer with an undefined status code.
			if (isChatOAuth2Enabled() && authentication === 'n8nUserAuth') {
				authedUser = await ctx.getTestWebhookUser?.();
			}
		} else {
			try {
				authedUser = await validateAuth(ctx);
			} catch (error) {
				if (error) {
					// Realm is scoped per webhook so browsers don't reuse cached credentials across chats sharing an origin
					const webhookId = ctx.getNode().webhookId;
					const realm = webhookId ? `Webhook ${webhookId}` : 'Webhook';
					res.writeHead((error as IDataObject).responseCode as number, {
						'www-authenticate': `Basic realm="${realm}"`,
					});
					res.end((error as IDataObject).message as string);
					return { noWebhookResponse: true };
				}
				throw error;
			}
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

				// An n8n-controlled shell on the real origin, with the author's chat in a frame
				// that has no origin. The connect experience needs the real origin (OAuth popup,
				// success channel, `localStorage`), so nothing author-shaped may live there.
				let frameIdentity: ChatFrameIdentity | undefined;

				if (isChatOAuth2Enabled() && authentication === 'n8nUserAuth') {
					const resourceUrl = ctx.getWebhookResourceUrl('default');
					if (!resourceUrl) {
						throw new NodeOperationError(ctx.getNode(), 'Default webhook url not set');
					}

					// The shell's token-refresh leg, ahead of any render: it answers with JSON,
					// not a page, and authenticates itself from its own httpOnly cookie rather
					// than from the handshake below. A GET because a POST to this path reaches
					// the `default` webhook — the chat message endpoint — instead.
					if (isChatRefreshRequest(req)) {
						await handleChatTokenRefresh(ctx, resourceUrl);
						return { noWebhookResponse: true };
					}

					if (!isShellInnerRequest(req)) {
						// Outer shell: the AS handshake runs here — a normal top-level document with
						// real cookies, unlike the sandboxed, opaque-origin frame this shell is about
						// to create. It is the only gate: a visitor without an editor session is
						// authenticated by the flow rather than bounced to sign-in ahead of it.
						const outerIdentity = await establishChatSessionIdentity(ctx, resourceUrl);
						if (!outerIdentity) {
							return { noWebhookResponse: true };
						}

						let credentialStatus: CredentialCheckResult | undefined;
						try {
							credentialStatus = await ctx.checkTriggerCredentialStatus();
						} catch {
							// No error object: may carry decrypted credential context.
							ctx.logger.error('Chat trigger credential readiness check failed');
							// `send` ends the response itself.
							res.status(503).send('Chat is unavailable right now. Please try again later.');
							return { noWebhookResponse: true };
						}

						const connect = credentialStatus?.credentials.length
							? buildChatShellViewModel(credentialStatus.credentials, outerIdentity.visitor.email)
							: undefined;

						res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
						// Express defaults to 200 for `render`; stated so the success status is
						// not implicit next to the 503 branch above.
						res.status(200).render('chat-shell', {
							iframeSrc: buildInnerFrameSrc(req),
							sandbox: CHAT_FRAME_SANDBOX,
							refreshUrl: buildChatRefreshUrl(req),
							refreshExpiresIn: Math.max(0, Math.round(outerIdentity.expiresIn)),
							testMode: mode === 'test',
							visitorEmail: outerIdentity.visitor.email,
							hasCredentials: !!connect,
							// Not forced in test mode: the send gate refuses builders too.
							ready: connect ? connect.connectedCount >= connect.total : false,
							barText: connect ? connectBarText(connect, mode === 'test') : '',
							...connect,
						});
						return { noWebhookResponse: true };
					}

					// Inner frame: pick up the AS token the outer shell already obtained, via the
					// one-hop cookie. Never runs the OAuth2 handshake itself — this opaque-origin
					// document can't receive the AS's session-cookie check, so a redirect to
					// sign-in/consent would render editor-ui inside the sandboxed frame.
					const identity = await resolveInnerFrameIdentity(ctx, resourceUrl);
					if (!identity) {
						res.status(401).send('Session expired. Please reload the page.');
						res.end();
						return { noWebhookResponse: true };
					}
					frameIdentity = identity;

					// By header as well as by the iframe's attribute, so the document has no
					// origin even if the attribute is ever stripped.
					res.setHeader('Content-Security-Policy', `sandbox ${CHAT_FRAME_SANDBOX}`);
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
					frameIdentity,
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
		} else {
			let readiness: CredentialCheckResult | undefined;
			try {
				readiness = await ctx.checkTriggerCredentialStatus();
			} catch {
				// No error object: may carry decrypted credential context.
				ctx.logger.error('Chat trigger credential readiness check failed');
				res.status(503).json({ status: 'credential_readiness_check_failed' });
				return { noWebhookResponse: true };
			}

			if (readiness && !readiness.readyToExecute) {
				res.status(428).json(buildCredentialConnectionsRequiredResponse(readiness));
				return { noWebhookResponse: true };
			}
		}

		if (ctx.getNodeParameter('options.autoSaveHighlightedData', true) !== false) {
			if (typeof bodyData.chatInput === 'string') {
				ctx.customData.set(getHighlightedInputKey(ctx.getNode().name), bodyData.chatInput);
			}
			if (typeof bodyData.sessionId === 'string') {
				ctx.customData.set(HIGHLIGHTED_SESSION_KEY, bodyData.sessionId);
			}
		}

		const webhookResponse: IDataObject = { status: 200 };

		// Handle streaming responses
		if (enableStreaming) {
			// Configure socket for long-lived streaming (matches SSE push pattern).
			// Prevents reverse proxies (e.g. Cloudflare) from timing out idle connections.
			req.socket.setTimeout(0);
			req.socket.setNoDelay(true);
			req.socket.setKeepAlive(true);

			// Set up streaming response headers.
			// no-transform prevents the compression middleware from wrapping the
			// response in zlib, ensuring keepalive heartbeats reach the network
			// immediately without being buffered by the compressor.
			res.writeHead(200, {
				'Content-Type': 'application/json; charset=utf-8',
				'Transfer-Encoding': 'chunked',
				'Cache-Control': 'no-cache, no-transform',
				Connection: 'keep-alive',
			});

			// Flush headers immediately
			res.flushHeaders();
		}

		const isMultipart = req.contentType === 'multipart/form-data';
		const item = isMultipart ? await this.handleFormData(ctx) : { json: bodyData };

		// Gated until GA: with the flag off this node behaves exactly as it did before the feature.
		const userOutputEnabled = isChatOAuth2Enabled() && authentication === 'n8nUserAuth';
		// The declared `default` only drives the editor. An absent parameter resolves to this
		// fallback, so it is what decides for a node that never had the key saved.
		const includeUser =
			userOutputEnabled &&
			ctx.getNodeParameter('includeUserInOutput', ctx.getNode().typeVersion >= 1.5) !== false;

		// The single merge point for all three emission paths — see `withAuthenticatedUser`.
		// Spread so the multipart path keeps its `binary` attachments.
		const returnItem: INodeExecutionData = {
			...item,
			json: withAuthenticatedUser(
				item.json,
				includeUser ? authedUser : undefined,
				userOutputEnabled,
			),
		};

		const returnData: INodeExecutionData[] = [returnItem];

		if (enableStreaming) {
			return {
				workflowData: [ctx.helpers.returnJsonArray(returnData)],
				noWebhookResponse: true,
			};
		}

		if (isMultipart) {
			return {
				webhookResponse,
				workflowData: [returnData],
			};
		}

		return {
			webhookResponse,
			workflowData: [ctx.helpers.returnJsonArray(returnData)],
		};
	}
}

import { type AuthConfiguration, CloudAdapter } from '@microsoft/agents-hosting';
import { NodeConnectionTypes } from 'n8n-workflow';
import type {
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';

import { getInputs } from '../../agents/Agent/V2/utils';

import {
	configureAdapterProcessCallback,
	createMicrosoftAgentApplication,
	createAuthConfig,
} from './microsoft-utils';

// TODO : remove after resolved ====================
//Request deduplication cache to prevent processing the same message twice
const processedMessages = new Map<string, number>();
const MESSAGE_CACHE_TTL = 60000; // 1 minute
//===================================================

export class MicrosoftAgent365Trigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft 365 Agent Trigger',
		name: 'microsoftAgent365Trigger',
		icon: 'file:Agent365.svg',
		group: ['trigger'],
		description: 'Trigger for Microsoft 365 Agent API',
		codex: {
			categories: ['Core Nodes'],
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.microsoftAgent365Trigger/',
					},
				],
			},
		},
		version: [1],
		defaults: {
			name: 'Microsoft 365 Agent',
		},
		inputs: `={{
				((hasOutputParser, needsFallback) => {
					${getInputs.toString()};
					return getInputs(false, hasOutputParser, needsFallback);
				})($parameter.hasOutputParser === undefined || $parameter.hasOutputParser === true, $parameter.needsFallback !== undefined && $parameter.needsFallback === true)
			}}`,
		outputs: [NodeConnectionTypes.Main],
		triggerPanel: false,
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
			{
				name: 'default',
				httpMethod: 'HEAD',
				responseMode: 'onReceived',
				path: 'webhook',
				ndvHideUrl: true,
			},
		],
		credentials: [
			{
				name: 'microsoftAgent365Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Welcome Message',
				name: 'welcomeMessage',
				type: 'string',
				placeholder: "e.g. Hello! I'm here to help you!",
				default: '',
			},
			{
				displayName: 'Agent Description',
				name: 'agentDescription',
				type: 'string',
				placeholder:
					'e.g. You are a friendly assistant that helps people find a weather forecast for a given time and place.',
				default: '',
				typeOptions: {
					rows: 4,
				},
			},
			{
				displayName: 'Require Specific Output Format',
				name: 'hasOutputParser',
				type: 'boolean',
				default: false,
				noDataExpression: true,
			},
			{
				displayName: `Connect an <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='${NodeConnectionTypes.AiOutputParser}'>output parser</a> on the canvas to specify the output format you require`,
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						hasOutputParser: [true],
					},
				},
			},
			{
				displayName: 'Enable Fallback Model',
				name: 'needsFallback',
				type: 'boolean',
				default: false,
				noDataExpression: true,
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 2.1 } }],
					},
				},
			},
			{
				displayName:
					'Connect an additional language model on the canvas to use it as a fallback if the main model fails',
				name: 'fallbackNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						needsFallback: [true],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'Max Iterations',
						name: 'maxIterations',
						type: 'number',
						default: 10,
						description: 'The maximum number of iterations the agent will run before stopping',
					},
				],
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const res = this.getResponseObject();

		const method = req.method;
		if (method === 'HEAD') {
			res.end();
			return {
				noWebhookResponse: true,
			};
		}

		// TODO: remove after resolved ====================
		const messageId = req.body?.id;

		// Check if we've already processed this message
		if (messageId && processedMessages.has(messageId)) {
			console.log(`Duplicate message detected: ${messageId}, skipping processing`);
			// Send success response to Microsoft to stop retrying
			res.status(200).end();
			return {
				noWebhookResponse: true,
			};
		}

		// Mark message as being processed
		if (messageId) {
			processedMessages.set(messageId, Date.now());
			// Clean up old entries
			for (const [id, timestamp] of processedMessages.entries()) {
				if (Date.now() - timestamp > MESSAGE_CACHE_TTL) {
					processedMessages.delete(id);
				}
			}
		}
		//===================================================

		const credentials = (await this.getCredentials('microsoftAgent365Api')) as {
			tenantId: string;
			clientId: string;
			clientSecret: string;
		};

		// const envCredentials: Record<string, string | undefined> = {
		// 	connections__serviceConnection__settings__clientId: credentials.clientId,
		// 	connections__serviceConnection__settings__clientSecret: credentials.clientSecret,

		// 	connections__serviceConnection__settings__tenantId: credentials.tenantId,

		// 	connectionsMap__0__connection: 'serviceConnection',
		// 	connectionsMap__0__serviceUrl: '*',

		// 	agentic_type: 'agentic',
		// 	agentic_scopes: 'https://graph.microsoft.com/.default',
		// 	agentic_connectionName: 'serviceConnection',
		// };

		// const authConfig: AuthConfiguration = loadAuthConfigFromCredentials(envCredentials);
		const authConfig: AuthConfiguration = createAuthConfig(credentials);

		const adapter = new CloudAdapter(authConfig);

		const agentApplication = createMicrosoftAgentApplication(this, adapter);

		const trackData = {
			inputText: '',
			activities: [],
		};

		const callback = configureAdapterProcessCallback(this, agentApplication, authConfig, trackData);

		(req as any).user = {
			aud: authConfig.clientId || 'mock-client-id',
			appid: authConfig.clientId || 'mock-client-id',
			azp: authConfig.clientId || 'mock-client-id',
		};

		await adapter.process(req, res, callback);

		return {
			noWebhookResponse: true,
			workflowData: [
				this.helpers.returnJsonArray({
					input: { text: trackData.inputText },
					output: trackData.activities,
				}),
			],
		};
	}
}

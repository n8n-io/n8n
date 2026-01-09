import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type {
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';

import { getInputs } from '../../agents/Agent/V2/utils';

import {
	type ActivityCapture,
	configureAdapterProcessCallback,
	createMicrosoftAgentApplication,
	type MicrosoftAgent365Credentials,
} from './microsoft-utils';

// TODO : remove after resolved ====================================
const processedMessages = new Map<string, number>();
const MESSAGE_CACHE_TTL = 60000;
//==================================================================

export class MicrosoftAgent365Trigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Agent 365 Trigger',
		name: 'microsoftAgent365Trigger',
		icon: 'file:Agent365.svg',
		group: ['trigger'],
		description: 'Trigger for Microsoft Agent 365',
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
			name: 'Microsoft Agent 365',
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
				ndvHideMethod: true,
			},
			{
				name: 'default',
				httpMethod: 'HEAD',
				responseMode: 'onReceived',
				path: 'webhook',
				ndvHideUrl: true,
				ndvHideMethod: true,
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
				displayName:
					'Agent 365 is currently only available for Microsoft customers that have opted into the Copilot Frontier program. <a href="https://adoption.microsoft.com/en-us/copilot/frontier-program/" target="_blank">Learn more</a>.',
				name: 'previewNotice',
				type: 'notice',
				default: '',
			},
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

		// TODO: remove after resolved =================================================
		const messageId = req.body?.id;

		if (messageId && processedMessages.has(messageId)) {
			res.status(200).end();
			return { noWebhookResponse: true };
		}

		if (messageId) {
			processedMessages.set(messageId, Date.now());
			for (const [id, timestamp] of processedMessages.entries()) {
				if (Date.now() - timestamp > MESSAGE_CACHE_TTL) {
					processedMessages.delete(id);
				}
			}
		}
		//================================================================================

		try {
			const credentials = (await this.getCredentials(
				'microsoftAgent365Api',
			)) as MicrosoftAgent365Credentials;

			const agent = createMicrosoftAgentApplication(credentials);

			const activityCapture: ActivityCapture = {
				input: '',
				output: [],
			};

			const callback = configureAdapterProcessCallback(this, agent, credentials, activityCapture);

			(req as any).user = {
				aud: credentials.clientId,
				appid: credentials.clientId,
				azp: credentials.clientId,
			};

			await agent.adapter.process(req, res, callback);

			return {
				noWebhookResponse: true,
				workflowData: [this.helpers.returnJsonArray({ ...activityCapture })],
			};
		} catch (error) {
			const errorData = error.response?.data;
			if (typeof errorData === 'object' && 'error' in errorData) {
				const message = 'Error: ' + String(errorData.error);
				const description = (errorData.error_description as string) ?? error.message;

				throw new NodeOperationError(this.getNode(), message, { description });
			}

			throw new NodeOperationError(this.getNode(), error.message);
		}
	}
}

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
	microsoftMcpServers,
} from './microsoft-utils';

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
					'This is an early preview for building Agents with Microsoft Agent 365 and n8n. You need to be part of the <a href="https://adoption.microsoft.com/copilot/frontier-program/" target="_blank">Frontier preview program</a> to get early access to Microsoft Agent 365. <a href="https://github.com/microsoft/Agent365-Samples/tree/main/nodejs/n8n/sample-agent" target="_blank">Learn more</a>',
				name: 'previewNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'System Prompt',
				name: 'systemPrompt',
				type: 'string',
				placeholder:
					'e.g. You are a friendly assistant that helps people find a weather forecast for a given time and place.',
				default: '',
				typeOptions: {
					rows: 4,
				},
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
				displayName: 'Enable Microsoft MCP Tools',
				name: 'useMcpTools',
				type: 'boolean',
				default: false,
				description:
					'Whether to allow the agent to use Microsoft MCP tools like Calendar, Email, and OneDrive to assist in completing tasks. Requires appropriate permissions in your Microsoft account.',
			},
			{
				displayName: 'Tools to Include',
				name: 'include',
				type: 'options',
				default: 'all',
				displayOptions: {
					show: {
						useMcpTools: [true],
					},
				},
				options: [
					{
						name: 'All',
						value: 'all',
					},
					{
						name: 'Selected',
						value: 'selected',
					},
				],
			},
			{
				displayName: 'Tools to Include',
				name: 'includeTools',
				type: 'multiOptions',
				default: [],
				noDataExpression: true,
				options: microsoftMcpServers,
				displayOptions: {
					show: {
						useMcpTools: [true],
						include: ['selected'],
					},
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
					{
						displayName: 'Welcome Message',
						name: 'welcomeMessage',
						type: 'string',
						placeholder: "e.g. Hello! I'm here to help you!",
						default: '',
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

		try {
			const credentials = (await this.getCredentials(
				'microsoftAgent365Api',
			)) as MicrosoftAgent365Credentials;

			const agent = createMicrosoftAgentApplication(credentials);

			const activityCapture: ActivityCapture = {
				input: '',
				output: [],
				activity: {},
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

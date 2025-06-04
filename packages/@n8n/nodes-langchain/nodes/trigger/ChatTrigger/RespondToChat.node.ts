/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { NodeConnectionTypes, WAIT_INDEFINITELY, Node } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';

import { handleFormData } from './GenericFunctions';

export class RespondToChat extends Node {
	description: INodeTypeDescription = {
		displayName: 'Respond to Chat and Wait for Response',
		name: 'respondToChat',
		icon: 'fa:comments',
		iconColor: 'light-blue',
		group: ['input'],
		version: 1,
		description: 'Respond to Chat and Wait for Response',
		defaults: {
			name: 'Respond to Chat and Wait for Response',
		},
		codex: {
			categories: ['Core Nodes'],
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.chat/',
					},
				],
			},
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'responseNode',
				path: '',
				restartWebhook: true,
				isFullPath: true,
			},
			{
				name: 'default',
				httpMethod: 'GET',
				responseMode: 'responseNode',
				path: '',
				restartWebhook: true,
				isFullPath: true,
			},
		],
		properties: [
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				required: true,
				typeOptions: {
					rows: 6,
				},
			},
		],
	};

	async webhook(ctx: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = ctx.getRequestObject();

		const bodyData = ctx.getBodyData() ?? {};

		let returnData: INodeExecutionData[];
		const webhookResponse: IDataObject = { status: 200 };
		if (req.contentType === 'multipart/form-data') {
			returnData = [await handleFormData(ctx)];
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

	async execute(ctx: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const message = ctx.getNodeParameter('message', 0) as string;

		await ctx.putExecutionToWait(WAIT_INDEFINITELY);
		return [[{ json: {}, sendMessage: message }]];
	}
}

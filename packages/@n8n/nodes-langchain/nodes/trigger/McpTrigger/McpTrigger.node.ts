//import type { Tool } from '@langchain/core/tools';
import type { INodeTypeDescription, IWebhookFunctions, IWebhookResponseData } from 'n8n-workflow';
import { NodeConnectionTypes, Node } from 'n8n-workflow';

import { getConnectedTools } from '@utils/helpers';

import type { CompressionResponse } from './FlushingSSEServerTransport';
import { McpServerSingleton } from './McpServer';
import type { McpServer } from './McpServer';

const MCP_SSE_SETUP_PATH = 'sse';
const MCP_SSE_MESSAGES_PATH = 'messages';

export class McpTrigger extends Node {
	description: INodeTypeDescription = {
		displayName: 'MCP Trigger',
		name: 'mcpTrigger',
		icon: {
			light: 'file:mcp.svg',
			dark: 'file:mcp.dark.svg',
		},
		group: ['trigger'],
		version: 1,
		description: 'Triggers the workflow when Server-Sent Events occur',
		eventTriggerDescription: '',
		activationMessage: 'You can now make calls to your SSE URL to trigger executions.',
		defaults: {
			name: 'MCP Trigger',
		},
		triggerPanel: {
			header: '',
			executionsHelp: {
				inactive:
					"<b>While building your workflow</b>, click the 'listen' button, then trigger an SSE event. This will trigger an execution, which will show up in this editor.<br /> <br /><b>Once you're happy with your workflow</b>, <a data-key='activate'>activate</a> it. Then every time a change is detected, the workflow will execute. These executions will show up in the <a data-key='executions'>executions list</a>, but not in the editor.",
				active:
					"<b>While building your workflow</b>, click the 'listen' button, then trigger an SSE event. This will trigger an execution, which will show up in this editor.<br /> <br /><b>Your workflow will also execute automatically</b>, since it's activated. Every time a change is detected, this node will trigger an execution. These executions will show up in the <a data-key='executions'>executions list</a>, but not in the editor.",
			},
			activationHint:
				"Once you’ve finished building your workflow, <a data-key='activate'>activate</a> it to have it also listen continuously (you just won’t see those executions here).",
		},
		inputs: [NodeConnectionTypes.AiTool],
		outputs: [],
		properties: [],
		webhooks: [
			{
				name: 'setup',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: MCP_SSE_SETUP_PATH,
				ndvHideMethod: true,
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: MCP_SSE_MESSAGES_PATH,
				ndvHideUrl: true,
				startExecutionEarly: true,
			},
		],
	};

	async webhook(context: IWebhookFunctions): Promise<IWebhookResponseData> {
		const webhookName = context.getWebhookName();

		const req = context.getRequestObject();
		const resp = context.getResponseObject() as unknown as CompressionResponse;

		const mcpServer: McpServer = McpServerSingleton.instance(context.logger);

		if (webhookName === 'setup' && mcpServer.server) {
			// Sets up the transport and opens the long-lived connection. This resp
			// will stay streaming, and is the channel that sends the events
			const postUrl = new URL(context.getNodeWebhookUrl('default') ?? '/mcp/messages').pathname;
			await mcpServer.connectTransport(postUrl, resp);

			return { noWebhookResponse: true };
		} else if (webhookName === 'default') {
			// This is the command-channel, and is actually executing the tools. This
			// sends the response back through the long-lived connection setup in the
			// 'setup' call
			const connectedTools = await getConnectedTools(context, true);

			const wasToolCall = await mcpServer.handlePostMessage(req, resp, connectedTools);

			if (wasToolCall) return { noWebhookResponse: true, workflowData: [[{ json: {} }]] };
			return { noWebhookResponse: true };
		}

		return { workflowData: [[{ json: {} }]] };
	}
}

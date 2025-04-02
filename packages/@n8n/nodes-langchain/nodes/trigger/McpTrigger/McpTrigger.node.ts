//import type { Tool } from '@langchain/core/tools';
import type { INodeTypeDescription, IWebhookFunctions, IWebhookResponseData } from 'n8n-workflow';
import { NodeConnectionTypes, Node } from 'n8n-workflow';

import { getConnectedTools } from '@utils/helpers';

import { McpServers } from './McpServer';
import type { McpServerData } from './McpServer';

const MCP_TRIGGER_PATH_IDENTIFIER = 'mcp';

export class McpTrigger extends Node {
	description: INodeTypeDescription = {
		displayName: 'MCP Trigger',
		name: 'mcpTrigger',
		icon: 'fa:cloud-download-alt',
		iconColor: 'dark-blue',
		group: ['trigger'],
		version: 1,
		description: 'Triggers the workflow when Server-Sent Events occur',
		eventTriggerDescription: '',
		activationMessage: 'You can now make calls to your SSE URL to trigger executions.',
		defaults: {
			name: 'setup',
			color: '#225577',
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
				path: MCP_TRIGGER_PATH_IDENTIFIER,
				ndvHideMethod: true,
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: MCP_TRIGGER_PATH_IDENTIFIER + '/messages',
				ndvHideUrl: true,
			},
		],
	};

	async webhook(context: IWebhookFunctions): Promise<IWebhookResponseData> {
		// const { typeVersion: nodeVersion, type: nodeType } = context.getNode();
		const webhookName = context.getWebhookName();

		console.log('webhookName:', webhookName);
		const req = context.getRequestObject();
		const resp = context.getResponseObject();

		// TODO:
		// X Figure out how long to keep the McpServers open
		// - Figure out how to connect the McpServers to the right triggers
		//   `-> how do we want to keep the correct tools etc.? Do we wire that up in `.connect()`? Or do we create separate server per endpoint?
		// - Figure out why vector store doesn't work?
		// - Logging etc.
		// - Figure out what the execution should be? Should there be an execution?
		// - Make it work without some of the ts-ignores etc.

		const serverData: McpServerData = McpServers.instance.serverData;
		console.log(serverData.id);
		if (webhookName === 'setup' && serverData.server) {
			//await serverData.setUpTools(connectedTools);
			const postUrl = new URL(context.getNodeWebhookUrl('default') ?? '/mcp/messages').pathname;
			console.log(`Setting up SSEServerTransport and connecting, with postUrl: ${postUrl}`);
			await serverData.connectTransport(postUrl, resp);
			console.log('done setting up');
			return { noWebhookResponse: true };
		} else if (webhookName === 'default') {
			console.log('MESSAGES');
			console.log(req.rawBody.toString());

			// @ts-expect-error 2345
			const connectedTools = await getConnectedTools(context, true);

			console.log(
				'tools',
				connectedTools.map((tool) => tool.name),
			);

			const wasToolCall = await serverData.handlePostMessage(req, resp, connectedTools);
			console.log('Was this a tool-call?', wasToolCall);
			if (wasToolCall)
				return { noWebhookResponse: true, workflowData: [[{ json: { blub: 789 } }]] };
			return { noWebhookResponse: true };
		}

		const testData = {
			blub: 134,
		};

		return { workflowData: [[{ json: testData }]] };
	}
}

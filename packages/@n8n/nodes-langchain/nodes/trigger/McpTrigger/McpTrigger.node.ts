import type { INodeTypeDescription, IWebhookFunctions, IWebhookResponseData } from 'n8n-workflow';
import { NodeConnectionTypes, Node } from 'n8n-workflow';

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
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
		webhooks: [
			{
				name: 'setup',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: MCP_TRIGGER_PATH_IDENTIFIER,
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: MCP_TRIGGER_PATH_IDENTIFIER + '/messages',
			},
		],
	};

	async webhook(context: IWebhookFunctions): Promise<IWebhookResponseData> {
		// const { typeVersion: nodeVersion, type: nodeType } = context.getNode();
		const webhookName = context.getWebhookName();

		console.log('webhookName:', webhookName);
		const req = context.getRequestObject();
		const resp = context.getResponseObject();

		const serverData: McpServerData = McpServers.instance.serverData;
		console.log(serverData.id);
		if (webhookName === 'setup' && serverData.server) {
			const postUrl = new URL(context.getNodeWebhookUrl('default') ?? '/mcp/messages').pathname;
			console.log(`Setting up SSEServerTransport and connecting, with postUrl: ${postUrl}`);
			await serverData.connectTransport(postUrl, resp);
			// Make sure we flush the compression middleware, so that it's not waiting for more content to be added to the buffer
			// @ts-expect-error 2339
			if (resp.flush) {
				// @ts-expect-error 2339
				resp.flush();
			}
			console.log('done setting up');
			return { noWebhookResponse: true };
		} else if (webhookName === 'default') {
			console.log('MESSAGES');
			console.log(req.rawBody.toString());

			if (serverData.transport) {
				await serverData.transport.handlePostMessage(req, resp, req.rawBody.toString());
				// Now it should do more stuff, but it's not... WTF is going on? :-)
				return { noWebhookResponse: true };
			}
		}

		const testData = {
			blub: 134,
		};

		return { workflowData: [[{ json: testData }]] };
	}
}

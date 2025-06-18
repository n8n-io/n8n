import { WebhookAuthorizationError } from 'n8n-nodes-base/dist/nodes/Webhook/error';
import { validateWebhookAuthentication } from 'n8n-nodes-base/dist/nodes/Webhook/utils';
import type { INodeTypeDescription, IWebhookFunctions, IWebhookResponseData } from 'n8n-workflow';
import { NodeConnectionTypes, Node } from 'n8n-workflow';

const MCP_SSE_MESSAGES_PATH = 'messages';

export class A2aServerTrigger extends Node {
	description: INodeTypeDescription = {
		displayName: 'Agent-to-agent Server Trigger',
		name: 'a2aServerTrigger',
		icon: {
			light: 'file:../mcp.svg',
			dark: 'file:../mcp.dark.svg',
		},
		group: ['trigger'],
		version: [1],
		description: 'Expose n8n workflow as A2A Server endpoint',
		activationMessage:
			'You can now connect your A2A Clients to the URL, using SSE or Streamable HTTP transports.',
		defaults: {
			name: 'A2A Server Trigger',
		},
		codex: {
			categories: ['AI', 'Core Nodes'],
			subcategories: {
				AI: ['Root Nodes', 'Model Context Protocol'],
				'Core Nodes': ['Other Trigger Nodes'],
			},
			alias: ['Agent-to-agent'],
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.mcptrigger/',
					},
				],
			},
		},
		triggerPanel: {
			header: 'Listen for A2A events',
			executionsHelp: {
				inactive:
					"This trigger has two modes: test and production.<br /><br /><b>Use test mode while you build your workflow</b>. Click the 'execute step' button, then make an MCP request to the test URL. The executions will show up in the editor.<br /><br /><b>Use production mode to run your workflow automatically</b>. <a data-key='activate'>Activate</a> the workflow, then make requests to the production URL. These executions will show up in the <a data-key='executions'>executions list</a>, but not the editor.",
				active:
					"This trigger has two modes: test and production.<br /><br /><b>Use test mode while you build your workflow</b>. Click the 'execute step' button, then make an MCP request to the test URL. The executions will show up in the editor.<br /><br /><b>Use production mode to run your workflow automatically</b>. Since your workflow is activated, you can make requests to the production URL. These executions will show up in the <a data-key='executions'>executions list</a>, but not the editor.",
			},
			activationHint:
				'Once you’ve finished building your workflow, run it without having to click this button by using the production URL.',
		},
		inputs: [],
		outputs: [
			{
				type: 'main',
				displayName: 'A2A',
			},
		],
		credentials: [],
		properties: [
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: '',
				placeholder: 'webhook',
				required: true,
				description: 'The base path for this MCP server',
			},
		],
		webhooks: [
			{
				name: 'setup',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				isFullPath: true,
				path: '={{$parameter["path"]}}/.well-known/agent.json',
				nodeType: 'mcp',
				ndvHideMethod: true,
				ndvHideUrl: false,
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'lastNode',
				isFullPath: true,
				path: '={{$parameter["path"]}}',
				nodeType: 'mcp',
				ndvHideMethod: true,
				ndvHideUrl: false,
			},
		],
	};

	async webhook(context: IWebhookFunctions): Promise<IWebhookResponseData> {
		const webhookName = context.getWebhookName();
		const req = context.getRequestObject();
		const resp = context.getResponseObject() as unknown as CompressionResponse;

		/*
		try {
			await validateWebhookAuthentication(context, 'authentication');
		} catch (error) {
			if (error instanceof WebhookAuthorizationError) {
				resp.writeHead(error.responseCode);
				resp.end(error.message);
				return { noWebhookResponse: true };
			}
			throw error;
		}
		*/

		if (webhookName === 'setup') {
			const path = req.path.replace(/\/.well-known\/agent.json/, '');
			const ret = {
				webhookResponse: {
					name: 'N8N A2A Agent',
					description: 'Agent powered by N8N workflows',
					url: `http://127.0.0.1:5678${path}`,
					version: '1.0.0',
					capabilities: {
						streaming: false, // N8N doesn't handle streaming easily
						pushNotifications: false,
						stateTransitionHistory: true,
					},
					defaultInputModes: ['text/plain'],
					defaultOutputModes: ['text/plain'],
					skills: [
						{
							id: 'general_chat',
							name: 'General Chat',
							description: 'General purpose AI assistant',
							tags: ['chat', 'assistant'],
							examples: ['Help me with...', 'What is...'],
							inputModes: ['text/plain'],
							outputModes: ['text/plain'],
						},
					],
				},
			};
			console.log(ret);
			return ret;
		}

		const node = context.getNode();
		const body = req.body;
		console.log(JSON.stringify(body));

		const message = body.params?.message;
		const taskId = body.params?.task?.id || body.params?.message?.taskId || Date.now().toString();
		const contextId = message.contextId || Date.now().toString();

		const workflowJson = {
			originalRequest: body,
			taskId,
			contextId,
			userMessage: message.parts[0]?.text || '',
			messageId: message.messageId,
			requestId: body.id,
		};

		return { workflowData: [[{ json: workflowJson }]] };
	}
}

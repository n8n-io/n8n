import { ensureError } from '@n8n/utils/errors/ensure-error';
import { WebhookAuthorizationError } from 'n8n-nodes-base/dist/nodes/Webhook/error';
import { validateWebhookAuthentication } from 'n8n-nodes-base/dist/nodes/Webhook/utils';
import type {
	EngineRequest,
	EngineResponse,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes, Node, nodeNameToToolName, n8nOAuth2Auth } from 'n8n-workflow';

import { getConnectedTools } from '@utils/helpers';

import { McpServer, MCP_LIST_TOOLS_REQUEST_MARKER } from './McpServer';
import { MessageParser } from './protocol/MessageParser';
import type { CompressionResponse } from './transport';

const MCP_SSE_SETUP_PATH = 'sse';
const MCP_SSE_MESSAGES_PATH = 'messages';

interface ToolCall {
	toolName: string;
	arguments: IDataObject;
	sessionId: string;
	messageId: string;
}

/**
 * The trigger's output for one request, and so what expressions in the tools it
 * dispatches resolve against. The body is spread in first because `$json` in a
 * connected tool used to be the raw JSON-RPC message, and our own keys last so a
 * crafted body cannot shadow them.
 */
function requestContext(context: IWebhookFunctions, mcpData: IDataObject = {}): IDataObject {
	return {
		...context.getBodyData(),
		...mcpData,
		// Expose caller identity headers, matching the Webhook node
		headers: context.getHeaderData(),
	};
}

/** Reads back the tool call this node put into its own output during `webhook`. */
function readToolCall(json: IDataObject | undefined): ToolCall | undefined {
	const toolCall = json?.mcpToolCall;
	if (!isToolCallInfo(toolCall) || typeof json?.mcpSessionId !== 'string') return undefined;

	return {
		toolName: toolCall.toolName,
		arguments: toolCall.arguments,
		sessionId: json.mcpSessionId,
		messageId: typeof json.mcpMessageId === 'string' ? json.mcpMessageId : '',
	};
}

function isToolCallInfo(value: unknown): value is { toolName: string; arguments: IDataObject } {
	if (typeof value !== 'object' || value === null) return false;
	const { toolName, arguments: args } = value as Record<string, unknown>;
	return typeof toolName === 'string' && typeof args === 'object' && args !== null;
}

/** The tool node's run, as the result to answer the MCP client with. */
function toolResult(actionResponse: EngineResponse['actionResponses'][number] | undefined) {
	const taskData = actionResponse?.data;
	if (!taskData) return { error: { message: 'The tool did not run', name: 'ToolCallError' } };
	if (taskData.error) {
		return { error: { message: taskData.error.message, name: taskData.error.name } };
	}

	const items = taskData.data?.[NodeConnectionTypes.AiTool]?.[0] ?? [];

	// A tool node wraps its own result in `response`; unwrap it so the client sees the
	// result itself, as it did when the tool was invoked directly
	const [{ json } = { json: {} }] = items;
	if (items.length === 1 && Object.keys(json).length === 1 && 'response' in json) {
		return json.response;
	}

	// Anything else keeps the shape a tool's output has always had: its items' json
	return items.map((item) => item.json);
}

/**
 * Answers the tool call. The request is parked on the instance holding the MCP session,
 * so when the execution runs elsewhere the response channel relays the result there.
 */
function answerToolCall(context: IExecuteFunctions, call: ToolCall, result: unknown) {
	const delivered = McpServer.current()?.deliverToolResult(call.sessionId, call.messageId, result);
	// The relay forwards the result as-is; the channel is only typed for data objects
	if (!delivered) context.sendResponse(result as IDataObject);
}

export class McpTrigger extends Node {
	description: INodeTypeDescription = {
		displayName: 'MCP Server Trigger',
		name: 'mcpTrigger',
		icon: {
			light: 'file:../mcp.svg',
			dark: 'file:../mcp.dark.svg',
		},
		group: ['trigger'],
		version: [1, 1.1, 2],
		description: 'Expose n8n tools as an MCP Server endpoint',
		activationMessage:
			'You can now connect your MCP Clients to the URL, using SSE or Streamable HTTP transports.',
		defaults: {
			name: 'MCP Server Trigger',
		},
		codex: {
			categories: ['AI', 'Core Nodes'],
			subcategories: {
				AI: ['Root Nodes', 'Model Context Protocol'],
				'Core Nodes': ['Other Trigger Nodes'],
			},
			alias: ['Model Context Protocol', 'MCP Server'],
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.mcptrigger/',
					},
				],
			},
		},
		triggerPanel: {
			header: 'Listen for MCP events',
			executionsHelp: {
				inactive:
					"This trigger has two modes: test and production.<br /><br /><b>Use test mode while you build your workflow</b>. Click the 'execute step' button, then make an MCP request to the test URL. The executions will show up in the editor.<br /><br /><b>Use production mode to run your workflow automatically</b>. Publish the workflow, then make requests to the production URL. These executions will show up in the <a data-key='executions'>executions list</a>, but not the editor.",
				active:
					"This trigger has two modes: test and production.<br /><br /><b>Use test mode while you build your workflow</b>. Click the 'execute step' button, then make an MCP request to the test URL. The executions will show up in the editor.<br /><br /><b>Use production mode to run your workflow automatically</b>. Since your workflow is activated, you can make requests to the production URL. These executions will show up in the <a data-key='executions'>executions list</a>, but not the editor.",
			},
			activationHint:
				"Once you've finished building your workflow, run it without having to click this button by using the production URL.",
		},
		inputs: [
			{
				type: NodeConnectionTypes.AiTool,
				displayName: 'Tools',
			},
		],
		outputs: [],
		sensitiveOutputFields: ['headers.authorization', 'headers.cookie'],
		credentials: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-class-description-credentials-name-unsuffixed
				name: 'httpBearerAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: ['bearerAuth'],
					},
				},
			},
			{
				name: 'httpHeaderAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: ['headerAuth'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{ name: 'None', value: 'none' },
					{
						// n8n is a brand name and should be lowercase
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'n8n User Auth (OAuth2)',
						value: 'n8nOAuth2',
						description: 'Require user to give consent to use their n8n account',
						displayOptions: { show: { '@version': [{ _cnd: { gte: 2 } }] } },
					},
					{ name: 'Bearer Auth', value: 'bearerAuth' },
					{ name: 'Header Auth', value: 'headerAuth' },
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
				default: true,
				displayOptions: { show: { authentication: ['n8nOAuth2'] } }, // n8nOAuth2 is v2+ only
				description:
					'Whether the triggering user must also have permission to execute the workflow in the project it belongs to',
			},
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
				path: `={{$parameter["path"]}}{{parseFloat($nodeVersion)<2 ? '/${MCP_SSE_SETUP_PATH}' : ''}}`,
				nodeType: 'mcp',
				ndvHideMethod: true,
				ndvHideUrl: false,
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				isFullPath: true,
				path: `={{$parameter["path"]}}{{parseFloat($nodeVersion)<2 ? '/${MCP_SSE_MESSAGES_PATH}' : ''}}`,
				nodeType: 'mcp',
				ndvHideMethod: true,
				ndvHideUrl: true,
			},
			{
				name: 'default',
				httpMethod: 'DELETE',
				responseMode: 'onReceived',
				isFullPath: true,
				path: '={{$parameter["path"]}}',
				nodeType: 'mcp',
				ndvHideMethod: true,
				ndvHideUrl: true,
			},
		],
	};

	async webhook(context: IWebhookFunctions): Promise<IWebhookResponseData> {
		const webhookName = context.getWebhookName();
		const req = context.getRequestObject();
		const resp = context.getResponseObject() as unknown as CompressionResponse;

		if (context.getNodeParameter('authentication') === 'n8nOAuth2') {
			if (context.getNode().typeVersion < 2) {
				resp.writeHead(401);
				resp.end('OAuth2 authentication requires mcp trigger node v2.0 or higher');
				return { noWebhookResponse: true };
			}
			const authResult = await n8nOAuth2Auth(context, { realm: 'n8n MCP Server' });
			if (authResult === 'handled') {
				return { noWebhookResponse: true };
			}
			await context.establishTriggerIdentity(authResult.token, authResult.resource);
		} else {
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
		}

		const node = context.getNode();
		const serverName = node.typeVersion > 1 ? nodeNameToToolName(node) : 'n8n-mcp-server';
		const mcpServer = McpServer.instance(context.logger);

		if (webhookName === 'setup') {
			const postUrl =
				node.typeVersion < 2
					? req.path.replace(new RegExp(`/${MCP_SSE_SETUP_PATH}$`), `/${MCP_SSE_MESSAGES_PATH}`)
					: req.path;

			const connectedTools = await getConnectedTools(context, true);
			await mcpServer.handleSetupRequest(req, resp, serverName, postUrl, connectedTools);

			return { noWebhookResponse: true };
		} else if (webhookName === 'default') {
			if (req.method === 'DELETE') {
				await mcpServer.handleDeleteRequest(req, resp);
			} else {
				const sessionId = mcpServer.getSessionId(req);

				context.logger.debug('MCP POST request received for existing session');

				if (sessionId) {
					const message = MessageParser.parse(req.rawBody.toString());
					const messageId = MessageParser.getRequestId(message);
					const toolCall = MessageParser.parseToolCall(message);
					const toolCallInfo = toolCall && MessageParser.toolCallInfo(toolCall);

					// The tool call itself is dispatched from `execute`, so the metadata it
					// needs is part of this node's output. Always written for a tool call,
					// so the request body can never supply these keys itself.
					const mcpData: IDataObject = {};
					if (toolCall) {
						mcpData.mcpToolCall = toolCallInfo ?? {
							toolName: toolCall.params.name,
							arguments: {},
						};
						mcpData.mcpSessionId = sessionId;
						mcpData.mcpMessageId = messageId ?? '';
					}

					// Check the triggering user's private-credential status before
					// executing. Returns undefined (no gate) unless an OAuth2 identity
					// was established and the dynamic-credentials module is enabled.
					const gateResult = toolCall ? await context.checkTriggerCredentialStatus() : undefined;

					const { wasToolCall, relaySessionId, needsListToolsRelay } =
						await mcpServer.handlePostMessage(
							req,
							resp,
							async () => await getConnectedTools(context, true),
							serverName,
							gateResult,
						);

					if (wasToolCall) {
						return {
							noWebhookResponse: true,
							workflowData: [[{ json: requestContext(context, mcpData) }]],
						};
					}

					if (needsListToolsRelay && relaySessionId && messageId) {
						const workflowData = {
							mcpListToolsRelay: {
								sessionId: relaySessionId,
								messageId,
								marker: MCP_LIST_TOOLS_REQUEST_MARKER,
							},
						};
						return {
							noWebhookResponse: true,
							workflowData: [[{ json: workflowData }]],
						};
					}
				} else {
					const connectedTools = await getConnectedTools(context, true);
					await mcpServer.handleStreamableHttpSetup(req, resp, serverName, connectedTools);
				}
			}

			return { noWebhookResponse: true };
		}

		return { workflowData: [[{ json: {} }]] };
	}

	/**
	 * Runs the tool an incoming call asked for and answers the client with its result.
	 * Dispatching it through the engine instead of invoking it inside `webhook` is what
	 * lets the tool's expressions resolve against this node's output, and records the
	 * tool as a node run.
	 */
	async execute(
		context: IExecuteFunctions,
		response?: EngineResponse,
	): Promise<INodeExecutionData[][] | EngineRequest> {
		const inputData = context.getInputData();
		const call = readToolCall(inputData[0]?.json);
		if (!call) return [inputData];

		try {
			// The engine passes an empty response on the first call, and the tool's run on
			// the one that resumes this node
			const [actionResponse] = response?.actionResponses ?? [];
			if (actionResponse) {
				answerToolCall(context, call, toolResult(actionResponse));
				return [inputData];
			}

			const tools = await getConnectedTools(context, true);
			const tool = tools.find((t) => t.name === call.toolName);
			const sourceNodeName = tool?.metadata?.sourceNodeName;

			if (typeof sourceNodeName !== 'string') {
				const message = tool
					? `Tool "${call.toolName}" cannot be run: it does not report the node providing it`
					: `Tool "${call.toolName}" not found`;
				answerToolCall(context, call, { error: { message, name: 'ToolCallError' } });
				return [inputData];
			}

			return {
				actions: [
					{
						actionType: 'ExecutionNodeAction',
						nodeName: sourceNodeName,
						input: tool?.metadata?.isFromToolkit
							? { ...call.arguments, tool: call.toolName }
							: call.arguments,
						type: NodeConnectionTypes.AiTool,
						id: call.messageId || call.toolName,
						metadata: {},
					},
				],
				metadata: {},
			};
		} catch (error) {
			// The client is waiting on this call, so answer before failing the execution
			const { message, name } = ensureError(error);
			answerToolCall(context, call, { error: { message, name } });
			throw error;
		}
	}
}

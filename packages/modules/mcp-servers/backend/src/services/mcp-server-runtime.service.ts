import { EventService } from '@n8n/backend-services';
import { isRecord } from '@n8n/utils/is-record';
import { lazyImport } from '@n8n/utils/lazy-import';
import { Service } from '@n8n/di';
import {
	extractBearer,
	inboundFrom,
	inboundRequestOf,
	ResourceAdmission,
	type AdmissionResult,
	type Inbound,
} from '@n8n/inbound-auth';
import type { SecurityContext } from '@n8n/permissions';

import type { McpServerTool } from '../database/entities/mcp-server-tool.entity';
import { McpServerToolRepository } from '../database/repositories/mcp-server-tool.repository';
import type { McpServer } from '../database/entities/mcp-server.entity';
import { OAuthClientNamePort } from '../tools/oauth-client-name-port';
import {
	WorkflowToolPort,
	type WorkflowToolInputSchema,
	type WorkflowToolRefusal,
	type WorkflowToolRunResult,
} from '../tools/workflow-tool-port';
import { McpServerProtectedResource } from './mcp-server-protected-resource';
import { McpServerRunCap } from './run-cap';

// The type imports and `lazyImport` both resolve the CommonJS declarations of the SDK, so the
// controller can pass the `Server` of `createServer` to the SDK handler.
type CallToolRequest = import('@modelcontextprotocol/server').CallToolRequest;
type CallToolResult = import('@modelcontextprotocol/server').CallToolResult;
type ListToolsResult = import('@modelcontextprotocol/server').ListToolsResult;
type JSONObject = import('@modelcontextprotocol/server').JSONObject;
type JSONValue = import('@modelcontextprotocol/server').JSONValue;
type ToolInputSchema = ListToolsResult['tools'][number]['inputSchema'];

/**
 * How long a tool call waits for its run. The MCP SDK clients time out a request after 60
 * seconds by default, so the call answers before that. The run goes on after the wait.
 */
const RUN_WAIT_MS = 50_000;

/** An input schema that accepts any object, for a tool that cannot run. */
const ANY_INPUT: WorkflowToolInputSchema = { type: 'object', additionalProperties: true };

export const SERVER_BUSY_MESSAGE = 'The server is busy. Try again in a moment.';

/** The only node whose error text is written for the users of a workflow, as in Apps. */
const STOP_AND_ERROR_NODE_TYPE = 'n8n-nodes-base.stopAndError';
const GENERIC_FAILURE_MESSAGE =
	'The workflow of this tool failed. A builder of the server can see the details in its executions.';

const REFUSAL_MESSAGES: Record<WorkflowToolRefusal, string> = {
	not_found: 'The workflow of this tool no longer exists. Ask a builder of the server to fix it.',
	not_published: 'The workflow of this tool is not published. Publish it to use this tool.',
	no_supported_trigger:
		'The workflow of this tool has no trigger "When Executed by Another Workflow". Add the trigger to use this tool.',
	incompatible_nodes:
		'The workflow of this tool has a node that cannot run as a tool. Remove the node to use this tool.',
	not_callable:
		'The workflow of this tool does not allow calls from other workflows of its project. Change its settings to use this tool.',
};

const RUN_STATUS_MESSAGES = {
	running: 'The workflow is still running. Its result is not available to this call.',
	waiting: 'The workflow waits for input. Its result is not available to this call.',
	canceled: 'The workflow run was canceled.',
	unknown: 'The workflow run ended without a result.',
} as const;

export type McpServerCaller = { userId: string; clientId?: string };

type CallOutcome = { result: CallToolResult; status: 'success' | 'error' };

function isJsonValue(value: unknown): value is JSONValue {
	if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return true;
	if (Array.isArray(value)) return value.every(isJsonValue);
	return isRecord(value) && Object.values(value).every(isJsonValue);
}

function isJsonObject(value: unknown): value is JSONObject {
	return isRecord(value) && isJsonValue(value);
}

/** The port types the schema loosely. The SDK wants JSON values, which the port always gives. */
function toToolInputSchema(schema: WorkflowToolInputSchema): ToolInputSchema {
	const { properties, ...rest } = schema;
	return { ...rest, ...(isJsonObject(properties) && { properties }) };
}

function errorResult(text: string): CallToolResult {
	return { isError: true, content: [{ type: 'text', text }] };
}

/** One request to the runtime endpoint of a server. n8n keeps no session between requests. */
@Service()
export class McpServerRuntimeService {
	constructor(
		private readonly resources: McpServerProtectedResource,
		private readonly admission: ResourceAdmission,
		private readonly tools: McpServerToolRepository,
		private readonly workflows: WorkflowToolPort,
		private readonly clients: OAuthClientNamePort,
		private readonly runCap: McpServerRunCap,
		private readonly events: EventService,
	) {}

	/** Checks the token and the connect scope of the person, for this server only. */
	async admit(
		server: McpServer,
		req: {
			method: string;
			originalUrl: string;
			headers: Inbound['request']['headers'];
			ip?: string;
		},
	): Promise<AdmissionResult> {
		const resource = this.resources.forServer(server);
		const inbound = inboundFrom(resource, {
			...inboundRequestOf(req),
			url: resource.getResourceUrl(),
		});
		const extracted = extractBearer(inbound);
		if (!extracted.ok) return this.admission.refuse(inbound, extracted.reason);
		return await this.admission.admit(resource, extracted.value);
	}

	async challenge(refused: Extract<AdmissionResult, { ok: false }>): Promise<string> {
		return await this.admission.challenge(refused);
	}

	callerOf(context: SecurityContext): McpServerCaller {
		return { userId: context.subject.id, clientId: context.clientId };
	}

	/** A new MCP server object for one request, as the instance MCP does. */
	async createServer(server: McpServer, caller: McpServerCaller) {
		const { Server, ProtocolError, ProtocolErrorCode } = await lazyImport<
			typeof import('@modelcontextprotocol/server')
		>(async () => await import('@modelcontextprotocol/server'));
		const mcp = new Server(
			{ name: server.name, version: '1.0.0' },
			{
				capabilities: { tools: { listChanged: false } },
				...(server.description && { instructions: server.description }),
			},
		);

		mcp.setRequestHandler('tools/list', async () => await this.listTools(server));
		mcp.setRequestHandler('tools/call', async (request) => {
			const tool = await this.tools.findByName(server.id, request.params.name);
			if (!tool) {
				throw new ProtocolError(
					ProtocolErrorCode.InvalidParams,
					`Unknown tool: ${request.params.name}`,
				);
			}
			const outcome = await this.callTool(server, tool, request, caller);
			if ('invalidInput' in outcome) {
				throw new ProtocolError(ProtocolErrorCode.InvalidParams, outcome.invalidInput);
			}
			return outcome.result;
		});
		return mcp;
	}

	/** A broken tool stays in the list with its name, so the client sees it and gets the reason on a call. */
	private async listTools(server: McpServer): Promise<ListToolsResult> {
		const tools = await this.tools.listByServer(server.id);
		return {
			tools: await Promise.all(
				tools.map(async (tool) => ({
					name: tool.toolName,
					...(tool.description && { description: tool.description }),
					inputSchema: await this.inputSchema(server, tool),
				})),
			),
		};
	}

	private async inputSchema(server: McpServer, tool: McpServerTool): Promise<ToolInputSchema> {
		if (tool.kind !== 'workflow' || !tool.targetId) return toToolInputSchema(ANY_INPUT);
		const described = await this.workflows.describe(server.projectId, tool.targetId);
		return toToolInputSchema(described.callable ? described.inputSchema : ANY_INPUT);
	}

	private async callTool(
		server: McpServer,
		tool: McpServerTool,
		request: CallToolRequest,
		caller: McpServerCaller,
	): Promise<CallOutcome | { invalidInput: string }> {
		const startedAt = Date.now();
		let outcome: CallOutcome | { invalidInput: string };
		try {
			outcome = await this.runTool(server, tool, request.params.arguments ?? {});
		} catch (error) {
			await this.trackCall(server, tool, caller, 'error', Date.now() - startedAt);
			throw error;
		}
		const status = 'invalidInput' in outcome ? 'error' : outcome.status;
		await this.trackCall(server, tool, caller, status, Date.now() - startedAt);
		return outcome;
	}

	private async runTool(
		server: McpServer,
		tool: McpServerTool,
		input: unknown,
	): Promise<CallOutcome | { invalidInput: string }> {
		if (tool.kind !== 'workflow' || !tool.targetId) {
			return { status: 'error', result: errorResult(REFUSAL_MESSAGES.not_found) };
		}

		const release = this.runCap.tryAcquire(server.id);
		if (!release) return { status: 'error', result: errorResult(SERVER_BUSY_MESSAGE) };

		let run: WorkflowToolRunResult;
		try {
			run = await this.workflows.run(server.projectId, tool.targetId, input, {
				waitMs: RUN_WAIT_MS,
			});
		} catch (error) {
			release();
			throw error;
		}

		// A started run holds its slot until the execution finishes, also after the wait.
		if ('finished' in run) run.finished.then(release, release);
		else release();

		switch (run.status) {
			case 'refused':
				return { status: 'error', result: errorResult(REFUSAL_MESSAGES[run.reason]) };
			case 'invalid_input':
				return { invalidInput: run.message };
			case 'busy':
				return { status: 'error', result: errorResult(SERVER_BUSY_MESSAGE) };
			case 'success':
				return {
					status: 'success',
					result: { content: [{ type: 'text', text: JSON.stringify(run.output) }] },
				};
			case 'error':
				// Other error texts can name hosts and tables of a private workflow.
				return {
					status: 'error',
					result: errorResult(
						run.error.nodeType === STOP_AND_ERROR_NODE_TYPE
							? run.error.message
							: GENERIC_FAILURE_MESSAGE,
					),
				};
			default:
				return { status: 'error', result: errorResult(RUN_STATUS_MESSAGES[run.status]) };
		}
	}

	private async trackCall(
		server: McpServer,
		tool: McpServerTool,
		caller: McpServerCaller,
		status: 'success' | 'error',
		durationMs: number,
	): Promise<void> {
		// The client name only labels the event. A failed lookup must not fail the call.
		const clientName = caller.clientId
			? await this.clients.getName(caller.clientId).catch(() => undefined)
			: undefined;
		this.events.emit('mcp-server-tool-called', {
			serverId: server.id,
			userId: caller.userId,
			clientName: clientName ?? 'unknown',
			toolKind: tool.kind,
			status,
			durationMs,
		});
	}
}

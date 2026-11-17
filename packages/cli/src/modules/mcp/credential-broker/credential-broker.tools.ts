import type { McpCredentialUseMode } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import type { IDataObject, INodeParameters } from 'n8n-workflow';
import z from 'zod';

import { MAX_EXECUTE_NODE_TIMEOUT_MS } from '@/node-execution';

import type { RegisterToolFn, ToolDefinition } from '../mcp.types';
import type { BrokerAccess, McpCredentialBrokerService } from './mcp-credential-broker.service';

export const LIST_CONNECTIONS_TOOL_NAME = 'list_connections';
export const RUN_NODE_READ_TOOL_NAME = 'run_node_read';
export const RUN_NODE_WRITE_TOOL_NAME = 'run_node_write';
export const LIST_MCP_SERVER_TOOLS_TOOL_NAME = 'list_mcp_server_tools';
export const CALL_MCP_SERVER_TOOL_READ_TOOL_NAME = 'call_mcp_server_tool_read';
export const CALL_MCP_SERVER_TOOL_WRITE_TOOL_NAME = 'call_mcp_server_tool_write';

/** Tools that only discover what a caller can use. */
export const CREDENTIAL_BROKER_DISCOVERY_TOOLS = [
	LIST_CONNECTIONS_TOOL_NAME,
	LIST_MCP_SERVER_TOOLS_TOOL_NAME,
] as const;

/** Tools that act on a service with a stored credential. */
export const CREDENTIAL_BROKER_USE_TOOLS = [
	RUN_NODE_READ_TOOL_NAME,
	RUN_NODE_WRITE_TOOL_NAME,
	CALL_MCP_SERVER_TOOL_READ_TOOL_NAME,
	CALL_MCP_SERVER_TOOL_WRITE_TOOL_NAME,
] as const;

const MAX_OUTPUT_CHARS = 100_000;

const SECRET_NOTE = 'n8n makes the call with the stored credential. The secret is never returned.';

function ok(payload: Record<string, unknown>) {
	let text = JSON.stringify(payload);
	if (text.length > MAX_OUTPUT_CHARS) {
		text = JSON.stringify({
			truncated: true,
			note: `The result was longer than ${MAX_OUTPUT_CHARS} characters. Narrow the request, for example with a limit or a filter.`,
			preview: text.slice(0, MAX_OUTPUT_CHARS),
		});
		return { content: [{ type: 'text' as const, text }] };
	}
	return { content: [{ type: 'text' as const, text }], structuredContent: payload };
}

function fail(error: unknown) {
	const payload = { error: getErrorMessage(error) };
	return {
		content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
		structuredContent: payload,
		isError: true,
	};
}

const listConnectionsSchema = {} satisfies z.ZodRawShape;

const createListConnectionsTool = (
	user: User,
	broker: McpCredentialBrokerService,
	mode: McpCredentialUseMode,
): ToolDefinition<typeof listConnectionsSchema> => ({
	name: LIST_CONNECTIONS_TOOL_NAME,
	config: {
		description:
			'List the service connections that the user made available to MCP clients. Each connection is a stored credential. ' +
			'A connection lists the n8n nodes that can run with it (use run_node_read or run_node_write), ' +
			'or the MCP server that it connects to (use list_mcp_server_tools, then call_mcp_server_tool_read or call_mcp_server_tool_write). ' +
			'Use get_node_types to learn the parameters of a node before you run it. ' +
			SECRET_NOTE,
		inputSchema: listConnectionsSchema,
		annotations: {
			title: 'List Connections',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async () => {
		try {
			const connections = await broker.listConnections(user);
			return ok({
				access: mode === 'readWrite' ? 'read and write' : 'read only',
				count: connections.length,
				connections,
				...(connections.length === 0
					? {
							hint: 'No credential is available in MCP. The user can turn on "Available in MCP" on a credential in n8n.',
						}
					: {}),
			});
		} catch (error) {
			return fail(error);
		}
	},
});

const runNodeSchema = {
	credentialId: z.string().describe('ID of a connection from list_connections'),
	nodeType: z
		.string()
		.describe('Node type from the connection\'s "nodes" list, e.g. "n8n-nodes-base.slack"'),
	nodeVersion: z
		.number()
		.optional()
		.describe('Node version. Defaults to the version given by list_connections.'),
	parameters: z
		.record(z.unknown())
		.describe(
			'Node parameters, the same shape as in a workflow, e.g. { "resource": "channel", "operation": "getAll" }. ' +
				'Literal values only: expressions ("={{ ... }}") are rejected.',
		),
	input: z
		.array(z.object({ json: z.record(z.unknown()) }))
		.optional()
		.describe('Input items for the node. Defaults to one empty item.'),
	timeoutMs: z.number().int().positive().max(MAX_EXECUTE_NODE_TIMEOUT_MS).optional(),
} satisfies z.ZodRawShape;

const createRunNodeTool = (
	user: User,
	broker: McpCredentialBrokerService,
	access: BrokerAccess,
): ToolDefinition<typeof runNodeSchema> => ({
	name: access === 'read' ? RUN_NODE_READ_TOOL_NAME : RUN_NODE_WRITE_TOOL_NAME,
	config: {
		description:
			(access === 'read'
				? "Run one n8n node operation that only reads data from a service, with one of the user's connections. Operations that are not known to be read-only are refused. "
				: "Run one n8n node operation that can create, change or delete data in a service, with one of the user's connections. Prefer run_node_read for operations that only read. ") +
			'Only nodes listed for the connection by list_connections can run. ' +
			SECRET_NOTE,
		inputSchema: runNodeSchema,
		annotations: {
			title: access === 'read' ? 'Run Node (Read)' : 'Run Node (Write)',
			readOnlyHint: access === 'read',
			destructiveHint: access === 'write',
			idempotentHint: access === 'read',
			openWorldHint: true,
		},
	},
	handler: async ({ credentialId, nodeType, nodeVersion, parameters, input, timeoutMs }) => {
		try {
			const { result, annotations } = await broker.runNode(
				user,
				{
					credentialId,
					nodeType,
					nodeVersion,
					parameters: parameters as INodeParameters,
					input: input as Array<{ json: IDataObject }> | undefined,
					timeoutMs,
				},
				access,
			);

			if (result.status === 'success') {
				return ok({ status: 'success', effect: annotations.effect, output: result.output });
			}
			if (result.status === 'redacted') {
				return ok({
					status: result.failed ? 'error' : 'success',
					redacted: true,
					reason: result.reason,
					note: 'n8n hides the data of this run for this user.',
				});
			}
			return { ...ok({ status: 'error', error: result.error }), isError: true };
		} catch (error) {
			return fail(error);
		}
	},
});

const listMcpServerToolsSchema = {
	credentialId: z
		.string()
		.describe('ID of a connection from list_connections that has an entry in "mcpServers"'),
} satisfies z.ZodRawShape;

const createListMcpServerToolsTool = (
	user: User,
	broker: McpCredentialBrokerService,
): ToolDefinition<typeof listMcpServerToolsSchema> => ({
	name: LIST_MCP_SERVER_TOOLS_TOOL_NAME,
	config: {
		description:
			'List the tools of an MCP server that the user connected in n8n, with their input schemas. ' +
			'Each tool states if it is read-only. Call a tool with call_mcp_server_tool_read or call_mcp_server_tool_write. ' +
			SECRET_NOTE,
		inputSchema: listMcpServerToolsSchema,
		annotations: {
			title: 'List MCP Server Tools',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: true,
		},
	},
	handler: async ({ credentialId }) => {
		try {
			const { server, tools } = await broker.listMcpServerTools(user, credentialId);
			return ok({ server, count: tools.length, tools });
		} catch (error) {
			return fail(error);
		}
	},
});

const callMcpServerToolSchema = {
	credentialId: z
		.string()
		.describe('ID of a connection from list_connections that has an entry in "mcpServers"'),
	toolName: z.string().describe('Name of a tool from list_mcp_server_tools'),
	arguments: z
		.record(z.unknown())
		.optional()
		.describe('Arguments for the tool. They must match its input schema.'),
} satisfies z.ZodRawShape;

function isCallToolResult(value: unknown): value is { content: unknown[]; isError?: boolean } {
	return (
		typeof value === 'object' &&
		value !== null &&
		'content' in value &&
		Array.isArray(value.content)
	);
}

/** Text blocks pass through. Other block types are sent as JSON text. */
function toTextBlock(block: unknown) {
	const text =
		typeof block === 'object' &&
		block !== null &&
		'type' in block &&
		block.type === 'text' &&
		'text' in block &&
		typeof block.text === 'string'
			? block.text
			: JSON.stringify(block);
	return { type: 'text' as const, text };
}

const createCallMcpServerToolTool = (
	user: User,
	broker: McpCredentialBrokerService,
	access: BrokerAccess,
): ToolDefinition<typeof callMcpServerToolSchema> => ({
	name:
		access === 'read' ? CALL_MCP_SERVER_TOOL_READ_TOOL_NAME : CALL_MCP_SERVER_TOOL_WRITE_TOOL_NAME,
	config: {
		description:
			(access === 'read'
				? 'Call a read-only tool on an MCP server that the user connected in n8n. Tools that are not marked read-only are refused. '
				: 'Call any tool on an MCP server that the user connected in n8n. The tool can create, change or delete data. Prefer call_mcp_server_tool_read for read-only tools. ') +
			SECRET_NOTE,
		inputSchema: callMcpServerToolSchema,
		annotations: {
			title: access === 'read' ? 'Call MCP Server Tool (Read)' : 'Call MCP Server Tool (Write)',
			readOnlyHint: access === 'read',
			destructiveHint: access === 'write',
			idempotentHint: access === 'read',
			openWorldHint: true,
		},
	},
	handler: async ({ credentialId, toolName, arguments: args }) => {
		try {
			const result = await broker.callMcpServerTool(
				user,
				{ credentialId, toolName, arguments: args },
				access,
			);
			// Pass the remote server's own result through unchanged.
			if (isCallToolResult(result)) {
				return {
					content: result.content.map(toTextBlock),
					...(result.isError ? { isError: true } : {}),
				};
			}
			return ok({ result });
		} catch (error) {
			return fail(error);
		}
	},
});

/**
 * Registers the credential broker tools for the instance mode. `blocked`
 * registers none, so a client is never told about a capability that could
 * only refuse.
 */
export function registerCredentialBrokerTools(
	register: RegisterToolFn,
	user: User,
	broker: McpCredentialBrokerService,
	mode: McpCredentialUseMode,
): void {
	if (mode === 'blocked') return;

	register(createListConnectionsTool(user, broker, mode));
	register(createRunNodeTool(user, broker, 'read'));
	register(createListMcpServerToolsTool(user, broker));
	register(createCallMcpServerToolTool(user, broker, 'read'));

	if (mode === 'readWrite') {
		register(createRunNodeTool(user, broker, 'write'));
		register(createCallMcpServerToolTool(user, broker, 'write'));
	}
}

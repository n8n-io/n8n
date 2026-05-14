import type { User } from '@n8n/db';
import { ensureError, jsonStringify, type INodeParameters } from 'n8n-workflow';
import z from 'zod';

import type { ExecuteNodeResult, ExecuteNodeService } from '@/executions/execute-node.service';
import type { NodeCatalogService } from '@/node-catalog';
import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';

/**
 * Known top-level "package" prefixes for n8n node-type ids. When the caller
 * passes a bare name like "slack", we prefix it with the default package
 * (`n8n-nodes-base`). When they pass a fully-qualified id like
 * `@n8n/n8n-nodes-langchain.agent.run`, we keep it intact.
 */
const KNOWN_NODE_PACKAGE_PREFIXES = ['n8n-nodes-base', '@n8n/n8n-nodes-langchain'] as const;
const DEFAULT_NODE_PACKAGE_PREFIX = 'n8n-nodes-base';

const inputSchema = {
	id: z
		.string()
		.min(1)
		.describe(
			'Operation identifier: "<nodeType>.<resource>.<operation>" (e.g. "slack.message.send"), "<nodeType>.<operation>" (e.g. "set.json"), or just "<nodeType>". The node-type segment may be a bare name ("slack") or fully-qualified ("n8n-nodes-base.slack").',
		),
	credentialId: z
		.string()
		.optional()
		.describe('Optional id of the credential to bind to the node.'),
	params: z
		.record(z.unknown())
		.describe(
			'Parameters for the node operation. Merged on top of the auto-derived { resource, operation } fields.',
		),
	dryRun: z
		.boolean()
		.optional()
		.describe(
			'When true, validate inputs and return the resolved node spec without dispatching execution.',
		),
	sessionId: z
		.string()
		.min(1)
		.max(512)
		.optional()
		.describe(
			"Optional logical session identifier. By default the MCP server attaches the current connection's session id, so all tool calls from one agent conversation are grouped together automatically. Override this only if you want to scope a sub-session within the conversation (for example, a multi-step task that warrants its own group).",
		),
} satisfies z.ZodRawShape;

const outputSchema = {
	executionId: z.string(),
	status: z.enum(['success', 'error', 'dry_run']),
	output: z.array(z.unknown()).optional(),
	error: z
		.object({
			message: z.string(),
			stack: z.string().optional(),
		})
		.optional(),
	executionUrl: z.string().optional(),
} satisfies z.ZodRawShape;

export type N8nExecuteToolParams = z.infer<z.ZodObject<typeof inputSchema>>;

type ParsedId = {
	nodeType: string;
	resource?: string;
	operation?: string;
};

/**
 * Parse an `id` string into a node type, optional resource, and optional operation.
 *
 * Strategy:
 * 1. If the id begins with a known package prefix (`n8n-nodes-base.`,
 *    `@n8n/n8n-nodes-langchain.`), peel that prefix and treat the next segment
 *    as the node name. Remaining segments are resource/operation.
 * 2. Otherwise, use the node catalog parser to find the longest prefix of
 *    segments that resolves to a known node type (after prepending
 *    `n8n-nodes-base.`). This handles dotted node names should they exist.
 * 3. Fall back to the simple rule: first segment is the node name, remaining
 *    segments are resource (optional) + operation.
 *
 * Concrete examples:
 *   - "slack.message.send" → { nodeType: "n8n-nodes-base.slack",
 *                              resource: "message", operation: "send" }
 *   - "slack.postMessage"  → { nodeType: "n8n-nodes-base.slack",
 *                              operation: "postMessage" }
 *   - "set.json"           → { nodeType: "n8n-nodes-base.set",
 *                              operation: "json" }
 *   - "n8n-nodes-base.set.json" → { nodeType: "n8n-nodes-base.set",
 *                                   operation: "json" }
 *   - "@n8n/n8n-nodes-langchain.agent.run" →
 *       { nodeType: "@n8n/n8n-nodes-langchain.agent", operation: "run" }
 */
export function parseToolId(id: string, nodeCatalogService: NodeCatalogService): ParsedId {
	if (!id) throw new Error('Tool id must be a non-empty string');

	// Step 1: detect a known package prefix on the raw id.
	for (const prefix of KNOWN_NODE_PACKAGE_PREFIXES) {
		const withDot = `${prefix}.`;
		if (id.startsWith(withDot)) {
			const rest = id.slice(withDot.length);
			const segments = rest.split('.');
			if (segments.length === 0 || segments[0] === '') {
				throw new Error(`Invalid tool id "${id}": missing node name after package prefix`);
			}
			const nodeType = `${prefix}.${segments[0]}`;
			const trailing = segments.slice(1);
			return parsedFromTrailing(nodeType, trailing);
		}
	}

	// Step 2: try to find the longest known prefix via the node catalog parser.
	const segments = id.split('.');
	if (segments.length === 0 || segments[0] === '') {
		throw new Error(`Invalid tool id "${id}": empty node name`);
	}

	let parser: ReturnType<NodeCatalogService['getNodeTypeParser']> | null = null;
	try {
		parser = nodeCatalogService.getNodeTypeParser();
	} catch {
		parser = null;
	}

	if (parser) {
		// Try the longest prefix first so dotted node names (if any) resolve correctly.
		for (let take = segments.length; take >= 1; take--) {
			const candidateName = segments.slice(0, take).join('.');
			const prefixed = `${DEFAULT_NODE_PACKAGE_PREFIX}.${candidateName}`;
			const found = parser.getNodeType(prefixed);
			if (found) {
				return parsedFromTrailing(prefixed, segments.slice(take));
			}
		}
	}

	// Step 3: fall back to "first segment is the node name".
	const nodeType = `${DEFAULT_NODE_PACKAGE_PREFIX}.${segments[0]}`;
	return parsedFromTrailing(nodeType, segments.slice(1));
}

function parsedFromTrailing(nodeType: string, trailing: string[]): ParsedId {
	if (trailing.length === 0) {
		return { nodeType };
	}
	if (trailing.length === 1) {
		return { nodeType, operation: trailing[0] };
	}
	// 2 or more remaining segments: first is resource, second is operation.
	// Any segments beyond that are ignored (no node uses sub-operations today).
	return { nodeType, resource: trailing[0], operation: trailing[1] };
}

/**
 * Pull a session id out of the inbound MCP request headers (case-insensitive).
 * In stateless transport mode the SDK does not populate `extra.sessionId`, so
 * we fall back to the client-supplied `mcp-session-id` header — the value the
 * MCP transport spec defines for binding subsequent requests to the same
 * connection.
 */
function extractHeaderSessionId(
	headers: Record<string, string | string[] | undefined> | undefined,
): string | undefined {
	if (!headers) return undefined;
	const raw = headers['mcp-session-id'] ?? headers['Mcp-Session-Id'];
	const value = Array.isArray(raw) ? raw[0] : raw;
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

export const createN8nExecuteToolTool = (
	user: User,
	executeNodeService: ExecuteNodeService,
	nodeCatalogService: NodeCatalogService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'n8n_execute_tool',
	config: {
		description:
			"Execute a single n8n node operation. Pass the operation id (e.g. `slack.message.send`), a credential id, and the operation's parameters. Returns the execution result and a URL to view it in the n8n UI.",
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Execute n8n Node Operation',
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: false,
			openWorldHint: true,
		},
	},
	handler: async (input: N8nExecuteToolParams, extra) => {
		const { id, credentialId, params, dryRun, sessionId } = input;

		// Default session id to the MCP transport's per-connection identity so
		// every tool call from one agent conversation is grouped automatically.
		// Source priority:
		//   1. `extra.sessionId` — set by the SDK in stateful transport mode.
		//   2. `mcp-session-id` request header — set by clients on the streamable
		//      HTTP transport, including stateless mode where the SDK does not
		//      populate `extra.sessionId` itself.
		// An explicit `input.sessionId` from the agent overrides both, so the
		// agent can scope a sub-session within the conversation when desired.
		const transportSessionId =
			extra?.sessionId ?? extractHeaderSessionId(extra?.requestInfo?.headers);
		const effectiveSessionId = sessionId ?? transportSessionId;

		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'n8n_execute_tool',
			parameters: {
				id,
				hasCredentialId: Boolean(credentialId),
				dryRun: Boolean(dryRun),
				paramKeyCount: Object.keys(params ?? {}).length,
			},
		};

		try {
			const { nodeType, resource, operation } = parseToolId(id, nodeCatalogService);

			const parameters: INodeParameters = {
				...(resource ? { resource } : {}),
				...(operation ? { operation } : {}),
				...(params ?? {}),
			};

			const result: ExecuteNodeResult = await executeNodeService.execute({
				user,
				nodeType,
				parameters,
				...(credentialId ? { credentialId } : {}),
				...(dryRun ? { dryRun } : {}),
				caller: {
					kind: 'mcp',
					name: 'mcp-server',
					...(effectiveSessionId ? { sessionId: effectiveSessionId } : {}),
				},
			});

			telemetryPayload.results = {
				success: result.status !== 'error',
				data: {
					executionId: result.executionId,
					status: result.status,
				},
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: jsonStringify(result) }],
				structuredContent: result,
				...(result.status === 'error' ? { isError: true } : {}),
			};
		} catch (er) {
			const error = ensureError(er);
			const errorOutput = {
				executionId: '',
				status: 'error' as const,
				error: { message: error.message || 'Unknown error' },
			};

			telemetryPayload.results = {
				success: false,
				error: error.message || 'Unknown error',
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: jsonStringify(errorOutput) }],
				structuredContent: errorOutput,
				isError: true,
			};
		}
	},
});

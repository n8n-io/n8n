import type { AuthenticatedRequest } from '@n8n/db';
import { isRecord } from '@n8n/utils/is-record';
import type { Request } from 'express';
import type { INode } from 'n8n-workflow';

import {
	MCP_CLIENT_INFO_META_KEY,
	MCP_PROTOCOL_VERSION_META_KEY,
	SUPPORTED_MCP_TRIGGERS,
	SUPPORTED_PRODUCTION_MCP_TRIGGERS,
} from './mcp.constants';
import { isJSONRPCRequest } from './mcp.typeguards';
import type { JSONRPCRequest, McpClientInfo } from './mcp.types';

type McpExecutionMode = 'manual' | 'production';

/** Reads a single key off a request's `params._meta` envelope, if present. */
const getRequestMetaValue = (params: JSONRPCRequest['params'], key: string): unknown => {
	const meta = params?._meta;
	return isRecord(meta) ? meta[key] : undefined;
};

/**
 * Extracts the client's self-identification from a request. The 2026-07-28
 * revision moves this into the per-request `_meta` envelope (sent on every
 * request), so read that first; fall back to the 2025-era `initialize` params
 * location so legacy clients on the stateless fallback are still identified.
 */
export const getClientInfo = (req: Request | AuthenticatedRequest): McpClientInfo | undefined => {
	if (!isJSONRPCRequest(req.body)) return undefined;
	const params = req.body.params;

	const metaClientInfo = getRequestMetaValue(params, MCP_CLIENT_INFO_META_KEY);
	if (isRecord(metaClientInfo)) {
		return {
			name: typeof metaClientInfo.name === 'string' ? metaClientInfo.name : undefined,
			version: typeof metaClientInfo.version === 'string' ? metaClientInfo.version : undefined,
		};
	}

	return params?.clientInfo;
};

/**
 * Reads the protocol version a client declares in its per-request `_meta`
 * envelope (2026-07-28). Absent for 2025-era clients, which carried it in the
 * `initialize` handshake the new revision removed.
 */
export const getProtocolVersion = (req: Request | AuthenticatedRequest): string | undefined => {
	if (!isJSONRPCRequest(req.body)) return undefined;
	const version = getRequestMetaValue(req.body.params, MCP_PROTOCOL_VERSION_META_KEY);
	return typeof version === 'string' ? version : undefined;
};

/**
 * Safely extracts the tool name from a JSON-RPC request
 * @param body - The request body to extract tool name from
 * @returns The tool name if valid, 'unknown' otherwise
 */
export const getToolName = (body: unknown): string => {
	if (!isJSONRPCRequest(body)) return 'unknown';
	if (!body.params) return 'unknown';

	const { name } = body.params;
	if (typeof name === 'string') {
		return name;
	}

	return 'unknown';
};

/**
 * Safely extracts tool arguments from a JSON-RPC request
 * @param body - The request body to extract arguments from
 * @returns The arguments object if valid, empty object otherwise
 */
export const getToolArguments = (body: unknown): Record<string, unknown> => {
	if (!isJSONRPCRequest(body)) return {};
	if (!body.params) return {};

	const args = body.params.arguments;
	if (isRecord(args)) {
		return args;
	}

	return {};
};

/**
 * Finds the first supported trigger node in the provided nodes array.
 * Supported MCP triggers for production mode:
 * - Schedule trigger
 * - Webhook trigger
 * - Form trigger
 * - Chat trigger
 *
 * In manual mode, Manual Trigger is also supported.
 */
export const findMcpSupportedTrigger = (
	nodes: INode[],
	mode: McpExecutionMode = 'production',
): INode | undefined => {
	const triggerNodeTypes =
		mode === 'production'
			? Object.keys(SUPPORTED_PRODUCTION_MCP_TRIGGERS)
			: Object.keys(SUPPORTED_MCP_TRIGGERS);
	return nodes.find((node) => triggerNodeTypes.includes(node.type) && !node.disabled);
};

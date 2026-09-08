import type { AuthenticatedRequest } from '@n8n/db';
import { isRecord } from '@n8n/utils/is-record';
import type { Request } from 'express';
import type { INode } from 'n8n-workflow';

import {
	MCP_CLIENT_INFO_META_KEY,
	MCP_DISCOVER_METHOD,
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
 * Whether the request is a connection handshake: `server/discover`
 * (2026-07-28) or `initialize` (2025-era clients on the stateless fallback).
 */
export const isConnectionHandshake = (body: unknown): boolean =>
	isJSONRPCRequest(body) && (body.method === 'initialize' || body.method === MCP_DISCOVER_METHOD);

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

export type TriggerEligibility = (node: INode) => boolean;

/**
 * Enabled nodes that pass the caller-supplied eligibility check.
 * Shared by execute_workflow (MCP-supported set) and test_workflow (any trigger).
 */
export const findEnabledEligibleTriggers = (
	nodes: INode[],
	isEligible: TriggerEligibility,
): INode[] => nodes.filter((node) => !node.disabled && isEligible(node));

/**
 * Resolve a named enabled eligible trigger, or the first match if no name is given.
 * test_workflow uses the first-match fallback. execute_workflow must not — it
 * applies fail-closed rules on the list from findEnabledEligibleTriggers.
 */
export const findEnabledEligibleTrigger = (
	nodes: INode[],
	isEligible: TriggerEligibility,
	triggerNodeName?: string,
): INode | undefined => {
	const eligible = findEnabledEligibleTriggers(nodes, isEligible);
	if (triggerNodeName) {
		return eligible.find((node) => node.name === triggerNodeName);
	}
	return eligible[0];
};

export const isMcpSupportedTriggerType = (
	nodeType: string,
	mode: McpExecutionMode = 'production',
): boolean => {
	const triggerNodeTypes =
		mode === 'production'
			? Object.keys(SUPPORTED_PRODUCTION_MCP_TRIGGERS)
			: Object.keys(SUPPORTED_MCP_TRIGGERS);
	return triggerNodeTypes.includes(nodeType);
};

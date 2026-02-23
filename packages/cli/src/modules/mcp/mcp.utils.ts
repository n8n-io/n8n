import type { AuthenticatedRequest } from '@n8n/db';
import type { Request } from 'express';
import type { INode } from 'n8n-workflow';

import { SUPPORTED_MCP_TRIGGERS } from './mcp.constants';
import { isRecord, isJSONRPCRequest } from './mcp.typeguards';

export const getClientInfo = (req: Request | AuthenticatedRequest) => {
	let clientInfo: { name?: string; version?: string } | undefined;
	if (isJSONRPCRequest(req.body) && req.body.params?.clientInfo) {
		clientInfo = req.body.params.clientInfo;
	}
	return clientInfo;
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

	const { arguments: args } = body.params;
	if (isRecord(args)) {
		return args;
	}

	return {};
};

/**
 * Finds the first supported trigger node in the provided nodes array.
 * Workflow is eligible for MCP access if it contains at least one of these (enabled) trigger nodes:
 * - Schedule trigger
 * - Webhook trigger
 * - Form trigger
 * - Chat trigger
 */
export const findMcpSupportedTrigger = (nodes: INode[]): INode | undefined => {
	const triggerNodeTypes = Object.keys(SUPPORTED_MCP_TRIGGERS);
	return nodes.find((node) => triggerNodeTypes.includes(node.type) && !node.disabled);
};

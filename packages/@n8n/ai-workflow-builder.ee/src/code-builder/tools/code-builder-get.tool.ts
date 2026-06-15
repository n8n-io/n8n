/**
 * LangChain `tool()` wrapper for the simplified node-type lookup used by the
 * code-builder agent. The actual lookup logic lives in
 * `@n8n/ai-utilities/node-catalog` so non-LangChain callers can re-use it.
 */

import { tool } from '@langchain/core/tools';
import {
	getNodeTypes,
	type CodeBuilderGetToolOptions,
	type NodeRequest,
} from '@n8n/ai-utilities/node-catalog';
import { z } from 'zod';

/**
 * Create the simplified node get tool for code builder.
 * Accepts a list of node IDs (with optional versions) and returns all type
 * definitions in a single call.
 */
export function createCodeBuilderGetTool(options: CodeBuilderGetToolOptions = {}) {
	return tool(async (input: { nodeIds: NodeRequest[] }) => getNodeTypes(input.nodeIds, options), {
		name: 'get_node_types',
		description:
			'Get the full TypeScript type definitions for one or more nodes. Returns the complete type information including parameters, credentials, and node type variants. By default returns the latest version. For nodes with resource/operation or mode discriminators, you MUST specify them. Use search_nodes first to discover available discriminators. ALWAYS call this with ALL node types you plan to use BEFORE generating workflow code.',
		schema: z.object({
			nodeIds: z
				.array(
					z.union([
						z.string(),
						z.object({
							nodeId: z.string().describe('The node ID (e.g., "n8n-nodes-base.httpRequest")'),
							version: z
								.string()
								.optional()
								.describe('Optional version (e.g., "34" for v34). Omit for latest version.'),
							resource: z
								.string()
								.optional()
								.describe('Resource discriminator for REST API nodes (e.g., "ticket", "contact")'),
							operation: z
								.string()
								.optional()
								.describe('Operation discriminator (e.g., "get", "create", "update")'),
							mode: z
								.string()
								.optional()
								.describe('Mode discriminator for nodes like Code (e.g., "runOnceForAllItems")'),
						}),
					]),
				)
				.describe(
					'Array of nodes to fetch. Can be simple strings for flat nodes (e.g., ["n8n-nodes-base.aggregate"]) or objects with discriminators for split nodes (e.g., [{ nodeId: "n8n-nodes-base.freshservice", resource: "ticket", operation: "get" }] or [{ nodeId: "n8n-nodes-base.code", mode: "runOnceForAllItems" }]). Use search_nodes to discover which nodes require discriminators.',
				),
		}),
	});
}

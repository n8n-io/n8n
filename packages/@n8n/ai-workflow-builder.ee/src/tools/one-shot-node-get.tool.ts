/**
 * Simplified Node Get Tool for One-Shot Workflow Code Agent
 *
 * Returns the full TypeScript type definition for a specific node
 * from the generated workflow-sdk types.
 *
 * POC with extensive debug logging for development.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * Debug logging helper for get tool
 */
function debugLog(message: string, data?: Record<string, unknown>): void {
	const timestamp = new Date().toISOString();
	const prefix = `[ONE-SHOT-AGENT][${timestamp}][GET_TOOL]`;
	if (data) {
		console.log(`${prefix} ${message}`, JSON.stringify(data, null, 2));
	} else {
		console.log(`${prefix} ${message}`);
	}
}

/**
 * Get the path to the generated nodes directory
 */
function getGeneratedNodesPath(): string {
	const workflowSdkPath = dirname(require.resolve('@n8n/workflow-sdk/package.json'));
	const nodesPath = join(workflowSdkPath, 'src', 'types', 'generated', 'nodes');
	debugLog('Generated nodes path', { workflowSdkPath, nodesPath });
	return nodesPath;
}

/**
 * Parse a node ID into package and node name components
 * Examples:
 *   "n8n-nodes-base.httpRequest" -> { package: "n8n-nodes-base", nodeName: "httpRequest" }
 *   "@n8n/n8n-nodes-langchain.agent" -> { package: "n8n-nodes-langchain", nodeName: "agent" }
 */
function parseNodeId(nodeId: string): { packageName: string; nodeName: string } | null {
	debugLog('Parsing node ID', { nodeId });

	// Handle @n8n/ prefixed packages (langchain)
	if (nodeId.startsWith('@n8n/')) {
		const withoutPrefix = nodeId.slice(5); // Remove "@n8n/"
		const dotIndex = withoutPrefix.indexOf('.');
		if (dotIndex === -1) {
			debugLog('Failed to parse @n8n/ prefixed node ID - no dot found', { nodeId, withoutPrefix });
			return null;
		}
		const result = {
			packageName: withoutPrefix.slice(0, dotIndex),
			nodeName: withoutPrefix.slice(dotIndex + 1),
		};
		debugLog('Parsed @n8n/ prefixed node ID', { nodeId, ...result });
		return result;
	}

	// Handle regular packages
	const dotIndex = nodeId.indexOf('.');
	if (dotIndex === -1) {
		debugLog('Failed to parse node ID - no dot found', { nodeId });
		return null;
	}
	const result = {
		packageName: nodeId.slice(0, dotIndex),
		nodeName: nodeId.slice(dotIndex + 1),
	};
	debugLog('Parsed regular node ID', { nodeId, ...result });
	return result;
}

/**
 * Get the file path for a node ID
 */
function getNodeFilePath(nodeId: string): string | null {
	const parsed = parseNodeId(nodeId);
	if (!parsed) {
		debugLog('Could not get file path - parsing failed', { nodeId });
		return null;
	}

	const nodesPath = getGeneratedNodesPath();
	const filePath = join(nodesPath, parsed.packageName, `${parsed.nodeName}.ts`);

	debugLog('Checking file path', { nodeId, filePath, exists: existsSync(filePath) });

	if (!existsSync(filePath)) {
		debugLog('File does not exist', { filePath });
		return null;
	}

	return filePath;
}

/**
 * Create the simplified node get tool for one-shot agent
 */
export function createOneShotNodeGetTool() {
	debugLog('Creating get_node tool');

	return tool(
		async (input: { nodeId: string }) => {
			debugLog('========== GET_NODE TOOL INVOKED ==========');
			debugLog('Input', { nodeId: input.nodeId });

			const filePath = getNodeFilePath(input.nodeId);

			if (!filePath) {
				const response = `Node type '${input.nodeId}' not found. Use search_node to find the correct node ID.`;
				debugLog('Node not found, returning error response', { nodeId: input.nodeId, response });
				debugLog('========== GET_NODE TOOL COMPLETE (NOT FOUND) ==========');
				return response;
			}

			try {
				debugLog('Reading file', { filePath });
				const readStartTime = Date.now();
				const content = readFileSync(filePath, 'utf-8');
				const readDuration = Date.now() - readStartTime;

				debugLog('File read successfully', {
					filePath,
					readDurationMs: readDuration,
					contentLength: content.length,
					contentPreview: content.substring(0, 500),
				});

				const response = `TypeScript type definition for ${input.nodeId}:\n\n\`\`\`typescript\n${content}\n\`\`\``;
				debugLog('Returning response', {
					responseLength: response.length,
				});
				debugLog('========== GET_NODE TOOL COMPLETE ==========');

				return response;
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error';
				debugLog('Error reading file', {
					filePath,
					error: errorMessage,
					errorStack: error instanceof Error ? error.stack : undefined,
				});
				const response = `Error reading node definition for '${input.nodeId}': ${errorMessage}`;
				debugLog('========== GET_NODE TOOL COMPLETE (ERROR) ==========');
				return response;
			}
		},
		{
			name: 'get_node',
			description:
				'Get the full TypeScript type definition for a specific node. Returns the complete type information including parameters, credentials, and node type variants. Use this to understand exactly how to configure a node.',
			schema: z.object({
				nodeId: z.string().describe('The node ID (e.g., "n8n-nodes-base.httpRequest")'),
			}),
		},
	);
}

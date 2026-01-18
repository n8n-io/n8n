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
import { inspect } from 'node:util';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * Debug logging helper for get tool
 * Uses util.inspect for terminal-friendly output with full depth
 */
function debugLog(message: string, data?: Record<string, unknown>): void {
	const timestamp = new Date().toISOString();
	const prefix = `[ONE-SHOT-AGENT][${timestamp}][GET_TOOL]`;
	if (data) {
		const formatted = inspect(data, {
			depth: null,
			colors: true,
			maxStringLength: null,
			maxArrayLength: null,
			breakLength: 120,
		});
		console.log(`${prefix} ${message}\n${formatted}`);
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
 * Get the type definition for a single node ID
 */
function getNodeTypeDefinition(nodeId: string): {
	nodeId: string;
	content: string;
	error?: string;
} {
	debugLog('Getting type definition for node', { nodeId });

	const filePath = getNodeFilePath(nodeId);

	if (!filePath) {
		return {
			nodeId,
			content: '',
			error: `Node type '${nodeId}' not found. Use search_node to find the correct node ID.`,
		};
	}

	try {
		const readStartTime = Date.now();
		const content = readFileSync(filePath, 'utf-8');
		const readDuration = Date.now() - readStartTime;

		debugLog('File read successfully', {
			nodeId,
			filePath,
			readDurationMs: readDuration,
			contentLength: content.length,
		});

		return { nodeId, content };
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		debugLog('Error reading file', {
			nodeId,
			filePath,
			error: errorMessage,
		});
		return {
			nodeId,
			content: '',
			error: `Error reading node definition for '${nodeId}': ${errorMessage}`,
		};
	}
}

/**
 * Create the simplified node get tool for one-shot agent
 * Accepts a list of node IDs and returns all type definitions in a single call
 */
export function createOneShotNodeGetTool() {
	debugLog('Creating get_nodes tool');

	return tool(
		async (input: { nodeIds: string[] }) => {
			debugLog('========== GET_NODES TOOL INVOKED ==========');
			debugLog('Input', { nodeIds: input.nodeIds, count: input.nodeIds.length });

			const results: string[] = [];
			const errors: string[] = [];

			for (const nodeId of input.nodeIds) {
				const result = getNodeTypeDefinition(nodeId);
				if (result.error) {
					errors.push(result.error);
				} else {
					results.push(`## ${nodeId}\n\n\`\`\`typescript\n${result.content}\n\`\`\``);
				}
			}

			let response = '';

			if (results.length > 0) {
				response += `# TypeScript Type Definitions\n\n${results.join('\n\n---\n\n')}`;
			}

			if (errors.length > 0) {
				response += `\n\n# Errors\n\n${errors.join('\n')}`;
			}

			debugLog('Returning response', {
				successCount: results.length,
				errorCount: errors.length,
				responseLength: response.length,
			});
			debugLog('========== GET_NODES TOOL COMPLETE ==========');

			return response;
		},
		{
			name: 'get_nodes',
			description:
				'Get the full TypeScript type definitions for one or more nodes. Returns the complete type information including parameters, credentials, and node type variants. ALWAYS call this with ALL node types you plan to use BEFORE generating workflow code.',
			schema: z.object({
				nodeIds: z
					.array(z.string())
					.describe(
						'Array of node IDs to get definitions for (e.g., ["n8n-nodes-base.httpRequest", "n8n-nodes-base.set"])',
					),
			}),
		},
	);
}

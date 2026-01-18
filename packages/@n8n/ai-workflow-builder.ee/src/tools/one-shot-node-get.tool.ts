/**
 * Simplified Node Get Tool for One-Shot Workflow Code Agent
 *
 * Returns the full TypeScript type definition for a specific node
 * from the generated workflow-sdk types.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * Get the path to the generated nodes directory
 */
function getGeneratedNodesPath(): string {
	const workflowSdkPath = dirname(require.resolve('@n8n/workflow-sdk/package.json'));
	return join(workflowSdkPath, 'src', 'types', 'generated', 'nodes');
}

/**
 * Parse a node ID into package and node name components
 * Examples:
 *   "n8n-nodes-base.httpRequest" -> { package: "n8n-nodes-base", nodeName: "httpRequest" }
 *   "@n8n/n8n-nodes-langchain.agent" -> { package: "n8n-nodes-langchain", nodeName: "agent" }
 */
function parseNodeId(nodeId: string): { packageName: string; nodeName: string } | null {
	// Handle @n8n/ prefixed packages (langchain)
	if (nodeId.startsWith('@n8n/')) {
		const withoutPrefix = nodeId.slice(5); // Remove "@n8n/"
		const dotIndex = withoutPrefix.indexOf('.');
		if (dotIndex === -1) return null;
		return {
			packageName: withoutPrefix.slice(0, dotIndex),
			nodeName: withoutPrefix.slice(dotIndex + 1),
		};
	}

	// Handle regular packages
	const dotIndex = nodeId.indexOf('.');
	if (dotIndex === -1) return null;
	return {
		packageName: nodeId.slice(0, dotIndex),
		nodeName: nodeId.slice(dotIndex + 1),
	};
}

/**
 * Get the file path for a node ID
 */
function getNodeFilePath(nodeId: string): string | null {
	const parsed = parseNodeId(nodeId);
	if (!parsed) return null;

	const nodesPath = getGeneratedNodesPath();
	const filePath = join(nodesPath, parsed.packageName, `${parsed.nodeName}.ts`);

	if (!existsSync(filePath)) {
		return null;
	}

	return filePath;
}

/**
 * Create the simplified node get tool for one-shot agent
 */
export function createOneShotNodeGetTool() {
	return tool(
		async (input: { nodeId: string }) => {
			const filePath = getNodeFilePath(input.nodeId);

			if (!filePath) {
				return `Node type '${input.nodeId}' not found. Use search_node to find the correct node ID.`;
			}

			try {
				const content = readFileSync(filePath, 'utf-8');
				return `TypeScript type definition for ${input.nodeId}:\n\n\`\`\`typescript\n${content}\n\`\`\``;
			} catch (error) {
				return `Error reading node definition for '${input.nodeId}': ${error instanceof Error ? error.message : 'Unknown error'}`;
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

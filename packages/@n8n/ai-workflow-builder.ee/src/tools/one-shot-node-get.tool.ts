/**
 * Simplified Node Get Tool for One-Shot Workflow Code Agent
 *
 * Returns the full TypeScript type definition for a specific node
 * from the generated workflow-sdk types.
 *
 * POC with extensive debug logging for development.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
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
 * Uses either a custom path (from InstanceSettings.generatedTypesDir) or falls back to
 * the static types in workflow-sdk for development/testing.
 */
function getGeneratedNodesPath(customGeneratedTypesDir?: string): string {
	if (customGeneratedTypesDir) {
		const nodesPath = join(customGeneratedTypesDir, 'nodes');
		debugLog('Using custom generated nodes path', { customGeneratedTypesDir, nodesPath });
		return nodesPath;
	}

	// Default to ~/.n8n/generated-types (same location as runtime and CLI)
	const defaultTypesDir = join(homedir(), '.n8n', 'generated-types');
	const nodesPath = join(defaultTypesDir, 'nodes');
	debugLog('Using default generated nodes path', { defaultTypesDir, nodesPath });
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
 * Get available versions for a node
 * Returns array of version strings like ['v34', 'v2'] sorted by version descending
 */
function getNodeVersions(nodeId: string, generatedTypesDir?: string): string[] {
	const parsed = parseNodeId(nodeId);
	if (!parsed) {
		debugLog('Could not get versions - parsing failed', { nodeId });
		return [];
	}

	const nodesPath = getGeneratedNodesPath(generatedTypesDir);
	const nodeDir = join(nodesPath, parsed.packageName, parsed.nodeName);

	if (!existsSync(nodeDir)) {
		debugLog('Node directory does not exist', { nodeDir });
		return [];
	}

	try {
		const files = readdirSync(nodeDir);
		const versionFiles = files
			.filter((f) => f.startsWith('v') && f.endsWith('.ts') && f !== 'index.ts')
			.map((f) => f.replace('.ts', ''));

		// Sort by numeric version descending
		versionFiles.sort((a, b) => {
			const aNum = parseInt(a.slice(1), 10);
			const bNum = parseInt(b.slice(1), 10);
			return bNum - aNum;
		});

		debugLog('Found versions', { nodeId, versions: versionFiles });
		return versionFiles;
	} catch (error) {
		debugLog('Error reading node directory', {
			nodeDir,
			error: error instanceof Error ? error.message : 'Unknown error',
		});
		return [];
	}
}

/**
 * Get the file path for a node ID, optionally for a specific version
 * If no version specified, returns the latest version
 */
function getNodeFilePath(
	nodeId: string,
	version?: string,
	generatedTypesDir?: string,
): string | null {
	const parsed = parseNodeId(nodeId);
	if (!parsed) {
		debugLog('Could not get file path - parsing failed', { nodeId });
		return null;
	}

	const nodesPath = getGeneratedNodesPath(generatedTypesDir);
	const nodeDir = join(nodesPath, parsed.packageName, parsed.nodeName);

	if (!existsSync(nodeDir)) {
		debugLog('Node directory does not exist', { nodeDir });
		return null;
	}

	let targetVersion = version;

	// If no version specified, find the latest version
	if (!targetVersion) {
		const versions = getNodeVersions(nodeId, generatedTypesDir);
		if (versions.length === 0) {
			debugLog('No versions found for node', { nodeId });
			return null;
		}
		targetVersion = versions[0]; // Latest version (sorted descending)
		debugLog('Using latest version', { nodeId, version: targetVersion });
	}

	// Convert version to file format:
	// - "3.1" -> "v31"
	// - "31" -> "v31"
	// - "v31" -> "v31"
	// - "v3.1" -> "v31"
	if (!targetVersion.startsWith('v')) {
		targetVersion = `v${targetVersion.replace('.', '')}`;
	} else {
		targetVersion = `v${targetVersion.slice(1).replace('.', '')}`;
	}

	const filePath = join(nodeDir, `${targetVersion}.ts`);

	debugLog('Checking file path', {
		nodeId,
		version: targetVersion,
		filePath,
		exists: existsSync(filePath),
	});

	if (!existsSync(filePath)) {
		debugLog('File does not exist', { filePath });
		return null;
	}

	return filePath;
}

/**
 * Get the type definition for a single node ID, optionally for a specific version
 */
function getNodeTypeDefinition(
	nodeId: string,
	version?: string,
	generatedTypesDir?: string,
): {
	nodeId: string;
	version?: string;
	content: string;
	availableVersions?: string[];
	error?: string;
} {
	debugLog('Getting type definition for node', { nodeId, version, generatedTypesDir });

	// Check if the types directory exists
	const nodesPath = getGeneratedNodesPath(generatedTypesDir);
	if (!existsSync(nodesPath)) {
		const errorMsg = generatedTypesDir
			? `Node types directory not found at '${nodesPath}'. Types may not have been generated yet.`
			: `Node types not found. The generated types directory does not exist. Ensure the application has started properly and types have been generated.`;
		return {
			nodeId,
			content: '',
			error: errorMsg,
		};
	}

	const filePath = getNodeFilePath(nodeId, version, generatedTypesDir);

	if (!filePath) {
		const availableVersions = getNodeVersions(nodeId, generatedTypesDir);
		if (availableVersions.length > 0) {
			return {
				nodeId,
				version,
				content: '',
				availableVersions,
				error: `Version '${version}' not found for node '${nodeId}'. Available versions: ${availableVersions.join(', ')}`,
			};
		}
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

		// Extract version from file path
		const actualVersion = filePath.match(/\/(v\d+)\.ts$/)?.[1];

		debugLog('File read successfully', {
			nodeId,
			version: actualVersion,
			filePath,
			readDurationMs: readDuration,
			contentLength: content.length,
		});

		return { nodeId, version: actualVersion, content };
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

/** Node request can be a simple string or an object with optional version */
type NodeRequest = string | { nodeId: string; version?: string };

/**
 * Options for creating the node get tool
 */
export interface OneShotNodeGetToolOptions {
	/**
	 * Path to the generated types directory (from InstanceSettings.generatedTypesDir).
	 * If not provided, falls back to workflow-sdk static types.
	 */
	generatedTypesDir?: string;
}

/**
 * Create the simplified node get tool for one-shot agent
 * Accepts a list of node IDs (with optional versions) and returns all type definitions in a single call
 */
export function createOneShotNodeGetTool(options: OneShotNodeGetToolOptions = {}) {
	const { generatedTypesDir } = options;
	debugLog('Creating get_nodes tool', { generatedTypesDir });

	return tool(
		async (input: { nodeIds: NodeRequest[] }) => {
			debugLog('========== GET_NODES TOOL INVOKED ==========');
			debugLog('Input', { nodeIds: input.nodeIds, count: input.nodeIds.length, generatedTypesDir });

			const results: string[] = [];
			const errors: string[] = [];

			for (const nodeRequest of input.nodeIds) {
				// Support both string and object formats
				const nodeId = typeof nodeRequest === 'string' ? nodeRequest : nodeRequest.nodeId;
				const version = typeof nodeRequest === 'string' ? undefined : nodeRequest.version;

				const result = getNodeTypeDefinition(nodeId, version, generatedTypesDir);
				if (result.error) {
					errors.push(result.error);
				} else {
					const versionLabel = result.version ? ` (${result.version})` : '';
					results.push(
						`## ${nodeId}${versionLabel}\n\n\`\`\`typescript\n${result.content}\n\`\`\``,
					);
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
				'Get the full TypeScript type definitions for one or more nodes. Returns the complete type information including parameters, credentials, and node type variants. By default returns the latest version. ALWAYS call this with ALL node types you plan to use BEFORE generating workflow code.',
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
							}),
						]),
					)
					.describe(
						'Array of nodes to fetch. Can be simple strings (e.g., ["n8n-nodes-base.httpRequest"]) or objects with optional version (e.g., [{ nodeId: "n8n-nodes-base.set", version: "2" }]). Defaults to latest version when not specified.',
					),
			}),
		},
	);
}

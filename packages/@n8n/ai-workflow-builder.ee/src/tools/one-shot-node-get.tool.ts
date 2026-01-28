/**
 * Simplified Node Get Tool for One-Shot Workflow Code Agent
 *
 * Returns the full TypeScript type definition for a specific node
 * from the generated workflow-sdk types.
 *
 * POC with extensive debug logging for development.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
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
 * Convert string to snake_case for file/folder naming
 * Examples: "runOnceForAllItems" -> "run_once_for_all_items"
 */
function toSnakeCase(str: string): string {
	return str
		.replace(/([A-Z])/g, '_$1')
		.toLowerCase()
		.replace(/^_/, '')
		.replace(/[-\s]+/g, '_');
}

/**
 * Check if a node uses split version structure (v{N}/ directory vs v{N}.ts file)
 * Returns true if the version directory exists, regardless of whether a flat file also exists.
 * This ensures we prefer split structure (smaller, specific files) over flat files when both exist.
 */
function isSplitVersionStructure(nodeDir: string, versionStr: string): boolean {
	const versionDir = join(nodeDir, versionStr);
	// Return true if directory exists (prefer split structure over flat file)
	return existsSync(versionDir) && statSync(versionDir).isDirectory();
}

/**
 * Get available discriminators for a split version
 * Returns { resources, modes } based on directory structure
 */
function getAvailableDiscriminators(
	nodeDir: string,
	versionStr: string,
): { resources?: string[]; modes?: string[] } {
	const versionDir = join(nodeDir, versionStr);
	if (!existsSync(versionDir)) {
		return {};
	}

	try {
		const entries = readdirSync(versionDir, { withFileTypes: true });
		const resources: string[] = [];
		const modes: string[] = [];

		for (const entry of entries) {
			if (entry.isDirectory() && entry.name.startsWith('resource_')) {
				resources.push(entry.name.replace('resource_', ''));
			} else if (entry.isFile() && entry.name.startsWith('mode_') && entry.name.endsWith('.ts')) {
				modes.push(entry.name.replace('mode_', '').replace('.ts', ''));
			}
		}

		return {
			resources: resources.length > 0 ? resources : undefined,
			modes: modes.length > 0 ? modes : undefined,
		};
	} catch {
		return {};
	}
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
		const entries = readdirSync(nodeDir, { withFileTypes: true });
		const versions: string[] = [];

		for (const entry of entries) {
			// Flat file: v1.ts, v2.ts, etc. (exclude schema files and index.ts)
			if (
				entry.isFile() &&
				entry.name.startsWith('v') &&
				entry.name.endsWith('.ts') &&
				entry.name !== 'index.ts' &&
				!entry.name.endsWith('.schema.ts')
			) {
				versions.push(entry.name.replace('.ts', ''));
			}
			// Split directory: v1/, v2/, etc.
			else if (entry.isDirectory() && /^v\d+$/.test(entry.name)) {
				versions.push(entry.name);
			}
		}

		// Sort by numeric version descending
		versions.sort((a, b) => {
			const aNum = parseInt(a.slice(1), 10);
			const bNum = parseInt(b.slice(1), 10);
			return bNum - aNum;
		});

		debugLog('Found versions', { nodeId, versions });
		return versions;
	} catch (error) {
		debugLog('Error reading node directory', {
			nodeDir,
			error: error instanceof Error ? error.message : 'Unknown error',
		});
		return [];
	}
}

/** Result of path resolution - either a file path or an error */
interface PathResolutionResult {
	filePath?: string;
	error?: string;
	requiresDiscriminators?: boolean;
	availableDiscriminators?: { resources?: string[]; modes?: string[] };
}

/**
 * Get the file path for a node ID, optionally for a specific version and discriminators
 * If no version specified, returns the latest version
 * If node uses split structure, discriminators are required
 */
function getNodeFilePath(
	nodeId: string,
	version?: string,
	generatedTypesDir?: string,
	discriminators?: { resource?: string; operation?: string; mode?: string },
): PathResolutionResult {
	const parsed = parseNodeId(nodeId);
	if (!parsed) {
		debugLog('Could not get file path - parsing failed', { nodeId });
		return { error: `Invalid node ID format: '${nodeId}'` };
	}

	const nodesPath = getGeneratedNodesPath(generatedTypesDir);
	const nodeDir = join(nodesPath, parsed.packageName, parsed.nodeName);

	if (!existsSync(nodeDir)) {
		debugLog('Node directory does not exist', { nodeDir });
		return {
			error: `Node type '${nodeId}' not found. Use search_node to find the correct node ID.`,
		};
	}

	let targetVersion = version;

	// If no version specified, find the latest version
	if (!targetVersion) {
		const versions = getNodeVersions(nodeId, generatedTypesDir);
		if (versions.length === 0) {
			debugLog('No versions found for node', { nodeId });
			return { error: `No versions found for node '${nodeId}'` };
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

	// Check if this is a split version structure
	if (isSplitVersionStructure(nodeDir, targetVersion)) {
		debugLog('Detected split version structure', { nodeId, version: targetVersion });

		const available = getAvailableDiscriminators(nodeDir, targetVersion);

		// Handle resource/operation pattern
		if (available.resources && available.resources.length > 0) {
			if (!discriminators?.resource || !discriminators?.operation) {
				return {
					error: `Error: Node '${nodeId}' requires resource and operation discriminators. Available resources: ${available.resources.join(', ')}. Use search_nodes to see all options.`,
					requiresDiscriminators: true,
					availableDiscriminators: available,
				};
			}

			// Validate resource
			const resourcePath = `resource_${toSnakeCase(discriminators.resource)}`;
			const resourceDir = join(nodeDir, targetVersion, resourcePath);
			if (!existsSync(resourceDir)) {
				return {
					error: `Error: Invalid resource '${discriminators.resource}' for node '${nodeId}'. Available: ${available.resources.join(', ')}`,
				};
			}

			// Validate operation
			const operationFile = `operation_${toSnakeCase(discriminators.operation)}.ts`;
			const filePath = join(resourceDir, operationFile);
			if (!existsSync(filePath)) {
				// Get available operations for this resource
				try {
					const ops = readdirSync(resourceDir)
						.filter((f) => f.startsWith('operation_') && f.endsWith('.ts'))
						.map((f) => f.replace('operation_', '').replace('.ts', ''));
					return {
						error: `Error: Invalid operation '${discriminators.operation}' for resource '${discriminators.resource}'. Available: ${ops.join(', ')}`,
					};
				} catch {
					return {
						error: `Error: Could not read operations for resource '${discriminators.resource}'`,
					};
				}
			}

			debugLog('Resolved split path for resource/operation', { filePath });
			return { filePath };
		}

		// Handle mode pattern
		if (available.modes && available.modes.length > 0) {
			if (!discriminators?.mode) {
				return {
					error: `Error: Node '${nodeId}' requires mode discriminator. Available modes: ${available.modes.join(', ')}. Use search_nodes to see all options.`,
					requiresDiscriminators: true,
					availableDiscriminators: available,
				};
			}

			// Validate mode
			const modeFile = `mode_${toSnakeCase(discriminators.mode)}.ts`;
			const filePath = join(nodeDir, targetVersion, modeFile);
			if (!existsSync(filePath)) {
				return {
					error: `Error: Invalid mode '${discriminators.mode}' for node '${nodeId}'. Available: ${available.modes.join(', ')}`,
				};
			}

			debugLog('Resolved split path for mode', { filePath });
			return { filePath };
		}

		// Split structure exists but no recognized discriminator directories
		return {
			error: `Error: Node '${nodeId}' has split structure but no recognized discriminators found`,
		};
	}

	// Flat file structure
	const filePath = join(nodeDir, `${targetVersion}.ts`);

	debugLog('Checking flat file path', {
		nodeId,
		version: targetVersion,
		filePath,
		exists: existsSync(filePath),
	});

	if (!existsSync(filePath)) {
		debugLog('File does not exist', { filePath });
		return { error: `Version '${version}' not found for node '${nodeId}'` };
	}

	return { filePath };
}

/**
 * Get the type definition for a single node ID, optionally for a specific version and discriminators
 */
function getNodeTypeDefinition(
	nodeId: string,
	version?: string,
	generatedTypesDir?: string,
	discriminators?: { resource?: string; operation?: string; mode?: string },
): {
	nodeId: string;
	version?: string;
	content: string;
	availableVersions?: string[];
	error?: string;
} {
	debugLog('Getting type definition for node', {
		nodeId,
		version,
		generatedTypesDir,
		discriminators,
	});

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

	const pathResult = getNodeFilePath(nodeId, version, generatedTypesDir, discriminators);

	if (pathResult.error) {
		const availableVersions = getNodeVersions(nodeId, generatedTypesDir);
		return {
			nodeId,
			version,
			content: '',
			availableVersions: availableVersions.length > 0 ? availableVersions : undefined,
			error: pathResult.error,
		};
	}

	if (!pathResult.filePath) {
		return {
			nodeId,
			content: '',
			error: `Node type '${nodeId}' not found. Use search_node to find the correct node ID.`,
		};
	}

	try {
		const readStartTime = Date.now();
		const content = readFileSync(pathResult.filePath, 'utf-8');
		const readDuration = Date.now() - readStartTime;

		// Extract version from file path - handles both flat (v1.ts) and split (v1/...) structures
		const actualVersion = pathResult.filePath.match(/\/(v\d+)(?:\/|\.ts)/)?.[1];

		debugLog('File read successfully', {
			nodeId,
			version: actualVersion,
			filePath: pathResult.filePath,
			readDurationMs: readDuration,
			contentLength: content.length,
		});

		return { nodeId, version: actualVersion, content };
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		debugLog('Error reading file', {
			nodeId,
			filePath: pathResult.filePath,
			error: errorMessage,
		});
		return {
			nodeId,
			content: '',
			error: `Error reading node definition for '${nodeId}': ${errorMessage}`,
		};
	}
}

/** Node request can be a simple string or an object with optional version and discriminators */
type NodeRequest =
	| string
	| {
			nodeId: string;
			version?: string;
			// Discriminator parameters for split type files
			resource?: string;
			operation?: string;
			mode?: string;
	  };

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

				// Extract discriminators from object format
				const discriminators =
					typeof nodeRequest === 'string'
						? undefined
						: {
								resource: nodeRequest.resource,
								operation: nodeRequest.operation,
								mode: nodeRequest.mode,
							};

				const result = getNodeTypeDefinition(nodeId, version, generatedTypesDir, discriminators);
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
									.describe(
										'Resource discriminator for REST API nodes (e.g., "ticket", "contact")',
									),
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
		},
	);
}

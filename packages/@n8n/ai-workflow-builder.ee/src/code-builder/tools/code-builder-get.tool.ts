/**
 * Simplified Node Get Tool for CodeWorkflowBuilder
 *
 * Returns the full TypeScript type definition for a specific node
 * from the generated workflow-sdk types.
 */

import { tool } from '@langchain/core/tools';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { z } from 'zod';

/**
 * Validate a path component to prevent path traversal attacks.
 * Rejects empty values, path separators, traversal sequences, and null bytes.
 */
export function isValidPathComponent(component: string): boolean {
	if (!component || component.trim() === '') {
		return false;
	}

	// Reject null bytes
	if (component.includes('\0')) {
		return false;
	}

	// Reject path separators
	if (component.includes('/') || component.includes('\\')) {
		return false;
	}

	// Reject parent directory traversal
	if (component === '..' || component.startsWith('..')) {
		return false;
	}

	return true;
}

/**
 * Validate that a resolved path is within the expected base directory.
 * Prevents path traversal even if components pass basic validation.
 */
export function validatePathWithinBase(filePath: string, baseDir: string): boolean {
	const resolvedPath = resolve(filePath);
	const resolvedBase = resolve(baseDir);

	// Path must start with base directory (with trailing separator to prevent prefix attacks)
	return resolvedPath.startsWith(resolvedBase + '/') || resolvedPath === resolvedBase;
}

/**
 * Get the paths to the generated nodes directories.
 * Searches the configured built-in definition directories.
 */
function getGeneratedNodesPaths(nodeDefinitionDirs?: string[]): string[] {
	if (nodeDefinitionDirs && nodeDefinitionDirs.length > 0) {
		return nodeDefinitionDirs.map((dir) => join(dir, 'nodes'));
	}

	return [];
}

/**
 * Find the first nodes path that contains the given node directory.
 * Returns { nodesPath, nodeDir } or null if not found in any dir.
 */
function findNodeDir(
	parsed: { packageName: string; nodeName: string },
	nodesPaths: string[],
): { nodesPath: string; nodeDir: string } | null {
	for (const nodesPath of nodesPaths) {
		const nodeDir = join(nodesPath, parsed.packageName, parsed.nodeName);
		if (existsSync(nodeDir)) {
			return { nodesPath, nodeDir };
		}
	}

	// Tool variant fallback: e.g. "httpRequestTool" -> "httpRequest"
	// Tool variants share type definitions with their base node
	if (parsed.nodeName.endsWith('Tool')) {
		const baseName = parsed.nodeName.slice(0, -4);
		for (const nodesPath of nodesPaths) {
			const nodeDir = join(nodesPath, parsed.packageName, baseName);
			if (existsSync(nodeDir)) {
				return { nodesPath, nodeDir };
			}
		}
	}

	return null;
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
	// Handle @n8n/ prefixed packages (langchain)
	if (nodeId.startsWith('@n8n/')) {
		const withoutPrefix = nodeId.slice(5); // Remove "@n8n/"
		const dotIndex = withoutPrefix.indexOf('.');
		if (dotIndex === -1) {
			return null;
		}
		return {
			packageName: withoutPrefix.slice(0, dotIndex),
			nodeName: withoutPrefix.slice(dotIndex + 1),
		};
	}

	// Handle regular packages
	const dotIndex = nodeId.indexOf('.');
	if (dotIndex === -1) {
		return null;
	}
	return {
		packageName: nodeId.slice(0, dotIndex),
		nodeName: nodeId.slice(dotIndex + 1),
	};
}

/**
 * Get available versions for a node
 * Returns array of version strings like ['v34', 'v2'] sorted by version descending
 */
function getNodeVersions(nodeId: string, nodeDefinitionDirs?: string[]): string[] {
	const parsed = parseNodeId(nodeId);
	if (!parsed) {
		return [];
	}

	const nodesPaths = getGeneratedNodesPaths(nodeDefinitionDirs);
	const found = findNodeDir(parsed, nodesPaths);

	if (!found) {
		return [];
	}

	const { nodeDir } = found;

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
				!entry.name.endsWith('.schema.js')
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

		return versions;
	} catch {
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
 * Resolve resource/operation path for split version structure
 */
function resolveResourceOperationPath(
	nodeDir: string,
	targetVersion: string,
	nodeId: string,
	available: { resources?: string[]; modes?: string[] },
	discriminators?: { resource?: string; operation?: string },
): PathResolutionResult {
	if (!discriminators?.resource || !discriminators?.operation) {
		return {
			error: `Error: Node '${nodeId}' requires resource and operation discriminators. Available resources: ${available.resources?.join(', ')}. Use search_nodes to see all options.`,
			requiresDiscriminators: true,
			availableDiscriminators: available,
		};
	}

	// Security: Validate discriminator values to prevent path traversal
	if (!isValidPathComponent(discriminators.resource)) {
		return {
			error: `Error: Invalid resource value '${discriminators.resource}' - contains invalid characters`,
		};
	}
	if (!isValidPathComponent(discriminators.operation)) {
		return {
			error: `Error: Invalid operation value '${discriminators.operation}' - contains invalid characters`,
		};
	}

	// Validate resource
	const resourcePath = `resource_${toSnakeCase(discriminators.resource)}`;
	const resourceDir = join(nodeDir, targetVersion, resourcePath);
	if (!existsSync(resourceDir)) {
		return {
			error: `Error: Invalid resource '${discriminators.resource}' for node '${nodeId}'. Available: ${available.resources?.join(', ')}`,
		};
	}

	// Validate operation
	const operationFile = `operation_${toSnakeCase(discriminators.operation)}.ts`;
	const filePath = join(resourceDir, operationFile);

	// Security: Final path validation - ensure we're still within nodeDir
	if (!validatePathWithinBase(filePath, nodeDir)) {
		return {
			error: 'Error: Invalid path - path traversal detected',
		};
	}

	if (!existsSync(filePath)) {
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

	return { filePath };
}

/**
 * Resolve mode path for split version structure
 */
function resolveModePath(
	nodeDir: string,
	targetVersion: string,
	nodeId: string,
	available: { resources?: string[]; modes?: string[] },
	mode?: string,
): PathResolutionResult {
	if (!mode) {
		return {
			error: `Error: Node '${nodeId}' requires mode discriminator. Available modes: ${available.modes?.join(', ')}. Use search_nodes to see all options.`,
			requiresDiscriminators: true,
			availableDiscriminators: available,
		};
	}

	// Security: Validate mode value to prevent path traversal
	if (!isValidPathComponent(mode)) {
		return {
			error: `Error: Invalid mode value '${mode}' - contains invalid characters`,
		};
	}

	// Validate mode
	const modeFile = `mode_${toSnakeCase(mode)}.ts`;
	const filePath = join(nodeDir, targetVersion, modeFile);

	// Security: Final path validation - ensure we're still within nodeDir
	if (!validatePathWithinBase(filePath, nodeDir)) {
		return {
			error: 'Error: Invalid path - path traversal detected',
		};
	}

	if (!existsSync(filePath)) {
		return {
			error: `Error: Invalid mode '${mode}' for node '${nodeId}'. Available: ${available.modes?.join(', ')}`,
		};
	}

	return { filePath };
}

/**
 * Try to resolve file path for a specific node ID
 * This is the core resolution logic used by getNodeFilePath
 */
function tryGetNodeFilePath(
	nodeId: string,
	version: string | undefined,
	nodeDefinitionDirs: string[] | undefined,
	discriminators: { resource?: string; operation?: string; mode?: string } | undefined,
): PathResolutionResult {
	const parsed = parseNodeId(nodeId);
	if (!parsed) {
		return { error: `Invalid node ID format: '${nodeId}'` };
	}

	// Security: Validate parsed components to prevent path traversal
	if (!isValidPathComponent(parsed.packageName)) {
		return {
			error: `Error: Invalid package name in node ID '${nodeId}' - contains invalid characters`,
		};
	}
	if (!isValidPathComponent(parsed.nodeName)) {
		return {
			error: `Error: Invalid node name in node ID '${nodeId}' - contains invalid characters`,
		};
	}

	const nodesPaths = getGeneratedNodesPaths(nodeDefinitionDirs);
	const found = findNodeDir(parsed, nodesPaths);

	if (!found) {
		return {
			error: `Node type '${nodeId}' not found. Use search_node to find the correct node ID.`,
		};
	}

	const { nodesPath, nodeDir } = found;

	// Security: Final path validation - ensure we're still within nodesPath
	if (!validatePathWithinBase(nodeDir, nodesPath)) {
		return { error: 'Error: Invalid path - path traversal detected' };
	}

	let targetVersion = version;

	// If no version specified, find the latest version
	if (!targetVersion) {
		const versions = getNodeVersions(nodeId, nodeDefinitionDirs);
		if (versions.length === 0) {
			return { error: `No versions found for node '${nodeId}'` };
		}
		targetVersion = versions[0]; // Latest version (sorted descending)
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
		const available = getAvailableDiscriminators(nodeDir, targetVersion);

		// Handle resource/operation pattern
		if (available.resources && available.resources.length > 0) {
			return resolveResourceOperationPath(
				nodeDir,
				targetVersion,
				nodeId,
				available,
				discriminators,
			);
		}

		// Handle mode pattern
		if (available.modes && available.modes.length > 0) {
			return resolveModePath(nodeDir, targetVersion, nodeId, available, discriminators?.mode);
		}

		// Split structure exists but no recognized discriminator directories
		return {
			error: `Error: Node '${nodeId}' has split structure but no recognized discriminators found`,
		};
	}

	// Flat file structure
	const filePath = join(nodeDir, `${targetVersion}.ts`);

	if (!existsSync(filePath)) {
		return { error: `Version '${version}' not found for node '${nodeId}'` };
	}

	return { filePath };
}

/**
 * Get the file path for a node ID, optionally for a specific version and discriminators
 * If no version specified, returns the latest version
 * If node uses split structure, discriminators are required
 *
 * For tool variants (e.g., "googleCalendarTool"), falls back to the base node
 * (e.g., "googleCalendar") since tool variants don't have separate type files.
 */
function getNodeFilePath(
	nodeId: string,
	version?: string,
	nodeDefinitionDirs?: string[],
	discriminators?: { resource?: string; operation?: string; mode?: string },
): PathResolutionResult {
	// Try exact node ID first
	let result = tryGetNodeFilePath(nodeId, version, nodeDefinitionDirs, discriminators);

	// If not found and node name ends with 'Tool', try base node as fallback
	// (e.g., n8n-nodes-base.googleCalendarTool -> n8n-nodes-base.googleCalendar)
	// Note: Some nodes legitimately end in Tool (agentTool, mcpClientTool) but those
	// have their own type files, so this fallback only triggers when no file is found
	if (result.error && nodeId.endsWith('Tool')) {
		const baseNodeId = nodeId.slice(0, -4);
		result = tryGetNodeFilePath(baseNodeId, version, nodeDefinitionDirs, discriminators);
	}

	return result;
}

/**
 * Get the type definition for a single node ID, optionally for a specific version and discriminators
 */
function getNodeTypeDefinition(
	nodeId: string,
	version?: string,
	nodeDefinitionDirs?: string[],
	discriminators?: { resource?: string; operation?: string; mode?: string },
): {
	nodeId: string;
	version?: string;
	content: string;
	availableVersions?: string[];
	error?: string;
} {
	// Check if any types directory exists
	const nodesPaths = getGeneratedNodesPaths(nodeDefinitionDirs);
	const anyDirExists = nodesPaths.some((p) => existsSync(p));
	if (!anyDirExists) {
		const errorMsg = nodeDefinitionDirs
			? 'Node types directory not found in any of the configured dirs. Types may not have been generated yet.'
			: 'Node types not found. The generated types directory does not exist. Ensure the application has started properly and types have been generated.';
		return {
			nodeId,
			content: '',
			error: errorMsg,
		};
	}

	const pathResult = getNodeFilePath(nodeId, version, nodeDefinitionDirs, discriminators);

	if (pathResult.error) {
		const availableVersions = getNodeVersions(nodeId, nodeDefinitionDirs);
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
		const content = readFileSync(pathResult.filePath, 'utf-8');

		// Extract version from file path - handles both flat (v1.ts) and split (v1/...) structures
		const actualVersion = pathResult.filePath.match(/\/(v\d+)(?:\/|\.ts)/)?.[1];

		return { nodeId, version: actualVersion, content };
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
export interface CodeBuilderGetToolOptions {
	/**
	 * Ordered list of directories to search for built-in node definitions.
	 */
	nodeDefinitionDirs?: string[];
}

/**
 * Create the simplified node get tool for code builder
 * Accepts a list of node IDs (with optional versions) and returns all type definitions in a single call
 */
export function createCodeBuilderGetTool(options: CodeBuilderGetToolOptions = {}) {
	const { nodeDefinitionDirs } = options;

	return tool(
		async (input: { nodeIds: NodeRequest[] }) => {
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

				const result = getNodeTypeDefinition(nodeId, version, nodeDefinitionDirs, discriminators);
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

			return response;
		},
		{
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

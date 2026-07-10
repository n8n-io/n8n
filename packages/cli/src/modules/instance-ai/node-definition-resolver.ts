/**
 * Node type definition resolver.
 *
 * Resolves TypeScript type definitions for nodes from dist/node-definitions/ directories.
 * Ported from ai-workflow-builder.ee/code-builder/tools/code-builder-get.tool.ts —
 * pure functions without LangChain dependencies.
 */

import { parseNodeId, toSnakeCase, isValidPathComponent } from '@n8n/ai-utilities/node-catalog';
import { safeJoinPath } from '@n8n/backend-common';
import { BUILTIN_NODES_PACKAGES } from '@n8n/constants';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname } from 'node:path';

function getNodesPaths(nodeDefinitionDirs: string[]): string[] {
	return nodeDefinitionDirs.map((dir) => safeJoinPath(dir, 'nodes'));
}

function findNodeDir(
	parsed: { packageName: string; nodeName: string },
	nodesPaths: string[],
): { nodesPath: string; nodeDir: string } | null {
	for (const nodesPath of nodesPaths) {
		try {
			const nodeDir = safeJoinPath(nodesPath, parsed.packageName, parsed.nodeName);
			if (existsSync(nodeDir)) return { nodesPath, nodeDir };
		} catch {
			continue;
		}
	}
	// Tool variant fallback: e.g. "httpRequestTool" -> "httpRequest"
	if (parsed.nodeName.endsWith('Tool')) {
		const baseName = parsed.nodeName.slice(0, -4);
		for (const nodesPath of nodesPaths) {
			try {
				const nodeDir = safeJoinPath(nodesPath, parsed.packageName, baseName);
				if (existsSync(nodeDir)) return { nodesPath, nodeDir };
			} catch {
				continue;
			}
		}
	}
	return null;
}

function getNodeVersions(nodeId: string, nodeDefinitionDirs: string[]): string[] {
	const parsed = parseNodeId(nodeId);
	if (!parsed) return [];

	const nodesPaths = getNodesPaths(nodeDefinitionDirs);
	const found = findNodeDir(parsed, nodesPaths);
	if (!found) return [];

	try {
		const entries = readdirSync(found.nodeDir, { withFileTypes: true });
		const versions: string[] = [];

		for (const entry of entries) {
			if (
				entry.isFile() &&
				entry.name.startsWith('v') &&
				entry.name.endsWith('.ts') &&
				entry.name !== 'index.ts' &&
				!entry.name.endsWith('.schema.js')
			) {
				versions.push(entry.name.replace('.ts', ''));
			} else if (entry.isDirectory() && /^v\d+$/.test(entry.name)) {
				versions.push(entry.name);
			}
		}

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

interface PathResolutionResult {
	filePath?: string;
	/** All mode variants, returned when a mode-split node is requested without a mode. */
	modeVariants?: Array<{ mode: string; filePath: string }>;
	error?: string;
}

function tryResolveNodeFilePath(
	nodeId: string,
	version: string | undefined,
	nodeDefinitionDirs: string[],
	discriminators?: { resource?: string; operation?: string; mode?: string },
): PathResolutionResult {
	const parsed = parseNodeId(nodeId);
	if (!parsed) return { error: `Invalid node ID format: '${nodeId}'` };

	if (!isValidPathComponent(parsed.packageName) || !isValidPathComponent(parsed.nodeName)) {
		return { error: `Invalid node ID: '${nodeId}'` };
	}

	const nodesPaths = getNodesPaths(nodeDefinitionDirs);
	const found = findNodeDir(parsed, nodesPaths);
	if (!found) {
		return {
			error: `Node type '${nodeId}' not found. Use search-nodes to find the correct node ID.`,
		};
	}

	try {
		return resolveFilePath(nodeId, version, found.nodeDir, nodeDefinitionDirs, discriminators);
	} catch {
		return { error: 'Invalid path - path traversal detected' };
	}
}

function resolveResourceOperationFile(
	nodeId: string,
	nodeDir: string,
	targetVersion: string,
	resources: string[],
	discriminators?: { resource?: string; operation?: string },
): PathResolutionResult {
	if (!discriminators?.resource || !discriminators?.operation) {
		// Full resource-to-operations map so the retry succeeds in one shot.
		const index = resources
			.map((resource) => {
				try {
					const ops = readdirSync(
						safeJoinPath(nodeDir, targetVersion, `resource_${toSnakeCase(resource)}`),
					)
						.filter((f) => f.startsWith('operation_') && f.endsWith('.ts'))
						.map((f) => f.replace('operation_', '').replace('.ts', ''));
					return `${resource} (${ops.join(', ')})`;
				} catch {
					return resource;
				}
			})
			.join('; ');
		return {
			error: `Node '${nodeId}' requires resource and operation discriminators. Available resource (operations): ${index}.`,
		};
	}
	if (
		!isValidPathComponent(discriminators.resource) ||
		!isValidPathComponent(discriminators.operation)
	) {
		return { error: 'Invalid discriminator value' };
	}

	const resourceDir = safeJoinPath(
		nodeDir,
		targetVersion,
		`resource_${toSnakeCase(discriminators.resource)}`,
	);
	if (!existsSync(resourceDir)) {
		return {
			error: `Invalid resource '${discriminators.resource}' for node '${nodeId}'. Available: ${resources.join(', ')}`,
		};
	}

	const filePath = safeJoinPath(
		nodeDir,
		targetVersion,
		`resource_${toSnakeCase(discriminators.resource)}`,
		`operation_${toSnakeCase(discriminators.operation)}.ts`,
	);
	if (!existsSync(filePath)) {
		const ops = readdirSync(resourceDir)
			.filter((f) => f.startsWith('operation_') && f.endsWith('.ts'))
			.map((f) => f.replace('operation_', '').replace('.ts', ''));
		return {
			error: `Invalid operation '${discriminators.operation}' for resource '${discriminators.resource}'. Available: ${ops.join(', ')}`,
		};
	}
	return { filePath };
}

function resolveModeFile(
	nodeId: string,
	nodeDir: string,
	targetVersion: string,
	modes: string[],
	discriminators?: { mode?: string },
): PathResolutionResult {
	if (!discriminators?.mode) {
		// All variants instead of an error: mode-split nodes have few, small variants.
		const variants = [...modes]
			.sort()
			.map((mode) => ({
				mode,
				filePath: safeJoinPath(nodeDir, targetVersion, `mode_${toSnakeCase(mode)}.ts`),
			}))
			.filter((variant) => existsSync(variant.filePath));
		if (variants.length > 0) return { modeVariants: variants };
		return {
			error: `Node '${nodeId}' requires mode discriminator. Available modes: ${modes.join(', ')}.`,
		};
	}
	if (!isValidPathComponent(discriminators.mode)) {
		return { error: 'Invalid mode value' };
	}

	const filePath = safeJoinPath(
		nodeDir,
		targetVersion,
		`mode_${toSnakeCase(discriminators.mode)}.ts`,
	);
	if (!existsSync(filePath)) {
		return {
			error: `Invalid mode '${discriminators.mode}' for node '${nodeId}'. Available: ${modes.join(', ')}`,
		};
	}
	return { filePath };
}

function resolveFilePath(
	nodeId: string,
	version: string | undefined,
	nodeDir: string,
	nodeDefinitionDirs: string[],
	discriminators?: { resource?: string; operation?: string; mode?: string },
): PathResolutionResult {
	let targetVersion = version;
	if (!targetVersion) {
		const versions = getNodeVersions(nodeId, nodeDefinitionDirs);
		if (versions.length === 0) return { error: `No versions found for node '${nodeId}'` };
		targetVersion = versions[0];
	}

	// Normalize version format: "3.1" → "v31", "31" → "v31", "v31" → "v31"
	if (!targetVersion.startsWith('v')) {
		targetVersion = `v${targetVersion.replace('.', '')}`;
	} else {
		targetVersion = `v${targetVersion.slice(1).replace('.', '')}`;
	}

	// Check split vs flat structure
	const versionDir = safeJoinPath(nodeDir, targetVersion);
	const isSplit = existsSync(versionDir) && statSync(versionDir).isDirectory();

	if (isSplit) {
		const entries = readdirSync(versionDir, { withFileTypes: true });
		const resources = entries
			.filter((e) => e.isDirectory() && e.name.startsWith('resource_'))
			.map((e) => e.name.replace('resource_', ''));
		const modes = entries
			.filter((e) => e.isFile() && e.name.startsWith('mode_') && e.name.endsWith('.ts'))
			.map((e) => e.name.replace('mode_', '').replace('.ts', ''));

		if (resources.length > 0) {
			return resolveResourceOperationFile(
				nodeId,
				nodeDir,
				targetVersion,
				resources,
				discriminators,
			);
		}
		if (modes.length > 0) {
			return resolveModeFile(nodeId, nodeDir, targetVersion, modes, discriminators);
		}

		return { error: `Node '${nodeId}' has split structure but no recognized discriminators` };
	}

	// Flat file
	const filePath = safeJoinPath(nodeDir, `${targetVersion}.ts`);
	if (!existsSync(filePath)) {
		return { error: `Version '${version}' not found for node '${nodeId}'` };
	}
	return { filePath };
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface NodeTypeDefinitionResult {
	content: string;
	version?: string;
	error?: string;
}

export interface NodeDiscriminators {
	resources: Array<{ name: string; operations: string[] }>;
}

/**
 * List available resource/operation discriminators for a node.
 * Returns null for flat (non-split) nodes that don't need discriminators.
 */
export function listNodeDiscriminators(
	nodeId: string,
	nodeDefinitionDirs: string[],
): NodeDiscriminators | null {
	const parsed = parseNodeId(nodeId);
	if (!parsed) return null;
	if (!isValidPathComponent(parsed.packageName) || !isValidPathComponent(parsed.nodeName))
		return null;

	const nodesPaths = getNodesPaths(nodeDefinitionDirs);
	const found = findNodeDir(parsed, nodesPaths);
	if (!found) return null;

	const { nodeDir } = found;

	// Find latest version
	const versions = getNodeVersions(nodeId, nodeDefinitionDirs);
	if (versions.length === 0) return null;

	const versionDir = safeJoinPath(nodeDir, versions[0]);
	if (!existsSync(versionDir) || !statSync(versionDir).isDirectory()) return null;

	const entries = readdirSync(versionDir, { withFileTypes: true });
	const resourceDirs = entries.filter((e) => e.isDirectory() && e.name.startsWith('resource_'));

	if (resourceDirs.length === 0) return null;

	const resources = resourceDirs.map((dir) => {
		const resourceName = dir.name.replace('resource_', '');
		const resourcePath = safeJoinPath(versionDir, dir.name);
		const ops = readdirSync(resourcePath)
			.filter((f) => f.startsWith('operation_') && f.endsWith('.ts'))
			.map((f) => f.replace('operation_', '').replace('.ts', ''));
		return { name: resourceName, operations: ops };
	});

	return { resources };
}

/**
 * Resolve and read a TypeScript type definition for a node.
 */
export function resolveNodeTypeDefinition(
	nodeId: string,
	nodeDefinitionDirs: string[],
	options?: { version?: string; resource?: string; operation?: string; mode?: string },
): NodeTypeDefinitionResult {
	const nodesPaths = getNodesPaths(nodeDefinitionDirs);
	if (!nodesPaths.some((p) => existsSync(p))) {
		return {
			content: '',
			error: 'Node types directory not found. Types may not have been generated yet.',
		};
	}

	const discriminators = options
		? { resource: options.resource, operation: options.operation, mode: options.mode }
		: undefined;

	// Try exact node ID first
	let result = tryResolveNodeFilePath(nodeId, options?.version, nodeDefinitionDirs, discriminators);

	// Tool variant fallback: "googleCalendarTool" → "googleCalendar"
	if (result.error && nodeId.endsWith('Tool')) {
		const baseNodeId = nodeId.slice(0, -4);
		result = tryResolveNodeFilePath(
			baseNodeId,
			options?.version,
			nodeDefinitionDirs,
			discriminators,
		);
	}

	if (result.error || (!result.filePath && !result.modeVariants)) {
		return { content: '', error: result.error ?? `Node type '${nodeId}' not found.` };
	}

	try {
		if (result.modeVariants) {
			const sections = result.modeVariants.map(
				(variant) =>
					`// ── mode: ${variant.mode} ──
${readFileSync(variant.filePath, 'utf-8')}`,
			);
			const header = `// No mode discriminator was given — definitions for all ${String(result.modeVariants.length)} modes of '${nodeId}' follow (pass \`mode\` to fetch a single one).`;
			const actualVersion = result.modeVariants[0].filePath.match(/\/(v\d+)(?:\/|\.ts)/)?.[1];
			return { content: [header, ...sections].join('\n\n'), version: actualVersion };
		}
		const filePath = result.filePath!;
		const content = readFileSync(filePath, 'utf-8');
		const actualVersion = filePath.match(/\/(v\d+)(?:\/|\.ts)/)?.[1];
		return { content, version: actualVersion };
	} catch (error) {
		return {
			content: '',
			error: `Error reading node definition for '${nodeId}': ${error instanceof Error ? error.message : 'Unknown error'}`,
		};
	}
}

/**
 * Resolve the built-in node definition directories from installed node packages.
 */
export function resolveBuiltinNodeDefinitionDirs(): string[] {
	const dirs: string[] = [];
	for (const packageId of BUILTIN_NODES_PACKAGES) {
		try {
			const packageJsonPath = require.resolve(`${packageId}/package.json`);
			const distDir = dirname(packageJsonPath);
			const nodeDefsDir = safeJoinPath(distDir, 'dist', 'node-definitions');
			if (existsSync(nodeDefsDir)) {
				dirs.push(nodeDefsDir);
			}
		} catch {
			// Package not installed, skip
		}
	}
	return dirs;
}

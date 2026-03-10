/**
 * Node type definition resolver.
 *
 * Resolves TypeScript type definitions for nodes from dist/node-definitions/ directories.
 * Ported from ai-workflow-builder.ee/code-builder/tools/code-builder-get.tool.ts —
 * pure functions without LangChain dependencies.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ── Security validation ──────────────────────────────────────────────────────

function isValidPathComponent(component: string): boolean {
	if (!component || component.trim() === '') return false;
	if (component.includes('\0')) return false;
	if (component.includes('/') || component.includes('\\')) return false;
	if (component === '..' || component.startsWith('..')) return false;
	return true;
}

function validatePathWithinBase(filePath: string, baseDir: string): boolean {
	const resolvedPath = resolve(filePath);
	const resolvedBase = resolve(baseDir);
	return resolvedPath.startsWith(resolvedBase + '/') || resolvedPath === resolvedBase;
}

// ── Path resolution ──────────────────────────────────────────────────────────

function parseNodeId(nodeId: string): { packageName: string; nodeName: string } | null {
	if (nodeId.startsWith('@n8n/')) {
		const withoutPrefix = nodeId.slice(5);
		const dotIndex = withoutPrefix.indexOf('.');
		if (dotIndex === -1) return null;
		return {
			packageName: withoutPrefix.slice(0, dotIndex),
			nodeName: withoutPrefix.slice(dotIndex + 1),
		};
	}

	const dotIndex = nodeId.indexOf('.');
	if (dotIndex === -1) return null;
	return {
		packageName: nodeId.slice(0, dotIndex),
		nodeName: nodeId.slice(dotIndex + 1),
	};
}

function toSnakeCase(str: string): string {
	return str
		.replace(/([A-Z])/g, '_$1')
		.toLowerCase()
		.replace(/^_/, '')
		.replace(/[-\s]+/g, '_');
}

function getNodesPaths(nodeDefinitionDirs: string[]): string[] {
	return nodeDefinitionDirs.map((dir) => join(dir, 'nodes'));
}

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

	const { nodesPath, nodeDir } = found;
	if (!validatePathWithinBase(nodeDir, nodesPath)) {
		return { error: 'Invalid path - path traversal detected' };
	}

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
	const versionDir = join(nodeDir, targetVersion);
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
			// Resource/operation pattern
			if (!discriminators?.resource || !discriminators?.operation) {
				return {
					error: `Node '${nodeId}' requires resource and operation discriminators. Available resources: ${resources.join(', ')}.`,
				};
			}
			if (
				!isValidPathComponent(discriminators.resource) ||
				!isValidPathComponent(discriminators.operation)
			) {
				return { error: 'Invalid discriminator value' };
			}

			const resourceDir = join(
				nodeDir,
				targetVersion,
				`resource_${toSnakeCase(discriminators.resource)}`,
			);
			if (!existsSync(resourceDir)) {
				return {
					error: `Invalid resource '${discriminators.resource}' for node '${nodeId}'. Available: ${resources.join(', ')}`,
				};
			}

			const filePath = join(resourceDir, `operation_${toSnakeCase(discriminators.operation)}.ts`);
			if (!validatePathWithinBase(filePath, nodeDir)) {
				return { error: 'Invalid path - path traversal detected' };
			}
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

		if (modes.length > 0) {
			// Mode pattern
			if (!discriminators?.mode) {
				return {
					error: `Node '${nodeId}' requires mode discriminator. Available modes: ${modes.join(', ')}.`,
				};
			}
			if (!isValidPathComponent(discriminators.mode)) {
				return { error: 'Invalid mode value' };
			}

			const filePath = join(nodeDir, targetVersion, `mode_${toSnakeCase(discriminators.mode)}.ts`);
			if (!validatePathWithinBase(filePath, nodeDir)) {
				return { error: 'Invalid path - path traversal detected' };
			}
			if (!existsSync(filePath)) {
				return {
					error: `Invalid mode '${discriminators.mode}' for node '${nodeId}'. Available: ${modes.join(', ')}`,
				};
			}
			return { filePath };
		}

		return { error: `Node '${nodeId}' has split structure but no recognized discriminators` };
	}

	// Flat file
	const filePath = join(nodeDir, `${targetVersion}.ts`);
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

	const versionDir = join(nodeDir, versions[0]);
	if (!existsSync(versionDir) || !statSync(versionDir).isDirectory()) return null;

	const entries = readdirSync(versionDir, { withFileTypes: true });
	const resourceDirs = entries.filter((e) => e.isDirectory() && e.name.startsWith('resource_'));

	if (resourceDirs.length === 0) return null;

	const resources = resourceDirs.map((dir) => {
		const resourceName = dir.name.replace('resource_', '');
		const resourcePath = join(versionDir, dir.name);
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

	if (result.error || !result.filePath) {
		return { content: '', error: result.error ?? `Node type '${nodeId}' not found.` };
	}

	try {
		const content = readFileSync(result.filePath, 'utf-8');
		const actualVersion = result.filePath.match(/\/(v\d+)(?:\/|\.ts)/)?.[1];
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
	for (const packageId of ['n8n-nodes-base', '@n8n/n8n-nodes-langchain']) {
		try {
			const packageJsonPath = require.resolve(`${packageId}/package.json`);
			const distDir = join(packageJsonPath, '..'); // dirname
			const nodeDefsDir = join(distDir, 'dist', 'node-definitions');
			if (existsSync(nodeDefsDir)) {
				dirs.push(nodeDefsDir);
			}
		} catch {
			// Package not installed, skip
		}
	}
	return dirs;
}

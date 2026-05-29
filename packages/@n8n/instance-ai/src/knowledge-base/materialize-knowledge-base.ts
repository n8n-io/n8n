import type { Workspace } from '@n8n/agents';
import { join as posixJoin, normalize as posixNormalize } from 'node:path/posix';

import { formatErrorForLog } from '../error-formatting';
import type { Logger } from '../logger';
import { readFileViaSandbox, writeFileViaSandbox } from '../workspace/sandbox-fs';
import {
	type BestPracticeContent,
	type BestPracticeRegistry,
	type BestPracticeSource,
	loadInstanceAiBestPracticeSource,
} from './runtime-best-practices';

export const SANDBOX_KNOWLEDGE_BASE_DIR = 'knowledge-base';
export const BEST_PRACTICE_FILE_NAME = 'BEST_PRACTICE.md';
export const SANDBOX_KB_REGISTRY_FILE = 'registry.json';
export const RUNTIME_KB_MANIFEST_FILE = '.manifest.json';
export const RUNTIME_KB_MANIFEST_SCHEMA_VERSION = 1;
export const N8N_KNOWLEDGE_BASE_DIR_ENV = 'N8N_KNOWLEDGE_BASE_DIR';
export const N8N_WORKSPACE_DIR_ENV = 'N8N_WORKSPACE_DIR';

export function resolveKnowledgeBaseRoot(workspaceRoot: string): string {
	return posixJoin(workspaceRoot, SANDBOX_KNOWLEDGE_BASE_DIR);
}

export function buildDefaultKnowledgeBaseEnv(workspaceRoot: string): NodeJS.ProcessEnv {
	return {
		[N8N_KNOWLEDGE_BASE_DIR_ENV]: resolveKnowledgeBaseRoot(workspaceRoot),
	};
}

export interface MaterializedBestPractice {
	id: string;
	name: string;
	path: string;
	directory: string;
}

export interface MaterializedKnowledgeBase {
	rootDir: string;
	registryPath: string;
	techniques: MaterializedBestPractice[];
	env: NodeJS.ProcessEnv;
	source: BestPracticeSource;
}

export interface KnowledgeBaseWorkspaceManifest {
	schemaVersion: typeof RUNTIME_KB_MANIFEST_SCHEMA_VERSION;
	techniquesHash: string;
}

export interface KnowledgeBaseWorkspaceBundle extends MaterializedKnowledgeBase {
	files: Map<string, string>;
	manifest: KnowledgeBaseWorkspaceManifest;
	manifestPath: string;
	techniquesHash: string;
}

interface BuildKnowledgeBaseWorkspaceBundleOptions {
	source: BestPracticeSource;
	root: string;
	workspaceRoot?: string;
	knowledgeBaseRoot?: string;
	logger?: Logger;
}

interface MaterializeKnowledgeBaseOptions {
	source: BestPracticeSource;
	workspace: Workspace;
	root: string;
	logger?: Logger;
}

interface PrebakedKnowledgeBaseOptions {
	source: BestPracticeSource;
	workspace: Workspace;
	root: string;
	workspaceRoot?: string;
	logger?: Logger;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function withTrailingNewline(content: string): string {
	return content.endsWith('\n') ? content : `${content}\n`;
}

function safeTechniqueDirectory(techniqueId: string): string {
	if (
		!techniqueId ||
		techniqueId.includes('\0') ||
		techniqueId.includes('\\') ||
		techniqueId.startsWith('/')
	) {
		throw new Error(`Invalid knowledge-base technique directory for "${techniqueId}"`);
	}

	const normalized = posixNormalize(techniqueId);
	if (
		normalized === '.' ||
		normalized === '..' ||
		normalized.startsWith('../') ||
		normalized.split('/').includes('..')
	) {
		throw new Error(`Knowledge-base technique directory escapes root for "${techniqueId}"`);
	}

	return normalized;
}

function materializedTechniqueDirectory(knowledgeBaseRoot: string, techniqueId: string): string {
	return posixJoin(knowledgeBaseRoot, safeTechniqueDirectory(techniqueId));
}

function addFrontmatterField(lines: string[], key: string, value: unknown): void {
	if (value === undefined) return;
	if (typeof value === 'string' && value.length === 0) return;

	const serialized = JSON.stringify(value);
	if (serialized) {
		lines.push(`${key}: ${serialized}`);
	}
}

function renderBestPracticeMarkdown(content: BestPracticeContent): string {
	const lines = ['---'];
	addFrontmatterField(lines, 'technique', content.id);
	addFrontmatterField(lines, 'name', content.name);
	addFrontmatterField(lines, 'description', content.description);
	addFrontmatterField(lines, 'version', content.version);
	lines.push('---', '');

	return withTrailingNewline(`${lines.join('\n')}\n${content.documentation.trim()}`);
}

function materializedRegistry(
	registry: BestPracticeRegistry,
	materialized: MaterializedBestPractice[],
): BestPracticeRegistry {
	const materializedById = new Map(materialized.map((technique) => [technique.id, technique]));

	return {
		...registry,
		techniques: registry.techniques
			.map((entry) => {
				const technique = materializedById.get(entry.id);
				if (!technique) return entry;

				return {
					...entry,
					path: technique.path,
					directory: technique.directory,
				};
			})
			.sort((left, right) => left.id.localeCompare(right.id)),
	};
}

function parseKnowledgeBaseWorkspaceManifest(raw: string): KnowledgeBaseWorkspaceManifest | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}

	if (!isRecord(parsed)) return null;
	if (parsed.schemaVersion !== RUNTIME_KB_MANIFEST_SCHEMA_VERSION) return null;
	if (typeof parsed.techniquesHash !== 'string' || parsed.techniquesHash.length === 0) return null;

	return {
		schemaVersion: RUNTIME_KB_MANIFEST_SCHEMA_VERSION,
		techniquesHash: parsed.techniquesHash,
	};
}

async function writeWorkspaceFile(
	workspace: Workspace,
	filePath: string,
	content: string,
	logger?: Logger,
): Promise<void> {
	if (workspace.filesystem) {
		try {
			await workspace.filesystem.writeFile(filePath, content, { recursive: true });
			return;
		} catch (error) {
			try {
				await writeFileViaSandbox(workspace, filePath, content);
				logger?.warn('Sandbox knowledge-base filesystem write failed; used command fallback', {
					path: filePath,
					error: formatErrorForLog(error),
				});
				return;
			} catch (fallbackError) {
				throw new Error(
					`Failed to write knowledge-base file "${filePath}": ${formatErrorForLog(error)}; command fallback failed: ${formatErrorForLog(fallbackError)}`,
				);
			}
		}
	}

	try {
		await writeFileViaSandbox(workspace, filePath, content);
	} catch (error) {
		throw new Error(
			`Failed to write knowledge-base file "${filePath}": ${formatErrorForLog(error)}`,
		);
	}
}

async function readWorkspaceFile(
	workspace: Workspace,
	filePath: string,
	logger?: Logger,
): Promise<string | null> {
	if (workspace.filesystem) {
		try {
			const content = await workspace.filesystem.readFile(filePath, { encoding: 'utf-8' });
			return Buffer.isBuffer(content) ? content.toString('utf-8') : content;
		} catch (error) {
			logger?.debug('Sandbox knowledge-base manifest filesystem read missed', {
				path: filePath,
				error: formatErrorForLog(error),
			});
			return null;
		}
	}

	if (!workspace.sandbox) return null;

	try {
		return await readFileViaSandbox(workspace, filePath);
	} catch (error) {
		logger?.debug('Sandbox knowledge-base manifest command read missed', {
			path: filePath,
			error: formatErrorForLog(error),
		});
		return null;
	}
}

export async function buildKnowledgeBaseWorkspaceBundle({
	source,
	root,
	workspaceRoot = root,
	knowledgeBaseRoot = resolveKnowledgeBaseRoot(root),
}: BuildKnowledgeBaseWorkspaceBundleOptions): Promise<KnowledgeBaseWorkspaceBundle | undefined> {
	if (source.registry.techniques.length === 0) return undefined;

	const files = new Map<string, string>();

	const materialized = await Promise.all(
		source.registry.techniques.map(async (entry): Promise<MaterializedBestPractice> => {
			const content = await source.loadTechnique(entry.id);
			if (!content) {
				throw new Error(
					`Knowledge-base technique "${entry.id}" is registered but cannot be loaded`,
				);
			}

			const directory = materializedTechniqueDirectory(knowledgeBaseRoot, content.id);
			const path = posixJoin(directory, BEST_PRACTICE_FILE_NAME);
			const markdown = renderBestPracticeMarkdown(content);
			files.set(path, markdown);

			return { id: content.id, name: content.name, path, directory };
		}),
	);

	const registry = materializedRegistry(source.registry, materialized);
	const registryPath = posixJoin(knowledgeBaseRoot, SANDBOX_KB_REGISTRY_FILE);
	files.set(registryPath, `${JSON.stringify(registry, null, 2)}\n`);

	const manifest: KnowledgeBaseWorkspaceManifest = {
		schemaVersion: RUNTIME_KB_MANIFEST_SCHEMA_VERSION,
		techniquesHash: source.registry.techniquesHash,
	};
	const manifestPath = posixJoin(knowledgeBaseRoot, RUNTIME_KB_MANIFEST_FILE);
	files.set(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

	const env: NodeJS.ProcessEnv = {
		[N8N_WORKSPACE_DIR_ENV]: workspaceRoot,
		[N8N_KNOWLEDGE_BASE_DIR_ENV]: knowledgeBaseRoot,
	};

	return {
		rootDir: knowledgeBaseRoot,
		registryPath,
		techniques: materialized,
		env,
		source,
		files,
		manifest,
		manifestPath,
		techniquesHash: source.registry.techniquesHash,
	};
}

export async function materializeKnowledgeBaseIntoWorkspace({
	source,
	workspace,
	root,
	logger,
}: MaterializeKnowledgeBaseOptions): Promise<MaterializedKnowledgeBase | undefined> {
	logger?.info('[instance-ai knowledge-base] Materializing knowledge-base into sandbox', {
		root,
		techniqueCount: source.registry.techniques.length,
		techniqueIds: source.registry.techniques.map((technique) => technique.id),
		techniquesHash: source.registry.techniquesHash,
	});

	const bundle = await buildKnowledgeBaseWorkspaceBundle({ source, root, logger });
	if (!bundle) {
		logger?.info('[instance-ai knowledge-base] No knowledge-base bundle to write', { root });
		return undefined;
	}

	await Promise.all(
		[...bundle.files].map(async ([filePath, content]) => {
			await writeWorkspaceFile(workspace, filePath, content, logger);
		}),
	);

	logger?.info('[instance-ai knowledge-base] Wrote knowledge-base files into sandbox', {
		root,
		knowledgeBaseRoot: bundle.rootDir,
		registryPath: bundle.registryPath,
		manifestPath: bundle.manifestPath,
		techniquesHash: bundle.techniquesHash,
		fileCount: bundle.files.size,
		filePaths: [...bundle.files.keys()].sort(),
		techniqueIds: bundle.techniques.map((technique) => technique.id),
	});

	return bundle;
}

export async function createPrebakedKnowledgeBaseFromWorkspace({
	source,
	workspace,
	root,
	workspaceRoot = root,
	logger,
}: PrebakedKnowledgeBaseOptions): Promise<KnowledgeBaseWorkspaceBundle | undefined> {
	if (source.registry.techniques.length === 0) return undefined;

	const knowledgeBaseRoot = resolveKnowledgeBaseRoot(root);
	const manifestPath = posixJoin(knowledgeBaseRoot, RUNTIME_KB_MANIFEST_FILE);
	const manifestRaw = await readWorkspaceFile(workspace, manifestPath, logger);
	if (!manifestRaw) {
		logger?.info('[instance-ai knowledge-base] No prebaked manifest found; will materialize live', {
			root,
			manifestPath,
		});
		return undefined;
	}

	const manifest = parseKnowledgeBaseWorkspaceManifest(manifestRaw);
	if (!manifest) {
		logger?.info(
			'[instance-ai knowledge-base] Ignoring invalid prebaked manifest; will materialize live',
			{
				manifestPath,
			},
		);
		return undefined;
	}

	if (manifest.techniquesHash !== source.registry.techniquesHash) {
		logger?.info(
			'[instance-ai knowledge-base] Ignoring stale prebaked manifest; will materialize live',
			{
				manifestPath,
				expectedTechniquesHash: source.registry.techniquesHash,
				actualTechniquesHash: manifest.techniquesHash,
			},
		);
		return undefined;
	}

	const bundle = await buildKnowledgeBaseWorkspaceBundle({
		source,
		root,
		workspaceRoot,
		knowledgeBaseRoot,
		logger,
	});
	if (!bundle) return undefined;

	logger?.info('[instance-ai knowledge-base] Using prebaked knowledge-base from sandbox', {
		root,
		workspaceRoot,
		knowledgeBaseRoot: bundle.rootDir,
		registryPath: bundle.registryPath,
		techniquesHash: bundle.techniquesHash,
		techniqueIds: bundle.techniques.map((technique) => technique.id),
	});

	return bundle;
}

export async function materializeBuilderKnowledgeBase(
	workspace: Workspace,
	root: string,
	logger?: Logger,
): Promise<{ workspace: Workspace; materialized?: MaterializedKnowledgeBase }> {
	const source = loadInstanceAiBestPracticeSource();
	logger?.info('[instance-ai knowledge-base] Starting builder knowledge-base seed', {
		root,
		techniqueCount: source.registry.techniques.length,
		techniqueIds: source.registry.techniques.map((technique) => technique.id),
		techniquesHash: source.registry.techniquesHash,
		knowledgeBaseRoot: resolveKnowledgeBaseRoot(root),
	});

	if (source.registry.techniques.length === 0) {
		logger?.info('[instance-ai knowledge-base] Skipping seed; no techniques registered', { root });
		return { workspace };
	}

	let bundle: KnowledgeBaseWorkspaceBundle | undefined;
	try {
		bundle = await createPrebakedKnowledgeBaseFromWorkspace({
			source,
			workspace,
			root,
			logger,
		});
	} catch (error) {
		logger?.warn('[instance-ai knowledge-base] Prebaked inspection failed; materializing live', {
			root,
			error: error instanceof Error ? error.message : String(error),
		});
	}

	if (bundle) {
		logger?.info('[instance-ai knowledge-base] Builder seed complete (prebaked)', {
			root,
			knowledgeBaseRoot: bundle.rootDir,
			techniqueIds: bundle.techniques.map((technique) => technique.id),
		});
		return {
			workspace,
			materialized: bundle,
		};
	}

	const materialized = await materializeKnowledgeBaseIntoWorkspace({
		source,
		workspace,
		root,
		logger,
	});

	if (!materialized) {
		logger?.info(
			'[instance-ai knowledge-base] Builder seed produced no materialized knowledge-base',
			{
				root,
			},
		);
		return { workspace };
	}

	logger?.info('[instance-ai knowledge-base] Builder seed complete (live write)', {
		root,
		knowledgeBaseRoot: materialized.rootDir,
		techniqueIds: materialized.techniques.map((technique) => technique.id),
	});

	return { workspace, materialized };
}

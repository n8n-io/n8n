import {
	bestPracticesRegistry,
	TechniqueDescription,
	WorkflowTechnique,
	type WorkflowTechniqueType as BestPracticesGuideId,
} from '@n8n/workflow-sdk/prompts/best-practices';
import { join as posixJoin } from 'node:path/posix';

import type { Logger } from '../logger';
import {
	buildTemplatesIndexFromArchive,
	KNOWLEDGE_BASE_TEMPLATES_DIR,
	type KnowledgeBaseTemplateEntry,
} from './build-templates-index';
export { KNOWLEDGE_BASE_TEMPLATES_DIR };
import { extractBuilderTemplatesArchive } from './extract-builder-templates-archive';
import { computeWorkspaceContentHash } from '../workspace/compute-workspace-content-hash';
import {
	loadPrebakedWorkspaceBundle,
	materializeWorkspaceBundle,
} from '../workspace/prebaked-workspace-bundle';
import type { SandboxWorkspace } from '../workspace/sandbox-fs';
import { stringifyWorkspaceJson, withTrailingNewline } from '../workspace/workspace-file-content';
import { WORKSPACE_MANIFEST_FILE } from '../workspace/workspace-manifest';

export const SANDBOX_KNOWLEDGE_BASE_DIR = 'knowledge-base';
export const KNOWLEDGE_BASE_BEST_PRACTICES_DIR = 'best-practices';
export const KNOWLEDGE_BASE_INDEX_FILE = 'index.json';
export const KNOWLEDGE_BASE_MANIFEST_FILE = WORKSPACE_MANIFEST_FILE;
export const KNOWLEDGE_BASE_MANIFEST_SCHEMA_VERSION = 4;

export interface KnowledgeBaseIndexEntry {
	id: BestPracticesGuideId;
	description: string;
	hasDocumentation: boolean;
	file?: string;
	version?: string;
}

export interface KnowledgeBaseBestPracticesIndex {
	entries: KnowledgeBaseIndexEntry[];
}

export interface KnowledgeBaseRootIndex {
	bestPractices: {
		indexFile: string;
		entries: KnowledgeBaseIndexEntry[];
	};
	templates: {
		indexFile: string;
		entries: KnowledgeBaseTemplateEntry[];
	};
}

export interface KnowledgeBaseWorkspaceManifest {
	schemaVersion: typeof KNOWLEDGE_BASE_MANIFEST_SCHEMA_VERSION;
	contentHash: string;
}

export interface KnowledgeBaseWorkspaceBundle {
	rootDir: string;
	manifestPath: string;
	indexPath: string;
	files: Map<string, string>;
	contentHash: string;
}

export interface BuildKnowledgeBaseWorkspaceBundleOptions {
	root: string;
	templatesArchive?: Buffer | null;
	logger?: Logger;
}

interface MaterializeKnowledgeBaseOptions extends BuildKnowledgeBaseWorkspaceBundleOptions {
	workspace: SandboxWorkspace;
}

function addTemplatesToKnowledgeBaseFiles(
	files: Map<string, string>,
	rootDir: string,
	templatesArchive: Buffer,
	logger?: Logger,
): KnowledgeBaseTemplateEntry[] {
	const extracted = extractBuilderTemplatesArchive(templatesArchive);
	if (!extracted) {
		logger?.warn('[knowledge-base] rejected templates archive during bundle build', {
			archiveBytes: templatesArchive.byteLength,
		});
		return [];
	}

	const templatesIndex = buildTemplatesIndexFromArchive(extracted);
	const templatesDir = posixJoin(rootDir, KNOWLEDGE_BASE_TEMPLATES_DIR);

	for (const [name, content] of extracted) {
		if (!name.endsWith('.ts')) continue;
		files.set(posixJoin(templatesDir, name), withTrailingNewline(content));
	}

	const templatesIndexPath = posixJoin(templatesDir, KNOWLEDGE_BASE_INDEX_FILE);
	files.set(templatesIndexPath, stringifyWorkspaceJson(templatesIndex));

	// The decompressed archive has been copied into `files`; release the
	// intermediate map so the duplicate copy isn't held until GC.
	extracted.clear();

	return templatesIndex.entries;
}

export function buildKnowledgeBaseWorkspaceBundle(
	options: BuildKnowledgeBaseWorkspaceBundleOptions,
): KnowledgeBaseWorkspaceBundle {
	const { root, templatesArchive = null, logger } = options;
	const rootDir = posixJoin(root, SANDBOX_KNOWLEDGE_BASE_DIR);
	const files = new Map<string, string>();
	const bestPracticeEntries: KnowledgeBaseIndexEntry[] = [];

	for (const guideId of Object.values(WorkflowTechnique)) {
		const doc = bestPracticesRegistry[guideId];
		const description = TechniqueDescription[guideId];
		const entry: KnowledgeBaseIndexEntry = {
			id: guideId,
			description,
			hasDocumentation: Boolean(doc),
		};

		if (doc) {
			const relativeFilePath = posixJoin(KNOWLEDGE_BASE_BEST_PRACTICES_DIR, `${guideId}.md`);
			files.set(posixJoin(rootDir, relativeFilePath), withTrailingNewline(doc.getDocumentation()));
			entry.file = relativeFilePath;
			entry.version = doc.version;
		}

		bestPracticeEntries.push(entry);
	}

	const bestPracticesIndexPath = posixJoin(
		rootDir,
		KNOWLEDGE_BASE_BEST_PRACTICES_DIR,
		KNOWLEDGE_BASE_INDEX_FILE,
	);
	const bestPracticesIndex: KnowledgeBaseBestPracticesIndex = { entries: bestPracticeEntries };
	files.set(bestPracticesIndexPath, stringifyWorkspaceJson(bestPracticesIndex));

	const templateEntries = templatesArchive
		? addTemplatesToKnowledgeBaseFiles(files, rootDir, templatesArchive, logger)
		: [];

	const rootIndexPath = posixJoin(rootDir, KNOWLEDGE_BASE_INDEX_FILE);
	const rootIndex: KnowledgeBaseRootIndex = {
		bestPractices: {
			indexFile: posixJoin(KNOWLEDGE_BASE_BEST_PRACTICES_DIR, KNOWLEDGE_BASE_INDEX_FILE),
			entries: bestPracticeEntries,
		},
		templates: {
			indexFile: posixJoin(KNOWLEDGE_BASE_TEMPLATES_DIR, KNOWLEDGE_BASE_INDEX_FILE),
			entries: templateEntries,
		},
	};
	files.set(rootIndexPath, stringifyWorkspaceJson(rootIndex));

	const manifestPath = posixJoin(rootDir, KNOWLEDGE_BASE_MANIFEST_FILE);
	const contentHash = computeWorkspaceContentHash(files);
	const manifest: KnowledgeBaseWorkspaceManifest = {
		schemaVersion: KNOWLEDGE_BASE_MANIFEST_SCHEMA_VERSION,
		contentHash,
	};
	files.set(manifestPath, stringifyWorkspaceJson(manifest));

	return {
		rootDir,
		manifestPath,
		indexPath: rootIndexPath,
		files,
		contentHash,
	};
}

const KNOWLEDGE_BASE_FILE_LABEL = 'Knowledge base file';

export async function loadPrebakedKnowledgeBaseBundle(
	options: MaterializeKnowledgeBaseOptions,
): Promise<KnowledgeBaseWorkspaceBundle | undefined> {
	const bundle = buildKnowledgeBaseWorkspaceBundle(options);

	return await loadPrebakedWorkspaceBundle({
		workspace: options.workspace,
		manifestPath: bundle.manifestPath,
		expectedHash: bundle.contentHash,
		hashField: 'contentHash',
		schemaVersion: KNOWLEDGE_BASE_MANIFEST_SCHEMA_VERSION,
		resourceLabel: KNOWLEDGE_BASE_FILE_LABEL,
		logger: options.logger,
		invalidManifestLogMessage: 'Ignoring invalid prebaked knowledge base manifest',
		staleManifestLogMessage: 'Ignoring stale prebaked knowledge base manifest',
		staleManifestLogKeys: {
			expected: 'expectedContentHash',
			actual: 'actualContentHash',
		},
		successLogMessage: 'Using prebaked knowledge base from workspace',
		successLogContext: (loadedBundle) => ({
			root: options.root,
			knowledgeBaseRoot: loadedBundle.rootDir,
			contentHash: loadedBundle.contentHash,
			fileCount: loadedBundle.files.size,
		}),
		buildBundle: () => bundle,
	});
}

export async function materializeKnowledgeBaseIntoWorkspace(
	options: MaterializeKnowledgeBaseOptions,
): Promise<KnowledgeBaseWorkspaceBundle> {
	return await materializeWorkspaceBundle({
		workspace: options.workspace,
		resourceLabel: KNOWLEDGE_BASE_FILE_LABEL,
		logger: options.logger,
		loadPrebaked: async () => await loadPrebakedKnowledgeBaseBundle(options),
		buildBundle: () => buildKnowledgeBaseWorkspaceBundle(options),
		materializedLogMessage: 'Materialized knowledge base into workspace',
		materializedLogContext: (bundle) => ({
			root: options.root,
			knowledgeBaseRoot: bundle.rootDir,
			contentHash: bundle.contentHash,
			fileCount: bundle.files.size,
		}),
	});
}

export type {
	KnowledgeBaseTemplateEntry,
	KnowledgeBaseTemplatesIndex,
} from './build-templates-index';

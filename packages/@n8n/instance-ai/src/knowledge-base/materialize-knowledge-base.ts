import {
	bestPracticesRegistry,
	TechniqueDescription,
	WorkflowTechnique,
	type WorkflowTechniqueType as BestPracticesGuideId,
} from '@n8n/workflow-sdk/prompts/best-practices';
import { SDK_LANGUAGE_REFERENCE } from '@n8n/workflow-sdk/prompts/sdk-reference';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
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
export const KNOWLEDGE_BASE_REFERENCE_DIR = 'reference';
export const KNOWLEDGE_BASE_INDEX_FILE = 'index.json';
export const INSTANCE_AI_KNOWLEDGE_BASE_SOURCE_DIR = resolve(
	__dirname,
	'..',
	'..',
	'knowledge-base',
);
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

export interface KnowledgeBaseReferenceIndexEntry {
	id: string;
	description: string;
	file: string;
}

export interface KnowledgeBaseReferenceIndex {
	entries: KnowledgeBaseReferenceIndexEntry[];
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
	reference: {
		indexFile: string;
		entries: KnowledgeBaseReferenceIndexEntry[];
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

const KNOWLEDGE_BASE_REFERENCE_ENTRIES: Array<
	Pick<KnowledgeBaseReferenceIndexEntry, 'id' | 'description'> & {
		fileName: string;
		/** When set, content comes from this string instead of a source file. */
		content?: string;
	}
> = [
	{
		id: 'trigger-input-data-shapes',
		description:
			'Per-trigger inputData shapes for verify-built-workflow and executions(action="run")',
		fileName: 'trigger-input-data-shapes.md',
	},
	{
		id: 'workflow-builder-guardrails',
		description:
			'Workflow builder guardrails for source preservation, fan-out/fan-in, effects, and Code nodes',
		fileName: 'workflow-builder-guardrails.md',
	},
	{
		id: 'workflow-sdk-language',
		description:
			'Allowed/forbidden constructs in workflow SDK builder code: methods, globals, language subset',
		fileName: 'workflow-sdk-language.md',
		content: SDK_LANGUAGE_REFERENCE,
	},
];

async function addReferenceFilesToKnowledgeBase(
	files: Map<string, string>,
	rootDir: string,
): Promise<KnowledgeBaseReferenceIndexEntry[]> {
	const referenceSourceDir = join(
		INSTANCE_AI_KNOWLEDGE_BASE_SOURCE_DIR,
		KNOWLEDGE_BASE_REFERENCE_DIR,
	);
	const referenceEntries: KnowledgeBaseReferenceIndexEntry[] = [];

	for (const entry of KNOWLEDGE_BASE_REFERENCE_ENTRIES) {
		const relativeFilePath = posixJoin(KNOWLEDGE_BASE_REFERENCE_DIR, entry.fileName);
		const content =
			entry.content ?? (await readFile(join(referenceSourceDir, entry.fileName), 'utf-8'));
		files.set(posixJoin(rootDir, relativeFilePath), withTrailingNewline(content));
		referenceEntries.push({
			id: entry.id,
			description: entry.description,
			file: relativeFilePath,
		});
	}

	const referenceIndexPath = posixJoin(
		rootDir,
		KNOWLEDGE_BASE_REFERENCE_DIR,
		KNOWLEDGE_BASE_INDEX_FILE,
	);
	const referenceIndex: KnowledgeBaseReferenceIndex = { entries: referenceEntries };
	files.set(referenceIndexPath, stringifyWorkspaceJson(referenceIndex));

	// Guard against unexpected extra files in the source directory during development.
	const sourceFiles = (await readdir(referenceSourceDir)).filter((name) => name.endsWith('.md'));
	const expectedFiles = new Set(KNOWLEDGE_BASE_REFERENCE_ENTRIES.map((entry) => entry.fileName));
	for (const sourceFile of sourceFiles) {
		if (!expectedFiles.has(sourceFile)) {
			throw new Error(
				`Unexpected knowledge-base reference file "${sourceFile}". Add it to KNOWLEDGE_BASE_REFERENCE_ENTRIES.`,
			);
		}
	}

	return referenceEntries;
}

export async function buildKnowledgeBaseWorkspaceBundle(
	options: BuildKnowledgeBaseWorkspaceBundleOptions,
): Promise<KnowledgeBaseWorkspaceBundle> {
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
	const referenceEntries = await addReferenceFilesToKnowledgeBase(files, rootDir);

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
		reference: {
			indexFile: posixJoin(KNOWLEDGE_BASE_REFERENCE_DIR, KNOWLEDGE_BASE_INDEX_FILE),
			entries: referenceEntries,
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
	const bundle = await buildKnowledgeBaseWorkspaceBundle(options);

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
		buildBundle: async () => await buildKnowledgeBaseWorkspaceBundle(options),
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

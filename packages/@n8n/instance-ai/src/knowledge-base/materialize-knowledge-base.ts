import {
	bestPracticesRegistry,
	TechniqueDescription,
	WorkflowTechnique,
	type WorkflowTechniqueType as BestPracticesGuideId,
} from '@n8n/workflow-sdk/prompts/best-practices';
import { join as posixJoin } from 'node:path/posix';

import type { Logger } from '../logger';
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
export const KNOWLEDGE_BASE_MANIFEST_FILE = WORKSPACE_MANIFEST_FILE;
export const KNOWLEDGE_BASE_MANIFEST_SCHEMA_VERSION = 1;

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

interface MaterializeKnowledgeBaseOptions {
	workspace: SandboxWorkspace;
	root: string;
	logger?: Logger;
}

export function buildKnowledgeBaseWorkspaceBundle({
	root,
}: {
	root: string;
}): KnowledgeBaseWorkspaceBundle {
	const rootDir = posixJoin(root, SANDBOX_KNOWLEDGE_BASE_DIR);
	const files = new Map<string, string>();
	const entries: KnowledgeBaseIndexEntry[] = [];

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

		entries.push(entry);
	}

	const indexPath = posixJoin(rootDir, KNOWLEDGE_BASE_BEST_PRACTICES_DIR, 'index.json');
	const index: KnowledgeBaseBestPracticesIndex = { entries };
	files.set(indexPath, stringifyWorkspaceJson(index));

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
		indexPath,
		files,
		contentHash,
	};
}

const KNOWLEDGE_BASE_FILE_LABEL = 'Knowledge base file';

export async function loadPrebakedKnowledgeBaseBundle({
	workspace,
	root,
	logger,
}: MaterializeKnowledgeBaseOptions): Promise<KnowledgeBaseWorkspaceBundle | undefined> {
	const bundle = buildKnowledgeBaseWorkspaceBundle({ root });

	return await loadPrebakedWorkspaceBundle({
		workspace,
		manifestPath: bundle.manifestPath,
		expectedHash: bundle.contentHash,
		hashField: 'contentHash',
		schemaVersion: KNOWLEDGE_BASE_MANIFEST_SCHEMA_VERSION,
		resourceLabel: KNOWLEDGE_BASE_FILE_LABEL,
		logger,
		invalidManifestLogMessage: 'Ignoring invalid prebaked knowledge base manifest',
		staleManifestLogMessage: 'Ignoring stale prebaked knowledge base manifest',
		staleManifestLogKeys: {
			expected: 'expectedContentHash',
			actual: 'actualContentHash',
		},
		successLogMessage: 'Using prebaked knowledge base from workspace',
		successLogContext: (loadedBundle) => ({
			root,
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
		buildBundle: () => buildKnowledgeBaseWorkspaceBundle({ root: options.root }),
		materializedLogMessage: 'Materialized knowledge base into workspace',
		materializedLogContext: (bundle) => ({
			root: options.root,
			knowledgeBaseRoot: bundle.rootDir,
			contentHash: bundle.contentHash,
			fileCount: bundle.files.size,
		}),
	});
}

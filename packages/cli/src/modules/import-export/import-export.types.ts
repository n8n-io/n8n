import type { User } from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import type { INode } from 'n8n-workflow';

import type { PackageReader } from './io/package-reader';
import type { PackageWriter } from './io/package-writer';

// ---------------------------------------------------------------------------
// Import bindings — remapping source IDs to target IDs during import
// ---------------------------------------------------------------------------

export interface ImportBindings {
	credentials?: Record<string, string>;
	subWorkflows?: Record<string, string>;
}

export type ImportMode = 'strict' | 'auto' | 'force';

// ---------------------------------------------------------------------------
// Import request — what the controller/CLI passes to the service
// ---------------------------------------------------------------------------

export interface ImportRequest {
	user: User;
	targetProjectId?: string;
	bindings?: ImportBindings;
	mode: ImportMode;
	createCredentialStubs: boolean;
	withVariableValues: boolean;
	overwriteVariableValues: boolean;
}

// ---------------------------------------------------------------------------
// Export scope — config + IO threaded through the export pipeline.
// Scope is *input-only*: it does not carry mutable cross-phase state.
// Cross-phase data lives on the pipeline as typed phase outputs.
// ---------------------------------------------------------------------------

export interface ExportEntityOptions {
	variables?: {
		includeValues: boolean;
	};
}

export interface ExportScope {
	/** Base path within the archive (e.g. "projects/billing-550e84" or ".") */
	basePath: string;
	writer: PackageWriter;

	// --- Query hints: handlers check these to decide what to fetch ---

	/** Export everything in this project */
	projectId?: string;
	/** Export just these specific workflows */
	workflowIds?: string[];
	/** Export just these specific folders (and their descendants) */
	folderIds?: string[];

	/** Entity-specific options — handlers check for keys they care about */
	entityOptions: ExportEntityOptions;
}

/**
 * Phase outputs accumulated during the export pipeline run.
 * Each field is produced by exactly one phase and consumed by zero or more
 * downstream phases. The pipeline owns this struct; entity exporters that
 * need a specific output declare it as a typed dependency in their signature.
 */
export interface ExportPipelineOutputs {
	/** Produced by FolderExporter; consumed by WorkflowExporter (path resolution). */
	folderPathMap: Map<string, string>;
	/** Produced by WorkflowExporter; consumed by PackageRequirementsExtractor. */
	nodesByWorkflow: Array<{ workflowId: string; nodes: INode[] }>;
}

// ---------------------------------------------------------------------------
// Import scope — config + IO threaded through the import pipeline.
// Like ExportScope, this is *input-only*. Phase outputs live on the pipeline.
// ---------------------------------------------------------------------------

export interface ImportEntityOptions {
	variables?: {
		withValues: boolean;
		overwriteValues: boolean;
	};
}

export interface ImportScope {
	user: User;
	/** Where to import entities into */
	targetProjectId: string;
	reader: PackageReader;

	/** When true, workflows get new IDs (creating copies instead of upserting originals) */
	assignNewIds?: boolean;

	/** When set, all DB operations use this transactional manager for rollback support. */
	entityManager?: EntityManager;

	/** Entity-specific options — handlers check for keys they care about */
	entityOptions: ImportEntityOptions;
}

/**
 * Phase outputs accumulated during the import pipeline run.
 * Seeded with bindings from BindingResolver (subWorkflowBindings, optionally
 * credentialBindings) and grown by FolderImporter / CredentialImporter as
 * phases run. WorkflowImporter consumes the lot.
 */
export interface ImportPipelineOutputs {
	/** Produced by FolderImporter; consumed by WorkflowImporter. */
	folderIdMap: Map<string, string>;
	/** Seeded by BindingResolver; mutated by CredentialImporter (stubs path). */
	credentialBindings: Map<string, string>;
	/** Seeded by BindingResolver; mutated by WorkflowImporter (when assigning new IDs). */
	subWorkflowBindings: Map<string, string>;
}

// ---------------------------------------------------------------------------
// Export request — what the controller/service receives
// ---------------------------------------------------------------------------

interface ExportRequestBase {
	user: User;
	/** When false, variable files are excluded from the package (they still appear as requirements). Defaults to true. */
	includeVariableValues?: boolean;
}

export type ExportRequest =
	| (ExportRequestBase & { type: 'projects'; projectIds: string[] })
	| (ExportRequestBase & { type: 'workflows'; workflowIds: string[] })
	| (ExportRequestBase & { type: 'folders'; folderIds: string[] });

// ---------------------------------------------------------------------------
// Import result
// ---------------------------------------------------------------------------

export interface ImportResult {
	projects: Array<{ sourceId: string; id: string; name: string }>;
	workflows: number;
	folders: number;
	credentials: number;
	variables: number;
	dataTables: number;
	tags: number;
}

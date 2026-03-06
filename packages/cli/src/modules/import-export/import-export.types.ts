import type { User } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import type { EntityManager } from '@n8n/typeorm';

import type { PackageReader } from './package-reader';
import type { PackageWriter } from './package-writer';
import type { ManifestProjectEntry } from './project/project.types';

export type { ManifestProjectEntry } from './project/project.types';

// ---------------------------------------------------------------------------
// Entity keys — the canonical list of entity types in a package
// ---------------------------------------------------------------------------

export const ENTITY_KEYS = [
	'folders',
	'workflows',
	'credentials',
	'variables',
	'dataTables',
] as const;
export type EntityKey = (typeof ENTITY_KEYS)[number];

// ---------------------------------------------------------------------------
// Manifest entry — a single entity reference in the package manifest
// ---------------------------------------------------------------------------

export interface ManifestEntry {
	id: string;
	name: string;
	target: string;
}

// ---------------------------------------------------------------------------
// Entity entries — the typed result of running the export/import pipeline
// ---------------------------------------------------------------------------

export type EntityEntries = Record<EntityKey, ManifestEntry[]>;

// ---------------------------------------------------------------------------
// Package requirements — dependencies that workflows need but aren't in the package
// ---------------------------------------------------------------------------

export interface PackageRequirements {
	credentials: PackageCredentialRequirement[];
	subWorkflows: PackageSubWorkflowRequirement[];
	nodeTypes: PackageNodeTypeRequirement[];
	variables: PackageVariableRequirement[];
}

export interface PackageCredentialRequirement {
	id: string;
	name: string;
	type: string;
	usedByWorkflows: string[];
}

export interface PackageSubWorkflowRequirement {
	id: string;
	usedByWorkflows: string[];
}

export interface PackageNodeTypeRequirement {
	type: string;
	typeVersion: number;
	usedByWorkflows: string[];
}

export interface PackageVariableRequirement {
	name: string;
	usedByWorkflows: string[];
}

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
// Package manifest
// ---------------------------------------------------------------------------

export interface PackageManifest {
	packageFormatVersion: string;
	exportedAt: string;
	sourceN8nVersion: string;
	sourceId: string;

	/** Project-scoped exports */
	projects?: ManifestProjectEntry[];

	/** Top-level standalone exports (not scoped to a project) */
	workflows?: ManifestEntry[];
	folders?: ManifestEntry[];
	credentials?: ManifestEntry[];
	variables?: ManifestEntry[];
	dataTables?: ManifestEntry[];

	/** Dependencies that workflows require but are not included in the package */
	requirements?: PackageRequirements;
}

// ---------------------------------------------------------------------------
// Export scope — passed through the export pipeline
// ---------------------------------------------------------------------------

export interface ExportEntityOptions {
	variables?: {
		includeValues: boolean;
	};
}

export interface ExportPipelineState {
	folderPathMap: Map<string, string>;
	nodesByWorkflow: Array<{ workflowId: string; nodes: INode[] }>;
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

	/** Mutable pipeline state — populated by handlers during pipeline execution */
	state: ExportPipelineState;
}

// ---------------------------------------------------------------------------
// Import scope — passed through the import pipeline
// ---------------------------------------------------------------------------

export interface ImportEntityOptions {
	variables?: {
		withValues: boolean;
		overwriteValues: boolean;
	};
}

export interface ImportPipelineState {
	folderIdMap: Map<string, string>;
	credentialBindings: Map<string, string>;
	subWorkflowBindings: Map<string, string>;
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

	/** Mutable pipeline state — populated by handlers during pipeline execution */
	state: ImportPipelineState;
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
}

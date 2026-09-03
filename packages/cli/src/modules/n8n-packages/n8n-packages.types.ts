import type { User } from '@n8n/db';
import type { Readable } from 'node:stream';

import type { AgentResolutionFailure } from './entities/agent/agent.types';
import type { DataTableResolutionFailure } from './entities/data-table/data-table.types';
import type { TagResolutionFailure } from './entities/tag/tag.types';
import type {
	VariableConflict,
	VariableLimitFailure,
	VariableResolutionFailure,
} from './entities/variable/variable.types';
import type { WorkflowIdConflict } from './entities/workflow/workflow-import-match.service';
import type {
	WorkflowConflict,
	WorkflowFolderConflict,
} from './entities/workflow/workflow-import.types';
import type {
	WorkflowPublishingOutcome,
	WorkflowPublishingPolicy,
} from './entities/workflow/workflow-publishing-policy.types';

export type { CredentialResolution } from './entities/credential/credential.types';
export { WorkflowPublishingPolicy } from './entities/workflow/workflow-publishing-policy.types';
export type { WorkflowPublishingOutcome } from './entities/workflow/workflow-publishing-policy.types';

export type CredentialMatchingMode = 'id-only' | 'name-and-type' | 'type-only';
export type CredentialMissingMode = 'must-preexist' | 'create-stub';

export type PackageFailureReason = 'access-denied' | 'entity-not-found' | 'blocked' | 'validation';

/* eslint-disable @typescript-eslint/naming-convention -- enum-like members for IDE documentation */
export const WorkflowConflictPolicy = {
	/** Updates existing workflows with matching sourceWorkflowId; otherwise creates a new workflow. */
	NewVersion: 'new-version',
	/** Fails the import if any matched workflow already exists in the target project. */
	Fail: 'fail',
	/** Leaves matched workflows unchanged; creates the rest of the workflows in the package. */
	Skip: 'skip',
} as const;

export const WorkflowIdPolicy = {
	/** Mints a fresh id for each imported workflow; the source id is kept as `sourceWorkflowId`. */
	New: 'new',
	/** Reuses the package's own workflow id in the target instance. */
	Source: 'source',
} as const;

export const ProjectConflictPolicy = {
	/** Reuses a matched project (by id) as-is — its name, description, icon and tags stay untouched — and merges the package's contents into it. */
	Merge: 'merge',
	/** Fails the import if any package project already exists on this instance. */
	Fail: 'fail',
	/**
	 * Replaces a matched project's own details with the package's, then merges the package's contents
	 * into it. Only the details the package carries are written — a detail the package omits (an
	 * unset description or icon, or a field a package predating it never had) is left as it is.
	 */
	Overwrite: 'overwrite',
} as const;

export const FolderConflictPolicy = {
	/** Reuses an already-imported folder (matched by id) as-is and merges the package's children into it; otherwise creates it. */
	Merge: 'merge',
	/** Fails the import if any package folder already exists in the target project. */
	Fail: 'fail',
	/**
	 * Like `merge` for the folders themselves, but makes the package authoritative for the
	 * project scopes it defines: a workflow at the project root or in a package folder that the
	 * package does not contain is removed, per `overwriteDeletionPolicy`. Project packages only.
	 */
	Overwrite: 'overwrite',
} as const;

export const OverwriteDeletionPolicy = {
	/** Archives the workflow, keeping it (and its executions) recoverable. */
	Archive: 'archive',
	/** Archives the workflow to unpublish it, then deletes it along with its execution history. */
	HardDelete: 'hard-delete',
} as const;

export const MissingNodeTypeMode = {
	/** Fails the import when any workflow uses a node type or version this instance does not have. */
	Fail: 'fail',
	/** Imports anyway; workflows containing missing node types are never published. */
	ImportAnyway: 'import-anyway',
} as const;

export const MissingWorkflowDependencyPolicy = {
	/** Fails the export when a workflow dependency is not included. */
	Fail: 'fail',
	/** Keeps missing workflow dependencies out of the package, listing them as requirements only. */
	ReferenceOnly: 'reference-only',
	/** Automatically adds missing workflow dependencies to the package. */
	IncludeInPackage: 'include-in-package',
} as const;

export const WorkflowVersionPolicy = {
	/** Exports the latest published version, failing if any workflow has none. */
	PublishedStrict: 'published-strict',
	/** Exports the latest published version where there is one, the latest version otherwise. */
	PreferPublished: 'prefer-published',
	/** Exports only published workflows, leaving unpublished ones out of the package. */
	IgnoreUnpublished: 'ignore-unpublished',
	/** Exports the latest version of every workflow, published or not. */
	Latest: 'latest',
} as const;

export const CredentialExportPolicy = {
	/** Bundles only expression-valued fields from credential data; literal values never travel. */
	ExpressionValuesOnly: 'expression-values-only',
	/** Keeps credential data out of the package; credential.json carries id, name and type only. */
	NoValues: 'no-values',
} as const;

export const DataTableMatchingMode = {
	/** Matches a package table to the target-project table with the same id. Never falls back to name matching. */
	ById: 'by-id',
} as const;

export const DataTableMissingMode = {
	/** Creates absent tables from the package schema, keeping the package (source) id. */
	Create: 'create',
	/** Fails the import if a referenced table is absent in the target project. */
	MustPreexist: 'must-preexist',
	/** Imports the workflows without creating absent tables. Matched tables are still validated. */
	DoNothing: 'do-nothing',
} as const;

export const DataTableSchemaConflictPolicy = {
	/** Accepts a matched target able that has every package column, ignoring additional columns the target table has of its own. Never alters the target table. */
	KeepExisting: 'keep-existing',
	/** Strict drift detection: fails the import on any schema difference, including target-only columns. */
	Fail: 'fail',
} as const;

export const VariableMissingMode = {
	/** Imports workflows even when referenced variables are absent. Nothing is created; unresolved names are reported as warnings in the response. */
	DoNothing: 'do-nothing',
	/** Blocks the import unless every referenced variable already resolves in the target project or global scope. */
	MustPreexist: 'must-preexist',
	/** Creates each unresolved variable with an empty value at the placement scope; the response lists the created names under `stubbed`. */
	CreateStub: 'create-stub',
	/** Creates each unresolved variable with its package value, falling back to an empty stub when the package carries no value for it. */
	CreateWithValue: 'create-with-value',
} as const;

export const VariableConflictPolicy = {
	/** Leaves the target value alone, even when the package bundles a different one. */
	KeepExisting: 'keep-existing',
	/** Replaces the target value with the package's, at whichever scope the variable was found. */
	Overwrite: 'overwrite',
	/** Rejects the import when the package bundles a value that differs from the target's. */
	Fail: 'fail',
} as const;

export const VariableParentPolicy = {
	Project: 'project',
	Global: 'global',
} as const;

export const TagMissingMode = {
	/** Creates absent tags with their package (source) id and name. */
	Create: 'create',
	/** Workflows import without their missing tags; dropped tags are listed under `tags.skipped`. */
	DoNothing: 'do-nothing',
} as const;

export const TagConflictPolicy = {
	/** Drops conflicted tags from the import: not created, not renamed, not attached anywhere; listed under `tags.skipped`. */
	Skip: 'skip',
	/** Blocks the import when any referenced tag conflicts. */
	Fail: 'fail',
	/** Renames a drifted target tag (same id, different name) to the package name; reconciles a name collision (id absent, name held) by re-keying the holder to the package id. A drifted tag whose package name is held by another tag still fails. */
	Rename: 'rename',
} as const;
/* eslint-enable @typescript-eslint/naming-convention */

export type WorkflowConflictPolicy =
	(typeof WorkflowConflictPolicy)[keyof typeof WorkflowConflictPolicy];

export type WorkflowIdPolicy = (typeof WorkflowIdPolicy)[keyof typeof WorkflowIdPolicy];

export type ProjectConflictPolicy =
	(typeof ProjectConflictPolicy)[keyof typeof ProjectConflictPolicy];

export type FolderConflictPolicy = (typeof FolderConflictPolicy)[keyof typeof FolderConflictPolicy];

export type OverwriteDeletionPolicy =
	(typeof OverwriteDeletionPolicy)[keyof typeof OverwriteDeletionPolicy];

export type MissingNodeTypeMode = (typeof MissingNodeTypeMode)[keyof typeof MissingNodeTypeMode];

export type MissingWorkflowDependencyPolicy =
	(typeof MissingWorkflowDependencyPolicy)[keyof typeof MissingWorkflowDependencyPolicy];

export type WorkflowVersionPolicy =
	(typeof WorkflowVersionPolicy)[keyof typeof WorkflowVersionPolicy];

export type CredentialExportPolicy =
	(typeof CredentialExportPolicy)[keyof typeof CredentialExportPolicy];

export type DataTableMatchingMode =
	(typeof DataTableMatchingMode)[keyof typeof DataTableMatchingMode];

export type DataTableMissingMode = (typeof DataTableMissingMode)[keyof typeof DataTableMissingMode];

export type DataTableSchemaConflictPolicy =
	(typeof DataTableSchemaConflictPolicy)[keyof typeof DataTableSchemaConflictPolicy];

export type VariableMissingMode = (typeof VariableMissingMode)[keyof typeof VariableMissingMode];

export type VariableConflictPolicy =
	(typeof VariableConflictPolicy)[keyof typeof VariableConflictPolicy];

export type VariableParentPolicy = (typeof VariableParentPolicy)[keyof typeof VariableParentPolicy];

export type TagMissingMode = (typeof TagMissingMode)[keyof typeof TagMissingMode];

export type TagConflictPolicy = (typeof TagConflictPolicy)[keyof typeof TagConflictPolicy];

export interface ExportPackageRequest {
	user: User;
	workflowIds?: string[];
	folderIds?: string[];
	projectIds?: string[];
	agentIds?: string[];
	includeVariableValues?: boolean;
	canExportVariableValues?: boolean;
	includeTags?: boolean;
	missingWorkflowDependencyPolicy?: MissingWorkflowDependencyPolicy;
	workflowVersionPolicy?: WorkflowVersionPolicy;
	credentialExportPolicy?: CredentialExportPolicy;
}

export type PackageImportSource = 'package-import' | 'git-pull';

export type ImportRequest = {
	user: User;
	projectId?: string;
	folderId?: string;
	bindings?: Partial<PackageImportBindings>;
	apiKeyScopes?: string[];
} & ImportCredentialProperties &
	ImportWorkflowProperties &
	ImportProjectProperties &
	ImportFolderProperties &
	ImportDataTableProperties &
	ImportVariableProperties &
	ImportTagProperties;

export type ImportPackageRequest = ImportRequest & {
	packageBuffer: Buffer;
};

export type ImportCredentialProperties = {
	credentialMatchingMode: CredentialMatchingMode;
	credentialMissingMode: CredentialMissingMode;
};

export type ImportWorkflowProperties = {
	workflowConflictPolicy: WorkflowConflictPolicy;
	workflowPublishingPolicy: WorkflowPublishingPolicy;
	workflowIdPolicy: WorkflowIdPolicy;
	missingNodeTypeMode: MissingNodeTypeMode;
};

/** Only project packages define projects; a workflow package imports into an existing project. */
export type ImportProjectProperties = {
	projectConflictPolicy: ProjectConflictPolicy;
};

/** Folder options once the dispatcher has settled what the caller left to the project policy. */
export type ResolvedImportFolderProperties = ImportFolderProperties & {
	folderConflictPolicy: FolderConflictPolicy;
};

export type ResolvedImportRequest = ImportRequest & ResolvedImportFolderProperties;

export type ResolvedImportPackageRequest = ImportPackageRequest & ResolvedImportFolderProperties;

export type ImportFolderProperties = {
	/**
	 * Omitted means "same as `projectConflictPolicy`" — the two express one intent at two levels, so
	 * the caller states it once. The dispatcher settles it (`resolveFolderConflictPolicy`, in
	 * `entities/folder/folder-conflict-policy.ts`) before any importer runs, which is why
	 * everything downstream sees a concrete value.
	 */
	folderConflictPolicy?: FolderConflictPolicy;
	/** How `folderConflictPolicy=overwrite` removes a workflow the package does not contain. */
	overwriteDeletionPolicy: OverwriteDeletionPolicy;
};

export type ImportDataTableProperties = {
	dataTableMatchingMode: DataTableMatchingMode;
	dataTableMissingMode: DataTableMissingMode;
	dataTableSchemaConflictPolicy: DataTableSchemaConflictPolicy;
};

export type ImportVariableProperties = {
	variableMissingMode: VariableMissingMode;
	variableConflictPolicy: VariableConflictPolicy;
	variableParentPolicy?: VariableParentPolicy;
};

export type ImportTagProperties = {
	tagMissingMode: TagMissingMode;
	tagConflictPolicy: TagConflictPolicy;
};

/**
 * The actor and resolved destination an import writes into. Threaded through
 * each entity importer so they share one resolved target instead of re-deriving
 * it or passing the full Project entity when only its id is needed.
 * `folderId` is carried for uniformity even though not every importer uses it
 * (credentials are not foldered).
 */
export interface ImportContext {
	user: User;
	projectId: string;
	folderId: string | null;
}

export type ImportPackageEventOptions = ImportCredentialProperties &
	ImportWorkflowProperties &
	ImportProjectProperties &
	ResolvedImportFolderProperties &
	ImportDataTableProperties &
	ImportVariableProperties &
	ImportTagProperties;

/** Credential ids involved in a package import, shaped for forward-compatible audit events. */
export type ImportAuditCredentialIds = {
	matched: string[];
	created: string[];
	updated: string[];
};

/**
 * Per-entity counts for an import, carried on `n8n-package-imported` for telemetry.
 * Counts only — no ids — so they can be relayed to analytics without leaking data.
 */
export type ImportPackageEventCounts = {
	workflows: {
		created: number;
		updated: number;
		skipped: number;
		/** Removed by reconciliation, split by what actually happened (see `RemovedWorkflowSummary`). */
		archived: number;
		deleted: number;
	};
	folders: {
		/** Emptied by reconciliation and deleted. */
		removed: number;
	};
	credentials: {
		matched: number;
		created: number;
		requirements: number;
	};
	dataTables: {
		matched: number;
		created: number;
		requirements: number;
	};
	variables: {
		matched: number;
		missing: number;
		created: number;
		stubbed: number;
		updated: number;
		requirements: number;
	};
	tags: {
		matched: number;
		created: number;
		renamed: number;
		reconciled: number;
		skipped: number;
		requirements: number;
	};
	agents: {
		created: number;
	};
};

/** Per-entity counts for an export, carried on `n8n-package-exported` for telemetry. */
export type ExportPackageEventCounts = {
	workflows: number;
	folders: number;
	credentials: number;
	dataTables: number;
	variables: number;
	tags: number;
	agents: number;
};

/**
 * Summary of what an export produced: the true per-entity counts of what
 * actually ended up in the package (after folder bundling and auto-inclusion).
 * Always available regardless of the sink — consumers surface these instead of
 * the requested id counts.
 */
export interface ExportPackageSummary {
	counts: ExportPackageEventCounts;
}

/**
 * Result of an export where the package itself is returned to the caller as an
 * archive stream, on top of the summary. Contrast with a directory export, which
 * writes to disk in place and only returns the {@link ExportPackageSummary}.
 */
export interface ExportPackageResult extends ExportPackageSummary {
	stream: Readable;
}

/**
 * The outcome for one package workflow, folding in what the publish phase decided for it. Import
 * writes and publishes in two separate phases, but a consumer cannot act on that distinction, so
 * the response reports one row per workflow.
 */
export interface ImportedWorkflowSummary {
	sourceWorkflowId: string;
	localId: string;
	name: string;
	projectId: string;
	parentFolderId: string | null;
	/** Published version on the target instance, or `null` when not published after import. */
	activeVersionId: string | null;
	publishing: WorkflowPublishingOutcome;
	status: 'created' | 'updated' | 'skipped';
}

export interface ImportedFolderSummary {
	sourceFolderId: string;
	localId: string;
	name: string;
	parentFolderId: string | null;
	status: 'created' | 'skipped';
}

/**
 * A workflow the target had that the package does not, removed under
 * `folderConflictPolicy=overwrite`. `deletion` reports what actually happened rather than what was
 * asked for: a `hard-delete` whose row could not be dropped yet is left `archived`.
 */
export interface RemovedWorkflowSummary {
	workflowId: string;
	name: string;
	projectId: string;
	parentFolderId: string | null;
	deletion: 'archived' | 'deleted';
}

/**
 * A folder the target had that the package does not define, removed under
 * `folderConflictPolicy=overwrite` once nothing was left inside it.
 */
export interface RemovedFolderSummary {
	folderId: string;
	name: string;
	projectId: string;
	parentFolderId: string | null;
}

export interface ImportedProjectSummary {
	sourceProjectId: string;
	localId: string;
	/** The project's name on the target — the package's under `overwrite`, the existing one under `merge`. */
	name: string;
	status: 'created' | 'updated' | 'skipped';
}

export interface ImportedAgentSummary {
	sourceAgentId: string;
	localId: string;
	name: string;
	status: 'created';
	/** Knowledge files written for this agent. */
	files: number;
}

/**
 * A reason the import cannot proceed, produced by some policy from any subsystem.
 * Discriminated by `type` so new gates add a variant rather than a new throw site.
 * The import aborts when any are present.
 */
export type BlockingIssue =
	| ({ type: 'workflow-conflict' } & WorkflowConflict)
	| ({ type: 'workflow-id-conflict' } & WorkflowIdConflict)
	| ({ type: 'workflow-folder-conflict' } & WorkflowFolderConflict)
	| {
			type: 'credential-unresolved';
			kind: 'not_found' | 'unknown_type' | 'source_not_found' | 'type_mismatch';
			sourceId: string;
			targetId?: string;
			/** For `type_mismatch`: the credential type the package's workflow node requires. */
			expectedType?: string;
			/** For `type_mismatch`: the actual type of the resolved target credential. */
			actualType?: string;
			usedByWorkflows: string[];
	  }
	| ({ type: 'project-conflict' } & ProjectConflict)
	| ({ type: 'folder-conflict' } & FolderConflict)
	| ({ type: 'workflow-removal-forbidden' } & WorkflowRemovalFailure)
	| ({ type: 'folder-removal-forbidden' } & FolderRemovalFailure)
	| ({ type: 'data-table-unresolved' } & DataTableResolutionFailure)
	| ({ type: 'agent-unresolved' } & AgentResolutionFailure)
	| ({ type: 'tag-unresolved' } & TagResolutionFailure)
	| ({ type: 'variable-unresolved' } & VariableResolutionFailure)
	| ({ type: 'variable-conflict' } & VariableConflict)
	| ({ type: 'variable-limit-exceeded' } & VariableLimitFailure)
	| {
			type: 'missing-node-type';
			/** Node type this instance cannot resolve (at least not at `typeVersion`). */
			nodeType: string;
			typeVersion: number;
			usedByWorkflows: string[];
	  };

/**
 * A workflow `folderConflictPolicy=overwrite` would archive that the caller may not archive.
 * Blocking rather than skipped: a partial reconciliation leaves the target matching neither
 * the package nor its previous state.
 */
export interface WorkflowRemovalFailure {
	workflowId: string;
	name: string;
	projectId: string;
}

/**
 * A folder `folderConflictPolicy=overwrite` would delete that the caller may not delete.
 * Blocking for the same reason as workflow removal: a partial reconciliation leaves the
 * target matching neither the package nor its previous state.
 */
export interface FolderRemovalFailure {
	folderId: string;
	name: string;
	projectId: string;
}

export interface ProjectConflict {
	kind: 'fail-policy';
	sourceProjectId: string;
	name: string;
}

export interface FolderConflict {
	kind: 'parent-mismatch' | 'id-in-other-project' | 'fail-policy';
	sourceFolderId: string;
	name: string;
	existingParentFolderId?: string | null;
	expectedParentFolderId?: string | null;
	existingProjectId?: string | null;
}

/** Source id → target id mapping for one entity type within an imported package. */
export type ImportBindingMap = Map<string, string>;

/**
 * Source→target id mappings accumulated while importing a package, one map per
 * entity type.
 */
export interface PackageImportBindings {
	workflows: ImportBindingMap;
	credentials: ImportBindingMap;
}

export function createBindings(seed: Partial<PackageImportBindings> = {}): PackageImportBindings {
	return {
		workflows: new Map(),
		credentials: new Map(),
		...seed,
	};
}

/** Combines per-scope binding maps into one — used when a project package imports several scopes. */
export function mergeBindings(...bindings: PackageImportBindings[]): PackageImportBindings {
	return {
		workflows: new Map(bindings.flatMap(({ workflows }) => [...workflows])),
		credentials: new Map(bindings.flatMap(({ credentials }) => [...credentials])),
	};
}

/** Plain-object form of {@link PackageImportBindings}, suitable for JSON responses. */
export type SerializedBindings = Record<keyof PackageImportBindings, Record<string, string>>;

/** Flattens the internal binding `Map`s into the plain objects exposed over the wire. */
export function serializeBindings(bindings: PackageImportBindings): SerializedBindings {
	return {
		workflows: Object.fromEntries(bindings.workflows),
		credentials: Object.fromEntries(bindings.credentials),
	};
}

export interface ImportPackageSummary {
	sourceN8nVersion: string;
	sourceId: string;
	exportedAt: string;
}

export interface ImportCredentialSummary {
	matched: string[];
	stubbed: string[];
}

export interface ImportVariableSummary {
	matched: string[];
	missing: string[];
	created: string[];
	stubbed: string[];
	updated: string[];
}

export interface ImportDataTableSummary {
	matched: number;
	created: number;
}

/** Tag names (not ids), grouped by how the import resolved them. */
export interface ImportTagSummary {
	matched: string[];
	created: string[];
	renamed: string[];
	/** Existing target tags re-keyed to the package (source) id on a name collision. */
	reconciled: string[];
	skipped: string[];
}

export interface ImportResult {
	package: ImportPackageSummary;
	workflows: ImportedWorkflowSummary[];
	/** Workflows the package did not contain, removed under `folderConflictPolicy=overwrite`. */
	removedWorkflows: RemovedWorkflowSummary[];
	/** Folders the package did not define that were left empty by the removals above. */
	removedFolders: RemovedFolderSummary[];
	folders: ImportedFolderSummary[];
	projects: ImportedProjectSummary[];
	agents: ImportedAgentSummary[];
	bindings: SerializedBindings;
	credentials: ImportCredentialSummary;
	dataTables: ImportDataTableSummary;
	variables: ImportVariableSummary;
	tags: ImportTagSummary;
}

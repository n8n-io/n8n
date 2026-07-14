import type { User } from '@n8n/db';

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

export const FolderConflictPolicy = {
	/** Reuses an already-imported folder (matched by id) as-is and merges the package's children into it; otherwise creates it. */
	Merge: 'merge',
	/** Fails the import if any package folder already exists in the target project. */
	Fail: 'fail',
} as const;
/* eslint-enable @typescript-eslint/naming-convention */

export type WorkflowConflictPolicy =
	(typeof WorkflowConflictPolicy)[keyof typeof WorkflowConflictPolicy];

export type WorkflowIdPolicy = (typeof WorkflowIdPolicy)[keyof typeof WorkflowIdPolicy];

export type FolderConflictPolicy = (typeof FolderConflictPolicy)[keyof typeof FolderConflictPolicy];

export interface ExportPackageRequest {
	user: User;
	workflowIds?: string[];
	folderIds?: string[];
	projectIds?: string[];
}

export type ImportPackageRequest = {
	user: User;
	projectId?: string;
	folderId?: string;
	packageBuffer: Buffer;
	bindings?: Partial<PackageImportBindings>;
	apiKeyScopes?: string[];
} & ImportCredentialProperties &
	ImportWorkflowProperties &
	ImportFolderProperties;

export type ImportCredentialProperties = {
	credentialMatchingMode: CredentialMatchingMode;
	credentialMissingMode: CredentialMissingMode;
};

export type ImportWorkflowProperties = {
	workflowConflictPolicy: WorkflowConflictPolicy;
	workflowPublishingPolicy: WorkflowPublishingPolicy;
	workflowIdPolicy: WorkflowIdPolicy;
};

export type ImportFolderProperties = {
	folderConflictPolicy: FolderConflictPolicy;
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

export type ImportPackageEventOptions = ImportCredentialProperties & ImportWorkflowProperties;

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
	};
	credentials: {
		matched: number;
		created: number;
		requirements: number;
	};
};

/** Per-entity counts for an export, carried on `n8n-package-exported` for telemetry. */
export type ExportPackageEventCounts = {
	workflows: number;
	folders: number;
	credentials: number;
	dataTables: number;
};

export interface ImportedWorkflowSummary {
	sourceWorkflowId: string;
	localId: string;
	name: string;
	projectId: string;
	parentFolderId: string | null;
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

export interface ImportedProjectSummary {
	sourceProjectId: string;
	localId: string;
	name: string;
	status: 'created' | 'updated';
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
	| ({ type: 'folder-conflict' } & FolderConflict);

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

export interface ImportResult {
	package: ImportPackageSummary;
	workflows: ImportedWorkflowSummary[];
	folders: ImportedFolderSummary[];
	projects: ImportedProjectSummary[];
	bindings: SerializedBindings;
	credentials: ImportCredentialSummary;
}

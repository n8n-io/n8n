import type { User } from '@n8n/db';

import type {
	WorkflowPublishingOutcome,
	WorkflowPublishingPolicy,
} from './entities/workflow/workflow-publishing-policy.types';

export type { CredentialResolution } from './entities/credential/credential.types';
export { WorkflowPublishingPolicy } from './entities/workflow/workflow-publishing-policy.types';
export type { WorkflowPublishingOutcome } from './entities/workflow/workflow-publishing-policy.types';

export type CredentialMatchingMode = 'id-only';
export type CredentialMissingMode = 'must-preexist' | 'create-stub';

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
	/** Updates an already-imported folder (matched by id) in place; otherwise creates it. */
	NewVersion: 'new-version',
	/** Fails the import if any package folder already exists in the target project. */
	Fail: 'fail',
	/** Leaves an already-imported folder unchanged; creates the rest of the package folders. */
	Skip: 'skip',
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
	/**
	 * API-key scopes of the caller (public API only). When present, the pipeline asserts the key
	 * carries the scopes the package's contents require (e.g. `folder:create`, `project:create`),
	 * mirroring export. Absent for internal callers, which are authorized by user RBAC alone.
	 */
	apiKeyScopes?: string[];
} & ImportCredentialProperties &
	ImportWorkflowProperties &
	ImportFolderProperties;

export type ImportCredentialProperties = {
	credentialMatchingMode: CredentialMatchingMode;
	credentialMissingMode: CredentialMissingMode;
	credentialBindings?: ImportBindingMap;
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

export type ImportPackageEventOptions = Omit<ImportCredentialProperties, 'credentialBindings'> &
	ImportWorkflowProperties;

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
	/** Local id of the imported folder; equal to `sourceFolderId` since folder ids are reused. */
	localId: string;
	name: string;
	parentFolderId: string | null;
	status: 'created' | 'updated' | 'skipped';
}

export interface ImportedProjectSummary {
	sourceProjectId: string;
	/** Local id of the imported project; equal to `sourceProjectId` since project ids are reused. */
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
	| {
			type: 'workflow-conflict';
			sourceWorkflowId: string;
			existingWorkflowId: string;
			name: string;
	  }
	| {
			type: 'workflow-id-conflict';
			sourceWorkflowId: string;
			existingWorkflowId: string;
			existingProjectId: string | null;
			isArchived: boolean;
			name: string;
	  }
	| {
			type: 'workflow-folder-conflict';
			sourceWorkflowId: string;
			existingWorkflowId: string;
			existingParentFolderId: string | null;
			targetFolderId: string;
			name: string;
	  }
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

/**
 * A package folder that cannot be imported as-is. `kind` distinguishes the cause:
 * - `parent-mismatch`: an already-imported folder (matched by id in the target project) sits under a
 *   different parent than the package places it — re-importing would move it, so the import is blocked.
 * - `id-in-other-project`: the folder id already exists in a *different* project on the instance
 *   (folder ids are a global primary key), so it cannot be reused here.
 * - `fail-policy`: the folder already exists and `folderConflictPolicy` is `fail`.
 */
export interface FolderConflict {
	kind: 'parent-mismatch' | 'id-in-other-project' | 'fail-policy';
	sourceFolderId: string;
	name: string;
	/** The matched folder's current parent in the target (for `parent-mismatch`). */
	existingParentFolderId?: string | null;
	/** The parent the package would place the folder under (for `parent-mismatch`). */
	expectedParentFolderId?: string | null;
	/** The project that already owns the id (for `id-in-other-project`). */
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

/** Result of an import: the entities written to the database. */
export interface ImportResult {
	package: ImportPackageSummary;
	workflows: ImportedWorkflowSummary[];
	folders: ImportedFolderSummary[];
	projects: ImportedProjectSummary[];
	bindings: SerializedBindings;
	credentials: ImportCredentialSummary;
}

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
/* eslint-enable @typescript-eslint/naming-convention */

export type WorkflowConflictPolicy =
	(typeof WorkflowConflictPolicy)[keyof typeof WorkflowConflictPolicy];

export type WorkflowIdPolicy = (typeof WorkflowIdPolicy)[keyof typeof WorkflowIdPolicy];

export interface ExportPackageRequest {
	user: User;
	workflowIds?: string[];
	projectIds?: string[];
}

export type ImportPackageRequest = {
	user: User;
	projectId?: string;
	folderId?: string;
	packageBuffer: Buffer;
} & ImportCredentialProperties &
	ImportWorkflowProperties;

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
	  };

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

/** Result of an import: the workflows written to the database. */
export interface ImportResult {
	package: ImportPackageSummary;
	workflows: ImportedWorkflowSummary[];
	bindings: SerializedBindings;
	credentials: ImportCredentialSummary;
}

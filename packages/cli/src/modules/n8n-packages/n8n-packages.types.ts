import type { User } from '@n8n/db';

export type { CredentialResolution } from './entities/credential/credential.types';

export type CredentialMatchingMode = 'id-only';
export type CredentialMissingMode = 'must-preexist';

/* eslint-disable @typescript-eslint/naming-convention -- enum-like members for IDE documentation */
export const WorkflowConflictPolicy = {
	/** Updates existing workflows with matching sourceWorkflowId; otherwise creates a new workflow. */
	NewVersion: 'new-version',
	/** Fails the import if any matched workflow already exists in the target project. */
	Fail: 'fail',
	/** Leaves matched workflows unchanged; creates the rest of the workflows in the package. */
	Skip: 'skip',
} as const;
/* eslint-enable @typescript-eslint/naming-convention */

export type WorkflowConflictPolicy =
	(typeof WorkflowConflictPolicy)[keyof typeof WorkflowConflictPolicy];

export interface ExportWorkflowsRequest {
	user: User;
	workflowIds: string[];
}

export interface ImportPackageRequest {
	user: User;
	projectId?: string;
	folderId?: string;
	packageBuffer: Buffer;
	credentialMatchingMode: CredentialMatchingMode;
	credentialMissingMode: CredentialMissingMode;
	workflowConflictPolicy: WorkflowConflictPolicy;
	/** When true, compute and report what the import would do without writing anything. */
	dryRun: boolean;
}

export interface ImportedWorkflowSummary {
	sourceWorkflowId: string;
	localId: string;
	name: string;
	projectId: string;
	parentFolderId: string | null;
	activeVersionId: string | null;
	status: 'created' | 'updated' | 'skipped';
}

/** What a dry-run determined would happen to a single workflow, without writing it. */
export interface PlannedWorkflowSummary {
	sourceWorkflowId: string;
	name: string;
	action: 'create' | 'update' | 'skip';
	existingWorkflowId: string | null;
}

/**
 * A reason the import cannot proceed, produced by some policy from any subsystem.
 * Discriminated by `type` so new gates add a variant rather than a new throw site.
 * A real run aborts when any are present; a dry-run reports them all.
 */
export type BlockingIssue =
	| {
			type: 'workflow-conflict';
			sourceWorkflowId: string;
			existingWorkflowId: string;
			name: string;
	  }
	| {
			type: 'credential-unresolved';
			kind: 'not_found' | 'unknown_type';
			sourceId: string;
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

/** Result of an applied (non-dry-run) import: workflows were written to the database. */
export interface AppliedImportResult {
	dryRun: false;
	package: ImportPackageSummary;
	workflows: ImportedWorkflowSummary[];
	bindings: SerializedBindings;
}

/** Result of a dry-run import: nothing was written, only what *would* happen is reported. */
export interface PlannedImportResult {
	dryRun: true;
	package: ImportPackageSummary;
	workflows: PlannedWorkflowSummary[];
	blockingIssues: BlockingIssue[];
}

export type ImportResult = AppliedImportResult | PlannedImportResult;

export type WorkflowPublishingOutcomeState =
	| 'published'
	| 'unpublished'
	| 'unchanged'
	| 'blocked'
	| 'failed';

export type WorkflowPublishingBlockedReason = 'stub-credential' | 'missing-node-type';

/** Result of applying a publishing policy to one imported workflow. */
export interface WorkflowPublishingOutcome {
	state: WorkflowPublishingOutcomeState;
	error?: string;
	/** Present when `state` is `blocked`: why the imported version could not be published. */
	blockedReason?: WorkflowPublishingBlockedReason;
	/**
	 * Present when `state` is `unchanged`: why the imported version was not
	 * activated. The live publish state is unchanged — typically because a prior
	 * published version is still active after an update.
	 */
	skippedPublishReason?: WorkflowPublishingBlockedReason;
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
	/**
	 * Whether the workflow is archived on the target after import. Under `new-version` this follows
	 * the package; a skipped workflow keeps its own state.
	 */
	isArchived: boolean;
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

export type SerializedBindings = Record<'workflows' | 'credentials', Record<string, string>>;

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
	bindings: SerializedBindings;
	credentials: ImportCredentialSummary;
	dataTables: ImportDataTableSummary;
	variables: ImportVariableSummary;
	tags: ImportTagSummary;
}

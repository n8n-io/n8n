import type { User } from '@n8n/db';

export type WorkflowConflictPolicy = 'new-version' | 'fail' | 'skip';

export interface ExportWorkflowsRequest {
	user: User;
	workflowIds: string[];
}

export interface ImportPackageRequest {
	user: User;
	projectId?: string;
	folderId?: string;
	packageBuffer: Buffer;
	workflowConflictPolicy: WorkflowConflictPolicy;
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

/** Source id → target id mapping for one entity type within an imported package. */
export type BindingMap = Record<string, string>;

/**
 * Source→target id mappings produced while importing a package, one map per
 * entity type. Only workflows are imported for now.
 */
export interface PackageImportBindings {
	workflows: BindingMap;
}

export function createEmptyBindings(): PackageImportBindings {
	return {
		workflows: {},
	};
}

export interface ImportResult {
	package: {
		sourceN8nVersion: string;
		sourceId: string;
		exportedAt: string;
	};
	workflows: ImportedWorkflowSummary[];
	bindings: PackageImportBindings;
}

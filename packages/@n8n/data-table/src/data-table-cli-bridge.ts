import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';

/**
 * Dependency-inversion seam for the few cli-owned capabilities the data-table
 * module needs (ownership, RBAC, source control, events, telemetry). The
 * package declares this abstract token; cli binds a concrete implementation via
 * `Container.set(DataTableCliBridge, impl)` before the module initializes.
 *
 * Keeping it abstract is what lets this package stay free of any cli import.
 */
@Service()
export abstract class DataTableCliBridge {
	/** Resolve the id of the project that owns a workflow. */
	abstract getWorkflowProjectId(workflowId: string): Promise<string>;

	/** Whether `user` holds `scope` on the given project. */
	abstract hasProjectScope(user: User, scope: Scope, projectId: string): Promise<boolean>;

	/** Whether the instance's source-control branch is read-only. */
	abstract isBranchReadOnly(): boolean;

	/** Ids of the projects `user` has a relation to. */
	abstract getUserProjectIds(user: User): Promise<string[]>;

	/** Throws if the project does not exist. */
	abstract assertProjectExists(projectId: string): Promise<void>;

	/** Project role slugs that grant the given scopes. */
	abstract rolesWithProjectScope(scopes: Scope[]): Promise<string[]>;

	/** Emitted when a data table is deleted. */
	abstract emitDataTableDeleted(payload: { dataTableId: string; projectId: string }): void;

	/** Track that the instance hit its data-table storage limit. */
	abstract trackStorageLimitHit(totalBytes: number, maxBytes: number): void;
}

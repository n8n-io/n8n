import { Service } from '@n8n/di';

/**
 * Lets a module react to workflow mutations without core depending on the
 * module: it registers an implementation on {@link WorkflowMutationHooksProxy}.
 * With no provider registered, every hook is a no-op.
 *
 * Distinct from the `workflow.afterArchive` / `workflow.afterDelete` external
 * hooks, which notify code outside n8n rather than modules inside it.
 *
 * No hook may throw: the `after*` hooks observe an already-committed mutation
 * with nothing left to abort, and `beforeWorkflowDeleted` only captures state —
 * a provider that let it throw would abort deletions on its own failures.
 *
 * `userId` is the acting user, or `null` for a system-driven mutation
 * (e.g. a source-control pull).
 */
export interface WorkflowMutationHooks {
	afterWorkflowArchived(workflowId: string, userId: string | null): Promise<void>;

	/** Called only for workflows whose owning project actually changed. */
	afterWorkflowsTransferred(workflowIds: string[], userId: string | null): Promise<void>;

	/**
	 * Called before anything about the workflow is destroyed, while rows
	 * referencing it still exist. Capture-only: a provider reads what the delete
	 * is about to cascade away and acts on it in `afterWorkflowsDeleted`. Must
	 * not throw — the delete may still fail after this, so nothing durable may
	 * be written yet either.
	 */
	beforeWorkflowDeleted(workflowId: string, userId: string | null): Promise<void>;

	/**
	 * Called once the workflow rows are gone, for cleanup that can only be done
	 * after the delete cascades — rows orphaned by it, which by definition cannot
	 * be found while the workflows still exist. One call covers a whole batch
	 * (e.g. a folder cascade); the ids identify what triggered the cleanup.
	 */
	afterWorkflowsDeleted(workflowIds: string[]): Promise<void>;

	/**
	 * Called at the publication commit boundary: the version is durably active
	 * (outbox record or trigger setup committed), whatever later steps of the
	 * calling request still fail.
	 */
	afterWorkflowPublished(event: {
		workflowId: string;
		versionId: string;
		userId: string;
	}): Promise<void>;
}

@Service()
export class WorkflowMutationHooksProxy implements WorkflowMutationHooks {
	private provider: WorkflowMutationHooks | null = null;

	registerProvider(provider: WorkflowMutationHooks): void {
		this.provider = provider;
	}

	async afterWorkflowArchived(workflowId: string, userId: string | null): Promise<void> {
		await this.provider?.afterWorkflowArchived(workflowId, userId);
	}

	async afterWorkflowsTransferred(workflowIds: string[], userId: string | null): Promise<void> {
		await this.provider?.afterWorkflowsTransferred(workflowIds, userId);
	}

	async beforeWorkflowDeleted(workflowId: string, userId: string | null): Promise<void> {
		await this.provider?.beforeWorkflowDeleted(workflowId, userId);
	}

	async afterWorkflowsDeleted(workflowIds: string[]): Promise<void> {
		await this.provider?.afterWorkflowsDeleted(workflowIds);
	}

	async afterWorkflowPublished(event: {
		workflowId: string;
		versionId: string;
		userId: string;
	}): Promise<void> {
		await this.provider?.afterWorkflowPublished(event);
	}
}

import { Service } from '@n8n/di';

/**
 * Lets a module react to workflow mutations without core depending on the
 * module: it registers an implementation on {@link WorkflowMutationHooksProxy}.
 * With no provider registered, every hook is a no-op.
 *
 * Distinct from the `workflow.afterArchive` / `workflow.afterDelete` external
 * hooks, which notify code outside n8n rather than modules inside it.
 *
 * The `after*` hooks observe an already-committed mutation and must not throw —
 * there is nothing left to abort. `beforeWorkflowDeleted` is the exception:
 * it runs while the delete can still be called off, so it may throw to stop it.
 */
export interface WorkflowMutationHooks {
	afterWorkflowArchived(workflowId: string): Promise<void>;

	/** Called only for workflows whose owning project actually changed. */
	afterWorkflowsTransferred(workflowIds: string[]): Promise<void>;

	/**
	 * Called before anything about the workflow is destroyed, while rows
	 * referencing it still exist. Throwing here aborts the deletion.
	 */
	beforeWorkflowDeleted(workflowId: string): Promise<void>;

	/**
	 * Called once the workflow row is gone, for cleanup that can only be done
	 * after the delete cascades — rows orphaned by it, which by definition cannot
	 * be found while the workflow still exists.
	 */
	afterWorkflowDeleted(workflowId: string): Promise<void>;
}

@Service()
export class WorkflowMutationHooksProxy implements WorkflowMutationHooks {
	private provider: WorkflowMutationHooks | null = null;

	registerProvider(provider: WorkflowMutationHooks): void {
		this.provider = provider;
	}

	async afterWorkflowArchived(workflowId: string): Promise<void> {
		await this.provider?.afterWorkflowArchived(workflowId);
	}

	async afterWorkflowsTransferred(workflowIds: string[]): Promise<void> {
		await this.provider?.afterWorkflowsTransferred(workflowIds);
	}

	async beforeWorkflowDeleted(workflowId: string): Promise<void> {
		await this.provider?.beforeWorkflowDeleted(workflowId);
	}

	async afterWorkflowDeleted(workflowId: string): Promise<void> {
		await this.provider?.afterWorkflowDeleted(workflowId);
	}
}

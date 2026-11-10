import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

/**
 * Lets a module react to workflow mutations without core depending on the
 * module: it registers an implementation on {@link WorkflowMutationHooksProxy}.
 * Modules register only the hooks they need. Each hook calls every registered provider.
 * With no provider registered, every hook is a no-op.
 *
 * Distinct from the `workflow.afterArchive` / `workflow.afterDelete` external
 * hooks, which notify code outside n8n rather than modules inside it.
 *
 * The proxy logs provider failures and continues to the next provider.
 * The `after*` hooks observe a committed mutation with nothing left to abort.
 * `beforeWorkflowDeleted` only captures state. Its failure must not block deletion.
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
	private readonly providers = new Set<Partial<WorkflowMutationHooks>>();

	constructor(private readonly logger: Logger) {}

	registerProvider(provider: Partial<WorkflowMutationHooks>): void {
		this.providers.add(provider);
	}

	async afterWorkflowArchived(workflowId: string, userId: string | null): Promise<void> {
		await this.callProviders(
			'afterWorkflowArchived',
			async (provider) => await provider.afterWorkflowArchived?.(workflowId, userId),
		);
	}

	async afterWorkflowsTransferred(workflowIds: string[], userId: string | null): Promise<void> {
		await this.callProviders(
			'afterWorkflowsTransferred',
			async (provider) => await provider.afterWorkflowsTransferred?.(workflowIds, userId),
		);
	}

	async beforeWorkflowDeleted(workflowId: string, userId: string | null): Promise<void> {
		await this.callProviders(
			'beforeWorkflowDeleted',
			async (provider) => await provider.beforeWorkflowDeleted?.(workflowId, userId),
		);
	}

	async afterWorkflowsDeleted(workflowIds: string[]): Promise<void> {
		await this.callProviders(
			'afterWorkflowsDeleted',
			async (provider) => await provider.afterWorkflowsDeleted?.(workflowIds),
		);
	}

	async afterWorkflowPublished(event: {
		workflowId: string;
		versionId: string;
		userId: string;
	}): Promise<void> {
		await this.callProviders(
			'afterWorkflowPublished',
			async (provider) => await provider.afterWorkflowPublished?.(event),
		);
	}

	private async callProviders(
		hook: keyof WorkflowMutationHooks,
		call: (provider: Partial<WorkflowMutationHooks>) => Promise<void>,
	): Promise<void> {
		for (const provider of this.providers) {
			try {
				await call(provider);
			} catch (error) {
				this.logger.warn('Workflow mutation hook failed', {
					hook,
					provider: provider.constructor.name,
					error,
				});
			}
		}
	}
}

import { Service } from '@n8n/di';

/**
 * Lets a module veto publishing a workflow without core depending on the module:
 * it registers an implementation on {@link WorkflowPublishGuardProxy} and throws
 * to block. With no provider registered, publishing is allowed.
 */
export interface WorkflowPublishGuard {
	assertCanPublish(workflowId: string): Promise<void>;
}

@Service()
export class WorkflowPublishGuardProxy implements WorkflowPublishGuard {
	private provider: WorkflowPublishGuard | null = null;

	registerProvider(provider: WorkflowPublishGuard): void {
		this.provider = provider;
	}

	async assertCanPublish(workflowId: string): Promise<void> {
		await this.provider?.assertCanPublish(workflowId);
	}
}

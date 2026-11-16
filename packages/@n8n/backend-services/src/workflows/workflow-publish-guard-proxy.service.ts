import { Service } from '@n8n/di';

/**
 * Lets a module veto publishing a workflow without core depending on the module:
 * it registers an implementation on {@link WorkflowPublishGuardProxy} and throws
 * to block. With no provider registered, publishing is allowed.
 */
export interface WorkflowPublishGuard {
	assertCanPublish(workflowId: string, target: WorkflowPublishTarget): Promise<void>;
}

export interface WorkflowPublishTarget {
	versionId: string;
	/** A source control pull publishes what the repository holds, so only an open review blocks it. */
	fromSourceControlPull?: boolean;
}

@Service()
export class WorkflowPublishGuardProxy implements WorkflowPublishGuard {
	private provider: WorkflowPublishGuard | null = null;

	registerProvider(provider: WorkflowPublishGuard): void {
		this.provider = provider;
	}

	async assertCanPublish(workflowId: string, target: WorkflowPublishTarget): Promise<void> {
		await this.provider?.assertCanPublish(workflowId, target);
	}
}

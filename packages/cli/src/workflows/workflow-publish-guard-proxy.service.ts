import { Service } from '@n8n/di';

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

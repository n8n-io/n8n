import type { WorkflowIdsQuery } from '@n8n/db';
import { Service } from '@n8n/di';

export interface RestrictedNodeTypesProvider {
	findRestrictedWorkflowIds(): Promise<WorkflowIdsQuery | null>;
}

@Service()
export class RestrictedNodeTypesProviderProxy implements RestrictedNodeTypesProvider {
	private provider: RestrictedNodeTypesProvider | null = null;

	registerProvider(provider: RestrictedNodeTypesProvider): void {
		this.provider = provider;
	}

	async findRestrictedWorkflowIds(): Promise<WorkflowIdsQuery | null> {
		return (await this.provider?.findRestrictedWorkflowIds()) ?? null;
	}
}

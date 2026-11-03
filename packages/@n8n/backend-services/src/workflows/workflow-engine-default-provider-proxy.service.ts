import { Service } from '@n8n/di';

/**
 * Lets a module supply the stored default engine for new workflows without core
 * depending on the module: it registers an implementation on
 * {@link WorkflowEngineDefaultProviderProxy}. With no provider registered, there is
 * no stored default.
 */
export interface WorkflowEngineDefaultProvider {
	getDefaultEngine(): Promise<'v1' | 'v2' | undefined>;
}

@Service()
export class WorkflowEngineDefaultProviderProxy implements WorkflowEngineDefaultProvider {
	private provider: WorkflowEngineDefaultProvider | null = null;

	registerProvider(provider: WorkflowEngineDefaultProvider): void {
		this.provider = provider;
	}

	async getDefaultEngine(): Promise<'v1' | 'v2' | undefined> {
		return await this.provider?.getDefaultEngine();
	}
}

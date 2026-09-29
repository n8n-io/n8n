import type { RestrictedNodeTypes } from '@n8n/db';
import { Service } from '@n8n/di';

export const NO_RESTRICTED_NODE_TYPES: RestrictedNodeTypes = {
	shared: [],
	byProjects: [],
	nodeTypesInUse: [],
};

export interface RestrictedNodeTypesProvider {
	findRestrictedNodeTypesInUse(): Promise<RestrictedNodeTypes>;
}

@Service()
export class RestrictedNodeTypesProviderProxy implements RestrictedNodeTypesProvider {
	private provider: RestrictedNodeTypesProvider | null = null;

	registerProvider(provider: RestrictedNodeTypesProvider): void {
		this.provider = provider;
	}

	async findRestrictedNodeTypesInUse(): Promise<RestrictedNodeTypes> {
		return (await this.provider?.findRestrictedNodeTypesInUse()) ?? NO_RESTRICTED_NODE_TYPES;
	}
}

import type { PackagePolicyRestrictions } from '@n8n/api-types';
import { Service } from '@n8n/di';

export interface InstalledTypeRestrictionsProvider {
	/** `null` when no policy was evaluated, for example when policies are not licensed. */
	describeRestrictions(input: {
		nodeTypes: readonly string[];
	}): Promise<PackagePolicyRestrictions | null>;
}

@Service()
export class InstalledTypeRestrictionsProxy implements InstalledTypeRestrictionsProvider {
	private provider: InstalledTypeRestrictionsProvider | null = null;

	registerProvider(provider: InstalledTypeRestrictionsProvider): void {
		this.provider = provider;
	}

	async describeRestrictions(input: {
		nodeTypes: readonly string[];
	}): Promise<PackagePolicyRestrictions | null> {
		return (await this.provider?.describeRestrictions(input)) ?? null;
	}
}

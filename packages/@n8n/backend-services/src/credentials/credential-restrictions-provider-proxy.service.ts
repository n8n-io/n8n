import type { CredentialRestriction } from '@n8n/api-types';
import { Service } from '@n8n/di';

export type CredentialToJudge = {
	type: string;
	/**
	 * The project whose type policies judge the credential: the listed project for a project
	 * list, or else the home project. `null` applies the policies that every project without
	 * its own policy shares.
	 */
	projectId: string | null;
};

export interface CredentialRestrictionsProvider {
	findRestrictions(credentials: CredentialToJudge[]): Promise<Array<CredentialRestriction | null>>;
}

@Service()
export class CredentialRestrictionsProviderProxy implements CredentialRestrictionsProvider {
	private provider: CredentialRestrictionsProvider | null = null;

	registerProvider(provider: CredentialRestrictionsProvider): void {
		this.provider = provider;
	}

	async findRestrictions(
		credentials: CredentialToJudge[],
	): Promise<Array<CredentialRestriction | null>> {
		if (!this.provider) return credentials.map(() => null);

		return await this.provider.findRestrictions(credentials);
	}
}

import { Service } from '@n8n/di';
import type { ICredentialContext } from 'n8n-workflow';

import { N8NIdentifier } from '../credential-resolvers/identifiers/n8n-identifier';

@Service()
export class UserIdentityResolverService {
	constructor(private readonly n8nIdentifier: N8NIdentifier) {}

	async resolveUserId(credentialContext: ICredentialContext): Promise<string> {
		return await this.n8nIdentifier.resolve(credentialContext, {});
	}
}

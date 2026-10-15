import { Service } from '@n8n/di';
import type { ICredentialContext } from 'n8n-workflow';

import type { IExecutingUserIdentifier } from './executing-user-identifier.interface';

/**
 * Proxy between the always-loaded redaction layer and the module-owned identity
 * resolver. When no provider is registered (dynamic-credentials feature disabled
 * or module not loaded) identification degrades to undefined, so the run stays
 * redacted for everyone.
 */
@Service()
export class ExecutingUserIdentifierProxy implements IExecutingUserIdentifier {
	private provider?: IExecutingUserIdentifier;

	setProvider(provider: IExecutingUserIdentifier): void {
		this.provider = provider;
	}

	async identify(context: ICredentialContext): Promise<string | undefined> {
		if (!this.provider) return undefined;
		return await this.provider.identify(context);
	}
}

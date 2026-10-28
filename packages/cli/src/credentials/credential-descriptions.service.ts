import { CREDENTIAL_DESCRIPTIONS_FLAG } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { PostHogClient } from '@/posthog';

@Service()
export class CredentialDescriptionsService {
	constructor(private readonly postHogClient: PostHogClient) {}

	async isEnabled(): Promise<boolean> {
		return (
			(await this.postHogClient.getFeatureFlagForInstance(CREDENTIAL_DESCRIPTIONS_FLAG)) === true
		);
	}

	/** Remove the field from a response or write payload. Stored values stay intact. */
	async stripIfDisabled<T extends { description?: unknown }>(credentials: T | T[]): Promise<void> {
		this.stripUnlessEnabled(await this.isEnabled(), credentials);
	}

	/** Like `stripIfDisabled`, for a caller that already resolved the flag. */
	stripUnlessEnabled<T extends { description?: unknown }>(
		enabled: boolean,
		credentials: T | T[],
	): void {
		if (enabled) return;
		for (const credential of Array.isArray(credentials) ? credentials : [credentials])
			delete credential.description;
	}
}

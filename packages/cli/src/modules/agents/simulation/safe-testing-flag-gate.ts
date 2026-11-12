import { AGENT_SAFE_TESTING_FLAG } from '@n8n/api-types';
import { PostHogClient } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

/** Per-user safe testing flag. `PostHogClient` already caches and applies env overrides. */
@Service()
export class SafeTestingFlagGate {
	constructor(private readonly postHogClient: PostHogClient) {}

	async isEnabled(user: User): Promise<boolean> {
		const flags = await this.postHogClient.getFeatureFlags(user);
		return flags?.[AGENT_SAFE_TESTING_FLAG] === true;
	}
}

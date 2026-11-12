import { AGENT_SAFE_TESTING_FLAG } from '@n8n/api-types';
import { PostHogClient } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';

/**
 * Per-user gate for safe testing. With the flag on, draft runs are test runs.
 * `PostHogClient` applies env overrides and caches per user, so this needs no
 * caching or error handling of its own.
 */
@Service()
export class SafeTestingFlagGate {
	constructor(private readonly postHogClient: PostHogClient) {}

	async isEnabled(user: User): Promise<boolean> {
		const flags = await this.postHogClient.getFeatureFlags(user);
		return flags?.[AGENT_SAFE_TESTING_FLAG] === true;
	}

	// 404 rather than 403: a flag-off surface should look unknown, not forbidden.
	async assertEnabled(user: User): Promise<void> {
		if (!(await this.isEnabled(user))) throw new NotFoundError('Not found');
	}
}

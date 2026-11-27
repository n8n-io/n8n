import { CUSTOM_MCP_SERVERS_FLAG, CUSTOM_MCP_SERVERS_FLAG_VARIANT } from '@n8n/api-types';
import { PostHogClient } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';

/**
 * Whether custom MCP servers are on for this instance. The PostHog flag rolls out by instance
 * and has the variants `control` and `test`. Only `test` turns the feature on.
 *
 * The gate reads the flag for the instance, not for a user, because some callers have no user:
 * the protected resource metadata and the consent screen. `PostHogClient` caches the instance
 * answer (also a failed fetch) and applies the local overrides, so this gate needs no cache of
 * its own. The editor gets the same instance variant from `PostHogClient`.
 */
@Service()
export class CustomMcpServersFlagGate {
	constructor(private readonly postHog: PostHogClient) {}

	async isEnabled(): Promise<boolean> {
		const variant = await this.postHog.getFeatureFlagForInstance(CUSTOM_MCP_SERVERS_FLAG);
		return variant === CUSTOM_MCP_SERVERS_FLAG_VARIANT;
	}

	// 404, not 403: a surface behind a flag that is off looks unknown, not forbidden.
	async assertEnabled(): Promise<void> {
		if (!(await this.isEnabled())) throw new NotFoundError('Not found');
	}
}

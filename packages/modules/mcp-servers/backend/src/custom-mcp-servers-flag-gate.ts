import { CUSTOM_MCP_SERVERS_FLAG, CUSTOM_MCP_SERVERS_FLAG_VARIANT } from '@n8n/api-types';
import { PostHogClient } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';

type FlagUser = Parameters<PostHogClient['getFeatureFlags']>[0];

/**
 * Whether custom MCP servers are on for a user. The PostHog flag rolls out by instance and has
 * the variants `control` and `test`. Only `test` turns the feature on. `PostHogClient` caches per
 * user and applies the local overrides, so this gate needs no cache of its own.
 */
@Service()
export class CustomMcpServersFlagGate {
	constructor(private readonly postHog: PostHogClient) {}

	async isEnabled(user: FlagUser): Promise<boolean> {
		const flags = await this.postHog.getFeatureFlags(user);
		return flags?.[CUSTOM_MCP_SERVERS_FLAG] === CUSTOM_MCP_SERVERS_FLAG_VARIANT;
	}

	// 404, not 403: a surface behind a flag that is off looks unknown, not forbidden.
	async assertEnabled(user: FlagUser): Promise<void> {
		if (!(await this.isEnabled(user))) throw new NotFoundError('Not found');
	}
}

import { AGENTS_N8N_CHAT_FLAG } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { PostHogClient } from '@/posthog';

/** Backend read of the n8n Chat experiment flag, for the paths the editor's gate cannot reach. */
@Service()
export class N8nChatFlagService {
	constructor(private readonly postHogClient: PostHogClient) {}

	/** Mirrors the editor's `useAgentsN8nChatFlag`: every variant except `control` is on. Fails closed. */
	async isEnabledFor(user: User): Promise<boolean> {
		try {
			const variant = (await this.postHogClient.getFeatureFlags(user))[AGENTS_N8N_CHAT_FLAG];
			return typeof variant === 'string' && variant !== 'control';
		} catch {
			return false;
		}
	}
}

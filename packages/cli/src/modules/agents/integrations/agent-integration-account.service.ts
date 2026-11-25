import type { AgentIntegrationAccountResponse } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { CacheService } from '@n8n/backend-services';
import { Time } from '@n8n/constants';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { AgentCredentialLookupService } from './agent-credential-lookup.service';
import { ChatIntegrationRegistry } from './agent-chat-integration';

/**
 * Long enough that opening the panel again does not call the platform, short
 * enough that a renamed bot or a new server shows up the same session.
 */
const ACCOUNT_TTL_MS = 10 * Time.minutes.toMilliseconds;

/** A failed lookup is cached for less time, so a short outage clears quickly. */
const EMPTY_ACCOUNT_TTL_MS = Time.minutes.toMilliseconds;

function cacheKey(userId: string, projectId: string, type: string, credentialId: string) {
	return `agent-integration-account:${userId}:${projectId}:${type}:${credentialId}`;
}

/**
 * Looks up who the agent is on a chat platform, for display labels only.
 *
 * Kept in the shared cache instead of the database: the data is cheap to get
 * again, and is in memory, or in Redis when there is more than one main.
 * Nothing here may fail the request — an unknown account is a valid answer.
 */
@Service()
export class AgentIntegrationAccountService {
	constructor(
		private readonly logger: Logger,
		private readonly cacheService: CacheService,
		private readonly registry: ChatIntegrationRegistry,
		private readonly credentialLookup: AgentCredentialLookupService,
	) {}

	async describe(options: {
		user: User;
		projectId: string;
		type: string;
		credentialId: string;
	}): Promise<AgentIntegrationAccountResponse> {
		const { projectId, type, credentialId } = options;
		const integration = this.registry.get(type);
		if (!integration?.describeAccount) return {};

		const key = cacheKey(options.user.id, projectId, type, credentialId);
		const cached = await this.cacheService
			.get<AgentIntegrationAccountResponse>(key)
			.catch(() => undefined);
		if (cached) return cached;

		const account = await this.lookUp(options).catch((error: unknown) => {
			this.logger.debug('[AgentIntegrationAccountService] Account lookup failed', {
				type,
				credentialId,
				error: error instanceof Error ? error.name : typeof error,
			});
			return undefined;
		});

		const result = account ?? {};
		const isEmpty = !result.botName && !result.workspaceNames?.length;
		await this.cacheService
			.set(key, result, isEmpty ? EMPTY_ACCOUNT_TTL_MS : ACCOUNT_TTL_MS)
			.catch(() => undefined);
		return result;
	}

	private async lookUp(options: {
		user: User;
		projectId: string;
		type: string;
		credentialId: string;
	}): Promise<AgentIntegrationAccountResponse | undefined> {
		const integration = this.registry.require(options.type);
		for (const credentialType of integration.credentialTypes) {
			const credential = await this.credentialLookup.decryptForUser(
				options.user,
				options.projectId,
				options.credentialId,
				credentialType,
			);
			if (credential) return await integration.describeAccount?.(credential);
		}
		return undefined;
	}
}

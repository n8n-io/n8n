import type { PromotionGitHostType } from '@n8n/api-types';
import { Service } from '@n8n/di';

import type { GitHostClient } from './git-host.types';
import { GitLabHostClient } from './gitlab-host.client';

/** One client for each provider type that has a host API. */
@Service()
export class GitHostClients {
	private readonly clients: Record<PromotionGitHostType, GitHostClient>;

	constructor(gitLab: GitLabHostClient) {
		this.clients = { gitlab: gitLab };
	}

	clientFor(type: PromotionGitHostType): GitHostClient {
		return this.clients[type];
	}
}

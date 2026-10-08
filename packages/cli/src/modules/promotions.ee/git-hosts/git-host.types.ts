import type { PromotionRepository } from '@n8n/api-types';

/** How to reach a Git host's API with a provider's credentials. */
export type GitHostAccess = Readonly<{ baseUrl: string; username: string; accessToken: string }>;

/** Each adapter maps public API paging and search to its host API. */
export type GitHostRepositoryQuery = Readonly<{ search?: string; offset: number; limit: number }>;

export type GitHostRepositoryPage = Readonly<{
	repositories: PromotionRepository[];
	hasNextPage: boolean;
}>;

/** The API of a Git host such as GitLab. Plain Git has no such API. */
export interface GitHostClient {
	/** Check authenticated API access before credentials are saved. */
	validateAccess(access: GitHostAccess): Promise<void>;

	/** Return provider-neutral repository identities and credential-free clone URLs. */
	listRepositories(
		access: GitHostAccess,
		query: GitHostRepositoryQuery,
	): Promise<GitHostRepositoryPage>;
}

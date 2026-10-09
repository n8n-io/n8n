import type { PromotionBranch, PromotionRepository } from '@n8n/api-types';

export type GitHostAccess = Readonly<{
	baseUrl: string;
	username: string;
	accessToken: string;
}>;

export type GitHostDiscoveryQuery = Readonly<{
	offset: number;
	limit: number;
	search?: string;
}>;

export type GitHostPage<T> = { data: T[]; hasNextPage: boolean };

export interface GitHostClient {
	validateAccess(access: GitHostAccess): Promise<void>;
	listRepositories(
		access: GitHostAccess,
		query: GitHostDiscoveryQuery,
	): Promise<GitHostPage<PromotionRepository>>;
	listBranches(
		access: GitHostAccess,
		repositoryId: string,
		query: GitHostDiscoveryQuery,
	): Promise<GitHostPage<PromotionBranch>>;
}

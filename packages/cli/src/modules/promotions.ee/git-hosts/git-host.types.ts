export type GitHostAccess = Readonly<{
	baseUrl: string;
	accessToken: string;
}>;

export interface GitHostClient {
	validateAccess(access: GitHostAccess): Promise<void>;
}

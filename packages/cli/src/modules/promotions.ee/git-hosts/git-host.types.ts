export type GitHostAccess = Readonly<{
	baseUrl: string;
	username: string;
	accessToken: string;
}>;

export interface GitHostClient {
	validateAccess(access: GitHostAccess): Promise<void>;
}

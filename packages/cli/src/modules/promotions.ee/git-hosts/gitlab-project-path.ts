import { BadRequestError } from '@n8n/errors';

const SCP_LIKE_REMOTE = /^[^@/]+@[^:/]+:(?<path>.+)$/;

/** The repository path of an HTTP(S) remote, without the base URL subpath. */
const httpRepositoryPath = (remoteUrl: string, baseUrl: string) => {
	const { pathname } = new URL(remoteUrl);
	const basePath = new URL(baseUrl).pathname.replace(/\/$/, '');
	return basePath && pathname.startsWith(`${basePath}/`)
		? pathname.slice(basePath.length)
		: pathname;
};

/**
 * `group/subgroup/project` from the remote URL. GitLab accepts this URL-encoded
 * path wherever it accepts a numeric project id. A base URL subpath, such as
 * `https://example.com/gitlab`, is not part of the project path.
 */
export const gitlabProjectPath = (remoteUrl: string, baseUrl: string): string => {
	const repositoryPath =
		SCP_LIKE_REMOTE.exec(remoteUrl)?.groups?.path ?? httpRepositoryPath(remoteUrl, baseUrl);
	const projectPath = repositoryPath.replace(/^\/+/, '').replace(/\.git$/, '');
	if (!projectPath.includes('/')) {
		throw new BadRequestError('The remote URL does not name a GitLab project path.');
	}
	return projectPath;
};

import { UserError } from '@n8n/errors';

/** A GitHub link the user pasted, split into its parts. */
export type GitHubLink = {
	owner: string;
	repo: string;
	/** The branch, tag or commit in the link. Undefined means the default branch. */
	ref?: string;
	/** The folder in the repository, without leading or trailing slashes. Empty for the root. */
	path: string;
};

const NAME = /^[A-Za-z0-9_.-]{1,100}$/;

/**
 * Reads a link to a repository, a folder or a SKILL.md file on github.com. A link to
 * a file points at its folder. The first segment after `tree/` or `blob/` is the ref, so
 * a branch with a slash in its name is not supported.
 */
export function parseGitHubLink(raw: string): GitHubLink {
	let url: URL;
	try {
		url = new URL(raw.trim());
	} catch {
		throw new UserError('Paste a link that starts with https://github.com/');
	}
	if (url.protocol !== 'https:' || !['github.com', 'www.github.com'].includes(url.hostname)) {
		throw new UserError('Paste a link that starts with https://github.com/');
	}
	const segments = url.pathname
		.split('/')
		.filter(Boolean)
		.map((segment) => decodeURIComponent(segment));
	const [owner, rawRepo, kind, ref, ...rest] = segments;
	const repo = rawRepo?.replace(/\.git$/, '');
	if (!owner || !repo || !NAME.test(owner) || !NAME.test(repo)) {
		throw new UserError('This link does not point to a GitHub repository.');
	}
	if (kind === undefined) return { owner, repo, path: '' };
	if ((kind !== 'tree' && kind !== 'blob') || !ref) {
		throw new UserError('Paste a link to a repository, a folder or a SKILL.md file.');
	}
	if (rest.some((segment) => segment === '..' || segment === '.')) {
		throw new UserError('This link has an invalid path.');
	}
	let path = rest.join('/');
	if (kind === 'blob') {
		if (rest.at(-1) !== 'SKILL.md') {
			throw new UserError('A link to a file must point to a SKILL.md file.');
		}
		path = rest.slice(0, -1).join('/');
	}
	return { owner, repo, ref, path };
}

/** The folder on github.com, for "Open in GitHub". */
export function gitHubFolderUrl(owner: string, repo: string, ref: string, path: string): string {
	const encoded = [owner, repo, 'tree', ref, ...(path ? path.split('/') : [])]
		.map((segment) => encodeURIComponent(segment))
		.join('/');
	return `https://github.com/${encoded}`;
}

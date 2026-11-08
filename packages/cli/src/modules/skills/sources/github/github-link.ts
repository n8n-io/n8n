import { SKILL_FILE } from './skill-discovery';
import { SkillSourceUrlError } from '../../errors/skill-source-url.error';

/** A link to github.com, split before n8n knows the branches of the repository. */
export type GitHubLink = {
	owner: string;
	repository: string;
	/** `repository`: the root. `tree`: a folder at a ref. `blob`: one file at a ref. */
	kind: 'repository' | 'tree' | 'blob';
	/** The segments after `tree/` or `blob/`: the ref, then the path. A ref can hold "/". */
	rest: string[];
};

export const GITHUB_HOST = 'github.com';

const HOSTS = new Set([GITHUB_HOST, 'www.github.com']);
const NAME = /^[A-Za-z0-9_.-]{1,100}$/;

const NOT_GITHUB = 'This is not a GitHub repository link. Use https://github.com/owner/repo.';

/** Whether the link is on github.com, before any check of its path. */
export function isGitHubLink(input: string): boolean {
	try {
		return HOSTS.has(new URL(input.trim()).hostname.toLowerCase());
	} catch {
		return false;
	}
}

/** Reads a link to a repository, a folder or a SKILL.md on github.com. */
export function parseGitHubLink(input: string): GitHubLink {
	let url: URL;
	try {
		url = new URL(input.trim());
	} catch {
		throw new SkillSourceUrlError(NOT_GITHUB);
	}
	if (url.protocol !== 'https:' || !HOSTS.has(url.hostname.toLowerCase())) {
		throw new SkillSourceUrlError(NOT_GITHUB);
	}
	let segments: string[];
	try {
		segments = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
	} catch {
		throw new SkillSourceUrlError(NOT_GITHUB);
	}
	const [owner, rawRepository, kind, ...rest] = segments;
	const repository = rawRepository?.replace(/\.git$/, '');
	if (!owner || !repository || !NAME.test(owner) || !NAME.test(repository)) {
		throw new SkillSourceUrlError(NOT_GITHUB);
	}
	if (kind === undefined) return { owner, repository, kind: 'repository', rest: [] };
	if ((kind !== 'tree' && kind !== 'blob') || rest.length === 0) {
		throw new SkillSourceUrlError('Use a link to a repository, a folder, or a SKILL.md file.');
	}
	// The URL parser resolves `..`, but an encoded slash survives inside one segment.
	if (rest.some((segment) => segment === '.' || segment === '..' || segment.includes('/'))) {
		throw new SkillSourceUrlError('This link has an invalid path.');
	}
	if (kind === 'blob' && rest.at(-1) !== SKILL_FILE) {
		throw new SkillSourceUrlError('A link to a file must point to a SKILL.md file.');
	}
	return { owner, repository, kind, rest };
}

/**
 * Splits the segments after `tree/` or `blob/` into a branch and a folder. A branch name can
 * hold "/", so the longest branch that the segments start with wins. Undefined when no branch
 * matches, for example a link to a tag or a commit.
 */
export function splitBranchAndPath(
	link: GitHubLink,
	branches: string[],
): { branch: string; path: string } | undefined {
	const segments = link.kind === 'blob' ? link.rest.slice(0, -1) : link.rest;
	let best: string | undefined;
	for (const branch of branches) {
		const parts = branch.split('/');
		const matches =
			parts.length <= segments.length && parts.every((part, index) => segments[index] === part);
		if (matches && (best === undefined || parts.length > best.split('/').length)) best = branch;
	}
	if (best === undefined) return undefined;
	return { branch: best, path: segments.slice(best.split('/').length).join('/') };
}

/** A page on github.com: the folder at the branch, or the root of the repository. */
export function gitHubTreeUrl(
	owner: string,
	repository: string,
	branch: string,
	path: string,
): string {
	const segments = [owner, repository, 'tree', ...branch.split('/'), ...path.split('/')];
	return `https://${GITHUB_HOST}/${segments.filter(Boolean).map(encodeURIComponent).join('/')}`;
}

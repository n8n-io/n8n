import {
	HttpResponseSizeLimitError,
	OutboundHttp,
	type HttpRequestClient,
} from '@n8n/backend-network';
import { Service } from '@n8n/di';
import { LRUCache } from 'lru-cache';

import { ARCHIVE_TOO_LARGE, readRepositoryArchive, type RepositoryArchive } from './github-archive';
import {
	GITHUB_HOST,
	gitHubTreeUrl,
	isGitHubLink,
	parseGitHubLink,
	splitBranchAndPath,
} from './github-link';
import { lsRefsRequestBody, parseLsRefsResponse, type GitRefs } from './git-refs';
import { SKILL_FILE, filesOfSkill, findSkillFolders, isInside } from './skill-discovery';
import { SkillParseError } from '../../errors/skill-parse.error';
import { SkillSourceNotFoundError } from '../../errors/skill-source-not-found.error';
import { SkillSourceReadError } from '../../errors/skill-source-read.error';
import { SkillSourceUrlError } from '../../errors/skill-source-url.error';
import { readSkillFolder } from '../../utils/skill-md';
import {
	SkillSourceClient,
	type FetchedSkill,
	type RemoteSkillRef,
	type SkillSourceAuth,
	type SkillSourceCapabilities,
	type SkillSourceIdentity,
	type SkillSourceLocator,
} from '../skill-source-client';

/** What a GitHub source stores in `skill_source.locator`. */
type GitHubLocator = { owner: string; repository: string; branch: string; path: string };

/** What a synced skill stores in `skill_source_link.remoteRef`: its folder in the repository. */
type GitHubSkillRef = { path: string };

const TIMEOUT_MS = 30_000;
const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
const MAX_REFS_BYTES = 5 * 1024 * 1024;
/** A discover and the fetches of an import read one archive. */
const ARCHIVE_CACHE_MS = 5 * 60_000;
const ARCHIVE_CACHE_SIZE = 4;

const CANNOT_READ = 'n8n cannot read this repository. It is private or does not exist.';

/**
 * Reads skills from public GitHub repositories. Branches come from `ls-refs` over git smart
 * HTTP, and the files from the tarball of one commit, so no call uses the REST API and its
 * rate limit. Every request goes to a fixed GitHub host. The user only fills path segments.
 */
@Service()
export class GitHubSkillSourceClient extends SkillSourceClient {
	readonly type = 'github';

	readonly credentialTypes = ['githubApi', 'githubOAuth2Api', 'githubAppApi'];

	readonly capabilities: SkillSourceCapabilities = {
		discovery: 'listing',
		changeDetection: 'source',
		pinnedFetch: false,
		history: false,
		importFidelity: 'lossless',
	};

	private readonly http: HttpRequestClient;

	private readonly heads = new Map<string, Promise<string>>();

	/** Archives by commit. An expired entry is dropped on its own, so it frees its memory. */
	private readonly archives = new LRUCache<string, Promise<RepositoryArchive>>({
		max: ARCHIVE_CACHE_SIZE,
		ttl: ARCHIVE_CACHE_MS,
		ttlAutopurge: true,
	});

	constructor(outboundHttp: OutboundHttp) {
		super();
		this.http = outboundHttp.requests({ timeout: TIMEOUT_MS, headers: { 'User-Agent': 'n8n' } });
	}

	handles(input: string): boolean {
		return isGitHubLink(input);
	}

	async parseLocator(input: string): Promise<SkillSourceLocator> {
		const { owner, repository, kind, ...link } = parseGitHubLink(input);
		const refs = await this.refs(owner, repository);
		if (kind === 'repository') {
			if (!refs.defaultBranch) {
				throw new SkillSourceNotFoundError('The repository is empty.');
			}
			return { owner, repository, branch: refs.defaultBranch, path: '' };
		}
		const split = splitBranchAndPath({ owner, repository, kind, ...link }, [
			...refs.branches.keys(),
		]);
		if (!split) {
			throw new SkillSourceUrlError(
				'n8n syncs a branch. Use a link to a branch, not to a tag or a commit.',
			);
		}
		return { owner, repository, ...split };
	}

	identity(locator: SkillSourceLocator): SkillSourceIdentity {
		const { owner, repository } = readLocator(locator);
		return { type: this.type, host: GITHUB_HOST, owner, repository };
	}

	describe(locator: SkillSourceLocator): { label: string; ref: string | null; path: string } {
		const { owner, repository, branch, path } = readLocator(locator);
		return { label: `${owner}/${repository}`, ref: branch, path };
	}

	location(ref: RemoteSkillRef): string {
		return readRef(ref).path || '/';
	}

	webUrl(locator: SkillSourceLocator, ref?: RemoteSkillRef): string {
		const { owner, repository, branch, path } = readLocator(locator);
		return gitHubTreeUrl(owner, repository, branch, ref ? readRef(ref).path : path);
	}

	async discover(
		locator: SkillSourceLocator,
	): Promise<{ items: RemoteSkillRef[]; truncated: boolean; revision: string }> {
		const parsed = readLocator(locator);
		const sha = await this.head(parsed);
		const archive = await this.archiveAt(parsed, sha);
		const { path } = parsed;
		if (path && !archive.paths.some((file) => isInside(file, path) && file !== path)) {
			throw new SkillSourceNotFoundError('The folder does not exist on this branch.');
		}
		const { folders, truncated } = findSkillFolders(archive.paths, path);
		const items = folders.map((folder): GitHubSkillRef => ({ path: folder }));
		return { items, truncated, revision: sha };
	}

	async fetchLatest(
		locator: SkillSourceLocator,
		ref: RemoteSkillRef,
		_auth?: SkillSourceAuth,
		revision?: string,
	): Promise<FetchedSkill> {
		const parsed = readLocator(locator);
		const { path } = readRef(ref);
		const sha = revision ?? (await this.head(parsed));
		const archive = await this.archiveAt(parsed, sha);
		const inRepository = (file: string) => (path ? `${path}/${file}` : file);
		const skillFile = inRepository(SKILL_FILE);
		if (archive.oversized.has(skillFile)) {
			throw new SkillParseError(`The SKILL.md of ${path || '/'} is larger than 1 MB.`);
		}
		if (!archive.text.has(skillFile)) {
			throw new SkillSourceNotFoundError(`The skill folder ${path || '/'} has no SKILL.md.`);
		}
		// A reference over the size limit has no text, so it is skipped, not imported empty.
		const all = filesOfSkill(archive.paths, path);
		const oversized = all.filter((file) => archive.oversized.has(inRepository(file)));
		const files = all
			.filter((file) => !archive.oversized.has(inRepository(file)))
			.map((file) => ({ path: file, content: archive.text.get(inRepository(file)) ?? '' }));
		const folderName = path.split('/').at(-1) || parsed.repository;
		const { content, skippedFiles } = readSkillFolder(folderName, files);
		return { content, revision: sha, fidelity: [], skippedFiles: [...skippedFiles, ...oversized] };
	}

	// ---------------------------------------------------------------- GitHub

	private async refs(owner: string, repository: string): Promise<GitRefs> {
		const response = await this.send(
			{
				url: `https://${GITHUB_HOST}/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}.git/git-upload-pack`,
				method: 'POST',
				body: lsRefsRequestBody(),
				headers: {
					'Content-Type': 'application/x-git-upload-pack-request',
					Accept: 'application/x-git-upload-pack-result',
					'Git-Protocol': 'version=2',
				},
			},
			{
				bytes: MAX_REFS_BYTES,
				message: 'The repository has more branches than n8n can read.',
				reason: 'unreachable',
			},
		);
		try {
			return parseLsRefsResponse(response);
		} catch (error) {
			throw new SkillSourceReadError('unreachable', 'GitHub sent an answer n8n cannot read.', {
				cause: error,
			});
		}
	}

	/**
	 * The commit at the head of the branch. Lookups that run at the same time share one
	 * request, such as the fetches of one import. A later lookup asks again, so a push is
	 * seen at once. The archive is cached by commit, so it downloads once.
	 */
	private async head(locator: GitHubLocator): Promise<string> {
		// GitHub ignores the case of owner and repository, but not of a branch.
		const key = `${locator.owner}/${locator.repository}`.toLowerCase() + `@${locator.branch}`;
		const pending = this.heads.get(key);
		if (pending) return await pending;
		const sha = this.refs(locator.owner, locator.repository)
			.then((refs) => {
				const commit = refs.branches.get(locator.branch);
				if (!commit) {
					throw new SkillSourceNotFoundError(`The branch ${locator.branch} does not exist.`);
				}
				return commit;
			})
			.finally(() => this.heads.delete(key));
		this.heads.set(key, sha);
		return await sha;
	}

	private async archiveAt(locator: GitHubLocator, sha: string): Promise<RepositoryArchive> {
		const { owner, repository } = locator;
		const key = `${owner}/${repository}@${sha}`.toLowerCase();
		const cached = this.archives.get(key);
		if (cached) return await cached;
		const path = [owner, repository, 'tar.gz', sha].map(encodeURIComponent).join('/');
		const archive = this.send(
			{ url: `https://codeload.${GITHUB_HOST}/${path}`, method: 'GET' },
			{ bytes: MAX_ARCHIVE_BYTES, message: ARCHIVE_TOO_LARGE, reason: 'archive_too_large' },
		).then(readRepositoryArchive);
		this.archives.set(key, archive);
		archive.catch(() => this.archives.delete(key));
		return await archive;
	}

	private async send(
		request: {
			url: string;
			method: 'GET' | 'POST';
			body?: Buffer;
			headers?: Record<string, string>;
		},
		limit: { bytes: number; message: string; reason: SkillSourceReadError['reason'] },
	): Promise<Buffer> {
		let response;
		try {
			response = await this.http.request<Buffer | ArrayBuffer>({
				...request,
				encoding: 'arraybuffer',
				json: false,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
				maxResponseBodyBytes: limit.bytes,
			});
		} catch (error) {
			if (error instanceof HttpResponseSizeLimitError) {
				throw new SkillSourceReadError(limit.reason, limit.message, { cause: error });
			}
			throw new SkillSourceReadError('unreachable', 'n8n could not reach GitHub.', {
				cause: error,
			});
		}
		const { statusCode, headers } = response;
		if (statusCode >= 200 && statusCode < 300) return Buffer.from(response.body as ArrayBuffer);
		if (statusCode === 429 || (statusCode === 403 && rateLimitSpent(headers))) {
			throw new SkillSourceReadError(
				'rate_limited',
				'GitHub limits how often n8n can read it. Try again in a few minutes.',
			);
		}
		// Smart HTTP answers 401 for a repository that is private or does not exist.
		if (statusCode === 401 || statusCode === 403 || statusCode === 404 || statusCode === 451) {
			throw new SkillSourceNotFoundError(CANNOT_READ);
		}
		throw new SkillSourceReadError('unreachable', `GitHub answered with status ${statusCode}.`);
	}
}

/** GitHub sends `x-ratelimit-remaining: 0` with a 403 when the limit is spent. */
function rateLimitSpent(headers: Record<string, unknown>): boolean {
	const remaining = headers['x-ratelimit-remaining'];
	return remaining === '0' || remaining === 0;
}

function readLocator(locator: SkillSourceLocator): GitHubLocator {
	const { owner, repository, branch, path } = locator;
	if (
		typeof owner !== 'string' ||
		typeof repository !== 'string' ||
		typeof branch !== 'string' ||
		typeof path !== 'string'
	) {
		throw new SkillSourceUrlError('This is not a GitHub source.');
	}
	return { owner, repository, branch, path };
}

function readRef(ref: RemoteSkillRef): GitHubSkillRef {
	if (typeof ref.path !== 'string') throw new SkillSourceUrlError('This is not a GitHub skill.');
	return { path: ref.path };
}

import { agentSkillReferencePathSchema } from '@n8n/api-types';
import {
	HttpResponseSizeLimitError,
	OutboundHttp,
	type HttpRequestClient,
} from '@n8n/backend-network';
import { Service } from '@n8n/di';
import { LRUCache } from 'lru-cache';
import type { Readable } from 'node:stream';
import pLimit from 'p-limit';

import {
	DEFAULT_ARCHIVE_LIMITS,
	archiveSize,
	readRepositoryArchive,
	type ArchiveLimits,
	type RepositoryArchive,
} from './github-archive';
import {
	GITHUB_HOST,
	gitHubTreeUrl,
	isGitHubLink,
	parseGitHubLink,
	splitBranchAndPath,
} from './github-link';
import { lsRefsRequestBody, parseLsRefsResponse, type GitRefs } from './git-refs';
import { discoverPluginGroups } from './plugin-discovery';
import { SKILL_FILE, filesOfSkill, findSkillFolders, isInside } from './skill-discovery';
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
	type SkillSourceListing,
} from '../skill-source-client';

/** What a GitHub source stores in `skill_source.locator`. */
type GitHubLocator = { owner: string; repository: string; branch: string; path: string };

/** What a synced skill stores in `skill_source_link.remoteRef`: its folder in the repository. */
type GitHubSkillRef = { path: string };

const TIMEOUT_MS = 30_000;
/** The whole download of an archive, so a large repository cannot keep a request open. */
const ARCHIVE_DOWNLOAD_MS = 2 * 60_000;
const MAX_REFS_BYTES = 5 * 1024 * 1024;
/** A discover and the fetches of an import read one archive. */
const ARCHIVE_CACHE_MS = 5 * 60_000;
const ARCHIVE_CACHE_SIZE = 4;
/** Bytes of paths and text that the cached archives hold together. */
const ARCHIVE_CACHE_BYTES = 64 * 1024 * 1024;
/** A download in progress is not in the cache budget, so few run at a time. */
const MAX_ARCHIVE_DOWNLOADS = 2;

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
		pinnedFetch: true,
		history: false,
		// An import keeps SKILL.md and `references/*.md` only. It lists the other files in
		// `skippedFiles`.
		importFidelity: 'lossy',
	};

	private readonly http: HttpRequestClient;

	private readonly heads = new Map<string, Promise<string>>();

	/**
	 * Archives by commit and folder. An expired entry is dropped on its own, so it frees its
	 * memory. A pending download has size 1 until it resolves.
	 */
	private readonly archives = new LRUCache<string, Promise<RepositoryArchive>>({
		max: ARCHIVE_CACHE_SIZE,
		maxSize: ARCHIVE_CACHE_BYTES,
		ttl: ARCHIVE_CACHE_MS,
		ttlAutopurge: true,
	});

	private readonly downloads = pLimit(MAX_ARCHIVE_DOWNLOADS);

	/** Protected so that tests can set small limits. */
	protected readonly archiveLimits: ArchiveLimits = DEFAULT_ARCHIVE_LIMITS;

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
		// ls-refs lists branches only, so a tag, a commit and a typo look the same here.
		if (!split) {
			throw new SkillSourceUrlError(
				'n8n cannot find this branch. Use a link to a branch, not to a tag or a commit.',
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

	async discover(locator: SkillSourceLocator): Promise<SkillSourceListing> {
		const parsed = readLocator(locator);
		const sha = await this.head(parsed);
		const archive = await this.archiveAt(parsed, sha);
		const { path } = parsed;
		if (path && !archive.paths.some((file) => isInside(file, path) && file !== path)) {
			throw new SkillSourceNotFoundError('The folder does not exist on this branch.');
		}
		const { folders, truncated, tooDeep } = findSkillFolders(archive.paths, path);
		const items = folders.map((folder): GitHubSkillRef => ({ path: folder }));
		const { groups, groupingWarnings, externalPlugins } = discoverPluginGroups(
			archive,
			folders,
			path,
		);
		return {
			items,
			truncated,
			tooDeep,
			revision: sha,
			...(groups.length > 0
				? {
						groups: groups.map(({ paths, ...group }) => ({
							...group,
							refs: paths.map((folder) => ({ path: folder })),
						})),
					}
				: {}),
			...(groupingWarnings.length > 0 ? { groupingWarnings } : {}),
			...(externalPlugins.length > 0 ? { externalPlugins } : {}),
		};
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
			throw new SkillSourceReadError(
				'over_limit',
				`The SKILL.md of ${path || '/'} is larger than 1 MB.`,
			);
		}
		if (!archive.text.has(skillFile)) {
			throw new SkillSourceNotFoundError(`The skill folder ${path || '/'} has no SKILL.md.`);
		}
		// An oversized reference must not leave the imported skill incomplete.
		const all = filesOfSkill(archive.paths, path);
		const included = new Set(all.map(inRepository));
		const excluded = archive.paths
			.filter((file) => isInside(file, path) && !included.has(file))
			.map((file) => (path ? file.slice(path.length + 1) : file));
		const oversized = all.filter((file) => archive.oversized.has(inRepository(file)));
		if (oversized.some((file) => agentSkillReferencePathSchema.safeParse(file).success)) {
			throw new SkillSourceReadError('over_limit', 'A reference is larger than 1 MB.');
		}
		const files = all
			.filter((file) => !archive.oversized.has(inRepository(file)))
			.map((file) => ({ path: file, content: archive.text.get(inRepository(file)) ?? '' }));
		const folderName = path.split('/').at(-1) || parsed.repository;
		const { content, skippedFiles } = readSkillFolder(folderName, files);
		return {
			content,
			revision: sha,
			fidelity: [],
			skippedFiles: [...skippedFiles, ...oversized, ...excluded].sort(),
		};
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

	/** The archive of the folder of the link. Each link keeps only the files under its folder. */
	private async archiveAt(locator: GitHubLocator, sha: string): Promise<RepositoryArchive> {
		const { owner, repository, path } = locator;
		// The folder keeps its case, as the paths in the archive do.
		const key = `${owner}/${repository}@${sha}`.toLowerCase() + `:${path}`;
		const cached = this.archives.get(key);
		if (cached) return await cached;
		const archive = this.downloads(async () => await this.download(locator, sha));
		this.archives.set(key, archive, { size: 1 });
		archive.then(
			(read) => {
				// The cache sizes an entry only when its value changes, so a new promise replaces
				// the pending one. Over the budget, the cache drops the entry instead.
				if (this.archives.peek(key) === archive) {
					this.archives.set(key, Promise.resolve(read), {
						size: Math.max(1, archiveSize(read)),
						noUpdateTTL: true,
					});
				}
			},
			() => {
				if (this.archives.peek(key) === archive) this.archives.delete(key);
			},
		);
		return await archive;
	}

	private async download(locator: GitHubLocator, sha: string): Promise<RepositoryArchive> {
		const { owner, repository, path } = locator;
		const segments = [owner, repository, 'tar.gz', sha].map(encodeURIComponent).join('/');
		const deadline = new AbortController();
		const timer = setTimeout(() => deadline.abort(), ARCHIVE_DOWNLOAD_MS);
		try {
			let response;
			try {
				response = await this.http.request<Readable>({
					url: `https://codeload.${GITHUB_HOST}/${segments}`,
					method: 'GET',
					encoding: 'stream',
					json: false,
					returnFullResponse: true,
					ignoreHttpStatusErrors: true,
					abortSignal: deadline.signal,
				});
			} catch (error) {
				throw new SkillSourceReadError('unreachable', 'n8n could not reach GitHub.', {
					cause: error,
				});
			}
			if (!isSuccess(response.statusCode)) {
				response.body.destroy();
				throwForStatus(response.statusCode, response.headers);
			}
			return await readRepositoryArchive(response.body, {
				root: path,
				signal: deadline.signal,
				limits: this.archiveLimits,
			});
		} finally {
			clearTimeout(timer);
			// Frees the connection when the read stopped early.
			deadline.abort();
		}
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
		if (!isSuccess(statusCode)) throwForStatus(statusCode, headers);
		return Buffer.from(response.body as ArrayBuffer);
	}
}

function isSuccess(statusCode: number): boolean {
	return statusCode >= 200 && statusCode < 300;
}

function throwForStatus(statusCode: number, headers: Record<string, unknown>): never {
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

import {
	HttpResponseSizeLimitError,
	OutboundHttp,
	type HttpRequestClient,
} from '@n8n/backend-network';
import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';
import { isRecord } from '@n8n/utils/is-record';
import { LRUCache } from 'lru-cache';
import type { Readable } from 'node:stream';
import pLimit from 'p-limit';
import { createHash } from 'node:crypto';

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
	type SkillSourceRepository,
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
const CREDENTIAL_CANNOT_READ =
	'The credential cannot read this repository, or the repository does not exist.';
const CREDENTIAL_INVALID = 'GitHub refused the credential. Its token is wrong or expired.';

const API = 'https://api.github.com';
/** The repositories that the repository select lists at most: 10 pages of 100. */
const MAX_REPOSITORY_PAGES = 10;
const TOKEN_CREDENTIAL = 'githubApi';
const APP_CREDENTIAL = 'githubAppApi';

/**
 * Reads skills from GitHub repositories. Branches come from `ls-refs` over git smart HTTP. A
 * public tarball comes from codeload, so a public source makes no REST call. A private source
 * reads its tarball through the REST API with the token of its credential, and the repository
 * select lists repositories through the REST API, so both count against the REST rate limit of
 * that token. Every request goes to a fixed GitHub host. The user only fills path segments.
 */
@Service()
export class GitHubSkillSourceClient extends SkillSourceClient {
	readonly type = 'github';

	/**
	 * A personal access token, classic or fine-grained, and a GitHub App installation. Not
	 * OAuth2: its fixed scope gives write access to every repository of the user.
	 */
	readonly credentialTypes = [TOKEN_CREDENTIAL, APP_CREDENTIAL];

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

	/** Both credential types hold the token in `accessToken`. A GitHub App gets a fresh one. */
	authFrom(credential: {
		id?: string;
		type: string;
		data: Record<string, unknown>;
	}): SkillSourceAuth {
		this.checkCredential(credential);
		const { id, type, data } = credential;
		if (typeof data.accessToken !== 'string' || data.accessToken === '') {
			throw new SkillSourceReadError('credential_invalid', 'The credential has no token.');
		}
		return { token: data.accessToken, credentialType: type, ...(id ? { credentialId: id } : {}) };
	}

	/** A credential of another type, or for another GitHub server, is refused. */
	checkCredential(credential: { type: string; data: Record<string, unknown> }): void {
		const { type, data } = credential;
		if (!this.credentialTypes.includes(type)) {
			throw new SkillSourceReadError('credential_invalid', 'GitHub cannot use this credential.');
		}
		// GitHub Enterprise needs a host allowlist first, as the spec plans.
		const server = typeof data.server === 'string' ? data.server.replace(/\/+$/, '') : '';
		if (server !== '' && server !== API) {
			throw new SkillSourceReadError(
				'host_blocked',
				'Skill Sync reads github.com only. This credential is for another GitHub server.',
			);
		}
	}

	async parseLocator(input: string, auth?: SkillSourceAuth): Promise<SkillSourceLocator> {
		const { owner, repository, kind, ...link } = parseGitHubLink(input);
		const refs = await this.refs(owner, repository, auth);
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

	async discover(
		locator: SkillSourceLocator,
		auth?: SkillSourceAuth,
	): Promise<{ items: RemoteSkillRef[]; truncated: boolean; tooDeep: number; revision: string }> {
		const parsed = readLocator(locator);
		const sha = await this.head(parsed, auth);
		const archive = await this.archiveAt(parsed, sha, auth);
		const { path } = parsed;
		if (path && !archive.paths.some((file) => isInside(file, path) && file !== path)) {
			throw new SkillSourceNotFoundError('The folder does not exist on this branch.');
		}
		const { folders, truncated, tooDeep } = findSkillFolders(archive.paths, path);
		const items = folders.map((folder): GitHubSkillRef => ({ path: folder }));
		return { items, truncated, tooDeep, revision: sha };
	}

	async fetchLatest(
		locator: SkillSourceLocator,
		ref: RemoteSkillRef,
		auth?: SkillSourceAuth,
		revision?: string,
	): Promise<FetchedSkill> {
		const parsed = readLocator(locator);
		const { path } = readRef(ref);
		const sha = revision ?? (await this.head(parsed, auth));
		const archive = await this.archiveAt(parsed, sha, auth);
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

	/**
	 * A GitHub App lists the repositories it is installed on. A token lists the repositories
	 * that its user owns, collaborates on, or reaches through an organization.
	 */
	async listRepositories(
		auth: SkillSourceAuth,
	): Promise<{ repositories: SkillSourceRepository[]; truncated: boolean }> {
		const app = auth.credentialType === APP_CREDENTIAL;
		const repositories: SkillSourceRepository[] = [];
		let truncated = false;
		// One page more than the select lists, to tell a full last page from more to come.
		for (let page = 1; page <= MAX_REPOSITORY_PAGES + 1; page++) {
			const url = app
				? `${API}/installation/repositories?per_page=100&page=${page}`
				: `${API}/user/repos?per_page=100&page=${page}&sort=full_name&affiliation=owner,collaborator,organization_member`;
			const body = await this.sendJson(url, auth);
			const items = app && isRecord(body) ? body.repositories : body;
			if (!Array.isArray(items)) {
				throw new SkillSourceReadError('unreachable', 'GitHub sent an answer n8n cannot read.');
			}
			if (page > MAX_REPOSITORY_PAGES) {
				truncated = items.length > 0;
				break;
			}
			repositories.push(...items.flatMap(toRepository));
			if (items.length < 100) break;
		}
		return { repositories: sortRepositories(repositories), truncated };
	}

	// ---------------------------------------------------------------- GitHub

	private async refs(owner: string, repository: string, auth?: SkillSourceAuth): Promise<GitRefs> {
		const response = await this.send(
			{
				url: `https://${GITHUB_HOST}/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}.git/git-upload-pack`,
				method: 'POST',
				body: lsRefsRequestBody(),
				headers: {
					'Content-Type': 'application/x-git-upload-pack-request',
					Accept: 'application/x-git-upload-pack-result',
					'Git-Protocol': 'version=2',
					// Smart HTTP takes the token as the password of any user name.
					...(auth ? { Authorization: `Basic ${basic(auth.token)}` } : {}),
				},
			},
			auth,
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
	private async head(locator: GitHubLocator, auth?: SkillSourceAuth): Promise<string> {
		// GitHub ignores the case of owner and repository, but not of a branch. Each access has
		// its own key, so a lookup never answers with what another credential could read.
		const key =
			`${locator.owner}/${locator.repository}`.toLowerCase() +
			`@${locator.branch}#${accessKey(auth)}`;
		const pending = this.heads.get(key);
		if (pending) return await pending;
		const sha = this.refs(locator.owner, locator.repository, auth)
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

	/**
	 * The archive of the folder of the link. Each link keeps only the files under its folder.
	 * The cache key holds the access, as for `head`, so one credential never gets an archive
	 * that another one read.
	 */
	private async archiveAt(
		locator: GitHubLocator,
		sha: string,
		auth?: SkillSourceAuth,
	): Promise<RepositoryArchive> {
		const { owner, repository, path } = locator;
		// The folder keeps its case, as the paths in the archive do.
		const key = `${owner}/${repository}@${sha}`.toLowerCase() + `:${path}#${accessKey(auth)}`;
		const cached = this.archives.get(key);
		if (cached) return await cached;
		const archive = this.downloads(async () => await this.download(locator, sha, auth));
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

	/**
	 * A public tarball comes from codeload. A private one comes from the REST API, which
	 * redirects to codeload with a short-lived token in the link, so the credential never goes
	 * to codeload: the HTTP client drops `Authorization` on a redirect to another host.
	 */
	private async download(
		locator: GitHubLocator,
		sha: string,
		auth?: SkillSourceAuth,
	): Promise<RepositoryArchive> {
		const { owner, repository, path } = locator;
		const [o, r, s] = [owner, repository, sha].map(encodeURIComponent);
		const target = auth
			? {
					url: `${API}/repos/${o}/${r}/tarball/${s}`,
					headers: bearer(auth),
				}
			: { url: `https://codeload.${GITHUB_HOST}/${o}/${r}/tar.gz/${s}` };
		const deadline = new AbortController();
		const timer = setTimeout(() => deadline.abort(), ARCHIVE_DOWNLOAD_MS);
		try {
			let response;
			try {
				response = await this.http.request<Readable>({
					...target,
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
				throwForStatus(response.statusCode, response.headers, auth);
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

	/** One page of a REST answer as JSON. */
	private async sendJson(url: string, auth: SkillSourceAuth): Promise<unknown> {
		const body = await this.send({ url, method: 'GET', headers: bearer(auth) }, auth, {
			bytes: MAX_REFS_BYTES,
			message: 'GitHub sent too much data.',
			reason: 'unreachable',
		});
		try {
			return jsonParse<unknown>(body.toString('utf8'));
		} catch (error) {
			throw new SkillSourceReadError('unreachable', 'GitHub sent an answer n8n cannot read.', {
				cause: error,
			});
		}
	}

	private async send(
		request: {
			url: string;
			method: 'GET' | 'POST';
			body?: Buffer;
			headers?: Record<string, string>;
		},
		auth: SkillSourceAuth | undefined,
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
		if (!isSuccess(statusCode)) throwForStatus(statusCode, headers, auth);
		return Buffer.from(response.body as ArrayBuffer);
	}
}

function isSuccess(statusCode: number): boolean {
	return statusCode >= 200 && statusCode < 300;
}

function throwForStatus(
	statusCode: number,
	headers: Record<string, unknown>,
	auth?: SkillSourceAuth,
): never {
	if (statusCode === 429 || (statusCode === 403 && rateLimitSpent(headers))) {
		throw new SkillSourceReadError(
			'rate_limited',
			'GitHub limits how often n8n can read it. Try again in a few minutes.',
		);
	}
	// With a token, 401 means GitHub refused the token itself.
	if (auth && statusCode === 401) {
		throw new SkillSourceReadError('credential_invalid', CREDENTIAL_INVALID);
	}
	// Smart HTTP answers 401 for a repository that is private or does not exist.
	if (statusCode === 401 || statusCode === 403 || statusCode === 404 || statusCode === 451) {
		throw new SkillSourceNotFoundError(auth ? CREDENTIAL_CANNOT_READ : CANNOT_READ);
	}
	throw new SkillSourceReadError('unreachable', `GitHub answered with status ${statusCode}.`);
}

const API_HEADERS = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };

/** The headers of a REST call with the token of the access. */
function bearer(auth: SkillSourceAuth): Record<string, string> {
	return { Authorization: `Bearer ${auth.token}`, ...API_HEADERS };
}

function basic(token: string): string {
	return Buffer.from(`x-access-token:${token}`).toString('base64');
}

/**
 * The access part of a cache key: the credential when known, as a GitHub App token changes on
 * every resolve, else a short hash of the token, so a key never holds the token itself. Empty
 * for public.
 */
function accessKey(auth: SkillSourceAuth | undefined): string {
	if (!auth) return '';
	if (auth.credentialId) return `credential:${auth.credentialId}`;
	return createHash('sha256').update(auth.token).digest('hex').slice(0, 16);
}

function toRepository(item: unknown): SkillSourceRepository[] {
	if (!isRecord(item) || !isRecord(item.owner)) return [];
	const { name, private: isPrivate, html_url: url } = item;
	const { login } = item.owner;
	if (typeof name !== 'string' || typeof login !== 'string' || typeof url !== 'string') return [];
	return [{ owner: login, name, private: isPrivate === true, url }];
}

function sortRepositories(repositories: SkillSourceRepository[]): SkillSourceRepository[] {
	const key = (repository: SkillSourceRepository) =>
		`${repository.owner}/${repository.name}`.toLowerCase();
	return repositories.sort((a, b) => key(a).localeCompare(key(b)));
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

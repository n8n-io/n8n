// A fake of the two GitHub hosts that `GitHubSkillSourceClient` reads, on nock: `ls-refs` over
// smart HTTP on github.com, and the tarball of one commit on codeload.github.com.
import nock from 'nock';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { create as createTar } from 'tar';

import { pktLine } from '../../sources/github/git-refs';

type Files = Record<string, string>;

type Repository = {
	defaultBranch: string;
	/** Only a token that was granted the repository reads it. */
	private: boolean;
	/** Files at the head of each branch. */
	branches: Map<string, { sha: string; files: Files }>;
};

/**
 * Repositories by `owner/repository`, served over nock until `stop`. Each change makes a new
 * commit, so the branch moves on. A repository that is not here answers 401, as GitHub does
 * for a private or missing repository.
 */
export class FakeGitHub {
	private readonly repositories = new Map<string, Repository>();

	/** Commits by SHA, for the tarball host and the REST commit list. */
	private readonly commits = new Map<
		string,
		{
			repository: string;
			files: Files;
			key: string;
			/** The order of the commit in its repository. */
			index: number;
			/** Paths that the commit added, changed or removed. */
			changed: string[];
			message: string;
			author: string;
		}
	>();

	/** Requests per host, for tests that count them. */
	readonly requests = { refs: 0, archives: 0 };

	/**
	 * The status that the next requests answer, such as 429, until it is cleared. With
	 * `headers`, the answer sends them too, such as `x-ratelimit-remaining`.
	 */
	failWith: number | { status: number; headers?: Record<string, string> } | undefined;

	private failure(): [number, string, Record<string, string>] | undefined {
		if (this.failWith === undefined) return undefined;
		if (typeof this.failWith === 'number') return [this.failWith, '', {}];
		return [this.failWith.status, '', this.failWith.headers ?? {}];
	}

	/** The repositories that each token reads, by token. */
	private readonly tokens = new Map<string, Set<string>>();

	/** Lets the token read these repositories, and list them. */
	grant(token: string, fullNames: string[]): void {
		const granted = this.tokens.get(token) ?? new Set<string>();
		for (const name of fullNames) granted.add(name.toLowerCase());
		this.tokens.set(token, granted);
	}

	/** 401 for a token GitHub does not know, 404 for a repository the request cannot read. */
	private access(key: string, token: string | undefined): 200 | 401 | 404 {
		if (token !== undefined && !this.tokens.has(token)) return 401;
		const repo = this.repositories.get(key);
		if (!repo) return 404;
		if (repo.private && !(token && this.tokens.get(token)?.has(key))) return 404;
		return 200;
	}

	start(): void {
		// nock gives the request headers only to a `function` reply, as `this.req`.
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const github = this;
		nock('https://github.com')
			.persist()
			.post(/^\/([^/]+)\/([^/]+)\.git\/git-upload-pack$/)
			.reply(function (this: nock.ReplyFnContext, uri) {
				return github.refsReply(uri, basicToken(this.req.headers.authorization));
			});
		nock('https://api.github.com')
			.persist()
			.get(/^\/repos\/([^/]+)\/([^/]+)\/tarball\/([0-9a-f]+)$/)
			.reply(function (this: nock.ReplyFnContext, uri) {
				return github.apiTarballReply(uri, bearerToken(this.req.headers.authorization));
			})
			.get(/^\/repos\/([^/]+)\/([^/]+)\/commits\?/)
			.reply(function (this: nock.ReplyFnContext, uri) {
				return github.commitsReply(uri, bearerToken(this.req.headers.authorization));
			})
			.get(/^\/repos\/([^/]+)\/([^/]+)\/compare\/([0-9a-f]+)\.\.\.([0-9a-f]+)/)
			.reply(function (this: nock.ReplyFnContext, uri) {
				return github.compareReply(uri, bearerToken(this.req.headers.authorization));
			})
			.get(/^\/(user\/repos|installation\/repositories)\?/)
			.reply(function (this: nock.ReplyFnContext, uri) {
				return github.listReply(uri, bearerToken(this.req.headers.authorization));
			});
		nock('https://codeload.github.com')
			.persist()
			.get(/^\/([^/]+)\/([^/]+)\/(tar\.gz|legacy\.tar\.gz)\/([0-9a-f]+)(\?token=.*)?$/)
			.reply((uri) => github.codeloadReply(uri));
	}

	private refsReply(uri: string, token: string | undefined): nock.ReplyFnResult {
		this.requests.refs += 1;
		const failure = this.failure();
		if (failure) return failure;
		const [, owner, repository] = /^\/([^/]+)\/([^/]+)\.git/.exec(uri) ?? [];
		const key = `${owner}/${repository}`.toLowerCase();
		// Without a token, smart HTTP answers 401 for a repository that it cannot show. With a
		// token GitHub knows, it answers 404, and 401 means a bad token.
		const status = this.access(key, token);
		if (status === 404 && token === undefined) return [401, 'Authentication required'];
		if (status !== 200) return [status, ''];
		const repo = this.repositories.get(key);
		return repo ? [200, lsRefsAnswer(repo)] : [401, ''];
	}

	/** The REST tarball redirects to codeload with a short-lived token, as GitHub does. */
	private apiTarballReply(uri: string, token: string | undefined): nock.ReplyFnResult {
		const failure = this.failure();
		if (failure) return failure;
		const [, owner, repository, sha] =
			/^\/repos\/([^/]+)\/([^/]+)\/tarball\/([0-9a-f]+)$/.exec(uri) ?? [];
		const status = this.access(`${owner}/${repository}`.toLowerCase(), token);
		if (status !== 200) return [status, ''];
		const location = `https://codeload.github.com/${owner}/${repository}/legacy.tar.gz/${sha}?token=temp-${sha}`;
		return [302, '', { Location: location }];
	}

	/** The latest commit of `sha`, as `GET /repos/o/r/commits?sha=…&per_page=1` lists it. */
	private commitsReply(uri: string, token: string | undefined): nock.ReplyFnResult {
		const failure = this.failure();
		if (failure) return failure;
		const [, owner, repository] = /^\/repos\/([^/]+)\/([^/]+)\//.exec(uri) ?? [];
		const status = this.access(`${owner}/${repository}`.toLowerCase(), token);
		if (status !== 200) return [status, ''];
		const params = new URL(uri, 'https://api.github.com').searchParams;
		const head = this.commits.get(params.get('sha') ?? '');
		if (!head) return [404, ''];
		// With `path`, the newest commit up to `sha` that touched a file under it, as GitHub does.
		const path = params.get('path');
		const touches = (changed: string[]) =>
			!path || changed.some((file) => file === path || file.startsWith(`${path}/`));
		const found = [...this.commits]
			.filter(([, c]) => c.key === head.key && c.index <= head.index && touches(c.changed))
			.sort(([, a], [, b]) => b.index - a.index)[0];
		if (!found) return [200, []];
		const [sha, commit] = found;
		return [
			200,
			[
				{
					sha,
					commit: {
						message: `${commit.message}\n\nMore detail.`,
						author: { name: commit.author, date: '2026-10-29T12:00:00Z' },
					},
					author: { login: commit.author },
				},
			],
		];
	}

	/** The number of commits between two SHAs of one repository. */
	private compareReply(uri: string, token: string | undefined): nock.ReplyFnResult {
		const failure = this.failure();
		if (failure) return failure;
		const [, owner, repository, base, head] =
			/^\/repos\/([^/]+)\/([^/]+)\/compare\/([0-9a-f]+)\.\.\.([0-9a-f]+)/.exec(uri) ?? [];
		const status = this.access(`${owner}/${repository}`.toLowerCase(), token);
		if (status !== 200) return [status, ''];
		const from = this.commits.get(base);
		const to = this.commits.get(head);
		if (!from || !to) return [404, ''];
		return [200, { total_commits: Math.max(0, to.index - from.index), files: [] }];
	}

	private codeloadReply(uri: string): nock.ReplyFnResult {
		this.requests.archives += 1;
		const failure = this.failure();
		if (failure) return failure;
		const [path, query] = uri.split('?');
		const [, owner, repository, , sha] = path.split('/');
		const commit = this.commits.get(sha);
		const repo = this.repositories.get(`${owner}/${repository}`.toLowerCase());
		if (!commit || !repo) return [404, 'Not found'];
		// A private archive needs the short-lived token of the REST redirect.
		if (repo.private && query !== `token=temp-${sha}`) return [404, 'Not found'];
		return [200, tarball(`${commit.repository}-${sha}`, commit.files)];
	}

	private listReply(uri: string, token: string | undefined): nock.ReplyFnResult {
		const failure = this.failure();
		if (failure) return failure;
		const granted = token === undefined ? undefined : this.tokens.get(token);
		if (!granted) return [401, ''];
		// Pages of `per_page` granted repositories, as GitHub sends them.
		const params = new URL(uri, 'https://api.github.com').searchParams;
		const page = Number(params.get('page') ?? '1');
		const perPage = Number(params.get('per_page') ?? '30');
		const items = [...granted].slice((page - 1) * perPage, page * perPage).flatMap((key) => {
			const repo = this.repositories.get(key);
			const [owner, name] = key.split('/');
			return repo
				? [
						{
							name,
							private: repo.private,
							html_url: `https://github.com/${key}`,
							owner: { login: owner },
						},
					]
				: [];
		});
		return [200, uri.startsWith('/installation') ? { repositories: items } : items];
	}

	stop(): void {
		nock.cleanAll();
		this.tokens.clear();
		this.repositories.clear();
		this.commits.clear();
		this.requests.refs = 0;
		this.requests.archives = 0;
		this.failWith = undefined;
	}

	/** Creates the repository, or a new commit on one branch of it. Answers the commit SHA. */
	push(
		fullName: string,
		files: Files,
		branch = 'main',
		options: { private?: boolean; message?: string; author?: string } = {},
	): string {
		const key = fullName.toLowerCase();
		const repo = this.repositories.get(key) ?? {
			defaultBranch: branch,
			private: options.private === true,
			branches: new Map(),
		};
		this.repositories.set(key, repo);
		const sha = createHash('sha1')
			.update(`${key}@${branch}#${this.commits.size}:${JSON.stringify(files)}`)
			.digest('hex');
		const previous = repo.branches.get(branch)?.files ?? {};
		const paths = new Set([...Object.keys(previous), ...Object.keys(files)]);
		repo.branches.set(branch, { sha, files: { ...files } });
		this.commits.set(sha, {
			repository: fullName.split('/')[1],
			files: { ...files },
			key,
			index: [...this.commits.values()].filter((commit) => commit.key === key).length,
			changed: [...paths].filter((file) => previous[file] !== files[file]),
			message: options.message ?? `Commit ${this.commits.size + 1}`,
			author: options.author ?? 'octocat',
		});
		return sha;
	}

	/** The files at the head of a branch. */
	files(fullName: string, branch = 'main'): Files {
		const head = this.repositories.get(fullName.toLowerCase())?.branches.get(branch);
		if (!head) throw new Error(`No branch ${branch} in ${fullName}`);
		return { ...head.files };
	}
}

function basicToken(header: string | string[] | undefined): string | undefined {
	const value = Array.isArray(header) ? header[0] : header;
	if (!value?.startsWith('Basic ')) return undefined;
	return Buffer.from(value.slice(6), 'base64').toString('utf8').split(':').slice(1).join(':');
}

function bearerToken(header: string | string[] | undefined): string | undefined {
	const value = Array.isArray(header) ? header[0] : header;
	return value?.startsWith('Bearer ') ? value.slice(7) : undefined;
}

function lsRefsAnswer(repo: Repository): Buffer {
	const head = repo.branches.get(repo.defaultBranch);
	const lines = [
		...(head ? [`${head.sha} HEAD symref-target:refs/heads/${repo.defaultBranch}\n`] : []),
		...[...repo.branches].map(([name, { sha }]) => `${sha} refs/heads/${name}\n`),
	];
	return Buffer.from(lines.map(pktLine).join('') + '0000');
}

/** A gzipped tarball with every file under `top/`, as GitHub builds it. */
function tarball(top: string, files: Files): Buffer {
	const dir = mkdtempSync(join(tmpdir(), 'fake-github-'));
	try {
		mkdirSync(join(dir, top));
		for (const [path, content] of Object.entries(files)) {
			const target = join(dir, top, path);
			mkdirSync(dirname(target), { recursive: true });
			writeFileSync(target, content);
		}
		const out = join(dir, 'archive.tar.gz');
		createTar({ gzip: true, cwd: dir, sync: true, file: out, portable: true }, [top]);
		return readFileSync(out);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

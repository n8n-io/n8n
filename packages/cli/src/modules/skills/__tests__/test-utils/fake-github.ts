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

	/** Commits by SHA, for the tarball host. */
	private readonly commits = new Map<string, { repository: string; files: Files }>();

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
		options: { private?: boolean } = {},
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
		repo.branches.set(branch, { sha, files: { ...files } });
		this.commits.set(sha, { repository: fullName.split('/')[1], files: { ...files } });
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

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

	start(): void {
		nock('https://github.com')
			.persist()
			.post(/^\/([^/]+)\/([^/]+)\.git\/git-upload-pack$/)
			.reply((uri) => {
				this.requests.refs += 1;
				const failure = this.failure();
				if (failure) return failure;
				const [, owner, repository] = /^\/([^/]+)\/([^/]+)\.git/.exec(uri) ?? [];
				const repo = this.repositories.get(`${owner}/${repository}`.toLowerCase());
				if (!repo) return [401, 'Authentication required'];
				return [200, lsRefsAnswer(repo)];
			});
		nock('https://codeload.github.com')
			.persist()
			.get(/^\/([^/]+)\/([^/]+)\/tar\.gz\/([0-9a-f]+)$/)
			.reply((uri) => {
				this.requests.archives += 1;
				const failure = this.failure();
				if (failure) return failure;
				const sha = uri.split('/').at(-1) ?? '';
				const commit = this.commits.get(sha);
				if (!commit) return [404, 'Not found'];
				return [200, tarball(`${commit.repository}-${sha}`, commit.files)];
			});
	}

	stop(): void {
		nock.cleanAll();
		this.repositories.clear();
		this.commits.clear();
		this.requests.refs = 0;
		this.requests.archives = 0;
		this.failWith = undefined;
	}

	/** Creates the repository, or a new commit on one branch of it. Answers the commit SHA. */
	push(fullName: string, files: Files, branch = 'main'): string {
		const key = fullName.toLowerCase();
		const repo = this.repositories.get(key) ?? { defaultBranch: branch, branches: new Map() };
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

import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { simpleGit, type SimpleGit } from 'simple-git';

import { InstancePullConfig } from '../instance-pull.config';

/**
 * Thin `simple-git` wrapper for the instance-pull demo.
 *
 * Each role (`dev`/`prd`) clones the shared repo once into a fixed temp dir
 * (`/tmp/n8n-instance-pull-<role>`) and reuses it for every operation, so the
 * working tree persists between calls. Auth is HTTPS PAT, injected into the
 * remote URL at clone time. This is throwaway demo plumbing — no locking, no
 * concurrency guarantees beyond the single in-flight poll loop.
 */
@Service()
export class GitOps {
	/** Fixed working directory keyed by role, e.g. /tmp/n8n-instance-pull-dev. */
	private readonly workDir: string;

	private git: SimpleGit | null = null;

	constructor(
		private readonly config: InstancePullConfig,
		private readonly logger: Logger,
	) {
		this.workDir = path.join(os.tmpdir(), `n8n-instance-pull-${this.config.role}`);
	}

	/** Absolute path of the working tree (where exported packages get written). */
	getWorkDir(): string {
		return this.workDir;
	}

	/**
	 * Ensure the repo is cloned into the fixed working dir and return a git
	 * client bound to it. Clones on first call; reuses the clone afterwards.
	 */
	async ensureRepo(): Promise<SimpleGit> {
		if (this.git) return this.git;

		const gitDir = path.join(this.workDir, '.git');
		const alreadyCloned = await this.pathExists(gitDir);

		if (alreadyCloned) {
			this.logger.debug(`[instance-pull] reusing clone at ${this.workDir}`);
			this.git = simpleGit(this.workDir);
		} else {
			await fs.mkdir(this.workDir, { recursive: true });
			this.logger.info(`[instance-pull] cloning ${this.config.ghRepo} into ${this.workDir}`);
			const root = simpleGit();
			await root.clone(this.authedRemoteUrl(), this.workDir);
			this.git = simpleGit(this.workDir);
		}

		return this.git;
	}

	/** Fetch the base branch and hard-reset the working tree onto its remote tip. */
	async resetToBase(): Promise<void> {
		const git = await this.ensureRepo();
		const { branchBase } = this.config;
		await git.fetch('origin', branchBase);
		await git.checkout(branchBase);
		await git.reset(['--hard', `origin/${branchBase}`]);
	}

	/**
	 * Create (or reset) a feature branch off the freshly fetched base. The branch
	 * is force-pointed at the base tip so re-raising a review starts clean.
	 */
	async checkoutFeatureBranch(branch: string): Promise<void> {
		const git = await this.ensureRepo();
		await this.resetToBase();
		// -B creates or resets the branch to the current HEAD (the base tip).
		await git.checkout(['-B', branch]);
	}

	/** Stage everything and commit. Returns the new commit SHA. */
	async commitAll(message: string): Promise<string> {
		const git = await this.ensureRepo();
		await git.add(['-A']);
		// Demo commits are unsigned: the n8n process has no signing key, so honour
		// no global commit.gpgsign by overriding it per commit.
		await git.commit(message, { '--no-gpg-sign': null });
		return (await git.revparse(['HEAD'])).trim();
	}

	/** Push the given branch to origin, setting upstream and force-overwriting. */
	async pushBranch(branch: string): Promise<void> {
		const git = await this.ensureRepo();
		// Plain --force, not --force-with-lease: the feature branch is deterministic
		// per workflow and fully regenerated off base on every raise, and we only
		// fetch the base branch — so there's no fresh remote-tracking ref for the
		// lease to check, and --force-with-lease rejects a re-raise with "stale info".
		await git.push('origin', branch, ['--set-upstream', '--force']);
	}

	/** Fetch + hard-reset onto a remote branch (used by prd to read a PR branch). */
	async fetchAndCheckout(branch: string): Promise<void> {
		const git = await this.ensureRepo();
		await git.fetch('origin', branch);
		await git.checkout(['-B', branch, `origin/${branch}`]);
		await git.reset(['--hard', `origin/${branch}`]);
	}

	/** Pull (fast-forward) the base branch — used by prd after a merge to publish. */
	async pullBase(): Promise<void> {
		await this.resetToBase();
	}

	/** Inject the PAT into the HTTPS remote so clone/fetch/push authenticate. */
	private authedRemoteUrl(): string {
		const { repoUrl, ghToken } = this.config;
		try {
			const url = new URL(repoUrl);
			// GitHub accepts `x-access-token:<PAT>` basic-auth over HTTPS.
			url.username = 'x-access-token';
			url.password = ghToken;
			return url.toString();
		} catch {
			return repoUrl;
		}
	}

	private async pathExists(target: string): Promise<boolean> {
		try {
			await fs.access(target);
			return true;
		} catch {
			return false;
		}
	}
}

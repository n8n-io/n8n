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
 * remote URL at clone time. Throwaway demo plumbing — no locking.
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
			this.git = simpleGit(this.workDir, { config: this.authConfig() });
		} else {
			await fs.mkdir(this.workDir, { recursive: true });
			this.logger.info(`[instance-pull] cloning ${this.config.ghRepo} into ${this.workDir}`);
			const root = simpleGit({ config: this.authConfig() });
			// Clean URL as origin (no token in .git/config); auth is supplied per-command below.
			await root.clone(this.config.repoUrl, this.workDir);
			this.git = simpleGit(this.workDir, { config: this.authConfig() });
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
		// Demo commits are unsigned: the n8n process has no signing key, so override
		// any global commit.gpgsign per commit.
		await git.commit(message, { '--no-gpg-sign': null });
		return (await git.revparse(['HEAD'])).trim();
	}

	/** Push the given branch to origin, setting upstream and force-overwriting. */
	async pushBranch(branch: string): Promise<void> {
		const git = await this.ensureRepo();
		// Plain --force: the feature branch is deterministic per workflow and fully
		// regenerated off base on every raise; we only fetch the base branch, so
		// --force-with-lease would reject a re-raise with "stale info".
		await git.push('origin', branch, ['--set-upstream', '--force']);
	}

	/**
	 * Auth for clone/fetch/push via a per-command `http.extraheader` rather than a
	 * token embedded in the remote URL — so the PAT is NOT persisted in `.git/config`.
	 * The token is still transiently present in the git process argv (acceptable for
	 * this throwaway demo; a credential helper would remove even that).
	 */
	private authConfig(): string[] {
		const basic = Buffer.from(`x-access-token:${this.config.ghToken}`).toString('base64');
		return [`http.extraheader=AUTHORIZATION: basic ${basic}`];
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

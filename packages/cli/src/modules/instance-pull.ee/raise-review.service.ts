import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import fs from 'node:fs/promises';
import path from 'node:path';
import { UserError } from 'n8n-workflow';

import { FilesystemPackageWriter } from '@/modules/n8n-packages/io/fs/filesystem-package-writer';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';

import { GitOps } from './git/git-ops';
import { GitHubClient } from './github/github-client';
import { InstancePullConfig } from './instance-pull.config';

/** Top-level package entries a fresh export owns; cleared so each PR is self-contained. */
const PACKAGE_ENTRIES = ['manifest.json', 'workflows', 'credentials', 'folders', 'projects'];

export interface RaiseReviewResult {
	prUrl: string;
	prNumber: number;
}

/**
 * Dev-side "raise review": export the chosen workflows as an exploded package into
 * the git working tree, commit a deterministic feature branch, push, and open (or
 * reuse) a PR against the production-workflows repo. The PR is the review; the CI
 * dry-run gates it; merge publishes.
 */
@Service()
export class RaiseReviewService {
	constructor(
		private readonly config: InstancePullConfig,
		private readonly logger: Logger,
		private readonly gitOps: GitOps,
		private readonly gitHub: GitHubClient,
		private readonly packagesService: N8nPackagesService,
	) {}

	/** Serializes raises against the shared working dir (single-flight queue). */
	private chain: Promise<unknown> = Promise.resolve();

	async raiseReview(user: User, workflowIds: string[]): Promise<RaiseReviewResult> {
		// The git working dir + clone are shared singletons with no locking, so overlapping
		// raises would interleave checkout/clear/export/commit and corrupt each other. Queue them.
		const run = this.chain.then(async () => await this.doRaiseReview(user, workflowIds));
		this.chain = run.then(
			() => undefined,
			() => undefined,
		);
		return await run;
	}

	private async doRaiseReview(user: User, workflowIds: string[]): Promise<RaiseReviewResult> {
		this.assertConfigured();
		if (workflowIds.length === 0) {
			throw new UserError('Select at least one workflow to raise a review.');
		}

		const branch = `instance-pull/review-${workflowIds.join('-')}`;

		// Start the branch from a fresh base, then make the package self-contained.
		await this.gitOps.checkoutFeatureBranch(branch);
		await this.clearPackage(this.gitOps.getWorkDir());
		await this.packagesService.exportToWriter(
			{ user, workflowIds },
			new FilesystemPackageWriter(this.gitOps.getWorkDir()),
		);

		await this.gitOps.commitAll(`Publish review: ${workflowIds.length} workflow(s)`);
		await this.gitOps.pushBranch(branch);

		const pr = await this.gitHub.openPullRequest({
			head: branch,
			base: this.config.branchBase,
			title: `Publish ${workflowIds.length} workflow(s) to production`,
			body: [
				'Raised from n8n (dev) via instance-pull.',
				'',
				`Workflows: ${workflowIds.join(', ')}`,
				'',
				'The deploy dry-run check must pass before this can be merged.',
			].join('\n'),
		});

		this.logger.info(`[instance-pull] raised review PR #${pr.prNumber} (${pr.url})`);
		return { prUrl: pr.url, prNumber: pr.prNumber };
	}

	/** Remove prior package content so the branch holds exactly this review's workflows. */
	private async clearPackage(workDir: string): Promise<void> {
		await Promise.all(
			PACKAGE_ENTRIES.map(async (entry) =>
				fs.rm(path.join(workDir, entry), { recursive: true, force: true }),
			),
		);
	}

	private assertConfigured(): void {
		if (!this.config.enabled) {
			throw new UserError('instance-pull demo is disabled (set N8N_INSTANCE_PULL_DEMO=true).');
		}
		const { repoUrl, ghOwner, ghRepo, ghToken } = this.config;
		if (!repoUrl || !ghOwner || !ghRepo || !ghToken) {
			throw new UserError(
				'instance-pull is missing GitHub config (INSTANCE_PULL_REPO_URL / GH_OWNER / GH_REPO / GH_TOKEN).',
			);
		}
	}
}

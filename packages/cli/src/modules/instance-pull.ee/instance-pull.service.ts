import type { ReviewSummary, WorkflowDiffPayload } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ProjectRepository, WorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse, OperationalError } from 'n8n-workflow';

import { OwnershipService } from '@/services/ownership.service';
import { FilesystemPackageReader } from '@/modules/n8n-packages/io/fs/filesystem-package-reader';
import { FilesystemPackageWriter } from '@/modules/n8n-packages/io/fs/filesystem-package-writer';
import { ImportPipeline } from '@/modules/n8n-packages/engine/import-pipeline';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import type {
	BlockingIssue,
	ImportContext,
	ImportPackageRequest,
} from '@/modules/n8n-packages/n8n-packages.types';
import {
	WorkflowConflictPolicy,
	WorkflowIdPolicy,
	WorkflowPublishingPolicy,
} from '@/modules/n8n-packages/n8n-packages.types';

import { GitOps } from './git/git-ops';
import { GitHubClient, type PullRequestDetails } from './github/github-client';
import { BlockingIssuesToMarkdown } from './github/blocking-issues-to-markdown';
import { InstancePullConfig } from './instance-pull.config';

/** Branch prefix marking a branch (and therefore PR) as belonging to this demo. */
const BRANCH_PREFIX = 'instance-pull/';

/** Status check / comment context shared with the GitHub client. */
type ValidationCacheEntry = {
	issues: BlockingIssue[];
	validatedSha: string;
};

/**
 * Orchestrates the instance-pull demo flow:
 * - `dev` raises a review (export -> commit -> push -> open PR) and lists its own PRs.
 * - `prd` lists incoming PRs, validates them (plan-only), and publishes merged ones.
 *
 * POC simplifications (see tasks/plan.md):
 * - The acting user is the instance owner (no per-request actor on the poll loop).
 * - Validation results are cached in-memory per PR as a read-model for the
 *   dashboards; the poll loop re-validates every cycle so a freshly-created
 *   credential flips the PR from blocked to ready.
 * - `publishedPrNumbers` is process-local; multi-main is out of scope.
 */
@Service()
export class InstancePullService {
	/** Plan-only validation result per PR, refreshed on every validatePR() call. */
	private readonly validationCache = new Map<number, ValidationCacheEntry>();

	/** PR numbers already published on this process, so a merge publishes once. */
	private readonly publishedPrNumbers = new Set<number>();

	constructor(
		private readonly config: InstancePullConfig,
		private readonly logger: Logger,
		private readonly gitOps: GitOps,
		private readonly gitHubClient: GitHubClient,
		private readonly markdown: BlockingIssuesToMarkdown,
		private readonly packagesService: N8nPackagesService,
		private readonly importPipeline: ImportPipeline,
		private readonly ownershipService: OwnershipService,
		private readonly projectRepository: ProjectRepository,
		private readonly workflowRepository: WorkflowRepository,
	) {
		this.logger = this.logger.scoped('instance-pull');
	}

	/** Guards every entry point: the module is a no-op unless the demo flag is set. */
	private assertEnabled() {
		if (!this.config.enabled) {
			throw new OperationalError(
				'instance-pull demo is disabled (set N8N_INSTANCE_PULL_DEMO=true)',
			);
		}
	}

	/** (dev) Export the workflow as an exploded package, push a feature branch, and open a PR. */
	async raiseReview(
		workflowId: string,
	): Promise<{ pullRequestUrl: string; pullRequestNumber: number }> {
		this.assertEnabled();

		const owner = await this.getOwner();
		const workflow = await this.workflowRepository.findOneBy({ id: workflowId });
		if (!workflow) {
			throw new OperationalError(`instance-pull: workflow ${workflowId} not found`);
		}

		const branch = `${BRANCH_PREFIX}${workflowId}`;

		// Start from a clean feature branch off the freshly-fetched base.
		await this.gitOps.checkoutFeatureBranch(branch);

		// Export the exploded package straight into the git working tree.
		const writer = new FilesystemPackageWriter(this.gitOps.getWorkDir());
		await this.packagesService.exportWorkflows({ user: owner, workflowIds: [workflowId] }, writer);

		await this.gitOps.commitAll(`Publish review: ${workflow.name} (${workflowId})`);
		await this.gitOps.pushBranch(branch);

		const pr = await this.gitHubClient.openPullRequest({
			head: branch,
			base: this.config.branchBase,
			title: `Publish: ${workflow.name}`,
			body: `Automated publish review for workflow \`${workflow.name}\` (\`${workflowId}\`).`,
		});

		this.logger.info(`[instance-pull] opened PR #${pr.prNumber} for workflow ${workflowId}`);
		return { pullRequestUrl: pr.url, pullRequestNumber: pr.prNumber };
	}

	/** (dev) List the PRs this instance has raised, with their current status. */
	async myReviews(): Promise<ReviewSummary[]> {
		this.assertEnabled();
		return await this.summarisePullRequests();
	}

	/** (prd) List incoming PRs with cached validation status and blockers. */
	async requests(): Promise<ReviewSummary[]> {
		this.assertEnabled();
		return await this.summarisePullRequests();
	}

	/** (prd) Run plan-only validation of a PR's package against the local DB. No writes. */
	async validatePR(prNumber: number): Promise<BlockingIssue[]> {
		this.assertEnabled();

		const pr = await this.gitHubClient.getPullRequest(prNumber);

		// Always re-validate. Creating the missing credential on prd does NOT change
		// the PR's head SHA, so a SHA-keyed short-circuit would pin the result to
		// "blocked" forever and the check would never flip green. The cache below is
		// only a read-model for myReviews()/requests(); the poll loop refreshes it.

		// Materialise the PR branch's package into the working tree, then plan-only.
		await this.gitOps.fetchAndCheckout(pr.head.ref);
		const reader = new FilesystemPackageReader(this.gitOps.getWorkDir());

		const context = await this.getImportContext();
		const issues = await this.importPipeline.validate(reader, context, this.importRequest(context));

		this.validationCache.set(prNumber, { issues, validatedSha: pr.head.sha });
		return issues;
	}

	/** (prd) Pull `main`, import the merged package, and activate the workflow. */
	async publishMerged(prNumber: number): Promise<void> {
		this.assertEnabled();

		await this.gitOps.pullBase();
		const reader = new FilesystemPackageReader(this.gitOps.getWorkDir());
		const manifest = await reader.readManifest();

		// `run()` expects a package buffer; the instance-pull import reads from the
		// working tree, so we route through the reader-based pipeline directly.
		const context = await this.getImportContext();
		await this.importPipeline.runFromReader(reader, context, this.importRequest(context, true));

		const names = (manifest.workflows ?? []).map((w) => w.name).join(', ');
		this.logger.info(
			`[instance-pull] published PR #${prNumber} from ${this.config.branchBase}: ${names}`,
		);
	}

	/**
	 * (prd) Build the publish diff for a PR: the workflow currently on this
	 * instance (`source`, null if absent) vs the incoming version from the PR
	 * package (`target`). Read-only; backs the in-app visual diff view.
	 */
	async workflowDiff(prNumber: number): Promise<WorkflowDiffPayload> {
		this.assertEnabled();

		const pr = await this.gitHubClient.getPullRequest(prNumber);
		const workflowId = pr.head.ref.startsWith(BRANCH_PREFIX)
			? pr.head.ref.slice(BRANCH_PREFIX.length)
			: pr.head.ref;

		// Incoming version: read the workflow from the PR branch package.
		await this.gitOps.fetchAndCheckout(pr.head.ref);
		const reader = new FilesystemPackageReader(this.gitOps.getWorkDir());
		const manifest = await reader.readManifest();
		const workflows = manifest.workflows ?? [];
		const entry = workflows.find((w) => w.id === workflowId) ?? workflows[0];
		if (!entry) {
			throw new OperationalError(`instance-pull: PR #${prNumber} package has no workflow`);
		}
		const raw = await reader.readFile(`${entry.target}/workflow.json`);
		const incoming = jsonParse<WorkflowDiffPayload['target']>(raw.toString('utf-8'));

		// Current version on this (prd) instance — may not exist yet (first publish).
		const current = await this.workflowRepository.findOneBy({ id: workflowId });

		return {
			source: current
				? {
						id: current.id,
						name: current.name,
						nodes: current.nodes,
						connections: current.connections,
						settings: current.settings,
					}
				: null,
			target: {
				id: incoming.id,
				name: incoming.name,
				nodes: incoming.nodes,
				connections: incoming.connections,
				settings: incoming.settings,
			},
		};
	}

	// ---------------------------------------------------------------------------
	// Internal helpers
	// ---------------------------------------------------------------------------

	/** Build a ReviewSummary list from the open PRs + cached validation results. */
	private async summarisePullRequests(): Promise<ReviewSummary[]> {
		const open = await this.listInstancePullRequests('open');
		const summaries = open.map((pr) => this.toSummary(pr, false));

		// Surface any PR already published this process as "published" too.
		const closed = await this.listInstancePullRequests('closed');
		for (const pr of closed) {
			if (pr.merged) summaries.push(this.toSummary(pr, true));
		}
		return summaries;
	}

	private toSummary(pr: PullRequestDetails, mergedClosed: boolean): ReviewSummary {
		const workflowName = pr.title.replace(/^Publish:\s*/, '') || pr.head.ref;

		if (mergedClosed || this.publishedPrNumbers.has(pr.prNumber)) {
			return {
				pullRequestNumber: pr.prNumber,
				pullRequestUrl: pr.url,
				workflowName,
				status: 'published',
			};
		}

		const cached = this.validationCache.get(pr.prNumber);
		if (!cached) {
			return {
				pullRequestNumber: pr.prNumber,
				pullRequestUrl: pr.url,
				workflowName,
				status: 'pending',
			};
		}

		if (cached.issues.length === 0) {
			return {
				pullRequestNumber: pr.prNumber,
				pullRequestUrl: pr.url,
				workflowName,
				status: 'ready',
			};
		}

		return {
			pullRequestNumber: pr.prNumber,
			pullRequestUrl: pr.url,
			workflowName,
			status: 'blocked',
			missingCredentials: this.toMissingCredentials(cached.issues),
		};
	}

	private toMissingCredentials(issues: BlockingIssue[]): ReviewSummary['missingCredentials'] {
		return issues
			.filter(
				(issue): issue is Extract<BlockingIssue, { type: 'credential-unresolved' }> =>
					issue.type === 'credential-unresolved',
			)
			.map((issue) => ({
				id: issue.sourceId,
				name: issue.expectedType ? `${issue.expectedType} (${issue.sourceId})` : issue.sourceId,
				type: issue.expectedType ?? 'unknown',
				usedByWorkflows: issue.usedByWorkflows,
			}));
	}

	/** Open/closed instance-pull PRs, filtered to our branch prefix. */
	async listInstancePullRequests(state: 'open' | 'closed'): Promise<PullRequestDetails[]> {
		const prs = await this.gitHubClient.listPullRequests(state);
		return prs.filter((pr) => pr.head.ref.startsWith(BRANCH_PREFIX));
	}

	/** Cached validation issues for a PR (used by the poll loop to set comment/status). */
	getCachedIssues(prNumber: number): BlockingIssue[] | undefined {
		return this.validationCache.get(prNumber)?.issues;
	}

	hasPublished(prNumber: number): boolean {
		return this.publishedPrNumbers.has(prNumber);
	}

	markPublished(prNumber: number): void {
		this.publishedPrNumbers.add(prNumber);
	}

	/** Render the comment body for a PR's current validation result. */
	renderComment(issues: BlockingIssue[], prNumber: number): string {
		return issues.length === 0
			? this.markdown.clean(prNumber)
			: this.markdown.blocked(issues, prNumber);
	}

	private async getOwner(): Promise<User> {
		return await this.ownershipService.getInstanceOwner();
	}

	private async getImportContext(): Promise<ImportContext> {
		const owner = await this.getOwner();
		const project = await this.projectRepository.getPersonalProjectForUserOrFail(owner.id);
		return { user: owner, projectId: project.id, folderId: null };
	}

	/** The fixed import knobs for the demo: id-match, must-preexist, source ids. */
	private importRequest(context: ImportContext, publish = false): ImportPackageRequest {
		return {
			user: context.user,
			projectId: context.projectId,
			packageBuffer: Buffer.alloc(0), // ignored by validate()/runFromReader()
			credentialMatchingMode: 'id-only',
			credentialMissingMode: 'must-preexist',
			workflowConflictPolicy: WorkflowConflictPolicy.NewVersion,
			workflowIdPolicy: WorkflowIdPolicy.Source,
			workflowPublishingPolicy: publish
				? WorkflowPublishingPolicy.PublishAll
				: WorkflowPublishingPolicy.PreservePublishedState,
		};
	}
}

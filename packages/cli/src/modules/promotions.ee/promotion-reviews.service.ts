import type {
	ListPromotionReviewsQueryDto,
	PromotionMergeRequestResult,
	PromotionReviewChangeKind,
	PromotionReviewDetailDto,
	PromotionReviewListPublicDto,
	PromotionReviewSummary,
	PromotionReviewWorkflowChange,
	PromotionReviewWorkflowDiffDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ProjectRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { jsonParse } from 'n8n-workflow';

import { BadRequestError, ConflictError, NotFoundError } from '@n8n/errors';

import { PACKAGE_ENTITY_LAYOUT } from '@/modules/n8n-packages/io/manifest-entry';

import { PACKAGE_SUBFOLDER } from './constants';
import type { PromotionReview } from './database/entities/promotion-review.entity';
import {
	PromotionReviewRepository,
	type PromotionReviewStateSync,
} from './database/repositories/promotion-review.repository';
import type { GitHostAccess } from './git-hosts/git-host.types';
import {
	GitLabMergeRequestClient,
	parseGitLabReviewId,
	toGitLabReviewId,
	type GitLabMergeRequest,
	type MergeRequestRef,
} from './git-hosts/gitlab-merge-request.client';
import { PromotionConfigResolver } from './promotion-config.resolver';
import { PromotionProvidersService } from './promotion-providers.service';
import { PromotionWorkingDirectoryService } from './promotion-working-directory.service';
import { PromotionsGitService } from './promotions-git.service';
import { checkoutBranchName, repositoryUrl } from './promotions-git.utils';
import type { PromotionOperationInput } from './promotions.types';

/** A workflow file in the package tree at one commit. */
type WorkflowFile = { workflowId: string; path: string; blobSha: string; projectId: string | null };

/**
 * Merge requests read from the host, by review id. A `null` value means the
 * host answered but does not know the merge request. A missing key means the
 * host could not be asked.
 */
type MergeRequestsById = Map<string, GitLabMergeRequest | null>;

const WORKFLOW_PATHSPEC = `${PACKAGE_SUBFOLDER}/`;

/**
 * Promotion Reviews on top of GitLab merge requests. Opens the merge request
 * after a branched Promote, keeps `promotion_review` to what n8n alone knows,
 * and reads title, URL, conflicts and the merged baseline from GitLab. GitLab is
 * authoritative while a review is open; the row is authoritative once terminal.
 */
@Service()
export class PromotionReviewsService {
	constructor(
		private readonly reviewRepository: PromotionReviewRepository,
		private readonly providersService: PromotionProvidersService,
		private readonly resolver: PromotionConfigResolver,
		private readonly workingDirectory: PromotionWorkingDirectoryService,
		private readonly gitService: PromotionsGitService,
		private readonly projectRepository: ProjectRepository,
		private readonly mergeRequests: GitLabMergeRequestClient,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('promotions');
	}

	// -- Promote hook ---------------------------------------------------------

	/**
	 * Opens the merge request for a pushed promotion branch and records the review.
	 * The push already succeeded, so a failure here is a warning for the caller,
	 * not an error: the admin can open the merge request on GitLab by hand.
	 */
	async openMergeRequest(
		input: PromotionOperationInput,
		actor: User,
		push: { branchName: string; commitSha: string; title: string },
	): Promise<{ mergeRequest?: PromotionMergeRequestResult; warnings: string[] }> {
		if (input.providerType !== 'gitlab') return { warnings: [] };

		let access: GitHostAccess;
		let projectPath: string;
		try {
			access = await this.providersService.hostAccessFor(input.providerId);
			projectPath = gitlabProjectPath(repositoryUrl(input), access.baseUrl);
		} catch (error) {
			this.logger.warn('Could not prepare the GitLab merge request call', { error });
			return { warnings: [mergeRequestWarning(push.branchName, error)] };
		}

		let mergeRequest: GitLabMergeRequest;
		try {
			mergeRequest = await this.mergeRequests.createMergeRequest(access, {
				projectPath,
				sourceBranch: push.branchName,
				targetBranch: checkoutBranchName(input.config),
				title: push.title,
				description: mergeRequestDescription(actor, push.commitSha),
			});
		} catch (error) {
			this.logger.warn('Could not open the GitLab merge request', { error });
			return { warnings: [mergeRequestWarning(push.branchName, error)] };
		}

		const row = await this.reviewRepository.insertReview({
			connectionId: input.connectionId,
			createdById: actor.id,
			branchName: push.branchName,
			commitSha: push.commitSha,
			remoteReviewId: toGitLabReviewId({
				projectId: mergeRequest.project_id,
				iid: mergeRequest.iid,
			}),
		});

		return {
			mergeRequest: { reviewId: row.id, iid: mergeRequest.iid, webUrl: mergeRequest.web_url },
			warnings: [],
		};
	}

	// -- Read model -----------------------------------------------------------

	async list(query: ListPromotionReviewsQueryDto): Promise<PromotionReviewListPublicDto> {
		// Open rows mirror GitLab. Refresh them so the tabs are right, but never let
		// an unreachable host hide the inbox.
		const refreshed = await this.refreshOpenReviews().catch((error: unknown) => {
			this.logger.warn('Could not refresh open promotion reviews', { error });
			return new Map() as MergeRequestsById;
		});

		const { count, data } = await this.reviewRepository.listReviews({
			tab: query.tab,
			skip: query.skip ?? 0,
			take: query.take ?? 50,
		});

		// Title and URL live on the host. Read the rows the refresh did not cover.
		const missing = data.filter((review) => !refreshed.has(review.id));
		const read = await this.readMergeRequests(missing);
		return {
			count,
			data: data.map((review) =>
				this.toSummary(review, refreshed.get(review.id) ?? read.get(review.id) ?? null),
			),
		};
	}

	async getDetail(reviewId: string): Promise<PromotionReviewDetailDto> {
		const review = await this.getReview(reviewId);
		const warnings: string[] = [];

		const mergeRequest = await this.readMergeRequest(review, warnings);
		if (mergeRequest) await this.applyMergeRequestState(review, mergeRequest);

		const { workflows, baselineCommitSha } = await this.readWorkflowChanges(
			review,
			frozenBaseline(review, mergeRequest),
			warnings,
		);

		return {
			...this.toSummary(review, mergeRequest),
			mergeRequest: mergeRequest
				? {
						description: mergeRequest.description,
						sourceBranch: mergeRequest.source_branch,
						targetBranch: mergeRequest.target_branch,
						authorName: mergeRequest.author?.name ?? null,
						approvalsLeft: null,
						mergeStatus: mergeRequest.detailed_merge_status ?? null,
					}
				: null,
			baselineCommitSha,
			workflows,
			warnings,
		};
	}

	async getWorkflowDiff(
		reviewId: string,
		workflowId: string,
	): Promise<PromotionReviewWorkflowDiffDto> {
		const review = await this.getReview(reviewId);
		// A terminal review has no merge base to compute: the branch is merged or
		// gone. Only the host still knows the baseline it was reviewed against.
		const mergeRequest = review.state === 'open' ? null : await this.readMergeRequest(review, []);
		const frozen = frozenBaseline(review, mergeRequest);
		if (frozen === undefined) {
			throw new BadRequestError(
				'GitLab did not report the reviewed baseline. The diff cannot be read.',
			);
		}
		const trees = await this.readTrees(review, frozen);
		if (!trees) {
			throw new BadRequestError(
				'The connection of this promotion review is gone. The diff cannot be read.',
			);
		}

		const headFile = trees.head.get(workflowId);
		const baseFile = trees.baseline.get(workflowId);
		if (!headFile && !baseFile) throw new NotFoundError('Workflow not found in this promotion');

		const [head, base] = await Promise.all([
			headFile ? this.readWorkflowJson(trees.input, review.commitSha, headFile.path) : null,
			baseFile && trees.baselineCommitSha
				? this.readWorkflowJson(trees.input, trees.baselineCommitSha, baseFile.path)
				: null,
		]);

		return {
			workflowId,
			baselineCommitSha: trees.baselineCommitSha,
			headCommitSha: review.commitSha,
			base,
			head,
		};
	}

	// -- Approve --------------------------------------------------------------

	/**
	 * Approves in n8n, then merges on GitLab as the bot user. The note records the
	 * n8n user, because GitLab only sees the token. The row is claimed first, so
	 * two admins cannot merge the same review at once.
	 */
	async approve(reviewId: string, actor: User): Promise<PromotionReviewDetailDto> {
		const review = await this.getReview(reviewId);
		const context = await this.hostContext(review);
		if (!context) {
			throw new BadRequestError(
				'The connection of this promotion review is gone. Nothing can be merged.',
			);
		}

		// Read the live state first: the row may lag behind GitLab.
		const current = await this.mergeRequests.getMergeRequest(context.access, context.ref);
		await this.applyMergeRequestState(review, current);
		if (review.state !== 'open') {
			throw new ConflictError(`This promotion review is already ${review.state}.`);
		}
		if (current.has_conflicts) {
			throw new ConflictError(
				'The merge request has conflicts. Resolve them on GitLab or promote again.',
			);
		}

		if (!(await this.reviewRepository.claimApproval(review.id, actor.id))) {
			throw new ConflictError('Another user is approving this promotion review.');
		}

		try {
			await this.mergeRequests.createNote(context.access, context.ref, approvalNote(actor));
			try {
				await this.mergeRequests.approve(context.access, context.ref);
			} catch (error) {
				// Approval rules are a GitLab concern. The merge below decides whether they block.
				this.logger.info('GitLab did not accept the approval from the bot user', { error });
			}
			const merged = await this.mergeRequests.merge(context.access, context.ref, review.commitSha);
			await this.applyMergeRequestState(review, merged);
		} catch (error) {
			await this.reviewRepository.releaseApproval(review.id);
			throw error;
		}

		return await this.getDetail(review.id);
	}

	// -- State sync -----------------------------------------------------------

	/** Reads every open row from GitLab and mirrors its state. Returns what it read. */
	private async refreshOpenReviews(): Promise<MergeRequestsById> {
		const openReviews = await this.reviewRepository.findOpenReviews();
		const read = await this.readMergeRequests(openReviews);
		for (const review of openReviews) {
			if (!review.connectionId) {
				await this.markUnavailable(review);
				continue;
			}
			const mergeRequest = read.get(review.id);
			if (mergeRequest) await this.applyMergeRequestState(review, mergeRequest);
			else if (mergeRequest === null) await this.markUnavailable(review);
		}
		return read;
	}

	/** One GitLab call for each project. Rows whose host cannot be asked are left out. */
	private async readMergeRequests(reviews: PromotionReview[]): Promise<MergeRequestsById> {
		const read: MergeRequestsById = new Map();
		type Entry = { review: PromotionReview; ref: MergeRequestRef };
		const groups = new Map<string, { providerId: string; entries: Entry[] }>();
		for (const review of reviews) {
			if (!review.connection) continue;
			let ref: MergeRequestRef;
			try {
				ref = parseGitLabReviewId(review.remoteReviewId);
			} catch {
				this.logger.warn('Promotion review references an unknown host', { reviewId: review.id });
				continue;
			}
			const { providerId } = review.connection;
			const key = `${providerId}:${ref.projectId}`;
			const group = groups.get(key) ?? { providerId, entries: [] };
			group.entries.push({ review, ref });
			groups.set(key, group);
		}

		for (const { providerId, entries } of groups.values()) {
			const { review, ref } = entries[0];
			let mergeRequests: GitLabMergeRequest[];
			try {
				const access = await this.providersService.hostAccessFor(providerId);
				mergeRequests = await this.mergeRequests.listMergeRequests(
					access,
					ref.projectId,
					entries.map((entry) => entry.ref.iid),
				);
			} catch (error) {
				this.logger.warn('Could not read promotion reviews from GitLab', {
					connectionId: review.connectionId,
					error,
				});
				continue;
			}
			const byIid = new Map(mergeRequests.map((mr) => [mr.iid, mr]));
			for (const entry of entries) read.set(entry.review.id, byIid.get(entry.ref.iid) ?? null);
		}
		return read;
	}

	/** Mirrors the merge request state into the row. */
	private async applyMergeRequestState(review: PromotionReview, mergeRequest: GitLabMergeRequest) {
		const sync: PromotionReviewStateSync = {
			state: toReviewState(mergeRequest.state),
			mergedAt: toDate(mergeRequest.merged_at),
			closedAt: toDate(mergeRequest.closed_at),
		};
		// Terminal rows are owned by n8n. GitLab cannot reopen them here.
		if (review.state !== 'open' && sync.state === 'open') return;

		await this.reviewRepository.recordSync(review.id, sync);
		Object.assign(review, sync);
	}

	/** The merge request or its connection is gone. The row keeps the history. */
	private async markUnavailable(review: PromotionReview) {
		await this.reviewRepository.recordSync(review.id, {
			state: 'unavailable',
			mergedAt: review.mergedAt,
			closedAt: review.closedAt,
		});
		review.state = 'unavailable';
	}

	// -- Helpers --------------------------------------------------------------

	private async getReview(reviewId: string): Promise<PromotionReview> {
		const review = await this.reviewRepository.findByIdWithRelations(reviewId);
		if (!review) throw new NotFoundError('Promotion review not found');
		return review;
	}

	/** Host access for a review, or null when its connection is gone. */
	private async hostContext(review: PromotionReview) {
		if (!review.connection) return null;
		const access = await this.providersService.hostAccessFor(review.connection.providerId);
		return { access, ref: parseGitLabReviewId(review.remoteReviewId) };
	}

	private async readMergeRequest(
		review: PromotionReview,
		warnings: string[],
	): Promise<GitLabMergeRequest | null> {
		const context = await this.hostContext(review);
		if (!context) {
			warnings.push('The connection of this promotion review was deleted.');
			return null;
		}
		try {
			return await this.mergeRequests.getMergeRequest(context.access, context.ref);
		} catch (error) {
			this.logger.warn('Could not read the merge request', { reviewId: review.id, error });
			warnings.push('GitLab could not be reached. The state shown is the last one synced.');
			return null;
		}
	}

	/** The package trees at the head and the baseline, keyed by workflow id. */
	private async readTrees(review: PromotionReview, frozenBaselineCommitSha: string | null) {
		if (!review.connectionId) return null;
		const input = await this.resolver.resolveForConnection(review.connectionId, 'promote');
		const credentials = await this.providersService.decryptCredentials({
			authType: input.authType,
			auth: input.encryptedAuth,
		});
		const trees = await this.gitService.readReviewTrees({
			remoteUrl: repositoryUrl(input),
			credentials,
			paths: this.workingDirectory.paths(input.configId),
			branchName: checkoutBranchName(input.config),
			configId: input.configId,
			headCommitSha: review.commitSha,
			frozenBaselineCommitSha,
			pathspecs: [WORKFLOW_PATHSPEC],
		});
		return {
			input,
			baselineCommitSha: trees.baselineCommitSha,
			head: parseWorkflowFiles(trees.headTree),
			baseline: parseWorkflowFiles(trees.baselineTree),
			warnings: trees.warnings,
		};
	}

	private async readWorkflowChanges(
		review: PromotionReview,
		frozenBaselineCommitSha: string | null | undefined,
		warnings: string[],
	) {
		if (frozenBaselineCommitSha === undefined) {
			warnings.push('GitLab did not report the reviewed baseline. No diff is available.');
			return { workflows: [], baselineCommitSha: null };
		}
		let trees: Awaited<ReturnType<typeof this.readTrees>>;
		try {
			trees = await this.readTrees(review, frozenBaselineCommitSha);
		} catch (error) {
			this.logger.warn('Could not read the promotion checkout for a review', {
				reviewId: review.id,
				error,
			});
			warnings.push('The local checkout could not be read. Clone the Promote direction again.');
			return { workflows: [], baselineCommitSha: null };
		}
		if (!trees) {
			warnings.push('The connection of this promotion review was deleted. No diff is available.');
			return { workflows: [], baselineCommitSha: null };
		}
		warnings.push(...trees.warnings);

		const changes: Array<{
			file: WorkflowFile;
			commitSha: string;
			change: PromotionReviewChangeKind;
		}> = [];
		for (const [workflowId, file] of trees.head) {
			const before = trees.baseline.get(workflowId);
			if (!before) changes.push({ file, commitSha: review.commitSha, change: 'added' });
			else if (before.blobSha !== file.blobSha) {
				changes.push({ file, commitSha: review.commitSha, change: 'modified' });
			}
		}
		if (trees.baselineCommitSha) {
			for (const [workflowId, file] of trees.baseline) {
				if (!trees.head.has(workflowId)) {
					changes.push({ file, commitSha: trees.baselineCommitSha, change: 'deleted' });
				}
			}
		}

		const projectNames = await this.projectNames(changes.map(({ file }) => file.projectId));
		const names = await this.workflowNames(trees.input, changes);

		const workflows: PromotionReviewWorkflowChange[] = changes
			.map(({ file, change }) => ({
				workflowId: file.workflowId,
				name: names.get(file.path) ?? file.workflowId,
				projectName: file.projectId ? (projectNames.get(file.projectId) ?? null) : null,
				change,
				path: file.path,
			}))
			.sort((a, b) => a.name.localeCompare(b.name));

		return { workflows, baselineCommitSha: trees.baselineCommitSha };
	}

	/** Reads `name` from each changed workflow file, grouped by commit to batch the reads. */
	private async workflowNames(
		input: PromotionOperationInput,
		changes: Array<{ file: WorkflowFile; commitSha: string }>,
	): Promise<Map<string, string>> {
		const names = new Map<string, string>();
		const byCommit = new Map<string, string[]>();
		for (const { file, commitSha } of changes) {
			byCommit.set(commitSha, [...(byCommit.get(commitSha) ?? []), file.path]);
		}
		for (const [commitSha, filePaths] of byCommit) {
			const files = await this.gitService.readFilesAtCommit({
				paths: this.workingDirectory.paths(input.configId),
				branchName: checkoutBranchName(input.config),
				configId: input.configId,
				commitSha,
				filePaths,
			});
			for (const [filePath, content] of files) {
				const parsed = jsonParse<{ name?: unknown }>(content, { fallbackValue: {} });
				if (typeof parsed.name === 'string') names.set(filePath, parsed.name);
			}
		}
		return names;
	}

	private async projectNames(projectIds: Array<string | null>): Promise<Map<string, string>> {
		const ids = [...new Set(projectIds.filter((id): id is string => id !== null))];
		if (ids.length === 0) return new Map();
		const projects = await this.projectRepository.findBy(ids.map((id) => ({ id })));
		return new Map(projects.map((project) => [project.id, project.name]));
	}

	private async readWorkflowJson(
		input: PromotionOperationInput,
		commitSha: string,
		filePath: string,
	): Promise<Record<string, unknown> | null> {
		const files = await this.gitService.readFilesAtCommit({
			paths: this.workingDirectory.paths(input.configId),
			branchName: checkoutBranchName(input.config),
			configId: input.configId,
			commitSha,
			filePaths: [filePath],
		});
		const content = files.get(filePath);
		if (content === undefined) return null;
		const parsed = jsonParse<unknown>(content, { fallbackValue: null });
		return isRecord(parsed) ? parsed : null;
	}

	private toSummary(
		review: PromotionReview,
		mergeRequest: GitLabMergeRequest | null,
	): PromotionReviewSummary {
		return {
			id: review.id,
			state: review.state,
			branchName: review.branchName,
			commitSha: review.commitSha,
			remoteReviewId: review.remoteReviewId,
			connection: review.connection
				? { id: review.connection.id, name: review.connection.name }
				: null,
			createdBy: toReviewUser(review.createdBy),
			approvedBy: toReviewUser(review.approvedBy),
			createdAt: review.createdAt.toISOString(),
			approvedAt: review.approvedAt?.toISOString() ?? null,
			mergedAt: review.mergedAt?.toISOString() ?? null,
			closedAt: review.closedAt?.toISOString() ?? null,
			remote: mergeRequest
				? {
						title: mergeRequest.title,
						webUrl: mergeRequest.web_url,
						hasConflicts: mergeRequest.has_conflicts,
					}
				: null,
		};
	}
}

// -- Pure helpers -------------------------------------------------------------

function toReviewState(state: GitLabMergeRequest['state']): PromotionReview['state'] {
	if (state === 'merged') return 'merged';
	if (state === 'closed') return 'closed';
	return 'open';
}

/**
 * The baseline the checkout must diff against. `null` while the review is open:
 * the merge base is computed at read time. A terminal review takes the base the
 * host reviewed against; `undefined` when the host did not report one.
 */
function frozenBaseline(
	review: PromotionReview,
	mergeRequest: GitLabMergeRequest | null,
): string | null | undefined {
	if (review.state === 'open') return null;
	return mergeRequest?.diff_refs?.base_sha ?? undefined;
}

function toDate(value: string | null | undefined): Date | null {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function toReviewUser(user: User | null): PromotionReviewSummary['createdBy'] {
	if (!user) return null;
	return {
		id: user.id,
		firstName: user.firstName ?? null,
		lastName: user.lastName ?? null,
		email: user.email ?? null,
	};
}

function displayName(user: User): string {
	const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
	return name || user.email || user.id;
}

function approvalNote(actor: User): string {
	const who = actor.email ? `${displayName(actor)} (${actor.email})` : displayName(actor);
	return `Approved in n8n by ${who}.`;
}

function mergeRequestDescription(actor: User, commitSha: string): string {
	return [
		`Opened by n8n for a promotion by ${displayName(actor)}.`,
		'',
		`Commit: ${commitSha}`,
		'',
		'Review and approve this merge request in n8n under Reviews, or merge it here.',
	].join('\n');
}

function mergeRequestWarning(branchName: string, error: unknown): string {
	const reason = error instanceof Error ? error.message : 'Unknown error';
	return `The branch ${branchName} was pushed, but no merge request was opened: ${reason}`;
}

/**
 * `group/subgroup/project` from the remote URL. GitLab accepts this URL-encoded
 * path wherever it accepts a numeric project id.
 */
export function gitlabProjectPath(remoteUrl: string, baseUrl: string): string {
	const scpLike = /^[^@/]+@[^:/]+:(.+)$/.exec(remoteUrl);
	let repositoryPath: string;
	if (scpLike) {
		repositoryPath = scpLike[1];
	} else {
		const remote = new URL(remoteUrl);
		const basePath = new URL(baseUrl).pathname.replace(/\/$/, '');
		repositoryPath =
			basePath && remote.pathname.startsWith(`${basePath}/`)
				? remote.pathname.slice(basePath.length)
				: remote.pathname;
	}
	const projectPath = repositoryPath.replace(/^\/+/, '').replace(/\.git$/, '');
	if (!projectPath.includes('/')) {
		throw new BadRequestError('The remote URL does not name a GitLab project path.');
	}
	return projectPath;
}

/** Workflow files under `<package>/projects/<slug>-<projectId>/.../workflows/<slug>-<id>/workflow.json`. */
export function parseWorkflowFiles(lsTreeOutput: string): Map<string, WorkflowFile> {
	const { projects, workflows } = PACKAGE_ENTITY_LAYOUT;
	const files = new Map<string, WorkflowFile>();
	for (const record of lsTreeOutput.split('\0')) {
		const tabIndex = record.indexOf('\t');
		if (tabIndex === -1) continue;
		const [, objectType, blobSha] = record.slice(0, tabIndex).split(' ');
		if (objectType !== 'blob') continue;
		const path = record.slice(tabIndex + 1);
		const segments = path.split('/');
		if (segments.length < 4 || segments.at(-1) !== workflows.fileName) continue;
		if (segments.at(-3) !== workflows.directory) continue;
		const workflowId = idOfSegment(segments.at(-2) ?? '');
		if (!workflowId) continue;
		const projectId =
			segments[1] === projects.directory && segments[2] ? idOfSegment(segments[2]) : null;
		files.set(workflowId, { workflowId, path, blobSha, projectId });
	}
	return files;
}

function idOfSegment(segment: string): string {
	return segment.slice(segment.lastIndexOf('-') + 1);
}

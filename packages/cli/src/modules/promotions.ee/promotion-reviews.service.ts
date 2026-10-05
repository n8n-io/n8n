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
import type { PromotionRun } from './database/entities/promotion-run.entity';
import {
	PromotionRunRepository,
	type PromotionRunStateSync,
} from './database/repositories/promotion-run.repository';
import type { GitHostAccess } from './git-hosts/git-host.types';
import {
	GitLabMergeRequestClient,
	type GitLabMergeRequest,
} from './git-hosts/gitlab-merge-request.client';
import { PromotionConfigResolver } from './promotion-config.resolver';
import { PromotionProvidersService } from './promotion-providers.service';
import { PromotionWorkingDirectoryService } from './promotion-working-directory.service';
import { PromotionsGitService } from './promotions-git.service';
import { checkoutBranchName, repositoryUrl } from './promotions-git.utils';
import type { PromotionOperationInput } from './promotions.types';

/** A workflow file in the package tree at one commit. */
type WorkflowFile = { workflowId: string; path: string; blobSha: string; projectId: string | null };

const WORKFLOW_PATHSPEC = `${PACKAGE_SUBFOLDER}/`;

/**
 * Promotion Reviews on top of GitLab merge requests. Opens the merge request
 * after a branched Promote, mirrors its state into `promotion_run`, and reads the
 * diff from the promote config's checkout. GitLab is authoritative while a run is
 * open; the row is authoritative once the run is terminal.
 */
@Service()
export class PromotionReviewsService {
	constructor(
		private readonly runRepository: PromotionRunRepository,
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
	 * Opens the merge request for a pushed promotion branch and records the run.
	 * The push already succeeded, so a failure here is a warning for the caller,
	 * not an error: the admin can open the merge request on GitLab by hand.
	 */
	async openMergeRequest(
		input: PromotionOperationInput,
		actor: User,
		run: { branchName: string; commitSha: string; title: string; projectId: string | null },
	): Promise<{ mergeRequest?: PromotionMergeRequestResult; warnings: string[] }> {
		if (input.providerType !== 'gitlab') return { warnings: [] };

		let access: GitHostAccess;
		let projectPath: string;
		try {
			access = await this.providersService.hostAccessFor(input.providerId);
			projectPath = gitlabProjectPath(repositoryUrl(input), access.baseUrl);
		} catch (error) {
			this.logger.warn('Could not prepare the GitLab merge request call', { error });
			return { warnings: [mergeRequestWarning(run.branchName, error)] };
		}

		let mergeRequest: GitLabMergeRequest;
		try {
			mergeRequest = await this.mergeRequests.createMergeRequest(access, {
				projectPath,
				sourceBranch: run.branchName,
				targetBranch: checkoutBranchName(input.config),
				title: run.title,
				description: mergeRequestDescription(actor, run.commitSha),
			});
		} catch (error) {
			this.logger.warn('Could not open the GitLab merge request', { error });
			return { warnings: [mergeRequestWarning(run.branchName, error)] };
		}

		const row = await this.runRepository.insertRun({
			connectionId: input.connectionId,
			projectId: run.projectId,
			createdById: actor.id,
			branchName: run.branchName,
			commitSha: run.commitSha,
			title: run.title,
			gitlabProjectId: mergeRequest.project_id,
			mergeRequestIid: mergeRequest.iid,
			webUrl: mergeRequest.web_url,
		});

		return {
			mergeRequest: { runId: row.id, iid: mergeRequest.iid, webUrl: mergeRequest.web_url },
			warnings: [],
		};
	}

	// -- Read model -----------------------------------------------------------

	async list(query: ListPromotionReviewsQueryDto): Promise<PromotionReviewListPublicDto> {
		// Open rows mirror GitLab. Refresh them so the tabs are right, but never let
		// an unreachable host hide the inbox.
		await this.refreshOpenRuns().catch((error: unknown) => {
			this.logger.warn('Could not refresh open promotion runs', { error });
		});

		const { count, data } = await this.runRepository.listRuns({
			tab: query.tab,
			skip: query.skip ?? 0,
			take: query.take ?? 50,
		});
		return { count, data: data.map((run) => this.toSummary(run)) };
	}

	async getDetail(runId: string): Promise<PromotionReviewDetailDto> {
		const run = await this.getRun(runId);
		const warnings: string[] = [];

		const mergeRequest = await this.readMergeRequest(run, warnings);
		if (mergeRequest) await this.applyMergeRequestState(run, mergeRequest);

		const { workflows, baselineCommitSha } = await this.readWorkflowChanges(run, warnings);

		return {
			...this.toSummary(run),
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
		runId: string,
		workflowId: string,
	): Promise<PromotionReviewWorkflowDiffDto> {
		const run = await this.getRun(runId);
		const trees = await this.readTrees(run);
		if (!trees) {
			throw new BadRequestError(
				'The connection of this promotion run is gone. The diff cannot be read.',
			);
		}

		const headFile = trees.head.get(workflowId);
		const baseFile = trees.baseline.get(workflowId);
		if (!headFile && !baseFile) throw new NotFoundError('Workflow not found in this promotion');

		const [head, base] = await Promise.all([
			headFile ? this.readWorkflowJson(trees.input, run.commitSha, headFile.path) : null,
			baseFile && trees.baselineCommitSha
				? this.readWorkflowJson(trees.input, trees.baselineCommitSha, baseFile.path)
				: null,
		]);

		return {
			workflowId,
			baselineCommitSha: trees.baselineCommitSha,
			headCommitSha: run.commitSha,
			base,
			head,
		};
	}

	// -- Approve --------------------------------------------------------------

	/**
	 * Approves in n8n, then merges on GitLab as the bot user. The note records the
	 * n8n user, because GitLab only sees the token. The row is claimed first, so
	 * two admins cannot merge the same run at once.
	 */
	async approve(runId: string, actor: User): Promise<PromotionReviewDetailDto> {
		const run = await this.getRun(runId);
		const context = await this.hostContext(run);
		if (!context) {
			throw new BadRequestError(
				'The connection of this promotion run is gone. Nothing can be merged.',
			);
		}

		// Read the live state first: the row may lag behind GitLab.
		const current = await this.mergeRequests.getMergeRequest(context.access, context.ref);
		await this.applyMergeRequestState(run, current);
		if (run.state !== 'open') {
			throw new ConflictError(`This promotion run is already ${run.state}.`);
		}
		if (current.has_conflicts) {
			throw new ConflictError(
				'The merge request has conflicts. Resolve them on GitLab or promote again.',
			);
		}

		if (!(await this.runRepository.claimApproval(run.id, actor.id))) {
			throw new ConflictError('Another user is approving this promotion run.');
		}

		try {
			await this.mergeRequests.createNote(context.access, context.ref, approvalNote(actor));
			try {
				await this.mergeRequests.approve(context.access, context.ref);
			} catch (error) {
				// Approval rules are a GitLab concern. The merge below decides whether they block.
				this.logger.info('GitLab did not accept the approval from the bot user', { error });
			}
			const merged = await this.mergeRequests.merge(context.access, context.ref, run.commitSha);
			await this.applyMergeRequestState(run, merged);
		} catch (error) {
			await this.runRepository.releaseApproval(run.id);
			throw error;
		}

		return await this.getDetail(run.id);
	}

	// -- State sync -----------------------------------------------------------

	/** Reads every open row from GitLab, one call for each GitLab project. */
	private async refreshOpenRuns(): Promise<void> {
		const openRuns = await this.runRepository.findOpenRuns();
		if (openRuns.length === 0) return;

		const groups = new Map<string, PromotionRun[]>();
		for (const run of openRuns) {
			if (!run.connectionId) {
				await this.markUnavailable(run);
				continue;
			}
			const key = `${run.connectionId}:${run.gitlabProjectId}`;
			groups.set(key, [...(groups.get(key) ?? []), run]);
		}

		for (const runs of groups.values()) {
			const context = await this.hostContext(runs[0]);
			if (!context) continue;
			let mergeRequests: GitLabMergeRequest[];
			try {
				mergeRequests = await this.mergeRequests.listMergeRequests(
					context.access,
					runs[0].gitlabProjectId,
					runs.map((run) => run.mergeRequestIid),
				);
			} catch (error) {
				this.logger.warn('Could not refresh promotion runs from GitLab', {
					connectionId: runs[0].connectionId,
					error,
				});
				continue;
			}
			const byIid = new Map(mergeRequests.map((mr) => [mr.iid, mr]));
			for (const run of runs) {
				const mergeRequest = byIid.get(run.mergeRequestIid);
				if (mergeRequest) await this.applyMergeRequestState(run, mergeRequest);
				else await this.markUnavailable(run);
			}
		}
	}

	/** Mirrors the merge request into the row. Terminal states freeze the baseline. */
	private async applyMergeRequestState(run: PromotionRun, mergeRequest: GitLabMergeRequest) {
		const sync: PromotionRunStateSync = {
			state: toRunState(mergeRequest.state),
			hasConflicts: mergeRequest.has_conflicts,
			mergedAt: toDate(mergeRequest.merged_at),
			closedAt: toDate(mergeRequest.closed_at),
		};
		if (sync.state !== 'open' && run.baselineCommitSha === null) {
			sync.baselineCommitSha = mergeRequest.diff_refs?.base_sha ?? null;
		}
		// Terminal rows are owned by n8n. GitLab cannot reopen them here.
		if (run.state !== 'open' && sync.state === 'open') return;

		await this.runRepository.recordSync(run.id, sync);
		Object.assign(run, sync, { lastSyncedAt: new Date() });
	}

	/** The merge request or its connection is gone. The row keeps the history. */
	private async markUnavailable(run: PromotionRun) {
		await this.runRepository.recordSync(run.id, {
			state: 'unavailable',
			hasConflicts: run.hasConflicts,
			mergedAt: run.mergedAt,
			closedAt: run.closedAt,
		});
		run.state = 'unavailable';
	}

	// -- Helpers --------------------------------------------------------------

	private async getRun(runId: string): Promise<PromotionRun> {
		const run = await this.runRepository.findByIdWithRelations(runId);
		if (!run) throw new NotFoundError('Promotion run not found');
		return run;
	}

	/** Host access for a run, or null when its connection is gone. */
	private async hostContext(run: PromotionRun) {
		if (!run.connection) return null;
		const access = await this.providersService.hostAccessFor(run.connection.providerId);
		return { access, ref: { projectId: run.gitlabProjectId, iid: run.mergeRequestIid } };
	}

	private async readMergeRequest(
		run: PromotionRun,
		warnings: string[],
	): Promise<GitLabMergeRequest | null> {
		const context = await this.hostContext(run);
		if (!context) {
			warnings.push('The connection of this promotion run was deleted.');
			return null;
		}
		try {
			return await this.mergeRequests.getMergeRequest(context.access, context.ref);
		} catch (error) {
			this.logger.warn('Could not read the merge request', { runId: run.id, error });
			warnings.push('GitLab could not be reached. The state shown is the last one synced.');
			return null;
		}
	}

	/** The package trees at the head and the baseline, keyed by workflow id. */
	private async readTrees(run: PromotionRun) {
		if (!run.connectionId) return null;
		const input = await this.resolver.resolveForConnection(run.connectionId, 'promote');
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
			headCommitSha: run.commitSha,
			frozenBaselineCommitSha: run.baselineCommitSha,
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

	private async readWorkflowChanges(run: PromotionRun, warnings: string[]) {
		let trees: Awaited<ReturnType<typeof this.readTrees>>;
		try {
			trees = await this.readTrees(run);
		} catch (error) {
			this.logger.warn('Could not read the promotion checkout for a review', {
				runId: run.id,
				error,
			});
			warnings.push('The local checkout could not be read. Clone the Promote direction again.');
			return { workflows: [], baselineCommitSha: null };
		}
		if (!trees) {
			warnings.push('The connection of this promotion run was deleted. No diff is available.');
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
			if (!before) changes.push({ file, commitSha: run.commitSha, change: 'added' });
			else if (before.blobSha !== file.blobSha) {
				changes.push({ file, commitSha: run.commitSha, change: 'modified' });
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

	private toSummary(run: PromotionRun): PromotionReviewSummary {
		return {
			id: run.id,
			title: run.title,
			state: run.state,
			hasConflicts: run.hasConflicts,
			branchName: run.branchName,
			commitSha: run.commitSha,
			webUrl: run.webUrl,
			mergeRequestIid: run.mergeRequestIid,
			connection: run.connection ? { id: run.connection.id, name: run.connection.name } : null,
			projectId: run.projectId,
			createdBy: toReviewUser(run.createdBy),
			approvedBy: toReviewUser(run.approvedBy),
			createdAt: run.createdAt.toISOString(),
			approvedAt: run.approvedAt?.toISOString() ?? null,
			mergedAt: run.mergedAt?.toISOString() ?? null,
			closedAt: run.closedAt?.toISOString() ?? null,
			lastSyncedAt: run.lastSyncedAt?.toISOString() ?? null,
		};
	}
}

// -- Pure helpers -------------------------------------------------------------

function toRunState(state: GitLabMergeRequest['state']): PromotionRun['state'] {
	if (state === 'merged') return 'merged';
	if (state === 'closed') return 'closed';
	return 'open';
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

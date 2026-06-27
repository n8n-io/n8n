import type {
	CreateSourceControlReviewCommentRequest,
	CreateSourceControlReviewRequest,
	CreateSourceControlSubmitReviewRequest,
	ReviewWorkflowFile,
	ReviewWorkflowSnapshot,
	SourceControlReviewComment,
	SourceControlReviewDetail,
	SourceControlReviewDeployResult,
	SourceControlReviewSubmission,
	SourceControlReviewSummary,
	SourceControlledFile,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse, UserError } from 'n8n-workflow';

import type { CodeReviewProvider, PullRequestSummary } from './code-review-provider';
import { CodeReviewProviderFactory } from './code-review-provider.factory';
import { computePullRequestIsApproved } from './pull-request-approval.utils';
import { encodeReviewCommentBody, parseReviewCommentBody } from './review-comment-metadata';
import { findLineInWorkflowJson } from './workflow-json-line-finder';
import { SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER } from '../constants';
import { SourceControlPreferencesService } from '../source-control-preferences.service.ee';
import { SourceControlService } from '../source-control.service.ee';
import type { ExportableWorkflow } from '../types/exportable-workflow';

/**
 * Read-only orchestration for the "Reviews" feature: lists open pull/merge
 * requests targeting the connected branch and assembles per-workflow base/head
 * snapshots for the visual diff rendered in the UI.
 */
@Service()
export class PullRequestReviewService {
	constructor(
		private readonly providerFactory: CodeReviewProviderFactory,
		private readonly preferencesService: SourceControlPreferencesService,
		private readonly sourceControlService: SourceControlService,
	) {}

	private async getProviderOrThrow(): Promise<CodeReviewProvider> {
		const provider = await this.providerFactory.getProvider();
		if (!provider) {
			throw new UserError(
				'Reviews are unavailable. Connect Source Control to a supported provider (GitHub) and add an access token.',
			);
		}
		return provider;
	}

	private toSummary(
		pr: PullRequestSummary,
		workflowChangeCount?: number,
		isApproved?: boolean,
	): SourceControlReviewSummary {
		return {
			provider: pr.provider,
			prNumber: pr.prNumber,
			title: pr.title,
			url: pr.url,
			author: pr.author,
			isDraft: pr.isDraft,
			sourceBranch: pr.sourceBranch,
			targetBranch: pr.targetBranch,
			createdAt: pr.createdAt,
			updatedAt: pr.updatedAt,
			workflowChangeCount,
			baseSha: pr.baseSha,
			headSha: pr.headSha,
			isApproved,
		};
	}

	private async resolveIsApproved(
		provider: CodeReviewProvider,
		prNumber: number,
	): Promise<boolean> {
		const reviews = await provider.listPullRequestReviews(prNumber);
		return computePullRequestIsApproved(reviews);
	}

	private isWorkflowFile(filePath: string): boolean {
		return (
			filePath.startsWith(`${SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER}/`) && filePath.endsWith('.json')
		);
	}

	private parseSnapshot(content: string | null): ReviewWorkflowSnapshot | null {
		if (!content) return null;
		const wf = jsonParse<ExportableWorkflow | null>(content, { fallbackValue: null });
		if (!wf?.nodes || !wf.connections) return null;
		return {
			id: wf.id,
			name: wf.name,
			nodes: wf.nodes,
			connections: wf.connections,
			settings: wf.settings,
			versionId: wf.versionId,
		};
	}

	/** Open pull requests targeting the connected branch, with workflow change counts. */
	async listReviews(): Promise<SourceControlReviewSummary[]> {
		const provider = await this.getProviderOrThrow();
		const targetBranch = this.preferencesService.getBranchName();
		const pullRequests = await provider.listOpenPullRequests(targetBranch);

		return await Promise.all(
			pullRequests.map(async (pr) => {
				const [files, isApproved] = await Promise.all([
					provider.listFiles(pr.prNumber),
					this.resolveIsApproved(provider, pr.prNumber),
				]);
				const workflowChangeCount = files.filter((f) => this.isWorkflowFile(f.path)).length;
				return this.toSummary(pr, workflowChangeCount, isApproved);
			}),
		);
	}

	/** A single pull request plus base/head snapshots of each changed workflow. */
	async getReview(prNumber: number): Promise<SourceControlReviewDetail> {
		const provider = await this.getProviderOrThrow();
		const [pr, files, isApproved] = await Promise.all([
			provider.getPullRequest(prNumber),
			provider.listFiles(prNumber),
			this.resolveIsApproved(provider, prNumber),
		]);
		const workflowFiles = files.filter((f) => this.isWorkflowFile(f.path));

		const workflows: ReviewWorkflowFile[] = await Promise.all(
			workflowFiles.map(async (file) => {
				const [baseContent, headContent] = await Promise.all([
					file.status === 'added' ? null : provider.getFileAtRef(file.path, pr.baseSha),
					file.status === 'removed' ? null : provider.getFileAtRef(file.path, pr.headSha),
				]);
				const baseWorkflow = this.parseSnapshot(baseContent);
				const headWorkflow = this.parseSnapshot(headContent);
				return {
					path: file.path,
					name: headWorkflow?.name ?? baseWorkflow?.name ?? file.path,
					status: file.status,
					baseWorkflow,
					headWorkflow,
				};
			}),
		);

		return { pullRequest: this.toSummary(pr, workflows.length, isApproved), workflows };
	}

	/** All workflows the user can access, for review request selection. */
	async listReviewCandidates(user: User): Promise<SourceControlledFile[]> {
		return await this.sourceControlService.listReviewWorkflowCandidates(user);
	}

	async createReviewRequest(
		user: User,
		request: CreateSourceControlReviewRequest,
	): Promise<SourceControlReviewSummary> {
		const provider = await this.getProviderOrThrow();
		const baseBranch = this.preferencesService.getBranchName();
		const candidates = await this.listReviewCandidates(user);
		const selected = candidates.filter((candidate) => request.workflowIds.includes(candidate.id));

		if (selected.length !== request.workflowIds.length) {
			throw new UserError('One or more selected workflows are not eligible for a review request.');
		}

		const title =
			request.title?.trim() ??
			`Review: ${selected.map((workflow) => workflow.name).join(', ')}`.slice(0, 200);
		const branchName = `n8n-review/${Date.now()}`;
		const commitMessage =
			request.title?.trim() ?? `Review request for ${selected.length} workflow(s)`;

		await this.sourceControlService.pushWorkflowsForReviewBranch(user, {
			workflowIds: request.workflowIds,
			branchName,
			commitMessage,
			baseBranch,
		});

		const pullRequest = await provider.createPullRequest({
			title,
			body: request.body,
			headBranch: branchName,
			baseBranch,
		});

		return this.toSummary(pullRequest, selected.length, false);
	}

	async listReviewComments(
		prNumber: number,
		filePath?: string,
	): Promise<SourceControlReviewComment[]> {
		const provider = await this.getProviderOrThrow();
		const comments = await provider.listReviewComments(prNumber);
		const filtered = comments.filter((comment) => !filePath || comment.path === filePath);

		const mapped = filtered.map((comment) => {
			const parsed = parseReviewCommentBody(comment.body);
			return {
				id: comment.id,
				body: parsed.body,
				path: comment.path,
				line: comment.line,
				side: comment.side,
				subjectType: comment.subjectType,
				url: comment.url,
				author: comment.author,
				createdAt: comment.createdAt,
				updatedAt: comment.updatedAt,
				anchor: parsed.anchor,
				inReplyToId: comment.inReplyToId,
			};
		});

		const byId = new Map(mapped.map((comment) => [comment.id, comment]));
		return mapped.map((comment) => {
			if (comment.anchor || !comment.inReplyToId) return comment;
			const parent = byId.get(comment.inReplyToId);
			return parent?.anchor ? { ...comment, anchor: parent.anchor } : comment;
		});
	}

	async createReviewComment(
		prNumber: number,
		request: CreateSourceControlReviewCommentRequest,
	): Promise<SourceControlReviewComment> {
		const provider = await this.getProviderOrThrow();

		if (request.inReplyToId) {
			const created = await provider.createReviewComment(prNumber, {
				body: request.body,
				inReplyToId: request.inReplyToId,
			});
			const parsed = parseReviewCommentBody(created.body);
			const existing = await this.listReviewComments(prNumber);
			const parent = existing.find((comment) => comment.id === request.inReplyToId);
			return {
				id: created.id,
				body: parsed.body,
				path: created.path,
				line: created.line,
				side: created.side,
				subjectType: created.subjectType,
				url: created.url,
				author: created.author,
				createdAt: created.createdAt,
				updatedAt: created.updatedAt,
				anchor: parent?.anchor,
				inReplyToId: created.inReplyToId,
			};
		}

		if (!request.path?.trim() || !request.anchor?.nodeId?.trim()) {
			throw new UserError('A workflow file path and node anchor are required.');
		}

		const pr = await provider.getPullRequest(prNumber);
		const side = request.side ?? 'RIGHT';
		const commitId = side === 'RIGHT' ? pr.headSha : pr.baseSha;
		const encodedBody = encodeReviewCommentBody(request.body, request.anchor);

		if (!request.anchor.jsonPath?.trim()) {
			const created = await provider.createReviewComment(prNumber, {
				body: encodedBody,
				path: request.path,
				commitId,
				subjectType: 'file',
			});
			const parsed = parseReviewCommentBody(created.body);
			return {
				id: created.id,
				body: parsed.body,
				path: created.path,
				line: created.line,
				side: created.side,
				subjectType: created.subjectType,
				url: created.url,
				author: created.author,
				createdAt: created.createdAt,
				updatedAt: created.updatedAt,
				anchor: parsed.anchor,
				inReplyToId: created.inReplyToId,
			};
		}

		const fileContent = await provider.getFileAtRef(request.path, commitId);
		if (!fileContent) {
			throw new UserError(
				`Could not load ${request.path} at the ${side === 'RIGHT' ? 'pull request' : 'base'} revision.`,
			);
		}

		const line = findLineInWorkflowJson(fileContent, request.anchor);
		if (!line) {
			throw new UserError('Could not locate the selected node in the workflow JSON file.');
		}

		const created = await provider.createReviewComment(prNumber, {
			body: encodedBody,
			path: request.path,
			line,
			side,
			commitId,
		});
		const parsed = parseReviewCommentBody(created.body);
		return {
			id: created.id,
			body: parsed.body,
			path: created.path,
			line: created.line,
			side: created.side,
			subjectType: created.subjectType,
			url: created.url,
			author: created.author,
			createdAt: created.createdAt,
			updatedAt: created.updatedAt,
			anchor: parsed.anchor,
			inReplyToId: created.inReplyToId,
		};
	}

	async deleteReviewComment(prNumber: number, commentId: number): Promise<number[]> {
		const provider = await this.getProviderOrThrow();
		const comments = await provider.listReviewComments(prNumber);
		const idsToDelete = this.collectCommentDeleteIds(commentId, comments);
		for (const id of idsToDelete) {
			await provider.deleteReviewComment(id);
		}
		return idsToDelete;
	}

	private collectCommentDeleteIds(
		commentId: number,
		comments: Array<{ id: number; inReplyToId?: number }>,
	): number[] {
		const replyIds = comments
			.filter((comment) => comment.inReplyToId === commentId)
			.flatMap((comment) => this.collectCommentDeleteIds(comment.id, comments));
		return [...replyIds, commentId];
	}

	async submitReview(
		prNumber: number,
		request: CreateSourceControlSubmitReviewRequest,
	): Promise<SourceControlReviewSubmission> {
		const provider = await this.getProviderOrThrow();
		const trimmedBody = request.body?.trim();

		if (request.event === 'COMMENT' && !trimmedBody) {
			throw new UserError('A review comment is required.');
		}
		if (request.event === 'REQUEST_CHANGES' && !trimmedBody) {
			throw new UserError('Describe the changes you are requesting.');
		}

		const pr = await provider.getPullRequest(prNumber);
		const created = await provider.submitPullRequestReview(prNumber, {
			body: trimmedBody,
			event: request.event,
			commitId: pr.headSha,
		});

		return {
			id: created.id,
			body: created.body,
			url: created.url,
			state: created.state,
			author: created.author,
			submittedAt: created.submittedAt,
		};
	}

	async deployReview(prNumber: number): Promise<SourceControlReviewDeployResult> {
		const provider = await this.getProviderOrThrow();
		const isApproved = await this.resolveIsApproved(provider, prNumber);
		if (!isApproved) {
			throw new UserError('This pull request must be approved before it can be deployed.');
		}

		const result = await provider.mergePullRequest(prNumber);
		if (!result.merged) {
			throw new UserError(result.message || 'The pull request could not be merged.');
		}

		return {
			merged: result.merged,
			sha: result.sha,
			message: result.message,
		};
	}
}

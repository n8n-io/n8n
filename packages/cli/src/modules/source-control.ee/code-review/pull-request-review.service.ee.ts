import type {
	CreateSourceControlReviewCommentRequest,
	ReviewWorkflowFile,
	ReviewWorkflowSnapshot,
	SourceControlReviewComment,
	SourceControlReviewDetail,
	SourceControlReviewSummary,
} from '@n8n/api-types';
import { Service } from '@n8n/di';
import { jsonParse, UserError } from 'n8n-workflow';

import type { CodeReviewProvider, PullRequestSummary } from './code-review-provider';
import { CodeReviewProviderFactory } from './code-review-provider.factory';
import { encodeReviewCommentBody, parseReviewCommentBody } from './review-comment-metadata';
import { findLineInWorkflowJson } from './workflow-json-line-finder';
import { SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER } from '../constants';
import { SourceControlPreferencesService } from '../source-control-preferences.service.ee';
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
		};
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
				const files = await provider.listFiles(pr.prNumber);
				const workflowChangeCount = files.filter((f) => this.isWorkflowFile(f.path)).length;
				return this.toSummary(pr, workflowChangeCount);
			}),
		);
	}

	/** A single pull request plus base/head snapshots of each changed workflow. */
	async getReview(prNumber: number): Promise<SourceControlReviewDetail> {
		const provider = await this.getProviderOrThrow();
		const pr = await provider.getPullRequest(prNumber);
		const files = await provider.listFiles(prNumber);
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

		return { pullRequest: this.toSummary(pr, workflows.length), workflows };
	}

	async listReviewComments(
		prNumber: number,
		filePath?: string,
	): Promise<SourceControlReviewComment[]> {
		const provider = await this.getProviderOrThrow();
		const comments = await provider.listReviewComments(prNumber);
		return comments
			.filter((comment) => !filePath || comment.path === filePath)
			.map((comment) => {
				const parsed = parseReviewCommentBody(comment.body);
				return {
					id: comment.id,
					body: parsed.body,
					path: comment.path,
					line: comment.line,
					side: comment.side,
					url: comment.url,
					author: comment.author,
					createdAt: comment.createdAt,
					updatedAt: comment.updatedAt,
					anchor: parsed.anchor,
				};
			});
	}

	async createReviewComment(
		prNumber: number,
		request: CreateSourceControlReviewCommentRequest,
	): Promise<SourceControlReviewComment> {
		const provider = await this.getProviderOrThrow();
		const pr = await provider.getPullRequest(prNumber);
		const side = request.side ?? 'RIGHT';
		const commitId = side === 'RIGHT' ? pr.headSha : pr.baseSha;
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
			body: encodeReviewCommentBody(request.body, request.anchor),
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
			url: created.url,
			author: created.author,
			createdAt: created.createdAt,
			updatedAt: created.updatedAt,
			anchor: parsed.anchor,
		};
	}
}

import { IWorkflowToImport } from '@/interfaces';
import {
	PullWorkFolderRequestDto,
	PushWorkFolderRequestDto,
	CreateSourceControlReviewCommentRequestDto,
	CreateSourceControlReviewRequestDto,
	CreateSourceControlSubmitReviewRequestDto,
	type GitCommitInfo,
	type SourceControlledFile,
	type SourceControlReviewComment,
	type SourceControlReviewDetail,
	type SourceControlReviewDeployResult,
	type SourceControlReviewSubmission,
	type SourceControlReviewSummary,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, Post, Patch, Delete, RestController, GlobalScope, Body } from '@n8n/decorators';
import { hasGlobalScope } from '@n8n/permissions';
import * as express from 'express';
import type { PullResult } from 'simple-git';

import { PullRequestReviewService } from './code-review/pull-request-review.service.ee';
import { SOURCE_CONTROL_DEFAULT_BRANCH } from './constants';
import { sourceControlEnabledMiddleware } from './middleware/source-control-enabled-middleware.ee';
import { SourceControlContextFactory } from './source-control-context.factory';
import { getRepoType } from './source-control-helper.ee';
import { SourceControlPreferencesService } from './source-control-preferences.service.ee';
import { SourceControlScopedService } from './source-control-scoped.service';
import { SourceControlService } from './source-control.service.ee';
import type { ImportResult } from './types/import-result';
import { SourceControlRequest } from './types/requests';
import { SourceControlGetStatus } from './types/source-control-get-status';
import type { SourceControlPreferences } from './types/source-control-preferences';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { EventService } from '@/events/event.service';

@RestController('/source-control')
export class SourceControlController {
	constructor(
		private readonly sourceControlService: SourceControlService,
		private readonly sourceControlPreferencesService: SourceControlPreferencesService,
		private readonly sourceControlScopedService: SourceControlScopedService,
		private readonly sourceControlContextFactory: SourceControlContextFactory,
		private readonly eventService: EventService,
		private readonly pullRequestReviewService: PullRequestReviewService,
	) {}

	@Get('/preferences')
	async getPreferences(req: AuthenticatedRequest): Promise<Partial<SourceControlPreferences>> {
		const preferences = this.sourceControlPreferencesService.getPreferences();

		if (hasGlobalScope(req.user, 'sourceControl:manage')) {
			const publicKey = await this.sourceControlPreferencesService.getPublicKey();
			const hasApiToken = await this.sourceControlPreferencesService.hasApiToken();
			const hasGithubApp = await this.sourceControlPreferencesService.hasGithubApp();
			return { ...preferences, publicKey, hasApiToken, hasGithubApp };
		}

		const publicSubset = {
			branchReadOnly: preferences.branchReadOnly,
		};

		const ctx = await this.sourceControlContextFactory.createContext(req.user);
		if (ctx.authorizedProjects.length > 0) {
			return {
				...publicSubset,
				connected: preferences.connected,
				branchName: preferences.branchName,
				branchColor: preferences.branchColor,
			};
		}

		return publicSubset;
	}

	@Post('/preferences')
	@GlobalScope('sourceControl:manage')
	async setPreferences(req: SourceControlRequest.UpdatePreferences) {
		if (
			req.body.branchReadOnly === undefined &&
			this.sourceControlPreferencesService.isSourceControlConnected()
		) {
			throw new BadRequestError(
				'Cannot change preferences while connected to a source control provider. Please disconnect first.',
			);
		}
		try {
			const sanitizedPreferences: Partial<SourceControlPreferences> = {
				...req.body,
				initRepo: req.body.initRepo ?? true, // default to true if not specified
				connected: undefined,
				publicKey: undefined,
			};
			await this.sourceControlPreferencesService.validateSourceControlPreferences(
				sanitizedPreferences,
			);
			const updatedPreferences =
				await this.sourceControlPreferencesService.setPreferences(sanitizedPreferences);
			if (sanitizedPreferences.initRepo === true) {
				try {
					await this.sourceControlService.initializeRepository(
						{
							...updatedPreferences,
							branchName:
								updatedPreferences.branchName === ''
									? SOURCE_CONTROL_DEFAULT_BRANCH
									: updatedPreferences.branchName,
							initRepo: true,
						},
						req.user,
					);
					if (this.sourceControlPreferencesService.getPreferences().branchName !== '') {
						await this.sourceControlPreferencesService.setPreferences({
							connected: true,
						});
					}
				} catch (error) {
					// if initialization fails, run cleanup to remove any intermediate state and throw the error
					await this.sourceControlService.disconnect({ keepKeyPair: true });
					throw error;
				}
			}
			await this.sourceControlService.start();
			const resultingPreferences = this.sourceControlPreferencesService.getPreferences();
			// #region Tracking Information
			// located in controller so as to not call this multiple times when updating preferences
			this.eventService.emit('source-control-settings-updated', {
				branchName: resultingPreferences.branchName,
				connected: resultingPreferences.connected,
				readOnlyInstance: resultingPreferences.branchReadOnly,
				repoType: getRepoType(resultingPreferences.repositoryUrl),
				connectionType: resultingPreferences.connectionType!,
			});
			// #endregion
			return resultingPreferences;
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Patch('/preferences')
	@GlobalScope('sourceControl:manage')
	async updatePreferences(req: SourceControlRequest.UpdatePreferences) {
		try {
			const sanitizedPreferences: Partial<SourceControlPreferences> = {
				...req.body,
				initRepo: false,
				connected: undefined,
				publicKey: undefined,
				repositoryUrl: undefined,
			};
			const currentPreferences = this.sourceControlPreferencesService.getPreferences();
			await this.sourceControlPreferencesService.validateSourceControlPreferences(
				sanitizedPreferences,
			);
			if (
				sanitizedPreferences.branchName &&
				sanitizedPreferences.branchName !== currentPreferences.branchName
			) {
				await this.sourceControlService.setBranch(sanitizedPreferences.branchName);
			}
			const preferenceUpdates: Partial<SourceControlPreferences> = {};
			if (sanitizedPreferences.branchColor !== undefined) {
				preferenceUpdates.branchColor = sanitizedPreferences.branchColor;
			}
			if (sanitizedPreferences.branchReadOnly !== undefined) {
				preferenceUpdates.branchReadOnly = sanitizedPreferences.branchReadOnly;
			}
			if (sanitizedPreferences.apiToken) {
				preferenceUpdates.apiToken = sanitizedPreferences.apiToken;
			}
			if (sanitizedPreferences.apiAuthMethod !== undefined) {
				preferenceUpdates.apiAuthMethod = sanitizedPreferences.apiAuthMethod;
			}
			if (sanitizedPreferences.githubAppId && sanitizedPreferences.githubAppPrivateKey) {
				preferenceUpdates.githubAppId = sanitizedPreferences.githubAppId;
				preferenceUpdates.githubAppPrivateKey = sanitizedPreferences.githubAppPrivateKey;
			}
			if (Object.keys(preferenceUpdates).length > 0) {
				await this.sourceControlPreferencesService.setPreferences(preferenceUpdates, true);
			}
			await this.sourceControlService.start();
			const resultingPreferences = this.sourceControlPreferencesService.getPreferences();
			this.eventService.emit('source-control-settings-updated', {
				branchName: resultingPreferences.branchName,
				connected: resultingPreferences.connected,
				readOnlyInstance: resultingPreferences.branchReadOnly,
				repoType: getRepoType(resultingPreferences.repositoryUrl),
				connectionType: resultingPreferences.connectionType!,
			});
			const hasApiToken = await this.sourceControlPreferencesService.hasApiToken();
			const hasGithubApp = await this.sourceControlPreferencesService.hasGithubApp();
			return { ...resultingPreferences, hasApiToken, hasGithubApp };
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Post('/disconnect')
	@GlobalScope('sourceControl:manage')
	async disconnect(req: SourceControlRequest.Disconnect) {
		try {
			return await this.sourceControlService.disconnect(req.body);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Get('/get-branches')
	@GlobalScope('sourceControl:manage')
	async getBranches() {
		try {
			return await this.sourceControlService.getBranches();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Post('/push-workfolder', { middlewares: [sourceControlEnabledMiddleware] })
	async pushWorkfolder(
		req: AuthenticatedRequest,
		res: express.Response,
		@Body payload: PushWorkFolderRequestDto,
	): Promise<{ files: SourceControlledFile[]; commit: GitCommitInfo | null }> {
		await this.sourceControlScopedService.ensureIsAllowedToPush(req);

		try {
			const result = await this.sourceControlService.pushWorkfolder(req.user, payload);
			res.statusCode = result.statusCode;

			// Extract commit info from push result if available
			const commitInfo: GitCommitInfo | null = result.pushResult?.update?.hash?.to
				? {
						hash: result.pushResult.update.hash.to,
						message: payload.commitMessage ?? 'Updated Workfolder',
						branch: result.pushResult.update.head?.local ?? '',
					}
				: null;

			return {
				files: result.statusResult,
				commit: commitInfo,
			};
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Post('/pull-workfolder', { middlewares: [sourceControlEnabledMiddleware] })
	@GlobalScope('sourceControl:pull')
	async pullWorkfolder(
		req: AuthenticatedRequest,
		res: express.Response,
		@Body payload: PullWorkFolderRequestDto,
	): Promise<SourceControlledFile[] | ImportResult | PullResult | undefined> {
		try {
			const result = await this.sourceControlService.pullWorkfolder(req.user, payload);
			res.statusCode = result.statusCode;
			return result.statusResult;
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Get('/reset-workfolder', { middlewares: [sourceControlEnabledMiddleware] })
	@GlobalScope('sourceControl:manage')
	async resetWorkfolder(): Promise<ImportResult | undefined> {
		try {
			return await this.sourceControlService.resetWorkfolder();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Get('/get-status', { middlewares: [sourceControlEnabledMiddleware] })
	async getStatus(req: SourceControlRequest.GetStatus) {
		await this.sourceControlScopedService.ensureIsAllowedToGetStatus(req);
		try {
			const result = await this.sourceControlService.getStatus(
				req.user,
				new SourceControlGetStatus(req.query),
			);
			return result;
		} catch (error) {
			if (error instanceof ForbiddenError) {
				throw error;
			}
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Get('/status')
	async status(req: SourceControlRequest.GetStatus) {
		await this.sourceControlScopedService.ensureIsAllowedToGetStatus(req);
		try {
			return await this.sourceControlService.getStatus(
				req.user,
				new SourceControlGetStatus(req.query),
			);
		} catch (error) {
			if (error instanceof ForbiddenError) {
				throw error;
			}
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Post('/generate-key-pair')
	@GlobalScope('sourceControl:manage')
	async generateKeyPair(
		req: SourceControlRequest.GenerateKeyPair,
	): Promise<SourceControlPreferences> {
		try {
			const keyPairType = req.body.keyGeneratorType;
			const result = await this.sourceControlPreferencesService.generateAndSaveKeyPair(keyPairType);
			const publicKey = await this.sourceControlPreferencesService.getPublicKey();
			return { ...result, publicKey };
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Get('/remote-content/:type/:id', { middlewares: [sourceControlEnabledMiddleware] })
	async getFileContent(
		req: AuthenticatedRequest & { params: { type: SourceControlledFile['type']; id: string } },
	): Promise<{ content: IWorkflowToImport; type: SourceControlledFile['type'] }> {
		try {
			const { type, id } = req.params;
			const content = await this.sourceControlService.getRemoteFileEntity({
				user: req.user,
				type,
				id,
			});
			return { content, type };
		} catch (error) {
			if (error instanceof ForbiddenError) {
				throw error;
			}
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Get('/reviews/candidates', { middlewares: [sourceControlEnabledMiddleware] })
	@GlobalScope('sourceControl:pull')
	async listReviewCandidates(req: AuthenticatedRequest): Promise<SourceControlledFile[]> {
		try {
			return await this.pullRequestReviewService.listReviewCandidates(req.user);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Post('/reviews', { middlewares: [sourceControlEnabledMiddleware] })
	@GlobalScope('sourceControl:push')
	async createReview(
		req: AuthenticatedRequest,
		_res: express.Response,
		@Body payload: CreateSourceControlReviewRequestDto,
	): Promise<SourceControlReviewSummary> {
		if (!payload.workflowIds?.length) {
			throw new BadRequestError('At least one workflow must be selected');
		}
		try {
			return await this.pullRequestReviewService.createReviewRequest(req.user, payload);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Get('/reviews', { middlewares: [sourceControlEnabledMiddleware] })
	@GlobalScope('sourceControl:pull')
	async listReviews(): Promise<SourceControlReviewSummary[]> {
		try {
			return await this.pullRequestReviewService.listReviews();
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Get('/reviews/:prNumber', { middlewares: [sourceControlEnabledMiddleware] })
	@GlobalScope('sourceControl:pull')
	async getReview(
		req: AuthenticatedRequest & { params: { prNumber: string } },
	): Promise<SourceControlReviewDetail> {
		const prNumber = Number(req.params.prNumber);
		if (!Number.isInteger(prNumber) || prNumber <= 0) {
			throw new BadRequestError('Invalid pull request number');
		}
		try {
			return await this.pullRequestReviewService.getReview(prNumber);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Get('/reviews/:prNumber/comments', { middlewares: [sourceControlEnabledMiddleware] })
	@GlobalScope('sourceControl:pull')
	async listReviewComments(
		req: AuthenticatedRequest & {
			params: { prNumber: string };
			query: { path?: string };
		},
	): Promise<SourceControlReviewComment[]> {
		const prNumber = Number(req.params.prNumber);
		if (!Number.isInteger(prNumber) || prNumber <= 0) {
			throw new BadRequestError('Invalid pull request number');
		}
		try {
			return await this.pullRequestReviewService.listReviewComments(prNumber, req.query.path);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Post('/reviews/:prNumber/comments', { middlewares: [sourceControlEnabledMiddleware] })
	@GlobalScope('sourceControl:push')
	async createReviewComment(
		req: AuthenticatedRequest & { params: { prNumber: string } },
		_res: express.Response,
		@Body payload: CreateSourceControlReviewCommentRequestDto,
	): Promise<SourceControlReviewComment> {
		const prNumber = Number(req.params.prNumber);
		if (!Number.isInteger(prNumber) || prNumber <= 0) {
			throw new BadRequestError('Invalid pull request number');
		}
		if (!payload.body?.trim()) {
			throw new BadRequestError('Comment body is required');
		}
		if (payload.inReplyToId) {
			try {
				return await this.pullRequestReviewService.createReviewComment(prNumber, payload);
			} catch (error) {
				throw new BadRequestError((error as { message: string }).message);
			}
		}
		if (!payload.path?.trim()) {
			throw new BadRequestError('Workflow file path is required');
		}
		if (!payload.anchor?.nodeId?.trim()) {
			throw new BadRequestError('A node anchor is required');
		}
		try {
			return await this.pullRequestReviewService.createReviewComment(prNumber, payload);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Delete('/reviews/:prNumber/comments/:commentId', {
		middlewares: [sourceControlEnabledMiddleware],
	})
	@GlobalScope('sourceControl:push')
	async deleteReviewComment(
		req: AuthenticatedRequest & { params: { prNumber: string; commentId: string } },
	): Promise<{ deletedCommentIds: number[] }> {
		const prNumber = Number(req.params.prNumber);
		const commentId = Number(req.params.commentId);
		if (!Number.isInteger(prNumber) || prNumber <= 0) {
			throw new BadRequestError('Invalid pull request number');
		}
		if (!Number.isInteger(commentId) || commentId <= 0) {
			throw new BadRequestError('Invalid comment id');
		}
		try {
			const deletedCommentIds = await this.pullRequestReviewService.deleteReviewComment(
				prNumber,
				commentId,
			);
			return { deletedCommentIds };
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Post('/reviews/:prNumber/submit', { middlewares: [sourceControlEnabledMiddleware] })
	@GlobalScope('sourceControl:push')
	async submitReview(
		req: AuthenticatedRequest & { params: { prNumber: string } },
		_res: express.Response,
		@Body payload: CreateSourceControlSubmitReviewRequestDto,
	): Promise<SourceControlReviewSubmission> {
		const prNumber = Number(req.params.prNumber);
		if (!Number.isInteger(prNumber) || prNumber <= 0) {
			throw new BadRequestError('Invalid pull request number');
		}
		try {
			return await this.pullRequestReviewService.submitReview(prNumber, payload);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}

	@Post('/reviews/:prNumber/deploy', { middlewares: [sourceControlEnabledMiddleware] })
	@GlobalScope('sourceControl:push')
	async deployReview(
		req: AuthenticatedRequest & { params: { prNumber: string } },
	): Promise<SourceControlReviewDeployResult> {
		const prNumber = Number(req.params.prNumber);
		if (!Number.isInteger(prNumber) || prNumber <= 0) {
			throw new BadRequestError('Invalid pull request number');
		}
		try {
			return await this.pullRequestReviewService.deployReview(prNumber);
		} catch (error) {
			throw new BadRequestError((error as { message: string }).message);
		}
	}
}

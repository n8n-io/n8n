import type {
	WorkflowSuggestionAction,
	WorkflowSuggestionActionResult,
	WorkflowSuggestionAppliedVersion,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { TransactionRunner, WorkflowEntity, type OperationContext, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import isEqual from 'lodash/isEqual';
import { calculateWorkflowChecksum } from 'n8n-workflow';

import { CollaborationService } from '@/collaboration/collaboration.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import { WorkflowPublicationStatusService } from '@/workflows/publication/workflow-publication-status.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { WorkflowSuggestionRepository } from './database/workflow-suggestion.repository';
import { WorkflowSuggestionService } from './workflow-suggestion.service';

@Service()
export class WorkflowSuggestionActionsService {
	constructor(
		private readonly service: WorkflowSuggestionService,
		private readonly suggestions: WorkflowSuggestionRepository,
		private readonly workflows: WorkflowService,
		private readonly collaboration: CollaborationService,
		private readonly publication: WorkflowPublicationStatusService,
		private readonly txRunner: TransactionRunner,
		private readonly logger: Logger,
	) {}

	async act(
		actor: User,
		projectId: string,
		workflowId: string,
		suggestionId: string,
		action: WorkflowSuggestionAction,
		clientId?: string,
	): Promise<WorkflowSuggestionActionResult> {
		if (action === 'discard') {
			await this.discard(actor, projectId, workflowId, suggestionId);
			return await this.service.getProposal(actor, projectId, workflowId, suggestionId);
		}

		const user = await this.service.requireEditor(actor.id, workflowId);
		const scope = { workflowId, projectId };
		const { suggestion, target } = await this.service.reconcilePending(suggestionId, scope);
		if (!target.workflow || target.projectId !== projectId)
			throw new NotFoundError('Suggestion not found.');
		if (action === 'approve-and-publish') {
			if (!(await userHasScopes(user, ['workflow:publish'], false, { workflowId }))) {
				throw new ForbiddenError('Workflow publish access is required.');
			}
		}

		let publicationError: string | undefined;
		if (suggestion.state === 'pending') {
			if (suggestion.resultKind !== 'fix_ready') {
				throw new ConflictError('Only a Fix ready suggestion can be applied.');
			}
			await this.collaboration.validateWriteLock(
				user.id,
				clientId ?? suggestionId,
				workflowId,
				'update',
			);
			let applied: WorkflowSuggestionAppliedVersion | undefined;
			try {
				await this.workflows.update(
					user,
					Object.assign(new WorkflowEntity(), structuredClone(suggestion.payload.candidate)),
					workflowId,
					{
						expectedChecksum: suggestion.expectedBaseline.checksum,
						source: 'n8n-ai',
						guardedUpdate: {
							beforeSave: async (ctx, prepared) => {
								const target = await this.suggestions.readWorkflowTargetForApply(workflowId, ctx);
								const current = await this.suggestions.getSuggestion(suggestionId, scope, ctx);
								if (
									current.state !== 'pending' ||
									!target.workflow ||
									!(await this.service.matchesBaseline(
										current,
										target.workflow,
										target.projectId,
										target.publicationId,
									))
								) {
									throw new ConflictError('The suggestion no longer matches the workflow.');
								}
								const status = await this.publication.getStatus(workflowId, ctx);
								if (
									status.status !== 'published' ||
									status.liveVersionId !== current.expectedBaseline.publishedVersionId
								) {
									throw new ConflictError('The original workflow is no longer fully published.');
								}
								const reviewed = { ...current.payload.original, ...current.payload.candidate };
								if (
									(await calculateWorkflowChecksum(prepared)) !==
										(await calculateWorkflowChecksum(reviewed)) ||
									!isEqual(prepared.staticData, target.workflow.staticData) ||
									prepared.versionId === target.workflow.versionId
								) {
									throw new ConflictError('Workflow save preparation changed the reviewed fix.');
								}
							},
							afterSave: async (ctx, saved) => {
								applied = {
									versionId: saved.versionId,
									checksum: await calculateWorkflowChecksum(saved),
									action,
									actorId: user.id,
								};
								const closed = await this.suggestions.closePending(
									suggestion,
									'applied',
									user.id,
									ctx,
									applied,
								);
								if (!closed) throw new ConflictError('The suggestion has already closed.');
							},
						},
					},
				);
			} catch (error) {
				// A committed result also survives an after-update hook or a response failure.
				const current = await this.suggestions.getSuggestion(suggestionId, scope);
				if (current.state === 'pending') {
					await this.service.reconcilePending(suggestionId, scope);
					throw error;
				}
				// Only the request that saved this version can start publication.
				if (applied?.versionId !== current.appliedVersion?.versionId) applied = undefined;
			}
			if (applied) {
				try {
					await this.collaboration.broadcastWorkflowUpdate(workflowId, user.id);
				} catch (error) {
					this.logger.warn('Could not notify editors about the applied suggestion', {
						workflowId,
						error,
					});
				}
				if (action === 'approve-and-publish' && applied.action === action) {
					try {
						const publisher = await this.service.requireEditor(user.id, workflowId);
						await this.collaboration.validateWriteLock(
							publisher.id,
							clientId ?? suggestionId,
							workflowId,
							'publish',
						);
						await this.workflows.activateWorkflow(publisher, workflowId, {
							versionId: applied.versionId,
							expectedChecksum: applied.checksum,
							source: 'n8n-ai',
						});
					} catch (error) {
						// Apply is committed. The editor owns publication status and recovery.
						publicationError = ensureError(error).message;
					}
				}
			}
		}
		return {
			...(await this.service.getProposal(user, projectId, workflowId, suggestionId)),
			...(publicationError !== undefined ? { publicationError } : {}),
		};
	}

	async discard(
		user: User,
		projectId: string,
		workflowId: string,
		suggestionId: string,
		ctx: OperationContext = {},
	) {
		await this.txRunner.run(ctx, async (ctx) => {
			await this.service.requireEditor(user.id, workflowId, ctx);
			const { suggestion, target } = await this.service.reconcilePending(
				suggestionId,
				{ workflowId, projectId },
				ctx,
			);
			if (!target.workflow || target.projectId !== projectId)
				throw new NotFoundError('Suggestion not found.');
			if (suggestion.state === 'pending') {
				await this.suggestions.closePending(suggestion, 'discarded', user.id, ctx);
			}
		});
	}
}

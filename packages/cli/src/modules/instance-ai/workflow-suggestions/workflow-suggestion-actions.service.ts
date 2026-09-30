import type { WorkflowSuggestionAction, WorkflowSuggestionAppliedVersion } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { TransactionRunner, WorkflowEntity, type OperationContext, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, ForbiddenError, NotFoundError } from '@n8n/errors';
import isEqual from 'lodash/isEqual';
import { calculateWorkflowChecksum } from 'n8n-workflow';

import { CollaborationService } from '@/collaboration/collaboration.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import { WorkflowPublicationStatusService } from '@/workflows/publication/workflow-publication-status.service';
import { WorkflowService } from '@/workflows/workflow.service';

import type { WorkflowSuggestion } from './database/workflow-suggestion.entity';
import { WorkflowSuggestionRepository } from './database/workflow-suggestion.repository';
import { WorkflowSuggestionPublicationService } from './workflow-suggestion-publication.service';
import { WorkflowSuggestionService } from './workflow-suggestion.service';

@Service()
export class WorkflowSuggestionActionsService {
	constructor(
		private readonly service: WorkflowSuggestionService,
		private readonly suggestions: WorkflowSuggestionRepository,
		private readonly workflows: WorkflowService,
		private readonly collaboration: CollaborationService,
		private readonly publication: WorkflowPublicationStatusService,
		private readonly publisher: WorkflowSuggestionPublicationService,
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
	) {
		const user = await this.service.requireEditor(actor.id, workflowId);
		const scope = { workflowId, projectId };
		const { suggestion, target } = await this.service.reconcilePending(suggestionId, scope);
		if (!target.workflow || target.projectId !== projectId)
			throw new NotFoundError('Suggestion not found.');
		if (action === 'approve-and-publish' || action === 'retry-publication') {
			if (!(await userHasScopes(user, ['workflow:publish'], false, { workflowId }))) {
				throw new ForbiddenError('Workflow publish access is required.');
			}
		}

		if (action === 'discard') {
			await this.discard(user, projectId, workflowId, suggestionId);
		} else if (action === 'retry-publication') {
			if (suggestion.appliedVersion?.action !== 'approve-and-publish') {
				throw new ConflictError(
					'Approve and publish is required before publication can be retried.',
				);
			}
			await this.publish(user, suggestion, clientId);
		} else if (suggestion.state === 'pending') {
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
									projectId,
									previousPublishedVersionId: suggestion.expectedBaseline.publishedVersionId,
									baselinePublicationId: suggestion.expectedBaseline.publicationId ?? null,
									checksum: await calculateWorkflowChecksum(saved),
									action,
									actorId: user.id,
								};
								await this.suggestions.closePending(suggestion, 'applied', user.id, ctx, applied);
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
				applied = current.appliedVersion ?? undefined;
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
					await this.publish(user, { ...suggestion, appliedVersion: applied }, clientId);
				}
			}
		}
		return await this.service.getProposal(user, projectId, workflowId, suggestionId);
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

	private async publish(user: User, suggestion: WorkflowSuggestion, clientId?: string) {
		if (!suggestion.appliedVersion) throw new ConflictError('The suggestion has not been applied.');
		if (
			suggestion.publication?.status === 'published' ||
			suggestion.publication?.status === 'partial'
		) {
			return;
		}
		await this.collaboration.validateWriteLock(
			user.id,
			clientId ?? suggestion.id,
			suggestion.workflowId,
			'publish',
		);
		const publication = await this.publisher.publish(
			user,
			suggestion.workflowId,
			suggestion.appliedVersion,
		);
		await this.txRunner.run(
			{},
			async (ctx) =>
				await this.suggestions.recordPublication(suggestion.id, publication, user.id, ctx),
		);
	}
}

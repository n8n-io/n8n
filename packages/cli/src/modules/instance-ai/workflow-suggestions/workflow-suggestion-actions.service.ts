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

import type { WorkflowSuggestion } from './database/workflow-suggestion.entity';
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
			const outcome = await this.discard(actor, projectId, workflowId, suggestionId);
			if (outcome === 'unavailable') throw new NotFoundError('Suggestion not found.');
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

		const newlyAppliedVersion = await this.applyOnce(user, suggestion, action, clientId);
		let publicationError: string | undefined;
		if (newlyAppliedVersion) {
			if (action === 'approve-and-publish') {
				publicationError = await this.publishAppliedVersion(
					user,
					suggestion,
					newlyAppliedVersion,
					clientId,
				);
			}
			try {
				await this.collaboration.broadcastWorkflowUpdate(workflowId, user.id);
			} catch (error) {
				this.logger.warn('Could not notify editors about the applied suggestion', {
					workflowId,
					error,
				});
			}
		}
		return {
			...(await this.service.getProposal(user, projectId, workflowId, suggestionId)),
			...(publicationError !== undefined ? { publicationError } : {}),
		};
	}

	private async applyOnce(
		user: User,
		suggestion: WorkflowSuggestion,
		action: WorkflowSuggestionAppliedVersion['action'],
		clientId?: string,
	): Promise<WorkflowSuggestionAppliedVersion | undefined> {
		if (suggestion.state !== 'pending') return undefined;
		if (suggestion.resultKind !== 'fix_ready') {
			throw new ConflictError('Only a Fix ready suggestion can be applied.');
		}
		const { workflowId, projectId } = suggestion;
		await this.collaboration.validateWriteLock(
			user.id,
			clientId ?? suggestion.id,
			workflowId,
			'update',
		);

		let attemptedVersion: WorkflowSuggestionAppliedVersion | undefined;
		try {
			await this.workflows.update(
				user,
				Object.assign(new WorkflowEntity(), structuredClone(suggestion.payload.candidate)),
				workflowId,
				{
					expectedChecksum: suggestion.expectedBaseline.checksum,
					source: 'n8n-ai',
					guardedUpdate: {
						beforeSave: async (ctx, prepared) =>
							await this.validatePreparedWorkflow(suggestion, prepared, ctx),
						afterSave: async (ctx, saved) => {
							attemptedVersion = {
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
								attemptedVersion,
							);
							if (!closed) throw new ConflictError('The suggestion has already closed.');
						},
					},
				},
			);
		} catch (error) {
			// After-update hooks can fail after the transaction commits.
			const current = await this.suggestions.getSuggestion(suggestion.id, {
				workflowId,
				projectId,
			});
			if (current.state === 'pending') {
				await this.service.reconcilePending(suggestion.id, { workflowId, projectId });
				throw error;
			}
			// Only return the version committed by this request.
			if (attemptedVersion?.versionId !== current.appliedVersion?.versionId) return undefined;
		}
		return attemptedVersion;
	}

	private async validatePreparedWorkflow(
		suggestion: WorkflowSuggestion,
		prepared: WorkflowEntity,
		ctx: OperationContext,
	) {
		const { workflowId, projectId } = suggestion;
		const target = await this.service.readWorkflowTargetForApply(workflowId, ctx);
		const current = await this.suggestions.getSuggestion(
			suggestion.id,
			{ workflowId, projectId },
			ctx,
		);
		if (
			current.state !== 'pending' ||
			!target.workflow ||
			!(await this.service.matchesBaseline(current, target))
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
			(await calculateWorkflowChecksum(prepared)) !== (await calculateWorkflowChecksum(reviewed)) ||
			!isEqual(prepared.staticData, target.workflow.staticData) ||
			prepared.versionId === target.workflow.versionId
		) {
			throw new ConflictError('Workflow save preparation changed the reviewed fix.');
		}
	}

	private async publishAppliedVersion(
		user: User,
		suggestion: WorkflowSuggestion,
		version: WorkflowSuggestionAppliedVersion,
		clientId?: string,
	): Promise<string | undefined> {
		const { workflowId } = suggestion;
		try {
			const publisher = await this.service.requireEditor(user.id, workflowId);
			await this.collaboration.validateWriteLock(
				publisher.id,
				clientId ?? suggestion.id,
				workflowId,
				'publish',
			);
			await this.workflows.activateWorkflow(publisher, workflowId, {
				versionId: version.versionId,
				expectedChecksum: version.checksum,
				source: 'n8n-ai',
			});
			return undefined;
		} catch (error) {
			// Apply is committed. The editor owns publication status and recovery.
			return ensureError(error).message;
		}
	}

	async discard(
		user: User,
		projectId: string,
		workflowId: string,
		suggestionId: string,
		ctx: OperationContext = {},
	): Promise<'discarded' | 'already_closed' | 'unavailable'> {
		return await this.txRunner.run(ctx, async (ctx) => {
			await this.service.requireEditor(user.id, workflowId, ctx);
			const { suggestion, target } = await this.service.reconcilePending(
				suggestionId,
				{ workflowId, projectId },
				ctx,
			);
			if (!target.workflow || target.projectId !== projectId) return 'unavailable';
			if (suggestion.state === 'pending') {
				const closed = await this.suggestions.closePending(suggestion, 'discarded', user.id, ctx);
				return closed ? 'discarded' : 'already_closed';
			}
			return 'already_closed';
		});
	}
}

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
		const user = await this.service.requireEditor(actor.id, workflowId);
		const scope = { workflowId, projectId };
		let newlyAppliedVersion: WorkflowSuggestionAppliedVersion | undefined;
		let publishError: string | undefined;
		switch (action) {
			case 'discard':
				await this.discard(user, projectId, workflowId, suggestionId);
				break;
			case 'open-in-editor':
				newlyAppliedVersion = await this.applySuggestion(
					user,
					scope,
					suggestionId,
					action,
					clientId,
				);
				break;
			case 'approve-and-publish':
				if (!(await userHasScopes(user, ['workflow:publish'], false, { workflowId }))) {
					throw new ForbiddenError('Workflow publish access is required.');
				}
				newlyAppliedVersion = await this.applySuggestion(
					user,
					scope,
					suggestionId,
					action,
					clientId,
				);
				if (newlyAppliedVersion) {
					try {
						await this.publishAppliedVersion(
							user,
							workflowId,
							newlyAppliedVersion,
							clientId ?? suggestionId,
						);
					} catch (error) {
						// Apply is committed. The editor owns publication status and recovery.
						publishError = ensureError(error).message;
					}
				}
				break;
		}
		if (newlyAppliedVersion) {
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
			...(publishError !== undefined ? { publishError } : {}),
		};
	}

	private async applySuggestion(
		user: User,
		scope: Pick<WorkflowSuggestion, 'workflowId' | 'projectId'>,
		suggestionId: string,
		action: WorkflowSuggestionAppliedVersion['action'],
		clientId?: string,
	): Promise<WorkflowSuggestionAppliedVersion | undefined> {
		const { workflowId, projectId } = scope;
		const { suggestion, target } = await this.service.reconcilePending(suggestionId, scope);
		if (!target.workflow || target.projectId !== projectId)
			throw new NotFoundError('Suggestion not found.');
		if (suggestion.state !== 'pending') return undefined;
		if (suggestion.resultKind !== 'fix_ready') {
			throw new ConflictError('Only a Fix ready suggestion can be applied.');
		}
		await this.collaboration.validateWriteLock(
			user.id,
			clientId ?? suggestion.id,
			workflowId,
			'update',
		);

		const prepared = await this.workflows.prepareUpdate(
			user,
			Object.assign(new WorkflowEntity(), structuredClone(suggestion.payload.candidate)),
			workflowId,
			{ expectedChecksum: suggestion.expectedBaseline.checksum, source: 'n8n-ai' },
		);
		const { saved, appliedVersion } = await this.txRunner.run({}, async (ctx) => {
			await this.validatePreparedWorkflow(suggestion, prepared.workflow, ctx);
			await this.service.requireEditor(user.id, workflowId, ctx);
			const saved = await this.workflows.savePreparedUpdate(prepared, ctx);
			const appliedVersion: WorkflowSuggestionAppliedVersion = {
				versionId: saved.versionId,
				checksum: await calculateWorkflowChecksum(saved),
				action,
				actorId: user.id,
			};
			const closed = await this.suggestions.closePending(
				suggestion,
				'applied',
				{ author: 'human', actorId: user.id },
				ctx,
				appliedVersion,
			);
			if (!closed) throw new ConflictError('The suggestion has already closed.');
			return { saved, appliedVersion };
		});
		try {
			await this.workflows.finishUpdate(prepared, saved);
		} catch (error) {
			this.logger.warn('Could not finish the workflow update after Apply committed', {
				suggestionId,
				error,
			});
		}
		return appliedVersion;
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
		workflowId: string,
		version: WorkflowSuggestionAppliedVersion,
		clientId: string,
	) {
		const publisher = await this.service.requireEditor(user.id, workflowId);
		await this.collaboration.validateWriteLock(publisher.id, clientId, workflowId, 'publish');
		await this.workflows.activateWorkflow(publisher, workflowId, {
			versionId: version.versionId,
			expectedChecksum: version.checksum,
			source: 'n8n-ai',
		});
	}

	private async discard(user: User, projectId: string, workflowId: string, suggestionId: string) {
		const found = await this.txRunner.run({}, async (ctx) => {
			const { suggestion, target } = await this.service.reconcilePending(
				suggestionId,
				{ workflowId, projectId },
				ctx,
			);
			if (!target.workflow || target.projectId !== projectId) return false;
			if (suggestion.state === 'pending') {
				await this.suggestions.closePending(
					suggestion,
					'discarded',
					{ author: 'human', actorId: user.id },
					ctx,
				);
			}
			return true;
		});
		// Commit the outdated closure before rejecting the old project.
		if (!found) throw new NotFoundError('Suggestion not found.');
	}
}

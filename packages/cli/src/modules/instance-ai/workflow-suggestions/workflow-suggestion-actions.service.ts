import type {
	WorkflowSuggestionActionResult,
	WorkflowSuggestionAppliedVersion,
	WorkflowSuggestionProposalDetail,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { TransactionRunner, WorkflowEntity, type OperationContext, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import isEqual from 'lodash/isEqual';
import sortBy from 'lodash/sortBy';
import { calculateWorkflowChecksum } from 'n8n-workflow';

import { CollaborationService } from '@/collaboration/collaboration.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import { WorkflowPublicationStatusService } from '@/workflows/publication/workflow-publication-status.service';
import { WorkflowService, type PreparedWorkflowUpdate } from '@/workflows/workflow.service';

import type { WorkflowSuggestion } from './database/workflow-suggestion.entity';
import { WorkflowSuggestionRepository } from './database/workflow-suggestion.repository';
import { WorkflowSuggestionService } from './workflow-suggestion.service';

type SuggestionGroup = Array<Pick<WorkflowSuggestion, 'id' | 'workflowId'>>;

type AppliedMember = {
	suggestion: WorkflowSuggestion;
	update: PreparedWorkflowUpdate;
	workflow: WorkflowEntity;
	version: WorkflowSuggestionAppliedVersion;
};

type ApplyResult = { status: 'applied'; saved: AppliedMember[] } | { status: 'outdated' };

type GroupActionResult = {
	suggestions: WorkflowSuggestionProposalDetail[];
	/** A publish request error does not establish whether the versions are live. */
	publishError?: string;
};

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

	async apply(
		actor: User,
		projectId: string,
		group: SuggestionGroup,
		action: WorkflowSuggestionAppliedVersion['action'],
		clientId?: string,
	): Promise<GroupActionResult> {
		const [user] = await Promise.all(
			group.map(async ({ workflowId }) => {
				const editor = await this.service.requireEditor(actor.id, workflowId);
				if (
					action === 'approve-and-publish' &&
					!(await userHasScopes(editor, ['workflow:publish'], false, { workflowId }))
				) {
					throw new ForbiddenError('Workflow publish access is required.');
				}
				return editor;
			}),
		);
		const result = await this.applyGroup(user, projectId, group, action, clientId);
		let publishError: string | undefined;
		if (result.status === 'applied') {
			if (action === 'approve-and-publish') {
				try {
					for (const { suggestion, version } of result.saved) {
						await this.publishAppliedVersion(
							user,
							suggestion.workflowId,
							version,
							clientId ?? suggestion.id,
						);
					}
				} catch (error) {
					// Apply is committed. The editor owns publication status and recovery.
					publishError = ensureError(error).message;
				}
			}
			for (const { workflowId } of group) await this.notifyEditors(workflowId, user.id);
		}
		const suggestions: WorkflowSuggestionProposalDetail[] = [];
		for (const { id, workflowId } of group) {
			suggestions.push(await this.service.getProposal(user, projectId, workflowId, id));
		}
		return { suggestions, ...(publishError !== undefined ? { publishError } : {}) };
	}

	async discard(
		actor: User,
		projectId: string,
		workflowId: string,
		suggestionId: string,
	): Promise<WorkflowSuggestionActionResult> {
		const outcome = await this.discardPending(actor, projectId, [{ id: suggestionId, workflowId }]);
		// Commit the outdated closure before rejecting the old project.
		if (outcome === 'unavailable') throw new NotFoundError('Suggestion not found.');
		return await this.service.getProposal(actor, projectId, workflowId, suggestionId);
	}

	// Result dismissal joins this write so the result and its suggestions commit together.
	async discardPending(
		actor: User,
		projectId: string,
		group: SuggestionGroup,
		ctx: OperationContext = {},
	): Promise<'discarded' | 'outdated' | 'already_closed' | 'unavailable'> {
		return await this.txRunner.run(ctx, async (ctx) => {
			const suggestions: WorkflowSuggestion[] = [];
			for (const { id, workflowId } of group) {
				await this.service.requireEditor(actor.id, workflowId, ctx);
				const { suggestion, target } = await this.service.reconcilePending(
					id,
					{ workflowId, projectId },
					ctx,
				);
				if (!target.workflow || target.projectId !== projectId) return 'unavailable';
				suggestions.push(suggestion);
			}
			if (suggestions.some(({ closedReason }) => closedReason === 'outdated')) return 'outdated';
			if (suggestions.some(({ state }) => state !== 'pending')) return 'already_closed';

			for (const [index, suggestion] of suggestions.entries()) {
				const discarded = await this.suggestions.closePending(
					suggestion,
					'discarded',
					{ author: 'human', actorId: actor.id },
					ctx,
				);
				if (discarded) continue;
				if (index === 0) return 'already_closed';
				throw new ConflictError('This suggestion is already closed.');
			}
			return 'discarded';
		});
	}

	private async applyGroup(
		user: User,
		projectId: string,
		group: SuggestionGroup,
		action: WorkflowSuggestionAppliedVersion['action'],
		clientId: string | undefined,
	): Promise<ApplyResult> {
		const suggestions: WorkflowSuggestion[] = [];
		for (const { id, workflowId } of group) {
			const { suggestion, target } = await this.service.reconcilePending(id, {
				workflowId,
				projectId,
			});
			if (!target.workflow || target.projectId !== projectId)
				throw new NotFoundError('Suggestion not found.');
			suggestions.push(suggestion);
		}

		if (suggestions.some(({ closedReason }) => closedReason === 'outdated')) {
			return { status: 'outdated' };
		}
		if (suggestions.some(({ state }) => state !== 'pending')) {
			throw new ConflictError('This suggestion is already closed.');
		}
		if (
			action === 'approve-and-publish' &&
			suggestions.some(({ resultKind }) => resultKind !== 'fix_ready')
		) {
			throw new ConflictError('Only a Fix ready suggestion can be approved and published.');
		}

		const prepared: Array<{ suggestion: WorkflowSuggestion; update: PreparedWorkflowUpdate }> = [];
		for (const suggestion of sortBy(suggestions, 'workflowId')) {
			const { workflowId } = suggestion;
			await this.collaboration.validateWriteLock(
				user.id,
				clientId ?? suggestion.id,
				workflowId,
				'update',
			);
			const update = await this.workflows.prepareUpdate(
				user,
				Object.assign(new WorkflowEntity(), structuredClone(suggestion.payload.candidate)),
				workflowId,
				{ expectedChecksum: suggestion.expectedBaseline.checksum, source: 'n8n-ai' },
			);
			prepared.push({ suggestion, update });
		}

		const saved = await this.txRunner.run({}, async (ctx) => {
			for (const { suggestion, update } of prepared) {
				await this.validatePreparedWorkflow(suggestion, update.workflow, ctx);
				await this.service.requireEditor(user.id, suggestion.workflowId, ctx);
			}

			const saved: AppliedMember[] = [];
			for (const { suggestion, update } of prepared) {
				const workflow = await this.workflows.savePreparedUpdate(update, ctx, {
					propagateVersionHistoryErrors: true,
				});

				const version: WorkflowSuggestionAppliedVersion = {
					versionId: workflow.versionId,
					checksum: await calculateWorkflowChecksum(workflow),
					action,
					actorId: user.id,
				};

				const closed = await this.suggestions.closePending(
					suggestion,
					'applied',
					{ author: 'human', actorId: user.id },
					ctx,
					version,
				);
				if (!closed) throw new ConflictError('The suggestion has already closed.');

				saved.push({ suggestion, update, workflow, version });
			}
			return saved;
		});

		for (const { suggestion, update, workflow } of saved) {
			try {
				await this.workflows.finishUpdate(update, workflow);
			} catch (error) {
				this.logger.warn('Could not finish the workflow update after Apply committed', {
					suggestionId: suggestion.id,
					error,
				});
			}
		}

		return { status: 'applied', saved };
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

	private async notifyEditors(workflowId: string, userId: string) {
		try {
			await this.collaboration.broadcastWorkflowUpdate(workflowId, userId);
		} catch (error) {
			this.logger.warn('Could not notify editors about the applied suggestion', {
				workflowId,
				error,
			});
		}
	}
}

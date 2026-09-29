import type {
	WorkflowSuggestionAppliedVersion,
	WorkflowSuggestionPublication,
} from '@n8n/api-types';
import {
	UserRepository,
	WorkflowPublicationOutboxRepository,
	WorkflowPublicationRetryStateRepository,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, ForbiddenError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { calculateWorkflowChecksum } from 'n8n-workflow';

import { userHasScopes } from '@/permissions.ee/check-access';
import { WorkflowPublicationStatusService } from '@/workflows/publication/workflow-publication-status.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { WorkflowSuggestionRepository } from './database/workflow-suggestion.repository';

@Service()
export class WorkflowSuggestionPublicationService {
	constructor(
		private readonly suggestions: WorkflowSuggestionRepository,
		private readonly users: UserRepository,
		private readonly publication: WorkflowPublicationStatusService,
		private readonly outbox: WorkflowPublicationOutboxRepository,
		private readonly workflows: WorkflowService,
		private readonly retryState: WorkflowPublicationRetryStateRepository,
	) {}

	/** Read the existing publication result without starting another attempt. */
	async reconcile(
		workflowId: string,
		applied: WorkflowSuggestionAppliedVersion,
	): Promise<WorkflowSuggestionPublication> {
		try {
			const [{ workflow }, status, attempt, changed] = await Promise.all([
				this.suggestions.readWorkflowTarget(workflowId, {}),
				this.publication.getStatus(workflowId),
				this.outbox.findLatestForVersion(workflowId, applied.versionId),
				this.outbox.hasPublicationChangedSince(
					workflowId,
					applied.versionId,
					applied.baselinePublicationId,
				),
			]);
			if (!workflow || changed) return { status: 'unknown' };
			if (status.status === 'in_progress') {
				return {
					status: status.pendingVersionId === applied.versionId ? 'in_progress' : 'unknown',
				};
			}
			if (
				workflow.activeVersionId === applied.versionId &&
				status.liveVersionId === applied.versionId &&
				(status.status === 'published' || status.status === 'partial')
			) {
				return { status: status.status };
			}
			// A failed HTTP response does not prove that trigger registration failed.
			if (attempt?.status === 'pending' || attempt?.status === 'in_progress') {
				return { status: 'in_progress' };
			}
			if (
				(status.liveVersionId === null ||
					status.liveVersionId === applied.previousPublishedVersionId) &&
				(workflow.activeVersionId === applied.versionId ||
					workflow.activeVersionId === applied.previousPublishedVersionId)
			) {
				const failed =
					attempt?.status === 'failed' ||
					(!attempt &&
						!!(await this.retryState.findOneBy({
							workflowId,
							targetVersionId: applied.versionId,
						})));
				if (failed) {
					return {
						status: 'failed',
						...(attempt?.errorMessage ? { message: attempt.errorMessage } : {}),
					};
				}
			}
			if (
				!attempt &&
				workflow.activeVersionId === applied.previousPublishedVersionId &&
				status.status === 'published' &&
				status.liveVersionId === applied.previousPublishedVersionId
			) {
				return { status: 'unpublished' };
			}
			return { status: 'unknown' };
		} catch {
			return { status: 'unknown' };
		}
	}

	async publish(
		actor: User,
		workflowId: string,
		applied: WorkflowSuggestionAppliedVersion,
	): Promise<WorkflowSuggestionPublication> {
		const user = await this.users.findByIdWithRole(actor.id);
		if (
			!user ||
			user.disabled ||
			!(await userHasScopes(user, ['workflow:read', 'workflow:update', 'workflow:publish'], false, {
				workflowId,
			}))
		) {
			throw new ForbiddenError('Workflow edit and publish access is required.');
		}
		const { workflow, projectId } = await this.suggestions.readWorkflowTarget(workflowId, {});
		if (
			!workflow ||
			projectId !== applied.projectId ||
			workflow.isArchived ||
			workflow.versionId !== applied.versionId ||
			(workflow.activeVersionId !== applied.previousPublishedVersionId &&
				workflow.activeVersionId !== applied.versionId) ||
			(await calculateWorkflowChecksum({
				...workflow,
				activeVersionId: applied.previousPublishedVersionId,
			})) !== applied.checksum
		) {
			throw new ConflictError('The workflow changed after this suggestion was saved.');
		}
		if (
			await this.outbox.hasPublicationChangedSince(
				workflowId,
				applied.versionId,
				applied.baselinePublicationId,
			)
		) {
			throw new ConflictError('The workflow publication changed after this suggestion was saved.');
		}

		const current = await this.reconcile(workflowId, applied);
		if (current.status !== 'unpublished' && current.status !== 'failed') return current;

		try {
			await this.workflows.activateWorkflow(user, workflowId, {
				versionId: applied.versionId,
				expectedChecksum: await calculateWorkflowChecksum(workflow),
				expectedVersions: {
					savedVersionId: applied.versionId,
					activeVersionId: workflow.activeVersionId,
					projectId: applied.projectId,
					baselinePublicationId: applied.baselinePublicationId,
				},
			});
		} catch (error) {
			const result = await this.reconcile(workflowId, applied);
			if (
				result.status === 'published' ||
				result.status === 'partial' ||
				result.status === 'in_progress'
			) {
				return result;
			}
			return {
				status: result.status === 'unpublished' ? 'failed' : result.status,
				message: ensureError(error).message,
			};
		}
		return await this.reconcile(workflowId, applied);
	}
}

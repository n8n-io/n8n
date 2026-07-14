import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { WorkflowReviewRequiredStatus } from '@n8n/api-types';
import {
	calculateWorkflowChecksum,
	WORKFLOW_CHECKSUM_FIELDS,
	type IWorkflowSettings,
} from 'n8n-workflow';

import { CollaborationService } from '@/collaboration/collaboration.service';
import { isWorkflowReviewsEnvFeatureFlagEnabled } from '@/constants/workflow-reviews';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WorkflowReviewPolicyService } from '@/services/workflow-review-policy.service';
import { removeDefaultValues } from '@/workflow-helpers';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

type WorkflowReviewRequiredSettings = Pick<IWorkflowSettings, 'reviewRequired'>;

type WorkflowReviewRequiredChange = {
	workflowId: string;
	settings: WorkflowReviewRequiredSettings;
	checksum?: string;
};

const WORKFLOW_SETTINGS_FIELDS: Array<keyof WorkflowEntity> = ['id', 'settings'];

@Service()
export class WorkflowReviewSettingsService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowReviewPolicyService: WorkflowReviewPolicyService,
		private readonly collaborationService: CollaborationService,
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
	) {}

	async assertWorkflowReviewsEnabled(): Promise<void> {
		if (!isWorkflowReviewsEnvFeatureFlagEnabled()) {
			throw new ForbiddenError('Workflow reviews are not available on this instance');
		}

		const policy = await this.workflowReviewPolicyService.get();
		if (!policy.enabled) {
			throw new ForbiddenError('Workflow reviews are not enabled on this instance');
		}
	}

	async getStatus(user: User, workflowId: string): Promise<WorkflowReviewRequiredStatus> {
		await this.assertWorkflowReviewsEnabled();

		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);
		if (!workflow) {
			throw new NotFoundError(`Workflow with ID "${workflowId}" not found`);
		}

		const canEdit = await this.canEditReviewRequired(user, workflowId);

		// Return the stored per-workflow preference as-is; callers gate enforcement on
		// assertWorkflowReviewsEnabled / instance policy, not by clearing this value.
		return {
			reviewRequired: workflow.settings?.reviewRequired ?? false,
			canEdit,
		};
	}

	async setReviewRequired(
		user: User,
		workflowId: string,
		reviewRequired: boolean,
	): Promise<WorkflowReviewRequiredStatus> {
		await this.assertWorkflowReviewsEnabled();

		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);
		if (!workflow) {
			throw new NotFoundError(`Workflow with ID "${workflowId}" not found`);
		}

		if (!(await this.canEditReviewRequired(user, workflowId))) {
			throw new ForbiddenError('You do not have permission to update workflow review settings');
		}

		const change = await this.updateReviewRequiredSetting(workflowId, reviewRequired);
		if (change) {
			await this.broadcastWorkflowReviewRequiredChanged(change);
		}

		return {
			reviewRequired,
			canEdit: true,
		};
	}

	private async updateReviewRequiredSetting(
		workflowId: string,
		reviewRequired: boolean,
	): Promise<WorkflowReviewRequiredChange | null> {
		let isOpen = false;
		try {
			const openWorkflowIds = await this.collaborationService.filterOpenWorkflowIds([workflowId]);
			isOpen = openWorkflowIds.includes(workflowId);
		} catch (error) {
			this.logger.warn('Failed to resolve open workflow before review-required update', {
				workflowId,
				cause: error instanceof Error ? error.message : String(error),
			});
		}

		return await this.workflowRepository.manager.transaction(async (trx) => {
			const row = await trx.findOne(WorkflowEntity, {
				where: { id: workflowId, isArchived: false },
				select: WORKFLOW_SETTINGS_FIELDS,
			});

			if (!row) {
				throw new NotFoundError(`Workflow with ID "${workflowId}" not found`);
			}

			if (row.settings?.reviewRequired === reviewRequired) {
				return null;
			}

			const nextSettings = removeDefaultValues(
				{ ...(row.settings ?? {}), reviewRequired },
				this.globalConfig.executions.timeout,
			);

			const now = new Date();
			await trx.update(
				WorkflowEntity,
				{ id: workflowId, isArchived: false },
				{ settings: nextSettings, updatedAt: now },
			);

			let checksum: string | undefined;
			if (isOpen) {
				const checksumRow = await trx.findOne(WorkflowEntity, {
					where: { id: workflowId, isArchived: false },
					select: ['id', ...WORKFLOW_CHECKSUM_FIELDS],
				});
				if (checksumRow) {
					checksum = await calculateWorkflowChecksum({ ...checksumRow, settings: nextSettings });
				}
			}

			return {
				workflowId,
				settings: { reviewRequired },
				...(checksum === undefined ? {} : { checksum }),
			};
		});
	}

	private async broadcastWorkflowReviewRequiredChanged(
		change: WorkflowReviewRequiredChange,
	): Promise<void> {
		if (change.checksum === undefined) return;

		try {
			await this.collaborationService.broadcastWorkflowSettingsUpdated(
				change.workflowId,
				change.settings,
				change.checksum,
			);
		} catch (error) {
			this.logger.warn('Failed to broadcast workflow review required settings update', {
				workflowId: change.workflowId,
				cause: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private async canEditReviewRequired(user: User, workflowId: string): Promise<boolean> {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:update',
		]);
		return workflow !== null;
	}
}

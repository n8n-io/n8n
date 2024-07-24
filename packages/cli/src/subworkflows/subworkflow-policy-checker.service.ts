import { Service } from 'typedi';
import { WorkflowOperationError } from 'n8n-workflow';
import config from '@/config';
import { Logger } from '@/Logger';
import { License } from '@/License';
import { OwnershipService } from '@/services/ownership.service';
import type { Workflow, INode } from 'n8n-workflow';

@Service()
export class SubworkflowPolicyChecker {
	constructor(
		private readonly logger: Logger,
		private readonly license: License,
		private readonly ownershipService: OwnershipService,
	) {}

	async check(subworkflow: Workflow, parentWorkflowId: string, node?: INode) {
		/**
		 * Important considerations: both the current workflow and the parent can have empty IDs.
		 * This happens when a user is executing an unsaved workflow manually running a workflow
		 * loaded from a file or code, for instance.
		 * This is an important topic to keep in mind for all security checks
		 */
		if (!subworkflow.id) {
			// It's a workflow from code and not loaded from DB
			// No checks are necessary since it doesn't have any sort of settings
			return;
		}

		let policy =
			subworkflow.settings?.callerPolicy ?? config.getEnv('workflows.callerPolicyDefaultOption');

		const isSharingEnabled = this.license.isSharingEnabled();

		if (!isSharingEnabled) {
			// Community version allows only same owner workflows
			policy = 'workflowsFromSameOwner';
		}

		const parentWorkflowOwner =
			await this.ownershipService.getWorkflowProjectCached(parentWorkflowId);

		const subworkflowOwner = await this.ownershipService.getWorkflowProjectCached(subworkflow.id);

		const description =
			subworkflowOwner.id === parentWorkflowOwner.id
				? 'Change the settings of the sub-workflow so it can be called by this one.'
				: `An admin for the ${subworkflowOwner.name} project can make this change. You may need to tell them the ID of the sub-workflow, which is ${subworkflow.id}`;

		const errorToThrow = new WorkflowOperationError(
			`Target workflow ID ${subworkflow.id} may not be called`,
			node,
			description,
		);

		if (policy === 'none') {
			this.logger.warn('[PermissionChecker] Subworkflow execution denied', {
				callerWorkflowId: parentWorkflowId,
				subworkflowId: subworkflow.id,
				reason: 'Subworkflow may not be called',
				policy,
				isSharingEnabled,
			});
			throw errorToThrow;
		}

		if (policy === 'workflowsFromAList') {
			if (parentWorkflowId === undefined) {
				this.logger.warn('[PermissionChecker] Subworkflow execution denied', {
					reason: 'Subworkflow may be called only by workflows from an allowlist',
					callerWorkflowId: parentWorkflowId,
					subworkflowId: subworkflow.id,
					policy,
					isSharingEnabled,
				});
				throw errorToThrow;
			}

			const allowedCallerIds = subworkflow.settings.callerIds
				?.split(',')
				.map((id) => id.trim())
				.filter((id) => id !== '');

			if (!allowedCallerIds?.includes(parentWorkflowId)) {
				this.logger.warn('[PermissionChecker] Subworkflow execution denied', {
					reason: 'Subworkflow may be called only by workflows from an allowlist',
					callerWorkflowId: parentWorkflowId,
					subworkflowId: subworkflow.id,
					allowlist: allowedCallerIds,
					policy,
					isSharingEnabled,
				});
				throw errorToThrow;
			}
		}

		if (policy === 'workflowsFromSameOwner' && subworkflowOwner?.id !== parentWorkflowOwner.id) {
			this.logger.warn('[PermissionChecker] Subworkflow execution denied', {
				reason: 'Subworkflow may be called only by workflows owned by the same project',
				callerWorkflowId: parentWorkflowId,
				subworkflowId: subworkflow.id,
				callerProjectId: parentWorkflowOwner.id,
				subworkflowProjectId: subworkflowOwner.id,
				policy,
				isSharingEnabled,
			});
			throw errorToThrow;
		}
	}
}

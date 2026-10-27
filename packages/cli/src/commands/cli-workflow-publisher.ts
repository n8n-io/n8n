import { GlobalConfig } from '@n8n/config';
import { type WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { InstanceSettings } from 'n8n-core';
import { UserError } from 'n8n-workflow';

import { OwnershipService } from '@/services/ownership.service';
import { WorkflowService } from '@/workflows/workflow.service';

const REPUBLISH_NOT_SUPPORTED =
	'Republishing a published workflow from the CLI is not supported when the publication service is off and multi-main is not enabled. Unpublish it first, or use the public API on the running instance.';

/** Publishes and unpublishes workflows from the CLI as the instance owner, through the same flow as the UI. */
@Service()
export class CliWorkflowPublisher {
	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly workflowRepository: WorkflowRepository,
		private readonly ownershipService: OwnershipService,
		private readonly workflowService: WorkflowService,
	) {}

	async publish(workflowId: string, versionId?: string): Promise<void> {
		const workflow = await this.findWorkflow(workflowId);
		if (workflow.activeVersionId !== null && !this.canReplaceRunningTriggers()) {
			throw new UserError(REPUBLISH_NOT_SUPPORTED);
		}

		await this.workflowService.activateWorkflow(
			await this.ownershipService.getInstanceOwner(),
			workflowId,
			{
				versionId,
				source: 'cli',
			},
		);
	}

	async unpublish(workflowId: string): Promise<void> {
		await this.findWorkflow(workflowId);

		await this.workflowService.deactivateWorkflow(
			await this.ownershipService.getInstanceOwner(),
			workflowId,
			{
				source: 'cli',
			},
		);
	}

	/** Unpublishes every published workflow, and reports the ones that failed in one error at the end. */
	async unpublishAll(): Promise<void> {
		const owner = await this.ownershipService.getInstanceOwner();
		const failures: string[] = [];

		for (const workflowId of await this.workflowRepository.getActiveIds()) {
			try {
				await this.workflowService.deactivateWorkflow(owner, workflowId, { source: 'cli' });
			} catch (error) {
				failures.push(`${workflowId}: ${ensureError(error).message}`);
			}
		}

		if (failures.length > 0) {
			throw new UserError(
				`Failed to unpublish ${failures.length} workflow(s):\n${failures.join('\n')}`,
			);
		}
	}

	/** Tells the operator when a running instance picks up a publish or unpublish made from the CLI. */
	whenChangeApplies(): string {
		return this.canReplaceRunningTriggers()
			? 'A running n8n applies this change shortly. If n8n is stopped, it applies the change when it starts.'
			: 'Restart n8n to apply this change to a running instance.';
	}

	private async findWorkflow(
		workflowId: string,
	): Promise<Pick<WorkflowEntity, 'id' | 'activeVersionId'>> {
		const workflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			select: ['id', 'activeVersionId'],
		});
		if (!workflow) throw new UserError(`Workflow "${workflowId}" not found.`);

		return workflow;
	}

	/** The CLI is never leader, so it can hand a trigger swap only to the outbox or, in multi-main, to the leader over pub/sub; queue mode with one main has neither. */
	private canReplaceRunningTriggers(): boolean {
		return (
			this.globalConfig.workflows.useWorkflowPublicationService || this.instanceSettings.isMultiMain
		);
	}
}

import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { AuthRolesService, type User, type WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ResponseError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { UserError } from 'n8n-workflow';

import { OwnershipService } from '@/services/ownership.service';
import { WorkflowService } from '@/workflows/workflow.service';

const REPUBLISH_NOT_SUPPORTED =
	'Republishing a published workflow from the CLI is not supported when the publication service is off. Unpublish it first, or use the public API on the running instance.';

/** A refusal or a failed publish check that the operator can act on, so the command prints only its message. */
export function isExpectedFailure(error: Error): boolean {
	return (
		error instanceof UserError || (error instanceof ResponseError && error.httpStatusCode < 500)
	);
}

/** Publishes and unpublishes workflows from the CLI as the instance owner, through the same flow as the UI. */
@Service()
export class CliWorkflowPublisher {
	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly workflowRepository: WorkflowRepository,
		private readonly ownershipService: OwnershipService,
		private readonly workflowService: WorkflowService,
		private readonly authRolesService: AuthRolesService,
		private readonly logger: Logger,
	) {}

	async publish(workflowId: string, versionId?: string): Promise<void> {
		const workflow = await this.findWorkflow(workflowId);
		if (workflow.activeVersionId !== null && !this.canReplaceRunningTriggers()) {
			throw new UserError(REPUBLISH_NOT_SUPPORTED);
		}

		await this.workflowService.activateWorkflow(await this.instanceOwner(), workflowId, {
			versionId,
			source: 'cli',
		});
	}

	async unpublish(workflowId: string): Promise<void> {
		await this.findWorkflow(workflowId);

		await this.workflowService.deactivateWorkflow(await this.instanceOwner(), workflowId, {
			source: 'cli',
		});
	}

	/** Unpublishes every published workflow, and reports the ones that failed in one error at the end. */
	async unpublishAll(): Promise<void> {
		const owner = await this.instanceOwner();
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

	/** Only `n8n start` syncs role scopes, so the owner has none on a database it never ran on. */
	private async instanceOwner(): Promise<User> {
		let owner = await this.ownershipService.getInstanceOwner();
		if (owner.role.scopes.length === 0) {
			this.logger.info(
				'The role scopes are missing because n8n never started on this database. The CLI syncs them now.',
			);
			await this.authRolesService.init();
			owner = await this.ownershipService.getInstanceOwner();
		}

		return owner;
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

	/** The CLI is never leader and exits without awaiting pub/sub, so only the outbox can hand a trigger swap to a running n8n. */
	private canReplaceRunningTriggers(): boolean {
		return this.globalConfig.workflows.useWorkflowPublicationService;
	}
}

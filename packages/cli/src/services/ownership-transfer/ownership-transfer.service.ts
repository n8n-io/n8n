import { OwnershipTransferHandlerRegistry } from '@n8n/backend-services';
import {
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	UserRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { CredentialsService } from '@/credentials/credentials.service';
import type { PolicyActor } from '@/policy/policy-enforcement-backend';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { FolderService } from '@/services/folder.service';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowService } from '@/workflows/workflow.service';

/**
 * The single place where a project's resources change owner (user deletion
 * with transfer, LDAP reset). Every project-owned resource type must be
 * handled here — either directly or through a registered
 * {@link ProjectOwnershipTransferHandler} — and listed in
 * `ownership-transfer.manifest.ts`, enforced by the manifest guard test and
 * the `project-owned-entity-transfer` lint rule.
 */
@Service()
export class OwnershipTransferService {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly workflowService: WorkflowService,
		private readonly credentialsService: CredentialsService,
		private readonly folderService: FolderService,
		private readonly ownershipService: OwnershipService,
		private readonly transferHandlers: OwnershipTransferHandlerRegistry<
			Parameters<WorkflowService['transferAll']>[2]
		>,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly policyEnforcementService: PolicyEnforcementService,
	) {}

	async enforceTransferPolicy(
		fromProjectId: string,
		toProjectId: string,
		actor: PolicyActor,
	): Promise<void> {
		const ownedWorkflows = await this.sharedWorkflowRepository.find({
			select: { workflowId: true },
			where: { projectId: fromProjectId, role: 'workflow:owner' },
		});
		const workflows = await this.workflowRepository.findByIds(
			ownedWorkflows.map(({ workflowId }) => workflowId),
			{ fields: ['name', 'nodes'] },
		);
		for (const workflow of workflows) {
			await this.policyEnforcementService.enforceWorkflowTransfer(
				{ workflow, targetProjectId: toProjectId },
				actor,
			);
		}

		const ownedCredentials = await this.sharedCredentialsRepository.find({
			where: { projectId: fromProjectId, role: 'credential:owner' },
			relations: { credentials: true },
		});
		for (const { credentials } of ownedCredentials) {
			await this.policyEnforcementService.enforceCredentialTransfer(
				{
					credential: { id: credentials.id, type: credentials.type },
					targetProjectId: toProjectId,
				},
				actor,
			);
		}
	}

	/**
	 * Transfer all resources owned by the given projects to the destination
	 * project. Workflows, credentials, folders and handler-registered module
	 * resources move in a single transaction; post-commit side effects
	 * (cache invalidation) follow after the transaction commits.
	 */
	async transferAllResources(fromProjectIds: string[], toProjectId: string): Promise<void> {
		const transferredWorkflowIds: string[] = [];

		await this.userRepository.manager.transaction(async (trx) => {
			for (const fromProjectId of fromProjectIds) {
				transferredWorkflowIds.push(
					...(await this.workflowService.transferAll(fromProjectId, toProjectId, trx)),
				);
				await this.credentialsService.transferAll(fromProjectId, toProjectId, trx);
				await this.folderService.transferAllFoldersToProject(fromProjectId, toProjectId, trx);

				for (const handler of this.transferHandlers.getAll()) {
					await handler.transferAll(fromProjectId, toProjectId, trx);
				}
			}
		});

		// The transfer re-homed these workflows, so their cached owner project is
		// stale; invalidate after commit so ownership lookups re-read the DB.
		await this.ownershipService.invalidateWorkflowProjectCacheByIds(transferredWorkflowIds);
	}

	/**
	 * Remove all handler-registered module resources owned by the given projects.
	 * Called before a project is deleted without a transferee, so module-owned
	 * data (e.g. data tables with their physical user tables) is cleaned up
	 * instead of being orphaned by the FK cascade.
	 */
	async deleteModuleOwnedResources(projectIds: string[]): Promise<void> {
		for (const projectId of projectIds) {
			for (const handler of this.transferHandlers.getAll()) {
				await handler.deleteAll(projectId);
			}
		}
	}
}

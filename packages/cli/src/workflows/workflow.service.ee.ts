import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In, type EntityManager } from '@n8n/typeorm';
import omit from 'lodash/omit';
import { Logger } from 'n8n-core';
import type { IWorkflowBase, WorkflowId } from 'n8n-workflow';
import { NodeOperationError, UserError, WorkflowActivationError } from 'n8n-workflow';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { CredentialsService } from '@/credentials/credentials.service';
import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import type { CredentialsEntity } from '@/databases/entities/credentials-entity';
import { Project } from '@/databases/entities/project';
import { SharedWorkflow } from '@/databases/entities/shared-workflow';
import type { User } from '@/databases/entities/user';
import { CredentialsRepository } from '@/databases/repositories/credentials.repository';
import { SharedCredentialsRepository } from '@/databases/repositories/shared-credentials.repository';
import { SharedWorkflowRepository } from '@/databases/repositories/shared-workflow.repository';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { TransferWorkflowError } from '@/errors/response-errors/transfer-workflow.error';
import { OwnershipService } from '@/services/ownership.service';
import { ProjectService } from '@/services/project.service.ee';

import type {
	WorkflowWithSharingsAndCredentials,
	WorkflowWithSharingsMetaDataAndCredentials,
} from './workflows.types';

@Service()
export class EnterpriseWorkflowService {
	constructor(
		private readonly logger: Logger,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly credentialsService: CredentialsService,
		private readonly ownershipService: OwnershipService,
		private readonly projectService: ProjectService,
		private readonly activeWorkflowManager: ActiveWorkflowManager,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly enterpriseCredentialsService: EnterpriseCredentialsService,
	) {}

	async shareWithProjects(
		workflowId: WorkflowId,
		shareWithIds: string[],
		entityManager: EntityManager,
	) {
		const em = entityManager ?? this.sharedWorkflowRepository.manager;

		let projects = await em.find(Project, {
			where: { id: In(shareWithIds), type: 'personal' },
			relations: { sharedWorkflows: true },
		});
		// filter out all projects that already own the workflow
		projects = projects.filter(
			(p) =>
				!p.sharedWorkflows.some(
					(swf) => swf.workflowId === workflowId && swf.role === 'workflow:owner',
				),
		);

		const newSharedWorkflows = projects
			// We filter by role === 'project:personalOwner' above and there should
			// always only be one owner.
			.map((project) =>
				this.sharedWorkflowRepository.create({
					workflowId,
					role: 'workflow:editor',
					projectId: project.id,
				}),
			);

		return await em.save(newSharedWorkflows);
	}

	addOwnerAndSharings(
		workflow: WorkflowWithSharingsAndCredentials,
	): WorkflowWithSharingsMetaDataAndCredentials {
		const workflowWithMetaData = this.ownershipService.addOwnedByAndSharedWith(workflow);

		return {
			...workflow,
			...workflowWithMetaData,
			usedCredentials: workflow.usedCredentials ?? [],
		};
	}

	async addCredentialsToWorkflow(
		workflow: WorkflowWithSharingsMetaDataAndCredentials,
		currentUser: User,
	): Promise<void> {
		workflow.usedCredentials = [];
		const userCredentials = await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(
			currentUser,
			{ workflowId: workflow.id },
		);
		const credentialIdsUsedByWorkflow = new Set<string>();
		workflow.nodes.forEach((node) => {
			if (!node.credentials) {
				return;
			}
			Object.keys(node.credentials).forEach((credentialType) => {
				const credential = node.credentials?.[credentialType];
				if (!credential?.id) {
					return;
				}
				credentialIdsUsedByWorkflow.add(credential.id);
			});
		});
		const workflowCredentials = await this.credentialsRepository.getManyByIds(
			Array.from(credentialIdsUsedByWorkflow),
			{ withSharings: true },
		);
		const userCredentialIds = userCredentials.map((credential) => credential.id);
		workflowCredentials.forEach((credential) => {
			const credentialId = credential.id;
			const filledCred = this.ownershipService.addOwnedByAndSharedWith(credential);
			workflow.usedCredentials?.push({
				id: credentialId,
				name: credential.name,
				type: credential.type,
				currentUserHasAccess: userCredentialIds.includes(credentialId),
				homeProject: filledCred.homeProject,
				sharedWithProjects: filledCred.sharedWithProjects,
			});
		});
	}

	validateCredentialPermissionsToUser(
		workflow: IWorkflowBase,
		allowedCredentials: CredentialsEntity[],
	) {
		workflow.nodes.forEach((node) => {
			if (!node.credentials) {
				return;
			}
			Object.keys(node.credentials).forEach((credentialType) => {
				const credentialId = node.credentials?.[credentialType].id;
				if (credentialId === undefined) return;
				const matchedCredential = allowedCredentials.find(({ id }) => id === credentialId);
				if (!matchedCredential) {
					throw new UserError('The workflow contains credentials that you do not have access to');
				}
			});
		});
	}

	async preventTampering<T extends IWorkflowBase>(workflow: T, workflowId: string, user: User) {
		const previousVersion = await this.workflowRepository.get({ id: workflowId });

		if (!previousVersion) {
			throw new NotFoundError('Workflow not found');
		}

		const allCredentials = await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(
			user,
			{ workflowId },
		);

		try {
			return this.validateWorkflowCredentialUsage(workflow, previousVersion, allCredentials);
		} catch (error) {
			if (error instanceof NodeOperationError) {
				throw new BadRequestError(error.message);
			}
			throw new BadRequestError(
				'Invalid workflow credentials - make sure you have access to all credentials and try again.',
			);
		}
	}

	validateWorkflowCredentialUsage<T extends IWorkflowBase>(
		newWorkflowVersion: T,
		previousWorkflowVersion: IWorkflowBase,
		credentialsUserHasAccessTo: Array<{ id: string }>,
	) {
		/**
		 * We only need to check nodes that use credentials the current user cannot access,
		 * since these can be 2 possibilities:
		 * - Same ID already exist: it's a read only node and therefore cannot be changed
		 * - It's a new node which indicates tampering and therefore must fail saving
		 */

		const allowedCredentialIds = credentialsUserHasAccessTo.map((cred) => cred.id);

		const nodesWithCredentialsUserDoesNotHaveAccessTo = this.getNodesWithInaccessibleCreds(
			newWorkflowVersion,
			allowedCredentialIds,
		);

		// If there are no nodes with credentials the user does not have access to we can skip the rest
		if (nodesWithCredentialsUserDoesNotHaveAccessTo.length === 0) {
			return newWorkflowVersion;
		}

		const previouslyExistingNodeIds = previousWorkflowVersion.nodes.map((node) => node.id);

		// If it's a new node we can't allow it to be saved
		// since it uses creds the node doesn't have access
		const isTamperingAttempt = (inaccessibleCredNodeId: string) =>
			!previouslyExistingNodeIds.includes(inaccessibleCredNodeId);

		nodesWithCredentialsUserDoesNotHaveAccessTo.forEach((node) => {
			if (isTamperingAttempt(node.id)) {
				this.logger.warn('Blocked workflow update due to tampering attempt', {
					nodeType: node.type,
					nodeName: node.name,
					nodeId: node.id,
					nodeCredentials: node.credentials,
				});
				// Node is new, so this is probably a tampering attempt. Throw an error
				throw new NodeOperationError(
					node,
					`You don't have access to the credentials in the '${node.name}' node. Ask the owner to share them with you.`,
				);
			}
			// Replace the node with the previous version of the node
			// Since it cannot be modified (read only node)
			const nodeIdx = newWorkflowVersion.nodes.findIndex(
				(newWorkflowNode) => newWorkflowNode.id === node.id,
			);

			this.logger.debug('Replacing node with previous version when saving updated workflow', {
				nodeType: node.type,
				nodeName: node.name,
				nodeId: node.id,
			});
			const previousNodeVersion = previousWorkflowVersion.nodes.find(
				(previousNode) => previousNode.id === node.id,
			);
			// Allow changing only name, position and disabled status for read-only nodes
			Object.assign(
				newWorkflowVersion.nodes[nodeIdx],
				omit(previousNodeVersion, ['name', 'position', 'disabled']),
			);
		});

		return newWorkflowVersion;
	}

	/** Get all nodes in a workflow where the node credential is not accessible to the user. */
	getNodesWithInaccessibleCreds(workflow: IWorkflowBase, userCredIds: string[]) {
		if (!workflow.nodes) {
			return [];
		}
		return workflow.nodes.filter((node) => {
			if (!node.credentials) return false;

			const allUsedCredentials = Object.values(node.credentials);

			const allUsedCredentialIds = allUsedCredentials.map((nodeCred) => nodeCred.id?.toString());
			return allUsedCredentialIds.some(
				(nodeCredId) => nodeCredId && !userCredIds.includes(nodeCredId),
			);
		});
	}

	async transferOne(
		user: User,
		workflowId: string,
		destinationProjectId: string,
		shareCredentials: string[] = [],
	) {
		// 1. get workflow
		const workflow = await this.sharedWorkflowRepository.findWorkflowForUser(workflowId, user, [
			'workflow:move',
		]);
		NotFoundError.isDefinedAndNotNull(
			workflow,
			`Could not find workflow with the id "${workflowId}". Make sure you have the permission to move it.`,
		);

		// 2. get owner-sharing
		const ownerSharing = workflow.shared.find((s) => s.role === 'workflow:owner')!;
		NotFoundError.isDefinedAndNotNull(
			ownerSharing,
			`Could not find owner for workflow "${workflow.id}"`,
		);

		// 3. get source project
		const sourceProject = ownerSharing.project;

		// 4. get destination project
		const destinationProject = await this.projectService.getProjectWithScope(
			user,
			destinationProjectId,
			['workflow:create'],
		);
		NotFoundError.isDefinedAndNotNull(
			destinationProject,
			`Could not find project with the id "${destinationProjectId}". Make sure you have the permission to create workflows in it.`,
		);

		// 5. checks
		if (sourceProject.id === destinationProject.id) {
			throw new TransferWorkflowError(
				"You can't transfer a workflow into the project that's already owning it.",
			);
		}

		// 6. deactivate workflow if necessary
		const wasActive = workflow.active;
		if (wasActive) {
			await this.activeWorkflowManager.remove(workflowId);
		}

		// 7. transfer the workflow
		await this.workflowRepository.manager.transaction(async (trx) => {
			// remove all sharings
			await trx.remove(workflow.shared);

			// create new owner-sharing
			await trx.save(
				trx.create(SharedWorkflow, {
					workflowId: workflow.id,
					projectId: destinationProject.id,
					role: 'workflow:owner',
				}),
			);
		});

		// 8. share credentials into the destination project
		await this.workflowRepository.manager.transaction(async (trx) => {
			const allCredentials = await this.sharedCredentialsRepository.findAllCredentialsForUser(
				user,
				['credential:share'],
				trx,
			);
			const credentialsAllowedToShare = allCredentials.filter((c) =>
				shareCredentials.includes(c.id),
			);

			for (const credential of credentialsAllowedToShare) {
				await this.enterpriseCredentialsService.shareWithProjects(
					user,
					credential.id,
					[destinationProject.id],
					trx,
				);
			}
		});

		// 9. try to activate it again if it was active
		if (wasActive) {
			try {
				await this.activeWorkflowManager.add(workflowId, 'update');

				return;
			} catch (error) {
				await this.workflowRepository.updateActiveState(workflowId, false);

				// Since the transfer worked we return a 200 but also return the
				// activation error as data.
				if (error instanceof WorkflowActivationError) {
					return {
						error: error.toJSON
							? error.toJSON()
							: {
									name: error.name,
									message: error.message,
								},
					};
				}

				throw error;
			}
		}

		return;
	}
}

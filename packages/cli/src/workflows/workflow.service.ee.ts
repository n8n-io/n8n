import { Service } from 'typedi';
import omit from 'lodash/omit';
import { ApplicationError, NodeOperationError } from 'n8n-workflow';

import type { CredentialsEntity } from '@db/entities/CredentialsEntity';
import type { User } from '@db/entities/User';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { CredentialsRepository } from '@db/repositories/credentials.repository';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { Logger } from '@/Logger';
import type {
	CredentialUsedByWorkflow,
	WorkflowWithSharingsAndCredentials,
} from './workflows.types';

@Service()
export class EnterpriseWorkflowService {
	constructor(
		private readonly logger: Logger,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly credentialsService: CredentialsService,
	) {}

	async isOwned(
		user: User,
		workflowId: string,
	): Promise<{ ownsWorkflow: boolean; workflow?: WorkflowEntity }> {
		const sharing = await this.sharedWorkflowRepository.getSharing(
			user,
			workflowId,
			{ allowGlobalScope: false },
			['workflow'],
		);

		if (!sharing || sharing.role !== 'workflow:owner') return { ownsWorkflow: false };

		const { workflow } = sharing;

		return { ownsWorkflow: true, workflow };
	}

	addOwnerAndSharings(workflow: WorkflowWithSharingsAndCredentials): void {
		workflow.ownedBy = null;
		workflow.sharedWith = [];
		if (!workflow.usedCredentials) {
			workflow.usedCredentials = [];
		}

		workflow.shared?.forEach(({ user, role }) => {
			const { id, email, firstName, lastName } = user;

			if (role === 'workflow:owner') {
				workflow.ownedBy = { id, email, firstName, lastName };
				return;
			}

			workflow.sharedWith?.push({ id, email, firstName, lastName });
		});

		delete workflow.shared;
	}

	async addCredentialsToWorkflow(
		workflow: WorkflowWithSharingsAndCredentials,
		currentUser: User,
	): Promise<void> {
		workflow.usedCredentials = [];
		const userCredentials = await this.credentialsService.getMany(currentUser, { onlyOwn: true });
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
			const workflowCredential: CredentialUsedByWorkflow = {
				id: credentialId,
				name: credential.name,
				type: credential.type,
				currentUserHasAccess: userCredentialIds.includes(credentialId),
				sharedWith: [],
				ownedBy: null,
			};
			credential.shared?.forEach(({ user, role }) => {
				const { id, email, firstName, lastName } = user;
				if (role === 'credential:owner') {
					workflowCredential.ownedBy = { id, email, firstName, lastName };
				} else {
					workflowCredential.sharedWith?.push({ id, email, firstName, lastName });
				}
			});
			workflow.usedCredentials?.push(workflowCredential);
		});
	}

	validateCredentialPermissionsToUser(
		workflow: WorkflowEntity,
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
					throw new ApplicationError(
						'The workflow contains credentials that you do not have access to',
					);
				}
			});
		});
	}

	async preventTampering(workflow: WorkflowEntity, workflowId: string, user: User) {
		const previousVersion = await this.workflowRepository.get({ id: workflowId });

		if (!previousVersion) {
			throw new NotFoundError('Workflow not found');
		}

		const allCredentials = await this.credentialsService.getMany(user);

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

	validateWorkflowCredentialUsage(
		newWorkflowVersion: WorkflowEntity,
		previousWorkflowVersion: WorkflowEntity,
		credentialsUserHasAccessTo: CredentialsEntity[],
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
				this.logger.verbose('Blocked workflow update due to tampering attempt', {
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
	getNodesWithInaccessibleCreds(workflow: WorkflowEntity, userCredIds: string[]) {
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
}

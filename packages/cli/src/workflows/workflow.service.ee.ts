import type { EntityManager } from 'typeorm';
import * as WorkflowHelpers from '@/WorkflowHelpers';
import type { SharedWorkflow } from '@db/entities/SharedWorkflow';
import type { User } from '@db/entities/User';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { UserService } from '@/services/user.service';
import { WorkflowService } from './workflow.service';
import type {
	CredentialUsedByWorkflow,
	WorkflowWithSharingsAndCredentials,
} from './workflows.types';
import { CredentialsService } from '@/credentials/credentials.service';
import { ApplicationError, NodeOperationError } from 'n8n-workflow';
import { RoleService } from '@/services/role.service';
import { Service } from 'typedi';
import type { CredentialsEntity } from '@db/entities/CredentialsEntity';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';

@Service()
export class EnterpriseWorkflowService {
	constructor(
		private readonly workflowService: WorkflowService,
		private readonly userService: UserService,
		private readonly roleService: RoleService,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	async isOwned(
		user: User,
		workflowId: string,
	): Promise<{ ownsWorkflow: boolean; workflow?: WorkflowEntity }> {
		const sharing = await this.workflowService.getSharing(
			user,
			workflowId,
			{ allowGlobalScope: false },
			['workflow', 'role'],
		);

		if (!sharing || sharing.role.name !== 'owner') return { ownsWorkflow: false };

		const { workflow } = sharing;

		return { ownsWorkflow: true, workflow };
	}

	async share(
		transaction: EntityManager,
		workflow: WorkflowEntity,
		shareWithIds: string[],
	): Promise<SharedWorkflow[]> {
		const users = await this.userService.getByIds(transaction, shareWithIds);
		const role = await this.roleService.findWorkflowEditorRole();

		const newSharedWorkflows = users.reduce<SharedWorkflow[]>((acc, user) => {
			if (user.isPending) {
				return acc;
			}
			const entity: Partial<SharedWorkflow> = {
				workflowId: workflow.id,
				userId: user.id,
				roleId: role?.id,
			};
			acc.push(this.sharedWorkflowRepository.create(entity));
			return acc;
		}, []);

		return transaction.save(newSharedWorkflows);
	}

	addOwnerAndSharings(workflow: WorkflowWithSharingsAndCredentials): void {
		workflow.ownedBy = null;
		workflow.sharedWith = [];
		if (!workflow.usedCredentials) {
			workflow.usedCredentials = [];
		}

		workflow.shared?.forEach(({ user, role }) => {
			const { id, email, firstName, lastName } = user;

			if (role.name === 'owner') {
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
		const userCredentials = await CredentialsService.getMany(currentUser, { onlyOwn: true });
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
		const workflowCredentials = await CredentialsService.getManyByIds(
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
				if (role.name === 'owner') {
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

		const allCredentials = await CredentialsService.getMany(user);

		try {
			return WorkflowHelpers.validateWorkflowCredentialUsage(
				workflow,
				previousVersion,
				allCredentials,
			);
		} catch (error) {
			if (error instanceof NodeOperationError) {
				throw new BadRequestError(error.message);
			}
			throw new BadRequestError(
				'Invalid workflow credentials - make sure you have access to all credentials and try again.',
			);
		}
	}
}

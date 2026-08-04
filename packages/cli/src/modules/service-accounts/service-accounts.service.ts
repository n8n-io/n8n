import type {
	CreateServiceAccountRequestDto,
	RoleChangeRequestDto,
	UpdateServiceAccountRequestDto,
	UsersListFilterDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import {
	AuthIdentity,
	Project,
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	User as UserEntity,
	UserRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { GLOBAL_CHAT_USER_ROLE_SLUG, GLOBAL_OWNER_ROLE_SLUG } from '@n8n/permissions';
import { randomBytes } from 'node:crypto';

import { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { OwnershipTransferService } from '@/services/ownership-transfer/ownership-transfer.service';
import { UserService } from '@/services/user.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { SERVICE_ACCOUNT_EMAIL_DOMAIN } from '@/constants/service-accounts';

/**
 * Roles a service account may never hold.
 *
 * - `global:owner`: owner-only branches across the codebase assume a human.
 * - `global:chatUser`: `createUserWithProject` gives it `project:viewer` rather
 *   than `project:personalOwner`, `getApiKeyScopesForRole` returns `[]` (so API
 *   key creation breaks), and `changeUserRole` deletes its keys.
 */
const FORBIDDEN_SERVICE_ACCOUNT_ROLES: string[] = [
	GLOBAL_OWNER_ROLE_SLUG,
	GLOBAL_CHAT_USER_ROLE_SLUG,
];

@Service()
export class ServiceAccountsService {
	constructor(
		private readonly logger: Logger,
		private readonly userRepository: UserRepository,
		private readonly userService: UserService,
		private readonly projectRepository: ProjectRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly workflowService: WorkflowService,
		private readonly credentialsService: CredentialsService,
		private readonly ownershipTransferService: OwnershipTransferService,
		private readonly eventService: EventService,
	) {}

	/**
	 * Synthesize an address on the reserved `.invalid` domain.
	 *
	 * Not user-supplied on purpose: a chosen address could squat a human's and be
	 * picked up by `findManyByEmail`, invite dedupe or IdP email linking. Non-null
	 * because several call sites type `email` as a required string
	 * (`getApiKeyOwners`, `userBaseSchema.email`) or fall back to
	 * `'Unnamed Project'` (`createPersonalProjectName`). The random suffix keeps
	 * the unique index on `email` satisfied for same-named accounts.
	 */
	private synthesizeEmail(name: string): string {
		const slug =
			name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '')
				.slice(0, 24) || 'service-account';

		return `${slug}-${randomBytes(4).toString('hex')}@${SERVICE_ACCOUNT_EMAIL_DOMAIN}`;
	}

	private assertRoleAssignable(role: string): void {
		if (FORBIDDEN_SERVICE_ACCOUNT_ROLES.includes(role)) {
			throw new BadRequestError(`Service accounts cannot have the "${role}" role`);
		}
	}

	async list(listQueryOptions: UsersListFilterDto): Promise<{ count: number; items: User[] }> {
		const [items, count] = await this.userRepository
			.buildUserQuery({
				...listQueryOptions,
				filter: { ...listQueryOptions.filter, type: 'serviceAccount' },
			})
			.getManyAndCount();

		return { count, items };
	}

	async findOneOrFail(id: string): Promise<User> {
		const serviceAccount = await this.userRepository.findOne({
			where: { id, type: 'serviceAccount' },
			relations: ['role'],
		});

		if (!serviceAccount) throw new NotFoundError('Service account not found');

		return serviceAccount;
	}

	async create(dto: CreateServiceAccountRequestDto, actor: User): Promise<User> {
		this.assertRoleAssignable(dto.role);

		// No `isWithinUsersLimit()` / `hasInstanceOwner()` check and no email:
		// a service account is not a seat and has no inbox.
		const { user: serviceAccount } = await this.userRepository.manager.transaction(
			async (trx) =>
				await this.userRepository.createUserWithProject(
					{
						email: this.synthesizeEmail(dto.name),
						firstName: dto.name,
						password: null,
						mfaEnabled: false,
						type: 'serviceAccount',
						role: { slug: dto.role },
					},
					trx,
				),
		);

		this.eventService.emit('service-account-created', {
			userId: actor.id,
			serviceAccountId: serviceAccount.id,
			serviceAccountRole: dto.role,
		});

		return serviceAccount;
	}

	async update(id: string, dto: UpdateServiceAccountRequestDto): Promise<User> {
		const serviceAccount = await this.findOneOrFail(id);

		if (dto.name !== undefined) serviceAccount.firstName = dto.name;
		if (dto.disabled !== undefined) serviceAccount.disabled = dto.disabled;

		return await this.userRepository.save(serviceAccount, { transaction: false });
	}

	async changeRole(id: string, dto: RoleChangeRequestDto, actor: User): Promise<void> {
		this.assertRoleAssignable(dto.newRoleName);

		const serviceAccount = await this.findOneOrFail(id);

		// Delegates so we inherit `removeOwnerOnlyScopesFromApiKeys` and the
		// ownership-cache invalidation.
		await this.userService.changeUserRole(serviceAccount, dto);

		this.eventService.emit('service-account-role-changed', {
			userId: actor.id,
			serviceAccountId: serviceAccount.id,
			serviceAccountNewRole: dto.newRoleName,
		});
	}

	/**
	 * Delete a service account and everything its personal project owns.
	 *
	 * TODO: this duplicates `UsersController.deleteUser`'s teardown. Extract a
	 * shared `UserDeletionService` before this ships beyond a POC.
	 *
	 * API keys need no handling here — `user_api_keys.userId` cascades.
	 */
	async delete(id: string, actor: User, transferId?: string): Promise<void> {
		const serviceAccount = await this.findOneOrFail(id);

		const personalProjectToDelete = await this.projectRepository.getPersonalProjectForUserOrFail(
			serviceAccount.id,
		);

		if (transferId === personalProjectToDelete.id) {
			throw new BadRequestError(
				'Request to delete a service account failed because the transferee is the service account itself',
			);
		}

		let transfereeProject: Project | null = null;

		if (transferId) {
			transfereeProject = await this.projectRepository.findOneBy({ id: transferId });

			if (!transfereeProject) {
				throw new NotFoundError(
					'Request to delete a service account failed because the transferee project was not found',
				);
			}

			await this.ownershipTransferService.transferAllResources(
				[personalProjectToDelete.id],
				transfereeProject.id,
			);
		}

		const [ownedSharedWorkflows, ownedSharedCredentials] = await Promise.all([
			this.sharedWorkflowRepository.find({
				select: { workflowId: true },
				where: { projectId: personalProjectToDelete.id, role: 'workflow:owner' },
			}),
			this.sharedCredentialsRepository.find({
				relations: { credentials: true },
				where: { projectId: personalProjectToDelete.id, role: 'credential:owner' },
			}),
		]);

		for (const { workflowId } of ownedSharedWorkflows) {
			await this.workflowService.delete(serviceAccount, workflowId, true);
		}

		for (const { credentials } of ownedSharedCredentials) {
			await this.credentialsService.delete(serviceAccount, credentials.id);
		}

		// Clean up module-owned resources (e.g. data tables with their physical
		// user tables) before the project goes, so the FK cascade can't orphan them.
		if (!transfereeProject) {
			await this.ownershipTransferService.deleteModuleOwnedResources([personalProjectToDelete.id]);
		}

		await this.userRepository.manager.transaction(async (trx) => {
			await trx.delete(AuthIdentity, { userId: serviceAccount.id });
			await trx.delete(Project, { id: personalProjectToDelete.id });
			await trx.delete(UserEntity, { id: serviceAccount.id });
		});

		this.logger.info('Deleted service account', {
			serviceAccountId: serviceAccount.id,
			actorId: actor.id,
		});

		this.eventService.emit('service-account-deleted', {
			userId: actor.id,
			serviceAccountId: serviceAccount.id,
			migrationStrategy: transferId ? 'transfer_data' : 'delete_data',
		});
	}
}

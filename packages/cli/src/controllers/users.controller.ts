import { plainToInstance } from 'class-transformer';

import { AuthService } from '@/auth/auth.service';
import { User } from '@db/entities/User';
import { SharedCredentials } from '@db/entities/SharedCredentials';
import { SharedWorkflow } from '@db/entities/SharedWorkflow';
import { GlobalScope, Delete, Get, RestController, Patch, Licensed } from '@/decorators';
import {
	ListQuery,
	UserRequest,
	UserRoleChangePayload,
	UserSettingsUpdatePayload,
} from '@/requests';
import type { PublicUser, ITelemetryUserDeletionData } from '@/Interfaces';
import { AuthIdentity } from '@db/entities/AuthIdentity';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { UserRepository } from '@db/repositories/user.repository';
import { UserService } from '@/services/user.service';
import { listQueryMiddleware } from '@/middlewares';
import { Logger } from '@/Logger';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ExternalHooks } from '@/ExternalHooks';
import { InternalHooks } from '@/InternalHooks';
import { validateEntity } from '@/GenericHelpers';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { Project } from '@/databases/entities/Project';
import { WorkflowService } from '@/workflows/workflow.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { In } from '@n8n/typeorm';

@RestController('/users')
export class UsersController {
	constructor(
		private readonly logger: Logger,
		private readonly externalHooks: ExternalHooks,
		private readonly internalHooks: InternalHooks,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly userRepository: UserRepository,
		private readonly authService: AuthService,
		private readonly userService: UserService,
		private readonly projectRepository: ProjectRepository,
		private readonly workflowService: WorkflowService,
		private readonly credentialsService: CredentialsService,
	) {}

	static ERROR_MESSAGES = {
		CHANGE_ROLE: {
			NO_USER: 'Target user not found',
			NO_ADMIN_ON_OWNER: 'Admin cannot change role on global owner',
			NO_OWNER_ON_OWNER: 'Owner cannot change role on global owner',
		},
	} as const;

	private removeSupplementaryFields(
		publicUsers: Array<Partial<PublicUser>>,
		listQueryOptions: ListQuery.Options,
	) {
		const { take, select, filter } = listQueryOptions;

		// remove fields added to satisfy query

		if (take && select && !select?.id) {
			for (const user of publicUsers) delete user.id;
		}

		if (filter?.isOwner) {
			for (const user of publicUsers) delete user.role;
		}

		// remove computed fields (unselectable)

		if (select) {
			for (const user of publicUsers) {
				delete user.isOwner;
				delete user.isPending;
				delete user.signInType;
				delete user.hasRecoveryCodesLeft;
			}
		}

		return publicUsers;
	}

	@Get('/', { middlewares: listQueryMiddleware })
	@GlobalScope('user:list')
	async listUsers(req: ListQuery.Request) {
		const { listQueryOptions } = req;

		const findManyOptions = await this.userRepository.toFindManyOptions(listQueryOptions);

		const users = await this.userRepository.find(findManyOptions);

		const publicUsers: Array<Partial<PublicUser>> = await Promise.all(
			users.map(
				async (u) =>
					await this.userService.toPublic(u, { withInviteUrl: true, inviterId: req.user.id }),
			),
		);

		return listQueryOptions
			? this.removeSupplementaryFields(publicUsers, listQueryOptions)
			: publicUsers;
	}

	@Get('/:id/password-reset-link')
	@GlobalScope('user:resetPassword')
	async getUserPasswordResetLink(req: UserRequest.PasswordResetLink) {
		const user = await this.userRepository.findOneOrFail({
			where: { id: req.params.id },
		});
		if (!user) {
			throw new NotFoundError('User not found');
		}

		const link = this.authService.generatePasswordResetUrl(user);
		return { link };
	}

	@Patch('/:id/settings')
	@GlobalScope('user:update')
	async updateUserSettings(req: UserRequest.UserSettingsUpdate) {
		const payload = plainToInstance(UserSettingsUpdatePayload, req.body);

		const id = req.params.id;

		await this.userService.updateSettings(id, payload);

		const user = await this.userRepository.findOneOrFail({
			select: ['settings'],
			where: { id },
		});

		return user.settings;
	}

	/**
	 * Delete a user. Optionally, designate a transferee for their workflows and credentials.
	 */
	@Delete('/:id')
	@GlobalScope('user:delete')
	async deleteUser(req: UserRequest.Delete) {
		const { id: idToDelete } = req.params;

		if (req.user.id === idToDelete) {
			this.logger.debug(
				'Request to delete a user failed because it attempted to delete the requesting user',
				{ userId: req.user.id },
			);
			throw new BadRequestError('Cannot delete your own user');
		}

		const { transferId } = req.query;

		const userToDelete = await this.userRepository.findOneBy({ id: idToDelete });

		if (!userToDelete) {
			throw new NotFoundError(
				'Request to delete a user failed because the user to delete was not found in DB',
			);
		}

		const personalProjectToDelete = await this.projectRepository.getPersonalProjectForUserOrFail(
			userToDelete.id,
		);

		if (transferId === personalProjectToDelete.id) {
			throw new BadRequestError(
				'Request to delete a user failed because the user to delete and the transferee are the same user',
			);
		}

		const telemetryData: ITelemetryUserDeletionData = {
			user_id: req.user.id,
			target_user_old_status: userToDelete.isPending ? 'invited' : 'active',
			target_user_id: idToDelete,
			migration_strategy: transferId ? 'transfer_data' : 'delete_data',
		};

		if (transferId) {
			const transfereePersonalProject = await this.projectRepository.findOneBy({ id: transferId });

			if (!transfereePersonalProject) {
				throw new NotFoundError(
					'Request to delete a user failed because the transferee project was not found in DB',
				);
			}

			const transferee = await this.userRepository.findOneByOrFail({
				projectRelations: {
					projectId: transfereePersonalProject.id,
					role: 'project:personalOwner',
				},
			});

			telemetryData.migration_user_id = transferee.id;

			await this.userService.getManager().transaction(async (trx) => {
				// Get all shared credentials and workflows for both users
				const [allSharedWorkflows, allSharedCredentials] = await Promise.all([
					trx.findBy(SharedWorkflow, {
						projectId: In([personalProjectToDelete.id, transfereePersonalProject.id]),
					}),
					trx.findBy(SharedCredentials, {
						projectId: In([personalProjectToDelete.id, transfereePersonalProject.id]),
					}),
				]);

				const sharedWorkflowsOfUserToDelete = allSharedWorkflows.filter(
					(sw) => sw.projectId === personalProjectToDelete.id,
				);
				const sharedCredentialsOfUserToDelete = allSharedCredentials.filter(
					(sc) => sc.projectId === personalProjectToDelete.id,
				);

				// For all credentials and workflows that the user to delete owns
				// transfer the ownership to the transferee.
				// This will override whatever relationship the transferee already has
				// to the resources at the moment.

				const ownedWorkflowIds = sharedWorkflowsOfUserToDelete
					.filter((sw) => sw.role === 'workflow:owner')
					.map((sw) => sw.workflowId);
				const ownedCredentialIds = sharedCredentialsOfUserToDelete
					.filter((sc) => sc.role === 'credential:owner')
					.map((sc) => sc.credentialsId);

				await this.sharedWorkflowRepository.makeOwner(
					ownedWorkflowIds,
					transfereePersonalProject.id,
					trx,
				);
				await this.sharedCredentialsRepository.makeOwner(
					ownedCredentialIds,
					transfereePersonalProject.id,
					trx,
				);

				// Delete the relationship to the user to delete.
				// If we don't do this then the following code that deletes the user
				// will also delete these workflows and credentials.
				await this.sharedWorkflowRepository.deleteByIds(
					ownedWorkflowIds,
					personalProjectToDelete.id,
					trx,
				);
				await this.sharedCredentialsRepository.deleteByIds(
					ownedCredentialIds,
					personalProjectToDelete.id,
					trx,
				);

				// Transfer relationships that are not `*:owner`.
				// This will NOT override whatever relationship the transferee already
				// has to the resource at the moment.

				const sharedWorkflowIdsOfTransferee = allSharedWorkflows
					.filter((sw) => sw.projectId === transfereePersonalProject.id)
					.map((sw) => sw.workflowId);
				const sharedCredentialIdsOfTransferee = allSharedCredentials
					.filter((sc) => sc.projectId === transfereePersonalProject.id)
					.map((sc) => sc.credentialsId);

				// all resources that are shared with the user to delete, but not with the transferee
				const sharedWorkflowsToTransfer = sharedWorkflowsOfUserToDelete.filter(
					(sw) =>
						sw.role !== 'workflow:owner' && !sharedWorkflowIdsOfTransferee.includes(sw.workflowId),
				);
				const sharedCredentialsToTransfer = sharedCredentialsOfUserToDelete.filter(
					(sc) =>
						sc.role !== 'credential:owner' &&
						!sharedCredentialIdsOfTransferee.includes(sc.credentialsId),
				);

				await Promise.all([
					trx.insert(
						SharedWorkflow,
						sharedWorkflowsToTransfer.map((sw) => ({
							workflowId: sw.workflowId,
							projectId: transfereePersonalProject.id,
							role: sw.role,
						})),
					),

					trx.insert(
						SharedCredentials,
						sharedCredentialsToTransfer.map((sc) => ({
							credentialsId: sc.credentialsId,
							projectId: transfereePersonalProject.id,
							role: sc.role,
						})),
					),
				]);
			});
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

		const ownedCredentials = ownedSharedCredentials.map(({ credentials }) => credentials);

		for (const { workflowId } of ownedSharedWorkflows) {
			await this.workflowService.delete(userToDelete, workflowId);
		}

		for (const credential of ownedCredentials) {
			await this.credentialsService.delete(credential);
		}

		await this.userService.getManager().transaction(async (trx) => {
			await trx.delete(AuthIdentity, { userId: userToDelete.id });
			await trx.delete(Project, { id: personalProjectToDelete.id });
			await trx.delete(User, { id: userToDelete.id });
		});

		void this.internalHooks.onUserDeletion({
			user: req.user,
			telemetryData,
			publicApi: false,
		});

		await this.externalHooks.run('user.deleted', [await this.userService.toPublic(userToDelete)]);

		return { success: true };
	}

	@Patch('/:id/role')
	@GlobalScope('user:changeRole')
	@Licensed('feat:advancedPermissions')
	async changeGlobalRole(req: UserRequest.ChangeRole) {
		const { NO_ADMIN_ON_OWNER, NO_USER, NO_OWNER_ON_OWNER } =
			UsersController.ERROR_MESSAGES.CHANGE_ROLE;

		const payload = plainToInstance(UserRoleChangePayload, req.body);
		await validateEntity(payload);

		const targetUser = await this.userRepository.findOne({
			where: { id: req.params.id },
		});
		if (targetUser === null) {
			throw new NotFoundError(NO_USER);
		}

		if (req.user.role === 'global:admin' && targetUser.role === 'global:owner') {
			throw new ForbiddenError(NO_ADMIN_ON_OWNER);
		}

		if (req.user.role === 'global:owner' && targetUser.role === 'global:owner') {
			throw new ForbiddenError(NO_OWNER_ON_OWNER);
		}

		await this.userService.update(targetUser.id, { role: payload.newRoleName });

		void this.internalHooks.onUserRoleChange({
			user: req.user,
			target_user_id: targetUser.id,
			target_user_new_role: ['global', payload.newRoleName].join(' '),
			public_api: false,
		});

		return { success: true };
	}
}

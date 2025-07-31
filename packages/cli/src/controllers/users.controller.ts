import {
	RoleChangeRequestDto,
	SettingsUpdateRequestDto,
	UsersListFilterDto,
	usersListSchema,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { PublicUser } from '@n8n/db';
import {
	Project,
	User,
	AuthIdentity,
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	UserRepository,
	AuthenticatedRequest,
} from '@n8n/db';
import {
	GlobalScope,
	Delete,
	Get,
	RestController,
	Patch,
	Licensed,
	Body,
	Param,
	Query,
} from '@n8n/decorators';
import { Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { UserRequest } from '@/requests';
import { FolderService } from '@/services/folder.service';
import { ProjectService } from '@/services/project.service.ee';
import { UserService } from '@/services/user.service';
import { WorkflowService } from '@/workflows/workflow.service';
import { hasGlobalScope } from '@n8n/permissions';

@RestController('/users')
export class UsersController {
	constructor(
		private readonly logger: Logger,
		private readonly externalHooks: ExternalHooks,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly userRepository: UserRepository,
		private readonly authService: AuthService,
		private readonly userService: UserService,
		private readonly projectRepository: ProjectRepository,
		private readonly workflowService: WorkflowService,
		private readonly credentialsService: CredentialsService,
		private readonly projectService: ProjectService,
		private readonly eventService: EventService,
		private readonly folderService: FolderService,
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
		listQueryOptions: UsersListFilterDto,
	) {
		const { select } = listQueryOptions;

		// remove fields added to satisfy query

		if (select !== undefined && !select.includes('id')) {
			for (const user of publicUsers) delete user.id;
		}

		// remove computed fields (unselectable)

		if (select) {
			for (const user of publicUsers) {
				delete user.isOwner;
				delete user.isPending;
				delete user.signInType;
			}
		}

		return publicUsers;
	}

	@Get('/')
	@GlobalScope('user:list')
	async listUsers(
		req: AuthenticatedRequest,
		_res: Response,
		@Query listQueryOptions: UsersListFilterDto,
	) {
		const userQuery = this.userRepository.buildUserQuery(listQueryOptions);

		const response = await userQuery.getManyAndCount();

		const [users, count] = response;

		const withInviteUrl = hasGlobalScope(req.user, 'user:create');

		const publicUsers = await Promise.all(
			users.map(async (u) => {
				const user = await this.userService.toPublic(u, {
					withInviteUrl,
					inviterId: req.user.id,
				});
				return {
					...user,
					projectRelations: u.projectRelations?.map((pr) => ({
						id: pr.projectId,
						role: pr.role, // normalize role for frontend
						name: pr.project.name,
					})),
				};
			}),
		);

		return usersListSchema.parse({
			count,
			items: this.removeSupplementaryFields(publicUsers, listQueryOptions),
		});
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

		if (req.user.role === 'global:admin' && user.role === 'global:owner') {
			throw new ForbiddenError('Admin cannot reset password of global owner');
		}

		const link = this.authService.generatePasswordResetUrl(user);
		return { link };
	}

	@Patch('/:id/settings')
	@GlobalScope('user:update')
	async updateUserSettings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body payload: SettingsUpdateRequestDto,
		@Param('id') id: string,
	) {
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

		if (userToDelete.role === 'global:owner') {
			throw new ForbiddenError('Instance owner cannot be deleted.');
		}

		const personalProjectToDelete = await this.projectRepository.getPersonalProjectForUserOrFail(
			userToDelete.id,
		);

		if (transferId === personalProjectToDelete.id) {
			throw new BadRequestError(
				'Request to delete a user failed because the user to delete and the transferee are the same user',
			);
		}

		let transfereeId;

		if (transferId) {
			const transfereeProject = await this.projectRepository.findOneBy({ id: transferId });

			if (!transfereeProject) {
				throw new NotFoundError(
					'Request to delete a user failed because the transferee project was not found in DB',
				);
			}

			const transferee = await this.userRepository.findOneByOrFail({
				projectRelations: {
					projectId: transfereeProject.id,
				},
			});

			transfereeId = transferee.id;

			await this.userService.getManager().transaction(async (trx) => {
				await this.workflowService.transferAll(
					personalProjectToDelete.id,
					transfereeProject.id,
					trx,
				);
				await this.credentialsService.transferAll(
					personalProjectToDelete.id,
					transfereeProject.id,
					trx,
				);

				await this.folderService.transferAllFoldersToProject(
					personalProjectToDelete.id,
					transfereeProject.id,
					trx,
				);
			});

			await this.projectService.clearCredentialCanUseExternalSecretsCache(transfereeProject.id);
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
			await this.workflowService.delete(userToDelete, workflowId, true);
		}

		for (const credential of ownedCredentials) {
			await this.credentialsService.delete(userToDelete, credential.id);
		}

		await this.userService.getManager().transaction(async (trx) => {
			await trx.delete(AuthIdentity, { userId: userToDelete.id });
			await trx.delete(Project, { id: personalProjectToDelete.id });
			await trx.delete(User, { id: userToDelete.id });
		});

		this.eventService.emit('user-deleted', {
			user: req.user,
			publicApi: false,
			targetUserOldStatus: userToDelete.isPending ? 'invited' : 'active',
			targetUserId: idToDelete,
			migrationStrategy: transferId ? 'transfer_data' : 'delete_data',
			migrationUserId: transfereeId,
		});

		await this.externalHooks.run('user.deleted', [await this.userService.toPublic(userToDelete)]);

		return { success: true };
	}

	@Patch('/:id/role')
	@GlobalScope('user:changeRole')
	@Licensed('feat:advancedPermissions')
	async changeGlobalRole(
		req: AuthenticatedRequest,
		_: Response,
		@Body payload: RoleChangeRequestDto,
		@Param('id') id: string,
	) {
		const { NO_ADMIN_ON_OWNER, NO_USER, NO_OWNER_ON_OWNER } =
			UsersController.ERROR_MESSAGES.CHANGE_ROLE;

		const targetUser = await this.userRepository.findOneBy({ id });
		if (targetUser === null) {
			throw new NotFoundError(NO_USER);
		}

		if (req.user.role === 'global:admin' && targetUser.role === 'global:owner') {
			throw new ForbiddenError(NO_ADMIN_ON_OWNER);
		}

		if (req.user.role === 'global:owner' && targetUser.role === 'global:owner') {
			throw new ForbiddenError(NO_OWNER_ON_OWNER);
		}

		await this.userService.changeUserRole(req.user, targetUser, payload);

		this.eventService.emit('user-changed-role', {
			userId: req.user.id,
			targetUserId: targetUser.id,
			targetUserNewRole: payload.newRoleName,
			publicApi: false,
		});

		const projects = await this.projectService.getUserOwnedOrAdminProjects(targetUser.id);
		await Promise.all(
			projects.map(
				async (p) => await this.projectService.clearCredentialCanUseExternalSecretsCache(p.id),
			),
		);

		return { success: true };
	}
}

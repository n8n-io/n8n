import {
	RoleChangeRequestDto,
	SettingsUpdateRequestDto,
	userDetailSchema,
	userBaseSchema,
	UsersListFilterDto,
	usersListSchema,
} from '@n8n/api-types';
import type { PublicUser } from '@n8n/db';
import {
	User,
	UserRepository,
	PersonRepository,
	AuthenticatedRequest,
	GLOBAL_ADMIN_ROLE,
	GLOBAL_OWNER_ROLE,
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
	Post,
} from '@n8n/decorators';
import { hasGlobalScope } from '@n8n/permissions';
import { Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import { ForbiddenError, NotFoundError } from '@n8n/errors';
import { UserRequest } from '@/requests';
import { JwtService, RoleService, UrlService } from '@n8n/backend-services';
import { UserService } from '@/services/user.service';

/**
 * The details a caller without `user:create` sees for its own user. The
 * account status stays hidden, as for every other user.
 */
const ownUserDetailSchema = userDetailSchema.omit({ disabled: true });

@RestController('/users')
export class UsersController {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly personRepository: PersonRepository,
		private readonly authService: AuthService,
		private readonly userService: UserService,
		private readonly jwtService: JwtService,
		private readonly urlService: UrlService,
		private readonly roleService: RoleService,
	) {}

	private removeSupplementaryFields(
		publicUsers: Array<Partial<PublicUser>>,
		listQueryOptions: UsersListFilterDto,
		currentUser: User,
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

		const usersSeesAllDetails = hasGlobalScope(currentUser, 'user:create');
		return publicUsers.map((user) => {
			if (usersSeesAllDetails) return userDetailSchema.parse(user);
			return user.id === currentUser.id
				? ownUserDetailSchema.parse(user)
				: userBaseSchema.parse(user);
		});
	}

	@Get('/')
	@GlobalScope('user:list')
	async listUsers(
		req: AuthenticatedRequest,
		_res: Response,
		@Query listQueryOptions: UsersListFilterDto,
	) {
		await this.userService.assertGetUsersAccess(req.user, listQueryOptions.filter?.projectId);

		// The account status of a user is visible only to callers that can
		// create users, so only they can filter or count by it.
		const { filter, includeStatusCounts } = listQueryOptions;
		const usesAccountStatus = filter?.status !== undefined || includeStatusCounts === true;
		if (usesAccountStatus && !hasGlobalScope(req.user, 'user:create')) {
			throw new ForbiddenError('You cannot filter or count users by status');
		}

		const scope = listQueryOptions.filter?.scope;
		const roleSlugs = scope ? await this.roleService.rolesWithScope('global', scope) : undefined;
		const userQuery = this.userRepository.buildUserQuery(listQueryOptions, roleSlugs);
		const [[users, count], statusCounts] = await Promise.all([
			userQuery.getManyAndCount(),
			includeStatusCounts
				? this.userRepository.countUsersListStatuses(filter, roleSlugs)
				: undefined,
		]);

		const publicUsers = await Promise.all(
			users.map(async (u) => {
				const user = await this.userService.toPublic(u);
				if (listQueryOptions.select && !listQueryOptions.select?.includes('role')) {
					delete user.role;
				}
				return {
					...user,
					projectRelations: u.projectRelations?.map((pr) => ({
						id: pr.projectId,
						role: pr.role.slug, // normalize role for frontend
						name: pr.project.name,
						icon: pr.project.icon,
					})),
				};
			}),
		);

		return usersListSchema.parse({
			count,
			items: this.removeSupplementaryFields(publicUsers, listQueryOptions, req.user),
			statusCounts,
		});
	}

	@Get('/:id/password-reset-link')
	@GlobalScope('user:resetPassword')
	async getUserPasswordResetLink(req: UserRequest.PasswordResetLink) {
		const person = await this.personRepository.findByIdWithRole(req.params.id);
		if (!person) {
			throw new NotFoundError('User not found');
		}

		if (
			req.user.role.slug === GLOBAL_ADMIN_ROLE.slug &&
			person.role.slug === GLOBAL_OWNER_ROLE.slug
		) {
			throw new ForbiddenError('Admin cannot reset password of global owner');
		}

		const link = this.authService.generatePasswordResetUrl(person);
		return { link };
	}

	@Post('/:id/invite-link')
	@GlobalScope('user:generateInviteLink')
	async generateInviteLink(req: AuthenticatedRequest<{ id: string }, {}, {}, {}>, _res: Response) {
		const inviterId = req.user.id;
		const inviteeId = req.params.id;

		const targetPerson = await this.personRepository.findById(inviteeId);

		if (!targetPerson) {
			throw new NotFoundError('User to generate invite link for not found');
		}

		const token = this.jwtService.sign(
			'invite',
			{
				inviterId,
				inviteeId,
			},
			{
				expiresIn: '90d',
			},
		);

		const baseUrl = this.urlService.getInstanceBaseUrl();
		const inviteLink = `${baseUrl}/signup?token=${token}`;

		return { link: inviteLink };
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
			// TypeORM needs `id` here because `ServiceAccount.details` is an eager join.
			select: ['id', 'settings'],
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
		return await this.userService.deleteUser(req.user, req.params.id, req.query.transferId);
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
		return await this.userService.changeGlobalRole(req.user, id, payload);
	}
}

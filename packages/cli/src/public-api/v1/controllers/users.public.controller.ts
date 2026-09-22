import {
	CreateUsersPublicDto,
	DeleteUserQueryPublicDto,
	GetUserQueryDto,
	InvitedUsersPublicDto,
	ListUsersQueryDto,
	RoleChangeRequestDto,
	UserListPublicDto,
	UserPublicDto,
	userIdentifierParamSchema,
} from '@n8n/api-types';
import type { AuthenticatedRequest, User } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Delete,
	Get,
	Licensed,
	Param,
	Patch,
	Post,
	PublicApiController,
	Query,
	RequiresUserQuota,
} from '@n8n/decorators';
import type { Response } from 'express';
import pick from 'lodash/pick';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import {
	encodeNextCursor,
	resolveOffsetPagination,
} from '@/public-api/v1/shared/services/pagination.service';
import { ProjectService } from '@/services/project.service.ee';
import { UserService } from '@/services/user.service';

const tags = ['User'];

const userProperties = ['id', 'email', 'firstName', 'lastName', 'isPending', 'mfaEnabled'] as const;

function toPublicApiUser(user: User, options?: { includeRole: boolean }): UserPublicDto {
	const publicApiUser = {
		...pick(user, ...userProperties),
		createdAt: user.createdAt.toISOString(),
		updatedAt: user.updatedAt.toISOString(),
	};

	return options?.includeRole ? { ...publicApiUser, role: user.role?.slug } : publicApiUser;
}

@PublicApiController('/users')
export class UsersPublicController {
	constructor(
		private readonly userService: UserService,
		private readonly projectService: ProjectService,
		private readonly eventService: EventService,
	) {}

	@Get('/')
	@ApiKeyScope('user:list')
	@RequiresUserQuota()
	@ApiSummary('Retrieve all users')
	@ApiDescription('Retrieve all users from your instance. Only available for the instance owner.')
	@ApiTags(tags)
	@ApiResponse(200, UserListPublicDto)
	@ApiErrorResponse(404, { description: 'The given `projectId` does not exist.' })
	async getUsers(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListUsersQueryDto,
	): Promise<UserListPublicDto> {
		const { includeRole, projectId } = query;
		const { offset, limit } = resolveOffsetPagination(query);

		await this.userService.assertGetUsersAccess(req.user, projectId);

		const userIdsInProject = projectId
			? await this.projectService.findUserIdsByProjectId(projectId)
			: undefined;

		const { users, count } = await this.userService.getUsersAndCount({
			ids: userIdsInProject,
			limit,
			offset,
		});

		this.eventService.emit('user-retrieved-all-users', {
			userId: req.user.id,
			publicApi: true,
		});

		return {
			data: users.map((user) => toPublicApiUser(user, { includeRole })),
			nextCursor: encodeNextCursor({ offset, limit, numberOfTotalRecords: count }),
		};
	}

	@Get('/:userId')
	@ApiKeyScope('user:read')
	@RequiresUserQuota()
	@ApiSummary('Get user by ID/Email')
	@ApiDescription('Retrieve a user from your instance. Only available for the instance owner.')
	@ApiTags(tags)
	@ApiResponse(200, UserPublicDto)
	@ApiErrorResponse(404, { description: 'No user with that ID or email.' })
	async getUser(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('userId', userIdentifierParamSchema) userId: string,
		@Query query: GetUserQueryDto,
	): Promise<UserPublicDto> {
		const { includeRole } = query;

		const user = await this.userService.getUser(userId);
		if (!user) {
			throw new NotFoundError(`Could not find user with id: ${userId}`);
		}

		this.eventService.emit('user-retrieved-user', {
			userId: req.user.id,
			publicApi: true,
		});

		return toPublicApiUser(user, { includeRole });
	}

	@Post('/')
	@ApiKeyScope('user:create')
	@ApiSummary('Create multiple users')
	@ApiDescription('Create one or more users.')
	@ApiTags(tags)
	@ApiResponse(201, InvitedUsersPublicDto)
	async createUser(
		req: AuthenticatedRequest,
		_res: Response,
		@Body body: CreateUsersPublicDto,
	): Promise<InvitedUsersPublicDto> {
		return await this.userService.inviteUser(req.user, body);
	}

	@Delete('/:userId')
	@ApiKeyScope('user:delete')
	@ApiSummary('Delete user')
	@ApiDescription('Delete a user from your instance.')
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(404)
	async deleteUser(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('userId', userIdentifierParamSchema) userId: string,
		@Query query: DeleteUserQueryPublicDto,
	): Promise<void> {
		await this.userService.deleteUser(req.user, userId, query.transferId);
	}

	@Patch('/:userId/role')
	@Licensed('feat:advancedPermissions')
	@ApiKeyScope('user:changeRole')
	@ApiSummary("Change a user's global role")
	@ApiDescription("Change a user's global role")
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(404)
	async changeRole(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('userId', userIdentifierParamSchema) userId: string,
		@Body body: RoleChangeRequestDto,
	): Promise<void> {
		await this.userService.changeGlobalRole(req.user, userId, body);
	}
}

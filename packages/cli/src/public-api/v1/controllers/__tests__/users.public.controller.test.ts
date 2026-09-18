import type {
	CreateUsersPublicDto,
	DeleteUserQueryPublicDto,
	GetUserQueryDto,
	ListUsersQueryDto,
	RoleChangeRequestDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest, User } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { UserService } from '@/services/user.service';

import { UsersPublicController } from '../users.public.controller';

describe('UsersPublicController', () => {
	let controller: UsersPublicController;
	const userService = mock<UserService>();
	const projectService = mock<ProjectService>();
	const eventService = mock<EventService>();

	const caller = mock<AuthenticatedRequest>({ user: mock<User>({ id: 'caller-id' }) });

	const buildUser = (overrides: Partial<User> = {}): User =>
		mock<User>({
			id: 'user-id',
			email: 'member@example.com',
			firstName: 'Nathan',
			lastName: 'Doe',
			isPending: false,
			mfaEnabled: false,
			createdAt: new Date('2024-01-01T00:00:00.000Z'),
			updatedAt: new Date('2024-01-02T00:00:00.000Z'),
			role: { slug: 'global:member' },
			password: 'secret-hash',
			mfaSecret: 'secret-mfa-key',
			disabled: false,
			...overrides,
		});

	beforeEach(() => {
		vi.clearAllMocks();
		controller = new UsersPublicController(userService, projectService, eventService);
	});

	describe('getUsers', () => {
		it('lists users, maps them, and emits telemetry', async () => {
			const users = [buildUser()];
			userService.getUsersAndCount.mockResolvedValue({ users, count: 1 });

			const result = await controller.getUsers(
				caller,
				mock<Response>(),
				mock<ListUsersQueryDto>({
					limit: 100,
					cursor: undefined,
					includeRole: false,
					projectId: undefined,
				}),
			);

			expect(userService.assertGetUsersAccess).toHaveBeenCalledWith(caller.user, undefined);
			expect(projectService.findUserIdsByProjectId).not.toHaveBeenCalled();
			expect(result.data).toHaveLength(1);
			expect(result.data[0]).toMatchObject({
				id: 'user-id',
				email: 'member@example.com',
				mfaEnabled: false,
			});
			expect(result.data[0]).not.toHaveProperty('role');
			expect(result.data[0]).not.toHaveProperty('password');
			expect(result.data[0]).not.toHaveProperty('mfaSecret');
			expect(result.data[0]).not.toHaveProperty('disabled');
			expect(eventService.emit).toHaveBeenCalledWith('user-retrieved-all-users', {
				userId: caller.user.id,
				publicApi: true,
			});
		});

		it('includes the role when includeRole is requested', async () => {
			const users = [buildUser()];
			userService.getUsersAndCount.mockResolvedValue({ users, count: 1 });

			const result = await controller.getUsers(
				caller,
				mock<Response>(),
				mock<ListUsersQueryDto>({
					limit: 100,
					cursor: undefined,
					includeRole: true,
					projectId: undefined,
				}),
			);

			expect(result.data[0]).toHaveProperty('role', 'global:member');
		});

		it('resolves member IDs for a project before listing', async () => {
			userService.getUsersAndCount.mockResolvedValue({ users: [], count: 0 });
			projectService.findUserIdsByProjectId.mockResolvedValue(['a', 'b']);

			await controller.getUsers(
				caller,
				mock<Response>(),
				mock<ListUsersQueryDto>({
					limit: 100,
					cursor: undefined,
					includeRole: false,
					projectId: 'project-1',
				}),
			);

			expect(userService.assertGetUsersAccess).toHaveBeenCalledWith(caller.user, 'project-1');
			expect(projectService.findUserIdsByProjectId).toHaveBeenCalledWith('project-1');
			expect(userService.getUsersAndCount).toHaveBeenCalledWith(
				expect.objectContaining({ ids: ['a', 'b'] }),
			);
		});
	});

	describe('getUser', () => {
		it('returns the mapped user and emits telemetry', async () => {
			userService.getUser.mockResolvedValue(buildUser());

			const result = await controller.getUser(
				caller,
				mock<Response>(),
				'user-id',
				mock<GetUserQueryDto>({ includeRole: false }),
			);

			expect(userService.getUser).toHaveBeenCalledWith('user-id');
			expect(result).toMatchObject({
				id: 'user-id',
				email: 'member@example.com',
				mfaEnabled: false,
			});
			expect(result).not.toHaveProperty('role');
			expect(result).not.toHaveProperty('password');
			expect(result).not.toHaveProperty('mfaSecret');
			expect(result).not.toHaveProperty('disabled');
			expect(eventService.emit).toHaveBeenCalledWith('user-retrieved-user', {
				userId: caller.user.id,
				publicApi: true,
			});
		});

		it('throws NotFoundError when the user does not exist', async () => {
			userService.getUser.mockResolvedValue(null);

			await expect(
				controller.getUser(
					caller,
					mock<Response>(),
					'missing-id',
					mock<GetUserQueryDto>({ includeRole: false }),
				),
			).rejects.toThrow('Could not find user with id: missing-id');
		});
	});

	describe('createUser', () => {
		it('invites the requested users through the service', async () => {
			const invitations = [{ email: 'new.user@example.com', role: 'global:member' }] as const;
			const invited = [
				{
					user: {
						id: 'new-user-id',
						email: 'new.user@example.com',
						emailSent: true,
						role: 'global:member',
					},
					error: '',
				},
			];
			userService.inviteUser.mockResolvedValue(invited);

			const result = await controller.createUser(
				caller,
				mock<Response>(),
				invitations as unknown as CreateUsersPublicDto,
			);

			expect(userService.inviteUser).toHaveBeenCalledWith(caller.user, invitations);
			expect(result).toStrictEqual(invited);
		});
	});

	describe('deleteUser', () => {
		it('deletes the user through the service', async () => {
			await controller.deleteUser(
				caller,
				mock<Response>(),
				'user-id',
				mock<DeleteUserQueryPublicDto>({ transferId: 'project-1' }),
			);

			expect(userService.deleteUser).toHaveBeenCalledWith(caller.user, 'user-id', 'project-1');
		});
	});

	describe('changeRole', () => {
		it('changes the role through the service', async () => {
			const body = mock<RoleChangeRequestDto>({ newRoleName: 'global:admin' });

			await controller.changeRole(caller, mock<Response>(), 'user-id', body);

			expect(userService.changeGlobalRole).toHaveBeenCalledWith(caller.user, 'user-id', body);
		});
	});
});

import type { GetUserQueryDto, ListUsersQueryDto } from '@n8n/api-types';
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
		it('never leaks sensitive user fields', async () => {
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

			expect(result.data[0]).toMatchObject({
				id: 'user-id',
				email: 'member@example.com',
				mfaEnabled: false,
			});
			expect(result.data[0]).not.toHaveProperty('role');
			expect(result.data[0]).not.toHaveProperty('password');
			expect(result.data[0]).not.toHaveProperty('mfaSecret');
			expect(result.data[0]).not.toHaveProperty('disabled');
		});

		it('emits user-retrieved-all-users telemetry', async () => {
			userService.getUsersAndCount.mockResolvedValue({ users: [buildUser()], count: 1 });

			await controller.getUsers(
				caller,
				mock<Response>(),
				mock<ListUsersQueryDto>({
					limit: 100,
					cursor: undefined,
					includeRole: false,
					projectId: undefined,
				}),
			);

			expect(eventService.emit).toHaveBeenCalledWith('user-retrieved-all-users', {
				userId: caller.user.id,
				publicApi: true,
			});
		});
	});

	describe('getUser', () => {
		it('never leaks sensitive user fields', async () => {
			userService.getUser.mockResolvedValue(buildUser());

			const result = await controller.getUser(
				caller,
				mock<Response>(),
				'user-id',
				mock<GetUserQueryDto>({ includeRole: false }),
			);

			expect(result).toMatchObject({
				id: 'user-id',
				email: 'member@example.com',
				mfaEnabled: false,
			});
			expect(result).not.toHaveProperty('role');
			expect(result).not.toHaveProperty('password');
			expect(result).not.toHaveProperty('mfaSecret');
			expect(result).not.toHaveProperty('disabled');
		});

		it('emits user-retrieved-user telemetry', async () => {
			userService.getUser.mockResolvedValue(buildUser());

			await controller.getUser(
				caller,
				mock<Response>(),
				'user-id',
				mock<GetUserQueryDto>({ includeRole: false }),
			);

			expect(eventService.emit).toHaveBeenCalledWith('user-retrieved-user', {
				userId: caller.user.id,
				publicApi: true,
			});
		});
	});
});

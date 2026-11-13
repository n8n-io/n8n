import type {
	CreateUsersPublicDto,
	DeleteUserQueryPublicDto,
	GetUserQueryDto,
	ListUsersQueryDto,
} from '@n8n/api-types';
import type { EventService } from '@n8n/backend-services';
import { GLOBAL_MEMBER_ROLE, Person, ServiceAccount, ServiceAccountDetails } from '@n8n/db';
import type { OperationContext, User } from '@n8n/db';
import type { SecurityContext } from '@n8n/permissions';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { ProjectService } from '@/services/project.service.ee';
import type { PublicApiRequest } from '@/public-api/public-api-client';
import type { UserService } from '@/services/user.service';

import { UsersPublicController } from '../users.public.controller';

describe('UsersPublicController', () => {
	let controller: UsersPublicController;
	const userService = mock<UserService>();
	const projectService = mock<ProjectService>();
	const eventService = mock<EventService>();

	const caller = mock<PublicApiRequest>({
		user: mock<User>({ id: 'caller-id' }),
		publicApiClient: 'editor_ui',
	});

	const buildPerson = (overrides: Partial<Person> = {}): Person =>
		Object.assign(new Person(), {
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
			const users = [buildPerson()];
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
			userService.getUsersAndCount.mockResolvedValue({ users: [buildPerson()], count: 1 });

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
				publicApi: 'editor_ui',
			});
		});
	});

	describe('getUser', () => {
		it('returns a service account with no email, no name and no MFA', async () => {
			userService.getUser.mockResolvedValue(
				Object.assign(new ServiceAccount(), {
					id: 'sa-1',
					role: GLOBAL_MEMBER_ROLE,
					disabled: false,
					createdAt: new Date('2024-01-01T00:00:00.000Z'),
					updatedAt: new Date('2024-01-02T00:00:00.000Z'),
					details: Object.assign(new ServiceAccountDetails(), { name: 'Deploy bot' }),
				}),
			);

			const result = await controller.getUser(
				caller,
				mock<Response>(),
				'sa-1',
				mock<GetUserQueryDto>({ includeRole: false }),
			);

			expect(result).toEqual({
				id: 'sa-1',
				email: null,
				firstName: null,
				lastName: null,
				isPending: false,
				mfaEnabled: false,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-02T00:00:00.000Z',
			});
		});

		it('never leaks sensitive user fields', async () => {
			userService.getUser.mockResolvedValue(buildPerson());

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
			userService.getUser.mockResolvedValue(buildPerson());

			await controller.getUser(
				caller,
				mock<Response>(),
				'user-id',
				mock<GetUserQueryDto>({ includeRole: false }),
			);

			expect(eventService.emit).toHaveBeenCalledWith('user-retrieved-user', {
				userId: caller.user.id,
				publicApi: 'editor_ui',
			});
		});
	});

	describe('operation context on user changes', () => {
		type Route = {
			route: string;
			call: (req: PublicApiRequest) => Promise<unknown>;
			ctxPassed: () => OperationContext | undefined;
		};

		const routes: Route[] = [
			{
				route: 'createUser',
				call: async (req) =>
					await controller.createUser(req, mock<Response>(), [
						{ email: 'new@example.com', role: 'global:member' },
					] as CreateUsersPublicDto),
				ctxPassed: () => userService.inviteUser.mock.calls[0][3],
			},
			{
				route: 'deleteUser',
				call: async (req) =>
					await controller.deleteUser(req, mock<Response>(), 'user-id', {
						transferId: 'project-id',
					} as DeleteUserQueryPublicDto),
				ctxPassed: () => userService.deleteUser.mock.calls[0][4],
			},
		];

		const callRoute = async ({ call }: Route, ctx?: OperationContext) =>
			await call(
				Object.assign(mock<PublicApiRequest>({ user: mock<User>({ id: 'caller-id' }) }), {
					ctx,
					publicApiClient: 'other' as const,
				}),
			);

		it.each(routes)('$route passes the operation context of the request', async (route) => {
			const ctx: OperationContext = {
				security: mock<SecurityContext>({ subIdentityId: 'login-1' }),
			};

			await callRoute(route, ctx);

			expect(route.ctxPassed()).toBe(ctx);
		});

		it.each(routes)(
			'$route passes no operation context when the request has none',
			async (route) => {
				await callRoute(route, undefined);

				expect(route.ctxPassed()).toBeUndefined();
			},
		);

		it('deleteUser still passes the transfer project', async () => {
			await controller.deleteUser(caller, mock<Response>(), 'user-id', {
				transferId: 'project-id',
			} as DeleteUserQueryPublicDto);

			expect(userService.deleteUser).toHaveBeenCalledWith(
				caller.user,
				'user-id',
				'project-id',
				'editor_ui',
				caller.ctx,
			);
		});
	});
});

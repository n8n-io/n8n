import type { AuthenticatedRequest, User, UserRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { UsersController } from '../users.controller';

import type { EventService } from '@/events/event.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { UserService } from '@/services/user.service';
import type { GlobalConfig } from '@n8n/config';
import type { PublicUser } from '@n8n/db';

describe('UsersController', () => {
	const eventService = mock<EventService>();
	const userRepository = mock<UserRepository>();
	const projectService = mock<ProjectService>();
	const userService = mock<UserService>();
	const globalConfig = mock<GlobalConfig>();

	const controller = new UsersController(
		mock(),
		mock(),
		mock(),
		mock(),
		userRepository,
		mock(),
		userService,
		mock(),
		mock(),
		mock(),
		projectService,
		eventService,
		mock(),
		globalConfig,
	);

	beforeEach(() => {
		jest.restoreAllMocks();
		jest.clearAllMocks();
	});

	describe('changeGlobalRole', () => {
		it('should emit event user-changed-role', async () => {
			const request = mock<AuthenticatedRequest>({
				user: { id: '123' },
			});
			userRepository.findOne.mockResolvedValue(mock<User>({ id: '456' }));
			projectService.getUserOwnedOrAdminProjects.mockResolvedValue([]);

			await controller.changeGlobalRole(
				request,
				mock(),
				mock({ newRoleName: 'global:member' }),
				'456',
			);

			expect(eventService.emit).toHaveBeenCalledWith('user-changed-role', {
				userId: '123',
				targetUserId: '456',
				targetUserNewRole: 'global:member',
				publicApi: false,
			});
		});
	});

	describe('listUsers - inviteUrl visibility', () => {
		const createMockUser = (id: string, isPending = false, canCreateUsers = false): User => {
			return mock<User>({
				id,
				email: `user${id}@example.com`,
				isPending,
				role: {
					slug: 'global:member',
					scopes: canCreateUsers ? [{ slug: 'user:create' }] : [],
				} as any,
				projectRelations: [],
			});
		};

		const createPublicUser = (id: string, withInviteUrl = false, isPending = false): PublicUser => {
			const publicUser: PublicUser = {
				id,
				email: `user${id}@example.com`,
				firstName: 'Test',
				lastName: 'User',
				isPending,
				role: 'global:member',
				signInType: 'email',
				isOwner: false,
				mfaAuthenticated: false,
				createdAt: new Date(),
				disabled: false,
			};

			if (withInviteUrl && isPending) {
				publicUser.inviteAcceptUrl = `http://localhost:5678/signup?inviterId=admin&inviteeId=${id}`;
			}

			return publicUser;
		};

		beforeEach(() => {
			// Setup default mock behavior for userRepository.buildUserQuery
			const mockQueryBuilder = {
				getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
			};
			userRepository.buildUserQuery.mockReturnValue(mockQueryBuilder as any);
		});

		describe('when disableInviteLinkExposure = false', () => {
			beforeEach(() => {
				globalConfig.userManagement = {
					disableInviteLinkExposure: false,
				} as any;
			});

			it('should include inviteAcceptUrl for users with scope user:create', async () => {
				// Arrange
				const adminUser = createMockUser('admin-id', false, true);
				const pendingUser = createMockUser('pending-id', true);

				const request = mock<AuthenticatedRequest>({
					user: adminUser,
				});

				const mockQueryBuilder = {
					getManyAndCount: jest.fn().mockResolvedValue([[pendingUser], 1]),
				};
				userRepository.buildUserQuery.mockReturnValue(mockQueryBuilder as any);

				userService.toPublic.mockImplementation(async (user: User, options?: any) => {
					return createPublicUser(user.id, options?.withInviteUrl === true, user.isPending);
				});

				// Act
				const result = await controller.listUsers(request, mock(), {
					skip: 0,
					take: 10,
				});

				// Assert
				expect(userService.toPublic).toHaveBeenCalledWith(
					pendingUser,
					expect.objectContaining({
						withInviteUrl: true,
						inviterId: 'admin-id',
					}),
				);

				// Verify inviteAcceptUrl is present in the result
				expect(result.items[0]).toHaveProperty('inviteAcceptUrl');
			});

			it('should NOT include inviteAcceptUrl for users without the user:create scope', async () => {
				// Arrange
				const memberUser = createMockUser('member-id');
				const pendingUser = createMockUser('pending-id', true);

				const request = mock<AuthenticatedRequest>({
					user: memberUser,
				});

				const mockQueryBuilder = {
					getManyAndCount: jest.fn().mockResolvedValue([[pendingUser], 1]),
				};
				userRepository.buildUserQuery.mockReturnValue(mockQueryBuilder as any);

				userService.toPublic.mockImplementation(async (user: User, options?: any) => {
					return createPublicUser(user.id, options?.withInviteUrl === true, user.isPending);
				});

				// Act
				const result = await controller.listUsers(request, mock(), {
					skip: 0,
					take: 10,
				});

				// Assert
				expect(userService.toPublic).toHaveBeenCalledWith(
					pendingUser,
					expect.objectContaining({
						withInviteUrl: false,
						inviterId: 'member-id',
					}),
				);

				// Verify inviteAcceptUrl is NOT present in the result
				expect(result.items[0]).not.toHaveProperty('inviteAcceptUrl');
			});
		});

		describe('when disableInviteLinkExposure = true', () => {
			beforeEach(() => {
				globalConfig.userManagement = {
					disableInviteLinkExposure: true,
				} as any;
			});

			it('should NOT include inviteAcceptUrl for user with user:create scope', async () => {
				// Arrange
				const adminUser = createMockUser('admin-id', false, true);
				const pendingUser = createMockUser('pending-id', true);

				const request = mock<AuthenticatedRequest>({
					user: adminUser,
				});

				const mockQueryBuilder = {
					getManyAndCount: jest.fn().mockResolvedValue([[pendingUser], 1]),
				};
				userRepository.buildUserQuery.mockReturnValue(mockQueryBuilder as any);

				userService.toPublic.mockImplementation(async (user: User, options?: any) => {
					return createPublicUser(user.id, options?.withInviteUrl === true, user.isPending);
				});

				// Act
				const result = await controller.listUsers(request, mock(), {
					skip: 0,
					take: 10,
				});

				// Assert
				expect(userService.toPublic).toHaveBeenCalledWith(
					pendingUser,
					expect.objectContaining({
						withInviteUrl: false, // Config overrides scope permission
						inviterId: 'admin-id',
					}),
				);

				// Verify inviteAcceptUrl is NOT present in the result
				expect(result.items[0]).not.toHaveProperty('inviteAcceptUrl');
			});

			it('should NOT include inviteAcceptUrl for users without the user:create scope', async () => {
				// Arrange
				const memberUser = createMockUser('member-id');
				const pendingUser = createMockUser('pending-id', true);

				const request = mock<AuthenticatedRequest>({
					user: memberUser,
				});

				const mockQueryBuilder = {
					getManyAndCount: jest.fn().mockResolvedValue([[pendingUser], 1]),
				};
				userRepository.buildUserQuery.mockReturnValue(mockQueryBuilder as any);

				userService.toPublic.mockImplementation(async (user: User, options?: any) => {
					return createPublicUser(user.id, options?.withInviteUrl === true, user.isPending);
				});

				// Act
				const result = await controller.listUsers(request, mock(), {
					skip: 0,
					take: 10,
				});

				// Assert
				expect(userService.toPublic).toHaveBeenCalledWith(
					pendingUser,
					expect.objectContaining({
						withInviteUrl: false,
						inviterId: 'member-id',
					}),
				);

				// Verify inviteAcceptUrl is NOT present in the result
				expect(result.items[0]).not.toHaveProperty('inviteAcceptUrl');
			});
		});
	});
});

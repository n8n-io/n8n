import type { User, UserRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { EventService } from '@/events/event.service';
import type { UserManagementMailer } from '@/user-management/email';
import type { PublicApiKeyService } from '@/services/public-api-key.service';
import type {
	BulkInviteUsersRequestDto,
	BulkUpdateRolesRequestDto,
	BulkStatusUpdateRequestDto,
	BulkDeleteUsersRequestDto,
} from '@n8n/api-types';

import { UserService } from '../user.service';

describe('UserService - Bulk Operations', () => {
	let userService: UserService;
	let userRepository: UserRepository;
	let eventService: EventService;
	let mailer: UserManagementMailer;
	let publicApiKeyService: PublicApiKeyService;

	beforeEach(() => {
		userRepository = mock<UserRepository>();
		eventService = mock<EventService>();
		mailer = mock<UserManagementMailer>();
		publicApiKeyService = mock<PublicApiKeyService>();

		userService = new UserService(
			mock(),
			userRepository,
			mailer,
			mock(),
			eventService,
			publicApiKeyService,
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('bulkInviteUsers', () => {
		it('should successfully invite multiple users', async () => {
			const owner = mock<User>({ id: 'owner-id', role: 'global:owner' });
			const payload: BulkInviteUsersRequestDto = {
				invitations: [
					{ email: 'user1@example.com', role: 'global:member' },
					{ email: 'user2@example.com', role: 'global:admin' },
				],
			};

			const mockInviteUsersResponse = {
				usersInvited: [
					{
						user: {
							id: 'user1-id',
							email: 'user1@example.com',
							emailSent: true,
							role: 'global:member' as const,
						},
						error: '',
					},
					{
						user: {
							id: 'user2-id',
							email: 'user2@example.com',
							emailSent: true,
							role: 'global:admin' as const,
						},
						error: '',
					},
				],
				usersCreated: ['user1@example.com', 'user2@example.com'],
			};

			jest.spyOn(userService, 'inviteUsers').mockResolvedValue(mockInviteUsersResponse);

			const result = await userService.bulkInviteUsers(owner, payload);

			expect(result.success).toHaveLength(2);
			expect(result.errors).toHaveLength(0);
			expect(result.totalProcessed).toBe(2);
			expect(eventService.emit).toHaveBeenCalledTimes(2);
		});

		it('should handle partial failures during bulk invitations', async () => {
			const owner = mock<User>({ id: 'owner-id', role: 'global:owner' });
			const payload: BulkInviteUsersRequestDto = {
				invitations: [
					{ email: 'user1@example.com', role: 'global:member' },
					{ email: 'invalid@example.com', role: 'global:member' },
				],
			};

			const mockInviteUsersResponse = {
				usersInvited: [
					{
						user: {
							id: 'user1-id',
							email: 'user1@example.com',
							emailSent: true,
							role: 'global:member' as const,
						},
						error: '',
					},
					{
						user: {
							id: 'user2-id',
							email: 'invalid@example.com',
							emailSent: false,
							role: 'global:member' as const,
						},
						error: 'Invalid email address',
					},
				],
				usersCreated: ['user1@example.com'],
			};

			jest.spyOn(userService, 'inviteUsers').mockResolvedValue(mockInviteUsersResponse);

			const result = await userService.bulkInviteUsers(owner, payload);

			expect(result.success).toHaveLength(1);
			expect(result.errors).toHaveLength(1);
			expect(result.totalProcessed).toBe(2);
		});
	});

	describe('bulkUpdateRoles', () => {
		it('should successfully update multiple user roles', async () => {
			const user = mock<User>({ id: 'admin-id', role: 'global:owner' });
			const payload: BulkUpdateRolesRequestDto = {
				userRoleUpdates: [
					{ userId: 'user1-id', newRole: 'global:admin' },
					{ userId: 'user2-id', newRole: 'global:member' },
				],
			};

			const mockTransaction = {
				findOne: jest
					.fn()
					.mockResolvedValueOnce(mock<User>({ id: 'user1-id', role: 'global:member' }))
					.mockResolvedValueOnce(mock<User>({ id: 'user2-id', role: 'global:admin' })),
				update: jest.fn().mockResolvedValue({}),
			};

			(userRepository.manager as any) = mock({
				transaction: jest.fn().mockImplementation(async (callback) => {
					return await callback(mockTransaction);
				}),
			});

			const result = await userService.bulkUpdateRoles(user, payload);

			expect(result.success).toHaveLength(2);
			expect(result.errors).toHaveLength(0);
			expect(result.totalProcessed).toBe(2);
			expect(mockTransaction.update).toHaveBeenCalledTimes(2);
			expect(eventService.emit).toHaveBeenCalledTimes(2);
		});

		it('should handle permission errors when updating roles', async () => {
			const user = mock<User>({ id: 'admin-id', role: 'global:admin' });
			const payload: BulkUpdateRolesRequestDto = {
				userRoleUpdates: [
					{ userId: 'user1-id', newRole: 'global:admin' },
					{ userId: 'owner-id', newRole: 'global:member' }, // This should fail
				],
			};

			const mockTransaction = {
				findOne: jest
					.fn()
					.mockResolvedValueOnce(mock<User>({ id: 'user1-id', role: 'global:member' }))
					.mockResolvedValueOnce(mock<User>({ id: 'owner-id', role: 'global:owner' })),
				update: jest.fn().mockResolvedValue({}),
			};

			(userRepository.manager as any) = mock({
				transaction: jest.fn().mockImplementation(async (callback) => {
					return await callback(mockTransaction);
				}),
			});

			const result = await userService.bulkUpdateRoles(user, payload);

			expect(result.success).toHaveLength(1);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].error).toBe('Admin cannot change role on global owner');
			expect(result.totalProcessed).toBe(2);
		});
	});

	describe('bulkUpdateStatus', () => {
		it('should successfully update multiple user statuses', async () => {
			const user = mock<User>({ id: 'admin-id', role: 'global:owner' });
			const payload: BulkStatusUpdateRequestDto = {
				userIds: ['user1-id', 'user2-id'],
				disabled: true,
			};

			const mockTransaction = {
				findOne: jest
					.fn()
					.mockResolvedValueOnce(mock<User>({ id: 'user1-id', role: 'global:member' }))
					.mockResolvedValueOnce(mock<User>({ id: 'user2-id', role: 'global:admin' })),
				update: jest.fn().mockResolvedValue({}),
			};

			(userRepository.manager as any) = mock({
				transaction: jest.fn().mockImplementation(async (callback) => {
					return await callback(mockTransaction);
				}),
			});

			const result = await userService.bulkUpdateStatus(user, payload);

			expect(result.success).toHaveLength(2);
			expect(result.errors).toHaveLength(0);
			expect(result.totalProcessed).toBe(2);
			expect(mockTransaction.update).toHaveBeenCalledTimes(2);
			expect(eventService.emit).toHaveBeenCalledTimes(2);
		});

		it('should prevent updating own status', async () => {
			const user = mock<User>({ id: 'admin-id', role: 'global:admin' });
			const payload: BulkStatusUpdateRequestDto = {
				userIds: ['user1-id', 'admin-id'], // Including own ID should fail
				disabled: true,
			};

			const mockTransaction = {
				findOne: jest
					.fn()
					.mockResolvedValueOnce(mock<User>({ id: 'user1-id', role: 'global:member' }))
					.mockResolvedValueOnce(mock<User>({ id: 'admin-id', role: 'global:admin' })),
				update: jest.fn().mockResolvedValue({}),
			};

			(userRepository.manager as any) = mock({
				transaction: jest.fn().mockImplementation(async (callback) => {
					return await callback(mockTransaction);
				}),
			});

			const result = await userService.bulkUpdateStatus(user, payload);

			expect(result.success).toHaveLength(1);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].error).toBe('Cannot change your own status');
			expect(result.totalProcessed).toBe(2);
		});
	});

	describe('bulkDeleteUsers', () => {
		it('should successfully schedule multiple user deletions', async () => {
			const user = mock<User>({ id: 'admin-id', role: 'global:owner' });
			const payload: BulkDeleteUsersRequestDto = {
				userIds: ['user1-id', 'user2-id'],
				transferToUserId: 'transfer-user-id',
			};

			userRepository.findOneBy = jest
				.fn()
				.mockResolvedValueOnce(mock<User>({ id: 'user1-id', role: 'global:member' }))
				.mockResolvedValueOnce(mock<User>({ id: 'user2-id', role: 'global:admin' }));

			const result = await userService.bulkDeleteUsers(user, payload);

			expect(result.success).toHaveLength(2);
			expect(result.errors).toHaveLength(0);
			expect(result.totalProcessed).toBe(2);
			expect(eventService.emit).toHaveBeenCalledTimes(2);
		});

		it('should prevent deleting global owner', async () => {
			const user = mock<User>({ id: 'admin-id', role: 'global:admin' });
			const payload: BulkDeleteUsersRequestDto = {
				userIds: ['user1-id', 'owner-id'],
			};

			userRepository.findOneBy = jest
				.fn()
				.mockResolvedValueOnce(mock<User>({ id: 'user1-id', role: 'global:member' }))
				.mockResolvedValueOnce(mock<User>({ id: 'owner-id', role: 'global:owner' }));

			const result = await userService.bulkDeleteUsers(user, payload);

			expect(result.success).toHaveLength(1);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].error).toBe('Cannot delete global owner');
			expect(result.totalProcessed).toBe(2);
		});

		it('should prevent self-deletion', async () => {
			const user = mock<User>({ id: 'admin-id', role: 'global:admin' });
			const payload: BulkDeleteUsersRequestDto = {
				userIds: ['user1-id', 'admin-id'], // Including own ID should fail
			};

			userRepository.findOneBy = jest
				.fn()
				.mockResolvedValueOnce(mock<User>({ id: 'user1-id', role: 'global:member' }));

			const result = await userService.bulkDeleteUsers(user, payload);

			expect(result.success).toHaveLength(1);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].error).toBe('Cannot delete your own user');
			expect(result.totalProcessed).toBe(2);
		});
	});
});

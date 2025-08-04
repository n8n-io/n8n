'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const user_service_1 = require('../user.service');
describe('UserService - Bulk Operations', () => {
	let userService;
	let userRepository;
	let eventService;
	let mailer;
	let publicApiKeyService;
	beforeEach(() => {
		userRepository = (0, jest_mock_extended_1.mock)();
		eventService = (0, jest_mock_extended_1.mock)();
		mailer = (0, jest_mock_extended_1.mock)();
		publicApiKeyService = (0, jest_mock_extended_1.mock)();
		userService = new user_service_1.UserService(
			(0, jest_mock_extended_1.mock)(),
			userRepository,
			mailer,
			(0, jest_mock_extended_1.mock)(),
			eventService,
			publicApiKeyService,
		);
	});
	afterEach(() => {
		jest.clearAllMocks();
	});
	describe('bulkInviteUsers', () => {
		it('should successfully invite multiple users', async () => {
			const owner = (0, jest_mock_extended_1.mock)({ id: 'owner-id', role: 'global:owner' });
			const payload = {
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
							role: 'global:member',
						},
						error: '',
					},
					{
						user: {
							id: 'user2-id',
							email: 'user2@example.com',
							emailSent: true,
							role: 'global:admin',
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
			const owner = (0, jest_mock_extended_1.mock)({ id: 'owner-id', role: 'global:owner' });
			const payload = {
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
							role: 'global:member',
						},
						error: '',
					},
					{
						user: {
							id: 'user2-id',
							email: 'invalid@example.com',
							emailSent: false,
							role: 'global:member',
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
			const user = (0, jest_mock_extended_1.mock)({ id: 'admin-id', role: 'global:owner' });
			const payload = {
				userRoleUpdates: [
					{ userId: 'user1-id', newRole: 'global:admin' },
					{ userId: 'user2-id', newRole: 'global:member' },
				],
			};
			const mockTransaction = {
				findOne: jest
					.fn()
					.mockResolvedValueOnce(
						(0, jest_mock_extended_1.mock)({ id: 'user1-id', role: 'global:member' }),
					)
					.mockResolvedValueOnce(
						(0, jest_mock_extended_1.mock)({ id: 'user2-id', role: 'global:admin' }),
					),
				update: jest.fn().mockResolvedValue({}),
			};
			userRepository.manager = (0, jest_mock_extended_1.mock)({
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
			const user = (0, jest_mock_extended_1.mock)({ id: 'admin-id', role: 'global:admin' });
			const payload = {
				userRoleUpdates: [
					{ userId: 'user1-id', newRole: 'global:admin' },
					{ userId: 'owner-id', newRole: 'global:member' },
				],
			};
			const mockTransaction = {
				findOne: jest
					.fn()
					.mockResolvedValueOnce(
						(0, jest_mock_extended_1.mock)({ id: 'user1-id', role: 'global:member' }),
					)
					.mockResolvedValueOnce(
						(0, jest_mock_extended_1.mock)({ id: 'owner-id', role: 'global:owner' }),
					),
				update: jest.fn().mockResolvedValue({}),
			};
			userRepository.manager = (0, jest_mock_extended_1.mock)({
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
			const user = (0, jest_mock_extended_1.mock)({ id: 'admin-id', role: 'global:owner' });
			const payload = {
				userIds: ['user1-id', 'user2-id'],
				disabled: true,
			};
			const mockTransaction = {
				findOne: jest
					.fn()
					.mockResolvedValueOnce(
						(0, jest_mock_extended_1.mock)({ id: 'user1-id', role: 'global:member' }),
					)
					.mockResolvedValueOnce(
						(0, jest_mock_extended_1.mock)({ id: 'user2-id', role: 'global:admin' }),
					),
				update: jest.fn().mockResolvedValue({}),
			};
			userRepository.manager = (0, jest_mock_extended_1.mock)({
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
			const user = (0, jest_mock_extended_1.mock)({ id: 'admin-id', role: 'global:admin' });
			const payload = {
				userIds: ['user1-id', 'admin-id'],
				disabled: true,
			};
			const mockTransaction = {
				findOne: jest
					.fn()
					.mockResolvedValueOnce(
						(0, jest_mock_extended_1.mock)({ id: 'user1-id', role: 'global:member' }),
					)
					.mockResolvedValueOnce(
						(0, jest_mock_extended_1.mock)({ id: 'admin-id', role: 'global:admin' }),
					),
				update: jest.fn().mockResolvedValue({}),
			};
			userRepository.manager = (0, jest_mock_extended_1.mock)({
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
			const user = (0, jest_mock_extended_1.mock)({ id: 'admin-id', role: 'global:owner' });
			const payload = {
				userIds: ['user1-id', 'user2-id'],
				transferToUserId: 'transfer-user-id',
			};
			userRepository.findOneBy = jest
				.fn()
				.mockResolvedValueOnce(
					(0, jest_mock_extended_1.mock)({ id: 'user1-id', role: 'global:member' }),
				)
				.mockResolvedValueOnce(
					(0, jest_mock_extended_1.mock)({ id: 'user2-id', role: 'global:admin' }),
				);
			const result = await userService.bulkDeleteUsers(user, payload);
			expect(result.success).toHaveLength(2);
			expect(result.errors).toHaveLength(0);
			expect(result.totalProcessed).toBe(2);
			expect(eventService.emit).toHaveBeenCalledTimes(2);
		});
		it('should prevent deleting global owner', async () => {
			const user = (0, jest_mock_extended_1.mock)({ id: 'admin-id', role: 'global:admin' });
			const payload = {
				userIds: ['user1-id', 'owner-id'],
			};
			userRepository.findOneBy = jest
				.fn()
				.mockResolvedValueOnce(
					(0, jest_mock_extended_1.mock)({ id: 'user1-id', role: 'global:member' }),
				)
				.mockResolvedValueOnce(
					(0, jest_mock_extended_1.mock)({ id: 'owner-id', role: 'global:owner' }),
				);
			const result = await userService.bulkDeleteUsers(user, payload);
			expect(result.success).toHaveLength(1);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].error).toBe('Cannot delete global owner');
			expect(result.totalProcessed).toBe(2);
		});
		it('should prevent self-deletion', async () => {
			const user = (0, jest_mock_extended_1.mock)({ id: 'admin-id', role: 'global:admin' });
			const payload = {
				userIds: ['user1-id', 'admin-id'],
			};
			userRepository.findOneBy = jest
				.fn()
				.mockResolvedValueOnce(
					(0, jest_mock_extended_1.mock)({ id: 'user1-id', role: 'global:member' }),
				);
			const result = await userService.bulkDeleteUsers(user, payload);
			expect(result.success).toHaveLength(1);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].error).toBe('Cannot delete your own user');
			expect(result.totalProcessed).toBe(2);
		});
	});
});
//# sourceMappingURL=user.service.bulk-operations.test.js.map

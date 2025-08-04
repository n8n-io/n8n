'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const jest_mock_extended_1 = require('jest-mock-extended');
const uuid_1 = require('uuid');
const url_service_1 = require('@/services/url.service');
const user_service_1 = require('@/services/user.service');
describe('UserService', () => {
	const globalConfig = (0, backend_test_utils_1.mockInstance)(config_1.GlobalConfig, {
		host: 'localhost',
		path: '/',
		port: 5678,
		listen_address: '::',
		protocol: 'http',
		editorBaseUrl: '',
	});
	const urlService = new url_service_1.UrlService(globalConfig);
	const userRepository = (0, backend_test_utils_1.mockInstance)(db_1.UserRepository);
	const userService = new user_service_1.UserService(
		(0, jest_mock_extended_1.mock)(),
		userRepository,
		(0, jest_mock_extended_1.mock)(),
		urlService,
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
	);
	const commonMockUser = Object.assign(new db_1.User(), {
		id: (0, uuid_1.v4)(),
		password: 'passwordHash',
	});
	describe('toPublic', () => {
		it('should remove sensitive properties', async () => {
			const mockUser = Object.assign(new db_1.User(), {
				id: (0, uuid_1.v4)(),
				password: 'passwordHash',
				mfaEnabled: false,
				mfaSecret: 'test',
				mfaRecoveryCodes: ['test'],
				updatedAt: new Date(),
				authIdentities: [],
			});
			const publicUser = await userService.toPublic(mockUser);
			expect(publicUser.password).toBeUndefined();
			expect(publicUser.updatedAt).toBeUndefined();
			expect(publicUser.authIdentities).toBeUndefined();
			expect(publicUser.mfaSecret).toBeUndefined();
			expect(publicUser.mfaRecoveryCodes).toBeUndefined();
		});
		it('should add scopes if requested', async () => {
			const scoped = await userService.toPublic(commonMockUser, { withScopes: true });
			const unscoped = await userService.toPublic(commonMockUser);
			expect(scoped.globalScopes).toEqual([]);
			expect(unscoped.globalScopes).toBeUndefined();
		});
		it('should add invite URL if requested', async () => {
			const firstUser = Object.assign(new db_1.User(), { id: (0, uuid_1.v4)() });
			const secondUser = Object.assign(new db_1.User(), { id: (0, uuid_1.v4)(), isPending: true });
			const withoutUrl = await userService.toPublic(secondUser);
			const withUrl = await userService.toPublic(secondUser, {
				withInviteUrl: true,
				inviterId: firstUser.id,
			});
			expect(withoutUrl.inviteAcceptUrl).toBeUndefined();
			const url = new URL(withUrl.inviteAcceptUrl ?? '');
			expect(url.searchParams.get('inviterId')).toBe(firstUser.id);
			expect(url.searchParams.get('inviteeId')).toBe(secondUser.id);
		});
	});
	describe('update', () => {
		it('should use `save` instead of `update`', async () => {
			const user = new db_1.User();
			user.firstName = 'Not Nathan';
			user.lastName = 'Nathaniel';
			const userId = '1234';
			const data = {
				firstName: 'Nathan',
			};
			userRepository.findOneBy.mockResolvedValueOnce(user);
			await userService.update(userId, data);
			expect(userRepository.save).toHaveBeenCalledWith({ ...user, ...data }, { transaction: true });
			expect(userRepository.update).not.toHaveBeenCalled();
		});
	});
});
//# sourceMappingURL=user.service.test.js.map

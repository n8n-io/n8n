'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const config_1 = __importDefault(require('@/config'));
const owner_controller_1 = require('@/controllers/owner.controller');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
describe('OwnerController', () => {
	const configGetSpy = jest.spyOn(config_1.default, 'getEnv');
	const configSetSpy = jest.spyOn(config_1.default, 'set');
	const logger = (0, jest_mock_extended_1.mock)();
	const eventService = (0, jest_mock_extended_1.mock)();
	const authService = (0, jest_mock_extended_1.mock)();
	const bannerService = (0, jest_mock_extended_1.mock)();
	const userService = (0, jest_mock_extended_1.mock)();
	const userRepository = (0, jest_mock_extended_1.mock)();
	const settingsRepository = (0, jest_mock_extended_1.mock)();
	const passwordUtility = (0, jest_mock_extended_1.mock)();
	const controller = new owner_controller_1.OwnerController(
		logger,
		eventService,
		settingsRepository,
		authService,
		bannerService,
		userService,
		passwordUtility,
		(0, jest_mock_extended_1.mock)(),
		userRepository,
	);
	describe('setupOwner', () => {
		it('should throw a BadRequestError if the instance owner is already setup', async () => {
			configGetSpy.mockReturnValue(true);
			await expect(
				controller.setupOwner(
					(0, jest_mock_extended_1.mock)(),
					(0, jest_mock_extended_1.mock)(),
					(0, jest_mock_extended_1.mock)(),
				),
			).rejects.toThrowError(
				new bad_request_error_1.BadRequestError('Instance owner already setup'),
			);
			expect(userRepository.findOneOrFail).not.toHaveBeenCalled();
			expect(userRepository.save).not.toHaveBeenCalled();
			expect(authService.issueCookie).not.toHaveBeenCalled();
			expect(settingsRepository.update).not.toHaveBeenCalled();
			expect(configSetSpy).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
			expect(logger.debug).toHaveBeenCalledWith(
				'Request to claim instance ownership failed because instance owner already exists',
			);
		});
		it('should setup the instance owner successfully', async () => {
			const user = (0, jest_mock_extended_1.mock)({
				id: 'userId',
				role: 'global:owner',
				authIdentities: [],
			});
			const browserId = 'test-browser-id';
			const req = (0, jest_mock_extended_1.mock)({ user, browserId, authInfo: { usedMfa: false } });
			const res = (0, jest_mock_extended_1.mock)();
			const payload = (0, jest_mock_extended_1.mock)({
				email: 'valid@email.com',
				password: 'NewPassword123',
				firstName: 'Jane',
				lastName: 'Doe',
			});
			configGetSpy.mockReturnValue(false);
			userRepository.findOneOrFail.mockResolvedValue(user);
			userRepository.save.mockResolvedValue(user);
			userService.toPublic.mockResolvedValue((0, jest_mock_extended_1.mock)({ id: 'newUserId' }));
			const result = await controller.setupOwner(req, res, payload);
			expect(userRepository.findOneOrFail).toHaveBeenCalledWith({
				where: { role: 'global:owner' },
			});
			expect(userRepository.save).toHaveBeenCalledWith(user, { transaction: false });
			expect(authService.issueCookie).toHaveBeenCalledWith(res, user, false, browserId);
			expect(settingsRepository.update).toHaveBeenCalledWith(
				{ key: 'userManagement.isInstanceOwnerSetUp' },
				{ value: JSON.stringify(true) },
			);
			expect(configSetSpy).toHaveBeenCalledWith('userManagement.isInstanceOwnerSetUp', true);
			expect(eventService.emit).toHaveBeenCalledWith('instance-owner-setup', { userId: 'userId' });
			expect(result.id).toEqual('newUserId');
		});
	});
	describe('dismissBanner', () => {
		it('should not call dismissBanner if no banner is provided', async () => {
			const payload = (0, jest_mock_extended_1.mock)({ banner: undefined });
			const result = await controller.dismissBanner(
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				payload,
			);
			expect(bannerService.dismissBanner).not.toHaveBeenCalled();
			expect(result).toBeUndefined();
		});
		it('should call dismissBanner with the correct banner name', async () => {
			const payload = (0, jest_mock_extended_1.mock)({ banner: 'TRIAL' });
			await controller.dismissBanner(
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				payload,
			);
			expect(bannerService.dismissBanner).toHaveBeenCalledWith('TRIAL');
		});
	});
});
//# sourceMappingURL=owner.controller.test.js.map

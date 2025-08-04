'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const rudder_sdk_node_1 = __importDefault(require('@rudderstack/rudder-sdk-node'));
const jest_mock_extended_1 = require('jest-mock-extended');
const hooks_service_1 = require('@/services/hooks.service');
jest.mock('@rudderstack/rudder-sdk-node');
describe('HooksService', () => {
	const mockedUser = (0, jest_mock_extended_1.mock)();
	const userService = (0, jest_mock_extended_1.mock)();
	const authService = (0, jest_mock_extended_1.mock)();
	const userRepository = (0, jest_mock_extended_1.mock)();
	const settingsRepository = (0, jest_mock_extended_1.mock)();
	const workflowRepository = (0, jest_mock_extended_1.mock)();
	const credentialsRepository = (0, jest_mock_extended_1.mock)();
	const authMiddleware = jest.fn();
	authService.createAuthMiddleware.mockReturnValue(authMiddleware);
	const hooksService = new hooks_service_1.HooksService(
		userService,
		authService,
		userRepository,
		settingsRepository,
		workflowRepository,
		credentialsRepository,
	);
	beforeEach(() => {
		jest.clearAllMocks();
	});
	it('hooksService.inviteUsers should call userService.inviteUsers', async () => {
		const usersToInvite = [{ email: 'test@n8n.io', role: 'global:member' }];
		await hooksService.inviteUsers(mockedUser, usersToInvite);
		expect(userService.inviteUsers).toHaveBeenCalledWith(mockedUser, usersToInvite);
	});
	it('hooksService.issueCookie should call authService.issueCookie', async () => {
		const res = (0, jest_mock_extended_1.mock)();
		mockedUser.mfaEnabled = false;
		hooksService.issueCookie(res, mockedUser);
		expect(authService.issueCookie).toHaveBeenCalledWith(res, mockedUser, false);
	});
	it('hooksService.findOneUser should call userRepository.findOne', async () => {
		const filter = { where: { id: '1' } };
		await hooksService.findOneUser(filter);
		expect(userRepository.findOne).toHaveBeenCalledWith(filter);
	});
	it('hooksService.saveUser should call userRepository.save', async () => {
		await hooksService.saveUser(mockedUser);
		expect(userRepository.save).toHaveBeenCalledWith(mockedUser);
	});
	it('hooksService.updateSettings should call settingRepository.update', async () => {
		const filter = { key: 'test' };
		const set = { value: 'true' };
		await hooksService.updateSettings(filter, set);
		expect(settingsRepository.update).toHaveBeenCalledWith(filter, set);
	});
	it('hooksService.workflowsCount should call workflowRepository.count', async () => {
		const filter = { where: { active: true } };
		await hooksService.workflowsCount(filter);
		expect(workflowRepository.count).toHaveBeenCalledWith(filter);
	});
	it('hooksService.credentialsCount should call credentialRepository.count', async () => {
		const filter = { where: {} };
		await hooksService.credentialsCount(filter);
		expect(credentialsRepository.count).toHaveBeenCalledWith(filter);
	});
	it('hooksService.settingsCount should call settingsRepository.count', async () => {
		const filter = { where: { key: 'test' } };
		await hooksService.settingsCount(filter);
		expect(settingsRepository.count).toHaveBeenCalledWith(filter);
	});
	it('hooksService.authMiddleware should call authService.authMiddleware', async () => {
		const res = (0, jest_mock_extended_1.mock)();
		const req = (0, jest_mock_extended_1.mock)();
		const next = jest.fn();
		await hooksService.authMiddleware(req, res, next);
		expect(authMiddleware).toHaveBeenCalledWith(req, res, next);
	});
	it('hooksService.dbCollections should return valid repositories', async () => {
		const collections = hooksService.dbCollections();
		expect(collections).toHaveProperty('User');
		expect(collections).toHaveProperty('Settings');
		expect(collections).toHaveProperty('Credentials');
		expect(collections).toHaveProperty('Workflow');
	});
	it('hooksService.getRudderStackClient', async () => {
		const key = 'TEST';
		const opts = { dataPlaneUrl: 'test.com' };
		const client = hooksService.getRudderStackClient(key, opts);
		expect(client instanceof rudder_sdk_node_1.default).toBeTruthy();
		expect(rudder_sdk_node_1.default).toHaveBeenCalledWith(key, opts);
	});
});
//# sourceMappingURL=hooks.service.test.js.map

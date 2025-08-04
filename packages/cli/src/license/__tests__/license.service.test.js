'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
Object.defineProperty(exports, '__esModule', { value: true });
const axios_1 = __importStar(require('axios'));
const jest_mock_extended_1 = require('jest-mock-extended');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const license_service_1 = require('@/license/license.service');
jest.mock('axios');
describe('LicenseService', () => {
	const license = (0, jest_mock_extended_1.mock)();
	const licenseState = (0, jest_mock_extended_1.mock)();
	const workflowRepository = (0, jest_mock_extended_1.mock)();
	const entitlement = (0, jest_mock_extended_1.mock)({ productId: '123' });
	const eventService = (0, jest_mock_extended_1.mock)();
	const licenseService = new license_service_1.LicenseService(
		(0, jest_mock_extended_1.mock)(),
		license,
		licenseState,
		workflowRepository,
		(0, jest_mock_extended_1.mock)(),
		eventService,
	);
	license.getMainPlan.mockReturnValue(entitlement);
	license.getTriggerLimit.mockReturnValue(400);
	license.getPlanName.mockReturnValue('Test Plan');
	licenseState.getMaxWorkflowsWithEvaluations.mockReturnValue(2);
	workflowRepository.getActiveTriggerCount.mockResolvedValue(7);
	workflowRepository.getWorkflowsWithEvaluationCount.mockResolvedValue(1);
	beforeEach(() => jest.clearAllMocks());
	class LicenseError extends Error {
		constructor(errorId) {
			super(`License error: ${errorId}`);
			this.errorId = errorId;
		}
	}
	describe('getLicenseData', () => {
		it('should return usage and license data', async () => {
			const data = await licenseService.getLicenseData();
			expect(data).toEqual({
				usage: {
					activeWorkflowTriggers: {
						limit: 400,
						value: 7,
						warningThreshold: 0.8,
					},
					workflowsHavingEvaluations: {
						limit: 2,
						value: 1,
					},
				},
				license: {
					planId: '123',
					planName: 'Test Plan',
				},
			});
		});
	});
	describe('activateLicense', () => {
		Object.entries(license_service_1.LicenseErrors).forEach(([errorId, message]) =>
			it(`should handle ${errorId} error`, async () => {
				license.activate.mockRejectedValueOnce(new LicenseError(errorId));
				await expect(licenseService.activateLicense('')).rejects.toThrowError(
					new bad_request_error_1.BadRequestError(message),
				);
			}),
		);
	});
	describe('renewLicense', () => {
		test('should skip renewal for unlicensed user (Community plan)', async () => {
			license.getPlanName.mockReturnValueOnce('Community');
			await licenseService.renewLicense();
			expect(license.renew).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});
		test('on success', async () => {
			license.renew.mockResolvedValueOnce();
			await licenseService.renewLicense();
			expect(eventService.emit).toHaveBeenCalledWith('license-renewal-attempted', {
				success: true,
			});
		});
		test('on failure', async () => {
			license.renew.mockRejectedValueOnce(new LicenseError('RESERVATION_EXPIRED'));
			await expect(licenseService.renewLicense()).rejects.toThrowError(
				new bad_request_error_1.BadRequestError('Activation key has expired'),
			);
			expect(eventService.emit).toHaveBeenCalledWith('license-renewal-attempted', {
				success: false,
			});
		});
	});
	describe('registerCommunityEdition', () => {
		test('on success', async () => {
			jest
				.spyOn(axios_1.default, 'post')
				.mockResolvedValueOnce({ data: { title: 'Title', text: 'Text', licenseKey: 'abc-123' } });
			const data = await licenseService.registerCommunityEdition({
				userId: '123',
				email: 'test@ema.il',
				instanceId: '123',
				instanceUrl: 'http://localhost',
				licenseType: 'community-registered',
			});
			expect(data).toEqual({ title: 'Title', text: 'Text' });
			expect(eventService.emit).toHaveBeenCalledWith('license-community-plus-registered', {
				userId: '123',
				email: 'test@ema.il',
				licenseKey: 'abc-123',
			});
		});
		test('on failure', async () => {
			jest.spyOn(axios_1.default, 'post').mockRejectedValueOnce(new axios_1.AxiosError('Failed'));
			await expect(
				licenseService.registerCommunityEdition({
					userId: '123',
					email: 'test@ema.il',
					instanceId: '123',
					instanceUrl: 'http://localhost',
					licenseType: 'community-registered',
				}),
			).rejects.toThrowError('Failed');
			expect(eventService.emit).not.toHaveBeenCalled();
		});
	});
});
//# sourceMappingURL=license.service.test.js.map

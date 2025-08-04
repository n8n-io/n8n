'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const license_sdk_1 = require('@n8n_io/license-sdk');
const jest_mock_extended_1 = require('jest-mock-extended');
const constants_1 = require('@/constants');
const license_1 = require('@/license');
jest.mock('@n8n_io/license-sdk');
const MOCK_SERVER_URL = 'https://server.com/v1';
const MOCK_RENEW_OFFSET = 259200;
const MOCK_INSTANCE_ID = 'instance-id';
const MOCK_ACTIVATION_KEY = 'activation-key';
const MOCK_FEATURE_FLAG = 'feat:sharing';
const MOCK_MAIN_PLAN_ID = '1b765dc4-d39d-4ffe-9885-c56dd67c4b26';
function makeDateWithHourOffset(offsetInHours) {
	const date = new Date();
	date.setHours(date.getHours() + offsetInHours);
	return date;
}
const licenseConfig = {
	serverUrl: MOCK_SERVER_URL,
	autoRenewalEnabled: true,
	detachFloatingOnShutdown: true,
	activationKey: MOCK_ACTIVATION_KEY,
	tenantId: 1,
	cert: '',
};
describe('License', () => {
	let license;
	const instanceSettings = (0, jest_mock_extended_1.mock)({
		instanceId: MOCK_INSTANCE_ID,
		instanceType: 'main',
		isLeader: true,
	});
	beforeEach(async () => {
		const globalConfig = (0, jest_mock_extended_1.mock)({
			license: licenseConfig,
			multiMainSetup: { enabled: false },
		});
		license = new license_1.License(
			(0, backend_test_utils_1.mockLogger)(),
			instanceSettings,
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			globalConfig,
		);
		await license.init();
	});
	test('initializes license manager', () => {
		expect(license_sdk_1.LicenseManager).toHaveBeenCalledWith(
			expect.objectContaining({
				autoRenewEnabled: true,
				autoRenewOffset: MOCK_RENEW_OFFSET,
				offlineMode: false,
				renewOnInit: true,
				deviceFingerprint: expect.any(Function),
				productIdentifier: `n8n-${constants_1.N8N_VERSION}`,
				loadCertStr: expect.any(Function),
				saveCertStr: expect.any(Function),
				onFeatureChange: expect.any(Function),
				onLicenseRenewed: expect.any(Function),
				collectUsageMetrics: expect.any(Function),
				collectPassthroughData: expect.any(Function),
				server: MOCK_SERVER_URL,
				tenantId: 1,
			}),
		);
	});
	test('initializes license manager for worker', async () => {
		const logger = (0, backend_test_utils_1.mockLogger)();
		license = new license_1.License(
			logger,
			(0, jest_mock_extended_1.mock)({ instanceType: 'worker', isLeader: false }),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)({ license: licenseConfig }),
		);
		await license.init();
		expect(license_sdk_1.LicenseManager).toHaveBeenCalledWith(
			expect.objectContaining({
				autoRenewEnabled: false,
				autoRenewOffset: MOCK_RENEW_OFFSET,
				offlineMode: true,
				renewOnInit: false,
				deviceFingerprint: expect.any(Function),
				productIdentifier: `n8n-${constants_1.N8N_VERSION}`,
				loadCertStr: expect.any(Function),
				saveCertStr: expect.any(Function),
				onFeatureChange: expect.any(Function),
				onLicenseRenewed: expect.any(Function),
				collectUsageMetrics: expect.any(Function),
				collectPassthroughData: expect.any(Function),
				server: MOCK_SERVER_URL,
				tenantId: 1,
			}),
		);
	});
	test('attempts to activate license with provided key', async () => {
		await license.activate(MOCK_ACTIVATION_KEY);
		expect(license_sdk_1.LicenseManager.prototype.activate).toHaveBeenCalledWith(
			MOCK_ACTIVATION_KEY,
		);
	});
	test('renews license', async () => {
		await license.renew();
		expect(license_sdk_1.LicenseManager.prototype.renew).toHaveBeenCalled();
	});
	test('check if feature is enabled', () => {
		license.isLicensed(MOCK_FEATURE_FLAG);
		expect(license_sdk_1.LicenseManager.prototype.hasFeatureEnabled).toHaveBeenCalledWith(
			MOCK_FEATURE_FLAG,
		);
	});
	test('check if sharing feature is enabled', () => {
		license.isLicensed(MOCK_FEATURE_FLAG);
		expect(license_sdk_1.LicenseManager.prototype.hasFeatureEnabled).toHaveBeenCalledWith(
			MOCK_FEATURE_FLAG,
		);
	});
	test('check fetching entitlements', () => {
		license.getCurrentEntitlements();
		expect(license_sdk_1.LicenseManager.prototype.getCurrentEntitlements).toHaveBeenCalled();
	});
	test('check fetching feature values', () => {
		license.getValue(MOCK_FEATURE_FLAG);
		expect(license_sdk_1.LicenseManager.prototype.getFeatureValue).toHaveBeenCalledWith(
			MOCK_FEATURE_FLAG,
		);
	});
	test('check management jwt', () => {
		license.getManagementJwt();
		expect(license_sdk_1.LicenseManager.prototype.getManagementJwt).toHaveBeenCalled();
	});
	test('getMainPlan() returns the latest main entitlement', () => {
		license_1.License.prototype.getCurrentEntitlements = jest.fn().mockReturnValue([
			{
				id: '84a9c852-1349-478d-9ad1-b3f55510e477',
				productId: '670650f2-72d8-4397-898c-c249906e2cc2',
				productMetadata: {},
				features: {},
				featureOverrides: {},
				validFrom: makeDateWithHourOffset(-3),
				validTo: makeDateWithHourOffset(1),
			},
			{
				id: '95b9c852-1349-478d-9ad1-b3f55510e488',
				productId: '670650f2-72d8-4397-898c-c249906e2cc2',
				productMetadata: {
					terms: {
						isMainPlan: true,
					},
				},
				features: {},
				featureOverrides: {},
				validFrom: makeDateWithHourOffset(-2),
				validTo: makeDateWithHourOffset(1),
			},
			{
				id: MOCK_MAIN_PLAN_ID,
				productId: '670650f2-72d8-4397-898c-c249906e2cc2',
				productMetadata: {
					terms: {
						isMainPlan: true,
					},
				},
				features: {},
				featureOverrides: {},
				validFrom: makeDateWithHourOffset(-1),
				validTo: makeDateWithHourOffset(1),
			},
		]);
		jest.fn(license.getMainPlan).mockReset();
		const mainPlan = license.getMainPlan();
		expect(mainPlan?.id).toBe(MOCK_MAIN_PLAN_ID);
	});
	test('getMainPlan() returns undefined if there is no main plan', async () => {
		license_1.License.prototype.getCurrentEntitlements = jest.fn().mockReturnValue([
			{
				id: '84a9c852-1349-478d-9ad1-b3f55510e477',
				productId: '670650f2-72d8-4397-898c-c249906e2cc2',
				productMetadata: {},
				features: {},
				featureOverrides: {},
				validFrom: makeDateWithHourOffset(-1),
				validTo: makeDateWithHourOffset(1),
			},
			{
				id: 'c1aae471-c24e-4874-ad88-b97107de486c',
				productId: '670650f2-72d8-4397-898c-c249906e2cc2',
				productMetadata: {},
				features: {},
				featureOverrides: {},
				validFrom: makeDateWithHourOffset(-1),
				validTo: makeDateWithHourOffset(1),
			},
		]);
		jest.fn(license.getMainPlan).mockReset();
		const mainPlan = license.getMainPlan();
		expect(mainPlan).toBeUndefined();
	});
	describe('onExpirySoon', () => {
		it.each([
			{
				instanceType: 'main',
				isLeader: true,
				shouldReload: false,
				description: 'Leader main should not reload',
			},
			{
				instanceType: 'main',
				isLeader: false,
				shouldReload: true,
				description: 'Follower main should reload',
			},
			{
				instanceType: 'worker',
				isLeader: false,
				shouldReload: true,
				description: 'Worker should reload',
			},
			{
				instanceType: 'webhook',
				isLeader: false,
				shouldReload: true,
				description: 'Webhook should reload',
			},
		])('$description', async ({ instanceType, isLeader, shouldReload }) => {
			const logger = (0, backend_test_utils_1.mockLogger)();
			const reloadSpy = jest.spyOn(license_1.License.prototype, 'reload').mockResolvedValueOnce();
			const instanceSettings = (0, jest_mock_extended_1.mock)({ instanceType });
			Object.defineProperty(instanceSettings, 'isLeader', { get: () => isLeader });
			license = new license_1.License(
				logger,
				instanceSettings,
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)({ license: licenseConfig }),
			);
			await license.init();
			const licenseManager = license_sdk_1.LicenseManager;
			const calls = licenseManager.mock.calls;
			const licenseManagerCall = calls[calls.length - 1][0];
			const onExpirySoon = licenseManagerCall.onExpirySoon;
			if (shouldReload) {
				expect(onExpirySoon).toBeDefined();
				onExpirySoon();
				expect(reloadSpy).toHaveBeenCalled();
			} else {
				expect(onExpirySoon).toBeUndefined();
				expect(reloadSpy).not.toHaveBeenCalled();
			}
		});
	});
});
describe('License', () => {
	describe('init', () => {
		it('when leader main with N8N_LICENSE_AUTO_RENEW_ENABLED=true, should enable renewal', async () => {
			const globalConfig = (0, jest_mock_extended_1.mock)({
				license: { ...licenseConfig, autoRenewalEnabled: true },
			});
			await new license_1.License(
				(0, backend_test_utils_1.mockLogger)(),
				(0, jest_mock_extended_1.mock)({ instanceType: 'main', isLeader: true }),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				globalConfig,
			).init();
			expect(license_sdk_1.LicenseManager).toHaveBeenCalledWith(
				expect.objectContaining({ autoRenewEnabled: true, renewOnInit: true }),
			);
		});
		it.each([
			{
				scenario: 'when leader main with N8N_LICENSE_AUTO_RENEW_ENABLED=false',
				isLeader: true,
				autoRenewalEnabled: false,
			},
			{
				scenario: 'when follower main with N8N_LICENSE_AUTO_RENEW_ENABLED=true',
				isLeader: false,
				autoRenewalEnabled: true,
			},
			{
				scenario: 'when follower main with N8N_LICENSE_AUTO_RENEW_ENABLED=false',
				isLeader: false,
				autoRenewalEnabled: false,
			},
		])('$scenario, should disable renewal', async ({ isLeader, autoRenewalEnabled }) => {
			const globalConfig = (0, jest_mock_extended_1.mock)({
				license: { ...licenseConfig, autoRenewalEnabled },
			});
			await new license_1.License(
				(0, backend_test_utils_1.mockLogger)(),
				(0, jest_mock_extended_1.mock)({ instanceType: 'main', isLeader }),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				globalConfig,
			).init();
			const expectedRenewalSettings =
				isLeader && autoRenewalEnabled
					? { autoRenewEnabled: true, renewOnInit: true }
					: { autoRenewEnabled: false, renewOnInit: false };
			expect(license_sdk_1.LicenseManager).toHaveBeenCalledWith(
				expect.objectContaining(expectedRenewalSettings),
			);
		});
		it('when CLI command with N8N_LICENSE_AUTO_RENEW_ENABLED=true, should enable renewal', async () => {
			const globalConfig = (0, jest_mock_extended_1.mock)({
				license: { ...licenseConfig, autoRenewalEnabled: true },
			});
			await new license_1.License(
				(0, backend_test_utils_1.mockLogger)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				(0, jest_mock_extended_1.mock)(),
				globalConfig,
			).init({
				isCli: true,
			});
			expect(license_sdk_1.LicenseManager).toHaveBeenCalledWith(
				expect.objectContaining({ autoRenewEnabled: true, renewOnInit: true }),
			);
		});
	});
});
//# sourceMappingURL=license.test.js.map

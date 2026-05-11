import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type { SettingsRepository } from '@n8n/db';
import { LicenseManager } from '@n8n_io/license-sdk';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { N8N_VERSION } from '@/constants';
import { License } from '@/license';

jest.mock('@n8n_io/license-sdk');

const MOCK_SERVER_URL = 'https://server.com/v1';
const MOCK_RENEW_OFFSET = 259200;
const MOCK_INSTANCE_ID = 'instance-id';
const MOCK_ACTIVATION_KEY = 'activation-key';
const MOCK_FEATURE_FLAG = 'feat:sharing';
const MOCK_MAIN_PLAN_ID = '1b765dc4-d39d-4ffe-9885-c56dd67c4b26';

function makeDateWithHourOffset(offsetInHours: number): Date {
	const date = new Date();
	date.setHours(date.getHours() + offsetInHours);
	return date;
}

const licenseConfig: GlobalConfig['license'] = {
	serverUrl: MOCK_SERVER_URL,
	autoRenewalEnabled: true,
	detachFloatingOnShutdown: true,
	activationKey: MOCK_ACTIVATION_KEY,
	tenantId: 1,
	cert: '',
};

describe('License', () => {
	let license: License;
	const instanceSettings = mock<InstanceSettings>({
		instanceId: MOCK_INSTANCE_ID,
		instanceType: 'main',
		isLeader: true,
	});

	beforeEach(async () => {
		const globalConfig = mock<GlobalConfig>({
			license: licenseConfig,
			multiMainSetup: { enabled: false },
		});
		license = new License(mockLogger(), instanceSettings, mock(), mock(), globalConfig);
		await license.init();
	});

	test('initializes license manager', async () => {
		expect(LicenseManager).toHaveBeenCalledWith(
			expect.objectContaining({
				autoRenewEnabled: true,
				autoRenewOffset: MOCK_RENEW_OFFSET,
				offlineMode: false,
				renewOnInit: true,
				deviceFingerprint: expect.any(Function),
				productIdentifier: `n8n-${N8N_VERSION}`,
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
		const logger = mockLogger();

		license = new License(
			logger,
			mock<InstanceSettings>({ instanceType: 'worker', isLeader: false }),
			mock(),
			mock(),
			mock<GlobalConfig>({ license: licenseConfig }),
		);
		await license.init();
		expect(LicenseManager).toHaveBeenCalledWith(
			expect.objectContaining({
				autoRenewEnabled: false,
				autoRenewOffset: MOCK_RENEW_OFFSET,
				offlineMode: true,
				renewOnInit: false,
				deviceFingerprint: expect.any(Function),
				productIdentifier: `n8n-${N8N_VERSION}`,
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

	test('attempts to activate license with provided key (initial activation)', async () => {
		await license.activate(MOCK_ACTIVATION_KEY);

		expect(LicenseManager.prototype.activate).toHaveBeenCalledWith(MOCK_ACTIVATION_KEY, {
			eulaUri: undefined,
			email: undefined,
		});
	});

	test('attempts to activate license with eulaUri and userEmail (EULA acceptance)', async () => {
		const eulaUri = 'https://n8n.io/legal/eula/';
		const userEmail = 'user@example.com';
		await license.activate(MOCK_ACTIVATION_KEY, eulaUri, userEmail);

		expect(LicenseManager.prototype.activate).toHaveBeenCalledWith(MOCK_ACTIVATION_KEY, {
			eulaUri,
			email: userEmail,
		});
	});

	test('renews license', async () => {
		await license.renew();

		expect(LicenseManager.prototype.renew).toHaveBeenCalled();
	});

	test('check if feature is enabled', () => {
		license.isLicensed(MOCK_FEATURE_FLAG);

		expect(LicenseManager.prototype.hasFeatureEnabled).toHaveBeenCalledWith(MOCK_FEATURE_FLAG);
	});

	test('check if sharing feature is enabled', () => {
		license.isLicensed(MOCK_FEATURE_FLAG);

		expect(LicenseManager.prototype.hasFeatureEnabled).toHaveBeenCalledWith(MOCK_FEATURE_FLAG);
	});

	test('check fetching entitlements', () => {
		license.getCurrentEntitlements();

		expect(LicenseManager.prototype.getCurrentEntitlements).toHaveBeenCalled();
	});

	test('check fetching feature values', async () => {
		license.getValue(MOCK_FEATURE_FLAG);

		expect(LicenseManager.prototype.getFeatureValue).toHaveBeenCalledWith(MOCK_FEATURE_FLAG);
	});

	test('check management jwt', async () => {
		license.getManagementJwt();

		expect(LicenseManager.prototype.getManagementJwt).toHaveBeenCalled();
	});

	test('getMainPlan() returns the latest main entitlement', async () => {
		// mock entitlements response
		License.prototype.getCurrentEntitlements = jest.fn().mockReturnValue([
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
				validFrom: makeDateWithHourOffset(-1), // this is the LATEST / newest plan
				validTo: makeDateWithHourOffset(1),
			},
		]);
		jest.fn(license.getMainPlan).mockReset();

		const mainPlan = license.getMainPlan();
		expect(mainPlan?.id).toBe(MOCK_MAIN_PLAN_ID);
	});

	test('getMainPlan() returns undefined if there is no main plan', async () => {
		// mock entitlements response
		License.prototype.getCurrentEntitlements = jest.fn().mockReturnValue([
			{
				id: '84a9c852-1349-478d-9ad1-b3f55510e477',
				productId: '670650f2-72d8-4397-898c-c249906e2cc2',
				productMetadata: {}, // has no `productMetadata.terms.isMainPlan`!
				features: {},
				featureOverrides: {},
				validFrom: makeDateWithHourOffset(-1),
				validTo: makeDateWithHourOffset(1),
			},
			{
				id: 'c1aae471-c24e-4874-ad88-b97107de486c',
				productId: '670650f2-72d8-4397-898c-c249906e2cc2',
				productMetadata: {}, // has no `productMetadata.terms.isMainPlan`!
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
				instanceType: 'main' as const,
				isLeader: true,
				shouldReload: false,
				description: 'Leader main should not reload',
			},
			{
				instanceType: 'main' as const,
				isLeader: false,
				shouldReload: true,
				description: 'Follower main should reload',
			},
			{
				instanceType: 'worker' as const,
				isLeader: false,
				shouldReload: true,
				description: 'Worker should reload',
			},
			{
				instanceType: 'webhook' as const,
				isLeader: false,
				shouldReload: true,
				description: 'Webhook should reload',
			},
		])('$description', async ({ instanceType, isLeader, shouldReload }) => {
			const logger = mockLogger();
			const reloadSpy = jest.spyOn(License.prototype, 'reload').mockResolvedValueOnce();
			const instanceSettings = mock<InstanceSettings>({ instanceType });
			Object.defineProperty(instanceSettings, 'isLeader', { get: () => isLeader });

			license = new License(
				logger,
				instanceSettings,
				mock(),
				mock(),
				mock<GlobalConfig>({ license: licenseConfig }),
			);

			await license.init();

			const licenseManager = LicenseManager as jest.MockedClass<typeof LicenseManager>;
			const calls = licenseManager.mock.calls;
			const licenseManagerCall = calls[calls.length - 1][0];
			const onExpirySoon = licenseManagerCall.onExpirySoon;

			if (shouldReload) {
				expect(onExpirySoon).toBeDefined();
				onExpirySoon!();
				expect(reloadSpy).toHaveBeenCalled();
			} else {
				expect(onExpirySoon).toBeUndefined();
				expect(reloadSpy).not.toHaveBeenCalled();
			}
		});
	});
});

describe('License', () => {
	describe('onCertRefresh', () => {
		let license: License;
		const instanceSettings = mock<InstanceSettings>({
			instanceId: 'test-instance',
			instanceType: 'main',
			isLeader: true,
		});

		beforeEach(async () => {
			jest.restoreAllMocks();
			const globalConfig = mock<GlobalConfig>({
				license: licenseConfig,
				multiMainSetup: { enabled: false },
			});
			license = new License(mockLogger(), instanceSettings, mock(), mock(), globalConfig);
			await license.init();
		});

		it('should register callback and call it on license reload', async () => {
			const callback = jest.fn();
			license.onCertRefresh(callback);

			await license.reload();

			expect(callback).toHaveBeenCalledWith('');
		});

		it('should call multiple registered callbacks', async () => {
			const callback1 = jest.fn();
			const callback2 = jest.fn();

			license.onCertRefresh(callback1);
			license.onCertRefresh(callback2);

			await license.reload();

			expect(callback1).toHaveBeenCalledTimes(1);
			expect(callback2).toHaveBeenCalledTimes(1);
		});

		it('should return unsubscribe function that removes callback', async () => {
			const callback = jest.fn();
			const unsubscribe = license.onCertRefresh(callback);

			unsubscribe();
			await license.reload();

			expect(callback).not.toHaveBeenCalled();
		});

		it('should continue calling other callbacks if one throws', async () => {
			const errorCallback = jest.fn().mockImplementation(() => {
				throw new Error('Callback error');
			});
			const callback2 = jest.fn();

			license.onCertRefresh(errorCallback);
			license.onCertRefresh(callback2);

			await license.reload();

			expect(errorCallback).toHaveBeenCalled();
			expect(callback2).toHaveBeenCalled();
		});

		it('should pass the loaded certificate to callbacks', async () => {
			const settingsRepository = mock<SettingsRepository>();
			settingsRepository.findOne.mockResolvedValue({ value: 'test-cert-value' } as any);

			const globalConfig = mock<GlobalConfig>({
				license: licenseConfig,
				multiMainSetup: { enabled: false },
			});
			license = new License(
				mockLogger(),
				instanceSettings,
				settingsRepository,
				mock(),
				globalConfig,
			);
			await license.init();

			const callback = jest.fn();
			license.onCertRefresh(callback);

			await license.reload();

			expect(callback).toHaveBeenCalledWith('test-cert-value');
		});
	});

	describe('init', () => {
		it('when leader main with N8N_LICENSE_AUTO_RENEW_ENABLED=true, should enable renewal', async () => {
			const globalConfig = mock<GlobalConfig>({
				license: { ...licenseConfig, autoRenewalEnabled: true },
			});

			await new License(
				mockLogger(),
				mock<InstanceSettings>({ instanceType: 'main', isLeader: true }),
				mock(),
				mock(),
				globalConfig,
			).init();

			expect(LicenseManager).toHaveBeenCalledWith(
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
			const globalConfig = mock<GlobalConfig>({
				license: { ...licenseConfig, autoRenewalEnabled },
			});

			await new License(
				mockLogger(),
				mock<InstanceSettings>({ instanceType: 'main', isLeader }),
				mock(),
				mock(),
				globalConfig,
			).init();

			const expectedRenewalSettings =
				isLeader && autoRenewalEnabled
					? { autoRenewEnabled: true, renewOnInit: true }
					: { autoRenewEnabled: false, renewOnInit: false };

			expect(LicenseManager).toHaveBeenCalledWith(expect.objectContaining(expectedRenewalSettings));
		});

		it('when CLI command with N8N_LICENSE_AUTO_RENEW_ENABLED=true, should enable renewal', async () => {
			const globalConfig = mock<GlobalConfig>({
				license: { ...licenseConfig, autoRenewalEnabled: true },
			});

			await new License(mockLogger(), mock(), mock(), mock(), globalConfig).init({
				isCli: true,
			});

			expect(LicenseManager).toHaveBeenCalledWith(
				expect.objectContaining({ autoRenewEnabled: true, renewOnInit: true }),
			);
		});
	});

	describe('getExpiringInDays', () => {
		let license: License;
		const instanceSettings = mock<InstanceSettings>({
			instanceId: MOCK_INSTANCE_ID,
			instanceType: 'main',
			isLeader: true,
		});

		beforeEach(async () => {
			jest.restoreAllMocks();
			const globalConfig = mock<GlobalConfig>({
				license: licenseConfig,
				multiMainSetup: { enabled: false },
			});
			license = new License(mockLogger(), instanceSettings, mock(), mock(), globalConfig);
			await license.init();
		});

		it('should return number of days until expiry for future date', () => {
			License.prototype.getExpiryDate = jest.fn().mockReturnValue(makeDateWithHourOffset(72)); // 3 days

			const result = license.getExpiringInDays();

			expect(result).toBe(3);
		});

		it('should return 0 for already expired licenses', () => {
			License.prototype.getExpiryDate = jest.fn().mockReturnValue(makeDateWithHourOffset(-24)); // 1 day ago

			const result = license.getExpiringInDays();

			expect(result).toBe(0);
		});

		it('should return undefined when no expiry date exists', () => {
			License.prototype.getExpiryDate = jest.fn().mockReturnValue(null);

			const result = license.getExpiringInDays();

			expect(result).toBeUndefined();
		});

		it('should handle exactly 0 hours remaining', () => {
			const now = new Date();
			License.prototype.getExpiryDate = jest.fn().mockReturnValue(now);

			const result = license.getExpiringInDays();

			expect(result).toBe(0);
		});

		it('should handle dates far in the future', () => {
			License.prototype.getExpiryDate = jest.fn().mockReturnValue(makeDateWithHourOffset(365 * 24)); // 1 year

			const result = license.getExpiringInDays();

			expect(result).toBe(365);
		});

		it('should handle fractional days by ceiling', () => {
			License.prototype.getExpiryDate = jest.fn().mockReturnValue(makeDateWithHourOffset(37)); // 1.5+ days

			const result = license.getExpiringInDays();

			expect(result).toBe(2); // ceiling of 1.5 is 2
		});

		it('should handle invalid date (NaN)', () => {
			const invalidDate = new Date('invalid');
			License.prototype.getExpiryDate = jest.fn().mockReturnValue(invalidDate);

			const result = license.getExpiringInDays();

			expect(result).toBeUndefined();
		});

		it('should return maximum 0 for negative day differences', () => {
			License.prototype.getExpiryDate = jest.fn().mockReturnValue(makeDateWithHourOffset(-100)); // 4+ days ago

			const result = license.getExpiringInDays();

			expect(result).toBe(0);
		});
	});

	describe('getTerminatingInDays', () => {
		let license: License;
		const instanceSettings = mock<InstanceSettings>({
			instanceId: MOCK_INSTANCE_ID,
			instanceType: 'main',
			isLeader: true,
		});

		beforeEach(async () => {
			jest.restoreAllMocks();
			const globalConfig = mock<GlobalConfig>({
				license: licenseConfig,
				multiMainSetup: { enabled: false },
			});
			license = new License(mockLogger(), instanceSettings, mock(), mock(), globalConfig);
			await license.init();
		});

		it('should return number of days until termination for future date', () => {
			License.prototype.getTerminationDate = jest.fn().mockReturnValue(makeDateWithHourOffset(48)); // 2 days

			const result = license.getTerminatingInDays();

			expect(result).toBe(2);
		});

		it('should return 0 for already terminated licenses', () => {
			License.prototype.getTerminationDate = jest.fn().mockReturnValue(makeDateWithHourOffset(-48)); // 2 days ago

			const result = license.getTerminatingInDays();

			expect(result).toBe(0);
		});

		it('should return undefined when no termination date exists', () => {
			License.prototype.getTerminationDate = jest.fn().mockReturnValue(null);

			const result = license.getTerminatingInDays();

			expect(result).toBeUndefined();
		});

		it('should handle exactly 0 hours until termination', () => {
			const now = new Date();
			License.prototype.getTerminationDate = jest.fn().mockReturnValue(now);

			const result = license.getTerminatingInDays();

			expect(result).toBe(0);
		});

		it('should handle termination dates far in the future', () => {
			License.prototype.getTerminationDate = jest
				.fn()
				.mockReturnValue(makeDateWithHourOffset(720 * 24)); // 2 years

			const result = license.getTerminatingInDays();

			expect(result).toBe(720);
		});

		it('should handle fractional days by ceiling', () => {
			License.prototype.getTerminationDate = jest.fn().mockReturnValue(makeDateWithHourOffset(13)); // 0.5+ days

			const result = license.getTerminatingInDays();

			expect(result).toBe(1); // ceiling of 0.5 is 1
		});

		it('should handle invalid date (NaN)', () => {
			const invalidDate = new Date('invalid');
			License.prototype.getTerminationDate = jest.fn().mockReturnValue(invalidDate);

			const result = license.getTerminatingInDays();

			expect(result).toBeUndefined();
		});

		it('should return maximum 0 for negative day differences', () => {
			License.prototype.getTerminationDate = jest
				.fn()
				.mockReturnValue(makeDateWithHourOffset(-200)); // 8+ days ago

			const result = license.getTerminatingInDays();

			expect(result).toBe(0);
		});
	});

	describe('getExpiringInDays vs getTerminatingInDays', () => {
		let license: License;
		const instanceSettings = mock<InstanceSettings>({
			instanceId: MOCK_INSTANCE_ID,
			instanceType: 'main',
			isLeader: true,
		});

		beforeEach(async () => {
			jest.restoreAllMocks();
			const globalConfig = mock<GlobalConfig>({
				license: licenseConfig,
				multiMainSetup: { enabled: false },
			});
			license = new License(mockLogger(), instanceSettings, mock(), mock(), globalConfig);
			await license.init();
		});

		it('should handle both dates being set independently', () => {
			License.prototype.getExpiryDate = jest.fn().mockReturnValue(makeDateWithHourOffset(72)); // 3 days
			License.prototype.getTerminationDate = jest.fn().mockReturnValue(makeDateWithHourOffset(168)); // 7 days

			const expiringDays = license.getExpiringInDays();
			const terminatingDays = license.getTerminatingInDays();

			expect(expiringDays).toBe(3);
			expect(terminatingDays).toBe(7);
		});

		it('should handle different precisions for dates', () => {
			// Expiry in 2.3 days
			License.prototype.getExpiryDate = jest.fn().mockReturnValue(makeDateWithHourOffset(55));
			// Termination in 5.7 days
			License.prototype.getTerminationDate = jest.fn().mockReturnValue(makeDateWithHourOffset(137));

			const expiringDays = license.getExpiringInDays();
			const terminatingDays = license.getTerminatingInDays();

			expect(expiringDays).toBe(3); // ceiling of 2.3
			expect(terminatingDays).toBe(6); // ceiling of 5.7
		});
	});
});

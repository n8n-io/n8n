import type { GlobalConfig } from '@n8n/config';
import { LicenseManager } from '@n8n_io/license-sdk';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import config from '@/config';
import { N8N_VERSION } from '@/constants';
import { License } from '@/license';
import { mockLogger } from '@test/mocking';

jest.mock('@n8n_io/license-sdk');

const MOCK_SERVER_URL = 'https://server.com/v1';
const MOCK_RENEW_OFFSET = 259200;
const MOCK_INSTANCE_ID = 'instance-id';
const MOCK_ACTIVATION_KEY = 'activation-key';
const MOCK_FEATURE_FLAG = 'feat:sharing';
const MOCK_MAIN_PLAN_ID = '1b765dc4-d39d-4ffe-9885-c56dd67c4b26';

const licenseConfig: GlobalConfig['license'] = {
	serverUrl: MOCK_SERVER_URL,
	autoRenewalEnabled: true,
	autoRenewOffset: MOCK_RENEW_OFFSET,
	activationKey: MOCK_ACTIVATION_KEY,
	tenantId: 1,
	cert: '',
};

describe('License', () => {
	let license: License;
	const instanceSettings = mock<InstanceSettings>({
		instanceId: MOCK_INSTANCE_ID,
		instanceType: 'main',
	});

	beforeEach(async () => {
		const globalConfig = mock<GlobalConfig>({
			license: licenseConfig,
			multiMainSetup: { enabled: false },
		});
		license = new License(mockLogger(), instanceSettings, mock(), mock(), mock(), globalConfig);
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
			mock<InstanceSettings>({ instanceType: 'worker' }),
			mock(),
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
				collectUsageMetrics: expect.any(Function),
				collectPassthroughData: expect.any(Function),
				server: MOCK_SERVER_URL,
				tenantId: 1,
			}),
		);
	});

	test('attempts to activate license with provided key', async () => {
		await license.activate(MOCK_ACTIVATION_KEY);

		expect(LicenseManager.prototype.activate).toHaveBeenCalledWith(MOCK_ACTIVATION_KEY);
	});

	test('renews license', async () => {
		await license.renew();

		expect(LicenseManager.prototype.renew).toHaveBeenCalled();
	});

	test('check if feature is enabled', () => {
		license.isFeatureEnabled(MOCK_FEATURE_FLAG);

		expect(LicenseManager.prototype.hasFeatureEnabled).toHaveBeenCalledWith(MOCK_FEATURE_FLAG);
	});

	test('check if sharing feature is enabled', () => {
		license.isFeatureEnabled(MOCK_FEATURE_FLAG);

		expect(LicenseManager.prototype.hasFeatureEnabled).toHaveBeenCalledWith(MOCK_FEATURE_FLAG);
	});

	test('check fetching entitlements', () => {
		license.getCurrentEntitlements();

		expect(LicenseManager.prototype.getCurrentEntitlements).toHaveBeenCalled();
	});

	test('check fetching feature values', async () => {
		license.getFeatureValue(MOCK_FEATURE_FLAG);

		expect(LicenseManager.prototype.getFeatureValue).toHaveBeenCalledWith(MOCK_FEATURE_FLAG);
	});

	test('check management jwt', async () => {
		license.getManagementJwt();

		expect(LicenseManager.prototype.getManagementJwt).toHaveBeenCalled();
	});

	test('getMainPlan() returns the right entitlement', async () => {
		// mock entitlements response
		License.prototype.getCurrentEntitlements = jest.fn().mockReturnValue([
			{
				id: '84a9c852-1349-478d-9ad1-b3f55510e477',
				productId: '670650f2-72d8-4397-898c-c249906e2cc2',
				productMetadata: {},
				features: {},
				featureOverrides: {},
				validFrom: new Date(),
				validTo: new Date(),
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
				validFrom: new Date(),
				validTo: new Date(),
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
				validFrom: new Date(),
				validTo: new Date(),
			},
			{
				id: 'c1aae471-c24e-4874-ad88-b97107de486c',
				productId: '670650f2-72d8-4397-898c-c249906e2cc2',
				productMetadata: {}, // has no `productMetadata.terms.isMainPlan`!
				features: {},
				featureOverrides: {},
				validFrom: new Date(),
				validTo: new Date(),
			},
		]);
		jest.fn(license.getMainPlan).mockReset();

		const mainPlan = license.getMainPlan();
		expect(mainPlan).toBeUndefined();
	});
});

describe('License', () => {
	describe('init', () => {
		describe('in single-main setup', () => {
			describe('with `license.autoRenewEnabled` enabled', () => {
				it('should enable renewal', async () => {
					const globalConfig = mock<GlobalConfig>({
						license: licenseConfig,
						multiMainSetup: { enabled: false },
					});

					await new License(
						mockLogger(),
						mock<InstanceSettings>({ instanceType: 'main' }),
						mock(),
						mock(),
						mock(),
						globalConfig,
					).init();

					expect(LicenseManager).toHaveBeenCalledWith(
						expect.objectContaining({ autoRenewEnabled: true, renewOnInit: true }),
					);
				});
			});

			describe('with `license.autoRenewEnabled` disabled', () => {
				it('should disable renewal', async () => {
					await new License(
						mockLogger(),
						mock<InstanceSettings>({ instanceType: 'main' }),
						mock(),
						mock(),
						mock(),
						mock(),
					).init();

					expect(LicenseManager).toHaveBeenCalledWith(
						expect.objectContaining({ autoRenewEnabled: false, renewOnInit: false }),
					);
				});
			});
		});

		describe('in multi-main setup', () => {
			describe('with `license.autoRenewEnabled` disabled', () => {
				test.each(['unset', 'leader', 'follower'])(
					'if %s status, should disable removal',
					async (status) => {
						const globalConfig = mock<GlobalConfig>({
							license: { ...licenseConfig, autoRenewalEnabled: false },
							multiMainSetup: { enabled: true },
						});
						config.set('multiMainSetup.instanceType', status);

						await new License(mockLogger(), mock(), mock(), mock(), mock(), globalConfig).init();

						expect(LicenseManager).toHaveBeenCalledWith(
							expect.objectContaining({ autoRenewEnabled: false, renewOnInit: false }),
						);
					},
				);
			});

			describe('with `license.autoRenewEnabled` enabled', () => {
				test.each(['unset', 'follower'])('if %s status, should disable removal', async (status) => {
					const globalConfig = mock<GlobalConfig>({
						license: { ...licenseConfig, autoRenewalEnabled: false },
						multiMainSetup: { enabled: true },
					});
					config.set('multiMainSetup.instanceType', status);

					await new License(mockLogger(), mock(), mock(), mock(), mock(), globalConfig).init();

					expect(LicenseManager).toHaveBeenCalledWith(
						expect.objectContaining({ autoRenewEnabled: false, renewOnInit: false }),
					);
				});

				it('if leader status, should enable renewal', async () => {
					const globalConfig = mock<GlobalConfig>({
						license: licenseConfig,
						multiMainSetup: { enabled: true },
					});
					config.set('multiMainSetup.instanceType', 'leader');

					await new License(mockLogger(), mock(), mock(), mock(), mock(), globalConfig).init();

					expect(LicenseManager).toHaveBeenCalledWith(
						expect.objectContaining({ autoRenewEnabled: true, renewOnInit: true }),
					);
				});
			});
		});
	});

	describe('reinit', () => {
		it('should reinitialize license manager', async () => {
			const license = new License(mockLogger(), mock(), mock(), mock(), mock(), mock());
			await license.init();

			const initSpy = jest.spyOn(license, 'init');

			await license.reinit();

			expect(initSpy).toHaveBeenCalledWith(true);

			expect(LicenseManager.prototype.reset).toHaveBeenCalled();
			expect(LicenseManager.prototype.initialize).toHaveBeenCalled();
		});
	});
});

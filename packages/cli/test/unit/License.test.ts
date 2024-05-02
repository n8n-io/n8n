import { LicenseManager } from '@n8n_io/license-sdk';
import { InstanceSettings } from 'n8n-core';
import { mock } from 'jest-mock-extended';
import config from '@/config';
import { License } from '@/License';
import { Logger } from '@/Logger';
import { N8N_VERSION } from '@/constants';
import { mockInstance } from '../shared/mocking';
import { OrchestrationService } from '@/services/orchestration.service';

jest.mock('@n8n_io/license-sdk');

const MOCK_SERVER_URL = 'https://server.com/v1';
const MOCK_RENEW_OFFSET = 259200;
const MOCK_INSTANCE_ID = 'instance-id';
const MOCK_ACTIVATION_KEY = 'activation-key';
const MOCK_FEATURE_FLAG = 'feat:sharing';
const MOCK_MAIN_PLAN_ID = '1b765dc4-d39d-4ffe-9885-c56dd67c4b26';

describe('License', () => {
	beforeAll(() => {
		config.set('license.serverUrl', MOCK_SERVER_URL);
		config.set('license.autoRenewEnabled', true);
		config.set('license.autoRenewOffset', MOCK_RENEW_OFFSET);
		config.set('license.tenantId', 1);
	});

	let license: License;
	const logger = mockInstance(Logger);
	const instanceSettings = mockInstance(InstanceSettings, { instanceId: MOCK_INSTANCE_ID });
	mockInstance(OrchestrationService);

	beforeEach(async () => {
		license = new License(logger, instanceSettings, mock(), mock(), mock());
		await license.init();
	});

	test('initializes license manager', async () => {
		expect(LicenseManager).toHaveBeenCalledWith({
			autoRenewEnabled: true,
			autoRenewOffset: MOCK_RENEW_OFFSET,
			offlineMode: false,
			renewOnInit: true,
			deviceFingerprint: expect.any(Function),
			productIdentifier: `n8n-${N8N_VERSION}`,
			logger,
			loadCertStr: expect.any(Function),
			saveCertStr: expect.any(Function),
			onFeatureChange: expect.any(Function),
			collectUsageMetrics: expect.any(Function),
			server: MOCK_SERVER_URL,
			tenantId: 1,
		});
	});

	test('initializes license manager for worker', async () => {
		license = new License(logger, instanceSettings, mock(), mock(), mock());
		await license.init('worker');
		expect(LicenseManager).toHaveBeenCalledWith({
			autoRenewEnabled: false,
			autoRenewOffset: MOCK_RENEW_OFFSET,
			offlineMode: true,
			renewOnInit: false,
			deviceFingerprint: expect.any(Function),
			productIdentifier: `n8n-${N8N_VERSION}`,
			logger,
			loadCertStr: expect.any(Function),
			saveCertStr: expect.any(Function),
			onFeatureChange: expect.any(Function),
			collectUsageMetrics: expect.any(Function),
			server: MOCK_SERVER_URL,
			tenantId: 1,
		});
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
	beforeEach(() => {
		config.load(config.default);
	});

	describe('init', () => {
		describe('in single-main setup', () => {
			describe('with `license.autoRenewEnabled` enabled', () => {
				it('should enable renewal', async () => {
					config.set('multiMainSetup.enabled', false);

					await new License(mock(), mock(), mock(), mock(), mock()).init();

					expect(LicenseManager).toHaveBeenCalledWith(
						expect.objectContaining({ autoRenewEnabled: true, renewOnInit: true }),
					);
				});
			});

			describe('with `license.autoRenewEnabled` disabled', () => {
				it('should disable renewal', async () => {
					config.set('license.autoRenewEnabled', false);

					await new License(mock(), mock(), mock(), mock(), mock()).init();

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
						config.set('multiMainSetup.enabled', true);
						config.set('multiMainSetup.instanceType', status);
						config.set('license.autoRenewEnabled', false);

						await new License(mock(), mock(), mock(), mock(), mock()).init();

						expect(LicenseManager).toHaveBeenCalledWith(
							expect.objectContaining({ autoRenewEnabled: false, renewOnInit: false }),
						);
					},
				);
			});

			describe('with `license.autoRenewEnabled` enabled', () => {
				test.each(['unset', 'follower'])('if %s status, should disable removal', async (status) => {
					config.set('multiMainSetup.enabled', true);
					config.set('multiMainSetup.instanceType', status);
					config.set('license.autoRenewEnabled', false);

					await new License(mock(), mock(), mock(), mock(), mock()).init();

					expect(LicenseManager).toHaveBeenCalledWith(
						expect.objectContaining({ autoRenewEnabled: false, renewOnInit: false }),
					);
				});

				it('if leader status, should enable renewal', async () => {
					config.set('multiMainSetup.enabled', true);
					config.set('multiMainSetup.instanceType', 'leader');

					await new License(mock(), mock(), mock(), mock(), mock()).init();

					expect(LicenseManager).toHaveBeenCalledWith(
						expect.objectContaining({ autoRenewEnabled: true, renewOnInit: true }),
					);
				});
			});
		});
	});
});

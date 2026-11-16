import type { Logger } from '@n8n/backend-common';
import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type { SettingsRepository } from '@n8n/db';
import type { TEntitlement } from '@n8n_io/license-sdk';
import { LicenseManager } from '@n8n_io/license-sdk';
import type { InstanceSettings } from 'n8n-core';
import type { MockedClass } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { N8N_VERSION } from '@/constants';
import { License } from '@/license';

vi.mock('@n8n_io/license-sdk');

const MOCK_SERVER_URL = 'https://server.com/v1';
const MOCK_RENEW_OFFSET = 259200;
const MOCK_INSTANCE_ID = 'instance-id';
const MOCK_ACTIVATION_KEY = 'activation-key';
const MOCK_FEATURE_FLAG = 'feat:sharing';
const MOCK_MAIN_PLAN_ID = '1b765dc4-d39d-4ffe-9885-c56dd67c4b26';

function makeDateWithHourOffset(offsetInHours: number): Date {
	return new Date(Date.now() + offsetInHours * 60 * 60 * 1000);
}

function makePlan(
	id: string,
	planName: string | undefined,
	startedHoursAgo: number,
	isMainPlan: boolean | undefined,
): TEntitlement {
	return {
		id,
		productId: `${id}-product`,
		productMetadata: isMainPlan === undefined ? {} : { terms: { isMainPlan } },
		features: planName ? { planName } : {},
		featureOverrides: {},
		validFrom: makeDateWithHourOffset(startedHoursAgo),
		validTo: makeDateWithHourOffset(1),
		isFloatable: false,
	};
}

// Shaped like production: neither product carries `terms`.
const enterprise = makePlan('enterprise', 'Enterprise', -2, undefined);
const registeredCommunity = makePlan('registered-community', 'Registered Community', -1, undefined);

/** Mocks the active entitlements and the SDK's merged feature value, where the newest entitlement wins. */
function mockEntitlements(license: License, entitlements: TEntitlement[]) {
	vi.spyOn(license, 'getCurrentEntitlements').mockImplementation(() => [...entitlements]);
	const merged = [...entitlements]
		.sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime())
		.reduce<Record<string, unknown>>(
			(features, e) => ({ ...features, ...e.features, ...e.featureOverrides }),
			{},
		);
	vi.spyOn(license, 'getValue').mockImplementation(
		(feature) => merged[feature] as ReturnType<License['getValue']>,
	);
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
				autoRenewTimer: false,
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
				autoRenewEnabled: true,
				autoRenewOffset: MOCK_RENEW_OFFSET,
				autoRenewTimer: false,
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

	test('passes detachFloatingOnShutdown from config in single-main', async () => {
		license = new License(
			mockLogger(),
			mock<InstanceSettings>({ instanceType: 'main', isLeader: true, isMultiMain: false }),
			mock(),
			mock(),
			mock<GlobalConfig>({ license: licenseConfig }),
		);
		await license.init();

		const calls = (LicenseManager as MockedClass<typeof LicenseManager>).mock.calls;
		expect(calls[calls.length - 1][0].detachFloatingOnShutdown).toBe(true);
	});

	test('does not detach floating entitlements on shutdown in multi-main', async () => {
		license = new License(
			mockLogger(),
			mock<InstanceSettings>({ instanceType: 'main', isLeader: true, isMultiMain: true }),
			mock(),
			mock(),
			mock<GlobalConfig>({ license: licenseConfig }),
		);
		await license.init();

		const calls = (LicenseManager as MockedClass<typeof LicenseManager>).mock.calls;
		expect(calls[calls.length - 1][0].detachFloatingOnShutdown).toBe(false);
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

	test('runs one auto-renewal pass through the SDK', async () => {
		await license.renewIfDue();

		expect(LicenseManager.prototype.renewIfDue).toHaveBeenCalledTimes(1);
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

	test('returns the ephemeral flag and device fingerprint from the license manager', () => {
		vi.mocked(LicenseManager.prototype.isEphemeral).mockReturnValueOnce(true);
		vi.mocked(LicenseManager.prototype.getDeviceFingerprint).mockReturnValueOnce('fingerprint');

		expect(license.isEphemeral()).toBe(true);
		expect(license.getDeviceFingerprint()).toBe('fingerprint');
	});

	test('returns not ephemeral and no device fingerprint before init', () => {
		const uninitialized = new License(mockLogger(), instanceSettings, mock(), mock(), mock());

		expect(uninitialized.isEphemeral()).toBe(false);
		expect(uninitialized.getDeviceFingerprint()).toBeUndefined();
	});

	test('getMainPlan() returns the latest main entitlement', async () => {
		// mock entitlements response
		License.prototype.getCurrentEntitlements = vi.fn().mockReturnValue([
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
		vi.fn(license.getMainPlan).mockReset();

		const mainPlan = license.getMainPlan();
		expect(mainPlan?.id).toBe(MOCK_MAIN_PLAN_ID);
	});

	test('getMainPlan() returns undefined if there is no main plan', async () => {
		// mock entitlements response
		License.prototype.getCurrentEntitlements = vi.fn().mockReturnValue([
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
		vi.fn(license.getMainPlan).mockReset();

		const mainPlan = license.getMainPlan();
		expect(mainPlan).toBeUndefined();
	});

	describe('isEnterprisePlan', () => {
		it.each([
			{ planName: 'Enterprise', expected: true },
			{ planName: 'Business', expected: false },
		])('returns $expected when the plan is $planName', ({ planName, expected }) => {
			vi.spyOn(license, 'getPlanName').mockReturnValue(planName);

			expect(license.isEnterprisePlan()).toBe(expected);
		});

		it('returns false when the license has no plan', () => {
			expect(license.isEnterprisePlan()).toBe(false);
		});

		it('returns true for Enterprise with a newer Registered Community entitlement', () => {
			mockEntitlements(license, [enterprise, registeredCommunity]);

			expect(license.isEnterprisePlan()).toBe(true);
		});
	});

	describe('getPlanName', () => {
		it('uses the paid plan over a newer Registered Community entitlement', () => {
			mockEntitlements(license, [enterprise, registeredCommunity]);

			expect(license.getPlanName()).toBe('Enterprise');
		});

		it('uses the newest paid plan when there are several', () => {
			const business = makePlan('business', 'Business', -3, undefined);
			mockEntitlements(license, [business, enterprise, registeredCommunity]);

			expect(license.getPlanName()).toBe('Enterprise');
		});

		it('uses a newer unmarked paid plan over an older marked main plan', () => {
			const startup = makePlan('startup', 'Startup', -3, true);
			mockEntitlements(license, [startup, enterprise, registeredCommunity]);

			expect(license.getPlanName()).toBe('Enterprise');
		});

		it('uses the only entitlement when it is marked as a main plan', () => {
			mockEntitlements(license, [makePlan('business', 'Business', -1, true)]);

			expect(license.getPlanName()).toBe('Business');
		});

		it('matches Registered Community regardless of case', () => {
			const lowercase = makePlan('rc', 'registered community', -1, undefined);
			mockEntitlements(license, [enterprise, lowercase]);

			expect(license.getPlanName()).toBe('Enterprise');
		});

		it('ignores a newer add-on that is explicitly not a main plan', () => {
			const ldapBeta = makePlan('ldap-beta', 'LDAP beta', -1, false);
			mockEntitlements(license, [enterprise, ldapBeta]);

			expect(license.getPlanName()).toBe('Enterprise');
		});

		it('skips an entitlement that names no plan', () => {
			mockEntitlements(license, [makePlan('unnamed', undefined, -2, true), registeredCommunity]);

			expect(license.getPlanName()).toBe('Registered Community');
		});

		it('falls back to the merged plan name when only Registered Community is active', () => {
			mockEntitlements(license, [registeredCommunity]);

			expect(license.getPlanName()).toBe('Registered Community');
		});

		it('prefers the feature override of the plan entitlement', () => {
			const overridden = { ...enterprise, featureOverrides: { planName: 'Enterprise Trial' } };
			mockEntitlements(license, [overridden, registeredCommunity]);

			expect(license.getPlanName()).toBe('Enterprise Trial');
		});

		it('returns Community when there are no entitlements', () => {
			mockEntitlements(license, []);

			expect(license.getPlanName()).toBe('Community');
		});

		it('returns Community when the license manager is not initialized', () => {
			const uninitialized = new License(mockLogger(), instanceSettings, mock(), mock(), mock());

			expect(uninitialized.getPlanName()).toBe('Community');
		});

		it('returns Community when the cert is invalid even though entitlements are in date', () => {
			mockEntitlements(license, [enterprise]);
			vi.spyOn(license, 'getValue').mockReturnValue(undefined);

			expect(license.getPlanName()).toBe('Community');
			expect(license.isEnterprisePlan()).toBe(false);
		});

		describe('plan name mismatch log', () => {
			let logger: ReturnType<typeof mock<Logger>>;

			beforeEach(async () => {
				logger = mock<Logger>();
				logger.scoped.mockReturnValue(logger);
				license = new License(
					logger,
					instanceSettings,
					mock(),
					mock(),
					mock<GlobalConfig>({ license: licenseConfig, multiMainSetup: { enabled: false } }),
				);
				await license.init();
			});

			it('logs a disagreement once with both plans and entitlement ids', () => {
				mockEntitlements(license, [enterprise, registeredCommunity]);

				license.getPlanName();
				license.getPlanName();
				license.getPlanName();

				expect(logger.info).toHaveBeenCalledTimes(1);
				expect(logger.info).toHaveBeenCalledWith(
					'License has another active entitlement that names a different plan',
					{
						planName: 'Enterprise',
						mergedPlanName: 'Registered Community',
						planEntitlementId: 'enterprise',
						overridingEntitlementIds: ['registered-community'],
					},
				);
			});

			it('does not log when the plans agree', () => {
				mockEntitlements(license, [enterprise]);

				license.getPlanName();

				expect(logger.info).not.toHaveBeenCalled();
			});
		});
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
			const reloadSpy = vi.spyOn(License.prototype, 'reload').mockResolvedValueOnce();
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

			const licenseManager = LicenseManager as MockedClass<typeof LicenseManager>;
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

	describe('reload-license broadcast', () => {
		const lastManagerConfig = () => {
			const { calls } = (LicenseManager as MockedClass<typeof LicenseManager>).mock;
			return calls[calls.length - 1][0];
		};

		it.each([
			{ hook: 'onLicenseRenewed', isLeader: false, mode: 'queue', publishes: true },
			{ hook: 'onLicenseRenewed', isLeader: true, mode: 'queue', publishes: true },
			{ hook: 'onLicenseRenewed', isLeader: false, mode: 'regular', publishes: false },
			{ hook: 'onFeatureChange', isLeader: true, mode: 'queue', publishes: true },
			{ hook: 'onFeatureChange', isLeader: false, mode: 'queue', publishes: false },
		] as const)(
			'$hook on a main with isLeader=$isLeader in $mode mode publishes=$publishes',
			async ({ hook, isLeader, mode, publishes }) => {
				const { Publisher } = await import('@n8n/backend-services');
				const publisher = mockInstance(Publisher, { publishCommand: vi.fn() });
				license = new License(
					mockLogger(),
					mock<InstanceSettings>({ instanceType: 'main', isLeader }),
					mock(),
					mock(),
					mock<GlobalConfig>({ license: licenseConfig, executions: { mode } }),
				);
				await license.init();

				await lastManagerConfig()[hook]!({});
				await new Promise(setImmediate);

				if (publishes) {
					expect(publisher.publishCommand).toHaveBeenCalledWith({ command: 'reload-license' });
				} else {
					expect(publisher.publishCommand).not.toHaveBeenCalled();
				}
			},
		);
	});

	describe('reload', () => {
		const lastManager = () => {
			const { instances } = (LicenseManager as MockedClass<typeof LicenseManager>).mock;
			return instances[instances.length - 1];
		};

		it('loads the stored cert and never starts the manager over', async () => {
			const callback = vi.fn();
			license.onCertRefresh(callback);

			await license.reload();

			expect(lastManager().reloadStoredCert).toHaveBeenCalledTimes(1);
			expect(lastManager().reload).not.toHaveBeenCalled();
			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('warns and skips the refresh callbacks when the stored cert cannot be read', async () => {
			const logger = mock<Logger>();
			logger.scoped.mockReturnValue(logger);
			license = new License(
				logger,
				instanceSettings,
				mock(),
				mock(),
				mock<GlobalConfig>({ license: licenseConfig, multiMainSetup: { enabled: false } }),
			);
			await license.init();
			vi.mocked(lastManager().reloadStoredCert).mockRejectedValueOnce(new Error('db down'));
			const callback = vi.fn();
			license.onCertRefresh(callback);

			await expect(license.reload()).resolves.toBeUndefined();

			expect(logger.warn).toHaveBeenCalledWith('Failed to reload the stored license cert', {
				error: 'db down',
			});
			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe('device fingerprint', () => {
		const getDeviceFingerprint = () => {
			const licenseManager = LicenseManager as MockedClass<typeof LicenseManager>;
			const calls = licenseManager.mock.calls;
			return calls[calls.length - 1][0].deviceFingerprint as () => string;
		};

		const globalConfig = mock<GlobalConfig>({
			license: licenseConfig,
			multiMainSetup: { enabled: false },
		});

		it('should use instanceId when it is at least 32 characters long', async () => {
			const longInstanceId = 'a'.repeat(64);
			const instanceSettings = mock<InstanceSettings>({
				instanceId: longInstanceId,
				derivedInstanceId: 'b'.repeat(64),
				instanceType: 'main',
				isLeader: true,
			});
			license = new License(mockLogger(), instanceSettings, mock(), mock(), globalConfig);
			await license.init();

			expect(getDeviceFingerprint()()).toEqual(longInstanceId);
		});

		it('should fall back to derivedInstanceId and warn once when instanceId is too short', async () => {
			const derivedInstanceId = 'b'.repeat(64);
			const instanceSettings = mock<InstanceSettings>({
				instanceId: 'short-id',
				derivedInstanceId,
				instanceType: 'main',
				isLeader: true,
			});
			const logger = mock<Logger>();
			logger.scoped.mockReturnValue(logger);
			license = new License(logger, instanceSettings, mock(), mock(), globalConfig);
			await license.init();

			const deviceFingerprint = getDeviceFingerprint();
			expect(deviceFingerprint()).toEqual(derivedInstanceId);
			expect(deviceFingerprint()).toEqual(derivedInstanceId);
			expect(logger.warn).toHaveBeenCalledTimes(1);
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
			vi.restoreAllMocks();
			const globalConfig = mock<GlobalConfig>({
				license: licenseConfig,
				multiMainSetup: { enabled: false },
			});
			license = new License(mockLogger(), instanceSettings, mock(), mock(), globalConfig);
			await license.init();
		});

		it('should register callback and call it on license reload', async () => {
			const callback = vi.fn();
			license.onCertRefresh(callback);

			await license.reload();

			expect(callback).toHaveBeenCalledWith('');
		});

		it('should call multiple registered callbacks', async () => {
			const callback1 = vi.fn();
			const callback2 = vi.fn();

			license.onCertRefresh(callback1);
			license.onCertRefresh(callback2);

			await license.reload();

			expect(callback1).toHaveBeenCalledTimes(1);
			expect(callback2).toHaveBeenCalledTimes(1);
		});

		it('should return unsubscribe function that removes callback', async () => {
			const callback = vi.fn();
			const unsubscribe = license.onCertRefresh(callback);

			unsubscribe();
			await license.reload();

			expect(callback).not.toHaveBeenCalled();
		});

		it('should continue calling other callbacks if one throws', async () => {
			const errorCallback = vi.fn().mockImplementation(() => {
				throw new Error('Callback error');
			});
			const callback2 = vi.fn();

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

			const callback = vi.fn();
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
		])(
			'$scenario, should renew on init only as leader with auto-renewal on',
			async ({ isLeader, autoRenewalEnabled }) => {
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

				expect(LicenseManager).toHaveBeenCalledWith(
					expect.objectContaining({
						autoRenewEnabled: autoRenewalEnabled,
						renewOnInit: isLeader && autoRenewalEnabled,
					}),
				);
			},
		);

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
			vi.restoreAllMocks();
			const globalConfig = mock<GlobalConfig>({
				license: licenseConfig,
				multiMainSetup: { enabled: false },
			});
			license = new License(mockLogger(), instanceSettings, mock(), mock(), globalConfig);
			await license.init();
		});

		it('should return number of days until expiry for future date', () => {
			License.prototype.getExpiryDate = vi.fn().mockReturnValue(makeDateWithHourOffset(72)); // 3 days

			const result = license.getExpiringInDays();

			expect(result).toBe(3);
		});

		it('should return 0 for already expired licenses', () => {
			License.prototype.getExpiryDate = vi.fn().mockReturnValue(makeDateWithHourOffset(-24)); // 1 day ago

			const result = license.getExpiringInDays();

			expect(result).toBe(0);
		});

		it('should return undefined when no expiry date exists', () => {
			License.prototype.getExpiryDate = vi.fn().mockReturnValue(null);

			const result = license.getExpiringInDays();

			expect(result).toBeUndefined();
		});

		it('should handle exactly 0 hours remaining', () => {
			const now = new Date();
			License.prototype.getExpiryDate = vi.fn().mockReturnValue(now);

			const result = license.getExpiringInDays();

			expect(result).toBe(0);
		});

		it('should handle dates far in the future', () => {
			License.prototype.getExpiryDate = vi.fn().mockReturnValue(makeDateWithHourOffset(365 * 24)); // 1 year

			const result = license.getExpiringInDays();

			expect(result).toBe(365);
		});

		it('should handle fractional days by ceiling', () => {
			License.prototype.getExpiryDate = vi.fn().mockReturnValue(makeDateWithHourOffset(37)); // 1.5+ days

			const result = license.getExpiringInDays();

			expect(result).toBe(2); // ceiling of 1.5 is 2
		});

		it('should handle invalid date (NaN)', () => {
			const invalidDate = new Date('invalid');
			License.prototype.getExpiryDate = vi.fn().mockReturnValue(invalidDate);

			const result = license.getExpiringInDays();

			expect(result).toBeUndefined();
		});

		it('should return maximum 0 for negative day differences', () => {
			License.prototype.getExpiryDate = vi.fn().mockReturnValue(makeDateWithHourOffset(-100)); // 4+ days ago

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
			vi.restoreAllMocks();
			const globalConfig = mock<GlobalConfig>({
				license: licenseConfig,
				multiMainSetup: { enabled: false },
			});
			license = new License(mockLogger(), instanceSettings, mock(), mock(), globalConfig);
			await license.init();
		});

		it('should return number of days until termination for future date', () => {
			License.prototype.getTerminationDate = vi.fn().mockReturnValue(makeDateWithHourOffset(48)); // 2 days

			const result = license.getTerminatingInDays();

			expect(result).toBe(2);
		});

		it('should return 0 for already terminated licenses', () => {
			License.prototype.getTerminationDate = vi.fn().mockReturnValue(makeDateWithHourOffset(-48)); // 2 days ago

			const result = license.getTerminatingInDays();

			expect(result).toBe(0);
		});

		it('should return undefined when no termination date exists', () => {
			License.prototype.getTerminationDate = vi.fn().mockReturnValue(null);

			const result = license.getTerminatingInDays();

			expect(result).toBeUndefined();
		});

		it('should handle exactly 0 hours until termination', () => {
			const now = new Date();
			License.prototype.getTerminationDate = vi.fn().mockReturnValue(now);

			const result = license.getTerminatingInDays();

			expect(result).toBe(0);
		});

		it('should handle termination dates far in the future', () => {
			License.prototype.getTerminationDate = vi
				.fn()
				.mockReturnValue(makeDateWithHourOffset(720 * 24)); // 2 years

			const result = license.getTerminatingInDays();

			expect(result).toBe(720);
		});

		it('should handle fractional days by ceiling', () => {
			License.prototype.getTerminationDate = vi.fn().mockReturnValue(makeDateWithHourOffset(13)); // 0.5+ days

			const result = license.getTerminatingInDays();

			expect(result).toBe(1); // ceiling of 0.5 is 1
		});

		it('should handle invalid date (NaN)', () => {
			const invalidDate = new Date('invalid');
			License.prototype.getTerminationDate = vi.fn().mockReturnValue(invalidDate);

			const result = license.getTerminatingInDays();

			expect(result).toBeUndefined();
		});

		it('should return maximum 0 for negative day differences', () => {
			License.prototype.getTerminationDate = vi.fn().mockReturnValue(makeDateWithHourOffset(-200)); // 8+ days ago

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
			vi.restoreAllMocks();
			const globalConfig = mock<GlobalConfig>({
				license: licenseConfig,
				multiMainSetup: { enabled: false },
			});
			license = new License(mockLogger(), instanceSettings, mock(), mock(), globalConfig);
			await license.init();
		});

		it('should handle both dates being set independently', () => {
			License.prototype.getExpiryDate = vi.fn().mockReturnValue(makeDateWithHourOffset(72)); // 3 days
			License.prototype.getTerminationDate = vi.fn().mockReturnValue(makeDateWithHourOffset(168)); // 7 days

			const expiringDays = license.getExpiringInDays();
			const terminatingDays = license.getTerminatingInDays();

			expect(expiringDays).toBe(3);
			expect(terminatingDays).toBe(7);
		});

		it('should handle different precisions for dates', () => {
			// Expiry in 2.3 days
			License.prototype.getExpiryDate = vi.fn().mockReturnValue(makeDateWithHourOffset(55));
			// Termination in 5.7 days
			License.prototype.getTerminationDate = vi.fn().mockReturnValue(makeDateWithHourOffset(137));

			const expiringDays = license.getExpiringInDays();
			const terminatingDays = license.getTerminatingInDays();

			expect(expiringDays).toBe(3); // ceiling of 2.3
			expect(terminatingDays).toBe(6); // ceiling of 5.7
		});
	});
});

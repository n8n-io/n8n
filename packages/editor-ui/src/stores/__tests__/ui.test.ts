import { createPinia, setActivePinia } from 'pinia';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore, useUsersStore } from '@/stores/settings.store';
import { merge } from 'lodash-es';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import * as cloudPlanApi from '@/api/cloudPlans';
import {
	getTrialExpiredUserResponse,
	getTrialingUserResponse,
	getUserCloudInfo,
	getNotTrialingUserResponse,
} from './utils/cloudStoreUtils';
import type { IRole } from '@/Interface';

let uiStore: ReturnType<typeof useUIStore>;
let settingsStore: ReturnType<typeof useSettingsStore>;
let rootStore: ReturnType<typeof useRootStore>;
let cloudPlanStore: ReturnType<typeof useCloudPlanStore>;

function setUser(role: IRole) {
	useUsersStore().addUsers([
		{
			id: '1',
			isPending: false,
			globalRole: {
				id: '1',
				name: role,
				createdAt: new Date(),
			},
		},
	]);

	useUsersStore().currentUserId = '1';
}

function setupOwnerAndCloudDeployment() {
	setUser('owner');
	settingsStore.setSettings(
		merge({}, SETTINGS_STORE_DEFAULT_STATE.settings, {
			n8nMetadata: {
				userId: '1',
			},
			deployment: { type: 'cloud' },
		}),
	);
}

describe('UI store', () => {
	let mockedCloudStore;

	beforeEach(() => {
		setActivePinia(createPinia());
		uiStore = useUIStore();
		settingsStore = useSettingsStore();
		rootStore = useRootStore();
		cloudPlanStore = useCloudPlanStore();

		mockedCloudStore = vi.spyOn(cloudPlanStore, 'getAutoLoginCode');
		mockedCloudStore.mockImplementationOnce(async () => ({
			code: '123',
		}));

		global.window = Object.create(window);

		const url = 'https://test.app.n8n.cloud';

		Object.defineProperty(window, 'location', {
			value: {
				href: url,
			},
			writable: true,
		});
	});

	test.each([
		[
			'default',
			'production',
			'owner',
			'https://n8n.io/pricing?utm_campaign=utm-test-campaign&source=test_source',
		],
		[
			'default',
			'development',
			'owner',
			'https://n8n.io/pricing?utm_campaign=utm-test-campaign&source=test_source',
		],
		[
			'cloud',
			'production',
			'owner',
			`https://app.n8n.cloud/login?code=123&returnPath=${encodeURIComponent(
				'/account/change-plan',
			)}&utm_campaign=utm-test-campaign&source=test_source`,
		],
		[
			'cloud',
			'production',
			'member',
			'https://n8n.io/pricing?utm_campaign=utm-test-campaign&source=test_source',
		],
	])(
		'"upgradeLinkUrl" should generate the correct URL for "%s" deployment and "%s" license environment and user role "%s"',
		async (type, environment, role, expectation) => {
			setUser(role as IRole);

			settingsStore.setSettings(
				merge({}, SETTINGS_STORE_DEFAULT_STATE.settings, {
					deployment: {
						type,
					},
					license: {
						environment,
					},
					instanceId: '123abc',
					versionCli: '0.223.0',
				}),
			);

			const updateLinkUrl = await uiStore.upgradeLinkUrl('test_source', 'utm-test-campaign', type);

			expect(updateLinkUrl).toBe(expectation);
		},
	);

	it('should add non-production license banner to stack based on enterprise settings', () => {
		settingsStore.setSettings(
			merge({}, SETTINGS_STORE_DEFAULT_STATE.settings, {
				enterprise: {
					showNonProdBanner: true,
				},
			}),
		);
		expect(uiStore.bannerStack).toContain('NON_PRODUCTION_LICENSE');
	});

	it("should add V1 banner to stack if it's not dismissed", () => {
		settingsStore.setSettings(
			merge({}, SETTINGS_STORE_DEFAULT_STATE.settings, {
				versionCli: '1.0.0',
			}),
		);
		expect(uiStore.bannerStack).toContain('V1');
	});

	it("should not add V1 banner to stack if it's dismissed", () => {
		settingsStore.setSettings(
			merge({}, SETTINGS_STORE_DEFAULT_STATE.settings, {
				versionCli: '1.0.0',
				banners: {
					dismissed: ['V1'],
				},
			}),
		);
		expect(uiStore.bannerStack).not.toContain('V1');
	});

	it('should add trial banner to the the stack', async () => {
		const fetchCloudSpy = vi
			.spyOn(cloudPlanApi, 'getCurrentPlan')
			.mockResolvedValue(getTrialingUserResponse());
		const fetchUserCloudAccountSpy = vi
			.spyOn(cloudPlanApi, 'getCloudUserInfo')
			.mockResolvedValue(getUserCloudInfo(true));
		setupOwnerAndCloudDeployment();
		await cloudPlanStore.checkForCloudPlanData();
		await cloudPlanStore.fetchUserCloudAccount();
		expect(fetchCloudSpy).toHaveBeenCalled();
		expect(fetchUserCloudAccountSpy).toHaveBeenCalled();
		expect(uiStore.bannerStack).toContain('TRIAL');
		// There should be no email confirmation banner for trialing users
		expect(uiStore.bannerStack).not.toContain('EMAIL_CONFIRMATION');
	});

	it('should add trial over banner to the the stack', async () => {
		const fetchCloudSpy = vi
			.spyOn(cloudPlanApi, 'getCurrentPlan')
			.mockResolvedValue(getTrialExpiredUserResponse());
		const fetchUserCloudAccountSpy = vi
			.spyOn(cloudPlanApi, 'getCloudUserInfo')
			.mockResolvedValue(getUserCloudInfo(true));
		setupOwnerAndCloudDeployment();
		await cloudPlanStore.checkForCloudPlanData();
		await cloudPlanStore.fetchUserCloudAccount();
		expect(fetchCloudSpy).toHaveBeenCalled();
		expect(fetchUserCloudAccountSpy).toHaveBeenCalled();
		expect(uiStore.bannerStack).toContain('TRIAL_OVER');
		// There should be no email confirmation banner for trialing users
		expect(uiStore.bannerStack).not.toContain('EMAIL_CONFIRMATION');
	});

	it('should add email confirmation banner to the the stack', async () => {
		const fetchCloudSpy = vi
			.spyOn(cloudPlanApi, 'getCurrentPlan')
			.mockResolvedValue(getNotTrialingUserResponse());
		const fetchUserCloudAccountSpy = vi
			.spyOn(cloudPlanApi, 'getCloudUserInfo')
			.mockResolvedValue(getUserCloudInfo(false));
		setupOwnerAndCloudDeployment();
		await cloudPlanStore.checkForCloudPlanData();
		await cloudPlanStore.fetchUserCloudAccount();
		expect(fetchCloudSpy).toHaveBeenCalled();
		expect(fetchUserCloudAccountSpy).toHaveBeenCalled();
		expect(uiStore.bannerStack).toContain('EMAIL_CONFIRMATION');
	});
});

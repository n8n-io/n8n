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
} from './utils/cloudStoreUtils';

let uiStore: ReturnType<typeof useUIStore>;
let settingsStore: ReturnType<typeof useSettingsStore>;
let rootStore: ReturnType<typeof useRootStore>;
let cloudPlanStore: ReturnType<typeof useCloudPlanStore>;

function setOwnerUser() {
	useUsersStore().addUsers([
		{
			id: '1',
			isPending: false,
			globalRole: {
				id: '1',
				name: 'owner',
				createdAt: new Date(),
			},
		},
	]);

	useUsersStore().currentUserId = '1';
}

function setupOwnerAndCloudDeployment() {
	setOwnerUser();
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
	beforeEach(() => {
		setActivePinia(createPinia());
		uiStore = useUIStore();
		settingsStore = useSettingsStore();
		rootStore = useRootStore();
		cloudPlanStore = useCloudPlanStore();
	});

	test.each([
		['default', 'production', 'https://n8n.io/pricing/?ref=test_source'],
		['default', 'development', 'https://n8n.io/pricing/?ref=test_source'],
		[
			'desktop_win',
			'production',
			'https://n8n.io/pricing/?utm_source=n8n-internal&utm_medium=desktop&utm_campaign=utm-test-campaign',
		],
		['cloud', 'production', 'https://app.n8n.cloud/account/change-plan'],
	])(
		'"upgradeLinkUrl" should generate the correct URL for "%s" deployment and "%s" license environment',
		(type, environment, expectation) => {
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

			expect(uiStore.upgradeLinkUrl('test_source', 'utm-test-campaign')).toBe(expectation);
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
	});

	it('should add email confirmation banner to the the stack', async () => {
		const fetchCloudSpy = vi
			.spyOn(cloudPlanApi, 'getCurrentPlan')
			.mockResolvedValue(getTrialExpiredUserResponse());
		const fetchUserCloudAccountSpy = vi
			.spyOn(cloudPlanApi, 'getCloudUserInfo')
			.mockResolvedValue(getUserCloudInfo(false));
		setupOwnerAndCloudDeployment();
		await cloudPlanStore.checkForCloudPlanData();
		await cloudPlanStore.fetchUserCloudAccount();
		expect(fetchCloudSpy).toHaveBeenCalled();
		expect(fetchUserCloudAccountSpy).toHaveBeenCalled();
		expect(uiStore.bannerStack).toContain('TRIAL_OVER');
		expect(uiStore.bannerStack).toContain('EMAIL_CONFIRMATION');
	});
});

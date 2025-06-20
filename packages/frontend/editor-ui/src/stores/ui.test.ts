import { createPinia, setActivePinia } from 'pinia';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import merge from 'lodash/merge';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import * as cloudPlanApi from '@n8n/rest-api-client/api/cloudPlans';
import { defaultSettings } from '../__tests__/defaults';
import {
	getTrialExpiredUserResponse,
	getTrialingUserResponse,
	getUserCloudInfo,
	getNotTrialingUserResponse,
} from './__tests__/utils/cloudStoreUtils';
import { ROLE, type Role } from '@n8n/api-types';

let uiStore: ReturnType<typeof useUIStore>;
let settingsStore: ReturnType<typeof useSettingsStore>;
let cloudPlanStore: ReturnType<typeof useCloudPlanStore>;

function setUser(role: Role) {
	useUsersStore().addUsers([
		{
			id: '1',
			isPending: false,
			role,
		},
	]);

	useUsersStore().currentUserId = '1';
}

function setupOwnerAndCloudDeployment() {
	setUser(ROLE.Owner);
	settingsStore.setSettings(
		merge({}, defaultSettings, {
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

	it('should add non-production license banner to stack based on enterprise settings', () => {
		uiStore.initialize({
			banners: ['NON_PRODUCTION_LICENSE'],
		});
		expect(uiStore.bannerStack).toContain('NON_PRODUCTION_LICENSE');
	});

	it("should add V1 banner to stack if it's not dismissed", () => {
		uiStore.initialize({
			banners: ['V1'],
		});
		expect(uiStore.bannerStack).toContain('V1');
	});

	it("should not add V1 banner to stack if it's dismissed", () => {
		uiStore.initialize({
			banners: [],
		});

		expect(uiStore.bannerStack).not.toContain('V1');
	});

	it('should add trial banner to the the stack', async () => {
		const fetchCloudSpy = vi
			.spyOn(cloudPlanApi, 'getCurrentPlan')
			.mockResolvedValue(getTrialingUserResponse());
		const fetchUserCloudAccountSpy = vi
			.spyOn(cloudPlanApi, 'getCloudUserInfo')
			.mockResolvedValue(getUserCloudInfo(true));
		const getCurrentUsageSpy = vi
			.spyOn(cloudPlanApi, 'getCurrentUsage')
			.mockResolvedValue({ executions: 1000, activeWorkflows: 100 });
		setupOwnerAndCloudDeployment();
		await cloudPlanStore.checkForCloudPlanData();
		await cloudPlanStore.fetchUserCloudAccount();
		expect(fetchCloudSpy).toHaveBeenCalled();
		expect(fetchUserCloudAccountSpy).toHaveBeenCalled();
		expect(getCurrentUsageSpy).toHaveBeenCalled();
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
		const getCurrentUsageSpy = vi
			.spyOn(cloudPlanApi, 'getCurrentUsage')
			.mockResolvedValue({ executions: 1000, activeWorkflows: 100 });
		setupOwnerAndCloudDeployment();
		await cloudPlanStore.checkForCloudPlanData();
		await cloudPlanStore.fetchUserCloudAccount();
		expect(fetchCloudSpy).toHaveBeenCalled();
		expect(fetchUserCloudAccountSpy).toHaveBeenCalled();
		expect(getCurrentUsageSpy).toHaveBeenCalled();
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

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
});

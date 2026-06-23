import { createPinia, setActivePinia } from 'pinia';
import { useBannersStore } from '@/features/shared/banners/banners.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import * as dynamicBannersApi from '@n8n/rest-api-client/api/dynamic-banners';
import { useUsersStore } from '@/features/settings/users/users.store';

let bannersStore: ReturnType<typeof useBannersStore>;
let settingsStore: ReturnType<typeof useSettingsStore>;
let usersStore: ReturnType<typeof useUsersStore>;

describe('Banners store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		bannersStore = useBannersStore();
		settingsStore = useSettingsStore();
		usersStore = useUsersStore();

		// Set up settings store with required configuration
		settingsStore.settings = {
			dynamicBanners: {
				endpoint: 'https://test.endpoint.com',
				enabled: false,
				filters: {
					publishedWorkflowCount: 0,
				},
			},
			banners: {
				dismissed: [],
			},
		} as unknown as typeof settingsStore.settings;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should add non-production license banner to stack based on enterprise settings', () => {
		bannersStore.loadStaticBanners({
			banners: ['NON_PRODUCTION_LICENSE'],
		});
		expect(bannersStore.bannerStack).toContain('NON_PRODUCTION_LICENSE');
	});

	it("should add V1 banner to stack if it's not dismissed", () => {
		bannersStore.loadStaticBanners({
			banners: ['V1'],
		});
		expect(bannersStore.bannerStack).toContain('V1');
	});

	it("should not add V1 banner to stack if it's dismissed", () => {
		bannersStore.loadStaticBanners({
			banners: [],
		});

		expect(bannersStore.bannerStack).not.toContain('V1');
	});

	it('should not add dismissed dynamic banners to stack', async () => {
		setActivePinia(createPinia());

		const freshBannersStore = useBannersStore();
		const mockDynamicBanners = [
			{
				id: '1',
				content: 'Test banner 1',
				isDismissible: true,
				dismissPermanently: null,
				theme: 'info' as const,
				priority: 1,
			},
			{
				id: '2',
				content: 'Test banner 2',
				isDismissible: true,
				dismissPermanently: null,
				theme: 'warning' as const,
				priority: 2,
			},
			{
				id: '3',
				content: 'Test banner 3',
				isDismissible: true,
				dismissPermanently: null,
				theme: 'danger' as const,
				priority: 3,
			},
		];
		vi.spyOn(dynamicBannersApi, 'getDynamicBanners').mockResolvedValue(mockDynamicBanners);

		const freshSettingsStore = useSettingsStore();
		freshSettingsStore.settings = {
			dynamicBanners: {
				endpoint: 'https://test.endpoint.com',
				enabled: true,
				filters: {
					publishedWorkflowCount: 2,
				},
			},
			banners: {
				dismissed: ['dynamic-banner-2'],
			},
		} as unknown as typeof freshSettingsStore.settings;

		await freshBannersStore.loadDynamicBanners();

		await vi.waitFor(() => {
			expect(freshBannersStore.bannerStack.length).toBeGreaterThan(0);
		});

		expect(freshBannersStore.bannerStack).toContain('dynamic-banner-1');
		expect(freshBannersStore.bannerStack).toContain('dynamic-banner-3');

		expect(freshBannersStore.bannerStack).not.toContain('dynamic-banner-2');
	});

	it('should send dynamic banner filters as flat query params', async () => {
		const getDynamicBannersSpy = vi
			.spyOn(dynamicBannersApi, 'getDynamicBanners')
			.mockResolvedValue([]);

		settingsStore.settings = {
			versionCli: '1.2.3',
			deployment: { type: 'cloud' },
			instanceId: 'instance-id',
			license: { planName: 'Pro' },
			dynamicBanners: {
				endpoint: 'https://test.endpoint.com',
				enabled: true,
				filters: {
					publishedWorkflowCount: 4,
				},
			},
			banners: {
				dismissed: [],
			},
		} as unknown as typeof settingsStore.settings;
		usersStore.addUsers([{ id: 'current-user-id' }]);
		usersStore.currentUserId = 'current-user-id';

		await bannersStore.loadDynamicBanners();

		expect(getDynamicBannersSpy).toHaveBeenCalledWith(
			'https://test.endpoint.com',
			expect.objectContaining({
				version: '1.2.3',
				deploymentType: 'cloud',
				instanceId: 'instance-id',
				planName: 'Pro',
				userId: 'current-user-id',
				publishedWorkflowCount: 4,
			}),
		);
	});
});

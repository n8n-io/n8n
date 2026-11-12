import { createPinia, setActivePinia } from 'pinia';
import { useBannersStore } from '@/features/shared/banners/banners.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import * as dynamicBannersApi from '@n8n/rest-api-client/api/dynamic-banners';
import * as restApiClient from '@n8n/rest-api-client';
import { useUsersStore } from '@n8n/stores/users.store';

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
				dismissed: [],
			},
		} as unknown as typeof freshSettingsStore.settings;
		const freshUsersStore = useUsersStore();
		freshUsersStore.addUsers([{ id: 'user-1' } as never]);
		freshUsersStore.currentUserId = 'user-1';
		localStorage.setItem(
			'N8N_DISMISSED_DYNAMIC_BANNERS_user-1',
			JSON.stringify(['dynamic-banner-2', 'dynamic-banner-gone']),
		);

		await freshBannersStore.loadDynamicBanners();

		await vi.waitFor(() => {
			expect(freshBannersStore.bannerStack.length).toBeGreaterThan(0);
		});

		expect(freshBannersStore.bannerStack).toContain('dynamic-banner-1');
		expect(freshBannersStore.bannerStack).toContain('dynamic-banner-3');

		expect(freshBannersStore.bannerStack).not.toContain('dynamic-banner-2');
		// Dismissals of banners that no longer exist are cleaned up
		expect(localStorage.getItem('N8N_DISMISSED_DYNAMIC_BANNERS_user-1')).toBe(
			JSON.stringify(['dynamic-banner-2']),
		);
	});

	it('should store a permanent dynamic banner dismissal per user without calling the API', async () => {
		vi.spyOn(dynamicBannersApi, 'getDynamicBanners').mockResolvedValue([
			{
				id: '1',
				content: 'Test',
				isDismissible: true,
				dismissPermanently: true,
				theme: 'info' as const,
				priority: 1,
			},
		]);
		settingsStore.settings.dynamicBanners.enabled = true;
		usersStore.addUsers([{ id: 'user-2' } as never]);
		usersStore.currentUserId = 'user-2';
		await bannersStore.loadDynamicBanners();

		await bannersStore.dismissBanner('dynamic-banner-1', 'permanent');

		expect(bannersStore.bannerStack).not.toContain('dynamic-banner-1');
		expect(localStorage.getItem('N8N_DISMISSED_DYNAMIC_BANNERS_user-2')).toBe(
			JSON.stringify(['dynamic-banner-1']),
		);
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

	it('should still close a permanent dynamic banner when storage is unavailable', async () => {
		vi.spyOn(dynamicBannersApi, 'getDynamicBanners').mockResolvedValue([
			{
				id: '1',
				content: 'Test',
				isDismissible: true,
				dismissPermanently: true,
				theme: 'info' as const,
				priority: 1,
			},
		]);
		settingsStore.settings.dynamicBanners.enabled = true;
		usersStore.addUsers([{ id: 'user-3' } as never]);
		usersStore.currentUserId = 'user-3';
		await bannersStore.loadDynamicBanners();
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('quota exceeded');
		});

		await expect(
			bannersStore.dismissBanner('dynamic-banner-1', 'permanent'),
		).resolves.not.toThrow();

		expect(bannersStore.bannerStack).not.toContain('dynamic-banner-1');
	});

	it('should keep stored dismissals when the banner fetch fails', async () => {
		vi.spyOn(dynamicBannersApi, 'getDynamicBanners').mockRejectedValue(new Error('network'));
		vi.spyOn(console, 'error').mockImplementation(() => {});
		settingsStore.settings.dynamicBanners.enabled = true;
		usersStore.addUsers([{ id: 'user-4' } as never]);
		usersStore.currentUserId = 'user-4';
		localStorage.setItem(
			'N8N_DISMISSED_DYNAMIC_BANNERS_user-4',
			JSON.stringify(['dynamic-banner-1']),
		);

		await bannersStore.loadDynamicBanners();

		expect(localStorage.getItem('N8N_DISMISSED_DYNAMIC_BANNERS_user-4')).toBe(
			JSON.stringify(['dynamic-banner-1']),
		);
	});

	it('should keep dismissals separate for each user', async () => {
		vi.spyOn(dynamicBannersApi, 'getDynamicBanners').mockResolvedValue([
			{
				id: '1',
				content: 'Test',
				isDismissible: true,
				dismissPermanently: true,
				theme: 'info' as const,
				priority: 1,
			},
		]);
		settingsStore.settings.dynamicBanners.enabled = true;
		usersStore.addUsers([{ id: 'user-a' } as never, { id: 'user-b' } as never]);
		usersStore.currentUserId = 'user-a';
		await bannersStore.loadDynamicBanners();
		await bannersStore.dismissBanner('dynamic-banner-1', 'permanent');

		bannersStore.clearBannerStack();
		usersStore.currentUserId = 'user-b';
		await bannersStore.loadDynamicBanners();

		expect(bannersStore.bannerStack).toContain('dynamic-banner-1');
	});

	it('should keep hiding dynamic banners that were dismissed instance-wide before', async () => {
		vi.spyOn(dynamicBannersApi, 'getDynamicBanners').mockResolvedValue([
			{
				id: '1',
				content: 'Test',
				isDismissible: true,
				dismissPermanently: true,
				theme: 'info' as const,
				priority: 1,
			},
		]);
		settingsStore.settings.dynamicBanners.enabled = true;
		settingsStore.settings.banners.dismissed = ['dynamic-banner-1'];
		usersStore.addUsers([{ id: 'user-5' } as never]);
		usersStore.currentUserId = 'user-5';

		await bannersStore.loadDynamicBanners();

		expect(bannersStore.bannerStack).not.toContain('dynamic-banner-1');
	});

	it('should ignore a banner response that arrives after another user signed in', async () => {
		let resolveFetch: (banners: dynamicBannersApi.DynamicBanner[]) => void = () => {};
		vi.spyOn(dynamicBannersApi, 'getDynamicBanners').mockReturnValue(
			new Promise((resolve) => {
				resolveFetch = resolve;
			}),
		);
		settingsStore.settings.dynamicBanners.enabled = true;
		usersStore.addUsers([{ id: 'user-c' } as never, { id: 'user-d' } as never]);
		usersStore.currentUserId = 'user-c';
		localStorage.setItem(
			'N8N_DISMISSED_DYNAMIC_BANNERS_user-d',
			JSON.stringify(['dynamic-banner-1']),
		);

		const pending = bannersStore.loadDynamicBanners();
		usersStore.currentUserId = 'user-d';
		resolveFetch([]);
		await pending;

		expect(bannersStore.bannerStack).toEqual([]);
		expect(localStorage.getItem('N8N_DISMISSED_DYNAMIC_BANNERS_user-d')).toBe(
			JSON.stringify(['dynamic-banner-1']),
		);
	});

	it.each([['invalid json'], ['{"a":1}'], ['[1,"dynamic-banner-1"]']])(
		'should ignore unusable stored dismissals: %s',
		async (stored) => {
			vi.spyOn(dynamicBannersApi, 'getDynamicBanners').mockResolvedValue([
				{
					id: '1',
					content: 'Test',
					isDismissible: true,
					dismissPermanently: true,
					theme: 'info' as const,
					priority: 1,
				},
			]);
			settingsStore.settings.dynamicBanners.enabled = true;
			usersStore.addUsers([{ id: 'user-6' } as never]);
			usersStore.currentUserId = 'user-6';
			localStorage.setItem('N8N_DISMISSED_DYNAMIC_BANNERS_user-6', stored);

			await bannersStore.loadDynamicBanners();

			// Only a valid string entry can hide a banner.
			expect(bannersStore.bannerStack).toEqual(
				stored.includes('dynamic-banner-1') ? [] : ['dynamic-banner-1'],
			);
		},
	);

	it('should not fetch dynamic banners when they are disabled', async () => {
		const getDynamicBannersSpy = vi.spyOn(dynamicBannersApi, 'getDynamicBanners');

		await bannersStore.loadDynamicBanners();

		expect(getDynamicBannersSpy).not.toHaveBeenCalled();
		expect(bannersStore.bannerStack).toEqual([]);
	});

	it('should save a permanent dismissal of a static banner on the server', async () => {
		const dismissSpy = vi.spyOn(restApiClient, 'dismissBannerPermanently').mockResolvedValue();
		bannersStore.loadStaticBanners({ banners: ['V1'] });

		await bannersStore.dismissBanner('V1', 'permanent');

		expect(dismissSpy).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ bannerName: 'V1' }),
		);
		expect(bannersStore.bannerStack).not.toContain('V1');
	});

	it('should only remove a banner from the stack on a temporary dismissal', async () => {
		const dismissSpy = vi.spyOn(restApiClient, 'dismissBannerPermanently');
		bannersStore.loadStaticBanners({ banners: ['V1'] });

		await bannersStore.dismissBanner('V1');

		expect(dismissSpy).not.toHaveBeenCalled();
		expect(bannersStore.bannerStack).not.toContain('V1');
	});
});

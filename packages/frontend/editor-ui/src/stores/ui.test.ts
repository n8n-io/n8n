import { createPinia, setActivePinia } from 'pinia';
import { useUIStore } from '@/stores/ui.store';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { useDynamicBannersStore } from '@/stores/dynamic-banners.store';
import { useSettingsStore } from '@/stores/settings.store';

let uiStore: ReturnType<typeof useUIStore>;
let cloudPlanStore: ReturnType<typeof useCloudPlanStore>;
let settingsStore: ReturnType<typeof useSettingsStore>;

describe('UI store', () => {
	let mockedCloudStore;

	beforeEach(() => {
		setActivePinia(createPinia());
		uiStore = useUIStore();

		cloudPlanStore = useCloudPlanStore();
		settingsStore = useSettingsStore();

		// Set up settings store with required configuration
		settingsStore.settings = {
			dynamicBanners: {
				endpoint: 'https://test.endpoint.com',
				enabled: false,
			},
			banners: {
				dismissed: [],
			},
		} as unknown as typeof settingsStore.settings;

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

	it('should not add dismissed dynamic banners to stack', async () => {
		setActivePinia(createPinia());

		const freshDynamicBannersStore = useDynamicBannersStore();
		const mockDynamicBanners = [
			{
				id: 'dynamic-banner-1',
				content: 'Test banner 1',
				isDismissible: true,
				dismissPermanently: null,
				theme: 'info' as const,
				priority: 1,
			},
			{
				id: 'dynamic-banner-2',
				content: 'Test banner 2',
				isDismissible: true,
				dismissPermanently: null,
				theme: 'warning' as const,
				priority: 2,
			},
			{
				id: 'dynamic-banner-3',
				content: 'Test banner 3',
				isDismissible: true,
				dismissPermanently: null,
				theme: 'danger' as const,
				priority: 3,
			},
		];
		vi.spyOn(freshDynamicBannersStore, 'fetch').mockResolvedValue(mockDynamicBanners);

		const freshSettingsStore = useSettingsStore();
		freshSettingsStore.settings = {
			dynamicBanners: {
				endpoint: 'https://test.endpoint.com',
				enabled: true,
			},
			banners: {
				dismissed: ['dynamic-banner-2'],
			},
		} as unknown as typeof freshSettingsStore.settings;

		const freshUiStore = useUIStore();

		freshUiStore.initialize({
			banners: [],
		});

		await vi.waitFor(() => {
			expect(freshUiStore.bannerStack.length).toBeGreaterThan(0);
		});

		expect(freshUiStore.bannerStack).toContain('dynamic-banner-1');
		expect(freshUiStore.bannerStack).toContain('dynamic-banner-3');

		expect(freshUiStore.bannerStack).not.toContain('dynamic-banner-2');
	});
});

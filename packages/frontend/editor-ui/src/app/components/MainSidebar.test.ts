import { reactive } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { defaultSettings } from '@n8n/frontend-test-utils';
import MainSidebar from '@/app/components/MainSidebar.vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useVersionsStore } from '@n8n/stores/versions.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { usePersonalizedTemplatesV2Store } from '@/experiments/templateRecoV2/stores/templateRecoV2.store';
import { usePersonalizedTemplatesV3Store } from '@/experiments/personalizedTemplatesV3/stores/personalizedTemplatesV3.store';

const routerPushMock = vi.hoisted(() => vi.fn());
const canUserAccessRouteByNameMock = vi.hoisted(() => vi.fn((_name: string) => true));

vi.mock('vue-router', () => ({
	useRouter: () => ({
		resolve: vi.fn(() => ({ meta: {} })),
		push: routerPushMock,
	}),
	useRoute: () => reactive({ params: {} }),
	RouterLink: vi.fn(),
}));

vi.mock('@/app/composables/useUserHelpers', () => ({
	useUserHelpers: () => ({ canUserAccessRouteByName: canUserAccessRouteByNameMock }),
}));

let renderComponent: ReturnType<typeof createComponentRenderer>;
let settingsStore: MockedStore<typeof useSettingsStore>;
let uiStore: MockedStore<typeof useUIStore>;
let versionsStore: MockedStore<typeof useVersionsStore>;
let usersStore: MockedStore<typeof useUsersStore>;
let templatesStore: MockedStore<typeof useTemplatesStore>;
let personalizedTemplatesV2Store: MockedStore<typeof usePersonalizedTemplatesV2Store>;
let personalizedTemplatesV3Store: MockedStore<typeof usePersonalizedTemplatesV3Store>;

const isBelow = (above: HTMLElement, below: HTMLElement) =>
	(above.compareDocumentPosition(below) & Node.DOCUMENT_POSITION_FOLLOWING) ===
	Node.DOCUMENT_POSITION_FOLLOWING;

describe('MainSidebar', () => {
	beforeEach(() => {
		routerPushMock.mockReset();
		canUserAccessRouteByNameMock.mockReset().mockReturnValue(true);
		renderComponent = createComponentRenderer(MainSidebar, {
			pinia: createTestingPinia(),
		});
		settingsStore = mockedStore(useSettingsStore);
		uiStore = mockedStore(useUIStore);
		versionsStore = mockedStore(useVersionsStore);
		usersStore = mockedStore(useUsersStore);
		templatesStore = mockedStore(useTemplatesStore);
		personalizedTemplatesV2Store = mockedStore(usePersonalizedTemplatesV2Store);
		personalizedTemplatesV3Store = mockedStore(usePersonalizedTemplatesV3Store);

		settingsStore.settings = defaultSettings;

		versionsStore.hasVersionUpdates = false;
		versionsStore.nextVersions = [];
		versionsStore.whatsNewArticles = [];
		versionsStore.isWhatsNewArticleRead = vi.fn(() => false);
		usersStore.canUserUpdateVersion = true;
		uiStore.sidebarMenuCollapsed = false;
		settingsStore.isTemplatesEnabled = true;
		templatesStore.hasCustomTemplatesHost = false;
		templatesStore.websiteTemplateRepositoryURL = 'https://n8n.io/workflows';

		personalizedTemplatesV2Store.isFeatureEnabled = vi.fn(() => false);
		personalizedTemplatesV3Store.isFeatureEnabled = vi.fn(() => false);
	});

	it('renders the sidebar without error', () => {
		expect(() => renderComponent()).not.toThrow();
	});

	describe('bottom block', () => {
		it('stacks the settings row above the account row', () => {
			const { getByTestId } = renderComponent();

			const settings = getByTestId('main-sidebar-settings');
			const account = getByTestId('main-sidebar-account');
			expect(isBelow(settings, account)).toBe(true);
		});

		it('shows the account row on the rail too', () => {
			uiStore.sidebarMenuCollapsed = true;

			const { getByTestId } = renderComponent();

			expect(getByTestId('main-sidebar-account')).toBeInTheDocument();
		});
	});

	describe('mainMenuItems', () => {
		it('should show templates menu when templates are enabled and no experiment is active', () => {
			settingsStore.isTemplatesEnabled = true;
			templatesStore.hasCustomTemplatesHost = false;
			personalizedTemplatesV2Store.isFeatureEnabled = vi.fn(() => false);
			personalizedTemplatesV3Store.isFeatureEnabled = vi.fn(() => false);

			const { getAllByTestId } = renderComponent();

			const templatesItems = getAllByTestId('main-sidebar-templates');
			expect(templatesItems.length).toBeGreaterThan(0);
		});

		it('should show templates menu when experiment is enabled', () => {
			settingsStore.isTemplatesEnabled = true;
			personalizedTemplatesV3Store.isFeatureEnabled = vi.fn(() => true);
			personalizedTemplatesV2Store.isFeatureEnabled = vi.fn(() => false);

			const { getAllByTestId } = renderComponent();

			const templatesItems = getAllByTestId('main-sidebar-templates');
			expect(templatesItems.length).toBeGreaterThan(0);
		});

		it('should not show templates menu when templates are disabled', () => {
			settingsStore.isTemplatesEnabled = false;

			const { queryAllByTestId } = renderComponent();

			const templatesItems = queryAllByTestId('main-sidebar-templates');
			expect(templatesItems).toHaveLength(0);
		});

		it('does not list help as a row anymore', () => {
			const { queryByTestId } = renderComponent();

			expect(queryByTestId('main-sidebar-help')).not.toBeInTheDocument();
		});

		it('shows instance settings as a plain link', () => {
			const { getByTestId } = renderComponent();

			const settings = getByTestId('main-sidebar-settings');
			expect(settings).toBeInTheDocument();
			expect(settings).not.toHaveAttribute('aria-haspopup');
			expect(settings).not.toHaveAttribute('role', 'button');
		});

		it('hides instance settings when the user can only reach personal settings', () => {
			canUserAccessRouteByNameMock.mockImplementation(
				(name: string) => name === 'PersonalSettings',
			);

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('main-sidebar-settings')).not.toBeInTheDocument();
		});
	});
});

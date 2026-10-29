import { reactive, type PropType } from 'vue';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/vue';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { defaultSettings } from '@n8n/frontend-test-utils';
import MainSidebar from '@/app/components/MainSidebar.vue';
import { VIEWS } from '@/app/constants';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useVersionsStore } from '@n8n/stores/versions.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { usePersonalizedTemplatesV2Store } from '@/experiments/templateRecoV2/stores/templateRecoV2.store';
import { usePersonalizedTemplatesV3Store } from '@/experiments/personalizedTemplatesV3/stores/personalizedTemplatesV3.store';

const routerPushMock = vi.hoisted(() => vi.fn());
const canUserAccessRouteByNameMock = vi.hoisted(() => vi.fn((_name: string) => true));
const trackMock = vi.hoisted(() => vi.fn());

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
}));

vi.mock('vue-router', async () => {
	const { defineComponent, h } = await import('vue');
	return {
		useRouter: () => ({
			resolve: vi.fn(() => ({ meta: {} })),
			push: routerPushMock,
		}),
		useRoute: () => reactive({ params: {} }),
		// A bare anchor, so menu rows render their content and take clicks. The target route's
		// name is kept on the anchor so a test can check where a row leads.
		RouterLink: defineComponent({
			props: { to: { type: Object as PropType<{ name?: string }>, required: false } },
			setup(props, { slots, attrs }) {
				return () => h('a', { ...attrs, 'data-route-name': props.to?.name }, slots.default?.());
			},
		}),
	};
});

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

describe('MainSidebar', () => {
	beforeEach(() => {
		routerPushMock.mockReset();
		trackMock.mockReset();
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
		versionsStore.whatsNewArticles = [];
		versionsStore.isWhatsNewArticleRead = vi.fn(() => false);
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
			expect(
				settings.compareDocumentPosition(account) & Node.DOCUMENT_POSITION_FOLLOWING,
			).toBeTruthy();
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

		it('shows instance settings as a plain link', () => {
			const { getByTestId } = renderComponent();

			const settings = getByTestId('main-sidebar-settings');
			expect(settings).toBeInTheDocument();
			expect(settings).not.toHaveAttribute('aria-haspopup');
			expect(settings).not.toHaveAttribute('role', 'button');
		});

		it('reports a click on instance settings', async () => {
			const { getByTestId } = renderComponent();

			await userEvent.click(within(getByTestId('main-sidebar-settings')).getByTestId('menu-item'));

			expect(trackMock).toHaveBeenCalledWith(
				TELEMETRY_EVENT.PLATFORM.USER_CLICKED_INSTANCE_SETTINGS_LINK,
				{ sidebar_collapsed: false },
			);
		});

		// `/settings` redirects to Personal settings when the usage page is hidden, so the row
		// links straight to the first instance page instead.
		it('links instance settings to the first instance page', () => {
			canUserAccessRouteByNameMock.mockImplementation((name: string) =>
				[VIEWS.PERSONAL_SETTINGS, VIEWS.USERS_SETTINGS, VIEWS.USAGE].includes(name as VIEWS),
			);

			const { getByTestId } = renderComponent();

			expect(getByTestId('main-sidebar-settings').querySelector('a')).toHaveAttribute(
				'data-route-name',
				VIEWS.USERS_SETTINGS,
			);
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

import { reactive } from 'vue';
import { within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
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
import type { Version } from '@n8n/rest-api-client/api/versions';
import { ABOUT_MODAL_KEY, WHATS_NEW_MODAL_KEY } from '@/app/constants';

const openTopUpMock = vi.hoisted(() => vi.fn());
const routerPushMock = vi.hoisted(() => vi.fn());

vi.mock('vue-router', () => ({
	useRouter: () => ({
		resolve: vi.fn(() => ({ meta: {} })),
		push: routerPushMock,
	}),
	useRoute: () => reactive({ params: {} }),
	RouterLink: vi.fn(),
}));

vi.mock('@/app/composables/useAiGatewayTopUp', () => ({
	useAiGatewayTopUp: () => ({ openTopUp: openTopUpMock }),
}));

let renderComponent: ReturnType<typeof createComponentRenderer>;
let settingsStore: MockedStore<typeof useSettingsStore>;
let uiStore: MockedStore<typeof useUIStore>;
let versionsStore: MockedStore<typeof useVersionsStore>;
let usersStore: MockedStore<typeof useUsersStore>;
let templatesStore: MockedStore<typeof useTemplatesStore>;
let personalizedTemplatesV2Store: MockedStore<typeof usePersonalizedTemplatesV2Store>;
let personalizedTemplatesV3Store: MockedStore<typeof usePersonalizedTemplatesV3Store>;

const mockVersion: Version = {
	name: '1.2.0',
	nodes: [],
	createdAt: '2025-01-01T00:00:00Z',
	description: 'Test version',
	documentationUrl: 'https://docs.n8n.io',
	hasBreakingChange: false,
	hasSecurityFix: false,
	hasSecurityIssue: false,
	securityIssueFixVersion: '',
};

describe('MainSidebar', () => {
	beforeEach(() => {
		openTopUpMock.mockReset();
		routerPushMock.mockReset();
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

		// Default store values
		versionsStore.hasVersionUpdates = false;
		versionsStore.nextVersions = [];
		usersStore.canUserUpdateVersion = true;
		uiStore.sidebarMenuCollapsed = false;
		settingsStore.isTemplatesEnabled = true;
		templatesStore.hasCustomTemplatesHost = false;
		templatesStore.websiteTemplateRepositoryURL = 'https://n8n.io/workflows';

		// Default experiment store values
		personalizedTemplatesV2Store.isFeatureEnabled = vi.fn(() => false);
		personalizedTemplatesV3Store.isFeatureEnabled = vi.fn(() => false);
	});

	it('renders the sidebar without error', () => {
		expect(() => renderComponent()).not.toThrow();
	});

	describe('Version Update CTA', () => {
		it('should not render version update CTA when hasVersionUpdates is false', () => {
			versionsStore.hasVersionUpdates = false;
			usersStore.canUserUpdateVersion = true;

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('version-update-cta-button')).not.toBeInTheDocument();
		});

		it('should not render version update CTA when canUserUpdateVersion is false', async () => {
			versionsStore.hasVersionUpdates = true;
			versionsStore.nextVersions = [mockVersion];
			usersStore.canUserUpdateVersion = false;

			const { queryByTestId, getByText } = renderComponent();

			getByText('Help').click();

			expect(queryByTestId('version-update-cta-button')).not.toBeInTheDocument();
		});

		it('should render version update CTA enabled when canUserUpdateVersion is true and hasVersionUpdates is true', async () => {
			versionsStore.hasVersionUpdates = true;
			versionsStore.nextVersions = [mockVersion];
			usersStore.canUserUpdateVersion = true;

			const { getByText, findByTestId } = renderComponent();

			getByText('Help').click();

			const updateButton = await findByTestId('version-update-cta-button');
			expect(updateButton).toBeInTheDocument();
			expect(updateButton).toBeEnabled();
		});
	});

	describe('mainMenuItems', () => {
		it('should show templates menu when templates are enabled and no experiment is active', () => {
			settingsStore.isTemplatesEnabled = true;
			templatesStore.hasCustomTemplatesHost = false;
			personalizedTemplatesV2Store.isFeatureEnabled = vi.fn(() => false);
			personalizedTemplatesV3Store.isFeatureEnabled = vi.fn(() => false);

			const { getAllByTestId } = renderComponent();

			// Should have at least one templates item visible
			const templatesItems = getAllByTestId('main-sidebar-templates');
			expect(templatesItems.length).toBeGreaterThan(0);
		});

		it('should show templates menu when experiment is enabled', () => {
			settingsStore.isTemplatesEnabled = true;
			personalizedTemplatesV3Store.isFeatureEnabled = vi.fn(() => true);
			personalizedTemplatesV2Store.isFeatureEnabled = vi.fn(() => false);

			const { getAllByTestId } = renderComponent();

			// Should have templates item visible when experiment is enabled
			const templatesItems = getAllByTestId('main-sidebar-templates');
			expect(templatesItems.length).toBeGreaterThan(0);
		});

		it('should not show templates menu when templates are disabled', () => {
			settingsStore.isTemplatesEnabled = false;

			const { queryAllByTestId } = renderComponent();

			// Should have no templates items when templates are disabled
			const templatesItems = queryAllByTestId('main-sidebar-templates');
			expect(templatesItems).toHaveLength(0);
		});

		it('should show help menu item', () => {
			const { getByTestId } = renderComponent();

			expect(getByTestId('main-sidebar-help')).toBeInTheDocument();
		});

		it('should show settings menu item', () => {
			const { getByTestId } = renderComponent();

			expect(getByTestId('main-sidebar-settings')).toBeInTheDocument();
		});

		it('should show contact support item in help menu when on cloud deployment', async () => {
			settingsStore.isCloudDeployment = true;

			const { getByText, findByText } = renderComponent();

			getByText('Help').click();

			expect(await findByText('Contact Support')).toBeInTheDocument();
		});

		it('should not show contact support item in help menu when not on cloud deployment', async () => {
			settingsStore.isCloudDeployment = false;

			const { getByText, findByRole, queryByText } = renderComponent();

			getByText('Help').click();
			// Wait for the popover to mount before checking
			await findByRole('dialog');

			expect(queryByText('Contact Support')).not.toBeInTheDocument();
		});
	});

	describe('handleSelect', () => {
		beforeEach(() => {
			uiStore.openModal = vi.fn();
			uiStore.openModalWithData = vi.fn();
			personalizedTemplatesV3Store.markTemplateRecommendationInteraction = vi.fn();
		});

		it('should open about modal when about is selected', async () => {
			const { getByText, findByText } = renderComponent();

			getByText('Help').click();
			const aboutItem = await findByText('About n8n');
			aboutItem.click();

			expect(uiStore.openModal).toHaveBeenCalledWith(ABOUT_MODAL_KEY);
		});

		it('should open whats new modal when whats new article is selected', async () => {
			versionsStore.hasVersionUpdates = true;
			versionsStore.whatsNewArticles = [
				{
					id: 123,
					title: 'Test Article',
					content: 'Test content',
					createdAt: '2025-01-01T00:00:00Z',
					updatedAt: null,
					publishedAt: '2025-01-01T00:00:00Z',
				},
			];

			const { getByText, findByText } = renderComponent();

			getByText('Help').click();
			const articleItem = await findByText('Test Article');
			articleItem.click();

			expect(uiStore.openModalWithData).toHaveBeenCalledWith({
				name: WHATS_NEW_MODAL_KEY,
				data: {
					articleId: 123,
				},
			});
		});

		it('should open the top-up flow when n8n credits is selected', async () => {
			settingsStore.settings = {
				...defaultSettings,
				aiGateway: {
					enabled: true,
					budget: 0,
					cloudUbbEnabled: true,
				},
			};

			const { getByText, findByText } = renderComponent();

			await userEvent.click(getByText('Settings'));
			await userEvent.click(await findByText('Gateway credits'));

			expect(openTopUpMock).toHaveBeenCalledWith({ source: 'settings_page' });
			expect(routerPushMock).not.toHaveBeenCalled();
		});

		it('should list the settings links under their section headings', async () => {
			settingsStore.settings = {
				...defaultSettings,
				aiGateway: {
					enabled: true,
					budget: 0,
					cloudUbbEnabled: true,
				},
			};

			const { getByText, findByTestId } = renderComponent();

			await userEvent.click(getByText('Settings'));
			const list = await findByTestId('main-sidebar-settings-list');

			const personalHeading = within(list).getByText('Personal');
			const billingHeading = within(list).getByText('Billing');
			expect(within(list).getByText('Gateway credits')).toBeInTheDocument();
			expect(within(list).queryByText('General')).not.toBeInTheDocument();
			// Headings keep the section order.
			expect(
				personalHeading.compareDocumentPosition(billingHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
			).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
		});

		it('should follow the route of a selected settings link', async () => {
			const { getByText, findByTestId } = renderComponent();

			await userEvent.click(getByText('Settings'));
			await userEvent.click(await findByTestId('settings-personal'));

			expect(routerPushMock).toHaveBeenCalledWith({ name: 'PersonalSettings' });
		});

		it('should open the settings menu from the keyboard and give focus back on close', async () => {
			const { getByTestId, findByTestId, queryByTestId } = renderComponent();
			const trigger = getByTestId('main-sidebar-settings');

			expect(trigger).toHaveAttribute('role', 'button');
			expect(trigger).toHaveAttribute('aria-haspopup', 'menu');

			trigger.focus();
			await userEvent.keyboard('{Enter}');

			expect(await findByTestId('main-sidebar-settings-list')).toBeInTheDocument();
			expect(trigger).toHaveAttribute('aria-expanded', 'true');

			await userEvent.keyboard('{Escape}');

			expect(queryByTestId('main-sidebar-settings-list')).not.toBeInTheDocument();
			expect(trigger).toHaveFocus();
		});

		it('should keep sign out in a footer below the settings list', async () => {
			const { getByText, findByTestId, getByTestId } = renderComponent();

			await userEvent.click(getByText('Settings'));
			const signOut = await findByTestId('main-sidebar-log-out');

			expect(getByTestId('main-sidebar-settings-footer')).toContainElement(signOut);
			expect(
				getByTestId('main-sidebar-settings-list').querySelector('[data-menu-items]'),
			).not.toContainElement(signOut);
		});
	});
});

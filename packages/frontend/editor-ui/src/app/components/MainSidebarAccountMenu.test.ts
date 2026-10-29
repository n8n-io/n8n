import { reactive } from 'vue';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { ROLE } from '@n8n/api-types';
import type { IUser } from '@n8n/rest-api-client/api/users';
import type { WhatsNewArticle } from '@n8n/rest-api-client/api/versions';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import MainSidebarAccountMenu from '@/app/components/MainSidebarAccountMenu.vue';
import { ABOUT_MODAL_KEY, VERSIONS_MODAL_KEY, VIEWS, WHATS_NEW_MODAL_KEY } from '@/app/constants';
import { EXTERNAL_LINKS } from '@/app/constants/externalLinks';
import { useUIStore } from '@/app/stores/ui.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useVersionsStore } from '@n8n/stores/versions.store';

const routerPushMock = vi.hoisted(() => vi.fn());
const trackMock = vi.hoisted(() => vi.fn());
const goToDashboardMock = vi.hoisted(() => vi.fn());

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: routerPushMock, resolve: vi.fn(() => ({ meta: {} })) }),
	useRoute: () => reactive({ params: {} }),
	RouterLink: vi.fn(),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
}));

vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({ goToDashboard: goToDashboardMock }),
}));

vi.mock('@n8n/design-system', async (importOriginal) => {
	const original = await importOriginal<typeof import('@n8n/design-system')>();
	return {
		...original,
		// Reka UI tooltips do not open in jsdom; the props are exposed so the wiring can be checked.
		N8nTooltip: {
			name: 'N8nTooltip',
			props: ['disabled', 'content'],
			template:
				'<span :data-tooltip-disabled="disabled" :data-tooltip-content="content"><slot /></span>',
		},
	};
});

const article = (id: number, title: string): WhatsNewArticle => ({
	id,
	title,
	content: '',
	createdAt: '2025-01-01T00:00:00Z',
	updatedAt: null,
	publishedAt: '2025-01-01T00:00:00Z',
});

const renderComponent = createComponentRenderer(MainSidebarAccountMenu, {
	props: { isCollapsed: false },
});

let usersStore: MockedStore<typeof useUsersStore>;
let settingsStore: MockedStore<typeof useSettingsStore>;
let versionsStore: MockedStore<typeof useVersionsStore>;
let uiStore: MockedStore<typeof useUIStore>;
let rootStore: MockedStore<typeof useRootStore>;

async function openMenu(trigger: HTMLElement) {
	await userEvent.click(trigger);
	return await waitFor(() => {
		const menu = document.querySelector('[data-test-id="main-sidebar-account-menu"]');
		if (!(menu instanceof HTMLElement)) throw new Error('Menu not open');
		return menu;
	});
}

describe('MainSidebarAccountMenu', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
		usersStore = mockedStore(useUsersStore);
		settingsStore = mockedStore(useSettingsStore);
		versionsStore = mockedStore(useVersionsStore);
		uiStore = mockedStore(useUIStore);
		rootStore = mockedStore(useRootStore);

		usersStore.currentUser = {
			id: 'u1',
			firstName: 'Jane',
			lastName: 'Doe',
			fullName: 'Jane Doe',
			email: 'jane@example.com',
			role: ROLE.Owner,
			globalScopes: [],
		} as unknown as IUser;
		usersStore.isInstanceOwner = true;
		settingsStore.isCloudDeployment = false;
		versionsStore.whatsNewArticles = [];
		versionsStore.hasVersionUpdates = false;
		versionsStore.isWhatsNewArticleRead = vi.fn(() => false);
		rootStore.versionCli = '1.2.3';
		uiStore.openModal = vi.fn();
		uiStore.openModalWithData = vi.fn();
	});

	it('shows the name on the row and the identity in the menu header', async () => {
		const { getByTestId } = renderComponent();

		const trigger = getByTestId('main-sidebar-account-trigger');
		expect(trigger).toHaveTextContent('Jane Doe');

		const menu = await openMenu(trigger);
		const header = within(menu).getByTestId('main-sidebar-account-header');
		expect(header).toHaveTextContent('Jane Doe');
		expect(header).toHaveTextContent('jane@example.com');
		// The role is not part of the identity; it reads as noise next to the name.
		expect(header).not.toHaveTextContent('Owner');
	});

	it('names the rail trigger after the user and hides the label', () => {
		const { getByTestId } = renderComponent({ props: { isCollapsed: true } });

		const trigger = getByTestId('main-sidebar-account-trigger');
		expect(trigger).toHaveAttribute('aria-label', 'Jane Doe');
		expect(trigger).not.toHaveTextContent('Jane Doe');
	});

	describe('long names', () => {
		const LONG_NAME = 'Bartholomew Montgomery-Fitzwilliam the Third';
		const LONG_EMAIL = 'bartholomew.montgomery-fitzwilliam@very-long-company-domain.example';

		/** jsdom has no layout, so the cut is set by hand. */
		function setCut(el: HTMLElement, cut: boolean) {
			Object.defineProperty(el, 'scrollWidth', { value: cut ? 320 : 80, configurable: true });
			Object.defineProperty(el, 'clientWidth', { value: 80, configurable: true });
		}

		function tooltipOf(el: HTMLElement) {
			const tooltip = el.closest('[data-tooltip-content]');
			if (!(tooltip instanceof HTMLElement)) throw new Error('No tooltip around the element');
			return tooltip;
		}

		it('keeps the tooltip off while the name fits on the row', () => {
			const { getByTestId } = renderComponent();

			expect(tooltipOf(getByTestId('main-sidebar-account-trigger'))).toHaveAttribute(
				'data-tooltip-disabled',
				'true',
			);
		});

		it('shows the full name as a tooltip once the row cuts it', async () => {
			const { getByTestId } = renderComponent();
			const tooltip = tooltipOf(getByTestId('main-sidebar-account-trigger'));

			setCut(getByTestId('main-sidebar-account-name'), true);
			usersStore.currentUser = { ...usersStore.currentUser, fullName: LONG_NAME } as IUser;

			await waitFor(() => expect(tooltip).toHaveAttribute('data-tooltip-disabled', 'false'));
			expect(tooltip).toHaveAttribute('data-tooltip-content', LONG_NAME);
		});

		it('always offers the name on the rail', () => {
			const { getByTestId } = renderComponent({ props: { isCollapsed: true } });

			expect(tooltipOf(getByTestId('main-sidebar-account-trigger'))).toHaveAttribute(
				'data-tooltip-disabled',
				'false',
			);
		});

		it('shows the full name and email as tooltips once the header cuts them', async () => {
			const { getByTestId } = renderComponent();
			const menu = await openMenu(getByTestId('main-sidebar-account-trigger'));
			const name = within(menu).getByTestId('main-sidebar-account-header-name');
			const email = within(menu).getByTestId('main-sidebar-account-header-email');

			expect(tooltipOf(name)).toHaveAttribute('data-tooltip-disabled', 'true');
			expect(tooltipOf(email)).toHaveAttribute('data-tooltip-disabled', 'true');

			setCut(name, true);
			setCut(email, true);
			usersStore.currentUser = {
				...usersStore.currentUser,
				fullName: LONG_NAME,
				email: LONG_EMAIL,
			} as IUser;

			await waitFor(() =>
				expect(tooltipOf(name)).toHaveAttribute('data-tooltip-disabled', 'false'),
			);
			expect(tooltipOf(name)).toHaveAttribute('data-tooltip-content', LONG_NAME);
			expect(tooltipOf(email)).toHaveAttribute('data-tooltip-disabled', 'false');
			expect(tooltipOf(email)).toHaveAttribute('data-tooltip-content', LONG_EMAIL);
		});
	});

	it('opens from the keyboard and gives focus back on close', async () => {
		const { getByTestId } = renderComponent();
		const trigger = getByTestId('main-sidebar-account-trigger');

		trigger.focus();
		await userEvent.keyboard('{Enter}');
		await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'));

		await userEvent.keyboard('{Escape}');

		await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
		expect(trigger).toHaveFocus();
	});

	it('goes to personal settings and reports the row', async () => {
		const { getByTestId } = renderComponent();
		const menu = await openMenu(getByTestId('main-sidebar-account-trigger'));

		await userEvent.click(within(menu).getByTestId('main-sidebar-account-personal-settings'));

		expect(routerPushMock).toHaveBeenCalledWith({ name: VIEWS.PERSONAL_SETTINGS });
		expect(trackMock).toHaveBeenCalledWith(
			TELEMETRY_EVENT.PLATFORM.USER_CLICKED_ACCOUNT_MENU_ITEM,
			{ item: 'personal_settings', sidebar_collapsed: false },
		);
	});

	it('signs out from the last row', async () => {
		const { getByTestId } = renderComponent();
		const menu = await openMenu(getByTestId('main-sidebar-account-trigger'));

		await userEvent.click(within(menu).getByTestId('main-sidebar-log-out'));

		expect(routerPushMock).toHaveBeenCalledWith({ name: VIEWS.SIGNOUT });
	});

	describe('cloud console', () => {
		it('is listed first for a cloud owner', async () => {
			settingsStore.isCloudDeployment = true;
			const { getByTestId } = renderComponent();
			const menu = await openMenu(getByTestId('main-sidebar-account-trigger'));

			await userEvent.click(within(menu).getByTestId('main-sidebar-account-cloud-console'));

			expect(goToDashboardMock).toHaveBeenCalled();
		});

		it('is left out on a self-hosted instance', async () => {
			const { getByTestId } = renderComponent();
			const menu = await openMenu(getByTestId('main-sidebar-account-trigger'));

			expect(
				within(menu).queryByTestId('main-sidebar-account-cloud-console'),
			).not.toBeInTheDocument();
		});

		it('is left out for a cloud member', async () => {
			settingsStore.isCloudDeployment = true;
			usersStore.isInstanceOwner = false;
			const { getByTestId } = renderComponent();
			const menu = await openMenu(getByTestId('main-sidebar-account-trigger'));

			expect(
				within(menu).queryByTestId('main-sidebar-account-cloud-console'),
			).not.toBeInTheDocument();
		});
	});

	describe("what's new", () => {
		it('has no row and no dot without articles', async () => {
			const { getByTestId, queryByTestId } = renderComponent();

			expect(queryByTestId('main-sidebar-account-unread')).not.toBeInTheDocument();
			const menu = await openMenu(getByTestId('main-sidebar-account-trigger'));
			expect(within(menu).queryByTestId('main-sidebar-account-whats-new')).not.toBeInTheDocument();
		});

		it('marks the avatar and the row while an article is unread', async () => {
			versionsStore.whatsNewArticles = [article(1, 'Read'), article(2, 'Unread')];
			versionsStore.isWhatsNewArticleRead = vi.fn((id: number) => id === 1);
			const { getByTestId } = renderComponent();

			expect(getByTestId('main-sidebar-account-unread')).toBeInTheDocument();
			const menu = await openMenu(getByTestId('main-sidebar-account-trigger'));
			expect(within(menu).getByTestId('main-sidebar-account-whats-new-unread')).toBeInTheDocument();
		});

		it('drops the dot once everything is read', () => {
			versionsStore.whatsNewArticles = [article(1, 'Read')];
			versionsStore.isWhatsNewArticleRead = vi.fn(() => true);
			const { queryByTestId } = renderComponent();

			expect(queryByTestId('main-sidebar-account-unread')).not.toBeInTheDocument();
		});

		it('opens the versions panel when only an update is pending', async () => {
			versionsStore.hasVersionUpdates = true;
			const { getByTestId } = renderComponent();

			expect(getByTestId('main-sidebar-account-unread')).toBeInTheDocument();
			const menu = await openMenu(getByTestId('main-sidebar-account-trigger'));
			await userEvent.click(within(menu).getByTestId('main-sidebar-account-whats-new'));

			expect(uiStore.openModal).toHaveBeenCalledWith(VERSIONS_MODAL_KEY);
			expect(uiStore.openModalWithData).not.toHaveBeenCalled();
		});

		it('opens the modal at the first unread article', async () => {
			versionsStore.whatsNewArticles = [article(1, 'Read'), article(2, 'Unread')];
			versionsStore.isWhatsNewArticleRead = vi.fn((id: number) => id === 1);
			const { getByTestId } = renderComponent();
			const menu = await openMenu(getByTestId('main-sidebar-account-trigger'));

			await userEvent.click(within(menu).getByTestId('main-sidebar-account-whats-new'));

			expect(uiStore.openModalWithData).toHaveBeenCalledWith({
				name: WHATS_NEW_MODAL_KEY,
				data: { articleId: 2 },
			});
		});
	});

	describe('help', () => {
		async function openHelp(menu: HTMLElement) {
			await userEvent.hover(within(menu).getByTestId('main-sidebar-account-help'));
			return await waitFor(() => {
				const about = document.querySelector('[data-test-id="main-sidebar-help-about"]');
				if (!(about instanceof HTMLElement)) throw new Error('Help submenu not open');
				return about;
			});
		}

		it('lists the links and the version next to About', async () => {
			const { getByTestId } = renderComponent();
			const menu = await openMenu(getByTestId('main-sidebar-account-trigger'));

			const about = await openHelp(menu);

			expect(about).toHaveTextContent('v1.2.3');
			expect(document.querySelector('[data-test-id="main-sidebar-help-docs"]')).toBeInTheDocument();
			expect(
				document.querySelector('[data-test-id="main-sidebar-help-contact-support"]'),
			).not.toBeInTheDocument();
		});

		it('adds contact support on cloud', async () => {
			settingsStore.isCloudDeployment = true;
			const { getByTestId } = renderComponent();
			const menu = await openMenu(getByTestId('main-sidebar-account-trigger'));

			await openHelp(menu);

			expect(
				document.querySelector('[data-test-id="main-sidebar-help-contact-support"]'),
			).toBeInTheDocument();
		});

		it('opens the about modal', async () => {
			const { getByTestId } = renderComponent();
			const menu = await openMenu(getByTestId('main-sidebar-account-trigger'));
			const about = await openHelp(menu);

			await userEvent.click(about);

			expect(uiStore.openModal).toHaveBeenCalledWith(ABOUT_MODAL_KEY);
			expect(trackMock).toHaveBeenCalledWith(
				'User clicked help resource',
				expect.objectContaining({ type: 'about' }),
			);
		});

		it('opens a link in a new tab', async () => {
			const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
			const { getByTestId } = renderComponent();
			const menu = await openMenu(getByTestId('main-sidebar-account-trigger'));
			await openHelp(menu);

			await userEvent.click(document.querySelector('[data-test-id="main-sidebar-help-docs"]')!);

			expect(openSpy).toHaveBeenCalledWith(EXTERNAL_LINKS.DOCUMENTATION, '_blank', 'noopener');
			expect(trackMock).toHaveBeenCalledWith(
				'User clicked help resource',
				expect.objectContaining({ type: 'docs' }),
			);
		});
	});
});

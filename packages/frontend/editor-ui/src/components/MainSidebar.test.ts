import { reactive } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { defaultSettings } from '@/__tests__/defaults';
import MainSidebar from '@/components/MainSidebar.vue';
import { useSettingsStore } from '@/stores/settings.store';
import { useUIStore } from '@/stores/ui.store';
import { useSourceControlStore } from '@/features/sourceControl.ee/sourceControl.store';
import { useVersionsStore } from '@/stores/versions.store';
import { useUsersStore } from '@/stores/users.store';
import type { Version } from '@n8n/rest-api-client/api/versions';

vi.mock('vue-router', () => ({
	useRouter: () => ({}),
	useRoute: () => reactive({}),
	RouterLink: vi.fn(),
}));

let renderComponent: ReturnType<typeof createComponentRenderer>;
let settingsStore: MockedStore<typeof useSettingsStore>;
let uiStore: MockedStore<typeof useUIStore>;
let sourceControlStore: MockedStore<typeof useSourceControlStore>;
let versionsStore: MockedStore<typeof useVersionsStore>;
let usersStore: MockedStore<typeof useUsersStore>;

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
		renderComponent = createComponentRenderer(MainSidebar, {
			pinia: createTestingPinia(),
		});
		settingsStore = mockedStore(useSettingsStore);
		uiStore = mockedStore(useUIStore);
		sourceControlStore = mockedStore(useSourceControlStore);
		versionsStore = mockedStore(useVersionsStore);
		usersStore = mockedStore(useUsersStore);

		settingsStore.settings = defaultSettings;

		// Default store values
		versionsStore.hasVersionUpdates = false;
		versionsStore.nextVersions = [];
		usersStore.canUserUpdateVersion = true;
		uiStore.sidebarMenuCollapsed = false;
	});

	it('renders the sidebar without error', () => {
		expect(() => renderComponent()).not.toThrow();
	});

	test.each([
		[false, true, true],
		[true, false, false],
		[true, true, false],
		[false, false, false],
	])(
		'should render readonly tooltip when is opened %s and the environment is readonly %s',
		(sidebarMenuCollapsed, branchReadOnly, shouldRender) => {
			uiStore.sidebarMenuCollapsed = sidebarMenuCollapsed;
			sourceControlStore.preferences.branchReadOnly = branchReadOnly;

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('read-only-env-icon') !== null).toBe(shouldRender);
		},
	);

	describe('Version Update CTA', () => {
		it('should not render version update CTA when hasVersionUpdates is false', () => {
			versionsStore.hasVersionUpdates = false;
			usersStore.canUserUpdateVersion = true;

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('version-update-cta-button')).not.toBeInTheDocument();
		});

		it('should render version update CTA disabled when canUserUpdateVersion is false', async () => {
			versionsStore.hasVersionUpdates = true;
			versionsStore.nextVersions = [mockVersion];
			usersStore.canUserUpdateVersion = false;

			const { findByTestId, getByText } = renderComponent();

			getByText('What’s New').click();

			const updateButton = await findByTestId('version-update-cta-button');
			expect(updateButton).toBeInTheDocument();
			expect(updateButton).toBeDisabled();
		});

		it('should render version update CTA enabled when canUserUpdateVersion is true and hasVersionUpdates is true', async () => {
			versionsStore.hasVersionUpdates = true;
			versionsStore.nextVersions = [mockVersion];
			usersStore.canUserUpdateVersion = true;

			const { getByText, findByTestId } = renderComponent();

			getByText('What’s New').click();

			const updateButton = await findByTestId('version-update-cta-button');
			expect(updateButton).toBeInTheDocument();
			expect(updateButton).toBeEnabled();
		});
	});
});

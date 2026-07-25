import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import EmptyStateLayout from './EmptyStateLayout.vue';
import { createTestingPinia } from '@pinia/testing';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useReadyToRunStore } from '@/features/workflows/readyToRun/stores/readyToRun.store';
import { useBannersStore } from '@/features/shared/banners/banners.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import userEvent from '@testing-library/user-event';
import type { IUser } from '@n8n/rest-api-client/api/users';

const surfaceMcpEmptyState = vi.hoisted(() => ({
	showTile: false,
	showReminder: false,
}));
const trackClickedNewAgent = vi.hoisted(() => vi.fn());

vi.mock('vue-router', () => ({
	useRouter: () => ({
		push: vi.fn(),
		resolve: vi.fn().mockReturnValue({ href: '' }),
	}),
	useRoute: () => ({
		params: {},
	}),
	RouterLink: {
		template: '<a><slot /></a>',
	},
}));

vi.mock('@/experiments/surfaceMcpToNewCloudUsers/composables/useSurfaceMcpEmptyState', async () => {
	const { computed } = await import('vue');
	return {
		useSurfaceMcpEmptyState: vi.fn(() => ({
			showTile: computed(() => surfaceMcpEmptyState.showTile),
			showReminder: computed(() => surfaceMcpEmptyState.showReminder),
		})),
	};
});

vi.mock('@/features/agents/composables/useAgentTelemetry', () => ({
	useAgentTelemetry: () => ({
		trackClickedNewAgent,
	}),
}));

const renderComponent = createComponentRenderer(EmptyStateLayout, {
	pinia: createTestingPinia(),
	global: {
		stubs: {
			SurfaceMcpEmptyStateTile: {
				template: '<div data-test-id="mcp-onboarding-card" />',
			},
			SurfaceMcpEmptyStateReminder: {
				template: '<div data-test-id="mcp-onboarding-reminder" />',
			},
		},
	},
});

describe('EmptyStateLayout', () => {
	let usersStore: ReturnType<typeof mockedStore<typeof useUsersStore>>;
	let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;
	let sourceControlStore: ReturnType<typeof mockedStore<typeof useSourceControlStore>>;
	let readyToRunStore: ReturnType<typeof mockedStore<typeof useReadyToRunStore>>;
	let bannersStore: ReturnType<typeof mockedStore<typeof useBannersStore>>;

	beforeEach(() => {
		usersStore = mockedStore(useUsersStore);
		projectsStore = mockedStore(useProjectsStore);
		sourceControlStore = mockedStore(useSourceControlStore);
		readyToRunStore = mockedStore(useReadyToRunStore);
		bannersStore = mockedStore(useBannersStore);

		usersStore.currentUser = {
			id: '1',
			firstName: 'John',
			lastName: 'Doe',
			email: 'john@example.com',
			globalScopes: ['agent:create'],
			isDefaultUser: false,
			isPendingUser: false,
			mfaEnabled: false,
		} as IUser;

		projectsStore.currentProject = null;
		projectsStore.personalProject = {
			id: 'personal-project-1',
			name: 'Personal Project',
			type: 'personal',
			scopes: ['workflow:create', 'workflow:read', 'workflow:update', 'workflow:delete'],
		} as unknown as ReturnType<typeof useProjectsStore>['personalProject'];

		sourceControlStore.preferences = {
			branchReadOnly: false,
		} as unknown as ReturnType<typeof useSourceControlStore>['preferences'];

		bannersStore.bannersHeight = 0;
		readyToRunStore.userCanClaimOpenAiCredits = false;
		vi.spyOn(useSettingsStore(), 'isModuleActive').mockImplementation((moduleName) => {
			return moduleName === 'agents';
		});
		surfaceMcpEmptyState.showTile = false;
		surfaceMcpEmptyState.showReminder = false;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('baseline empty state', () => {
		it('should render onboarding heading', () => {
			const { getByRole } = renderComponent();

			const heading = getByRole('heading', { level: 1 });
			expect(heading).toHaveTextContent("Let's build your first automation");
		});

		it('should render new workflow card when user can create workflows', () => {
			const { getByTestId } = renderComponent();

			expect(getByTestId('new-workflow-card')).toBeInTheDocument();
		});

		it('renders Surface MCP empty-state insertion components when enabled', () => {
			surfaceMcpEmptyState.showTile = true;
			surfaceMcpEmptyState.showReminder = true;

			const { getByTestId } = renderComponent();

			expect(getByTestId('mcp-onboarding-card')).toBeInTheDocument();
			expect(getByTestId('mcp-onboarding-reminder')).toBeInTheDocument();
		});

		it('should render ready-to-run card when user can claim OpenAI credits and MCP tile is hidden', () => {
			readyToRunStore.userCanClaimOpenAiCredits = true;

			const { getByTestId } = renderComponent();

			expect(getByTestId('ready-to-run-card')).toBeInTheDocument();
		});

		it('should hide ready-to-run card when Surface MCP tile is shown', () => {
			readyToRunStore.userCanClaimOpenAiCredits = true;
			surfaceMcpEmptyState.showTile = true;

			const { queryByTestId, getByTestId } = renderComponent();

			expect(queryByTestId('ready-to-run-card')).not.toBeInTheDocument();
			expect(getByTestId('mcp-onboarding-card')).toBeInTheDocument();
			expect(getByTestId('new-workflow-card')).toBeInTheDocument();
		});

		it('should emit click:add event when workflow card is clicked', async () => {
			const { getByTestId, emitted } = renderComponent();

			await userEvent.click(getByTestId('new-workflow-card'));

			expect(emitted('click:add')).toHaveLength(1);
		});

		it('should track New Agent card clicks', async () => {
			const { getByTestId } = renderComponent();

			await userEvent.click(getByTestId('build-agent-card'));

			expect(trackClickedNewAgent).toHaveBeenCalledWith('card');
		});
	});

	describe('when in read-only environment', () => {
		beforeEach(() => {
			sourceControlStore.preferences = {
				branchReadOnly: true,
			} as unknown as ReturnType<typeof useSourceControlStore>['preferences'];
		});

		it('should not render new workflow card', () => {
			const { queryByTestId } = renderComponent();

			expect(queryByTestId('new-workflow-card')).not.toBeInTheDocument();
		});
	});

	describe('when user does not have workflow create permission', () => {
		beforeEach(() => {
			projectsStore.personalProject = {
				id: 'personal-project-1',
				name: 'Personal Project',
				type: 'personal',
				scopes: ['workflow:read'],
			} as unknown as ReturnType<typeof useProjectsStore>['personalProject'];
		});

		it('should not render new workflow card', () => {
			const { queryByTestId } = renderComponent();

			expect(queryByTestId('new-workflow-card')).not.toBeInTheDocument();
		});
	});
});

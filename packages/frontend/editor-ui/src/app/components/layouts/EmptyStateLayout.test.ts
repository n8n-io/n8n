import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import EmptyStateLayout from './EmptyStateLayout.vue';
import { createTestingPinia } from '@pinia/testing';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useRecommendedTemplatesStore } from '@/features/workflows/templates/recommendations/recommendedTemplates.store';
import { useBannersStore } from '@/features/shared/banners/banners.store';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useSurfaceMcpToNewCloudUsersStore } from '@/experiments/surfaceMcpToNewCloudUsers/stores/surfaceMcpToNewCloudUsers.store';
import { SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT } from '@/app/constants/experiments';
import userEvent from '@testing-library/user-event';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { ref } from 'vue';

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

const mcpEligibility = ref(true);

vi.mock(
	'@/experiments/surfaceMcpToNewCloudUsers/composables/useSurfaceMcpToNewCloudUsersEligibility',
	() => ({
		useSurfaceMcpToNewCloudUsersEligibility: vi.fn(() => ({
			isEligible: mcpEligibility,
		})),
	}),
);

const renderComponent = createComponentRenderer(EmptyStateLayout, {
	pinia: createTestingPinia(),
	global: {
		stubs: {
			RecommendedTemplatesSection: {
				template: '<div data-test-id="recommended-templates-section">Recommended Templates</div>',
			},
			ReadyToRunButton: {
				template: '<button data-test-id="ready-to-run-button">Ready to Run</button>',
			},
		},
	},
});

describe('EmptyStateLayout', () => {
	let usersStore: ReturnType<typeof mockedStore<typeof useUsersStore>>;
	let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;
	let sourceControlStore: ReturnType<typeof mockedStore<typeof useSourceControlStore>>;
	let recommendedTemplatesStore: ReturnType<
		typeof mockedStore<typeof useRecommendedTemplatesStore>
	>;
	let bannersStore: ReturnType<typeof mockedStore<typeof useBannersStore>>;
	let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;
	let mcpStore: ReturnType<typeof mockedStore<typeof useMCPStore>>;
	let surfaceMcpStore: ReturnType<typeof mockedStore<typeof useSurfaceMcpToNewCloudUsersStore>>;

	beforeEach(() => {
		usersStore = mockedStore(useUsersStore);
		projectsStore = mockedStore(useProjectsStore);
		sourceControlStore = mockedStore(useSourceControlStore);
		recommendedTemplatesStore = mockedStore(useRecommendedTemplatesStore);
		bannersStore = mockedStore(useBannersStore);
		uiStore = mockedStore(useUIStore);
		mcpStore = mockedStore(useMCPStore);
		surfaceMcpStore = mockedStore(useSurfaceMcpToNewCloudUsersStore);

		usersStore.currentUser = {
			id: '1',
			firstName: 'John',
			lastName: 'Doe',
			email: 'john@example.com',
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
		mcpStore.mcpAccessEnabled = false;
		mcpEligibility.value = true;
		surfaceMcpStore.isTileVariant = false;
		surfaceMcpStore.isEnabled = false;
		surfaceMcpStore.isFirstOpenModalVariant = false;
		surfaceMcpStore.hasDismissedFirstOpenModal = false;

		// Default: feature disabled (control variant)
		recommendedTemplatesStore.isFeatureEnabled = false;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('when recommended templates feature is enabled', () => {
		beforeEach(() => {
			recommendedTemplatesStore.isFeatureEnabled = true;
		});

		it('should render welcome heading with user name', () => {
			const { getByRole } = renderComponent();

			const heading = getByRole('heading', { level: 1 });
			expect(heading).toHaveTextContent('John');
		});

		it('should render recommended templates section', () => {
			const { getByTestId } = renderComponent();

			expect(getByTestId('recommended-templates-section')).toBeInTheDocument();
		});

		it('should render ready to run button', () => {
			const { getByTestId } = renderComponent();

			expect(getByTestId('ready-to-run-button')).toBeInTheDocument();
		});

		it('should render start from scratch button', () => {
			const { getByTestId } = renderComponent();

			expect(getByTestId('start-from-scratch-button')).toBeInTheDocument();
		});

		it('should emit click:add event when start from scratch button is clicked', async () => {
			const { getByTestId, emitted } = renderComponent();

			await userEvent.click(getByTestId('start-from-scratch-button'));

			expect(emitted('click:add')).toHaveLength(1);
		});

		it('should not render new workflow card', () => {
			const { queryByTestId } = renderComponent();

			expect(queryByTestId('new-workflow-card')).not.toBeInTheDocument();
		});
	});

	describe('when recommended templates feature is disabled', () => {
		beforeEach(() => {
			recommendedTemplatesStore.isFeatureEnabled = false;
		});

		it('should render heading with user name', () => {
			const { getByRole } = renderComponent();

			const heading = getByRole('heading', { level: 1 });
			expect(heading).toHaveTextContent('John');
		});

		it('should not render recommended templates section', () => {
			const { queryByTestId } = renderComponent();

			expect(queryByTestId('recommended-templates-section')).not.toBeInTheDocument();
		});

		it('should not render ready to run button', () => {
			const { queryByTestId } = renderComponent();

			expect(queryByTestId('ready-to-run-button')).not.toBeInTheDocument();
		});

		it('should not render start from scratch button', () => {
			const { queryByTestId } = renderComponent();

			expect(queryByTestId('start-from-scratch-button')).not.toBeInTheDocument();
		});

		it('should render new workflow card when user can create workflows', () => {
			const { getByTestId } = renderComponent();

			expect(getByTestId('new-workflow-card')).toBeInTheDocument();
		});

		it('renders the variant 1 MCP tile CTA with a New badge', () => {
			surfaceMcpStore.isTileVariant = true;
			surfaceMcpStore.isEnabled = true;
			surfaceMcpStore.currentVariant = SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.variant1;
			mcpStore.mcpAccessEnabled = false;

			const { getByTestId, queryByText } = renderComponent();
			const card = getByTestId('mcp-onboarding-card');

			expect(card).toHaveTextContent('Build from your assistant');
			expect(getByTestId('mcp-onboarding-badge')).toHaveTextContent('New');
			expect(getByTestId('mcp-tile-logo-row')).toBeInTheDocument();
			expect(
				queryByText(/Connect MCP clients like Claude Code and Cursor/),
			).not.toBeInTheDocument();
			expect(surfaceMcpStore.trackEntryPointViewed).toHaveBeenCalledWith(
				'tile',
				'empty_state_tile',
				false,
			);
			expect(surfaceMcpStore.trackOpportunityViewed).toHaveBeenCalledWith(
				'tile',
				'empty_state_tile',
				true,
				null,
				false,
			);
		});

		it('tracks an MCP opportunity for control users without rendering the tile', () => {
			surfaceMcpStore.isEnabled = true;
			surfaceMcpStore.isTileVariant = false;
			surfaceMcpStore.currentVariant = SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.control;

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('mcp-onboarding-card')).not.toBeInTheDocument();
			expect(surfaceMcpStore.trackOpportunityViewed).toHaveBeenCalledWith(
				'tile',
				'empty_state_tile',
				false,
				null,
				false,
			);
			expect(surfaceMcpStore.trackEntryPointViewed).not.toHaveBeenCalled();
		});

		it('does not track the MCP tile as viewed when the user cannot create workflows', () => {
			surfaceMcpStore.isTileVariant = true;
			surfaceMcpStore.isEnabled = true;
			projectsStore.personalProject = {
				id: 'personal-project-1',
				name: 'Personal Project',
				type: 'personal',
				scopes: ['workflow:read'],
			} as unknown as ReturnType<typeof useProjectsStore>['personalProject'];

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('mcp-onboarding-card')).not.toBeInTheDocument();
			expect(surfaceMcpStore.trackOpportunityViewed).toHaveBeenCalledWith(
				'tile',
				'empty_state_tile',
				false,
				'no_create_permission',
				false,
			);
			expect(surfaceMcpStore.trackEntryPointViewed).not.toHaveBeenCalled();
		});

		it('renders the variant 2 MCP tile CTA with a New badge', () => {
			surfaceMcpStore.isTileVariant = true;
			surfaceMcpStore.isEnabled = true;
			surfaceMcpStore.currentVariant = SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.variant2;
			mcpStore.mcpAccessEnabled = false;

			const { getByTestId, queryByText } = renderComponent();
			const card = getByTestId('mcp-onboarding-card');

			expect(card).toHaveTextContent('Connect to your AI');
			expect(getByTestId('mcp-onboarding-badge')).toHaveTextContent('New');
			expect(getByTestId('mcp-tile-logo-row')).toBeInTheDocument();
			expect(
				queryByText(/Connect MCP clients like Claude Code and Cursor/),
			).not.toBeInTheDocument();
		});

		it('renders the Enabled badge when MCP access is enabled', () => {
			surfaceMcpStore.isTileVariant = true;
			surfaceMcpStore.isEnabled = true;
			surfaceMcpStore.currentVariant = SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.variant1;
			mcpStore.mcpAccessEnabled = true;

			const { getByTestId } = renderComponent();

			expect(getByTestId('mcp-onboarding-badge')).toHaveTextContent('Enabled');
		});

		it('opens the onboarding modal when the MCP card is clicked', async () => {
			surfaceMcpStore.isTileVariant = true;
			surfaceMcpStore.isEnabled = true;
			surfaceMcpStore.currentVariant = SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.variant1;
			const { getByTestId } = renderComponent();

			await userEvent.click(getByTestId('mcp-onboarding-card'));

			expect(surfaceMcpStore.trackOpened).toHaveBeenCalledWith('tile', {
				entryPoint: 'empty_state_tile',
				mcpAccessEnabled: false,
			});
			expect(uiStore.openModalWithData).toHaveBeenCalledWith({
				name: 'mcpOnboardingModal',
				data: { surface: 'tile' },
			});
		});

		it('renders the passive reminder after first-open dismissal', () => {
			surfaceMcpStore.isFirstOpenModalVariant = true;
			surfaceMcpStore.hasDismissedFirstOpenModal = true;

			const { getByTestId } = renderComponent();

			expect(getByTestId('mcp-onboarding-reminder')).toHaveTextContent(
				'You can enable this later in Settings > MCP.',
			);
		});

		it('should emit click:add event when workflow card is clicked', async () => {
			const { getByTestId, emitted } = renderComponent();

			await userEvent.click(getByTestId('new-workflow-card'));

			expect(emitted('click:add')).toHaveLength(1);
		});
	});

	describe('when in read-only environment', () => {
		beforeEach(() => {
			recommendedTemplatesStore.isFeatureEnabled = true;
			sourceControlStore.preferences = {
				branchReadOnly: true,
			} as unknown as ReturnType<typeof useSourceControlStore>['preferences'];
		});

		it('should not render recommended templates section', () => {
			const { queryByTestId } = renderComponent();

			expect(queryByTestId('recommended-templates-section')).not.toBeInTheDocument();
		});

		it('should not render new workflow card', () => {
			const { queryByTestId } = renderComponent();

			expect(queryByTestId('new-workflow-card')).not.toBeInTheDocument();
		});
	});

	describe('when user does not have workflow create permission', () => {
		beforeEach(() => {
			recommendedTemplatesStore.isFeatureEnabled = true;
			projectsStore.personalProject = {
				id: 'personal-project-1',
				name: 'Personal Project',
				type: 'personal',
				scopes: ['workflow:read'],
			} as unknown as ReturnType<typeof useProjectsStore>['personalProject'];
		});

		it('should not render recommended templates section', () => {
			const { queryByTestId } = renderComponent();

			expect(queryByTestId('recommended-templates-section')).not.toBeInTheDocument();
		});

		it('should not render new workflow card', () => {
			const { queryByTestId } = renderComponent();

			expect(queryByTestId('new-workflow-card')).not.toBeInTheDocument();
		});
	});
});

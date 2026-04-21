import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import EmptyStateLayout from './EmptyStateLayout.vue';
import { createTestingPinia } from '@pinia/testing';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useRecommendedTemplatesStore } from '@/features/workflows/templates/recommendations/recommendedTemplates.store';
import { useBannersStore } from '@/features/shared/banners/banners.store';
import userEvent from '@testing-library/user-event';
import type { IUser } from '@n8n/rest-api-client/api/users';

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

	beforeEach(() => {
		usersStore = mockedStore(useUsersStore);
		projectsStore = mockedStore(useProjectsStore);
		sourceControlStore = mockedStore(useSourceControlStore);
		recommendedTemplatesStore = mockedStore(useRecommendedTemplatesStore);
		bannersStore = mockedStore(useBannersStore);

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

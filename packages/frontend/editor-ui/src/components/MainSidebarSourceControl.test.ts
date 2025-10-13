import { describe, it, expect, vi } from 'vitest';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import merge from 'lodash/merge';
import { reactive } from 'vue';
import { STORES } from '@n8n/stores';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import MainSidebarSourceControl from '@/components/MainSidebarSourceControl.vue';
import { useSourceControlStore } from '@/features/sourceControl.ee/sourceControl.store';
import { useRBACStore } from '@/stores/rbac.store';
import { createComponentRenderer } from '@/__tests__/render';
import { useProjectsStore } from '@/features/projects/projects.store';

let pinia: ReturnType<typeof createTestingPinia>;
let sourceControlStore: ReturnType<typeof useSourceControlStore>;
let rbacStore: ReturnType<typeof useRBACStore>;
let projectStore: ReturnType<typeof useProjectsStore>;

const mockRoute = reactive({
	query: {},
});

const mockRouterPush = vi.fn();

vi.mock('vue-router', () => ({
	useRoute: () => mockRoute,
	useRouter: () => ({
		push: mockRouterPush,
	}),
	RouterLink: vi.fn(),
}));

const renderComponent = createComponentRenderer(MainSidebarSourceControl);

describe('MainSidebarSourceControl', () => {
	beforeEach(() => {
		vi.resetAllMocks();

		// Reset route mock to default values
		mockRoute.query = {};

		// Reset router push mock
		mockRouterPush.mockReset();

		pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: merge({}, SETTINGS_STORE_DEFAULT_STATE.settings),
				},
			},
		});

		rbacStore = useRBACStore(pinia);
		projectStore = useProjectsStore(pinia);
		vi.spyOn(rbacStore, 'hasScope').mockReturnValue(true);

		sourceControlStore = useSourceControlStore();
		vi.spyOn(sourceControlStore, 'isEnterpriseSourceControlEnabled', 'get').mockReturnValue(true);
	});

	it('should render nothing when not instance owner', async () => {
		vi.spyOn(rbacStore, 'hasScope').mockReturnValue(false);
		const { container } = renderComponent({ pinia, props: { isCollapsed: false } });
		expect(container).toBeEmptyDOMElement();
	});

	it('should render empty content when instance owner but not connected', async () => {
		const { getByTestId } = renderComponent({ pinia, props: { isCollapsed: false } });
		expect(getByTestId('main-sidebar-source-control')).toBeInTheDocument();
		expect(getByTestId('main-sidebar-source-control')).toBeEmptyDOMElement();
	});

	describe('when connected as project admin', () => {
		beforeEach(() => {
			vi.spyOn(rbacStore, 'hasScope').mockReturnValue(false);
			vi.spyOn(sourceControlStore, 'preferences', 'get').mockReturnValue({
				branchName: 'main',
				branches: [],
				repositoryUrl: '',
				branchReadOnly: false,
				branchColor: '#5296D6',
				connected: true,
				publicKey: '',
			});
			projectStore.myProjects = [
				{
					id: '1',
					name: 'Test Project',
					type: 'team',
					scopes: ['sourceControl:push'],
					icon: { type: 'emoji', value: '🚀' },
					createdAt: '2023-01-01T00:00:00Z',
					updatedAt: '2023-01-01T00:00:00Z',
					role: 'project:admin',
				},
			];
		});

		it('should render the appropriate content', async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				pinia,
				props: { isCollapsed: false },
			});
			expect(getByTestId('main-sidebar-source-control-connected')).toBeInTheDocument();
			expect(queryByTestId('main-sidebar-source-control-setup')).not.toBeInTheDocument();

			const pushButton = queryByTestId('main-sidebar-source-control-push');
			expect(pushButton).toBeInTheDocument();
			expect(pushButton).not.toBeDisabled();

			const pullButton = queryByTestId('main-sidebar-source-control-pull');
			expect(pullButton).toBeInTheDocument();
			expect(pullButton).toBeDisabled();
		});

		it('should disable push button if branch is read-only', async () => {
			vi.spyOn(sourceControlStore, 'preferences', 'get').mockReturnValue({
				branchName: 'main',
				branches: [],
				repositoryUrl: '',
				branchReadOnly: true,
				branchColor: '#5296D6',
				connected: true,
				publicKey: '',
			});

			const { getByTestId } = renderComponent({
				pinia,
				props: { isCollapsed: false },
			});
			const pushButton = getByTestId('main-sidebar-source-control-push');
			expect(pushButton).toBeDisabled();
		});
	});

	describe('when connected', () => {
		beforeEach(() => {
			vi.spyOn(rbacStore, 'hasScope').mockReturnValue(true);
			vi.spyOn(sourceControlStore, 'preferences', 'get').mockReturnValue({
				branchName: 'main',
				branches: [],
				repositoryUrl: '',
				branchReadOnly: false,
				branchColor: '#5296D6',
				connected: true,
				publicKey: '',
			});
		});

		it('should render the appropriate content', async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				pinia,
				props: { isCollapsed: false },
			});
			expect(getByTestId('main-sidebar-source-control-connected')).toBeInTheDocument();
			expect(queryByTestId('main-sidebar-source-control-setup')).not.toBeInTheDocument();

			const pushButton = queryByTestId('main-sidebar-source-control-push');
			expect(pushButton).toBeInTheDocument();
			expect(pushButton).not.toBeDisabled();

			const pullButton = queryByTestId('main-sidebar-source-control-pull');
			expect(pullButton).toBeInTheDocument();
			expect(pullButton).not.toBeDisabled();
		});

		it('should disable push button if branch is read-only', async () => {
			vi.spyOn(sourceControlStore, 'preferences', 'get').mockReturnValue({
				branchName: 'main',
				branches: [],
				repositoryUrl: '',
				branchReadOnly: true,
				branchColor: '#5296D6',
				connected: true,
				publicKey: '',
			});
			const { getByTestId } = renderComponent({
				pinia,
				props: { isCollapsed: false },
			});
			const pushButton = getByTestId('main-sidebar-source-control-push');
			expect(pushButton).toBeDisabled();
		});

		it('should navigate to pull route when pull button is clicked', async () => {
			const { getAllByRole } = renderComponent({
				pinia,
				props: { isCollapsed: false },
			});

			await userEvent.click(getAllByRole('button')[0]);
			await waitFor(() =>
				expect(mockRouterPush).toHaveBeenCalledWith({
					query: {
						sourceControl: 'pull',
					},
				}),
			);
		});

		it('should navigate to push route when push button is clicked', async () => {
			const { getAllByRole } = renderComponent({
				pinia,
				props: { isCollapsed: false },
			});

			await userEvent.click(getAllByRole('button')[1]);
			await waitFor(() =>
				expect(mockRouterPush).toHaveBeenCalledWith({
					query: {
						sourceControl: 'push',
					},
				}),
			);
		});
	});
});

import { describe, it, expect, vi } from 'vitest';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import merge from 'lodash/merge';
import { SOURCE_CONTROL_PULL_MODAL_KEY, SOURCE_CONTROL_PUSH_MODAL_KEY } from '@/constants';
import { STORES } from '@n8n/stores';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import MainSidebarSourceControl from '@/components/MainSidebarSourceControl.vue';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useUIStore } from '@/stores/ui.store';
import { useRBACStore } from '@/stores/rbac.store';
import { createComponentRenderer } from '@/__tests__/render';
import { useProjectsStore } from '@/stores/projects.store';

let pinia: ReturnType<typeof createTestingPinia>;
let sourceControlStore: ReturnType<typeof useSourceControlStore>;
let uiStore: ReturnType<typeof useUIStore>;
let rbacStore: ReturnType<typeof useRBACStore>;
let projectStore: ReturnType<typeof useProjectsStore>;

const showMessage = vi.fn();
const showError = vi.fn();
const showToast = vi.fn();
vi.mock('@/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError, showToast }),
}));

const renderComponent = createComponentRenderer(MainSidebarSourceControl);

describe('MainSidebarSourceControl', () => {
	beforeEach(() => {
		vi.resetAllMocks();
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

		uiStore = useUIStore();
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

		it('should show toast error if pull response http status code is not 409', async () => {
			vi.spyOn(sourceControlStore, 'pullWorkfolder').mockRejectedValueOnce({
				response: { status: 400 },
			});
			const { getAllByRole } = renderComponent({
				pinia,
				props: { isCollapsed: false },
			});

			await userEvent.click(getAllByRole('button')[0]);
			await waitFor(() => expect(showError).toHaveBeenCalled());
		});

		it('should show confirm if pull response http status code is 409', async () => {
			const status = {};
			vi.spyOn(sourceControlStore, 'pullWorkfolder').mockRejectedValueOnce({
				response: { status: 409, data: { data: status } },
			});
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');

			const { getAllByRole } = renderComponent({
				pinia,
				props: { isCollapsed: false },
			});

			await userEvent.click(getAllByRole('button')[0]);
			await waitFor(() =>
				expect(openModalSpy).toHaveBeenCalledWith(
					expect.objectContaining({
						name: SOURCE_CONTROL_PULL_MODAL_KEY,
						data: expect.objectContaining({
							status,
						}),
					}),
				),
			);
		});

		it('should show toast when there are no changes', async () => {
			vi.spyOn(sourceControlStore, 'getAggregatedStatus').mockResolvedValueOnce([]);

			const { getAllByRole } = renderComponent({
				pinia,
				props: { isCollapsed: false },
			});

			await userEvent.click(getAllByRole('button')[1]);
			await waitFor(() =>
				expect(showMessage).toHaveBeenCalledWith(
					expect.objectContaining({ title: 'No changes to commit' }),
				),
			);
		});

		it('should open push modal when there are changes', async () => {
			const status = [
				{
					id: '014da93897f146d2b880-baa374b9d02d',
					name: 'vuelfow2',
					type: 'workflow' as const,
					status: 'created' as const,
					location: 'local' as const,
					conflict: false,
					file: '/014da93897f146d2b880-baa374b9d02d.json',
					updatedAt: '2025-01-09T13:12:24.580Z',
				},
			];
			vi.spyOn(sourceControlStore, 'getAggregatedStatus').mockResolvedValueOnce(status);
			const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');

			const { getAllByRole } = renderComponent({
				pinia,
				props: { isCollapsed: false },
			});

			await userEvent.click(getAllByRole('button')[1]);
			await waitFor(() =>
				expect(openModalSpy).toHaveBeenCalledWith(
					expect.objectContaining({
						name: SOURCE_CONTROL_PUSH_MODAL_KEY,
						data: expect.objectContaining({
							status,
						}),
					}),
				),
			);
		});
	});
});

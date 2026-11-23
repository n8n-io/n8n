import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type {
	FrontendSettings,
	WorkflowReviewProject,
	WorkflowReviewProjectList,
} from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { EnterpriseEditionFeature } from '@/app/constants';
import WorkflowReviewProjectsView from './WorkflowReviewProjectsView.vue';

const getWorkflowReviewProjects = vi.fn();
const updateWorkflowReviewProject = vi.fn();

vi.mock('@/features/workflow-reviews/workflowReviews.api', () => ({
	getWorkflowReviewProjects: (...args: unknown[]) => getWorkflowReviewProjects(...args),
	updateWorkflowReviewProject: (...args: unknown[]) => updateWorkflowReviewProject(...args),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({ push: vi.fn() }),
}));

const showToast = vi.fn();
const showError = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showToast, showError }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

const renderView = createComponentRenderer(WorkflowReviewProjectsView, {
	pinia: createTestingPinia({ stubActions: false }),
});

function project(overrides: Partial<WorkflowReviewProject>): WorkflowReviewProject {
	return {
		id: 'p1',
		name: 'Alpha',
		icon: null,
		requiredByInstance: false,
		requiredByProject: false,
		...overrides,
	};
}

function projectList(
	data: WorkflowReviewProject[],
	overrides: Partial<WorkflowReviewProjectList> = {},
): WorkflowReviewProjectList {
	return { count: data.length, data, managedByEnv: false, ...overrides };
}

const approvalSelect = async (name: string) =>
	await screen.findByRole('combobox', { name: `Approval for ${name}` });

function setInstancePolicy(alwaysRequired: boolean) {
	const settingsStore = mockedStore(useSettingsStore);
	settingsStore.settings = {
		...settingsStore.settings,
		enterprise: {
			...settingsStore.settings.enterprise,
			[EnterpriseEditionFeature.WorkflowReviews]: true,
		},
		workflowReviews: { enabled: true, alwaysRequired },
	} as FrontendSettings;
}

describe('WorkflowReviewProjectsView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setInstancePolicy(false);
		getWorkflowReviewProjects.mockResolvedValue(
			projectList([
				project({ id: 'p1', name: 'Alpha', requiredByInstance: true }),
				project({ id: 'p2', name: 'Beta' }),
			]),
		);
	});

	it('shows each team project with its option', async () => {
		renderView();

		expect(await approvalSelect('Alpha')).toHaveTextContent('Required');
		expect(await approvalSelect('Beta')).toHaveTextContent('Not required');
		expect(getWorkflowReviewProjects).toHaveBeenCalledWith(expect.anything(), {
			skip: 0,
			take: 10,
		});
	});

	it('shows Required by project admin on a Not required row whose project opted in', async () => {
		getWorkflowReviewProjects.mockResolvedValue(
			projectList([project({ id: 'p2', name: 'Beta', requiredByProject: true })]),
		);
		const { findByText } = renderView();

		expect(await approvalSelect('Beta')).toHaveTextContent('Not required');
		expect(await findByText('Required by project admin')).toBeInTheDocument();
	});

	it('saves a changed option at once and shows a toast', async () => {
		updateWorkflowReviewProject.mockResolvedValue({ requiredByInstance: true });
		renderView();

		await userEvent.click(await approvalSelect('Beta'));
		await userEvent.click(await screen.findByRole('option', { name: 'Required' }));

		expect(updateWorkflowReviewProject).toHaveBeenCalledWith(expect.anything(), 'p2', {
			requiredByInstance: true,
		});
		await waitFor(() =>
			expect(showToast).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'success', title: 'Approval setting updated' }),
			),
		);
		expect(await approvalSelect('Beta')).toHaveTextContent('Required');
	});

	it('keeps the previous option when the save fails', async () => {
		updateWorkflowReviewProject.mockRejectedValue(new Error('network down'));
		renderView();

		await userEvent.click(await approvalSelect('Alpha'));
		await userEvent.click(await screen.findByRole('option', { name: 'Not required' }));

		await waitFor(() => expect(showError).toHaveBeenCalled());
		expect(await approvalSelect('Alpha')).toHaveTextContent('Required');
		expect(showToast).not.toHaveBeenCalled();
	});

	describe('search and filter', () => {
		beforeEach(() => {
			vi.useFakeTimers({ shouldAdvanceTime: true });
			getWorkflowReviewProjects.mockResolvedValue(
				projectList([project({ id: 'p1', name: 'Alpha' })], { count: 25 }),
			);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('reloads the first page with the search term and the filter', async () => {
			const { findByTestId, getByTestId } = renderView();
			await userEvent.click(await findByTestId('pagination-next'));
			await waitFor(() =>
				expect(getWorkflowReviewProjects).toHaveBeenLastCalledWith(expect.anything(), {
					skip: 10,
					take: 10,
				}),
			);

			await userEvent.type(getByTestId('workflow-review-projects-search'), 'alp');
			await vi.runAllTimersAsync();
			expect(getWorkflowReviewProjects).toHaveBeenLastCalledWith(expect.anything(), {
				skip: 0,
				take: 10,
				search: 'alp',
			});

			await userEvent.click(getByTestId('resources-list-filters-trigger'));
			const filter = await findByTestId('workflow-review-projects-filter-approval');
			await userEvent.click(within(filter).getAllByRole('combobox')[0]);
			await userEvent.click(await screen.findByRole('option', { name: 'Required' }));
			await waitFor(() =>
				expect(getWorkflowReviewProjects).toHaveBeenLastCalledWith(expect.anything(), {
					skip: 0,
					take: 10,
					search: 'alp',
					requiredByInstance: true,
				}),
			);
		});
	});

	it('shows every row as Required and locked, naming the instance setting, while the instance always requires approval', async () => {
		setInstancePolicy(true);
		const { findAllByText } = renderView();

		const beta = await approvalSelect('Beta');
		expect(beta).toHaveTextContent('Required');
		expect(beta).toHaveAttribute('data-disabled');

		await userEvent.hover(beta.parentElement!);
		expect(
			await findAllByText('Require approval is set to "Always required" for all projects.'),
		).not.toHaveLength(0);
	});

	it('shows the rows read-only while the security policy is managed by environment variables', async () => {
		getWorkflowReviewProjects.mockResolvedValue(
			projectList([project({ id: 'p2', name: 'Beta' })], { managedByEnv: true }),
		);
		const { findByTestId } = renderView();

		expect(await findByTestId('workflow-review-projects-managed-by-env-notice')).toBeVisible();
		expect(await approvalSelect('Beta')).toHaveAttribute('data-disabled');
	});

	it('shows the load error and no rows when the projects cannot load', async () => {
		getWorkflowReviewProjects.mockRejectedValue(new Error('network down'));
		const { findByTestId } = renderView();

		expect(await findByTestId('workflow-review-projects-load-error')).toBeVisible();
		expect(screen.queryByRole('combobox', { name: /Approval for/ })).not.toBeInTheDocument();
	});
});

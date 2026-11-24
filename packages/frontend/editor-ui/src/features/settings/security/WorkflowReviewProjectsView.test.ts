import { createTestingPinia } from '@pinia/testing';
import { onTestFinished } from 'vitest';
import { screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type {
	FrontendSettings,
	WorkflowReviewInstanceSettingsProject,
	WorkflowReviewInstanceSettingsList,
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

function project(
	overrides: Partial<WorkflowReviewInstanceSettingsProject>,
): WorkflowReviewInstanceSettingsProject {
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
	data: WorkflowReviewInstanceSettingsProject[],
	overrides: Partial<WorkflowReviewInstanceSettingsList> = {},
): WorkflowReviewInstanceSettingsList {
	return { count: data.length, data, managedByEnv: false, ...overrides };
}

/** Serves the list and the saves from `stored`, so a reload reads what a save wrote. */
function serveStoredProjects(stored: WorkflowReviewInstanceSettingsProject[]) {
	getWorkflowReviewProjects.mockImplementation(
		async (_context, query: { skip: number; take: number; requiredByInstance?: boolean }) => {
			const matches = stored.filter(
				(row) =>
					query.requiredByInstance === undefined ||
					row.requiredByInstance === query.requiredByInstance,
			);
			return projectList(matches.slice(query.skip, query.skip + query.take), {
				count: matches.length,
			});
		},
	);
	updateWorkflowReviewProject.mockImplementation(
		async (_context, projectId: string, { requiredByInstance }) => {
			const row = stored.find(({ id }) => id === projectId)!;
			row.requiredByInstance = requiredByInstance;
			return { requiredByInstance };
		},
	);
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
		serveStoredProjects([
			project({ id: 'p1', name: 'Alpha', requiredByInstance: true }),
			project({ id: 'p2', name: 'Beta' }),
		]);
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

	it('keeps a saved option when an older list request returns after the save', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		onTestFinished(() => {
			vi.useRealTimers();
		});
		const stored = [
			project({ id: 'p1', name: 'Alpha', requiredByInstance: true }),
			project({ id: 'p2', name: 'Beta' }),
		];
		serveStoredProjects(stored);
		const staleList = projectList(stored.map((row) => ({ ...row })));
		const { getByTestId } = renderView();
		await approvalSelect('Beta');

		let returnStaleList: (list: WorkflowReviewInstanceSettingsList) => void = () => {};
		getWorkflowReviewProjects.mockImplementationOnce(
			async () => await new Promise((resolve) => (returnStaleList = resolve)),
		);
		await userEvent.type(getByTestId('workflow-review-projects-search'), 'a');
		await vi.runAllTimersAsync();

		await userEvent.click(await approvalSelect('Beta'));
		await userEvent.click(await screen.findByRole('option', { name: 'Required' }));
		await waitFor(() => expect(showToast).toHaveBeenCalled());
		returnStaleList(staleList);
		await vi.runAllTimersAsync();

		const beta = await approvalSelect('Beta');
		expect(beta).toHaveTextContent('Required');
		expect(beta).not.toHaveTextContent('Not required');
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

		it('says when no project matches the search', async () => {
			const { findByTestId, getByTestId } = renderView();
			await approvalSelect('Alpha');
			getWorkflowReviewProjects.mockResolvedValue(projectList([]));

			await userEvent.type(getByTestId('workflow-review-projects-search'), 'zzz');
			await vi.runAllTimersAsync();

			expect(await findByTestId('workflow-review-projects-empty')).toHaveTextContent(
				'No projects match.',
			);
		});

		it('reloads the first page with the search term and the filter', async () => {
			const { findByTestId, getByTestId } = renderView();
			expect(await findByTestId('workflow-review-projects-count')).toHaveTextContent('25 projects');
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

	it('moves to the last page when a save under a filter leaves the page empty', async () => {
		const stored = Array.from({ length: 11 }, (_, index) =>
			project({
				id: `p${index + 1}`,
				name: `Project ${String(index + 1).padStart(2, '0')}`,
				requiredByInstance: true,
			}),
		);
		serveStoredProjects(stored);
		const { findByTestId, getByTestId } = renderView();

		await userEvent.click(await findByTestId('resources-list-filters-trigger'));
		const filter = await findByTestId('workflow-review-projects-filter-approval');
		await userEvent.click(within(filter).getAllByRole('combobox')[0]);
		await userEvent.click(await screen.findByRole('option', { name: 'Required' }));
		await approvalSelect('Project 01');
		await userEvent.click(getByTestId('pagination-next'));

		await userEvent.click(await approvalSelect('Project 11'));
		await userEvent.click(await screen.findByRole('option', { name: 'Not required' }));

		expect(await approvalSelect('Project 01')).toHaveTextContent('Required');
		expect(
			screen.queryByRole('combobox', { name: 'Approval for Project 11' }),
		).not.toBeInTheDocument();
		expect(getWorkflowReviewProjects).toHaveBeenLastCalledWith(expect.anything(), {
			skip: 0,
			take: 10,
			requiredByInstance: true,
		});
	});

	it('shows every row as Required and locked, naming the instance setting, while the instance always requires approval', async () => {
		setInstancePolicy(true);
		const { findByTestId } = renderView();

		const beta = await approvalSelect('Beta');
		expect(beta).toHaveTextContent('Required');
		expect(beta).toHaveAttribute('data-disabled');
		expect(await findByTestId('workflow-review-projects-locked-notice')).toHaveTextContent(
			'Require approval is set to "Always required" for all projects.',
		);
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

	it('says when there are no team projects', async () => {
		getWorkflowReviewProjects.mockResolvedValue(projectList([]));
		const { findByTestId } = renderView();

		expect(await findByTestId('workflow-review-projects-empty')).toHaveTextContent(
			'There are no team projects.',
		);
	});
});

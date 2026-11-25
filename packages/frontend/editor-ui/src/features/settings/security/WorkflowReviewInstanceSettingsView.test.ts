import { createTestingPinia } from '@pinia/testing';
import { onTestFinished } from 'vitest';
import { screen, waitFor } from '@testing-library/vue';
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
import WorkflowReviewInstanceSettingsView from './WorkflowReviewInstanceSettingsView.vue';

const getWorkflowReviewInstanceSettings = vi.fn();
const updateWorkflowReviewInstanceSettings = vi.fn();

vi.mock('@/features/workflow-reviews/workflowReviews.api', () => ({
	getWorkflowReviewInstanceSettings: (...args: unknown[]) =>
		getWorkflowReviewInstanceSettings(...args),
	updateWorkflowReviewInstanceSettings: (...args: unknown[]) =>
		updateWorkflowReviewInstanceSettings(...args),
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

const renderView = createComponentRenderer(WorkflowReviewInstanceSettingsView, {
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
	getWorkflowReviewInstanceSettings.mockImplementation(
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
	updateWorkflowReviewInstanceSettings.mockImplementation(
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

describe('WorkflowReviewInstanceSettingsView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setInstancePolicy(false);
		getWorkflowReviewInstanceSettings.mockResolvedValue(
			projectList([
				project({ id: 'p1', name: 'Alpha', requiredByInstance: true }),
				project({ id: 'p2', name: 'Beta' }),
			]),
		);
	});

	it('shows each team project with its option and a lock icon', async () => {
		const { getByRole } = renderView();

		const alpha = await approvalSelect('Alpha');
		const beta = await approvalSelect('Beta');
		expect(alpha).toHaveTextContent('Required');
		expect(alpha.querySelector('[data-icon="lock"]')).not.toBeNull();
		expect(beta).toHaveTextContent('Not required');
		expect(beta.querySelector('[data-icon="lock-unlocked"]')).not.toBeNull();
		expect(getByRole('heading', { name: 'Publish reviews' })).toBeInTheDocument();
	});

	it('shows Required by project admin on a Not required row whose project opted in', async () => {
		getWorkflowReviewInstanceSettings.mockResolvedValue(
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

		expect(updateWorkflowReviewInstanceSettings).toHaveBeenCalledWith(expect.anything(), 'p2', {
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
		updateWorkflowReviewInstanceSettings.mockRejectedValue(new Error('network down'));
		renderView();

		await userEvent.click(await approvalSelect('Alpha'));
		await userEvent.click(await screen.findByRole('option', { name: 'Not required' }));

		await waitFor(() => expect(showError).toHaveBeenCalled());
		expect(await approvalSelect('Alpha')).toHaveTextContent('Required');
		expect(showToast).not.toHaveBeenCalled();
	});

	it('keeps the rows and reports the error when the reload after a save fails', async () => {
		renderView();
		await approvalSelect('Alpha');
		getWorkflowReviewInstanceSettings.mockRejectedValue(new Error('network down'));
		updateWorkflowReviewInstanceSettings.mockResolvedValue({ requiredByInstance: false });

		await userEvent.click(await approvalSelect('Alpha'));
		await userEvent.click(await screen.findByRole('option', { name: 'Not required' }));

		await waitFor(() => expect(showError).toHaveBeenCalled());
		expect(await approvalSelect('Alpha')).toHaveTextContent('Not required');
		expect(
			screen.queryByTestId('workflow-review-instance-settings-load-error'),
		).not.toBeInTheDocument();
	});

	it('shows the load error and no old rows when a page change fails', async () => {
		getWorkflowReviewInstanceSettings.mockResolvedValue(
			projectList(
				Array.from({ length: 10 }, (_, i) => project({ id: `p${i}`, name: `Project ${i}` })),
				{ count: 11 },
			),
		);
		const { getByTestId, findByTestId } = renderView();
		await approvalSelect('Project 0');
		getWorkflowReviewInstanceSettings.mockRejectedValue(new Error('network down'));

		await userEvent.click(getByTestId('pagination-next'));

		expect(await findByTestId('workflow-review-instance-settings-load-error')).toBeInTheDocument();
		expect(
			screen.queryByRole('combobox', { name: 'Approval for Project 0' }),
		).not.toBeInTheDocument();
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
		getWorkflowReviewInstanceSettings.mockImplementationOnce(
			async () => await new Promise((resolve) => (returnStaleList = resolve)),
		);
		await userEvent.type(getByTestId('workflow-review-instance-settings-search'), 'a');
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
			getWorkflowReviewInstanceSettings.mockResolvedValue(
				projectList([project({ id: 'p1', name: 'Alpha' })], { count: 25 }),
			);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('says when no project matches the search', async () => {
			const { findByTestId, getByTestId } = renderView();
			await approvalSelect('Alpha');
			getWorkflowReviewInstanceSettings.mockResolvedValue(projectList([]));

			await userEvent.type(getByTestId('workflow-review-instance-settings-search'), 'zzz');
			await vi.runAllTimersAsync();

			expect(await findByTestId('workflow-review-instance-settings-empty')).toHaveTextContent(
				'No projects match.',
			);
		});

		it('reloads the first page with the search term and the filter', async () => {
			const { findByTestId, getByTestId } = renderView();
			await userEvent.click(await findByTestId('pagination-next'));
			await waitFor(() =>
				expect(getWorkflowReviewInstanceSettings).toHaveBeenLastCalledWith(expect.anything(), {
					skip: 10,
					take: 10,
				}),
			);

			await userEvent.type(getByTestId('workflow-review-instance-settings-search'), 'alp');
			await vi.runAllTimersAsync();
			expect(getWorkflowReviewInstanceSettings).toHaveBeenLastCalledWith(expect.anything(), {
				skip: 0,
				take: 10,
				search: 'alp',
			});

			await userEvent.click(getByTestId('resources-list-filters-trigger'));
			const filter = await findByTestId('workflow-review-instance-settings-filter-approval');
			await userEvent.click(filter);
			await userEvent.click(await screen.findByRole('option', { name: 'Required' }));
			await waitFor(() =>
				expect(getWorkflowReviewInstanceSettings).toHaveBeenLastCalledWith(expect.anything(), {
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
		const filter = await findByTestId('workflow-review-instance-settings-filter-approval');
		await userEvent.click(filter);
		await userEvent.click(await screen.findByRole('option', { name: 'Required' }));
		await approvalSelect('Project 01');
		await userEvent.click(getByTestId('pagination-next'));

		await userEvent.click(await approvalSelect('Project 11'));
		await userEvent.click(await screen.findByRole('option', { name: 'Not required' }));

		expect(await approvalSelect('Project 01')).toHaveTextContent('Required');
		expect(
			screen.queryByRole('combobox', { name: 'Approval for Project 11' }),
		).not.toBeInTheDocument();
		expect(getWorkflowReviewInstanceSettings).toHaveBeenLastCalledWith(expect.anything(), {
			skip: 0,
			take: 10,
			requiredByInstance: true,
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
		getWorkflowReviewInstanceSettings.mockResolvedValue(
			projectList([project({ id: 'p2', name: 'Beta' })], { managedByEnv: true }),
		);
		const { findByTestId } = renderView();

		expect(
			await findByTestId('workflow-review-instance-settings-managed-by-env-notice'),
		).toBeVisible();
		expect(await approvalSelect('Beta')).toHaveAttribute('data-disabled');
	});

	it('shows the load error and no rows when the projects cannot load', async () => {
		getWorkflowReviewInstanceSettings.mockRejectedValue(new Error('network down'));
		const { findByTestId } = renderView();

		expect(await findByTestId('workflow-review-instance-settings-load-error')).toBeVisible();
		expect(screen.queryByRole('combobox', { name: /Approval for/ })).not.toBeInTheDocument();
	});

	it('says when there are no team projects', async () => {
		getWorkflowReviewInstanceSettings.mockResolvedValue(projectList([]));
		const { findByTestId } = renderView();

		expect(await findByTestId('workflow-review-instance-settings-empty')).toHaveTextContent(
			'There are no team projects.',
		);
	});
});

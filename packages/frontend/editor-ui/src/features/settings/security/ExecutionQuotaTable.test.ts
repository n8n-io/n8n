import { fireEvent, screen } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { renderComponent } from '@/__tests__/render';
import { useUIStore } from '@/app/stores/ui.store';
import type { ProjectExecutionQuotaRow } from '@/features/collaboration/projects/projects.types';
import { EXECUTION_QUOTA_EDIT_MODAL_KEY } from './executionQuota.constants';
import ExecutionQuotaTable from './ExecutionQuotaTable.vue';

const getAllProjectsExecutionQuota = vi.fn();
vi.mock('@/features/collaboration/projects/projects.api', () => ({
	getAllProjectsExecutionQuota: (...args: unknown[]) => getAllProjectsExecutionQuota(...args),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

const showError = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError }),
}));

function makeRow(overrides: Partial<ProjectExecutionQuotaRow> = {}): ProjectExecutionQuotaRow {
	return {
		projectId: 'p1',
		projectName: 'Project One',
		limit: 100,
		periodUnit: 'day',
		consumed: 10,
		remaining: 90,
		resetsAt: new Date().toISOString(),
		...overrides,
	};
}

describe('ExecutionQuotaTable', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia({ stubActions: false }));
	});

	it('renders one row per project from the API response', async () => {
		const rows = [
			makeRow({ projectId: 'p1', projectName: 'Project One' }),
			makeRow({ projectId: 'p2', projectName: 'Project Two' }),
		];
		getAllProjectsExecutionQuota.mockResolvedValue(rows);

		renderComponent(ExecutionQuotaTable);

		expect(await screen.findByText('Project One')).toBeInTheDocument();
		expect(await screen.findByText('Project Two')).toBeInTheDocument();
	});

	it('emits edit and opens the edit modal when a row edit action is used', async () => {
		const row = makeRow({ projectId: 'p1', projectName: 'Project One', limit: 50 });
		getAllProjectsExecutionQuota.mockResolvedValue([row]);

		const { emitted } = renderComponent(ExecutionQuotaTable);

		await screen.findByText('Project One');

		const uiStore = useUIStore();
		expect(uiStore.modalsById[EXECUTION_QUOTA_EDIT_MODAL_KEY]?.open).not.toBe(true);

		await fireEvent.click(screen.getByTestId('execution-quota-actions-toggle'));
		await fireEvent.click(await screen.findByTestId('execution-quota-edit-action'));

		expect(emitted('edit')).toEqual([[row]]);
		expect(uiStore.modalsById[EXECUTION_QUOTA_EDIT_MODAL_KEY]?.open).toBe(true);
		expect(uiStore.modalsById[EXECUTION_QUOTA_EDIT_MODAL_KEY]?.data).toEqual({
			projectId: 'p1',
			projectName: 'Project One',
			limit: 50,
			periodUnit: 'day',
		});
	});

	it('shows an empty state when there are no projects', async () => {
		getAllProjectsExecutionQuota.mockResolvedValue([]);

		renderComponent(ExecutionQuotaTable);

		expect(await screen.findByTestId('execution-quota-empty')).toBeInTheDocument();
	});
});

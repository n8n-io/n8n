import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import { useUIStore } from '@/app/stores/ui.store';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import type { DataTable } from '@/features/core/dataTable/dataTable.types';
import RowAccessModal from '@/features/core/dataTable/components/RowAccessModal.vue';

const ModalStub = {
	template: '<div><slot name="content" /><slot name="footer" /></div>',
};

const MODAL_NAME = 'row-access-t1';

const dataTable: DataTable = {
	id: 't1',
	name: 'Leads',
	sizeBytes: 0,
	projectId: 'p1',
	createdAt: '',
	updatedAt: '',
	columns: [
		{ id: 'c1', name: 'owner', type: 'string', index: 0 },
		{ id: 'c2', name: 'score', type: 'number', index: 1 },
	],
	rowRule: null,
};

const chooseScope = async (container: HTMLElement, scope: 'all' | 'own') =>
	await userEvent.click(container.querySelector(`[value="${scope}"]`) as HTMLElement);

const renderComponent = createComponentRenderer(RowAccessModal, {
	props: { modalName: MODAL_NAME, dataTable },
	global: { stubs: { Modal: ModalStub } },
});

describe('RowAccessModal', () => {
	let dataTableStore: ReturnType<typeof mockedStore<typeof useDataTableStore>>;

	beforeEach(() => {
		createTestingPinia();
		dataTableStore = mockedStore(useDataTableStore);
		const uiStore = mockedStore(useUIStore);
		uiStore.isModalActiveById = { [MODAL_NAME]: true };
		dataTableStore.setRowRule.mockResolvedValue(undefined);
	});

	it('keeps workflows without a user on all rows when the rule is new', async () => {
		dataTableStore.fetchRowRuleImpact.mockResolvedValue({
			workflowsWithoutUser: [{ id: 'wf-1', name: 'Nightly sync' }],
		});
		const { getByTestId, getByText } = renderComponent();

		await chooseScope(getByTestId('row-access-scope'), 'own');

		await waitFor(() => expect(getByText('Nightly sync')).toBeInTheDocument());
		await userEvent.click(getByTestId('row-access-save'));

		expect(dataTableStore.setRowRule).toHaveBeenCalledWith('t1', 'p1', {
			column: 'owner',
			match: 'id',
			runsWithoutUser: 'allRows',
		});
	});

	it('refuses runs without a user when no published workflow needs them', async () => {
		dataTableStore.fetchRowRuleImpact.mockResolvedValue({ workflowsWithoutUser: [] });
		const { getByTestId } = renderComponent();

		await waitFor(() => expect(dataTableStore.fetchRowRuleImpact).toHaveBeenCalled());
		await chooseScope(getByTestId('row-access-scope'), 'own');
		await userEvent.click(getByTestId('row-access-save'));

		expect(dataTableStore.setRowRule).toHaveBeenCalledWith('t1', 'p1', {
			column: 'owner',
			match: 'id',
			runsWithoutUser: 'deny',
		});
	});

	it('removes the rule when everyone sees all rows', async () => {
		dataTableStore.fetchRowRuleImpact.mockResolvedValue({ workflowsWithoutUser: [] });
		const { getByTestId } = renderComponent({
			props: {
				dataTable: {
					...dataTable,
					rowRule: { column: 'owner', match: 'email', runsWithoutUser: 'deny' },
				},
			},
		});

		await waitFor(() => expect(dataTableStore.fetchRowRuleImpact).toHaveBeenCalled());
		await chooseScope(getByTestId('row-access-scope'), 'all');
		await userEvent.click(getByTestId('row-access-save'));

		expect(dataTableStore.setRowRule).toHaveBeenCalledWith('t1', 'p1', null);
	});
});

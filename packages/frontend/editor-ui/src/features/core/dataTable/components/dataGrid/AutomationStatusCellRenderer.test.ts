import { createComponentRenderer } from '@/__tests__/render';
import AutomationStatusCellRenderer from '@/features/core/dataTable/components/dataGrid/AutomationStatusCellRenderer.vue';
import { createPinia, setActivePinia } from 'pinia';

// The virtual `automations` field is not part of the cell value union.
const params = (nodeId: string, automations: unknown[]) =>
	({ nodeId, data: { id: 1, automations } }) as never;

const renderComponent = createComponentRenderer(AutomationStatusCellRenderer, {
	global: { stubs: { RouterLink: { template: '<a data-test-id="automation-link"><slot /></a>' } } },
});

describe('AutomationStatusCellRenderer', () => {
	beforeEach(() => setActivePinia(createPinia()));

	it('renders the status of the trigger node from the row', () => {
		const { queryByTestId } = renderComponent({
			props: {
				params: params('node-1', [
					{
						nodeId: 'node-1',
						workflowId: 'wf',
						status: 'finished',
						executionId: '7',
						executionExists: true,
					},
					{
						nodeId: 'node-2',
						workflowId: 'wf2',
						status: 'failed',
						executionId: null,
						executionExists: false,
					},
				]),
			},
		});
		expect(queryByTestId('automation-link')).toHaveClass('automation-status-cell--finished');
		expect(queryByTestId('automation-link')).toHaveTextContent('Finished');
	});

	it('renders nothing when the row was never processed by this node', () => {
		const { queryByTestId } = renderComponent({
			props: { params: params('node-9', []) },
		});
		expect(queryByTestId('automation-link')).not.toBeInTheDocument();
	});
});

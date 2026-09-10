import { createComponentRenderer } from '@/__tests__/render';
import AutomationStatusLink from '@/features/core/dataTable/components/AutomationStatusLink.vue';
import type { DataTableRowAutomation } from '@/features/core/dataTable/dataTable.types';
import { createPinia, setActivePinia } from 'pinia';

const automation = (overrides: Partial<DataTableRowAutomation> = {}): DataTableRowAutomation => ({
	nodeId: 'node-1',
	workflowId: 'wf',
	workflowName: 'Sync orders',
	status: 'failed',
	executionId: '7',
	executionExists: true,
	error: 'Boom',
	updatedAt: new Date(),
	...overrides,
});

const renderComponent = createComponentRenderer(AutomationStatusLink, {
	global: {
		stubs: {
			RouterLink: {
				props: ['to'],
				template: '<a data-test-id="automation-link" :data-route="to.name"><slot /></a>',
			},
		},
	},
});

describe('AutomationStatusLink', () => {
	beforeEach(() => setActivePinia(createPinia()));

	it('links to the execution when it still exists', () => {
		const { getByTestId } = renderComponent({ props: { automation: automation() } });
		const link = getByTestId('automation-link');
		expect(link).toHaveTextContent('Failed');
		expect(link).toHaveClass('automation-status-cell--failed');
		expect(link.dataset.route).toBe('ExecutionPreview');
	});

	it('falls back to the workflow when the execution was pruned', () => {
		const { getByTestId } = renderComponent({
			props: { automation: automation({ status: 'finished', executionExists: false }) },
		});
		expect(getByTestId('automation-link').dataset.route).toBe('NodeViewExisting');
	});
});

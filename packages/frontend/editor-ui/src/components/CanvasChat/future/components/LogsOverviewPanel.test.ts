import { renderComponent } from '@/__tests__/render';
import LogsOverviewPanel from './LogsOverviewPanel.vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia, type TestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createRouter, createWebHistory } from 'vue-router';
import { h, type ExtractPropTypes } from 'vue';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import { aiAgentNode, executionResponse, aiChatWorkflow } from '../../__test__/data';

describe('LogsOverviewPanel', () => {
	let pinia: TestingPinia;
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;

	function render(props: ExtractPropTypes<typeof LogsOverviewPanel>) {
		return renderComponent(LogsOverviewPanel, {
			props,
			global: {
				plugins: [
					createRouter({
						history: createWebHistory(),
						routes: [{ path: '/', component: () => h('div') }],
					}),
					pinia,
				],
			},
		});
	}

	beforeEach(() => {
		pinia = createTestingPinia({ stubActions: false, fakeApp: true });

		setActivePinia(pinia);

		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.setWorkflow(aiChatWorkflow);
		workflowsStore.setWorkflowExecutionData(null);
	});

	it('should not render body if the panel is not open', () => {
		const rendered = render({ isOpen: false, node: null });

		expect(rendered.queryByTestId('logs-overview-empty')).not.toBeInTheDocument();
	});

	it('should render empty text if there is no execution', () => {
		const rendered = render({ isOpen: true, node: null });

		expect(rendered.queryByTestId('logs-overview-empty')).toBeInTheDocument();
	});

	it('should render summary text and executed nodes if there is an execution', async () => {
		workflowsStore.setWorkflowExecutionData(executionResponse);

		const rendered = render({ isOpen: true, node: aiAgentNode });
		const summary = within(rendered.container.querySelector('.summary')!);

		expect(summary.queryByText('Success in 1.999s')).toBeInTheDocument();
		expect(summary.queryByText('555 Tokens')).toBeInTheDocument();

		const tree = within(rendered.getByRole('tree'));

		expect(tree.queryAllByRole('treeitem')).toHaveLength(2);

		const row1 = within(tree.queryAllByRole('treeitem')[0]);

		expect(row1.queryByText('AI Agent')).toBeInTheDocument();
		expect(row1.queryByText('Success in 1.778s')).toBeInTheDocument();
		expect(row1.queryByText('Started 00:00:00.002, 26 Mar')).toBeInTheDocument();
		expect(row1.queryByText('555 Tokens')).toBeInTheDocument();

		const row2 = within(tree.queryAllByRole('treeitem')[1]);

		expect(row2.queryByText('AI Model')).toBeInTheDocument();
		expect(row2.queryByText('Error')).toBeInTheDocument();
		expect(row2.queryByText('in 1.777s')).toBeInTheDocument();
		expect(row2.queryByText('Started 00:00:00.003, 26 Mar')).toBeInTheDocument();
		expect(row2.queryByText('555 Tokens')).toBeInTheDocument();

		// collapse tree
		await fireEvent.click(row1.getByRole('button'));
		await waitFor(() => expect(tree.queryAllByRole('treeitem')).toHaveLength(1));
	});
});

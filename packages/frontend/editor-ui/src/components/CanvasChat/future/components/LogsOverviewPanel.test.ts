import { renderComponent } from '@/__tests__/render';
import LogsOverviewPanel from './LogsOverviewPanel.vue';
import { createTestNode, createTestWorkflow } from '@/__tests__/mocks';
import { setActivePinia } from 'pinia';
import { createTestingPinia, type TestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createRouter, createWebHistory } from 'vue-router';
import { h, type ExtractPropTypes } from 'vue';
import { fireEvent, waitFor, within } from '@testing-library/vue';

describe('LogsOverviewPanel', () => {
	let pinia: TestingPinia;
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;

	const triggerNode = createTestNode({ name: 'Chat' });
	const aiAgentNode = createTestNode({ name: 'AI Agent' });
	const aiModelNode = createTestNode({ name: 'AI Model' });
	const workflow = createTestWorkflow({
		nodes: [triggerNode, aiAgentNode, aiModelNode],
		connections: {
			Chat: {
				main: [[{ node: 'AI Agent', index: 0, type: 'main' }]],
			},
			'AI Model': {
				ai_languageModel: [[{ node: 'AI Agent', index: 0, type: 'ai_languageModel' }]],
			},
		},
	});

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
		workflowsStore.setWorkflow(workflow);
		workflowsStore.setWorkflowExecutionData(null);
	});

	it('should not render body if the panel is not open', () => {
		const rendered = render({ isOpen: false, node: null });

		expect(
			rendered.queryByText('Nothing to display yet', { exact: false }),
		).not.toBeInTheDocument();
	});

	it('should render empty text if there is no execution', () => {
		const rendered = render({ isOpen: true, node: null });

		expect(rendered.queryByText('Nothing to display yet', { exact: false })).toBeInTheDocument();
	});

	it('should render summary text and executed nodes if there is an execution', async () => {
		workflowsStore.setWorkflowExecutionData({
			id: 'test-exec-id',
			finished: true,
			mode: 'manual',
			status: 'success',
			data: {
				resultData: {
					runData: {
						'AI Agent': [
							{
								executionStatus: 'success',
								startTime: +new Date('2025-03-26T00:00:00.002Z'),
								executionTime: 1778,
								source: [],
								data: {},
							},
						],
						'AI Model': [
							{
								executionStatus: 'success',
								startTime: +new Date('2025-03-26T00:00:00.003Z'),
								executionTime: 1777,
								source: [],
								data: {
									ai_languageModel: [
										[
											{
												json: {
													tokenUsage: {
														completionTokens: 222,
														promptTokens: 333,
														totalTokens: 555,
													},
												},
											},
										],
									],
								},
							},
						],
					},
				},
			},
			workflowData: workflow,
			createdAt: new Date('2025-03-26T00:00:00.000Z'),
			startedAt: new Date('2025-03-26T00:00:00.001Z'),
			stoppedAt: new Date('2025-03-26T00:00:02.000Z'),
		});

		const rendered = render({ isOpen: true, node: aiAgentNode });
		const summary = within(rendered.container.querySelector('.summary')!);

		expect(summary.queryByText('Success in 1.999s')).toBeInTheDocument();
		expect(summary.queryByText('555 Tokens')).toBeInTheDocument();

		const tree = within(rendered.getByRole('tree'));

		expect(tree.queryAllByRole('treeitem')).toHaveLength(2);

		const row1 = within(tree.queryAllByRole('treeitem')[0]);

		expect(row1.queryByText('AI Agent')).toBeInTheDocument();
		expect(row1.queryByText('Success in 1.778s')).toBeInTheDocument();
		expect(row1.queryByText('Started 2025-03-26T00:00:00.002Z')).toBeInTheDocument();
		expect(row1.queryByText('555 Tokens')).toBeInTheDocument();

		const row2 = within(tree.queryAllByRole('treeitem')[1]);

		expect(row2.queryByText('AI Model')).toBeInTheDocument();
		expect(row2.queryByText('Success in 1.777s')).toBeInTheDocument();
		expect(row2.queryByText('Started 2025-03-26T00:00:00.003Z')).toBeInTheDocument();
		expect(row2.queryByText('555 Tokens')).toBeInTheDocument();

		// collapse tree
		await fireEvent.click(row1.getByRole('button'));
		await waitFor(() => expect(tree.queryAllByRole('treeitem')).toHaveLength(1));
	});
});

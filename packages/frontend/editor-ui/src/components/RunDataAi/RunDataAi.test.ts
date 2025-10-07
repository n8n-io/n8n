import {
	createTestNode,
	createTestTaskData,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
} from '@/__tests__/mocks';
import { createComponentRenderer } from '@/__tests__/render';
import { AGENT_NODE_TYPE, OPEN_AI_NODE_TYPE, WIKIPEDIA_TOOL_NODE_TYPE } from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, within } from '@testing-library/vue';
import { NodeConnectionTypes } from 'n8n-workflow';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import RunDataAi from './RunDataAi.vue';

const renderComponent = createComponentRenderer(RunDataAi);

describe('RunDataAi', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;

	const agentNode = createTestNode({ name: 'a0', type: AGENT_NODE_TYPE });

	// A model and a tool belongs to an AI agent
	const workflow = createTestWorkflow({
		nodes: [
			agentNode,
			createTestNode({ name: 'm0', type: OPEN_AI_NODE_TYPE }),
			createTestNode({ name: 't0', type: WIKIPEDIA_TOOL_NODE_TYPE }),
		],
		connections: {
			m0: {
				[NodeConnectionTypes.AiLanguageModel]: [
					[{ node: 'a0', type: NodeConnectionTypes.AiLanguageModel, index: 0 }],
				],
			},
			t0: {
				[NodeConnectionTypes.AiTool]: [
					[{ node: 'a0', type: NodeConnectionTypes.AiTool, index: 0 }],
				],
			},
		},
	});

	// Two agent runs:
	// - First run involves two model calls and no tool usage
	// - Second run involves a model call and a tool usage
	const executionResponse = createTestWorkflowExecutionResponse({
		workflowData: workflow,
		data: {
			resultData: {
				runData: {
					a0: [
						createTestTaskData({ executionIndex: 0 }),
						createTestTaskData({ executionIndex: 3 }),
					],
					m0: [
						createTestTaskData({
							executionIndex: 1,
							data: {
								[NodeConnectionTypes.AiLanguageModel]: [[{ json: { greetings: 'hello' } }]],
							},
							source: [{ previousNode: 'a0', previousNodeRun: 0 }],
						}),
						createTestTaskData({
							executionIndex: 2,
							data: {
								[NodeConnectionTypes.AiLanguageModel]: [[{ json: { greetings: 'hey' } }]],
							},
							source: [{ previousNode: 'a0', previousNodeRun: 0 }],
						}),
						createTestTaskData({
							executionIndex: 4,
							data: {
								[NodeConnectionTypes.AiLanguageModel]: [[{ json: { greetings: 'hi!!' } }]],
							},
							source: [{ previousNode: 'a0', previousNodeRun: 1 }],
						}),
					],
					t0: [
						createTestTaskData({
							executionIndex: 5,
							source: [{ previousNode: 'a0', previousNodeRun: 1 }],
						}),
					],
				},
			},
		},
	});

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		workflowsStore = useWorkflowsStore();
		workflowsStore.workflowExecutionData = executionResponse;
	});

	it('should render the log that belong to given run index', async () => {
		const rendered = renderComponent({ props: { node: agentNode, runIndex: 0 } });
		const tree = await rendered.findByRole('tree');

		expect(within(tree).queryAllByText('a0')).toHaveLength(1);
		expect(within(tree).queryAllByText('m0')).toHaveLength(2);
		expect(within(tree).queryAllByText('t0')).toHaveLength(0);

		expect(rendered.queryByText(/hello/)).toBeInTheDocument(); // first child is selected by default
		expect(rendered.queryByText(/hey/)).not.toBeInTheDocument();
		expect(rendered.queryByText(/hi!!/)).not.toBeInTheDocument();

		await rendered.rerender({ node: agentNode, runIndex: 1 });

		expect(within(tree).queryAllByText('a0')).toHaveLength(1);
		expect(within(tree).queryAllByText('m0')).toHaveLength(1);
		expect(within(tree).queryAllByText('t0')).toHaveLength(1);

		expect(rendered.queryByText(/hello/)).not.toBeInTheDocument();
		expect(rendered.queryByText(/hey/)).not.toBeInTheDocument();
		expect(await rendered.findByText(/hi!!/)).toBeInTheDocument(); // first child is selected by default
	});

	it('should allow to select a run by clicking an entry in log tree', async () => {
		const rendered = renderComponent({ props: { node: agentNode, runIndex: 0 } });
		const tree = await rendered.findByRole('tree');

		await fireEvent.click(within(tree).getAllByText('m0')[1]);

		expect(rendered.queryByText(/hey/)).toBeInTheDocument();

		await fireEvent.click(within(tree).getByText('a0'));

		// Clicking root log should trigger de-selection
		expect(rendered.queryByText(/Use these logs to see information/)).toBeInTheDocument();
	});
});

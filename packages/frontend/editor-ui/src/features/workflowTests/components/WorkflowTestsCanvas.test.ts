import userEvent from '@testing-library/user-event';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestNode, createTestWorkflow, defaultNodeDescriptions } from '@/__tests__/mocks';
import { createComponentRenderer } from '@/__tests__/render';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';

import { buildTestTree, flattenTests } from '../workflowTests.display';
import { parseTestFile } from '../workflowTests.utils';
import WorkflowTestsCanvas from './WorkflowTestsCanvas.vue';

vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => ''),
		useRouteWorkflowId: () => computed(() => ''),
	};
});

const source = `
test('accepts', async () => {
	mockNode(workflow.node('Get customer'), []);
	const result = await executeWorkflow(workflow, { input: {} });
	expect(result.node('Sales').input).toEqual([]);
});
test('rejects', async () => {
	mockNode(workflow.node('Get customer'), []);
	const result = await executeWorkflow(workflow, { input: {} });
});
`;

const rows = flattenTests(
	buildTestTree(
		parseTestFile(source),
		[
			{ name: 'accepts', status: 'passed', durationMs: 1 },
			{
				name: 'rejects',
				status: 'failed',
				durationMs: 1,
				error: { message: 'no', node: 'Sales' },
			},
		],
		false,
	),
);

const renderCanvas = createComponentRenderer(WorkflowTestsCanvas);

describe('WorkflowTestsCanvas', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		useNodeTypesStore().setNodeTypes(defaultNodeDescriptions);
		const workflow = createTestWorkflow({
			id: 'wf-1',
			nodes: [
				createTestNode({ id: '1', name: 'Get customer' }),
				createTestNode({ id: '2', name: 'Sales' }),
			],
			connections: { 'Get customer': { main: [[{ node: 'Sales', type: 'main', index: 0 }]] } },
		});
		useWorkflowsStore().workflowId = workflow.id;
		useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id)).hydrate(workflow);
	});

	it('marks the nodes of all tests, with the number of tests for each mark', async () => {
		const { container, findByText, getByText } = renderCanvas({
			props: { rows, selectedName: undefined },
		});

		expect(await findByText('Mocked')).toHaveTextContent('Mocked 2');
		expect(getByText('Asserted')).toHaveTextContent('Asserted 1');
		expect(getByText('Failed here')).toBeInTheDocument();
		expect(getByText('2 of 2 nodes have a mock or an assertion')).toBeInTheDocument();
		expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(2);
	});

	it('shows one test without counts, and opens the code of a mark', async () => {
		const { emitted, findByText, queryByText } = renderCanvas({
			props: { rows: rows.slice(0, 1), selectedName: 'accepts' },
		});

		const mocked = await findByText('Mocked');
		expect(mocked).toHaveTextContent(/^Mocked$/);
		expect(queryByText('Failed here')).not.toBeInTheDocument();

		await userEvent.click(mocked);

		expect(emitted('showInCode')).toEqual([[3]]);
	});
});

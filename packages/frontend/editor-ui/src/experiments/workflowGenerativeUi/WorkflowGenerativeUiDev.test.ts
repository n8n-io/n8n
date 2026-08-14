import { screen, waitFor } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import { renderComponent } from '@/__tests__/render';
import { createTestNode, createTestWorkflow, defaultNodeDescriptions } from '@/__tests__/mocks';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import WorkflowGenerativeUiDev from './WorkflowGenerativeUiDev.vue';
import { useWorkflowGenerativeUiStore } from './workflowGenerativeUi.store';

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showToast: vi.fn() }),
}));

function specResponse(text: string) {
	return new Response(
		JSON.stringify({
			content: [
				{
					type: 'text',
					text: JSON.stringify({
						root: 'screen',
						elements: {
							screen: {
								type: 'Screen',
								props: { title: 'Generated view', summary: 'A generated view of the workflow.' },
								children: ['board'],
							},
							board: {
								type: 'GuidedTimeline',
								props: {},
								children: ['sec-1', 'sec-2', 'sec-3'],
							},
							'sec-1': { type: 'Group', props: { title: 'Intake' }, children: ['text'] },
							'sec-2': { type: 'Group', props: { title: 'Process' }, children: [] },
							'sec-3': { type: 'Group', props: { title: 'Deliver' }, children: [] },
							text: { type: 'Text', props: { text }, children: [] },
						},
					}),
				},
			],
		}),
		{ status: 200 },
	);
}

function showWorkflow(id: string, name: string) {
	const workflow = createTestWorkflow({
		id,
		name,
		nodes: [createTestNode({ id: `node-${id}`, name: `Node ${id}` })],
		connections: {},
	});
	useWorkflowsStore().workflowId = id;
	useWorkflowDocumentStore(createWorkflowDocumentId(id)).hydrate(workflow);
}

describe('WorkflowGenerativeUiDev', () => {
	beforeEach(() => {
		localStorage.clear();
		setActivePinia(createPinia());
		useNodeTypesStore().setNodeTypes(defaultNodeDescriptions);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('does not carry a generated view over to another workflow', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(specResponse('First workflow spec')));
		showWorkflow('1', 'First Workflow');
		const store = useWorkflowGenerativeUiStore();
		store.apiKey = 'test-key';
		const first = renderComponent(WorkflowGenerativeUiDev);

		await store.setView('story');
		expect(await screen.findByText('First workflow spec')).toBeInTheDocument();
		first.unmount();

		showWorkflow('2', 'Second Workflow');
		const second = renderComponent(WorkflowGenerativeUiDev);

		await waitFor(() => expect(store.view).toBe('canvas'));
		expect(screen.queryByText('First workflow spec')).not.toBeInTheDocument();
		expect(store.activeSpec).toBeUndefined();
		expect(second.emitted()['update:canvasVisible'].at(-1)).toEqual([true]);
	});

	it('keeps the generated view when the same workflow mounts again', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(specResponse('First workflow spec')));
		showWorkflow('1', 'First Workflow');
		const store = useWorkflowGenerativeUiStore();
		store.apiKey = 'test-key';
		const first = renderComponent(WorkflowGenerativeUiDev);

		await store.setView('story');
		expect(await screen.findByText('First workflow spec')).toBeInTheDocument();
		first.unmount();

		renderComponent(WorkflowGenerativeUiDev);

		expect(store.view).toBe('story');
		expect(await screen.findByText('First workflow spec')).toBeInTheDocument();
	});
});

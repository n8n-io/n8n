import { fireEvent, screen } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import { renderComponent } from '@/__tests__/render';
import { createTestNode, createTestWorkflow, defaultNodeDescriptions } from '@/__tests__/mocks';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import GenerativeUiOverlay from './GenerativeUiOverlay.vue';
import { useWorkflowGenerativeUiStore } from './workflowGenerativeUi.store';

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showToast: vi.fn() }),
}));

const node = createTestNode({ id: 'node-1', name: 'Known node' });

function setupWorkflow() {
	const workflow = createTestWorkflow({
		id: '1',
		name: 'Test Workflow',
		nodes: [node],
		connections: {},
	});
	useWorkflowsStore().workflowId = workflow.id;
	const documentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflow.id));
	documentStore.hydrate(workflow);
	return documentStore;
}

function stepSpec(nodeId: string) {
	return {
		root: 'screen',
		elements: {
			screen: {
				type: 'Screen',
				props: { title: 'Generated view', summary: 'Runs the generated workflow.' },
				children: ['step'],
			},
			step: {
				type: 'Step',
				props: { title: 'Known node', summary: 'Runs a task', nodeId },
				on: {
					press: {
						action: 'openNode',
						params: { nodeId },
					},
				},
				children: [],
			},
		},
	};
}

function clusterSpec(nodeId: string) {
	return {
		root: 'screen',
		elements: {
			screen: {
				type: 'Screen',
				props: { title: 'Generated view', summary: 'Runs the generated workflow.' },
				children: ['cluster'],
			},
			cluster: {
				type: 'Cluster',
				props: {
					title: 'Related operations',
					summary: 'Runs related workflow nodes.',
					nodeIds: [nodeId],
				},
				children: [],
			},
		},
	};
}

describe('GenerativeUiOverlay', () => {
	beforeEach(() => {
		localStorage.clear();
		setActivePinia(createPinia());
		useNodeTypesStore().setNodeTypes(defaultNodeDescriptions);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('renders a Step fallback when generation fails', async () => {
		const documentStore = setupWorkflow();
		const store = useWorkflowGenerativeUiStore();
		store.apiKey = 'test-key';
		store.setWorkflowGetter(() => ({
			id: documentStore.documentId,
			name: documentStore.name,
			nodes: documentStore.allNodes.map((workflowNode) => ({ ...workflowNode })),
			connections: documentStore.connectionsBySourceNode,
		}));
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Request failed')));

		await store.setView('story');
		renderComponent(GenerativeUiOverlay);

		expect(screen.getByText('Known node')).toBeInTheDocument();
		expect(
			screen.getByText(/Generation failed\. Showing a basic workflow view\./),
		).toHaveTextContent('Details: Request failed');
	});

	it('renders the fallback instead of an invalid catalog spec', () => {
		setupWorkflow();
		const store = useWorkflowGenerativeUiStore();
		store.activeSpec = {
			root: 'screen',
			elements: {
				screen: {
					type: 'Screen',
					props: { title: 'Missing required summary' },
					children: [],
				},
			},
		};

		renderComponent(GenerativeUiOverlay);

		expect(screen.getByText('Known node')).toBeInTheDocument();
		expect(screen.getByText('Raw spec')).toBeInTheDocument();
	});

	it('suppresses node interaction in look-only mode', async () => {
		const documentStore = setupWorkflow();
		const store = useWorkflowGenerativeUiStore();
		store.activeSpec = stepSpec(node.id);
		store.lookOnly = true;
		const ndvStore = useNDVStore(documentStore.documentId);
		renderComponent(GenerativeUiOverlay);

		expect(screen.queryByRole('button')).not.toBeInTheDocument();
		await fireEvent.click(screen.getByText('Known node'));
		expect(ndvStore.activeNodeName).toBeNull();
	});

	it('ignores an action whose node ID does not resolve', async () => {
		const documentStore = setupWorkflow();
		const store = useWorkflowGenerativeUiStore();
		store.activeSpec = stepSpec('missing-node');
		const ndvStore = useNDVStore(documentStore.documentId);
		renderComponent(GenerativeUiOverlay);

		await fireEvent.click(screen.getByRole('button'));
		expect(ndvStore.activeNodeName).toBeNull();
	});

	it('opens the node details view for the pressed node', async () => {
		const documentStore = setupWorkflow();
		const store = useWorkflowGenerativeUiStore();
		store.activeSpec = stepSpec(node.id);
		const ndvStore = useNDVStore(documentStore.documentId);
		const setActiveNodeName = vi.spyOn(ndvStore, 'setActiveNodeName');
		renderComponent(GenerativeUiOverlay);

		await fireEvent.click(screen.getByRole('button'));

		expect(setActiveNodeName).toHaveBeenCalledWith(node.name, 'generative_ui');
	});

	it('opens a clustered node from its individual brand', async () => {
		const documentStore = setupWorkflow();
		const store = useWorkflowGenerativeUiStore();
		store.activeSpec = clusterSpec(node.id);
		const ndvStore = useNDVStore(documentStore.documentId);
		const setActiveNodeName = vi.spyOn(ndvStore, 'setActiveNodeName');
		renderComponent(GenerativeUiOverlay);

		await fireEvent.click(screen.getByRole('button', { name: `Open ${node.name}` }));

		expect(setActiveNodeName).toHaveBeenCalledWith(node.name, 'generative_ui');
	});

	it('does not throw when the workflow document store is not provided', async () => {
		setupWorkflow();
		const store = useWorkflowGenerativeUiStore();
		store.activeSpec = stepSpec(node.id);
		renderComponent(GenerativeUiOverlay, {
			global: { provide: { [WorkflowDocumentStoreKey as symbol]: undefined } },
		});

		await fireEvent.click(screen.getByRole('button'));

		expect(screen.getByText('Known node')).toBeInTheDocument();
	});

	it('reserves bottom scroll space for the floating follow-up pill', () => {
		setupWorkflow();
		const store = useWorkflowGenerativeUiStore();
		store.activeSpec = stepSpec(node.id);
		renderComponent(GenerativeUiOverlay);

		expect(screen.getByTestId('generative-ui-overlay')).toHaveStyle({
			'--generative-ui--follow-up--reserve':
				'calc(var(--spacing--3xl) + var(--spacing--lg) + env(safe-area-inset-bottom, 0px))',
		});
	});
});

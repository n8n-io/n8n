import type { INodeUi } from '@/Interface';
import { useContextMenu } from '../useContextMenu';

// Instantiates the builder store transitively, which derives the workflow id from
// the route. This composable test runs without a router, so resolve the id directly.
vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => ''),
		useRouteWorkflowId: () => computed(() => ''),
	};
});
import { NO_OP_NODE_TYPE } from '@/app/constants';
import { CANVAS_NODE_CONTEXT_FLAG } from '@n8n/api-types';
import { faker } from '@faker-js/faker';
import { shallowRef } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useFocusedNodesStore } from '@/features/ai/assistant/focusedNodes.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
	injectWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { NodeHelpers } from 'n8n-workflow';

vi.mock('@/app/stores/workflowDocument.store', async (importOriginal) => ({
	...(await importOriginal()),
	injectWorkflowDocumentStore: vi.fn(),
}));

// Collapse state is provided by the hosting canvas via injection, which is
// unavailable in this non-component harness — undefined mirrors a host
// without a canvas (items stay enabled).
vi.mock('../contextMenuGroupView', async (importOriginal) => ({
	...(await importOriginal<typeof import('../contextMenuGroupView')>()),
	injectContextMenuGroupView: () => undefined,
}));

// useContextMenuItems resolves per-editor host overrides via inject, which is
// unavailable in this non-component harness — stub it with mutable flags.
const editorContextFlags = vi.hoisted(() => ({
	aiAssistant: true,
	aiBuilder: true,
	instanceAi: false,
}));
vi.mock('@/app/composables/useEditorContext', async () => {
	const { computed } = await import('vue');
	return {
		useEditorContext: () => ({
			aiAssistant: computed(() => editorContextFlags.aiAssistant),
			aiBuilder: computed(() => editorContextFlags.aiBuilder),
			instanceAi: computed(() => editorContextFlags.instanceAi),
			readOnly: computed(() => false),
			executionSuccessToasts: computed(() => true),
			executionErrorToasts: computed(() => true),
		}),
	};
});

// The item under test is gated by posthog directly (not a store flag) —
// stub isFeatureEnabled so tests can flip CANVAS_NODE_CONTEXT_FLAG.
const isFeatureEnabled = vi.hoisted(() => vi.fn((_flag: string) => false));
vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ isFeatureEnabled }),
}));

const nodeFactory = (data: Partial<INodeUi> = {}): INodeUi => ({
	id: faker.string.uuid(),
	name: faker.word.words(3),
	parameters: {},
	position: [faker.number.int(), faker.number.int()],
	type: NO_OP_NODE_TYPE,
	typeVersion: 1,
	...data,
});

describe('useContextMenu - add_nodes_to_chat (node context) gating', () => {
	let sourceControlStore: ReturnType<typeof useSourceControlStore>;
	let uiStore: ReturnType<typeof useUIStore>;
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;
	let focusedNodesStore: ReturnType<typeof useFocusedNodesStore>;
	const nodes = [nodeFactory(), nodeFactory(), nodeFactory()];
	const testWorkflowId = 'test-workflow-id';

	beforeEach(() => {
		setActivePinia(createPinia());
		sourceControlStore = useSourceControlStore();
		vi.spyOn(sourceControlStore, 'preferences', 'get').mockReturnValue({
			branchReadOnly: false,
		} as never);

		uiStore = useUIStore();
		vi.spyOn(uiStore, 'isReadOnlyView', 'get').mockReturnValue(false);

		focusedNodesStore = useFocusedNodesStore();
		vi.spyOn(focusedNodesStore, 'isFeatureEnabled', 'get').mockReturnValue(true);

		workflowsStore = useWorkflowsStore();
		workflowsStore.setWorkflowId(testWorkflowId);
		workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(testWorkflowId));
		workflowDocumentStore.setNodes(nodes);
		workflowDocumentStore.setScopes(['workflow:update']);
		vi.mocked(injectWorkflowDocumentStore).mockReturnValue(shallowRef(workflowDocumentStore));

		vi.spyOn(NodeHelpers, 'getNodeInputs').mockReturnValue([]);
		vi.spyOn(NodeHelpers, 'isExecutable').mockReturnValue(true);

		editorContextFlags.aiAssistant = true;
		editorContextFlags.aiBuilder = true;
		editorContextFlags.instanceAi = false;
		isFeatureEnabled.mockReturnValue(false);
	});

	afterEach(() => {
		useContextMenu().close();
		vi.clearAllMocks();
	});

	const mockEvent = new MouseEvent('contextmenu', { clientX: 500, clientY: 300 });

	it('shows "Add node to chat" (singular) when the flag is on and a single node is selected', () => {
		isFeatureEnabled.mockImplementation((flag: string) => flag === CANVAS_NODE_CONTEXT_FLAG);
		editorContextFlags.instanceAi = true;

		const { open, actions } = useContextMenu();
		open(mockEvent, { source: 'canvas', nodeIds: [nodes[0].id] });

		const item = actions.value.find((action) => action.id === 'add_nodes_to_chat');
		expect(item).toBeDefined();
		expect(item?.label).toBe('Add node to chat');
	});

	it('shows "Add 3 nodes to chat" (plural) when the flag is on and 3 nodes are selected', () => {
		isFeatureEnabled.mockImplementation((flag: string) => flag === CANVAS_NODE_CONTEXT_FLAG);
		editorContextFlags.instanceAi = true;

		const { open, actions } = useContextMenu();
		open(mockEvent, { source: 'canvas', nodeIds: nodes.map((n) => n.id) });

		const item = actions.value.find((action) => action.id === 'add_nodes_to_chat');
		expect(item).toBeDefined();
		expect(item?.label).toBe('Add 3 nodes to chat');
	});

	it('hides "Add node(s) to chat" when the flag is off, regardless of selection size', () => {
		isFeatureEnabled.mockReturnValue(false);
		editorContextFlags.instanceAi = true;

		const { open, actions } = useContextMenu();
		open(mockEvent, { source: 'canvas', nodeIds: nodes.map((n) => n.id) });

		expect(actions.value.some((action) => action.id === 'add_nodes_to_chat')).toBe(false);
	});

	it('hides "Add node(s) to chat" when the flag is on but Instance AI is unavailable', () => {
		isFeatureEnabled.mockImplementation((flag: string) => flag === CANVAS_NODE_CONTEXT_FLAG);
		editorContextFlags.instanceAi = false;

		const { open, actions } = useContextMenu();
		open(mockEvent, { source: 'canvas', nodeIds: nodes.map((n) => n.id) });

		expect(actions.value.some((action) => action.id === 'add_nodes_to_chat')).toBe(false);
	});

	it('stays enabled in read-only mode, since it only adds chat context', () => {
		isFeatureEnabled.mockImplementation((flag: string) => flag === CANVAS_NODE_CONTEXT_FLAG);
		editorContextFlags.instanceAi = true;
		vi.spyOn(uiStore, 'isReadOnlyView', 'get').mockReturnValue(true);

		const { open, actions } = useContextMenu();
		open(mockEvent, { source: 'canvas', nodeIds: [nodes[0].id] });

		const item = actions.value.find((action) => action.id === 'add_nodes_to_chat');
		expect(item?.disabled).toBeFalsy();
		expect(actions.value.find((action) => action.id === 'rename')?.disabled).toBe(true);
	});

	// The two share Alt+I and are mutually exclusive on Instance AI availability.
	it('with Instance AI available, shows add_nodes_to_chat and hides legacy focus_ai', () => {
		isFeatureEnabled.mockImplementation((flag: string) => flag === CANVAS_NODE_CONTEXT_FLAG);
		editorContextFlags.instanceAi = true;

		const { open, actions } = useContextMenu();
		open(mockEvent, { source: 'canvas', nodeIds: nodes.map((n) => n.id) });

		expect(actions.value.some((a) => a.id === 'add_nodes_to_chat')).toBe(true);
		expect(actions.value.some((a) => a.id === 'focus_ai_on_selected')).toBe(false);
	});

	it('with Instance AI unavailable, shows legacy focus_ai and hides add_nodes_to_chat', () => {
		isFeatureEnabled.mockImplementation((flag: string) => flag === CANVAS_NODE_CONTEXT_FLAG);
		editorContextFlags.instanceAi = false;

		const { open, actions } = useContextMenu();
		open(mockEvent, { source: 'canvas', nodeIds: nodes.map((n) => n.id) });

		expect(actions.value.some((a) => a.id === 'add_nodes_to_chat')).toBe(false);
		expect(actions.value.some((a) => a.id === 'focus_ai_on_selected')).toBe(true);
	});
});

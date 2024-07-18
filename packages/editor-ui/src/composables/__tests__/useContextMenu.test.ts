import type { INodeUi } from '@/Interface';
import { useContextMenu } from '@/composables/useContextMenu';
import { BASIC_CHAIN_NODE_TYPE, NO_OP_NODE_TYPE, STICKY_NODE_TYPE } from '@/constants';
import { faker } from '@faker-js/faker';
import { createPinia, setActivePinia } from 'pinia';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { NodeHelpers } from 'n8n-workflow';

const nodeFactory = (data: Partial<INodeUi> = {}): INodeUi => ({
	id: faker.string.uuid(),
	name: faker.word.words(3),
	parameters: {},
	position: [faker.number.int(), faker.number.int()],
	type: NO_OP_NODE_TYPE,
	typeVersion: 1,
	...data,
});

describe('useContextMenu', () => {
	let sourceControlStore: ReturnType<typeof useSourceControlStore>;
	let uiStore: ReturnType<typeof useUIStore>;
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	const nodes = [nodeFactory(), nodeFactory(), nodeFactory()];
	const selectedNodes = nodes.slice(0, 2);

	beforeAll(() => {
		setActivePinia(createPinia());
		sourceControlStore = useSourceControlStore();
		vi.spyOn(sourceControlStore, 'preferences', 'get').mockReturnValue({
			branchReadOnly: false,
		} as never);

		uiStore = useUIStore();
		uiStore.selectedNodes = selectedNodes;
		vi.spyOn(uiStore, 'isReadOnlyView', 'get').mockReturnValue(false);

		workflowsStore = useWorkflowsStore();
		workflowsStore.workflow.nodes = nodes;
		vi.spyOn(workflowsStore, 'getCurrentWorkflow').mockReturnValue({
			nodes,
			getNode: (_: string) => {
				return {};
			},
		} as never);

		vi.spyOn(NodeHelpers, 'getNodeInputs').mockReturnValue([]);
	});

	afterEach(() => {
		useContextMenu().close();
		vi.clearAllMocks();
	});

	const mockEvent = new MouseEvent('contextmenu', { clientX: 500, clientY: 300 });

	it('should support opening and closing (default = right click on canvas)', () => {
		const { open, close, isOpen, actions, position, target, targetNodeIds } = useContextMenu();
		expect(isOpen.value).toBe(false);
		expect(actions.value).toEqual([]);
		expect(position.value).toEqual([0, 0]);
		expect(targetNodeIds.value).toEqual([]);

		const nodeIds = selectedNodes.map((n) => n.id);
		open(mockEvent, { source: 'canvas', nodeIds });
		expect(isOpen.value).toBe(true);
		expect(useContextMenu().isOpen.value).toEqual(true);
		expect(actions.value).toMatchSnapshot();
		expect(position.value).toEqual([500, 300]);
		expect(target.value).toEqual({ source: 'canvas', nodeIds });
		expect(targetNodeIds.value).toEqual(nodeIds);

		close();
		expect(isOpen.value).toBe(false);
		expect(useContextMenu().isOpen.value).toEqual(false);
		expect(actions.value).toEqual([]);
		expect(position.value).toEqual([0, 0]);
		expect(targetNodeIds.value).toEqual([]);
	});

	it('should return the correct actions when right clicking a sticky', () => {
		const { open, isOpen, actions, targetNodeIds } = useContextMenu();
		const sticky = nodeFactory({ type: STICKY_NODE_TYPE });
		vi.spyOn(workflowsStore, 'getNodeById').mockReturnValue(sticky);
		open(mockEvent, { source: 'node-right-click', nodeId: sticky.id });

		expect(isOpen.value).toBe(true);
		expect(actions.value).toMatchSnapshot();
		expect(targetNodeIds.value).toEqual([sticky.id]);
	});

	it('should disable pinning for node that has other inputs then "main"', () => {
		const { open, isOpen, actions, targetNodeIds } = useContextMenu();
		const basicChain = nodeFactory({ type: BASIC_CHAIN_NODE_TYPE });
		vi.spyOn(workflowsStore, 'getNodeById').mockReturnValue(basicChain);
		vi.spyOn(NodeHelpers, 'getConnectionTypes').mockReturnValue(['main', 'ai_languageModel']);
		open(mockEvent, { source: 'node-right-click', nodeId: basicChain.id });

		expect(isOpen.value).toBe(true);
		expect(actions.value.find((action) => action.id === 'toggle_pin')?.disabled).toBe(true);
		expect(targetNodeIds.value).toEqual([basicChain.id]);
	});

	it('should return the correct actions when right clicking a Node', () => {
		const { open, isOpen, actions, targetNodeIds } = useContextMenu();
		const node = nodeFactory();
		vi.spyOn(workflowsStore, 'getNodeById').mockReturnValue(node);
		open(mockEvent, { source: 'node-right-click', nodeId: node.id });

		expect(isOpen.value).toBe(true);
		expect(actions.value).toMatchSnapshot();
		expect(targetNodeIds.value).toEqual([node.id]);
	});

	it('should return the correct actions opening the menu from the button', () => {
		const { open, isOpen, actions, targetNodeIds } = useContextMenu();
		const node = nodeFactory();
		vi.spyOn(workflowsStore, 'getNodeById').mockReturnValue(node);
		open(mockEvent, { source: 'node-button', nodeId: node.id });

		expect(isOpen.value).toBe(true);
		expect(actions.value).toMatchSnapshot();
		expect(targetNodeIds.value).toEqual([node.id]);
	});

	describe('Read-only mode', () => {
		it('should return the correct actions when right clicking a sticky', () => {
			vi.spyOn(uiStore, 'isReadOnlyView', 'get').mockReturnValue(true);
			const { open, isOpen, actions, targetNodeIds } = useContextMenu();
			const sticky = nodeFactory({ type: STICKY_NODE_TYPE });
			vi.spyOn(workflowsStore, 'getNodeById').mockReturnValue(sticky);
			open(mockEvent, { source: 'node-right-click', nodeId: sticky.id });

			expect(isOpen.value).toBe(true);
			expect(actions.value).toMatchSnapshot();
			expect(targetNodeIds.value).toEqual([sticky.id]);
		});

		it('should return the correct actions when right clicking a Node', () => {
			vi.spyOn(uiStore, 'isReadOnlyView', 'get').mockReturnValue(true);
			const { open, isOpen, actions, targetNodeIds } = useContextMenu();
			const node = nodeFactory();
			vi.spyOn(workflowsStore, 'getNodeById').mockReturnValue(node);
			open(mockEvent, { source: 'node-right-click', nodeId: node.id });

			expect(isOpen.value).toBe(true);
			expect(actions.value).toMatchSnapshot();
			expect(targetNodeIds.value).toEqual([node.id]);
		});
	});
});

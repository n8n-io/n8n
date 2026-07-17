import type { INodeUi } from '@/Interface';
import { useContextMenu } from './useContextMenu';

// Instantiates the builder store transitively, which derives the workflow id from
// the route. This composable test runs without a router, so resolve the id directly.
vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => ''),
		useRouteWorkflowId: () => computed(() => ''),
	};
});
import {
	BASIC_CHAIN_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	NO_OP_NODE_TYPE,
	STICKY_NODE_TYPE,
} from '@/app/constants';
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

vi.mock('@/app/stores/workflowDocument.store', async (importOriginal) => ({
	...(await importOriginal()),
	injectWorkflowDocumentStore: vi.fn(),
}));

// Collapse state is provided by the hosting canvas via injection, which is
// unavailable in this non-component harness — stub it with a mutable holder.
// undefined mirrors a host without a canvas (items stay enabled).
const groupViewState = vi.hoisted(() => ({
	current: undefined as { isGroupCollapsed: (groupId: string) => boolean } | undefined,
}));
vi.mock('./contextMenuGroupView', async (importOriginal) => ({
	...(await importOriginal<typeof import('./contextMenuGroupView')>()),
	injectContextMenuGroupView: () => groupViewState.current,
}));

/** Fakes the canvas group view: the given group ids are collapsed, the rest expanded. */
function fakeGroupView(collapsedGroupIds: string[] = []) {
	const collapsed = new Set(collapsedGroupIds);
	groupViewState.current = { isGroupCollapsed: (groupId) => collapsed.has(groupId) };
}

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
			askAi: computed(() => true),
			readOnly: computed(() => false),
			executionSuccessToasts: computed(() => true),
			executionErrorToasts: computed(() => true),
		}),
	};
});
import {
	EXECUTE_WORKFLOW_NODE_TYPE,
	NodeConnectionTypes,
	NodeHelpers,
	WEBHOOK_NODE_TYPE,
	WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE,
} from 'n8n-workflow';

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
	let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;
	let focusedNodesStore: ReturnType<typeof useFocusedNodesStore>;
	const nodes = [nodeFactory(), nodeFactory(), nodeFactory()];
	const selectedNodes = nodes.slice(0, 2);
	const testWorkflowId = 'test-workflow-id';

	// `restoreMocks` restores spies before each test, so re-establish them per-test.
	beforeEach(() => {
		groupViewState.current = undefined;
		setActivePinia(createPinia());
		sourceControlStore = useSourceControlStore();
		vi.spyOn(sourceControlStore, 'preferences', 'get').mockReturnValue({
			branchReadOnly: false,
		} as never);

		uiStore = useUIStore();
		vi.spyOn(uiStore, 'isReadOnlyView', 'get').mockReturnValue(false);

		focusedNodesStore = useFocusedNodesStore();

		workflowsStore = useWorkflowsStore();
		workflowsStore.setWorkflowId(testWorkflowId);
		workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(testWorkflowId));
		workflowDocumentStore.setNodes(nodes);
		workflowDocumentStore.setScopes(['workflow:update']);
		vi.mocked(injectWorkflowDocumentStore).mockReturnValue(shallowRef(workflowDocumentStore));

		vi.spyOn(NodeHelpers, 'getNodeInputs').mockReturnValue([]);
		vi.spyOn(NodeHelpers, 'isExecutable').mockReturnValue(true);
	});

	afterEach(() => {
		useContextMenu().close();
		vi.clearAllMocks();
	});

	const mockEvent = new MouseEvent('contextmenu', { clientX: 500, clientY: 300 });

	describe('focus_ai_on_selected gating', () => {
		beforeEach(() => {
			editorContextFlags.aiAssistant = true;
			editorContextFlags.aiBuilder = true;
			vi.spyOn(focusedNodesStore, 'isFeatureEnabled', 'get').mockReturnValue(true);
		});

		it('shows "Focus AI on selected" when the focused-nodes feature is on and AI is available', () => {
			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'canvas', nodeIds: selectedNodes.map((n) => n.id) });

			expect(actions.value.some((action) => action.id === 'focus_ai_on_selected')).toBe(true);
		});

		it('hides "Focus AI on selected" when the editor host disables AI', () => {
			editorContextFlags.aiAssistant = false;
			editorContextFlags.aiBuilder = false;

			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'canvas', nodeIds: selectedNodes.map((n) => n.id) });

			expect(actions.value.some((action) => action.id === 'focus_ai_on_selected')).toBe(false);
		});
	});

	describe('group_nodes gating', () => {
		beforeEach(() => {
			// Connect the first two nodes so they form a groupable subgraph
			workflowDocumentStore.setConnections({
				[nodes[0].name]: {
					[NodeConnectionTypes.Main]: [
						[{ node: nodes[1].name, type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			});
		});

		it('shows "Group nodes" enabled for a groupable selection', () => {
			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'canvas', nodeIds: [nodes[0].id, nodes[1].id] });

			const item = actions.value.find((action) => action.id === 'group_nodes');
			expect(item).toBeDefined();
			expect(item?.disabled).toBe(false);
		});

		it('ignores unresolvable ids in the target when computing enablement', () => {
			const { open, actions } = useContextMenu();
			open(mockEvent, {
				source: 'canvas',
				nodeIds: [nodes[0].id, nodes[1].id, 'deleted-node-id'],
			});

			expect(actions.value.find((action) => action.id === 'group_nodes')?.disabled).toBe(false);
		});

		it('shows "Group nodes" disabled for an ineligible selection (disconnected nodes)', () => {
			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'canvas', nodeIds: [nodes[0].id, nodes[2].id] });

			const item = actions.value.find((action) => action.id === 'group_nodes');
			expect(item).toBeDefined();
			expect(item?.disabled).toBe(true);
		});

		it('shows "Group nodes" disabled for nodes that are already grouped', () => {
			workflowDocumentStore.createGroup([nodes[0].id, nodes[1].id], 'Group 1');
			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'canvas', nodeIds: [nodes[0].id, nodes[1].id] });

			expect(actions.value.find((action) => action.id === 'group_nodes')?.disabled).toBe(true);
		});

		it('shows "Group nodes" disabled in read-only mode', () => {
			vi.spyOn(uiStore, 'isReadOnlyView', 'get').mockReturnValue(true);
			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'canvas', nodeIds: [nodes[0].id, nodes[1].id] });

			expect(actions.value.find((action) => action.id === 'group_nodes')?.disabled).toBe(true);
		});
	});

	describe('group target', () => {
		it('shows the multi-selection actions with the group actions on top and resolves member node ids', () => {
			const group = workflowDocumentStore.createGroup([nodes[0].id, nodes[1].id], 'My group');
			const { open, actions, targetNodeIds, targetGroupId } = useContextMenu();
			open(mockEvent, { source: 'group', groupId: group.id, nodeIds: group.nodeIds });

			expect(actions.value.map((action) => action.id)).toEqual([
				'rename_group',
				'ungroup_nodes',
				'toggle_activation',
				'toggle_pin',
				'copy',
				'duplicate',
				'tidy_up',
				'expand_selected_groups',
				'collapse_selected_groups',
				'extract_sub_workflow',
				'select_all',
				'deselect_all',
				'delete',
			]);
			expect(targetNodeIds.value).toEqual([nodes[0].id, nodes[1].id]);
			expect(targetGroupId.value).toBe(group.id);
		});

		it('words the bulk actions for the group instead of the node count', () => {
			const group = workflowDocumentStore.createGroup([nodes[0].id, nodes[1].id], 'My group');
			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'group', groupId: group.id, nodeIds: group.nodeIds });

			const labels = Object.fromEntries(actions.value.map((action) => [action.id, action.label]));
			expect(labels.toggle_activation).toBe('Deactivate group');
			expect(labels.toggle_pin).toBe('Pin group');
			expect(labels.copy).toBe('Copy group');
			expect(labels.duplicate).toBe('Duplicate group');
			expect(labels.extract_sub_workflow).toBe('Convert group to sub-workflow');
			expect(labels.delete).toBe('Delete group');
		});

		it('keeps the group wording even for a single-member group and hides single-node actions', () => {
			// The "Group nodes" item must be absent — an existing group offers
			// ungroup instead.
			const group = workflowDocumentStore.createGroup([nodes[0].id], 'My group');
			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'group', groupId: group.id, nodeIds: group.nodeIds });

			const ids = actions.value.map((action) => action.id);
			expect(ids).not.toContain('group_nodes');
			for (const singleNodeAction of ['open', 'execute', 'rename', 'replace']) {
				expect(ids).not.toContain(singleNodeAction);
			}
			expect(actions.value.find((action) => action.id === 'copy')?.label).toBe('Copy group');
		});

		it('falls back to the group actions alone when no member node resolves', () => {
			const group = workflowDocumentStore.createGroup([nodes[0].id], 'My group');
			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'group', groupId: group.id, nodeIds: ['non-existent'] });

			expect(actions.value.map((action) => action.id)).toEqual(['rename_group', 'ungroup_nodes']);
		});

		it('disables the mutating actions in read-only mode but keeps copy available', () => {
			vi.spyOn(uiStore, 'isReadOnlyView', 'get').mockReturnValue(true);
			const group = workflowDocumentStore.createGroup([nodes[0].id, nodes[1].id], 'My group');
			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'group', groupId: group.id, nodeIds: group.nodeIds });

			const byId = Object.fromEntries(actions.value.map((action) => [action.id, action]));
			for (const mutating of [
				'rename_group',
				'ungroup_nodes',
				'toggle_activation',
				'duplicate',
				'delete',
			]) {
				expect(byId[mutating]?.disabled).toBe(true);
			}
			expect(byId.copy?.disabled).toBeFalsy();
		});

		it('closes when re-invoked on the same group, letting the native menu through', () => {
			const group = workflowDocumentStore.createGroup([nodes[0].id], 'My group');
			const { open, isOpen } = useContextMenu();
			open(mockEvent, { source: 'group', groupId: group.id, nodeIds: group.nodeIds });
			expect(isOpen.value).toBe(true);

			open(mockEvent, { source: 'group', groupId: group.id, nodeIds: group.nodeIds });
			expect(isOpen.value).toBe(false);
		});

		it('retargets when invoked on a different group', () => {
			const groupA = workflowDocumentStore.createGroup([nodes[0].id], 'A');
			const groupB = workflowDocumentStore.createGroup([nodes[1].id], 'B');
			const { open, isOpen, targetGroupId } = useContextMenu();
			open(mockEvent, { source: 'group', groupId: groupA.id, nodeIds: groupA.nodeIds });
			open(mockEvent, { source: 'group', groupId: groupB.id, nodeIds: groupB.nodeIds });

			expect(isOpen.value).toBe(true);
			expect(targetGroupId.value).toBe(groupB.id);
		});
	});

	describe('target-level read-only', () => {
		// The instance-wide flags stay editable in these tests (see beforeEach):
		// only the opening canvas marks its target read-only, like an embedded
		// read-only canvas on an editable route (e.g. while the AI builder
		// streams).
		it('disables the mutating actions when the canvas target is read-only', () => {
			const { open, actions } = useContextMenu();
			open(mockEvent, {
				source: 'canvas',
				nodeIds: selectedNodes.map((n) => n.id),
				readOnly: true,
			});

			const byId = Object.fromEntries(actions.value.map((action) => [action.id, action]));
			for (const mutating of ['toggle_activation', 'tidy_up', 'group_nodes', 'delete']) {
				expect(byId[mutating]?.disabled).toBe(true);
			}
			expect(byId.copy?.disabled).toBeFalsy();
			expect(byId.select_all?.disabled).toBeFalsy();
		});

		it('disables the group actions when the group target is read-only', () => {
			const group = workflowDocumentStore.createGroup([nodes[0].id, nodes[1].id], 'My group');
			const { open, actions } = useContextMenu();
			open(mockEvent, {
				source: 'group',
				groupId: group.id,
				nodeIds: group.nodeIds,
				readOnly: true,
			});

			const byId = Object.fromEntries(actions.value.map((action) => [action.id, action]));
			for (const mutating of ['rename_group', 'ungroup_nodes', 'toggle_activation', 'delete']) {
				expect(byId[mutating]?.disabled).toBe(true);
			}
			// Copy and collapse state (a view preference) stay usable
			expect(byId.copy?.disabled).toBeFalsy();
			expect(byId.expand_selected_groups?.disabled).toBeFalsy();
		});

		it('disables the add actions in the empty-selection menu when the target is read-only', () => {
			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'canvas', nodeIds: [], readOnly: true });

			const byId = Object.fromEntries(actions.value.map((action) => [action.id, action]));
			expect(byId.add_node?.disabled).toBe(true);
			expect(byId.add_sticky?.disabled).toBe(true);
		});

		it('keeps the mutating actions enabled when the target is not read-only', () => {
			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'canvas', nodeIds: selectedNodes.map((n) => n.id) });

			const byId = Object.fromEntries(actions.value.map((action) => [action.id, action]));
			expect(byId.toggle_activation?.disabled).toBe(false);
			expect(byId.delete?.disabled).toBe(false);
		});
	});

	describe('expand/collapse all groups (empty selection menu)', () => {
		it('shows the actions disabled when the workflow has no groups', () => {
			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'canvas', nodeIds: [] });

			const byId = Object.fromEntries(actions.value.map((action) => [action.id, action]));
			expect(byId.expand_all_groups?.disabled).toBe(true);
			expect(byId.collapse_all_groups?.disabled).toBe(true);
		});

		it('shows the actions enabled when groups exist, also in read-only mode', () => {
			// Collapse state is a view preference, not workflow data — read-only
			// must not disable these. Without a canvas-provided group view
			// (groupViewState stays undefined) both remain enabled.
			vi.spyOn(uiStore, 'isReadOnlyView', 'get').mockReturnValue(true);
			workflowDocumentStore.createGroup([nodes[0].id], 'My group');
			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'canvas', nodeIds: [] });

			const byId = Object.fromEntries(actions.value.map((action) => [action.id, action]));
			expect(byId.expand_all_groups?.disabled).toBe(false);
			expect(byId.collapse_all_groups?.disabled).toBe(false);
		});

		it('disables "Expand all" when every group is already expanded', () => {
			workflowDocumentStore.createGroup([nodes[0].id], 'A');
			workflowDocumentStore.createGroup([nodes[1].id], 'B');
			fakeGroupView([]);
			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'canvas', nodeIds: [] });

			const byId = Object.fromEntries(actions.value.map((action) => [action.id, action]));
			expect(byId.expand_all_groups?.disabled).toBe(true);
			expect(byId.collapse_all_groups?.disabled).toBe(false);
		});

		it('disables "Collapse all" when every group is already collapsed', () => {
			const groupA = workflowDocumentStore.createGroup([nodes[0].id], 'A');
			const groupB = workflowDocumentStore.createGroup([nodes[1].id], 'B');
			fakeGroupView([groupA.id, groupB.id]);
			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'canvas', nodeIds: [] });

			const byId = Object.fromEntries(actions.value.map((action) => [action.id, action]));
			expect(byId.expand_all_groups?.disabled).toBe(false);
			expect(byId.collapse_all_groups?.disabled).toBe(true);
		});

		it('keeps both actions enabled for mixed collapse states', () => {
			const groupA = workflowDocumentStore.createGroup([nodes[0].id], 'A');
			workflowDocumentStore.createGroup([nodes[1].id], 'B');
			fakeGroupView([groupA.id]);
			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'canvas', nodeIds: [] });

			const byId = Object.fromEntries(actions.value.map((action) => [action.id, action]));
			expect(byId.expand_all_groups?.disabled).toBe(false);
			expect(byId.collapse_all_groups?.disabled).toBe(false);
		});

		it('does not add the actions to node selection menus', () => {
			workflowDocumentStore.createGroup([nodes[0].id], 'My group');
			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'canvas', nodeIds: [nodes[1].id, nodes[2].id] });

			const ids = actions.value.map((action) => action.id);
			expect(ids).not.toContain('expand_all_groups');
			expect(ids).not.toContain('collapse_all_groups');
		});
	});

	describe('expand/collapse selected groups', () => {
		const getIds = (actions: ReturnType<typeof useContextMenu>['actions']) =>
			actions.value.map((action) => action.id);

		it('shows the actions for a groups-only target spanning multiple groups', () => {
			workflowDocumentStore.createGroup([nodes[0].id], 'A');
			workflowDocumentStore.createGroup([nodes[1].id], 'B');
			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'canvas', nodeIds: [nodes[0].id, nodes[1].id] });

			expect(getIds(actions)).toContain('expand_selected_groups');
			expect(getIds(actions)).toContain('collapse_selected_groups');
		});

		it('shows the actions for a partial selection of group members', () => {
			// Membership is enough — the group does not need to be fully selected.
			workflowDocumentStore.createGroup([nodes[0].id, nodes[1].id], 'My group');
			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'canvas', nodeIds: [nodes[0].id] });

			expect(getIds(actions)).toContain('expand_selected_groups');
			expect(getIds(actions)).toContain('collapse_selected_groups');
		});

		it('hides the actions when the target mixes grouped and loose nodes', () => {
			workflowDocumentStore.createGroup([nodes[0].id], 'My group');
			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'canvas', nodeIds: [nodes[0].id, nodes[1].id] });

			expect(getIds(actions)).not.toContain('expand_selected_groups');
			expect(getIds(actions)).not.toContain('collapse_selected_groups');
		});

		it('hides the actions when no targeted node belongs to a group', () => {
			workflowDocumentStore.createGroup([nodes[0].id], 'My group');
			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'canvas', nodeIds: [nodes[1].id, nodes[2].id] });

			expect(getIds(actions)).not.toContain('expand_selected_groups');
			expect(getIds(actions)).not.toContain('collapse_selected_groups');
		});

		it('disables "Expand" when every target group is already expanded', () => {
			workflowDocumentStore.createGroup([nodes[0].id], 'A');
			workflowDocumentStore.createGroup([nodes[1].id], 'B');
			fakeGroupView([]);
			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'canvas', nodeIds: [nodes[0].id, nodes[1].id] });

			const byId = Object.fromEntries(actions.value.map((action) => [action.id, action]));
			expect(byId.expand_selected_groups?.disabled).toBe(true);
			expect(byId.collapse_selected_groups?.disabled).toBe(false);
		});

		it('disables "Collapse" when every target group is already collapsed', () => {
			const groupA = workflowDocumentStore.createGroup([nodes[0].id], 'A');
			const groupB = workflowDocumentStore.createGroup([nodes[1].id], 'B');
			fakeGroupView([groupA.id, groupB.id]);
			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'canvas', nodeIds: [nodes[0].id, nodes[1].id] });

			const byId = Object.fromEntries(actions.value.map((action) => [action.id, action]));
			expect(byId.expand_selected_groups?.disabled).toBe(false);
			expect(byId.collapse_selected_groups?.disabled).toBe(true);
		});

		it('keeps both actions enabled for mixed collapse states', () => {
			const groupA = workflowDocumentStore.createGroup([nodes[0].id], 'A');
			workflowDocumentStore.createGroup([nodes[1].id], 'B');
			fakeGroupView([groupA.id]);
			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'canvas', nodeIds: [nodes[0].id, nodes[1].id] });

			const byId = Object.fromEntries(actions.value.map((action) => [action.id, action]));
			expect(byId.expand_selected_groups?.disabled).toBe(false);
			expect(byId.collapse_selected_groups?.disabled).toBe(false);
		});

		it('keeps both actions enabled without a canvas-provided group view', () => {
			workflowDocumentStore.createGroup([nodes[0].id], 'My group');
			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'canvas', nodeIds: [nodes[0].id] });

			const byId = Object.fromEntries(actions.value.map((action) => [action.id, action]));
			expect(byId.expand_selected_groups?.disabled).toBe(false);
			expect(byId.collapse_selected_groups?.disabled).toBe(false);
		});

		it('reflects the carried group state for a title bar target', () => {
			const group = workflowDocumentStore.createGroup([nodes[0].id, nodes[1].id], 'My group');
			fakeGroupView([group.id]);
			const { open, actions } = useContextMenu();
			open(mockEvent, { source: 'group', groupId: group.id, nodeIds: group.nodeIds });

			const byId = Object.fromEntries(actions.value.map((action) => [action.id, action]));
			expect(byId.expand_selected_groups?.disabled).toBe(false);
			expect(byId.collapse_selected_groups?.disabled).toBe(true);
		});
	});

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
		vi.spyOn(workflowDocumentStore, 'getNodeById').mockReturnValue(sticky);
		open(mockEvent, { source: 'node-right-click', nodeId: sticky.id });

		expect(isOpen.value).toBe(true);
		expect(actions.value).toMatchSnapshot();
		expect(targetNodeIds.value).toEqual([sticky.id]);
	});

	it('should show "Go to Sub-workflow" action (enabled) when node is "Execute Workflow" with a set workflow', () => {
		const { open, isOpen, actions, targetNodeIds } = useContextMenu();
		const executeWorkflow = nodeFactory({
			type: EXECUTE_WORKFLOW_NODE_TYPE,
			parameters: {
				workflowId: {
					__rl: true,
					value: 'qseYRPbw6joqU7RC',
					mode: 'list',
					cachedResultName: '',
				},
			},
		});
		vi.spyOn(workflowDocumentStore, 'getNodeById').mockReturnValue(executeWorkflow);
		open(mockEvent, { source: 'node-right-click', nodeId: executeWorkflow.id });

		expect(isOpen.value).toBe(true);
		expect(actions.value).toMatchSnapshot();
		expect(targetNodeIds.value).toEqual([executeWorkflow.id]);
	});

	it('should show "Go to Sub-workflow" action (disabled) when node is "Execute Workflow" without a set workflow', () => {
		const { open, isOpen, actions, targetNodeIds } = useContextMenu();
		const executeWorkflow = nodeFactory({
			type: EXECUTE_WORKFLOW_NODE_TYPE,
			parameters: {
				workflowId: {},
			},
		});
		vi.spyOn(workflowDocumentStore, 'getNodeById').mockReturnValue(executeWorkflow);
		open(mockEvent, { source: 'node-right-click', nodeId: executeWorkflow.id });

		expect(isOpen.value).toBe(true);
		expect(actions.value).toMatchSnapshot();
		expect(targetNodeIds.value).toEqual([executeWorkflow.id]);
	});

	it('should show "Go to Sub-workflow" action (enabled) when node is "Workflow Tool" with a set workflow', () => {
		const { open, isOpen, actions, targetNodeIds } = useContextMenu();
		const executeWorkflow = nodeFactory({
			type: WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE,
			parameters: {
				workflowId: {
					__rl: true,
					value: 'qseYRPbw6joqU7RC',
					mode: 'list',
					cachedResultName: '',
				},
			},
		});
		vi.spyOn(workflowDocumentStore, 'getNodeById').mockReturnValue(executeWorkflow);
		open(mockEvent, { source: 'node-right-click', nodeId: executeWorkflow.id });

		expect(isOpen.value).toBe(true);
		expect(actions.value).toMatchSnapshot();
		expect(targetNodeIds.value).toEqual([executeWorkflow.id]);
	});

	it('should show "Go to Sub-workflow" action (disabled) when node is "Workflow Tool" without a set workflow', () => {
		const { open, isOpen, actions, targetNodeIds } = useContextMenu();
		const executeWorkflow = nodeFactory({
			type: WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE,
			parameters: {
				workflowId: {},
			},
		});
		vi.spyOn(workflowDocumentStore, 'getNodeById').mockReturnValue(executeWorkflow);
		open(mockEvent, { source: 'node-right-click', nodeId: executeWorkflow.id });

		expect(isOpen.value).toBe(true);
		expect(actions.value).toMatchSnapshot();
		expect(targetNodeIds.value).toEqual([executeWorkflow.id]);
	});

	it('should disable pinning for node that has other inputs then "main"', () => {
		const { open, isOpen, actions, targetNodeIds } = useContextMenu();
		const basicChain = nodeFactory({ type: BASIC_CHAIN_NODE_TYPE });
		vi.spyOn(workflowDocumentStore, 'getNodeById').mockReturnValue(basicChain);
		vi.spyOn(NodeHelpers, 'getConnectionTypes').mockReturnValue([
			NodeConnectionTypes.Main,
			NodeConnectionTypes.AiLanguageModel,
		]);
		open(mockEvent, { source: 'node-right-click', nodeId: basicChain.id });

		expect(isOpen.value).toBe(true);
		expect(actions.value.find((action) => action.id === 'toggle_pin')?.disabled).toBe(true);
		expect(targetNodeIds.value).toEqual([basicChain.id]);
	});

	it('should disable execute step option for sub-nodes (AI tool nodes)', () => {
		const { open, isOpen, actions, targetNodeIds } = useContextMenu();
		const subNode = nodeFactory({ type: 'n8n-nodes-base.hackerNewsTool' });
		vi.spyOn(workflowDocumentStore, 'getNodeById').mockReturnValue(subNode);
		vi.spyOn(NodeHelpers, 'isExecutable').mockReturnValueOnce(false).mockReturnValueOnce(false);
		open(mockEvent, { source: 'node-right-click', nodeId: subNode.id });

		expect(isOpen.value).toBe(true);
		expect(actions.value.find((action) => action.id === 'execute')?.disabled).toBe(true);
		expect(targetNodeIds.value).toEqual([subNode.id]);
	});

	it('should return the correct actions when right clicking a Node', () => {
		const { open, isOpen, actions, targetNodeIds } = useContextMenu();
		const node = nodeFactory();
		vi.spyOn(workflowDocumentStore, 'getNodeById').mockReturnValue(node);
		open(mockEvent, { source: 'node-right-click', nodeId: node.id });

		expect(isOpen.value).toBe(true);
		expect(actions.value).toMatchSnapshot();
		expect(targetNodeIds.value).toEqual([node.id]);
	});

	describe('Webhook URL copy actions', () => {
		it('should show copy test URL for regular webhook node when workflow is inactive', () => {
			const { open, isOpen, actions, targetNodeIds } = useContextMenu();
			const webhookNode = nodeFactory({ type: WEBHOOK_NODE_TYPE, webhookId: 'test-webhook' });
			vi.spyOn(workflowDocumentStore, 'getNodeById').mockReturnValue(webhookNode);
			workflowDocumentStore.setActiveState({ activeVersionId: null, activeVersion: null });

			open(mockEvent, { source: 'node-right-click', nodeId: webhookNode.id });

			expect(isOpen.value).toBe(true);
			expect(targetNodeIds.value).toEqual([webhookNode.id]);
			const copyTestUrlAction = actions.value.find((action) => action.id === 'copy_test_url');
			expect(copyTestUrlAction).toBeDefined();
			expect(copyTestUrlAction?.disabled).toBe(false);
			expect(copyTestUrlAction?.divided).toBe(true);
			const copyProductionUrlAction = actions.value.find(
				(action) => action.id === 'copy_production_url',
			);
			expect(copyProductionUrlAction).toBeUndefined();
		});

		it('should show both test and production URLs for regular webhook node when workflow is active', () => {
			const { open, isOpen, actions, targetNodeIds } = useContextMenu();
			const webhookNode = nodeFactory({ type: WEBHOOK_NODE_TYPE, webhookId: 'test-webhook' });
			vi.spyOn(workflowDocumentStore, 'getNodeById').mockReturnValue(webhookNode);
			workflowDocumentStore.setActiveState({ activeVersionId: 'v1', activeVersion: null });

			open(mockEvent, { source: 'node-right-click', nodeId: webhookNode.id });

			expect(isOpen.value).toBe(true);
			expect(targetNodeIds.value).toEqual([webhookNode.id]);
			const copyTestUrlAction = actions.value.find((action) => action.id === 'copy_test_url');
			expect(copyTestUrlAction).toBeDefined();
			expect(copyTestUrlAction?.disabled).toBe(false);
			expect(copyTestUrlAction?.divided).toBe(true);
			const copyProductionUrlAction = actions.value.find(
				(action) => action.id === 'copy_production_url',
			);
			expect(copyProductionUrlAction).toBeDefined();
			expect(copyProductionUrlAction?.disabled).toBe(false);
			expect(copyProductionUrlAction?.divided).toBe(false);
		});

		it('should not show any webhook URL actions for production-only webhook when workflow is inactive', () => {
			const { open, isOpen, actions, targetNodeIds } = useContextMenu();
			const chatTriggerNode = nodeFactory({
				type: CHAT_TRIGGER_NODE_TYPE,
				webhookId: 'chat-webhook',
			});
			vi.spyOn(workflowDocumentStore, 'getNodeById').mockReturnValue(chatTriggerNode);
			workflowDocumentStore.setActiveState({ activeVersionId: null, activeVersion: null });

			open(mockEvent, { source: 'node-right-click', nodeId: chatTriggerNode.id });

			expect(isOpen.value).toBe(true);
			expect(targetNodeIds.value).toEqual([chatTriggerNode.id]);
			const copyTestUrlAction = actions.value.find((action) => action.id === 'copy_test_url');
			expect(copyTestUrlAction).toBeUndefined();
			const copyProductionUrlAction = actions.value.find(
				(action) => action.id === 'copy_production_url',
			);
			expect(copyProductionUrlAction).toBeUndefined();
		});

		it('should show only production URL for production-only webhook when workflow is active', () => {
			const { open, isOpen, actions, targetNodeIds } = useContextMenu();
			const chatTriggerNode = nodeFactory({
				type: CHAT_TRIGGER_NODE_TYPE,
				webhookId: 'chat-webhook',
			});
			vi.spyOn(workflowDocumentStore, 'getNodeById').mockReturnValue(chatTriggerNode);
			workflowDocumentStore.setActiveState({ activeVersionId: 'v1', activeVersion: null });

			open(mockEvent, { source: 'node-right-click', nodeId: chatTriggerNode.id });

			expect(isOpen.value).toBe(true);
			expect(targetNodeIds.value).toEqual([chatTriggerNode.id]);
			const copyTestUrlAction = actions.value.find((action) => action.id === 'copy_test_url');
			expect(copyTestUrlAction).toBeUndefined();
			const copyProductionUrlAction = actions.value.find(
				(action) => action.id === 'copy_production_url',
			);
			expect(copyProductionUrlAction).toBeDefined();
			expect(copyProductionUrlAction?.disabled).toBe(false);
			expect(copyProductionUrlAction?.divided).toBe(true);
		});

		it('should not show webhook URL actions for non-webhook node', () => {
			const { open, isOpen, actions, targetNodeIds } = useContextMenu();
			const regularNode = nodeFactory({ type: NO_OP_NODE_TYPE });
			vi.spyOn(workflowDocumentStore, 'getNodeById').mockReturnValue(regularNode);
			workflowDocumentStore.setActiveState({ activeVersionId: 'v1', activeVersion: null });

			open(mockEvent, { source: 'node-right-click', nodeId: regularNode.id });

			expect(isOpen.value).toBe(true);
			expect(targetNodeIds.value).toEqual([regularNode.id]);
			const copyTestUrlAction = actions.value.find((action) => action.id === 'copy_test_url');
			expect(copyTestUrlAction).toBeUndefined();
			const copyProductionUrlAction = actions.value.find(
				(action) => action.id === 'copy_production_url',
			);
			expect(copyProductionUrlAction).toBeUndefined();
		});
	});

	it('should return the correct actions opening the menu from the button', () => {
		const { open, isOpen, actions, targetNodeIds } = useContextMenu();
		const node = nodeFactory();
		vi.spyOn(workflowDocumentStore, 'getNodeById').mockReturnValue(node);
		open(mockEvent, { source: 'node-button', nodeId: node.id });

		expect(isOpen.value).toBe(true);
		expect(actions.value).toMatchSnapshot();
		expect(targetNodeIds.value).toEqual([node.id]);
	});

	describe('Read-only mode', () => {
		it('should return the correct actions when right clicking a sticky', () => {
			vi.spyOn(uiStore, 'isReadOnlyView', 'get').mockReturnValue(true);
			workflowDocumentStore.setScopes(['workflow:read']);
			const { open, isOpen, actions, targetNodeIds } = useContextMenu();
			const sticky = nodeFactory({ type: STICKY_NODE_TYPE });
			vi.spyOn(workflowDocumentStore, 'getNodeById').mockReturnValue(sticky);
			open(mockEvent, { source: 'node-right-click', nodeId: sticky.id });

			expect(isOpen.value).toBe(true);
			expect(actions.value).toMatchSnapshot();
			expect(targetNodeIds.value).toEqual([sticky.id]);
		});
		it('should return the correct actions when right clicking a Node', () => {
			vi.spyOn(uiStore, 'isReadOnlyView', 'get').mockReturnValue(true);
			const { open, isOpen, actions, targetNodeIds } = useContextMenu();
			const node = nodeFactory();
			vi.spyOn(workflowDocumentStore, 'getNodeById').mockReturnValue(node);
			open(mockEvent, { source: 'node-right-click', nodeId: node.id });

			expect(isOpen.value).toBe(true);
			expect(actions.value).toMatchSnapshot();
			expect(targetNodeIds.value).toEqual([node.id]);
		});
	});
});

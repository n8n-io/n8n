import { createTestNode, createTestWorkflow, defaultNodeDescriptions } from '@/__tests__/mocks';
import { createComponentRenderer } from '@/__tests__/render';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useHistoryHelper } from '@/composables/useHistoryHelper';
import { useNodeDirtiness } from '@/composables/useNodeDirtiness';
import { MANUAL_TRIGGER_NODE_TYPE, SET_NODE_TYPE } from '@/constants';
import { type INodeUi } from '@/Interface';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { CanvasNodeDirtiness } from '@/types';
import { type FrontendSettings } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { NodeConnectionTypes, type IConnections, type IRunData } from 'n8n-workflow';
import { defineComponent } from 'vue';
import { createRouter, createWebHistory, type RouteLocationNormalizedLoaded } from 'vue-router';

describe(useNodeDirtiness, () => {
	let nodeTypeStore: ReturnType<typeof useNodeTypesStore>;
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let settingsStore: ReturnType<typeof useSettingsStore>;
	let historyHelper: ReturnType<typeof useHistoryHelper>;
	let canvasOperations: ReturnType<typeof useCanvasOperations>;
	let uiStore: ReturnType<typeof useUIStore>;

	const NODE_RUN_AT = new Date('2025-01-01T00:00:01');
	const WORKFLOW_UPDATED_AT = new Date('2025-01-01T00:00:10');

	beforeEach(() => {
		vi.useFakeTimers();

		const TestComponent = defineComponent({
			setup() {
				nodeTypeStore = useNodeTypesStore();
				workflowsStore = useWorkflowsStore();
				settingsStore = useSettingsStore();
				historyHelper = useHistoryHelper({} as RouteLocationNormalizedLoaded);
				canvasOperations = useCanvasOperations();
				uiStore = useUIStore();

				nodeTypeStore.setNodeTypes(defaultNodeDescriptions);

				// Enable new partial execution
				settingsStore.settings = {
					partialExecution: { version: 2 },
				} as FrontendSettings;
			},
			template: '<div />',
		});

		createComponentRenderer(TestComponent, {
			global: {
				plugins: [
					createTestingPinia({ stubActions: false, fakeApp: true }),
					createRouter({
						history: createWebHistory(),
						routes: [{ path: '/', component: TestComponent }],
					}),
				],
			},
		})();
	});

	it('should be an empty object if no change has been made to the workflow', () => {
		setupTestWorkflow('a🚨✅, b✅, c✅');

		expect(useNodeDirtiness().dirtinessByName.value).toEqual({});
	});

	describe('injecting a node', () => {
		it('should mark a node as dirty if a new node is injected as its parent', async () => {
			useNodeTypesStore().setNodeTypes(defaultNodeDescriptions);

			setupTestWorkflow('a🚨✅ -> b✅');

			uiStore.lastInteractedWithNodeConnection = {
				source: workflowsStore.nodesByName.a.id,
				target: workflowsStore.nodesByName.b.id,
			};
			uiStore.lastInteractedWithNodeId = workflowsStore.nodesByName.a.id;
			uiStore.lastInteractedWithNodeHandle = 'outputs/main/0';

			await canvasOperations.addNodes([createTestNode({ name: 'c' })], { trackHistory: true });

			expect(useNodeDirtiness().dirtinessByName.value).toEqual({
				b: CanvasNodeDirtiness.INCOMING_CONNECTIONS_UPDATED,
			});
		});
	});

	describe('deleting a node', () => {
		it('should mark a node as dirty if a parent node is replaced by removing a node', async () => {
			useNodeTypesStore().setNodeTypes(defaultNodeDescriptions);

			setupTestWorkflow('a🚨✅ -> b✅ -> c✅');

			canvasOperations.deleteNodes([workflowsStore.nodesByName.b.id], { trackHistory: true }); // 'a' becomes new parent of 'c'

			expect(useNodeDirtiness().dirtinessByName.value).toEqual({
				c: CanvasNodeDirtiness.INCOMING_CONNECTIONS_UPDATED,
			});
		});

		it('should mark a node as dirty if a parent node get removed', async () => {
			useNodeTypesStore().setNodeTypes(defaultNodeDescriptions);

			setupTestWorkflow('a🚨✅ -> b✅ -> c✅');

			canvasOperations.deleteNodes([workflowsStore.nodesByName.a.id], { trackHistory: true }); // 'b' has no parent node anymore

			expect(useNodeDirtiness().dirtinessByName.value).toEqual({
				b: CanvasNodeDirtiness.INCOMING_CONNECTIONS_UPDATED,
			});
		});
	});

	describe('updating node parameters', () => {
		it('should mark a node as dirty if its parameter has changed', () => {
			setupTestWorkflow('a🚨✅, b✅, c✅');

			canvasOperations.setNodeParameters(workflowsStore.nodesByName.b.id, { foo: 1 });

			expect(useNodeDirtiness().dirtinessByName.value).toEqual({
				b: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});

		it('should clear dirtiness if a dirty node gets new run data', () => {
			useNodeTypesStore().setNodeTypes(defaultNodeDescriptions);

			setupTestWorkflow('a🚨✅ -> b✅ -> c✅');

			canvasOperations.setNodeParameters(workflowsStore.nodesByName.b.id, { foo: 1 });

			const runAt = new Date(+WORKFLOW_UPDATED_AT + 1000);

			workflowsStore.setWorkflowExecutionData({
				id: workflowsStore.workflow.id,
				finished: true,
				mode: 'manual',
				status: 'success',
				workflowData: workflowsStore.workflow,
				startedAt: runAt,
				createdAt: runAt,
				data: {
					resultData: {
						runData: {
							b: [
								{
									startTime: +runAt,
									executionTime: 0,
									executionIndex: 0,
									executionStatus: 'success',
									source: [],
								},
							],
						},
					},
				},
			});

			expect(useNodeDirtiness().dirtinessByName.value).toEqual({});
		});

		it("should not update dirtiness if the node hasn't run yet", () => {
			setupTestWorkflow('a🚨✅, b, c✅');

			canvasOperations.setNodeParameters(workflowsStore.nodesByName.b.id, { foo: 1 });

			expect(useNodeDirtiness().dirtinessByName.value).toEqual({});
		});

		it('should not update dirtiness when the notes field is updated', () => {
			setupTestWorkflow('a🚨✅ -> b✅ -> c✅');

			workflowsStore.setNodeValue({ key: 'notes', name: 'b', value: 'test' });

			expect(useNodeDirtiness().dirtinessByName.value).toEqual({});
		});
	});

	describe('adding a connection', () => {
		it('should mark a node as dirty if a new incoming connection is added', () => {
			useNodeTypesStore().setNodeTypes(defaultNodeDescriptions);

			setupTestWorkflow('a🚨✅ -> b✅ -> c✅');

			canvasOperations.createConnection(
				{ source: workflowsStore.nodesByName.a.id, target: workflowsStore.nodesByName.c.id },
				{ trackHistory: true },
			);

			expect(useNodeDirtiness().dirtinessByName.value).toEqual({
				c: CanvasNodeDirtiness.INCOMING_CONNECTIONS_UPDATED,
			});
		});
	});

	describe('removing a connection', () => {
		it('should not change dirtiness', () => {
			useNodeTypesStore().setNodeTypes(defaultNodeDescriptions);

			setupTestWorkflow('a🚨✅ -> b✅ -> c✅');

			canvasOperations.deleteConnection(
				{ source: workflowsStore.nodesByName.a.id, target: workflowsStore.nodesByName.b.id },
				{ trackHistory: true },
			);

			expect(useNodeDirtiness().dirtinessByName.value).toEqual({});
		});
	});

	describe('enabling/disabling nodes', () => {
		it('should mark downstream nodes dirty if the node is set to disabled', () => {
			setupTestWorkflow('a🚨✅ -> b✅ -> c✅ -> d✅');

			canvasOperations.toggleNodesDisabled([workflowsStore.nodesByName.b.id], {
				trackHistory: true,
			});

			expect(useNodeDirtiness().dirtinessByName.value).toEqual({
				c: CanvasNodeDirtiness.INCOMING_CONNECTIONS_UPDATED,
			});
		});

		it('should not mark anything dirty if a disabled node is set to enabled', () => {
			setupTestWorkflow('a🚨✅ -> b🚫 -> c✅ -> d✅');

			canvasOperations.toggleNodesDisabled([workflowsStore.nodesByName.b.id], {
				trackHistory: true,
			});

			expect(useNodeDirtiness().dirtinessByName.value).toEqual({});
		});

		it('should restore original dirtiness after undoing a command', async () => {
			setupTestWorkflow('a🚨✅ -> b✅ -> c✅ -> d✅');

			canvasOperations.toggleNodesDisabled([workflowsStore.nodesByName.b.id], {
				trackHistory: true,
			});

			expect(useNodeDirtiness().dirtinessByName.value).toEqual({
				c: CanvasNodeDirtiness.INCOMING_CONNECTIONS_UPDATED,
			});

			await historyHelper.undo();

			expect(useNodeDirtiness().dirtinessByName.value).toEqual({});
		});
	});

	describe('pinned data', () => {
		it('should not change dirtiness when data is pinned', async () => {
			setupTestWorkflow('a🚨✅ -> b✅ -> c✅');

			canvasOperations.toggleNodesPinned([workflowsStore.nodesByName.b.id], 'pin-icon-click', {
				trackHistory: true,
			});

			expect(useNodeDirtiness().dirtinessByName.value).toEqual({});
		});

		it('should update dirtiness when pinned data is removed from a node with run data', async () => {
			setupTestWorkflow('a🚨✅ -> b✅📌 -> c✅, b -> d, b -> e✅ -> f✅');

			canvasOperations.toggleNodesPinned([workflowsStore.nodesByName.b.id], 'pin-icon-click', {
				trackHistory: true,
			});

			expect(useNodeDirtiness().dirtinessByName.value).toEqual({
				b: CanvasNodeDirtiness.PINNED_DATA_UPDATED,
			});
		});

		it('should update dirtiness when an existing pinned data of an incoming node is updated', async () => {
			setupTestWorkflow('a🚨✅ -> b✅📌 -> c✅, b -> d, b -> e✅ -> f✅');

			workflowsStore.pinData({ node: workflowsStore.nodesByName.b, data: [{ json: {} }] });

			expect(useNodeDirtiness().dirtinessByName.value).toEqual({
				// 'd' is not marked as pinned-data-updated because it has no run data.
				c: CanvasNodeDirtiness.PINNED_DATA_UPDATED,
				e: CanvasNodeDirtiness.PINNED_DATA_UPDATED,
			});
		});
	});

	describe('sub-nodes', () => {
		it('should mark its parent nodes with run data as dirty when parameters of a sub node has changed', () => {
			setupTestWorkflow('a🚨✅ -> b✅ -> c✅, d🧠 -> b, e🧠 -> f✅🧠 -> b');

			canvasOperations.setNodeParameters(workflowsStore.nodesByName.e.id, { foo: 1 });

			expect(useNodeDirtiness().dirtinessByName.value).toEqual({
				// 'e' itself is not marked as parameters-updated, because it has no run data.
				f: CanvasNodeDirtiness.UPSTREAM_DIRTY,
				b: CanvasNodeDirtiness.UPSTREAM_DIRTY,
			});
		});

		it('should change dirtiness if a disabled sub node is set to enabled', () => {
			setupTestWorkflow('a🚨✅ -> b✅ -> c✅, d🧠🚫 -> b');

			canvasOperations.toggleNodesDisabled([workflowsStore.nodesByName.d.id], {
				trackHistory: true,
			});

			expect(useNodeDirtiness().dirtinessByName.value).toEqual({
				b: CanvasNodeDirtiness.INCOMING_CONNECTIONS_UPDATED,
			});
		});

		it('should change dirtiness if a sub node is removed', () => {
			setupTestWorkflow('a🚨✅ -> b✅ -> c✅, d🧠 -> b');

			canvasOperations.deleteNodes([workflowsStore.nodesByName.d.id], { trackHistory: true });

			expect(useNodeDirtiness().dirtinessByName.value).toEqual({
				b: CanvasNodeDirtiness.INCOMING_CONNECTIONS_UPDATED,
			});
		});
	});

	describe('workflow with a loop', () => {
		it('should change the dirtiness of the first node in a loop when one of nodes in the loop becomes dirty', () => {
			setupTestWorkflow('a🚨✅ -> b✅ -> c✅ -> d✅ -> e✅ -> f✅ -> c✅');

			canvasOperations.setNodeParameters(workflowsStore.nodesByName.e.id, { foo: 1 });

			expect(useNodeDirtiness().dirtinessByName.value).toEqual({
				c: CanvasNodeDirtiness.UPSTREAM_DIRTY,
				e: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});

		it('should not choose a node as the first node in a loop if all nodes in the loop have incoming connections', () => {
			setupTestWorkflow('a🚨✅ -> b✅ -> c✅, d✅ -> e✅ -> d✅, d -> b');

			canvasOperations.setNodeParameters(workflowsStore.nodesByName.c.id, { foo: 1 });

			expect(useNodeDirtiness().dirtinessByName.value).toEqual({
				c: CanvasNodeDirtiness.PARAMETERS_UPDATED,
			});
		});
	});

	describe('renaming a node', () => {
		it.todo('should preserve the dirtiness', async () => {
			useNodeTypesStore().setNodeTypes(defaultNodeDescriptions);

			setupTestWorkflow('a🚨✅ -> b✅ -> c✅');

			canvasOperations.deleteNodes([workflowsStore.nodesByName.b.id], { trackHistory: true }); // 'a' becomes new parent of 'c'

			expect(useNodeDirtiness().dirtinessByName.value).toEqual({
				c: CanvasNodeDirtiness.INCOMING_CONNECTIONS_UPDATED,
			});

			await canvasOperations.renameNode('c', 'd', { trackHistory: true });

			expect(useNodeDirtiness().dirtinessByName.value).toEqual({
				d: CanvasNodeDirtiness.INCOMING_CONNECTIONS_UPDATED,
			});
		});
	});

	/**
	 * Setup test data in the workflow store using given diagram.
	 *
	 * [Symbols]
	 * - 🚨: Trigger node
	 * - ✅: Node with run data
	 * - 🚫: Disabled node
	 * - 📌: Node with pinned data
	 * - 🧠: A sub node
	 */
	function setupTestWorkflow(diagram: string) {
		const nodeNamesWithPinnedData = new Set<string>();
		const nodes: Record<string, INodeUi> = {};
		const connections: IConnections = {};
		const runData: IRunData = {};

		for (const subGraph of diagram.split(/\n|,/).filter((line) => line.trim() !== '')) {
			const elements = subGraph.split(/(->)/).map((s) => s.trim());

			elements.forEach((element, i, arr) => {
				if (element === '->') {
					const from = arr[i - 1].slice(0, 1);
					const to = arr[i + 1].slice(0, 1);
					const type = arr[i - 1].includes('🧠')
						? NodeConnectionTypes.AiAgent
						: NodeConnectionTypes.Main;
					const conns = connections[from]?.[type] ?? [];
					const conn = conns[0] ?? [];

					connections[from] = {
						...connections[from],
						[type]: [[...conn, { node: to, type, index: conn.length }], ...conns.slice(1)],
					};
					return;
				}

				const [name, ...attributes] = element.trim();

				nodes[name] =
					nodes[name] ??
					createTestNode({
						name,
						disabled: attributes.includes('🚫'),
						type: attributes.includes('🚨') ? MANUAL_TRIGGER_NODE_TYPE : SET_NODE_TYPE,
					});

				if (attributes.includes('✅')) {
					runData[name] = [
						{
							startTime: +NODE_RUN_AT,
							executionTime: 0,
							executionIndex: 0,
							executionStatus: 'success',
							source: [],
						},
					];
				}

				if (attributes.includes('📌')) {
					nodeNamesWithPinnedData.add(name);
				}
			});
		}

		const workflow = createTestWorkflow({ nodes: Object.values(nodes), connections });

		workflowsStore.setNodes(workflow.nodes);
		workflowsStore.setConnections(workflow.connections);

		for (const name of nodeNamesWithPinnedData) {
			workflowsStore.pinData({
				node: workflowsStore.nodesByName[name],
				data: [{ json: {} }],
			});
		}

		workflowsStore.setWorkflowExecutionData({
			id: workflow.id,
			finished: true,
			mode: 'manual',
			status: 'success',
			workflowData: workflow,
			startedAt: NODE_RUN_AT,
			createdAt: NODE_RUN_AT,
			data: { resultData: { runData } },
		});

		// prepare for making changes to the workflow
		vi.setSystemTime(WORKFLOW_UPDATED_AT);
	}
});

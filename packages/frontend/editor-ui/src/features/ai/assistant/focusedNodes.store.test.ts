import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { nextTick } from 'vue';

import { useFocusedNodesStore } from './focusedNodes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useChatPanelStateStore } from './chatPanelState.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { mockedStore } from '@/__tests__/utils';
import * as telemetryModule from '@/app/composables/useTelemetry';
import type { Telemetry } from '@/app/plugins/telemetry';
import type { INodeUi } from '@/Interface';

// Mock telemetry
const track = vi.fn();
vi.spyOn(telemetryModule, 'useTelemetry').mockImplementation(
	() =>
		({
			track,
		}) as unknown as Telemetry,
);

// Mock posthog
let featureEnabled = true;
vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({
		isVariantEnabled: () => featureEnabled,
	}),
}));

// Mock useDebounceFn to execute immediately
vi.mock('@vueuse/core', async (importOriginal) => {
	const actual: Record<string, unknown> = await importOriginal();
	return {
		...actual,
		useDebounceFn: (fn: (...args: unknown[]) => void) => fn,
	};
});

// Mock vue-router
vi.mock('vue-router', () => ({
	useRoute: vi.fn(() => ({ path: '/', params: {}, name: 'NodeView' })),
	useRouter: vi.fn(),
	RouterLink: vi.fn(),
}));

const createMockNode = (id: string, name: string, type = 'n8n-nodes-base.httpRequest'): INodeUi =>
	({
		id,
		name,
		type,
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	}) as INodeUi;

describe('useFocusedNodesStore', () => {
	let focusedNodesStore: ReturnType<typeof useFocusedNodesStore>;
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;

	beforeEach(() => {
		vi.clearAllMocks();
		featureEnabled = true;

		setActivePinia(
			createTestingPinia({
				createSpy: vi.fn,
				stubActions: false,
			}),
		);

		workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.allNodes = [
			createMockNode('node-1', 'HTTP Request', 'n8n-nodes-base.httpRequest'),
			createMockNode('node-2', 'Code', 'n8n-nodes-base.code'),
			createMockNode('node-3', 'Set', 'n8n-nodes-base.set'),
		];
		workflowsStore.workflowId = 'wf-1';
		workflowsStore.connectionsByDestinationNode = {};
		workflowsStore.connectionsBySourceNode = {};

		focusedNodesStore = useFocusedNodesStore();
		track.mockReset();
	});

	describe('initialization', () => {
		it('should initialize with empty map', () => {
			expect(focusedNodesStore.focusedNodesMap).toEqual({});
		});

		it('should initialize with empty canvasSelectedNodeIds', () => {
			expect(focusedNodesStore.canvasSelectedNodeIds.size).toBe(0);
		});
	});

	describe('computed properties', () => {
		it('should return confirmed nodes', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'confirmed',
				},
				'node-2': {
					nodeId: 'node-2',
					nodeName: 'Code',
					nodeType: 'n8n-nodes-base.code',
					state: 'unconfirmed',
				},
			};

			expect(focusedNodesStore.confirmedNodes).toHaveLength(1);
			expect(focusedNodesStore.confirmedNodes[0].nodeId).toBe('node-1');
		});

		it('should return unconfirmed nodes', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'confirmed',
				},
				'node-2': {
					nodeId: 'node-2',
					nodeName: 'Code',
					nodeType: 'n8n-nodes-base.code',
					state: 'unconfirmed',
				},
			};

			expect(focusedNodesStore.unconfirmedNodes).toHaveLength(1);
			expect(focusedNodesStore.unconfirmedNodes[0].nodeId).toBe('node-2');
		});

		it('should return empty filteredUnconfirmedNodes when all non-confirmed slots taken by unconfirmed', () => {
			// 3 workflow nodes, 2 confirmed → 1 available slot, 1 unconfirmed fills it → filter returns []
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'confirmed',
				},
				'node-2': {
					nodeId: 'node-2',
					nodeName: 'Code',
					nodeType: 'n8n-nodes-base.code',
					state: 'confirmed',
				},
				'node-3': {
					nodeId: 'node-3',
					nodeName: 'Set',
					nodeType: 'n8n-nodes-base.set',
					state: 'unconfirmed',
				},
			};

			// availableNodes = 3 - 2 = 1, unconfirmedNodes.length = 1, 1 >= 1 → true → return []
			expect(focusedNodesStore.filteredUnconfirmedNodes).toEqual([]);
		});

		it('should return allVisibleNodes as confirmed + unconfirmed', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'confirmed',
				},
				'node-2': {
					nodeId: 'node-2',
					nodeName: 'Code',
					nodeType: 'n8n-nodes-base.code',
					state: 'unconfirmed',
				},
			};

			expect(focusedNodesStore.allVisibleNodes).toHaveLength(2);
		});

		it('should collapse chips when confirmed >= 7', () => {
			const map: Record<string, (typeof focusedNodesStore.focusedNodesMap)[string]> = {};
			for (let i = 0; i < 7; i++) {
				map[`node-${i}`] = {
					nodeId: `node-${i}`,
					nodeName: `Node ${i}`,
					nodeType: 'n8n-nodes-base.code',
					state: 'confirmed',
				};
			}
			focusedNodesStore.focusedNodesMap = map;

			expect(focusedNodesStore.shouldCollapseChips).toBe(true);
		});

		it('should not collapse chips when confirmed < 7', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'confirmed',
				},
			};

			expect(focusedNodesStore.shouldCollapseChips).toBe(false);
		});

		it('should return confirmedNodeIds', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'confirmed',
				},
				'node-2': {
					nodeId: 'node-2',
					nodeName: 'Code',
					nodeType: 'n8n-nodes-base.code',
					state: 'unconfirmed',
				},
			};

			expect(focusedNodesStore.confirmedNodeIds).toEqual(['node-1']);
		});

		it('should return hasVisibleNodes correctly', () => {
			expect(focusedNodesStore.hasVisibleNodes).toBe(false);

			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'confirmed',
				},
			};

			expect(focusedNodesStore.hasVisibleNodes).toBe(true);
		});

		it('should detect tooManyUnconfirmed when > 50', () => {
			const map: Record<string, (typeof focusedNodesStore.focusedNodesMap)[string]> = {};
			// Need more workflow nodes than unconfirmed to avoid the "all slots taken" filter
			const manyNodes: INodeUi[] = [];
			for (let i = 0; i < 70; i++) {
				manyNodes.push(createMockNode(`node-${i}`, `Node ${i}`));
			}
			// 55 unconfirmed out of 70 total → availableNodes = 70, 55 < 70 → not filtered
			for (let i = 0; i < 55; i++) {
				map[`node-${i}`] = {
					nodeId: `node-${i}`,
					nodeName: `Node ${i}`,
					nodeType: 'n8n-nodes-base.code',
					state: 'unconfirmed',
				};
			}
			workflowsStore.allNodes = manyNodes;
			focusedNodesStore.focusedNodesMap = map;

			expect(focusedNodesStore.tooManyUnconfirmed).toBe(true);
		});
	});

	describe('confirmNodes', () => {
		it('should confirm an existing unconfirmed node', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'unconfirmed',
				},
			};

			focusedNodesStore.confirmNodes(['node-1'], 'canvas_selection');

			expect(focusedNodesStore.focusedNodesMap['node-1'].state).toBe('confirmed');
		});

		it('should add a new node not yet in map', () => {
			focusedNodesStore.confirmNodes(['node-1'], 'context_menu');

			expect(focusedNodesStore.focusedNodesMap['node-1']).toEqual({
				nodeId: 'node-1',
				nodeName: 'HTTP Request',
				nodeType: 'n8n-nodes-base.httpRequest',
				state: 'confirmed',
			});
		});

		it('should skip if getNodeInfo returns null', () => {
			focusedNodesStore.confirmNodes(['non-existent'], 'context_menu');

			expect(focusedNodesStore.focusedNodesMap['non-existent']).toBeUndefined();
		});

		it('should confirm multiple nodes', () => {
			focusedNodesStore.confirmNodes(['node-1', 'node-2'], 'context_menu');

			expect(focusedNodesStore.focusedNodesMap['node-1'].state).toBe('confirmed');
			expect(focusedNodesStore.focusedNodesMap['node-2'].state).toBe('confirmed');
		});

		it('should track telemetry with source and node_types', () => {
			focusedNodesStore.confirmNodes(['node-1'], 'context_menu');

			expect(track).toHaveBeenCalledWith('ai.focusedNodes.added', {
				source: 'context_menu',
				node_count: 1,
				node_types: ['n8n-nodes-base.httpRequest'],
			});
		});

		it('should include mention_query_length for mention source', () => {
			focusedNodesStore.confirmNodes(['node-1'], 'mention', { mentionQueryLength: 5 });

			expect(track).toHaveBeenCalledWith('ai.focusedNodes.added', {
				source: 'mention',
				node_count: 1,
				node_types: ['n8n-nodes-base.httpRequest'],
				mention_query_length: 5,
			});
		});

		it('should not include mention_query_length for non-mention source', () => {
			focusedNodesStore.confirmNodes(['node-1'], 'context_menu');

			expect(track).toHaveBeenCalledWith(
				'ai.focusedNodes.added',
				expect.not.objectContaining({ mention_query_length: expect.anything() }),
			);
		});

		it('should not fire telemetry when no nodes confirmed', () => {
			focusedNodesStore.confirmNodes(['non-existent'], 'context_menu');

			expect(track).not.toHaveBeenCalled();
		});
	});

	describe('setUnconfirmedFromCanvasSelection', () => {
		it('should update canvasSelectedNodeIds', () => {
			focusedNodesStore.setUnconfirmedFromCanvasSelection(['node-1', 'node-2']);

			expect(focusedNodesStore.canvasSelectedNodeIds.has('node-1')).toBe(true);
			expect(focusedNodesStore.canvasSelectedNodeIds.has('node-2')).toBe(true);
		});

		it('should add unconfirmed for non-confirmed nodes', () => {
			focusedNodesStore.setUnconfirmedFromCanvasSelection(['node-1']);

			expect(focusedNodesStore.focusedNodesMap['node-1']).toEqual({
				nodeId: 'node-1',
				nodeName: 'HTTP Request',
				nodeType: 'n8n-nodes-base.httpRequest',
				state: 'unconfirmed',
			});
		});

		it('should preserve confirmed nodes', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'confirmed',
				},
			};

			focusedNodesStore.setUnconfirmedFromCanvasSelection(['node-1', 'node-2']);

			expect(focusedNodesStore.focusedNodesMap['node-1'].state).toBe('confirmed');
			expect(focusedNodesStore.focusedNodesMap['node-2'].state).toBe('unconfirmed');
		});

		it('should remove stale unconfirmed nodes not in selection', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'unconfirmed',
				},
			};

			focusedNodesStore.setUnconfirmedFromCanvasSelection(['node-2']);

			expect(focusedNodesStore.focusedNodesMap['node-1']).toBeUndefined();
			expect(focusedNodesStore.focusedNodesMap['node-2'].state).toBe('unconfirmed');
		});

		it('should skip null getNodeInfo', () => {
			focusedNodesStore.setUnconfirmedFromCanvasSelection(['non-existent']);

			expect(focusedNodesStore.focusedNodesMap['non-existent']).toBeUndefined();
		});
	});

	describe('toggleNode', () => {
		it('should no-op if node is not in map', () => {
			focusedNodesStore.toggleNode('node-1', false);

			expect(focusedNodesStore.focusedNodesMap['node-1']).toBeUndefined();
		});

		it('should confirm an unconfirmed node', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'unconfirmed',
				},
			};

			focusedNodesStore.toggleNode('node-1', false);

			expect(focusedNodesStore.focusedNodesMap['node-1'].state).toBe('confirmed');
		});

		it('should downgrade confirmed to unconfirmed when on canvas', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'confirmed',
				},
			};

			focusedNodesStore.toggleNode('node-1', true);

			expect(focusedNodesStore.focusedNodesMap['node-1'].state).toBe('unconfirmed');
		});

		it('should remove confirmed node when not on canvas', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'confirmed',
				},
			};

			focusedNodesStore.toggleNode('node-1', false);

			expect(focusedNodesStore.focusedNodesMap['node-1']).toBeUndefined();
		});
	});

	describe('removeNode', () => {
		it('should remove node from map', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'confirmed',
				},
			};

			focusedNodesStore.removeNode('node-1');

			expect(focusedNodesStore.focusedNodesMap['node-1']).toBeUndefined();
		});

		it('should track telemetry for confirmed nodes', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'confirmed',
				},
			};

			focusedNodesStore.removeNode('node-1');

			expect(track).toHaveBeenCalledWith('ai.focusedNodes.removed', {
				method: 'badge_click',
				removed_count: 1,
				remaining_count: 0,
			});
		});

		it('should not track telemetry for unconfirmed nodes', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'unconfirmed',
				},
			};

			focusedNodesStore.removeNode('node-1');

			expect(track).not.toHaveBeenCalled();
		});

		it('should use default method badge_click', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'confirmed',
				},
			};

			focusedNodesStore.removeNode('node-1');

			expect(track).toHaveBeenCalledWith(
				'ai.focusedNodes.removed',
				expect.objectContaining({ method: 'badge_click' }),
			);
		});

		it('should report correct remaining_count', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'confirmed',
				},
				'node-2': {
					nodeId: 'node-2',
					nodeName: 'Code',
					nodeType: 'n8n-nodes-base.code',
					state: 'confirmed',
				},
			};

			focusedNodesStore.removeNode('node-1');

			expect(track).toHaveBeenCalledWith(
				'ai.focusedNodes.removed',
				expect.objectContaining({ remaining_count: 1 }),
			);
		});
	});

	describe('clearAll', () => {
		it('should empty the map', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'confirmed',
				},
			};

			focusedNodesStore.clearAll();

			expect(focusedNodesStore.focusedNodesMap).toEqual({});
		});

		it('should track telemetry with removed/remaining counts', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'confirmed',
				},
				'node-2': {
					nodeId: 'node-2',
					nodeName: 'Code',
					nodeType: 'n8n-nodes-base.code',
					state: 'confirmed',
				},
			};

			focusedNodesStore.clearAll();

			expect(track).toHaveBeenCalledWith('ai.focusedNodes.removed', {
				method: 'clear_all',
				removed_count: 2,
				remaining_count: 0,
			});
		});

		it('should not track telemetry if no confirmed nodes', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'unconfirmed',
				},
			};

			focusedNodesStore.clearAll();

			expect(track).not.toHaveBeenCalled();
		});
	});

	describe('removeAllConfirmed', () => {
		it('should downgrade canvas-selected confirmed to unconfirmed', () => {
			focusedNodesStore.canvasSelectedNodeIds = new Set(['node-1']);
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'confirmed',
				},
			};

			focusedNodesStore.removeAllConfirmed();

			expect(focusedNodesStore.focusedNodesMap['node-1'].state).toBe('unconfirmed');
		});

		it('should delete off-canvas confirmed nodes', () => {
			focusedNodesStore.canvasSelectedNodeIds = new Set();
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'confirmed',
				},
			};

			focusedNodesStore.removeAllConfirmed();

			expect(focusedNodesStore.focusedNodesMap['node-1']).toBeUndefined();
		});

		it('should track telemetry', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'confirmed',
				},
			};

			focusedNodesStore.removeAllConfirmed();

			expect(track).toHaveBeenCalledWith('ai.focusedNodes.removed', {
				method: 'clear_all',
				removed_count: 1,
				remaining_count: 0,
			});
		});
	});

	describe('handleNodeDeleted', () => {
		it('should remove node when present', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'confirmed',
				},
			};

			focusedNodesStore.handleNodeDeleted('node-1');

			expect(focusedNodesStore.focusedNodesMap['node-1']).toBeUndefined();
		});

		it('should no-op when absent', () => {
			focusedNodesStore.handleNodeDeleted('non-existent');

			expect(Object.keys(focusedNodesStore.focusedNodesMap)).toHaveLength(0);
		});
	});

	describe('handleNodeRenamed', () => {
		it('should update name when present', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'confirmed',
				},
			};

			focusedNodesStore.handleNodeRenamed('node-1', 'My HTTP Request');

			expect(focusedNodesStore.focusedNodesMap['node-1'].nodeName).toBe('My HTTP Request');
		});

		it('should no-op when absent', () => {
			focusedNodesStore.handleNodeRenamed('non-existent', 'New Name');

			expect(Object.keys(focusedNodesStore.focusedNodesMap)).toHaveLength(0);
		});
	});

	describe('setState', () => {
		it('should set state on existing node', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'confirmed',
				},
			};

			focusedNodesStore.setState('node-1', 'unconfirmed');

			expect(focusedNodesStore.focusedNodesMap['node-1'].state).toBe('unconfirmed');
		});
	});

	describe('confirmAllUnconfirmed', () => {
		it('should confirm all unconfirmed nodes', () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'unconfirmed',
				},
				'node-2': {
					nodeId: 'node-2',
					nodeName: 'Code',
					nodeType: 'n8n-nodes-base.code',
					state: 'unconfirmed',
				},
			};

			focusedNodesStore.confirmAllUnconfirmed();

			expect(focusedNodesStore.focusedNodesMap['node-1'].state).toBe('confirmed');
			expect(focusedNodesStore.focusedNodesMap['node-2'].state).toBe('confirmed');
		});
	});

	describe('buildContextPayload', () => {
		it('should return empty when feature disabled', () => {
			featureEnabled = false;
			// Recreate the store to pick up the changed flag
			focusedNodesStore = useFocusedNodesStore();

			expect(focusedNodesStore.buildContextPayload()).toEqual([]);
		});

		it('should return empty when no confirmed nodes', () => {
			expect(focusedNodesStore.buildContextPayload()).toEqual([]);
		});

		it('should include connections (deduplicated)', () => {
			workflowsStore.connectionsByDestinationNode = {
				'HTTP Request': {
					main: [[{ node: 'Trigger', type: 'main', index: 0 }]],
				},
			};
			workflowsStore.connectionsBySourceNode = {
				'HTTP Request': {
					main: [[{ node: 'Code', type: 'main', index: 0 }]],
				},
			};

			focusedNodesStore.confirmNodes(['node-1'], 'context_menu');
			track.mockReset();

			const payload = focusedNodesStore.buildContextPayload();

			expect(payload).toHaveLength(1);
			expect(payload[0].name).toBe('HTTP Request');
			expect(payload[0].incomingConnections).toEqual(['Trigger']);
			expect(payload[0].outgoingConnections).toEqual(['Code']);
		});

		it('should include issues (param + credential)', () => {
			const nodeWithIssues = createMockNode('node-1', 'HTTP Request', 'n8n-nodes-base.httpRequest');
			(nodeWithIssues as INodeUi & { issues: unknown }).issues = {
				parameters: {
					url: ['URL is required'],
				},
				credentials: {
					httpBasicAuth: ['Credentials not set'],
				},
			};
			workflowsStore.allNodes = [nodeWithIssues];

			focusedNodesStore.confirmNodes(['node-1'], 'context_menu');
			track.mockReset();

			const payload = focusedNodesStore.buildContextPayload();

			expect(payload[0].issues).toEqual({
				url: ['URL is required'],
				'credential:httpBasicAuth': ['Credentials not set'],
			});
		});

		it('should handle missing node gracefully', () => {
			focusedNodesStore.focusedNodesMap = {
				'missing-node': {
					nodeId: 'missing-node',
					nodeName: 'Deleted Node',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'confirmed',
				},
			};

			const payload = focusedNodesStore.buildContextPayload();

			expect(payload).toHaveLength(1);
			expect(payload[0]).toEqual({
				name: 'Deleted Node',
				incomingConnections: [],
				outgoingConnections: [],
			});
		});
	});

	describe('watchers', () => {
		it('should clear map on workflowId change and track telemetry', async () => {
			focusedNodesStore.confirmNodes(['node-1'], 'context_menu');
			track.mockReset();

			workflowsStore.workflowId = 'wf-2';
			await nextTick();

			expect(focusedNodesStore.focusedNodesMap).toEqual({});
			expect(track).toHaveBeenCalledWith('ai.focusedNodes.removed', {
				method: 'workflow_changed',
				removed_count: 1,
				remaining_count: 0,
			});
		});

		it('should not track telemetry on workflowId change if no confirmed and oldId undefined', async () => {
			// The initial wf-1 is set in beforeEach but no confirmed nodes
			workflowsStore.workflowId = 'wf-2';
			await nextTick();

			expect(track).not.toHaveBeenCalled();
		});

		it('should remove deleted nodes from map and track telemetry', async () => {
			focusedNodesStore.confirmNodes(['node-1', 'node-2'], 'context_menu');
			track.mockReset();

			// Remove node-1 from workflow
			workflowsStore.allNodes = [
				createMockNode('node-2', 'Code', 'n8n-nodes-base.code'),
				createMockNode('node-3', 'Set', 'n8n-nodes-base.set'),
			];
			await nextTick();

			expect(focusedNodesStore.focusedNodesMap['node-1']).toBeUndefined();
			expect(focusedNodesStore.focusedNodesMap['node-2']).toBeDefined();
			expect(track).toHaveBeenCalledWith('ai.focusedNodes.removed', {
				method: 'node_deleted',
				removed_count: 1,
				remaining_count: 1,
			});
		});

		it('should not track telemetry for deleted unconfirmed nodes', async () => {
			focusedNodesStore.focusedNodesMap = {
				'node-1': {
					nodeId: 'node-1',
					nodeName: 'HTTP Request',
					nodeType: 'n8n-nodes-base.httpRequest',
					state: 'unconfirmed',
				},
			};

			workflowsStore.allNodes = [
				createMockNode('node-2', 'Code', 'n8n-nodes-base.code'),
				createMockNode('node-3', 'Set', 'n8n-nodes-base.set'),
			];
			await nextTick();

			expect(track).not.toHaveBeenCalled();
		});

		it('should sync node names when renamed in workflow', async () => {
			focusedNodesStore.confirmNodes(['node-1'], 'context_menu');
			track.mockReset();

			workflowsStore.allNodes = [
				createMockNode('node-1', 'My HTTP Request', 'n8n-nodes-base.httpRequest'),
				createMockNode('node-2', 'Code', 'n8n-nodes-base.code'),
				createMockNode('node-3', 'Set', 'n8n-nodes-base.set'),
			];
			await nextTick();

			expect(focusedNodesStore.focusedNodesMap['node-1'].nodeName).toBe('My HTTP Request');
		});

		it('should auto-add NDV activeNode as unconfirmed when feature + panel open', async () => {
			const chatPanelStateStore = useChatPanelStateStore();
			chatPanelStateStore.isOpen = true;

			const ndvStore = mockedStore(useNDVStore);
			ndvStore.activeNode = createMockNode(
				'node-2',
				'Code',
				'n8n-nodes-base.code',
			) as unknown as ReturnType<typeof mockedStore<typeof useNDVStore>>['activeNode'];
			await nextTick();

			expect(focusedNodesStore.focusedNodesMap['node-2']).toBeDefined();
			expect(focusedNodesStore.focusedNodesMap['node-2'].state).toBe('unconfirmed');
		});
	});
});

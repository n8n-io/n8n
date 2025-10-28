import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useRecentResources } from './useRecentResources';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { VIEWS, PLACEHOLDER_EMPTY_WORKFLOW_ID, NEW_WORKFLOW_ID } from '@/constants';

const recentWorkflowsRef = ref<Array<{ id: string; openedAt: number }>>([]);
const recentNodesRef = ref<Record<string, Array<{ nodeId: string; openedAt: number }>>>({});

vi.mock('@vueuse/core', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...(actual as object),
		useLocalStorage: vi.fn((key: string, defaultValue: unknown) => {
			if (key === 'n8n-recent-workflows') {
				return recentWorkflowsRef;
			}
			if (key === 'n8n-recent-nodes') {
				return recentNodesRef;
			}
			return ref(defaultValue);
		}),
	};
});

const mockSetNodeActive = vi.fn();

vi.mock('@/composables/useCanvasOperations', () => ({
	useCanvasOperations: () => ({
		setNodeActive: mockSetNodeActive,
	}),
}));

const mockRouterResolve = vi.fn((route) => ({ fullPath: `/workflow/${route.params.name}` }));
const mockCurrentRoute = ref({
	name: VIEWS.WORKFLOW,
	params: { name: 'workflow-1' },
});

vi.mock('vue-router', async (importOriginal) => {
	return {
		...(await importOriginal()),
		useRouter: () => ({
			resolve: mockRouterResolve,
			currentRoute: mockCurrentRoute,
		}),
	};
});

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

describe('useRecentResources', () => {
	let mockWorkflowsStore: ReturnType<typeof useWorkflowsStore>;
	let mockNodeTypesStore: ReturnType<typeof useNodeTypesStore>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());

		// Reset storage data
		recentWorkflowsRef.value = [];
		recentNodesRef.value = {};

		mockWorkflowsStore = useWorkflowsStore();
		mockNodeTypesStore = useNodeTypesStore();

		Object.defineProperty(mockWorkflowsStore, 'findNodeByPartialId', {
			value: vi.fn((nodeId: string) => {
				if (nodeId === 'node-1') {
					return { id: 'node-1', name: 'Test Node 1', type: 'n8n-nodes-base.httpRequest' };
				}
				if (nodeId === 'node-2') {
					return { id: 'node-2', name: 'Test Node 2', type: 'n8n-nodes-base.slack' };
				}
				return null;
			}),
		});

		Object.defineProperty(mockWorkflowsStore, 'getWorkflowById', {
			value: vi.fn((workflowId: string) => {
				if (workflowId === 'workflow-1') {
					return { id: 'workflow-1', name: 'Workflow 1' };
				}
				if (workflowId === 'workflow-2') {
					return { id: 'workflow-2', name: 'Workflow 2' };
				}
				if (workflowId === 'workflow-3') {
					return { id: 'workflow-3', name: 'Workflow 3' };
				}
				return null;
			}),
		});

		Object.defineProperty(mockWorkflowsStore, 'fetchWorkflow', {
			value: vi.fn(),
		});

		Object.defineProperty(mockNodeTypesStore, 'getNodeType', {
			value: vi.fn((type: string) => ({
				name: type,
				displayName: type.split('.').pop(),
			})),
		});

		Object.defineProperty(window, 'location', {
			value: { href: '' },
		});

		vi.clearAllMocks();
	});

	describe('node tracking via trackResourceOpened', () => {
		it('should add node to the top of recent list for workflow', () => {
			const { trackResourceOpened } = useRecentResources();

			const route = {
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-1', nodeId: 'node-1' },
			} as unknown as Parameters<typeof trackResourceOpened>[0];

			trackResourceOpened(route);

			expect(recentNodesRef.value['workflow-1']).toHaveLength(1);
			expect(recentNodesRef.value['workflow-1'][0].nodeId).toBe('node-1');
			expect(recentNodesRef.value['workflow-1'][0].openedAt).toBeTypeOf('number');
		});

		it('should move existing node to the top when reopened', () => {
			const { trackResourceOpened } = useRecentResources();

			const route1 = {
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-1', nodeId: 'node-1' },
			} as unknown as Parameters<typeof trackResourceOpened>[0];

			const route2 = {
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-1', nodeId: 'node-2' },
			} as unknown as Parameters<typeof trackResourceOpened>[0];

			trackResourceOpened(route1);
			trackResourceOpened(route2);
			trackResourceOpened(route1);

			expect(recentNodesRef.value['workflow-1']).toHaveLength(2);
			expect(recentNodesRef.value['workflow-1'][0].nodeId).toBe('node-1');
			expect(recentNodesRef.value['workflow-1'][1].nodeId).toBe('node-2');
		});

		it('should limit recent nodes per workflow to MAX_RECENT_ITEMS (5)', () => {
			const { trackResourceOpened } = useRecentResources();

			for (let i = 1; i <= 7; i++) {
				const route = {
					name: VIEWS.WORKFLOW,
					params: { name: 'workflow-1', nodeId: `node-${i}` },
				} as unknown as Parameters<typeof trackResourceOpened>[0];

				trackResourceOpened(route);
			}

			expect(recentNodesRef.value['workflow-1']).toHaveLength(5);
			expect(recentNodesRef.value['workflow-1'][0].nodeId).toBe('node-7');
			expect(recentNodesRef.value['workflow-1'][4].nodeId).toBe('node-3');
		});

		it('should maintain separate lists for different workflows', () => {
			const { trackResourceOpened } = useRecentResources();

			const route1 = {
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-1', nodeId: 'node-1' },
			} as unknown as Parameters<typeof trackResourceOpened>[0];

			const route2 = {
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-2', nodeId: 'node-2' },
			} as unknown as Parameters<typeof trackResourceOpened>[0];

			trackResourceOpened(route1);
			trackResourceOpened(route2);

			expect(recentNodesRef.value['workflow-1']).toHaveLength(1);
			expect(recentNodesRef.value['workflow-1'][0].nodeId).toBe('node-1');
			expect(recentNodesRef.value['workflow-2']).toHaveLength(1);
			expect(recentNodesRef.value['workflow-2'][0].nodeId).toBe('node-2');
		});
	});

	describe('trackResourceOpened', () => {
		it('should register workflow when navigating to workflow view', () => {
			const { trackResourceOpened } = useRecentResources();

			const route = {
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-1' },
			} as unknown as Parameters<typeof trackResourceOpened>[0];

			trackResourceOpened(route);

			expect(recentWorkflowsRef.value).toHaveLength(1);
			expect(recentWorkflowsRef.value[0].id).toBe('workflow-1');
		});

		it('should register both workflow and node when nodeId is present', () => {
			const { trackResourceOpened } = useRecentResources();

			const route = {
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-1', nodeId: 'node-1' },
			} as unknown as Parameters<typeof trackResourceOpened>[0];

			trackResourceOpened(route);

			expect(recentWorkflowsRef.value).toHaveLength(1);
			expect(recentWorkflowsRef.value[0].id).toBe('workflow-1');
			expect(recentNodesRef.value['workflow-1']).toHaveLength(1);
			expect(recentNodesRef.value['workflow-1'][0].nodeId).toBe('node-1');
		});

		it('should not register workflow when id is "new"', () => {
			const { trackResourceOpened } = useRecentResources();

			const route = {
				name: VIEWS.WORKFLOW,
				params: { name: 'new' },
			} as unknown as Parameters<typeof trackResourceOpened>[0];

			trackResourceOpened(route);

			expect(recentWorkflowsRef.value).toHaveLength(0);
		});

		it('should not register workflow when id is PLACEHOLDER_EMPTY_WORKFLOW_ID', () => {
			const { trackResourceOpened } = useRecentResources();

			const route = {
				name: VIEWS.WORKFLOW,
				params: { name: PLACEHOLDER_EMPTY_WORKFLOW_ID },
			} as unknown as Parameters<typeof trackResourceOpened>[0];

			trackResourceOpened(route);

			expect(recentWorkflowsRef.value).toHaveLength(0);
		});

		it('should not register workflow when id is NEW_WORKFLOW_ID', () => {
			const { trackResourceOpened } = useRecentResources();

			const route = {
				name: VIEWS.WORKFLOW,
				params: { name: NEW_WORKFLOW_ID },
			} as unknown as Parameters<typeof trackResourceOpened>[0];

			trackResourceOpened(route);

			expect(recentWorkflowsRef.value).toHaveLength(0);
		});

		it('should not register anything when route is not a workflow view', () => {
			const { trackResourceOpened } = useRecentResources();

			const route = {
				name: 'OTHER_VIEW',
				params: { name: 'workflow-1' },
			} as unknown as Parameters<typeof trackResourceOpened>[0];

			trackResourceOpened(route);

			expect(recentWorkflowsRef.value).toHaveLength(0);
		});
	});

	describe('recentResourceCommands', () => {
		beforeEach(() => {
			mockCurrentRoute.value = {
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-1' },
			};
		});

		it('should return command items for recent nodes in current workflow', () => {
			const { trackResourceOpened, commands } = useRecentResources();

			const route1 = {
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-1', nodeId: 'node-1' },
			} as unknown as Parameters<typeof trackResourceOpened>[0];

			const route2 = {
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-1', nodeId: 'node-2' },
			} as unknown as Parameters<typeof trackResourceOpened>[0];

			trackResourceOpened(route1);
			trackResourceOpened(route2);

			const items = commands.value;
			const nodeItems = items.filter((item) => item.id.startsWith('recent-node'));

			expect(nodeItems).toHaveLength(2);
			// node-2 is most recent since it was tracked last
			expect(nodeItems[0].id).toBe('recent-node-workflow-1-node-2');
			expect(nodeItems[0].title).toBe('Test Node 2');
			expect(nodeItems[1].id).toBe('recent-node-workflow-1-node-1');
			expect(nodeItems[0].section).toBe('commandBar.sections.recent');
		});

		it('should filter out nodes that no longer exist', () => {
			const { trackResourceOpened, commands } = useRecentResources();

			const route1 = {
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-1', nodeId: 'node-1' },
			} as unknown as Parameters<typeof trackResourceOpened>[0];

			const route2 = {
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-1', nodeId: 'nonexistent-node' },
			} as unknown as Parameters<typeof trackResourceOpened>[0];

			trackResourceOpened(route1);
			trackResourceOpened(route2);

			const items = commands.value;
			const nodeItems = items.filter((item) => item.id.startsWith('recent-node'));

			expect(nodeItems).toHaveLength(1);
			expect(nodeItems[0].id).toBe('recent-node-workflow-1-node-1');
		});

		it('should call setNodeActive when node item handler is executed', () => {
			const { trackResourceOpened, commands } = useRecentResources();

			const route = {
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-1', nodeId: 'node-1' },
			} as unknown as Parameters<typeof trackResourceOpened>[0];

			trackResourceOpened(route);

			const items = commands.value;
			const nodeItem = items.find((item) => item.id === 'recent-node-workflow-1-node-1');

			expect(nodeItem).toBeDefined();
			void nodeItem?.handler?.();

			expect(mockSetNodeActive).toHaveBeenCalledWith('node-1', 'command_bar');
		});

		it('should return command items for recent workflows', () => {
			const { trackResourceOpened, commands } = useRecentResources();

			// Track workflows by navigating to them
			trackResourceOpened({
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-1' },
			} as unknown as Parameters<typeof trackResourceOpened>[0]);

			trackResourceOpened({
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-2' },
			} as unknown as Parameters<typeof trackResourceOpened>[0]);

			const items = commands.value;
			const workflowItems = items.filter((item) => item.id.startsWith('recent-workflow'));

			expect(workflowItems).toHaveLength(2);
			expect(workflowItems[0].id).toBe('recent-workflow-workflow-2');
			expect(workflowItems[0].title).toBe('Workflow 2');
			expect(workflowItems[1].id).toBe('recent-workflow-workflow-1');
			expect(workflowItems[1].title).toBe('Workflow 1');
		});

		it('should limit workflow items to MAX_RECENT_WORKFLOWS_TO_DISPLAY (3)', () => {
			const { trackResourceOpened, commands } = useRecentResources();

			// Track 5 workflows
			for (let i = 1; i <= 5; i++) {
				trackResourceOpened({
					name: VIEWS.WORKFLOW,
					params: { name: `workflow-${i}` },
				} as unknown as Parameters<typeof trackResourceOpened>[0]);
			}

			const items = commands.value;
			const workflowItems = items.filter((item) => item.id.startsWith('recent-workflow'));

			// workflow-4 and workflow-5 don't exist in store, so only 3 will be shown
			expect(workflowItems.length).toBeLessThanOrEqual(3);
		});

		it('should filter out workflows that no longer exist in store', () => {
			const { trackResourceOpened, commands } = useRecentResources();

			trackResourceOpened({
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-1' },
			} as unknown as Parameters<typeof trackResourceOpened>[0]);

			trackResourceOpened({
				name: VIEWS.WORKFLOW,
				params: { name: 'nonexistent-workflow' },
			} as unknown as Parameters<typeof trackResourceOpened>[0]);

			const items = commands.value;
			const workflowItems = items.filter((item) => item.id.startsWith('recent-workflow'));

			expect(workflowItems).toHaveLength(1);
			expect(workflowItems[0].id).toBe('recent-workflow-workflow-1');
		});

		it('should use unnamed workflow text when workflow has no name', () => {
			mockWorkflowsStore.getWorkflowById = vi.fn((workflowId: string) => {
				if (workflowId === 'workflow-unnamed') {
					return { id: 'workflow-unnamed', name: '' } as unknown as ReturnType<
						typeof mockWorkflowsStore.getWorkflowById
					>;
				}
				return null as unknown as ReturnType<typeof mockWorkflowsStore.getWorkflowById>;
			}) as typeof mockWorkflowsStore.getWorkflowById;

			const { trackResourceOpened, commands } = useRecentResources();

			trackResourceOpened({
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-unnamed' },
			} as unknown as Parameters<typeof trackResourceOpened>[0]);

			const items = commands.value;
			const workflowItem = items.find((item) => item.id === 'recent-workflow-workflow-unnamed');

			expect(workflowItem?.title).toBe('commandBar.workflows.unnamed');
		});

		it('should navigate using window.location.href when workflow item handler is executed', () => {
			const { trackResourceOpened, commands } = useRecentResources();

			trackResourceOpened({
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-1' },
			} as unknown as Parameters<typeof trackResourceOpened>[0]);

			const items = commands.value;
			const workflowItem = items.find((item) => item.id === 'recent-workflow-workflow-1');

			expect(workflowItem).toBeDefined();
			void workflowItem?.handler?.();

			expect(mockRouterResolve).toHaveBeenCalledWith({
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-1' },
			});
			expect(window.location.href).toBe('/workflow/workflow-1');
		});

		it('should not show recent nodes when not in workflow view', () => {
			const { trackResourceOpened, commands } = useRecentResources();

			const route = {
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-1', nodeId: 'node-1' },
			} as unknown as Parameters<typeof trackResourceOpened>[0];

			trackResourceOpened(route);

			mockCurrentRoute.value = {
				name: 'OTHER_VIEW' as unknown as VIEWS,
				params: { name: '' },
			};

			const items = commands.value;
			const nodeItems = items.filter((item) => item.id.startsWith('recent-node'));

			expect(nodeItems).toHaveLength(0);
		});

		it('should not show recent nodes when current workflow has no recent nodes', () => {
			const { trackResourceOpened, commands } = useRecentResources();

			const route = {
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-1', nodeId: 'node-1' },
			} as unknown as Parameters<typeof trackResourceOpened>[0];

			trackResourceOpened(route);

			mockCurrentRoute.value = {
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-2' },
			};

			const items = commands.value;
			const nodeItems = items.filter((item) => item.id.startsWith('recent-node'));

			expect(nodeItems).toHaveLength(0);
		});
	});

	describe('initialize', () => {
		it('should fetch workflows that are not in store', async () => {
			const { trackResourceOpened, initialize } = useRecentResources();

			// Mock getWorkflowById to return null for workflow-4
			mockWorkflowsStore.getWorkflowById = vi.fn((workflowId: string) => {
				if (workflowId === 'workflow-1' || workflowId === 'workflow-2') {
					return {
						id: workflowId,
						name: `Workflow ${workflowId.split('-')[1]}`,
					} as unknown as ReturnType<typeof mockWorkflowsStore.getWorkflowById>;
				}
				return null as unknown as ReturnType<typeof mockWorkflowsStore.getWorkflowById>;
			}) as typeof mockWorkflowsStore.getWorkflowById;

			// Track workflows via trackResourceOpened
			trackResourceOpened({
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-1' },
			} as unknown as Parameters<typeof trackResourceOpened>[0]);

			trackResourceOpened({
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-2' },
			} as unknown as Parameters<typeof trackResourceOpened>[0]);

			trackResourceOpened({
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-4' },
			} as unknown as Parameters<typeof trackResourceOpened>[0]);

			await initialize();

			// Should only fetch workflow-4 since workflow-1 and workflow-2 are in store
			expect(mockWorkflowsStore.fetchWorkflow).toHaveBeenCalledWith('workflow-4');
			expect(mockWorkflowsStore.fetchWorkflow).toHaveBeenCalledTimes(1);
		});

		it('should only fetch up to MAX_RECENT_WORKFLOWS_TO_DISPLAY (3) workflows', async () => {
			const { trackResourceOpened, initialize } = useRecentResources();

			mockWorkflowsStore.getWorkflowById = vi.fn(
				() => null as unknown as ReturnType<typeof mockWorkflowsStore.getWorkflowById>,
			) as typeof mockWorkflowsStore.getWorkflowById;

			// Track 5 workflows
			for (let i = 1; i <= 5; i++) {
				trackResourceOpened({
					name: VIEWS.WORKFLOW,
					params: { name: `workflow-${i}` },
				} as unknown as Parameters<typeof trackResourceOpened>[0]);
			}

			await initialize();

			// Should only try to fetch the first 3
			expect(mockWorkflowsStore.fetchWorkflow).toHaveBeenCalledTimes(3);
			expect(mockWorkflowsStore.fetchWorkflow).toHaveBeenCalledWith('workflow-5');
			expect(mockWorkflowsStore.fetchWorkflow).toHaveBeenCalledWith('workflow-4');
			expect(mockWorkflowsStore.fetchWorkflow).toHaveBeenCalledWith('workflow-3');
		});

		it('should handle fetch errors gracefully', async () => {
			const { trackResourceOpened, initialize } = useRecentResources();

			mockWorkflowsStore.getWorkflowById = vi.fn(
				() => null as unknown as ReturnType<typeof mockWorkflowsStore.getWorkflowById>,
			) as typeof mockWorkflowsStore.getWorkflowById;
			mockWorkflowsStore.fetchWorkflow = vi.fn().mockRejectedValue(new Error('Fetch failed'));

			trackResourceOpened({
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-1' },
			} as unknown as Parameters<typeof trackResourceOpened>[0]);

			// Should not throw
			await expect(initialize()).resolves.not.toThrow();
		});

		it('should not fetch workflows that are already in store', async () => {
			const { trackResourceOpened, initialize } = useRecentResources();

			trackResourceOpened({
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-1' },
			} as unknown as Parameters<typeof trackResourceOpened>[0]);

			trackResourceOpened({
				name: VIEWS.WORKFLOW,
				params: { name: 'workflow-2' },
			} as unknown as Parameters<typeof trackResourceOpened>[0]);

			await initialize();

			expect(mockWorkflowsStore.fetchWorkflow).not.toHaveBeenCalled();
		});
	});
});

import { describe, it, expect, vi } from 'vitest';
import { ref, computed } from 'vue';
import type { IWorkflowDb, INodeUi } from '@/Interface';
import { NodeDiffStatus } from 'n8n-workflow';

// Mock stores
vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: vi.fn().mockReturnValue({ name: 'Test Node', version: 1 }),
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

// Import after mocks
import { useWorkflowDiffUI } from './useWorkflowDiffUI';

describe('useWorkflowDiffUI', () => {
	function createMockWorkflow(overrides: Partial<IWorkflowDb> = {}): IWorkflowDb {
		return {
			id: 'test-workflow',
			name: 'Test Workflow',
			nodes: [],
			connections: {},
			active: false,
			isArchived: false,
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
			versionId: '1',
			activeVersionId: null,
			homeProject: {
				id: 'project-1',
				name: 'Project',
				type: 'personal' as const,
				icon: null,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
			},
			...overrides,
		};
	}

	function createMockNode(overrides: Partial<INodeUi> = {}): INodeUi {
		return {
			id: 'node-1',
			name: 'Test Node',
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			...overrides,
		};
	}

	describe('settingsDiff', () => {
		it('should return empty array when both workflows have identical settings', () => {
			const sourceWorkflow = computed(() =>
				createMockWorkflow({ settings: { executionOrder: 'v1' } }),
			);
			const targetWorkflow = computed(() =>
				createMockWorkflow({ settings: { executionOrder: 'v1' } }),
			);

			const { settingsDiff } = useWorkflowDiffUI({
				sourceWorkflow,
				targetWorkflow,
				nodesDiff: ref(new Map()),
				connectionsDiff: ref(new Map()),
				selectedDetailId: ref(undefined),
			});

			expect(settingsDiff.value).toEqual([]);
		});

		it('should detect settings differences between workflows', () => {
			const sourceWorkflow = computed(() =>
				createMockWorkflow({ settings: { executionOrder: 'v0' } }),
			);
			const targetWorkflow = computed(() =>
				createMockWorkflow({ settings: { executionOrder: 'v1' } }),
			);

			const { settingsDiff } = useWorkflowDiffUI({
				sourceWorkflow,
				targetWorkflow,
				nodesDiff: ref(new Map()),
				connectionsDiff: ref(new Map()),
				selectedDetailId: ref(undefined),
			});

			expect(settingsDiff.value).toContainEqual({
				name: 'executionOrder',
				before: 'v0',
				after: 'v1',
			});
		});

		it('should detect workflow name changes', () => {
			const sourceWorkflow = computed(() => createMockWorkflow({ name: 'Old Name' }));
			const targetWorkflow = computed(() => createMockWorkflow({ name: 'New Name' }));

			const { settingsDiff } = useWorkflowDiffUI({
				sourceWorkflow,
				targetWorkflow,
				nodesDiff: ref(new Map()),
				connectionsDiff: ref(new Map()),
				selectedDetailId: ref(undefined),
			});

			expect(settingsDiff.value[0]).toEqual({
				name: 'name',
				before: 'Old Name',
				after: 'New Name',
			});
		});

		it('should detect tag changes', () => {
			const sourceWorkflow = computed(() =>
				createMockWorkflow({ tags: [{ id: '1', name: 'tag1', createdAt: '', updatedAt: '' }] }),
			);
			const targetWorkflow = computed(() =>
				createMockWorkflow({ tags: [{ id: '2', name: 'tag2', createdAt: '', updatedAt: '' }] }),
			);

			const { settingsDiff } = useWorkflowDiffUI({
				sourceWorkflow,
				targetWorkflow,
				nodesDiff: ref(new Map()),
				connectionsDiff: ref(new Map()),
				selectedDetailId: ref(undefined),
			});

			const tagsDiff = settingsDiff.value.find((s) => s.name === 'tags');
			expect(tagsDiff).toBeDefined();
			expect(tagsDiff?.before).toContain('tag1');
			expect(tagsDiff?.after).toContain('tag2');
		});
	});

	describe('nodeChanges', () => {
		it('should filter out unchanged nodes', () => {
			const nodesDiff = ref(
				new Map([
					['node-1', { status: NodeDiffStatus.Eq, node: createMockNode({ id: 'node-1' }) }],
					['node-2', { status: NodeDiffStatus.Added, node: createMockNode({ id: 'node-2' }) }],
				]),
			);

			const { nodeChanges } = useWorkflowDiffUI({
				sourceWorkflow: computed(() => createMockWorkflow()),
				targetWorkflow: computed(() => createMockWorkflow()),
				nodesDiff,
				connectionsDiff: ref(new Map()),
				selectedDetailId: ref(undefined),
			});

			expect(nodeChanges.value).toHaveLength(1);
			expect(nodeChanges.value[0].node.id).toBe('node-2');
		});

		it('should include node type information', () => {
			const nodesDiff = ref(
				new Map([
					['node-1', { status: NodeDiffStatus.Modified, node: createMockNode({ id: 'node-1' }) }],
				]),
			);

			const { nodeChanges } = useWorkflowDiffUI({
				sourceWorkflow: computed(() => createMockWorkflow()),
				targetWorkflow: computed(() => createMockWorkflow()),
				nodesDiff,
				connectionsDiff: ref(new Map()),
				selectedDetailId: ref(undefined),
			});

			expect(nodeChanges.value[0].type).toBeDefined();
		});
	});

	describe('navigation', () => {
		it('should navigate to next node change', async () => {
			const selectedDetailId = ref<string | undefined>('node-1');
			const nodesDiff = ref(
				new Map([
					['node-1', { status: NodeDiffStatus.Modified, node: createMockNode({ id: 'node-1' }) }],
					['node-2', { status: NodeDiffStatus.Added, node: createMockNode({ id: 'node-2' }) }],
					['node-3', { status: NodeDiffStatus.Deleted, node: createMockNode({ id: 'node-3' }) }],
				]),
			);

			const { nextNodeChange } = useWorkflowDiffUI({
				sourceWorkflow: computed(() => createMockWorkflow()),
				targetWorkflow: computed(() => createMockWorkflow()),
				nodesDiff,
				connectionsDiff: ref(new Map()),
				selectedDetailId,
			});

			nextNodeChange();
			expect(selectedDetailId.value).toBe('node-2');

			nextNodeChange();
			expect(selectedDetailId.value).toBe('node-3');

			// Should wrap around
			nextNodeChange();
			expect(selectedDetailId.value).toBe('node-1');
		});

		it('should navigate to previous node change', () => {
			const selectedDetailId = ref<string | undefined>('node-2');
			const nodesDiff = ref(
				new Map([
					['node-1', { status: NodeDiffStatus.Modified, node: createMockNode({ id: 'node-1' }) }],
					['node-2', { status: NodeDiffStatus.Added, node: createMockNode({ id: 'node-2' }) }],
				]),
			);

			const { previousNodeChange } = useWorkflowDiffUI({
				sourceWorkflow: computed(() => createMockWorkflow()),
				targetWorkflow: computed(() => createMockWorkflow()),
				nodesDiff,
				connectionsDiff: ref(new Map()),
				selectedDetailId,
			});

			previousNodeChange();
			expect(selectedDetailId.value).toBe('node-1');
		});

		it('should call onNavigate callback when navigating', () => {
			const onNavigate = vi.fn();
			const selectedDetailId = ref<string | undefined>('node-1');
			const nodesDiff = ref(
				new Map([
					['node-1', { status: NodeDiffStatus.Modified, node: createMockNode({ id: 'node-1' }) }],
					['node-2', { status: NodeDiffStatus.Added, node: createMockNode({ id: 'node-2' }) }],
				]),
			);

			const { nextNodeChange, previousNodeChange } = useWorkflowDiffUI({
				sourceWorkflow: computed(() => createMockWorkflow()),
				targetWorkflow: computed(() => createMockWorkflow()),
				nodesDiff,
				connectionsDiff: ref(new Map()),
				selectedDetailId,
				onNavigate,
			});

			nextNodeChange();
			expect(onNavigate).toHaveBeenCalledWith('next');

			previousNodeChange();
			expect(onNavigate).toHaveBeenCalledWith('previous');
		});
	});

	describe('tabs', () => {
		it('should return tabs with correct counts', () => {
			const nodesDiff = ref(
				new Map([
					['node-1', { status: NodeDiffStatus.Modified, node: createMockNode({ id: 'node-1' }) }],
					['node-2', { status: NodeDiffStatus.Eq, node: createMockNode({ id: 'node-2' }) }],
				]),
			);
			const connectionsDiff = ref(
				new Map([
					['conn-1', { status: NodeDiffStatus.Added, connection: {} }],
					['conn-2', { status: NodeDiffStatus.Deleted, connection: {} }],
				]),
			);

			const { tabs } = useWorkflowDiffUI({
				sourceWorkflow: computed(() =>
					createMockWorkflow({ name: 'Old', settings: { executionOrder: 'v0' } }),
				),
				targetWorkflow: computed(() =>
					createMockWorkflow({ name: 'New', settings: { executionOrder: 'v1' } }),
				),
				nodesDiff,
				connectionsDiff,
				selectedDetailId: ref(undefined),
			});

			expect(tabs.value[0].data.count).toBe(1); // 1 changed node (node-2 is equal)
			expect(tabs.value[1].data.count).toBe(2); // 2 connection changes
			expect(tabs.value[2].data.count).toBe(2); // name + executionOrder settings
		});
	});

	describe('selectedNode', () => {
		it('should return undefined when no node is selected', () => {
			const { selectedNode } = useWorkflowDiffUI({
				sourceWorkflow: computed(() => createMockWorkflow()),
				targetWorkflow: computed(() => createMockWorkflow()),
				nodesDiff: ref(new Map()),
				connectionsDiff: ref(new Map()),
				selectedDetailId: ref(undefined),
			});

			expect(selectedNode.value).toBeUndefined();
		});

		it('should return selected node when one is selected', () => {
			const mockNode = createMockNode({ id: 'node-1', name: 'Selected Node' });
			const nodesDiff = ref(
				new Map([['node-1', { status: NodeDiffStatus.Modified, node: mockNode }]]),
			);

			const { selectedNode } = useWorkflowDiffUI({
				sourceWorkflow: computed(() => createMockWorkflow()),
				targetWorkflow: computed(() => createMockWorkflow()),
				nodesDiff,
				connectionsDiff: ref(new Map()),
				selectedDetailId: ref('node-1'),
			});

			expect(selectedNode.value).toEqual(mockNode);
		});
	});

	describe('changesCount', () => {
		it('should return total count of all changes', () => {
			const nodesDiff = ref(
				new Map([
					['node-1', { status: NodeDiffStatus.Modified, node: createMockNode({ id: 'node-1' }) }],
				]),
			);
			const connectionsDiff = ref(
				new Map([['conn-1', { status: NodeDiffStatus.Added, connection: {} }]]),
			);

			const { changesCount } = useWorkflowDiffUI({
				sourceWorkflow: computed(() => createMockWorkflow({ name: 'Old' })),
				targetWorkflow: computed(() => createMockWorkflow({ name: 'New' })),
				nodesDiff,
				connectionsDiff,
				selectedDetailId: ref(undefined),
			});

			// 1 node change + 1 connection change + 1 name change
			expect(changesCount.value).toBe(3);
		});
	});

	describe('isSourceWorkflowNew', () => {
		it('should return true when source is undefined but target exists', () => {
			const { isSourceWorkflowNew } = useWorkflowDiffUI({
				sourceWorkflow: computed(() => undefined),
				targetWorkflow: computed(() => createMockWorkflow()),
				nodesDiff: ref(new Map()),
				connectionsDiff: ref(new Map()),
				selectedDetailId: ref(undefined),
			});

			expect(isSourceWorkflowNew.value).toBe(true);
		});

		it('should return false when both workflows exist', () => {
			const { isSourceWorkflowNew } = useWorkflowDiffUI({
				sourceWorkflow: computed(() => createMockWorkflow()),
				targetWorkflow: computed(() => createMockWorkflow()),
				nodesDiff: ref(new Map()),
				connectionsDiff: ref(new Map()),
				selectedDetailId: ref(undefined),
			});

			expect(isSourceWorkflowNew.value).toBe(false);
		});
	});
});

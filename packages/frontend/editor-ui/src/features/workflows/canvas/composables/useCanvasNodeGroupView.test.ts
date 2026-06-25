import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkflowDocumentNodeGroups } from '@/app/stores/workflowDocument/useWorkflowDocumentNodeGroups';
import { LOCAL_STORAGE_CANVAS_GROUP_EXPANDED } from '@/app/constants/localStorage';
import { useCanvasNodeGroupView } from './useCanvasNodeGroupView';
import type { NodeGroupLayoutComponent } from './useCanvasNodeGroupLayout';
import type { GroupExpansionMode } from '../canvas.types';

function setup(
	initialGroups: Array<{ id: string; name: string; nodeIds: string[] }> = [],
	{
		workflowId = 'wf-test',
		isGroupingEnabled = () => true,
		getGroupExpansionMode,
	}: {
		workflowId?: string;
		isGroupingEnabled?: () => boolean;
		getGroupExpansionMode?: () => GroupExpansionMode | undefined;
	} = {},
) {
	const nodeGroups = useWorkflowDocumentNodeGroups();
	if (initialGroups.length > 0) {
		nodeGroups.setNodeGroups(initialGroups);
	}
	const view = useCanvasNodeGroupView({
		workflowId: () => workflowId,
		getCurrentGroupIds: () => nodeGroups.allGroups.value.map((group) => group.id),
		onNodeGroupsChange: nodeGroups.onNodeGroupsChange,
		isGroupingEnabled,
		getGroupExpansionMode,
	});
	return { nodeGroups, view };
}

function readStored(workflowId = 'wf-test'): string[] | undefined {
	const raw = localStorage.getItem(LOCAL_STORAGE_CANVAS_GROUP_EXPANDED);
	return raw ? (JSON.parse(raw) as Record<string, string[]>)[workflowId] : undefined;
}

describe('useCanvasNodeGroupView', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	describe('default state on workflow load', () => {
		it('marks every group from setNodeGroups as collapsed when nothing is persisted', () => {
			const { nodeGroups, view } = setup();

			nodeGroups.setNodeGroups([
				{ id: 'g1', name: 'A', nodeIds: ['a'] },
				{ id: 'g2', name: 'B', nodeIds: ['b'] },
			]);

			expect(view.isGroupCollapsed('g1')).toBe(true);
			expect(view.isGroupCollapsed('g2')).toBe(true);
		});

		it('prunes stored expand state for groups absent from the SET payload', () => {
			const { nodeGroups, view } = setup([{ id: 'gOld', name: 'Old', nodeIds: ['a'] }]);
			view.toggleCollapsed('gOld');
			expect(view.isGroupCollapsed('gOld')).toBe(false);

			nodeGroups.setNodeGroups([{ id: 'gNew', name: 'New', nodeIds: ['b'] }]);

			expect(view.isGroupCollapsed('gOld')).toBe(true);
			expect(view.isGroupCollapsed('gNew')).toBe(true);
		});
	});

	describe('restore from localStorage', () => {
		it('restores the persisted expanded ids when groups are loaded', () => {
			localStorage.setItem(
				LOCAL_STORAGE_CANVAS_GROUP_EXPANDED,
				JSON.stringify({ 'wf-test': ['g1'] }),
			);

			const { view } = setup([
				{ id: 'g1', name: 'A', nodeIds: ['a'] },
				{ id: 'g2', name: 'B', nodeIds: ['b'] },
			]);

			expect(view.isGroupCollapsed('g1')).toBe(false);
			expect(view.isGroupCollapsed('g2')).toBe(true);
		});

		it('does not clobber persisted state when restoring before groups are loaded', () => {
			localStorage.setItem(
				LOCAL_STORAGE_CANVAS_GROUP_EXPANDED,
				JSON.stringify({ 'wf-test': ['g1'] }),
			);

			// Canvas mounts before the document hydrates its groups: the initial
			// restore sees no groups and must leave the saved state untouched.
			const { nodeGroups, view } = setup();
			expect(readStored()).toEqual(['g1']);

			nodeGroups.setNodeGroups([{ id: 'g1', name: 'A', nodeIds: ['a'] }]);
			expect(view.isGroupCollapsed('g1')).toBe(false);
		});

		it('drops persisted ids whose groups are no longer present', () => {
			localStorage.setItem(
				LOCAL_STORAGE_CANVAS_GROUP_EXPANDED,
				JSON.stringify({ 'wf-test': ['gGone', 'g1'] }),
			);

			setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }]);

			expect(readStored()).toEqual(['g1']);
		});
	});

	describe('persistence', () => {
		it('persists the expanded id to localStorage on expand', () => {
			const { view } = setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }]);

			view.toggleCollapsed('g1');

			expect(readStored()).toEqual(['g1']);
		});

		it('removes the id from localStorage on collapse', () => {
			const { view } = setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }]);
			view.toggleCollapsed('g1');
			expect(readStored()).toEqual(['g1']);

			view.toggleCollapsed('g1');

			expect(readStored()).toEqual([]);
		});

		it('scopes persisted state per workflow id', () => {
			const a = setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }], { workflowId: 'wf-a' });
			a.view.toggleCollapsed('g1');

			const b = setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }], { workflowId: 'wf-b' });

			expect(b.view.isGroupCollapsed('g1')).toBe(true);
			expect(readStored('wf-a')).toEqual(['g1']);
			expect(readStored('wf-b')).toEqual([]);
		});
	});

	describe.each(['all', 'errored'] as const)('host-managed expansion (%s)', (mode) => {
		it('seeds every group collapsed, ignoring persisted state', () => {
			localStorage.setItem(
				LOCAL_STORAGE_CANVAS_GROUP_EXPANDED,
				JSON.stringify({ 'wf-test': ['g1'] }),
			);

			const { view } = setup(
				[
					{ id: 'g1', name: 'A', nodeIds: ['a'] },
					{ id: 'g2', name: 'B', nodeIds: ['b'] },
				],
				{ getGroupExpansionMode: () => mode },
			);

			expect(view.isGroupCollapsed('g1')).toBe(true);
			expect(view.isGroupCollapsed('g2')).toBe(true);
		});

		it('lets the canvas expand a group via setGroupExpanded', () => {
			const { view } = setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }], {
				getGroupExpansionMode: () => mode,
			});

			view.setGroupExpanded('g1', true);
			expect(view.isGroupCollapsed('g1')).toBe(false);
		});

		it('never writes persisted view state', () => {
			const { view } = setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }], {
				getGroupExpansionMode: () => mode,
			});

			view.setGroupExpanded('g1', true);

			expect(readStored()).toBeUndefined();
		});
	});

	describe('reinitialize (document swap under a persistent canvas)', () => {
		it('rebinds to the swapped document and re-seeds its groups', () => {
			const versionA = useWorkflowDocumentNodeGroups();
			versionA.setNodeGroups([{ id: 'a1', name: 'A', nodeIds: ['n1'] }]);
			const versionB = useWorkflowDocumentNodeGroups();
			versionB.setNodeGroups([{ id: 'b1', name: 'B', nodeIds: ['n2'] }]);

			let active = versionA;
			const view = useCanvasNodeGroupView({
				workflowId: () => 'wf',
				getCurrentGroupIds: () => active.allGroups.value.map((group) => group.id),
				onNodeGroupsChange: (handler) => active.onNodeGroupsChange(handler),
				isGroupingEnabled: () => true,
				getGroupExpansionMode: () => 'all',
			});

			view.setGroupExpanded('a1', true);
			expect(view.isGroupCollapsed('a1')).toBe(false);

			// Swap the document and reinitialize: the expanded set is re-seeded for
			// version B's groups, dropping version A's stale expansion.
			active = versionB;
			view.reinitialize();
			expect(view.isGroupCollapsed('a1')).toBe(true);
			expect(view.isGroupCollapsed('b1')).toBe(true);
		});

		it('hears change events from the swapped document after rebinding', () => {
			// b1 is persisted expanded, so hearing version B's SET event restores it.
			localStorage.setItem(LOCAL_STORAGE_CANVAS_GROUP_EXPANDED, JSON.stringify({ wf: ['b1'] }));
			const versionA = useWorkflowDocumentNodeGroups();
			const versionB = useWorkflowDocumentNodeGroups();

			let active = versionA;
			const view = useCanvasNodeGroupView({
				workflowId: () => 'wf',
				getCurrentGroupIds: () => active.allGroups.value.map((group) => group.id),
				onNodeGroupsChange: (handler) => active.onNodeGroupsChange(handler),
				isGroupingEnabled: () => true,
			});

			active = versionB;
			view.reinitialize();

			versionB.setNodeGroups([{ id: 'b1', name: 'B', nodeIds: ['n2'] }]);
			expect(view.isGroupCollapsed('b1')).toBe(false);
		});
	});

	describe('expansion order', () => {
		it('appends the most recently expanded group to the end', () => {
			const { view } = setup([
				{ id: 'g1', name: 'A', nodeIds: ['a'] },
				{ id: 'g2', name: 'B', nodeIds: ['b'] },
			]);

			view.toggleCollapsed('g1');
			view.toggleCollapsed('g2');

			expect(readStored()).toEqual(['g1', 'g2']);
		});

		it('moves a re-expanded group to the end', () => {
			const { view } = setup([
				{ id: 'g1', name: 'A', nodeIds: ['a'] },
				{ id: 'g2', name: 'B', nodeIds: ['b'] },
			]);

			view.toggleCollapsed('g1');
			view.toggleCollapsed('g2');
			// Collapse then re-expand g1 — it should move to the end.
			view.toggleCollapsed('g1');
			view.toggleCollapsed('g1');

			expect(readStored()).toEqual(['g2', 'g1']);
		});
	});

	describe('new groups start expanded', () => {
		it('does not collapse a newly created group', () => {
			const { nodeGroups, view } = setup();

			const group = nodeGroups.createGroup(['a'], 'New');

			expect(view.isGroupCollapsed(group.id)).toBe(false);
		});

		it('persists the auto-expanded state of a newly created group', () => {
			const { nodeGroups } = setup();

			const group = nodeGroups.createGroup(['a'], 'New');

			expect(readStored()).toEqual([group.id]);
		});

		it('keeps existing groups collapsed when a new group is created', () => {
			const { nodeGroups, view } = setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }]);

			nodeGroups.createGroup(['b'], 'New');

			expect(view.isGroupCollapsed('g1')).toBe(true);
		});

		it('keeps a group created with startCollapsed collapsed (imported/pasted groups)', () => {
			const { nodeGroups, view } = setup();

			const group = nodeGroups.createGroup(['a'], 'Imported', { startCollapsed: true });

			expect(view.isGroupCollapsed(group.id)).toBe(true);
		});

		it('pushes on first expand of a startCollapsed group, unlike a user-created one', () => {
			// User-created groups are kept out of the push sources until re-expanded;
			// imported groups behave like loaded ones — their first expansion pushes.
			const { nodeGroups, view } = setup();
			const group = nodeGroups.createGroup(['a'], 'Imported', { startCollapsed: true });
			view.syncLayoutComponents([
				{
					id: `group:${group.id}`,
					kind: 'group',
					groupId: group.id,
					nodeIds: ['a'],
					rect: { x: 0, y: 0, width: 400, height: 40 },
					collapsedRect: { x: 0, y: 0, width: 400, height: 40 },
					expandedRect: { x: 0, y: 0, width: 600, height: 240 },
				},
				{
					id: 'b',
					kind: 'node',
					nodeIds: ['b'],
					rect: { x: 450, y: 10, width: 96, height: 96 },
				},
			]);

			view.toggleCollapsed(group.id);

			expect(view.getVisualOffsetForNode('b').x).toBeGreaterThan(0);
		});
	});

	describe('deleteGroup', () => {
		it('prunes the deleted id so a stale expanded entry does not survive', () => {
			const { nodeGroups, view } = setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }]);
			view.toggleCollapsed('g1');
			expect(view.isGroupCollapsed('g1')).toBe(false);

			nodeGroups.deleteGroup('g1');

			expect(view.isGroupCollapsed('g1')).toBe(true);
			expect(readStored()).toEqual([]);
		});
	});

	describe('updateName / addNodesToGroup — collapse state unchanged', () => {
		it('does not flip collapsed state when renaming a collapsed group', () => {
			const { nodeGroups, view } = setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }]);

			nodeGroups.updateName('g1', 'A-renamed');

			expect(view.isGroupCollapsed('g1')).toBe(true);
		});

		it('does not flip expanded state when an expanded group has nodes added', () => {
			const { nodeGroups, view } = setup();
			const group = nodeGroups.createGroup(['a'], 'New');
			expect(view.isGroupCollapsed(group.id)).toBe(false);

			nodeGroups.addNodesToGroup(group.id, ['b']);

			expect(view.isGroupCollapsed(group.id)).toBe(false);
		});
	});

	describe('toggleCollapsed', () => {
		it('flips membership', () => {
			const { view } = setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }]);
			expect(view.isGroupCollapsed('g1')).toBe(true);

			view.toggleCollapsed('g1');
			expect(view.isGroupCollapsed('g1')).toBe(false);

			view.toggleCollapsed('g1');
			expect(view.isGroupCollapsed('g1')).toBe(true);
		});
	});

	describe('grouping disabled', () => {
		it('never reports a group as collapsed so member nodes stay visible', () => {
			const { view } = setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }], {
				isGroupingEnabled: () => false,
			});

			expect(view.isGroupCollapsed('g1')).toBe(false);
		});

		it('reflects the latest enabled state on each read', () => {
			let enabled = false;
			const { view } = setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }], {
				isGroupingEnabled: () => enabled,
			});

			expect(view.isGroupCollapsed('g1')).toBe(false);

			enabled = true;
			expect(view.isGroupCollapsed('g1')).toBe(true);
		});
	});

	describe('toggle is view state, never marks dirty', () => {
		it('toggleCollapsed does not trigger onStateDirty on the document store', () => {
			const { nodeGroups, view } = setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }]);
			const dirtySpy = vi.fn();
			nodeGroups.onStateDirty(dirtySpy);

			view.toggleCollapsed('g1');

			expect(dirtySpy).not.toHaveBeenCalled();
		});
	});

	describe('derived visual offsets', () => {
		function syncLayout(view: ReturnType<typeof useCanvasNodeGroupView>) {
			const components: NodeGroupLayoutComponent[] = [
				{
					id: 'group:g1',
					kind: 'group',
					groupId: 'g1',
					nodeIds: ['a'],
					rect: { x: 0, y: 0, width: 400, height: 40 },
					collapsedRect: { x: 0, y: 0, width: 400, height: 40 },
					expandedRect: { x: 0, y: 0, width: 600, height: 240 },
				},
				{
					id: 'b',
					kind: 'node',
					nodeIds: ['b'],
					rect: { x: 450, y: 10, width: 96, height: 96 },
				},
			];
			view.syncLayoutComponents(components);
		}

		function syncLayoutWithTwoPushedNodes(
			view: ReturnType<typeof useCanvasNodeGroupView>,
			grouped = false,
		) {
			if (grouped) {
				view.syncLayoutComponents([
					{
						id: 'group:g1',
						kind: 'group',
						groupId: 'g1',
						nodeIds: ['a'],
						rect: { x: 0, y: 0, width: 600, height: 240 },
						collapsedRect: { x: 0, y: 0, width: 400, height: 40 },
						expandedRect: { x: 0, y: 0, width: 600, height: 240 },
					},
					{
						id: 'group:g2',
						kind: 'group',
						groupId: 'g2',
						nodeIds: ['b', 'c'],
						rect: { x: 394, y: -70, width: 448, height: 280 },
						collapsedRect: { x: 394, y: -70, width: 400, height: 40 },
						expandedRect: { x: 394, y: -70, width: 448, height: 280 },
					},
				]);
				return;
			}

			view.syncLayoutComponents([
				{
					id: 'group:g1',
					kind: 'group',
					groupId: 'g1',
					nodeIds: ['a'],
					rect: { x: 0, y: 0, width: 400, height: 40 },
					collapsedRect: { x: 0, y: 0, width: 400, height: 40 },
					expandedRect: { x: 0, y: 0, width: 600, height: 240 },
				},
				{
					id: 'b',
					kind: 'node',
					nodeIds: ['b'],
					rect: { x: 450, y: 10, width: 96, height: 96 },
				},
				{
					id: 'c',
					kind: 'node',
					nodeIds: ['c'],
					rect: { x: 650, y: 10, width: 96, height: 96 },
				},
			]);
		}

		function syncStackedGroups(
			view: ReturnType<typeof useCanvasNodeGroupView>,
			{
				upperExpanded = false,
				lowerExpanded = false,
				lowerY = 80,
			}: { upperExpanded?: boolean; lowerExpanded?: boolean; lowerY?: number } = {},
		) {
			view.syncLayoutComponents([
				{
					id: 'group:g1',
					kind: 'group',
					groupId: 'g1',
					nodeIds: ['a'],
					rect: {
						x: 0,
						y: 0,
						width: upperExpanded ? 600 : 400,
						height: upperExpanded ? 240 : 40,
					},
					collapsedRect: { x: 0, y: 0, width: 400, height: 40 },
					expandedRect: { x: 0, y: 0, width: 600, height: 240 },
				},
				{
					id: 'group:g2',
					kind: 'group',
					groupId: 'g2',
					nodeIds: ['b'],
					rect: {
						x: 0,
						y: lowerY,
						width: lowerExpanded ? 600 : 400,
						height: lowerExpanded ? 240 : 40,
					},
					collapsedRect: { x: 0, y: lowerY, width: 400, height: 40 },
					expandedRect: { x: 0, y: lowerY, width: 600, height: 240 },
				},
			]);
		}

		it('creates client-only offsets when expanding a group', () => {
			const { view } = setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }]);
			syncLayout(view);

			view.toggleCollapsed('g1');

			const offset = view.getVisualOffsetForNode('b');
			expect(offset.x).toBeGreaterThan(0);
			expect(offset.y).toBe(0);
		});

		it('keeps a manually dropped node stable by settling it against active push sources', () => {
			const { view } = setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }]);
			syncLayout(view);
			view.toggleCollapsed('g1');

			expect(view.getVisualOffsetForNode('b').x).toBeGreaterThan(0);

			view.settleManualNodePositions([{ id: 'b', position: { x: 0, y: 0 } }]);

			expect(view.getVisualOffsetForNode('b')).toEqual({ x: 0, y: 0 });
		});

		it('bakes the unmoved members of a pushed group when one member is manually moved', () => {
			const { view } = setup([
				{ id: 'g1', name: 'Upper', nodeIds: ['a'] },
				{ id: 'g2', name: 'Lower', nodeIds: ['b', 'c'] },
			]);

			view.syncLayoutComponents([
				{
					id: 'group:g1',
					kind: 'group',
					groupId: 'g1',
					nodeIds: ['a'],
					rect: { x: 0, y: 0, width: 400, height: 40 },
					collapsedRect: { x: 0, y: 0, width: 400, height: 40 },
					expandedRect: { x: 0, y: 0, width: 600, height: 240 },
				},
				{
					id: 'group:g2',
					kind: 'group',
					groupId: 'g2',
					nodeIds: ['b', 'c'],
					rect: { x: 0, y: 80, width: 400, height: 40 },
					collapsedRect: { x: 0, y: 80, width: 400, height: 40 },
					expandedRect: { x: 0, y: 80, width: 600, height: 240 },
				},
			]);
			view.toggleCollapsed('g1');
			view.toggleCollapsed('g2');

			const offset = view.getVisualOffsetForComponent('group:g2');
			expect(offset.y).toBeGreaterThan(0);

			const events = view.settleManualNodePositions(
				[{ id: 'b', position: { x: 50, y: 500 } }],
				(nodeId) => {
					if (nodeId === 'b') return [0, 120];
					if (nodeId === 'c') return [150, 120];
					return undefined;
				},
			);

			// The moved node keeps its drop position; its unmoved sibling is baked
			// at its current visual position instead of snapping back un-pushed.
			expect(events).toEqual([
				{ id: 'b', position: { x: 50, y: 500 } },
				{ id: 'c', position: { x: 150 + offset.x, y: 120 + offset.y } },
			]);
			expect(view.getVisualOffsetForNode('b')).toEqual({ x: 0, y: 0 });
			expect(view.getVisualOffsetForNode('c')).toEqual({ x: 0, y: 0 });
		});

		it('recomputes offsets away on collapse', () => {
			const { view } = setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }]);
			syncLayout(view);
			view.toggleCollapsed('g1');

			view.toggleCollapsed('g1');

			expect(view.getVisualOffsetForNode('b')).toEqual({ x: 0, y: 0 });
		});

		it('keeps pushed nodes visually stable when they are grouped', () => {
			const { view } = setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }]);
			syncLayoutWithTwoPushedNodes(view);
			view.toggleCollapsed('g1');
			const offsetBeforeGrouping = view.getVisualOffsetForNode('b');
			expect(offsetBeforeGrouping.x).toBeGreaterThan(0);

			syncLayoutWithTwoPushedNodes(view, true);

			expect(view.getVisualOffsetForNode('b')).toEqual(offsetBeforeGrouping);
			expect(view.getVisualOffsetForNode('c')).toEqual(offsetBeforeGrouping);
			expect(view.getVisualOffsetForComponent('group:g2')).toEqual(offsetBeforeGrouping);
		});

		it('keeps an incoming push offset when the pushed group is expanded', () => {
			const { view } = setup([
				{ id: 'g1', name: 'Upper', nodeIds: ['a'] },
				{ id: 'g2', name: 'Lower', nodeIds: ['b'] },
			]);

			view.syncLayoutComponents([
				{
					id: 'group:g1',
					kind: 'group',
					groupId: 'g1',
					nodeIds: ['a'],
					rect: { x: 0, y: 0, width: 400, height: 40 },
					collapsedRect: { x: 0, y: 0, width: 400, height: 40 },
					expandedRect: { x: 0, y: 0, width: 600, height: 240 },
				},
				{
					id: 'group:g2',
					kind: 'group',
					groupId: 'g2',
					nodeIds: ['b'],
					rect: { x: 0, y: 80, width: 400, height: 40 },
					collapsedRect: { x: 0, y: 80, width: 400, height: 40 },
					expandedRect: { x: 0, y: 80, width: 600, height: 240 },
				},
			]);

			view.toggleCollapsed('g1');
			const lowerOffsetAfterUpperExpansion = view.getVisualOffsetForComponent('group:g2');
			expect(lowerOffsetAfterUpperExpansion.y).toBeGreaterThan(0);

			view.syncLayoutComponents([
				{
					id: 'group:g1',
					kind: 'group',
					groupId: 'g1',
					nodeIds: ['a'],
					rect: { x: 0, y: 0, width: 600, height: 240 },
					collapsedRect: { x: 0, y: 0, width: 400, height: 40 },
					expandedRect: { x: 0, y: 0, width: 600, height: 240 },
				},
				{
					id: 'group:g2',
					kind: 'group',
					groupId: 'g2',
					nodeIds: ['b'],
					rect: { x: 0, y: 80, width: 400, height: 40 },
					collapsedRect: { x: 0, y: 80, width: 400, height: 40 },
					expandedRect: { x: 0, y: 80, width: 600, height: 240 },
				},
			]);
			view.toggleCollapsed('g2');

			expect(view.getVisualOffsetForComponent('group:g2')).toEqual(lowerOffsetAfterUpperExpansion);
			expect(view.getVisualOffsetForNode('b')).toEqual(lowerOffsetAfterUpperExpansion);
		});

		it('keeps an older source push when a right-side pushed group expands above it', () => {
			const { view } = setup([
				{ id: 'source', name: 'Source', nodeIds: ['sourceNode'] },
				{ id: 'target', name: 'Target', nodeIds: ['targetNode'] },
			]);

			view.syncLayoutComponents([
				{
					id: 'group:target',
					kind: 'group',
					groupId: 'target',
					nodeIds: ['targetNode'],
					rect: { x: 350, y: 90, width: 400, height: 40 },
					collapsedRect: { x: 350, y: 90, width: 400, height: 40 },
					expandedRect: { x: 350, y: 90, width: 800, height: 240 },
				},
				{
					id: 'group:source',
					kind: 'group',
					groupId: 'source',
					nodeIds: ['sourceNode'],
					rect: { x: 0, y: 100, width: 400, height: 40 },
					collapsedRect: { x: 0, y: 100, width: 400, height: 40 },
					expandedRect: { x: 0, y: 100, width: 1000, height: 240 },
				},
			]);
			view.toggleCollapsed('source');
			const targetOffsetAfterSourceExpansion = view.getVisualOffsetForComponent('group:target');
			expect(targetOffsetAfterSourceExpansion.x).toBeGreaterThan(0);

			view.syncLayoutComponents([
				{
					id: 'group:target',
					kind: 'group',
					groupId: 'target',
					nodeIds: ['targetNode'],
					rect: { x: 350, y: 90, width: 800, height: 240 },
					collapsedRect: { x: 350, y: 90, width: 400, height: 40 },
					expandedRect: { x: 350, y: 90, width: 800, height: 240 },
				},
				{
					id: 'group:source',
					kind: 'group',
					groupId: 'source',
					nodeIds: ['sourceNode'],
					rect: { x: 0, y: 100, width: 1000, height: 240 },
					collapsedRect: { x: 0, y: 100, width: 400, height: 40 },
					expandedRect: { x: 0, y: 100, width: 1000, height: 240 },
				},
			]);
			view.toggleCollapsed('target');

			expect(view.getVisualOffsetForComponent('group:target')).toEqual(
				targetOffsetAfterSourceExpansion,
			);
			expect(view.getVisualOffsetForNode('targetNode')).toEqual(targetOffsetAfterSourceExpansion);
		});

		it('keeps a lower group pushed when it expands even if document order is lower before upper', () => {
			const { view } = setup([
				{ id: 'lower', name: 'Lower', nodeIds: ['b'] },
				{ id: 'upper', name: 'Upper', nodeIds: ['a'] },
			]);

			view.syncLayoutComponents([
				{
					id: 'group:lower',
					kind: 'group',
					groupId: 'lower',
					nodeIds: ['b'],
					rect: { x: 0, y: 80, width: 400, height: 40 },
					collapsedRect: { x: 0, y: 80, width: 400, height: 40 },
					expandedRect: { x: 0, y: 80, width: 600, height: 240 },
				},
				{
					id: 'group:upper',
					kind: 'group',
					groupId: 'upper',
					nodeIds: ['a'],
					rect: { x: 0, y: 0, width: 400, height: 40 },
					collapsedRect: { x: 0, y: 0, width: 400, height: 40 },
					expandedRect: { x: 0, y: 0, width: 600, height: 240 },
				},
			]);

			view.toggleCollapsed('upper');
			const lowerOffsetAfterUpperExpansion = view.getVisualOffsetForComponent('group:lower');
			expect(lowerOffsetAfterUpperExpansion.y).toBeGreaterThan(0);

			view.toggleCollapsed('lower');
			view.syncLayoutComponents([
				{
					id: 'group:lower',
					kind: 'group',
					groupId: 'lower',
					nodeIds: ['b'],
					rect: { x: 0, y: 80, width: 600, height: 240 },
					collapsedRect: { x: 0, y: 80, width: 400, height: 40 },
					expandedRect: { x: 0, y: 80, width: 600, height: 240 },
				},
				{
					id: 'group:upper',
					kind: 'group',
					groupId: 'upper',
					nodeIds: ['a'],
					rect: { x: 0, y: 0, width: 600, height: 240 },
					collapsedRect: { x: 0, y: 0, width: 400, height: 40 },
					expandedRect: { x: 0, y: 0, width: 600, height: 240 },
				},
			]);

			expect(view.getVisualOffsetForComponent('group:lower')).toEqual(
				lowerOffsetAfterUpperExpansion,
			);
			expect(view.getVisualOffsetForNode('b')).toEqual(lowerOffsetAfterUpperExpansion);
		});

		it('commits visual node positions pushed by a moved source group', () => {
			const { view } = setup([
				{ id: 'g1', name: 'Upper', nodeIds: ['a'] },
				{ id: 'g2', name: 'Lower', nodeIds: ['b'] },
			]);

			syncStackedGroups(view);
			view.toggleCollapsed('g1');

			const moves = view.commitMovedPushSourceEffects(['g1'], (nodeId) =>
				nodeId === 'b' ? [0, 80] : undefined,
			);

			expect(moves).toEqual([{ id: 'b', position: { x: 0, y: 296 } }]);
			expect(view.getVisualOffsetForNode('b')).toEqual({ x: 0, y: 0 });
		});

		it('persists the expansion push when a collapsed group is ungrouped (expand → commit → delete)', () => {
			// Ungrouping a collapsed group makes its hidden members reappear, which
			// can overlap nodes placed over their footprint. The ungroup recipe
			// expands the group first so the push algorithm displaces overlapping
			// components, commits that displacement, then deletes the group.
			const { nodeGroups, view } = setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }]);
			syncLayout(view);

			view.toggleCollapsed('g1');
			const offset = view.getVisualOffsetForNode('b');
			expect(offset.x).toBeGreaterThan(0);

			const moves = view.commitMovedPushSourceEffects(['g1'], (nodeId) =>
				nodeId === 'b' ? [450, 10] : undefined,
			);
			nodeGroups.deleteGroup('g1');

			expect(moves).toEqual([{ id: 'b', position: { x: 450 + offset.x, y: 10 + offset.y } }]);
			// Nothing stays live: the persisted position is the final one.
			expect(view.getVisualOffsetForNode('b')).toEqual({ x: 0, y: 0 });
		});

		it('stops using a manually moved expanded group as a push source until re-expanded', () => {
			const { view } = setup([{ id: 'source', name: 'Source', nodeIds: ['sourceNode'] }]);

			view.syncLayoutComponents([
				{
					id: 'group:source',
					kind: 'group',
					groupId: 'source',
					nodeIds: ['sourceNode'],
					rect: { x: 0, y: 0, width: 400, height: 40 },
					collapsedRect: { x: 0, y: 0, width: 400, height: 40 },
					expandedRect: { x: 0, y: 0, width: 600, height: 240 },
				},
				{
					id: 'target',
					kind: 'node',
					nodeIds: ['target'],
					rect: { x: 450, y: 10, width: 100, height: 100 },
				},
			]);
			view.toggleCollapsed('source');
			expect(view.getVisualOffsetForNode('target').x).toBeGreaterThan(0);

			const moves = view.commitMovedPushSourceEffects(['source'], (nodeId) =>
				nodeId === 'target' ? [450, 10] : undefined,
			);

			expect(moves).toHaveLength(1);
			expect(moves[0]?.id).toBe('target');
			expect(view.getVisualOffsetForNode('target')).toEqual({ x: 0, y: 0 });

			view.toggleCollapsed('source');
			view.toggleCollapsed('source');

			expect(view.getVisualOffsetForNode('target').x).toBeGreaterThan(0);
		});

		it('commits visual positions for grouped nodes pushed by a moved source', () => {
			const { view } = setup([
				{ id: 'source', name: 'Source', nodeIds: ['sourceNode'] },
				{ id: 'targetGroup', name: 'Target', nodeIds: ['targetA', 'targetB'] },
			]);

			view.syncLayoutComponents([
				{
					id: 'group:source',
					kind: 'group',
					groupId: 'source',
					nodeIds: ['sourceNode'],
					rect: { x: 0, y: 0, width: 600, height: 240 },
					collapsedRect: { x: 0, y: 0, width: 400, height: 40 },
					expandedRect: { x: 0, y: 0, width: 600, height: 240 },
				},
				{
					id: 'group:targetGroup',
					kind: 'group',
					groupId: 'targetGroup',
					nodeIds: ['targetA', 'targetB'],
					rect: { x: 450, y: 10, width: 400, height: 40 },
					collapsedRect: { x: 450, y: 10, width: 400, height: 40 },
					expandedRect: { x: 450, y: 10, width: 400, height: 40 },
				},
			]);
			view.toggleCollapsed('source');

			const moves = view.commitMovedPushSourceEffects(['source'], (nodeId) => {
				if (nodeId === 'targetA') return [450, 10];
				if (nodeId === 'targetB') return [600, 10];
				return undefined;
			});

			expect(moves).toEqual([
				{ id: 'targetA', position: { x: 666, y: 10 } },
				{ id: 'targetB', position: { x: 816, y: 10 } },
			]);
		});

		it('settles the full visual offset of nodes pushed by a manually moved source', () => {
			const { view } = setup([
				{ id: 'g2', name: 'Group 2', nodeIds: ['g2Node'] },
				{ id: 'g1', name: 'Group 1', nodeIds: ['g1Node'] },
			]);

			view.syncLayoutComponents([
				{
					id: 'group:g2',
					kind: 'group',
					groupId: 'g2',
					nodeIds: ['g2Node'],
					rect: { x: 0, y: 0, width: 700, height: 240 },
					collapsedRect: { x: 0, y: 0, width: 400, height: 40 },
					expandedRect: { x: 0, y: 0, width: 700, height: 240 },
				},
				{
					id: 'group:g1',
					kind: 'group',
					groupId: 'g1',
					nodeIds: ['g1Node'],
					rect: { x: 0, y: 120, width: 800, height: 240 },
					collapsedRect: { x: 0, y: 120, width: 400, height: 40 },
					expandedRect: { x: 0, y: 120, width: 800, height: 240 },
				},
				{
					id: 'target',
					kind: 'node',
					nodeIds: ['target'],
					rect: { x: 650, y: 340, width: 100, height: 100 },
				},
			]);
			view.toggleCollapsed('g2');
			view.toggleCollapsed('g1');

			const targetOffset = view.getVisualOffsetForNode('target');
			expect(targetOffset.x).toBeGreaterThan(0);
			expect(targetOffset.y).toBeGreaterThan(0);

			const moves = view.commitMovedPushSourceEffects(['g1'], (nodeId) =>
				nodeId === 'target' ? [650, 340] : undefined,
			);

			expect(moves).toHaveLength(1);
			expect(moves[0]?.id).toBe('target');
			expect(view.getVisualOffsetForNode('target')).toEqual({ x: 0, y: 0 });
		});

		it('keeps the push offset stable across a layout re-sync', () => {
			const { view } = setup([
				{ id: 'g1', name: 'Upper', nodeIds: ['a'] },
				{ id: 'g2', name: 'Lower', nodeIds: ['b'] },
			]);

			syncStackedGroups(view);
			view.toggleCollapsed('g1');
			const lowerOffsetAfterFirstExpansion = view.getVisualOffsetForComponent('group:g2');
			expect(lowerOffsetAfterFirstExpansion.y).toBeGreaterThan(0);

			syncStackedGroups(view, { upperExpanded: true });

			expect(view.getVisualOffsetForComponent('group:g2')).toEqual(lowerOffsetAfterFirstExpansion);
			expect(view.getVisualOffsetForNode('b')).toEqual(lowerOffsetAfterFirstExpansion);
		});

		it('does not push a moved-away group again when the source group is re-expanded', () => {
			const { view } = setup([
				{ id: 'g1', name: 'Upper', nodeIds: ['a'] },
				{ id: 'g2', name: 'Lower', nodeIds: ['b'] },
			]);

			syncStackedGroups(view);
			view.toggleCollapsed('g1');
			const lowerOffsetAfterFirstExpansion = view.getVisualOffsetForComponent('group:g2');
			expect(lowerOffsetAfterFirstExpansion.y).toBeGreaterThan(0);

			// Dropping the pushed group at visual y=1000 stores y minus the live offset.
			const movedAwayY = 1000 - lowerOffsetAfterFirstExpansion.y;
			syncStackedGroups(view, { upperExpanded: true, lowerY: movedAwayY });
			view.toggleCollapsed('g1');

			expect(view.getVisualOffsetForComponent('group:g2')).toEqual({ x: 0, y: 0 });

			syncStackedGroups(view, { lowerY: movedAwayY });
			view.toggleCollapsed('g1');

			expect(view.getVisualOffsetForComponent('group:g2')).toEqual({ x: 0, y: 0 });
		});

		it('keeps a moved-away pushed group stable when that group is expanded', () => {
			const { view } = setup([
				{ id: 'g1', name: 'Upper', nodeIds: ['a'] },
				{ id: 'g2', name: 'Lower', nodeIds: ['b'] },
			]);

			syncStackedGroups(view);
			view.toggleCollapsed('g1');
			const lowerOffsetAfterFirstExpansion = view.getVisualOffsetForComponent('group:g2');
			expect(lowerOffsetAfterFirstExpansion.y).toBeGreaterThan(0);

			// Dropping the pushed group at visual y=1000 stores y minus the live offset.
			const movedAwayY = 1000 - lowerOffsetAfterFirstExpansion.y;
			syncStackedGroups(view, { upperExpanded: true, lowerY: movedAwayY });
			view.toggleCollapsed('g1');
			syncStackedGroups(view, { lowerY: movedAwayY });

			view.toggleCollapsed('g2');
			syncStackedGroups(view, { lowerExpanded: true, lowerY: movedAwayY });

			expect(view.getVisualOffsetForComponent('group:g2')).toEqual({ x: 0, y: 0 });
			expect(view.getVisualOffsetForNode('b')).toEqual({ x: 0, y: 0 });
		});
	});
});

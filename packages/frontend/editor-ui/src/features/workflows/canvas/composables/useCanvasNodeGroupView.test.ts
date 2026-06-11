import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkflowDocumentNodeGroups } from '@/app/stores/workflowDocument/useWorkflowDocumentNodeGroups';
import { LOCAL_STORAGE_CANVAS_GROUP_EXPANDED } from '@/app/constants/localStorage';
import { useCanvasNodeGroupView } from './useCanvasNodeGroupView';

function setup(
	initialGroups: Array<{ id: string; name: string; nodeIds: string[] }> = [],
	{
		workflowId = 'wf-test',
		isGroupingEnabled,
	}: { workflowId?: string; isGroupingEnabled?: () => boolean } = {},
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

		it('keeps existing groups collapsed when a new group is created', () => {
			const { nodeGroups, view } = setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }]);

			nodeGroups.createGroup(['b'], 'New');

			expect(view.isGroupCollapsed('g1')).toBe(true);
		});

		it('does not persist the auto-expanded state of a newly created group', () => {
			const { nodeGroups, view } = setup();

			const group = nodeGroups.createGroup(['a'], 'New');

			// Expanded in-session, but creation alone must not write to localStorage.
			expect(view.isGroupCollapsed(group.id)).toBe(false);
			expect(readStored()).toEqual([]);
		});

		it('persists the auto-expanded group once the user deliberately toggles it', () => {
			const { nodeGroups, view } = setup();
			const group = nodeGroups.createGroup(['a'], 'New');
			expect(readStored()).toEqual([]);

			// Collapse then re-expand — now the deliberate action persists.
			view.toggleCollapsed(group.id);
			view.toggleCollapsed(group.id);

			expect(readStored()).toEqual([group.id]);
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
});

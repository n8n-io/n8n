import { describe, expect, it, vi } from 'vitest';
import { useWorkflowDocumentNodeGroups } from '@/app/stores/workflowDocument/useWorkflowDocumentNodeGroups';
import { useCanvasNodeGroupView } from './useCanvasNodeGroupView';

function setup(initialGroups: Array<{ id: string; name: string; nodeIds: string[] }> = []) {
	const nodeGroups = useWorkflowDocumentNodeGroups();
	if (initialGroups.length > 0) {
		nodeGroups.setNodeGroups(initialGroups);
	}
	const view = useCanvasNodeGroupView({
		allGroups: nodeGroups.allGroups,
		onNodeGroupsChange: nodeGroups.onNodeGroupsChange,
	});
	return { nodeGroups, view };
}

describe('useCanvasNodeGroupView', () => {
	describe('AC #0 — default state on workflow load', () => {
		it('marks every group from setNodeGroups as collapsed', () => {
			const { nodeGroups, view } = setup();

			nodeGroups.setNodeGroups([
				{ id: 'g1', name: 'A', nodeIds: ['a'] },
				{ id: 'g2', name: 'B', nodeIds: ['b'] },
			]);

			expect(view.isGroupCollapsed('g1')).toBe(true);
			expect(view.isGroupCollapsed('g2')).toBe(true);
		});

		it('takes a snapshot of pre-existing groups on instantiation', () => {
			const nodeGroups = useWorkflowDocumentNodeGroups();
			nodeGroups.setNodeGroups([{ id: 'g1', name: 'A', nodeIds: ['a'] }]);

			const view = useCanvasNodeGroupView({
				allGroups: nodeGroups.allGroups,
				onNodeGroupsChange: nodeGroups.onNodeGroupsChange,
			});

			expect(view.isGroupCollapsed('g1')).toBe(true);
		});

		it('collapses every id when setNodeGroups runs AFTER the view is constructed', () => {
			// Exercises the SET event handler — not the constructor seed.
			// In production, the document store hydrates after WorkflowCanvas
			// mounts, so the SET event is what brings collapse state into
			// agreement with the loaded workflow.
			const { nodeGroups, view } = setup();
			expect(view.isGroupCollapsed('g1')).toBe(false);

			nodeGroups.setNodeGroups([
				{ id: 'g1', name: 'A', nodeIds: ['a'] },
				{ id: 'g2', name: 'B', nodeIds: ['b'] },
			]);

			expect(view.isGroupCollapsed('g1')).toBe(true);
			expect(view.isGroupCollapsed('g2')).toBe(true);
		});

		it('drops previously-known groups from collapsedIds when SET replaces them', () => {
			const { nodeGroups, view } = setup([{ id: 'gOld', name: 'Old', nodeIds: ['a'] }]);
			expect(view.isGroupCollapsed('gOld')).toBe(true);

			nodeGroups.setNodeGroups([{ id: 'gNew', name: 'New', nodeIds: ['b'] }]);

			expect(view.isGroupCollapsed('gOld')).toBe(false);
			expect(view.isGroupCollapsed('gNew')).toBe(true);
		});
	});

	describe('AC #0 — new groups start expanded', () => {
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
	});

	describe('deleteGroup', () => {
		it('removes the deleted id from collapsedIds', () => {
			const { nodeGroups, view } = setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }]);
			expect(view.isGroupCollapsed('g1')).toBe(true);

			nodeGroups.deleteGroup('g1');

			expect(view.isGroupCollapsed('g1')).toBe(false);
		});
	});

	describe('updateName / addNodesToGroup — collapse state unchanged (AC #0 omission)', () => {
		it('does not flip collapsed state when renaming a collapsed group', () => {
			const { nodeGroups, view } = setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }]);

			nodeGroups.updateName('g1', 'A-renamed');

			expect(view.isGroupCollapsed('g1')).toBe(true);
		});

		it('does not flip collapsed state when adding nodes to a collapsed group', () => {
			const { nodeGroups, view } = setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }]);

			nodeGroups.addNodesToGroup('g1', ['b']);

			expect(view.isGroupCollapsed('g1')).toBe(true);
		});

		it('does not flip collapsed state when an expanded group has nodes added', () => {
			const { nodeGroups, view } = setup();
			const group = nodeGroups.createGroup(['a'], 'New');
			expect(view.isGroupCollapsed(group.id)).toBe(false);

			nodeGroups.addNodesToGroup(group.id, ['b']);

			expect(view.isGroupCollapsed(group.id)).toBe(false);
		});
	});

	describe('toggleCollapsed / setCollapsed', () => {
		it('toggleCollapsed flips membership', () => {
			const { view } = setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }]);
			expect(view.isGroupCollapsed('g1')).toBe(true);

			view.toggleCollapsed('g1');
			expect(view.isGroupCollapsed('g1')).toBe(false);

			view.toggleCollapsed('g1');
			expect(view.isGroupCollapsed('g1')).toBe(true);
		});

		it('setCollapsed is idempotent', () => {
			const { view } = setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }]);

			view.setCollapsed('g1', true);
			view.setCollapsed('g1', true);

			expect(view.isGroupCollapsed('g1')).toBe(true);
		});
	});

	describe('collapseAll / expandAll', () => {
		it('collapseAll marks every known group as collapsed', () => {
			const { nodeGroups, view } = setup();
			nodeGroups.setNodeGroups([
				{ id: 'g1', name: 'A', nodeIds: ['a'] },
				{ id: 'g2', name: 'B', nodeIds: ['b'] },
			]);
			view.expandAll();
			expect(view.isGroupCollapsed('g1')).toBe(false);

			view.collapseAll();

			expect(view.isGroupCollapsed('g1')).toBe(true);
			expect(view.isGroupCollapsed('g2')).toBe(true);
		});

		it('expandAll clears collapsedIds', () => {
			const { view } = setup([
				{ id: 'g1', name: 'A', nodeIds: ['a'] },
				{ id: 'g2', name: 'B', nodeIds: ['b'] },
			]);

			view.expandAll();

			expect(view.isGroupCollapsed('g1')).toBe(false);
			expect(view.isGroupCollapsed('g2')).toBe(false);
		});
	});

	describe('AC #9 — toggle is view state, never marks dirty', () => {
		it('toggleCollapsed does not trigger onStateDirty on the document store', () => {
			const { nodeGroups, view } = setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }]);
			const dirtySpy = vi.fn();
			nodeGroups.onStateDirty(dirtySpy);

			view.toggleCollapsed('g1');
			view.expandAll();
			view.collapseAll();

			expect(dirtySpy).not.toHaveBeenCalled();
		});
	});
});

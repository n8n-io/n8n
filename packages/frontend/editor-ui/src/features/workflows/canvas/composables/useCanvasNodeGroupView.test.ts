import { describe, expect, it, vi } from 'vitest';
import { useWorkflowDocumentNodeGroups } from '@/app/stores/workflowDocument/useWorkflowDocumentNodeGroups';
import { useCanvasNodeGroupView } from './useCanvasNodeGroupView';

function setup(initialGroups: Array<{ id: string; name: string; nodeIds: string[] }> = []) {
	const nodeGroups = useWorkflowDocumentNodeGroups();
	if (initialGroups.length > 0) {
		nodeGroups.setNodeGroups(initialGroups);
	}
	const view = useCanvasNodeGroupView({
		onNodeGroupsChange: nodeGroups.onNodeGroupsChange,
	});
	return { nodeGroups, view };
}

describe('useCanvasNodeGroupView', () => {
	describe('default state on workflow load', () => {
		it('marks every group from setNodeGroups as collapsed', () => {
			const { nodeGroups, view } = setup();

			nodeGroups.setNodeGroups([
				{ id: 'g1', name: 'A', nodeIds: ['a'] },
				{ id: 'g2', name: 'B', nodeIds: ['b'] },
			]);

			expect(view.isGroupCollapsed('g1')).toBe(true);
			expect(view.isGroupCollapsed('g2')).toBe(true);
		});

		it('clears prior expand state when SET replaces the groups', () => {
			const { nodeGroups, view } = setup([{ id: 'gOld', name: 'Old', nodeIds: ['a'] }]);
			view.toggleCollapsed('gOld');
			expect(view.isGroupCollapsed('gOld')).toBe(false);

			nodeGroups.setNodeGroups([{ id: 'gNew', name: 'New', nodeIds: ['b'] }]);

			expect(view.isGroupCollapsed('gOld')).toBe(true);
			expect(view.isGroupCollapsed('gNew')).toBe(true);
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
	});

	describe('deleteGroup', () => {
		it('prunes the deleted id so a stale expanded entry does not survive', () => {
			const { nodeGroups, view } = setup([{ id: 'g1', name: 'A', nodeIds: ['a'] }]);
			view.toggleCollapsed('g1');
			expect(view.isGroupCollapsed('g1')).toBe(false);

			nodeGroups.deleteGroup('g1');

			expect(view.isGroupCollapsed('g1')).toBe(true);
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

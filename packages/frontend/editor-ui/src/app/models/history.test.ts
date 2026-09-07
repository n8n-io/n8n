import { describe, expect, it, vi, afterEach } from 'vitest';
import type { IWorkflowGroup } from 'n8n-workflow';

import {
	AddNodeGroupCommand,
	RemoveNodeGroupCommand,
	UpdateNodeGroupCommand,
	historyBus,
} from './history';

const group = (overrides: Partial<IWorkflowGroup> = {}): IWorkflowGroup => ({
	id: 'group-1',
	name: 'Group 1',
	nodeIds: ['a', 'b'],
	...overrides,
});

describe('node group history commands', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('AddNodeGroupCommand', () => {
		it('reverses to a RemoveNodeGroupCommand for the same group', () => {
			const command = new AddNodeGroupCommand(group(), 1);
			const reverse = command.getReverseCommand(2);

			expect(reverse).toBeInstanceOf(RemoveNodeGroupCommand);
			expect((reverse as RemoveNodeGroupCommand).group).toEqual(group());
		});

		it('clones the group so later mutations do not leak into the command', () => {
			const original = group();
			const command = new AddNodeGroupCommand(original, 1);

			original.nodeIds.push('c');
			original.name = 'changed';

			expect(command.group.nodeIds).toEqual(['a', 'b']);
			expect(command.group.name).toBe('Group 1');
		});

		it('is equal to another add command for the same group id', () => {
			const a = new AddNodeGroupCommand(group(), 1);
			const b = new AddNodeGroupCommand(group({ name: 'renamed' }), 2);
			const c = new AddNodeGroupCommand(group({ id: 'group-2' }), 3);

			expect(a.isEqualTo(b)).toBe(true);
			expect(a.isEqualTo(c)).toBe(false);
		});

		it('emits revertAddNodeGroup on revert', async () => {
			const emit = vi.spyOn(historyBus, 'emit');
			const command = new AddNodeGroupCommand(group(), 1);

			await command.revert();

			expect(emit).toHaveBeenCalledWith('revertAddNodeGroup', { group: group() });
		});
	});

	describe('RemoveNodeGroupCommand', () => {
		it('reverses to an AddNodeGroupCommand for the same group', () => {
			const command = new RemoveNodeGroupCommand(group(), 1);
			const reverse = command.getReverseCommand(2);

			expect(reverse).toBeInstanceOf(AddNodeGroupCommand);
			expect((reverse as AddNodeGroupCommand).group).toEqual(group());
		});

		it('emits revertRemoveNodeGroup on revert', async () => {
			const emit = vi.spyOn(historyBus, 'emit');
			const command = new RemoveNodeGroupCommand(group(), 1);

			await command.revert();

			expect(emit).toHaveBeenCalledWith('revertRemoveNodeGroup', { group: group() });
		});
	});

	describe('UpdateNodeGroupCommand', () => {
		it('reverses by swapping before and after snapshots', () => {
			const before = group({ nodeIds: ['a', 'b'] });
			const after = group({ nodeIds: ['a', 'b', 'c'] });
			const command = new UpdateNodeGroupCommand(before, after, 1);

			const reverse = command.getReverseCommand(2) as UpdateNodeGroupCommand;

			expect(reverse.before).toEqual(after);
			expect(reverse.after).toEqual(before);
		});

		it('is equal only when both snapshots match', () => {
			const before = group({ nodeIds: ['a', 'b'] });
			const after = group({ nodeIds: ['a', 'b', 'c'] });

			const a = new UpdateNodeGroupCommand(before, after, 1);
			const b = new UpdateNodeGroupCommand(before, after, 2);
			const c = new UpdateNodeGroupCommand(before, group({ nodeIds: ['a'] }), 3);

			expect(a.isEqualTo(b)).toBe(true);
			expect(a.isEqualTo(c)).toBe(false);
		});

		it('emits revertUpdateNodeGroup with the before snapshot on revert', async () => {
			const emit = vi.spyOn(historyBus, 'emit');
			const before = group({ nodeIds: ['a', 'b'] });
			const after = group({ nodeIds: ['a', 'b', 'c'] });
			const command = new UpdateNodeGroupCommand(before, after, 1);

			await command.revert();

			expect(emit).toHaveBeenCalledWith('revertUpdateNodeGroup', { group: before });
		});
	});
});

import { createTestTaskData } from '@/__tests__/mocks';
import { renameNode, update } from './runDataUtils';
import identity from 'lodash/identity';

describe(renameNode, () => {
	const original = {
		n0: [createTestTaskData()],
		n1: [createTestTaskData({ source: [{ previousNode: 'n0' }] })],
		n2: [createTestTaskData({ source: [{ previousNode: 'n0' }, { previousNode: 'n1' }] })],
	};

	it('renames all occurrences of old node name', () => {
		const updated = renameNode(original, { old: 'n0', new: 'n0-updated' });

		expect(updated['n0-updated'].length).toBe(1);
		expect(updated['n0-updated'][0]).toBe(original.n0[0]);
		expect(updated.n1[0].source.length).toBe(1);
		expect(updated.n1[0].source[0]?.previousNode).toBe('n0-updated');
		expect(updated.n2[0].source.length).toBe(2);
		expect(updated.n2[0].source[0]?.previousNode).toBe('n0-updated');
		expect(updated.n2[0].source[1]?.previousNode).toBe('n1');
	});

	it('maintains referential and structural equality if task data does not contain old node name', () => {
		const updated = renameNode(original, { old: 'n3', new: 'n3-updated' });

		expect(updated).toBe(original);
		expect(updated).toEqual(original);
	});
});

describe(update, () => {
	const original = {
		n0: [createTestTaskData({ executionStatus: 'running' })],
		n1: [
			createTestTaskData({ executionStatus: 'running' }),
			createTestTaskData({ executionStatus: 'running' }),
		],
	};

	it('updates run data for all nodes', () => {
		const updated = update(original, (tasks) =>
			tasks.map((task) => ({ ...task, executionStatus: 'success' })),
		);

		expect(updated.n0).toHaveLength(1);
		expect(updated.n0[0].executionStatus).toBe('success');
		expect(updated.n1).toHaveLength(2);
		expect(updated.n1[0].executionStatus).toBe('success');
		expect(updated.n1[1].executionStatus).toBe('success');
	});

	it('maintains referential and structural equality if transform function does not modify given task', () => {
		const updated = update(original, identity);

		expect(updated).toBe(original);
		expect(updated).toEqual(original);
	});

	it('removes the key if transform function returns no task', () => {
		const updated = update(original, (tasks, name) => (name === 'n0' ? [] : tasks));

		expect(updated).not.toHaveProperty('n0');
		expect(updated.n1).toHaveLength(2);
	});
});

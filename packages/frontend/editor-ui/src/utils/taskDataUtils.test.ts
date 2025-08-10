import { createTestTaskData } from '@/__tests__/mocks';
import { renameNode } from './taskDataUtils';

describe(renameNode, () => {
	const original = createTestTaskData({
		source: [{ previousNode: 'n0' }, { previousNode: 'n1' }, { previousNode: 'n0' }],
	});

	it('renames all occurrences of old node name', () => {
		const updated = renameNode(original, { old: 'n0', new: 'n0-updated' });

		expect(updated.source.length).toBe(3);
		expect(updated.source[0]?.previousNode).toBe('n0-updated');
		expect(updated.source[1]?.previousNode).toBe('n1');
		expect(updated.source[2]?.previousNode).toBe('n0-updated');
	});

	it('maintains referential and structural equality if task data does not contain old node name', () => {
		const updated = renameNode(original, { old: 'n2', new: 'n2-updated' });

		expect(updated).toBe(original);
		expect(updated).toEqual(original);
	});
});

import type { IPinData } from 'n8n-workflow';
import { renameNode } from './pinDataUtils';

describe(renameNode, () => {
	const original: IPinData = {
		n0: [{ json: {} }],
		n1: [{ json: {}, pairedItem: { item: 0, sourceOverwrite: { previousNode: 'n0' } } }],
		n2: [
			{
				json: {},
				pairedItem: [
					{ item: 0, sourceOverwrite: { previousNode: 'n0' } },
					{ item: 0, sourceOverwrite: { previousNode: 'n1' } },
				],
			},
		],
		n3: [{ json: {}, pairedItem: 0 }],
	};

	it('renames all occurrences of old node name', () => {
		const updated = renameNode(original, { old: 'n0', new: 'n0-updated' });

		expect(updated).not.toHaveProperty('n0');
		expect(updated['n0-updated']).toHaveLength(1);
		expect(updated['n0-updated'][0]).toBe(original.n0[0]);
		expect(updated.n1).toHaveLength(1);
		expect((updated.n1[0].pairedItem as any).sourceOverwrite.previousNode).toBe('n0-updated');
		expect(updated.n2).toHaveLength(1);
		expect((updated.n2[0].pairedItem as any)[0].sourceOverwrite.previousNode).toBe('n0-updated');
		expect((updated.n2[0].pairedItem as any)[1].sourceOverwrite.previousNode).toBe('n1');
		expect(updated.n3).toHaveLength(1);
		expect(updated.n3[0]).toBe(original.n3[0]);
	});

	it('maintains referential and structural equality if pinned data does not contain old node name', () => {
		const updated = renameNode(original, { old: 'n4', new: 'n4-updated' });

		expect(updated).toBe(original);
		expect(updated).toEqual(original);
	});
});

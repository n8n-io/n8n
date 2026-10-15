import { groupNodesByType } from '../group-nodes-by-type';
import { createNode } from './test-helpers';

describe('groupNodesByType', () => {
	it('groups nodes by their type, preserving order within a type', () => {
		const set1 = createNode('Set1', 'n8n-nodes-base.set');
		const code = createNode('Code', 'n8n-nodes-base.code');
		const set2 = createNode('Set2', 'n8n-nodes-base.set');

		const grouped = groupNodesByType([set1, code, set2]);

		expect(grouped.size).toBe(2);
		expect(grouped.get('n8n-nodes-base.set')).toEqual([set1, set2]);
		expect(grouped.get('n8n-nodes-base.code')).toEqual([code]);
	});

	it('returns an empty map for no nodes', () => {
		expect(groupNodesByType([]).size).toBe(0);
	});
});

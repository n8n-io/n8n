import { describe, expect, it } from 'vitest';

import type { AssistantMentionItem } from '../assistantAtMentions.types';
import { searchMentionItems } from './searchMentionItems';

function mention(label: string, key = label, description?: string): AssistantMentionItem {
	return {
		key,
		kind: 'workflow',
		source: 'workflows',
		label,
		breadcrumbs: [label],
		workflowId: key,
		entityId: key,
		workflowName: label,
		...(description ? { description } : {}),
	};
}

describe('searchMentionItems', () => {
	it('orders exact, prefix, token-prefix, substring, and description matches', () => {
		const results = searchMentionItems(
			[
				mention('Preorders daily', 'substring'),
				mention('Archive', 'description', 'Contains order records'),
				mention('Order review', 'prefix'),
				mention('Review order queue', 'token-prefix'),
				mention('Order', 'exact'),
			],
			'order',
			10,
		);

		expect(results.map(({ key }) => key)).toEqual([
			'exact',
			'prefix',
			'token-prefix',
			'substring',
			'description',
		]);
	});

	it('preserves source order for equal match classes', () => {
		const results = searchMentionItems(
			[mention('Orders newer', 'newer'), mention('Orders older', 'older')],
			'orders',
			10,
		);

		expect(results.map(({ key }) => key)).toEqual(['newer', 'older']);
	});

	it('keeps the best matching duplicate and limits the final list', () => {
		const duplicateByDescription = mention('Archive', 'same', 'Orders');
		const duplicateByName = mention('Orders', 'same');
		const remaining = Array.from({ length: 15 }, (_, index) =>
			mention(`Orders ${index + 1}`, `workflow-${index + 1}`),
		);

		const results = searchMentionItems(
			[duplicateByDescription, ...remaining, duplicateByName],
			'orders',
			10,
		);

		expect(results).toHaveLength(10);
		expect(results[0]).toBe(duplicateByName);
		expect(results.filter(({ key }) => key === 'same')).toHaveLength(1);
	});

	it('normalizes case and punctuation-delimited tokens', () => {
		expect(searchMentionItems([mention('CRM:Order Sync')], 'order', 10)).toHaveLength(1);
		expect(searchMentionItems([mention('Daily Café Sync')], 'café', 10)).toHaveLength(1);
	});

	it('returns no results for a blank query or non-positive limit', () => {
		expect(searchMentionItems([mention('Orders')], '  ', 10)).toEqual([]);
		expect(searchMentionItems([mention('Orders')], 'orders', 0)).toEqual([]);
	});
});

import { describe, it, expect } from 'vitest';
import { paginate, rankItems } from './commandBar.utils';
import type { CommandBarItem } from './types';

const createItem = (id: string, title: string, keywords?: string[]): CommandBarItem => ({
	id,
	title,
	keywords,
});

const ids = (items: CommandBarItem[]) => items.map((item) => item.id);

describe('rankItems', () => {
	const items = [
		createItem('slack-trigger', 'Slack Trigger'),
		createItem('http', 'HTTP Request', ['cURL', 'API']),
		createItem('slack', 'Slack'),
	];

	it('should keep the order and return a copy when the query is empty', () => {
		const result = rankItems(items, '   ');

		expect(result).toEqual(items);
		expect(result).not.toBe(items);
	});

	it('should rank better title matches first', () => {
		expect(ids(rankItems(items, 'slack'))).toEqual(['slack', 'slack-trigger']);
	});

	it('should match items by keywords', () => {
		expect(ids(rankItems(items, 'curl'))).toEqual(['http']);
	});

	it('should exclude items that do not match', () => {
		expect(rankItems(items, 'gmail')).toEqual([]);
	});
});

describe('paginate', () => {
	const items = ['a', 'b', 'c', 'd', 'e'].map((id) => createItem(id, id));

	it('should return the requested slice and report more items', () => {
		const { items: page, hasMore } = paginate(items, { offset: 1, limit: 2 });

		expect(ids(page)).toEqual(['b', 'c']);
		expect(hasMore).toBe(true);
	});

	it('should report no more items on the last page', () => {
		const { items: page, hasMore } = paginate(items, { offset: 3, limit: 2 });

		expect(ids(page)).toEqual(['d', 'e']);
		expect(hasMore).toBe(false);
	});

	it('should return an empty page when the offset is past the end', () => {
		expect(paginate(items, { offset: 10, limit: 2 })).toEqual({ items: [], hasMore: false });
	});
});

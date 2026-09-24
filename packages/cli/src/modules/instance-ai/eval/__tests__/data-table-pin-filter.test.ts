import type { INode, INodeExecutionData } from 'n8n-workflow';

import { applyDataTableReadParameters } from '../data-table-pin-filter';

function readNode(parameters: Record<string, unknown>): INode {
	return {
		id: 'node-1',
		name: 'Read Rows',
		type: 'n8n-nodes-base.dataTable',
		typeVersion: 1.1,
		position: [0, 0],
		parameters: { resource: 'row', operation: 'get', ...parameters },
	};
}

function rows(...values: Array<Record<string, unknown>>): INodeExecutionData[] {
	return values.map((json) => ({ json }));
}

const filter = (conditions: Array<Record<string, unknown>>, matchType = 'anyCondition') => ({
	matchType,
	filters: { conditions },
});

const seeded = rows(
	{ country: 'FR', zone: 'eu', employees: 40 },
	{ country: 'DE', zone: 'eu', employees: 12 },
	{ country: 'US', zone: 'row', employees: 300 },
);

describe('applyDataTableReadParameters', () => {
	it('keeps only the rows an eq condition matches', () => {
		const node = readNode(filter([{ keyName: 'country', condition: 'eq', keyValue: 'US' }]));

		const result = applyDataTableReadParameters(node, seeded);

		expect(result.items.map((item) => item.json.country)).toEqual(['US']);
		expect(result.warnings).toEqual([]);
	});

	it('trims the rows to the limit unless returnAll is set', () => {
		expect(applyDataTableReadParameters(readNode({ limit: 1 }), seeded).items).toHaveLength(1);
		expect(
			applyDataTableReadParameters(readNode({ returnAll: true, limit: 1 }), seeded).items,
		).toHaveLength(3);
	});

	it('leaves the rows untouched when the node has no conditions', () => {
		const result = applyDataTableReadParameters(readNode({}), seeded);

		expect(result.items).toEqual(seeded);
		expect(result.warnings).toEqual([]);
	});

	it('keeps an empty pin empty', () => {
		const node = readNode(filter([{ keyName: 'country', condition: 'eq', keyValue: 'US' }]));

		expect(applyDataTableReadParameters(node, []).items).toEqual([]);
	});

	it('leaves the rows untouched and reports an unknown condition', () => {
		const node = readNode(filter([{ keyName: 'country', condition: 'startsWith', keyValue: 'U' }]));

		const result = applyDataTableReadParameters(node, seeded);

		expect(result.items).toEqual(seeded);
		expect(result.warnings).toEqual([
			'Pinned Data Table read "Read Rows": unknown condition "startsWith" on "country"; rows were not filtered by it',
		]);
	});

	it('leaves the rows untouched and reports a condition whose value is an expression', () => {
		const node = readNode({
			...filter([{ keyName: 'country', condition: 'eq', keyValue: '={{ $json.country }}' }]),
			limit: 1,
		});

		const result = applyDataTableReadParameters(node, seeded);

		expect(result.items).toEqual(seeded);
		expect(result.warnings[0]).toContain('uses an expression');
	});

	it('distinguishes anyCondition from allConditions', () => {
		const conditions = [
			{ keyName: 'zone', condition: 'eq', keyValue: 'eu' },
			{ keyName: 'employees', condition: 'gt', keyValue: 20 },
		];

		const anyMatch = applyDataTableReadParameters(
			readNode(filter(conditions, 'anyCondition')),
			seeded,
		);
		const allMatch = applyDataTableReadParameters(
			readNode(filter(conditions, 'allConditions')),
			seeded,
		);

		expect(anyMatch.items.map((item) => item.json.country)).toEqual(['FR', 'DE', 'US']);
		expect(allMatch.items.map((item) => item.json.country)).toEqual(['FR']);
	});

	it('applies the evaluable conditions of an allConditions filter and skips the limit when one is an expression', () => {
		const node = readNode({
			...filter(
				[
					{ keyName: 'zone', condition: 'eq', keyValue: 'eu' },
					{ keyName: 'country', condition: 'eq', keyValue: '={{ $json.country }}' },
				],
				'allConditions',
			),
			limit: 1,
		});

		const result = applyDataTableReadParameters(node, seeded);

		expect(result.items.map((item) => item.json.country)).toEqual(['FR', 'DE']);
	});

	it('matches like, ilike, empty and numeric comparisons the way the node does', () => {
		const table = rows(
			{ name: 'Harbor Cafe', status: '', amount: '120.50' },
			{ name: 'harbor books', status: 'open', amount: 80 },
			{ name: 'Cedar', status: null, amount: 200 },
		);
		const names = (conditions: Array<Record<string, unknown>>) =>
			applyDataTableReadParameters(readNode(filter(conditions)), table).items.map(
				(item) => item.json.name,
			);

		expect(names([{ keyName: 'name', condition: 'like', keyValue: 'Harbor' }])).toEqual([
			'Harbor Cafe',
		]);
		expect(names([{ keyName: 'name', condition: 'ilike', keyValue: 'harbor' }])).toEqual([
			'Harbor Cafe',
			'harbor books',
		]);
		expect(names([{ keyName: 'status', condition: 'isEmpty' }])).toEqual(['Harbor Cafe', 'Cedar']);
		expect(names([{ keyName: 'amount', condition: 'gte', keyValue: '120.5' }])).toEqual([
			'Harbor Cafe',
			'Cedar',
		]);
	});
});

import { resourceLookupsOf } from '@n8n/node-sdk/host';
import { toContract } from '@n8n/node-sdk/registry';

import { getManyDatabasePages } from '../nodes/notion/actions/database-page.get-all';

const fields = [
	{ name: 'Name', value: 'Name|title' },
	{ name: 'Status', value: 'Status|status' },
	{ name: 'Story Points', value: 'Story Points|number' },
	{ name: 'Rollup', value: 'Rollup|rollup' },
];

describe('notion.databasePage.getAll resourceOutput', () => {
	it('types every data source property and closes the key space', () => {
		const output = getManyDatabasePages.resourceOutput?.toOutput(fields, { database: 'x' });
		expect(output?.patternProperties).toBeUndefined();
		expect(output?.additionalProperties).toBe(false);
		expect(output?.properties).toMatchObject({
			property_name: { type: 'string' },
			property_status: { type: 'string' },
			property_story_points: { anyOf: [{ type: 'number' }, { type: 'null' }] },
			property_rollup: {},
		});
		expect(output?.required).toEqual([
			'id',
			'name',
			'url',
			'property_name',
			'property_status',
			'property_story_points',
		]);
	});

	it('keeps the filter-derived type of a property', () => {
		const output = getManyDatabasePages.resourceOutput?.toOutput(fields, {
			database: 'x',
			where: {
				match: 'all',
				conditions: [
					{
						property: 'Story Points',
						type: 'number',
						condition: { op: 'greater_than', value: 2 },
					},
				],
			},
		});
		expect(output?.properties?.property_story_points).toEqual({ type: 'number' });
		expect(output?.required?.filter((key) => key === 'property_story_points')).toHaveLength(1);
	});

	it('lists the properties with the legacy Notion node, data source first, then database', () => {
		const id = '0123456789abcdef0123456789abcdef';
		const calls = resourceLookupsOf(toContract(getManyDatabasePages), {
			database: `https://www.notion.so/Tasks-${id}`,
		});
		const legacy = {
			nodeType: 'n8n-nodes-base.notion',
			methodName: 'getFilterProperties',
		};
		const parameters = { resource: 'databasePage', operation: 'getAll' };
		const locator = { __rl: true, mode: 'id', value: id };
		expect(calls).toEqual([
			{ ...legacy, version: 3, currentNodeParameters: { ...parameters, dataSourceId: locator } },
			{ ...legacy, version: 2.2, currentNodeParameters: { ...parameters, databaseId: locator } },
		]);
	});
});

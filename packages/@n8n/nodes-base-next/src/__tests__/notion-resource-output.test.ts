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
});

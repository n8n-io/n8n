import { getNodeParameters, type INodeParameters } from 'n8n-workflow';

import { Baserow } from '../Baserow.node';
import { MULTI_STEP_DATE_OPERATORS } from '../GenericFunctions';

// Regression test for CAT-3999 / NODE-5693 (GH #35788, #35783):
// the `timezone` filter child gated on a sibling via an unsupported `'../'`
// prefix, so loading a workflow with a populated Filters collection threw
// "Could not resolve parameter dependencies. Max iterations reached!".

const properties = new Baserow().description.properties;

const resolve = (values: INodeParameters) =>
	getNodeParameters(properties, values, true, false, null, null);

/** Stored parameters as reported, with a single populated filter. */
const withFilter = (operator: string, value: string): INodeParameters => ({
	resource: 'row',
	operation: 'getAll',
	authentication: 'databaseToken',
	tableId: '1110755',
	returnAll: false,
	limit: 1,
	additionalOptions: {
		filters: { fields: [{ field: '9882393', operator, value }] },
	},
});

describe('Baserow filter description', () => {
	it('resolves a workflow with a populated filters collection', () => {
		expect(() =>
			resolve(
				withFilter('equal', "={{ $('Webhook Trigger').item.json.body.author_id || 'fallback' }}"),
			),
		).not.toThrow();
	});

	it('shows Timezone for a date operator', () => {
		const resolved = resolve(withFilter('date_is', '2026-06-17')) as INodeParameters;
		const [filter] = (resolved.additionalOptions as { filters: { fields: INodeParameters[] } })
			.filters.fields;

		expect(filter).toEqual({
			field: '9882393',
			operator: 'date_is',
			timezone: 'UTC',
			value: '2026-06-17',
		});
	});

	it('hides Timezone for a non-date operator', () => {
		const resolved = resolve(withFilter('equal', 'abc')) as INodeParameters;
		const [filter] = (resolved.additionalOptions as { filters: { fields: INodeParameters[] } })
			.filters.fields;

		expect(filter).not.toHaveProperty('timezone');
	});

	it('shows Timezone for every multi-step date operator', () => {
		for (const operator of MULTI_STEP_DATE_OPERATORS) {
			const resolved = resolve(withFilter(operator, '2026-06-17')) as INodeParameters;
			const [filter] = (resolved.additionalOptions as { filters: { fields: INodeParameters[] } })
				.filters.fields;

			expect(filter).toHaveProperty('timezone', 'UTC');
		}
	});

	it('preserves a stored non-default Timezone', () => {
		const stored: INodeParameters = {
			resource: 'row',
			operation: 'getAll',
			tableId: '1110755',
			additionalOptions: {
				filters: {
					fields: [
						{
							field: '9882393',
							operator: 'date_is',
							timezone: 'Europe/Berlin',
							value: '2026-06-17',
						},
					],
				},
			},
		};

		const resolved = getNodeParameters(
			properties,
			stored,
			false,
			false,
			null,
			null,
		) as INodeParameters;
		const [filter] = (resolved.additionalOptions as { filters: { fields: INodeParameters[] } })
			.filters.fields;

		expect(filter).toHaveProperty('timezone', 'Europe/Berlin');
	});
});

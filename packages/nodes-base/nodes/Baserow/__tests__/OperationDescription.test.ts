import { getNodeParameters, type INodeParameters } from 'n8n-workflow';

import { Baserow } from '../Baserow.node';
import { MULTI_STEP_DATE_OPERATORS } from '../GenericFunctions';

// Regression test for CAT-3999 / NODE-5693 (GH #35788, #35783):
// the `timezone` filter child gated on a sibling via an unsupported `'../'`
// prefix, so loading a workflow with a populated Filters collection threw
// "Could not resolve parameter dependencies. Max iterations reached!".

const properties = new Baserow().description.properties;

/** Stored parameters for a Get Many with a single populated filter. */
const withFilter = (filter: INodeParameters): INodeParameters => ({
	resource: 'row',
	operation: 'getAll',
	tableId: '1110755',
	additionalOptions: { filters: { fields: [{ field: '9882393', ...filter }] } },
});

const firstFilter = (values: INodeParameters, returnDefaults = true) => {
	const resolved = getNodeParameters(properties, values, returnDefaults, false, null, null);

	return (resolved?.additionalOptions as { filters: { fields: INodeParameters[] } }).filters
		.fields[0];
};

describe('Baserow filter description', () => {
	it('resolves a workflow with a populated filters collection', () => {
		const values = withFilter({
			operator: 'equal',
			value: "={{ $('Webhook Trigger').item.json.body.author_id || 'fallback' }}",
		});

		expect(() => firstFilter(values)).not.toThrow();
	});

	it.each([...MULTI_STEP_DATE_OPERATORS])('shows Timezone for operator %s', (operator) => {
		expect(firstFilter(withFilter({ operator, value: '2026-06-17' }))).toEqual({
			field: '9882393',
			operator,
			timezone: 'UTC',
			value: '2026-06-17',
		});
	});

	it('hides Timezone for a non-date operator', () => {
		expect(firstFilter(withFilter({ operator: 'equal', value: 'abc' }))).not.toHaveProperty(
			'timezone',
		);
	});

	it('preserves a stored non-default Timezone', () => {
		const stored = withFilter({
			operator: 'date_is',
			timezone: 'Europe/Berlin',
			value: '2026-06-17',
		});

		expect(firstFilter(stored, false)).toHaveProperty('timezone', 'Europe/Berlin');
	});
});

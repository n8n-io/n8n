import { orderCapabilityRows } from './capabilities';

describe('orderCapabilityRows', () => {
	it('puts rows with items before empty rows and keeps the base order in each group', () => {
		expect(
			orderCapabilityRows(['tools', 'workflows', 'agents'], {
				tools: 0,
				workflows: 2,
				agents: 0,
			}),
		).toEqual(['workflows', 'tools', 'agents']);

		expect(
			orderCapabilityRows(['tools', 'workflows', 'agents'], {
				tools: 1,
				workflows: 0,
				agents: 3,
			}),
		).toEqual(['tools', 'agents', 'workflows']);
	});

	it('keeps the base order when all rows are empty or all rows have items', () => {
		expect(orderCapabilityRows(['tools', 'workflows', 'agents'], {})).toEqual([
			'tools',
			'workflows',
			'agents',
		]);

		expect(
			orderCapabilityRows(['tools', 'workflows', 'agents'], {
				tools: 1,
				workflows: 1,
				agents: 1,
			}),
		).toEqual(['tools', 'workflows', 'agents']);
	});
});

import * as agentRouteNames from './agents';

describe('agent route names', () => {
	const values = Object.values(agentRouteNames);

	it('exposes strings only', () => {
		for (const value of values) {
			expect(typeof value).toBe('string');
		}
	});

	it('has unique values', () => {
		expect(new Set(values).size).toBe(values.length);
	});
});

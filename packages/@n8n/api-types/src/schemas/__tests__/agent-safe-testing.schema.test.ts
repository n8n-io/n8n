import { toolCallSimulationSchema } from '../agent-safe-testing.schema';

describe('toolCallSimulationSchema', () => {
	it.each([
		{ route: 'simulated', reason: 'served_from_world' },
		{ route: 'simulated_made_up', reason: 'invented_by_llm' },
		{ route: 'blocked', reason: 'not_simulatable', detail: 'Custom code' },
		{ route: 'real_read', reason: 'real_read_allowed' },
	])('accepts $route with $reason', (simulation) => {
		expect(toolCallSimulationSchema.safeParse(simulation).success).toBe(true);
	});

	it.each([
		{ route: 'blocked', reason: 'served_from_world' },
		{ route: 'simulated', reason: 'not_simulatable' },
		{ route: 'simulated_made_up', reason: 'served_from_world' },
	])('rejects $route with $reason', (simulation) => {
		expect(toolCallSimulationSchema.safeParse(simulation).success).toBe(false);
	});
});

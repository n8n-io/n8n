import { toolCallSimulationSchema, toolTestCapabilitySchema } from '../agent-safe-testing.schema';

describe('toolCallSimulationSchema', () => {
	it.each([
		{ route: 'simulated', reason: 'served_from_world' },
		{ route: 'simulated_made_up', reason: 'invented_by_llm' },
		{ route: 'blocked', reason: 'not_simulatable', detail: 'Custom code' },
	])('accepts $route with $reason', (simulation) => {
		expect(toolCallSimulationSchema.safeParse(simulation).success).toBe(true);
	});

	it.each([
		{ route: 'blocked', reason: 'served_from_world' },
		{ route: 'simulated', reason: 'not_simulatable' },
		{ route: 'simulated_made_up', reason: 'served_from_world' },
		{ route: 'real_read', reason: 'real_read_allowed' },
	])('rejects $route with $reason', (simulation) => {
		expect(toolCallSimulationSchema.safeParse(simulation).success).toBe(false);
	});
});

describe('toolTestCapabilitySchema', () => {
	it.each([
		{ toolName: 'send_slack', kind: 'node', testability: 'simulated' },
		{ toolName: 'run_code', kind: 'custom', testability: 'blocked', reason: 'not_simulatable' },
	])('accepts a $testability tool', (capability) => {
		expect(toolTestCapabilitySchema.safeParse(capability).success).toBe(true);
	});

	it.each([
		{ toolName: 'run_code', kind: 'custom', testability: 'blocked' },
		{ toolName: 'run_code', kind: 'custom', testability: 'blocked', reason: 'invented_by_llm' },
		{ toolName: 'send_slack', kind: 'node', testability: 'read_for_real' },
	])('rejects a contradictory capability (%o)', (capability) => {
		expect(toolTestCapabilitySchema.safeParse(capability).success).toBe(false);
	});
});

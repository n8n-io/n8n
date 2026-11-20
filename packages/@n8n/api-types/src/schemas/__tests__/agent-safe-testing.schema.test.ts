import {
	toolCallEvidenceSchema,
	toolCallSimulationSchema,
	toolTestCapabilitySchema,
} from '../agent-safe-testing.schema';

describe('toolCallSimulationSchema', () => {
	it.each([
		{ route: 'simulated', reason: 'served_from_world' },
		{ route: 'simulated_made_up', reason: 'invented_by_llm' },
		{ route: 'blocked', reason: 'not_simulatable', detail: 'Custom code' },
		{ route: 'simulated', reason: 'served_from_world', evidence: ['real_read', 'world_write'] },
		{ route: 'simulated_made_up', reason: 'invented_by_llm', evidence: ['world_read'] },
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

	it('leaves evidence out of the parsed value when it is absent', () => {
		const parsed = toolCallSimulationSchema.parse({
			route: 'simulated',
			reason: 'served_from_world',
		});

		expect(parsed).toEqual({ route: 'simulated', reason: 'served_from_world' });
		expect('evidence' in parsed).toBe(false);
	});

	it.each([
		{ name: 'an unknown value', evidence: ['live_write'] },
		{ name: 'free text', evidence: ['POST https://api.example.com/issues'] },
		{ name: 'an object', evidence: [{ kind: 'world_read', url: 'https://api.example.com' }] },
		{ name: 'a single value that is not a list', evidence: 'world_read' },
		{ name: 'a value twice', evidence: ['real_read', 'real_read'] },
		{ name: 'values out of the enum order', evidence: ['world_write', 'real_read'] },
		{ name: 'no values', evidence: [] },
	])('rejects evidence that holds $name', ({ evidence }) => {
		const simulation = { route: 'simulated', reason: 'served_from_world', evidence };

		expect(toolCallSimulationSchema.safeParse(simulation).success).toBe(false);
	});

	it('rejects evidence on a blocked call', () => {
		const simulation = { route: 'blocked', reason: 'not_simulatable', evidence: ['world_read'] };

		expect(toolCallSimulationSchema.safeParse(simulation).success).toBe(false);
	});
});

describe('toolCallEvidenceSchema', () => {
	it('is a closed list of backend-neutral values', () => {
		expect(toolCallEvidenceSchema.options).toEqual(['real_read', 'world_read', 'world_write']);
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

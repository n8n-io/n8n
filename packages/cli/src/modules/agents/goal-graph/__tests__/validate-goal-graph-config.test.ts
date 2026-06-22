import type { AgentJsonConfig } from '@n8n/api-types';

import { validateGoalGraphConfig } from '../validate-goal-graph-config';

function makeConfig(overrides: Partial<AgentJsonConfig>): AgentJsonConfig {
	return {
		name: 'Test',
		model: 'anthropic/claude-sonnet-4-5',
		instructions: 'Be helpful',
		...overrides,
	};
}

describe('validateGoalGraphConfig', () => {
	it('accepts a config without goals/slots', () => {
		expect(validateGoalGraphConfig(makeConfig({}))).toBeNull();
	});

	it('accepts a valid goal graph', () => {
		const config = makeConfig({
			slots: [{ name: 'customerId', type: 'string', source: 'tool' }],
			goals: [
				{ id: 'a', name: 'A', instructions: 'a' },
				{
					id: 'b',
					name: 'B',
					instructions: 'b',
					requires: ['a'],
					tools: [{ tool: 'extend_trial', outputMappings: { customerId: '={{ $json.id }}' } }],
				},
			],
		});
		expect(validateGoalGraphConfig(config)).toBeNull();
	});

	it('rejects unknown requires references', () => {
		const config = makeConfig({
			goals: [{ id: 'a', name: 'A', instructions: 'a', requires: ['missing'] }],
		});
		expect(validateGoalGraphConfig(config)).toContain('unknown goal "missing"');
	});

	it('rejects self-requires', () => {
		const config = makeConfig({
			goals: [{ id: 'a', name: 'A', instructions: 'a', requires: ['a'] }],
		});
		expect(validateGoalGraphConfig(config)).toContain('cannot require itself');
	});

	it('rejects cycles in requires', () => {
		const config = makeConfig({
			goals: [
				{ id: 'a', name: 'A', instructions: 'a', requires: ['b'] },
				{ id: 'b', name: 'B', instructions: 'b', requires: ['a'] },
			],
		});
		expect(validateGoalGraphConfig(config)).toContain('cycle');
	});

	it('rejects output mappings to undeclared slots', () => {
		const config = makeConfig({
			slots: [{ name: 'known', type: 'string', source: 'tool' }],
			goals: [
				{
					id: 'a',
					name: 'A',
					instructions: 'a',
					tools: [{ tool: 't', outputMappings: { unknownSlot: '={{ $json.x }}' } }],
				},
			],
		});
		expect(validateGoalGraphConfig(config)).toContain('unknown slot "unknownSlot"');
	});
});

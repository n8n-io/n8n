import type { AgentJsonConfig } from '@n8n/api-types';

import { findUnknownGoalTools, validateGoalGraphConfig } from '../validate-goal-graph-config';

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
			slots: [{ name: 'customerId', type: 'string', access: 'protected' }],
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
			slots: [{ name: 'known', type: 'string', access: 'protected' }],
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

describe('findUnknownGoalTools', () => {
	const config = makeConfig({
		goals: [
			{ id: 'verify', name: 'Verify', instructions: 'v', tools: [{ tool: 'lookup_customer' }] },
		],
	});

	it('returns null when every attachment resolves to an available tool', () => {
		expect(findUnknownGoalTools(config, new Set(['lookup_customer']))).toBeNull();
	});

	it('flags an attachment whose tool the agent does not have, listing the real names', () => {
		const error = findUnknownGoalTools(config, new Set(['verify_customer']));
		expect(error).toContain('"lookup_customer"');
		expect(error).toContain('verify_customer');
	});

	it('returns null when there are no goals', () => {
		expect(findUnknownGoalTools(makeConfig({}), new Set())).toBeNull();
	});
});

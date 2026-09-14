import { describe, expect, it } from 'vitest';

import { Agent } from '../agent';

describe('Agent reasoning configuration', () => {
	it('keeps provider-specific thinking available alongside generic reasoning', () => {
		const agent = new Agent('thinker')
			.model('anthropic', 'claude-sonnet-4-5')
			.thinking('anthropic', { budgetTokens: 4096 })
			.reasoning('high');

		expect(agent.snapshot.thinking).toEqual({ budgetTokens: 4096 });
		expect(agent.snapshot.reasoning).toBe('high');
	});
});

import { describe, expect, it } from 'vitest';
import type { AgentCapabilitySummary } from '@n8n/api-types';

import { isAgentWorthTesting, testAgentOfferKey } from '../testAgentOffer';

function summary(overrides: Partial<AgentCapabilitySummary> = {}): AgentCapabilitySummary {
	return {
		id: 'agent-1',
		name: 'Trip Planner',
		model: { provider: 'anthropic', model: 'claude-sonnet-4-5' },
		channels: [],
		tools: [],
		mcpServers: [],
		skills: [],
		tasks: [],
		...overrides,
	};
}

const tool: AgentCapabilitySummary['tools'][number] = { type: 'custom', name: 'search' };
const skill: AgentCapabilitySummary['skills'][number] = { id: 'skill-1', name: 'plan' };

describe('testAgentOfferKey', () => {
	it('scopes the dismissal to the agent', () => {
		expect(testAgentOfferKey('agent-1')).toBe('test-agent:agent-1');
		expect(testAgentOfferKey('agent-2')).not.toBe(testAgentOfferKey('agent-1'));
	});
});

describe('isAgentWorthTesting', () => {
	it('is false before the capability summary resolves', () => {
		expect(isAgentWorthTesting(null)).toBe(false);
	});

	it('is false without a model', () => {
		expect(isAgentWorthTesting(summary({ model: null, tools: [tool] }))).toBe(false);
	});

	it('is false with a model but no tools or skills', () => {
		expect(isAgentWorthTesting(summary())).toBe(false);
	});

	it('is true with a model and a tool', () => {
		expect(isAgentWorthTesting(summary({ tools: [tool] }))).toBe(true);
	});

	it('is true with a model and a skill', () => {
		expect(isAgentWorthTesting(summary({ skills: [skill] }))).toBe(true);
	});
});

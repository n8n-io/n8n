/* eslint-disable import-x/order, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import type { Mock } from 'vitest';

const mockAgentInstances: Array<{ thinking: Mock }> = [];

vi.mock('@n8n/agents', () => ({
	Agent: vi.fn().mockImplementation(function Agent(this: (typeof mockAgentInstances)[number]) {
		this.thinking = vi.fn().mockReturnThis();
		mockAgentInstances.push(this);
	}),
}));

import { Agent as AgentImport } from '@n8n/agents';

import { applyAgentThinking } from '../apply-agent-thinking';

const Agent = AgentImport as unknown as Mock;

describe('applyAgentThinking', () => {
	beforeEach(() => {
		mockAgentInstances.length = 0;
		vi.clearAllMocks();
	});

	it('enables adaptive thinking for Anthropic', () => {
		const agent = new Agent('test');
		applyAgentThinking(agent, 'anthropic/claude-opus-4-8');
		expect(mockAgentInstances[0]?.thinking).toHaveBeenCalledWith('anthropic', { mode: 'adaptive' });
	});

	it('enables OpenAI reasoning for supported models', () => {
		const agent = new Agent('test');
		applyAgentThinking(agent, 'openai/gpt-5.5');
		expect(mockAgentInstances[0]?.thinking).toHaveBeenCalledWith('openai', {
			reasoningEffort: 'high',
		});
	});

	it('skips providers without thinking support', () => {
		const agent = new Agent('test');
		applyAgentThinking(agent, 'google/gemini-2.5-pro');
		expect(mockAgentInstances[0]?.thinking).not.toHaveBeenCalled();
	});
});

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

	it('enables adaptive thinking with medium effort for Anthropic', () => {
		const agent = new Agent('test');
		applyAgentThinking(agent, 'anthropic/claude-opus-4-8');
		expect(mockAgentInstances[0]?.thinking).toHaveBeenCalledWith('anthropic', {
			mode: 'adaptive',
			effort: 'medium',
		});
	});

	it('enables adaptive thinking with medium effort for dotted Anthropic provider IDs', () => {
		const agent = new Agent('test');
		applyAgentThinking(agent, 'anthropic.messages/claude-opus-4-8');
		expect(mockAgentInstances[0]?.thinking).toHaveBeenCalledWith('anthropic', {
			mode: 'adaptive',
			effort: 'medium',
		});
	});

	it('enables adaptive thinking with medium effort for AI SDK Anthropic model objects', () => {
		const agent = new Agent('test');
		applyAgentThinking(agent, {
			modelId: 'claude-opus-4-8',
			config: { provider: 'anthropic.messages' },
		} as unknown as Parameters<typeof applyAgentThinking>[1]);
		expect(mockAgentInstances[0]?.thinking).toHaveBeenCalledWith('anthropic', {
			mode: 'adaptive',
			effort: 'medium',
		});
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

	it('enables medium reasoning effort for Kimi K3 via OpenRouter', () => {
		const agent = new Agent('test');
		applyAgentThinking(agent, 'openrouter/moonshotai/kimi-k3');
		expect(mockAgentInstances[0]?.thinking).toHaveBeenCalledWith('openrouter', {
			reasoningEffort: 'medium',
		});
	});

	it('enables medium reasoning effort for Grok 4.5 via OpenRouter', () => {
		const agent = new Agent('test');
		applyAgentThinking(agent, 'openrouter/x-ai/grok-4.5');
		expect(mockAgentInstances[0]?.thinking).toHaveBeenCalledWith('openrouter', {
			reasoningEffort: 'medium',
		});
	});

	it('enables medium reasoning effort for Grok 4.5 via xAI', () => {
		const agent = new Agent('test');
		applyAgentThinking(agent, 'xai/grok-4.5');
		expect(mockAgentInstances[0]?.thinking).toHaveBeenCalledWith('xai', {
			reasoningEffort: 'medium',
		});
	});

	it('skips OpenRouter models without a pinned-effort default', () => {
		const agent = new Agent('test');
		applyAgentThinking(agent, 'openrouter/openai/gpt-4o');
		expect(mockAgentInstances[0]?.thinking).not.toHaveBeenCalled();
	});

	it('skips xAI models that are not Grok 4.5', () => {
		const agent = new Agent('test');
		applyAgentThinking(agent, 'xai/grok-3');
		expect(mockAgentInstances[0]?.thinking).not.toHaveBeenCalled();
	});
});

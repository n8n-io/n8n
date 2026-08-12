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
		applyAgentThinking(agent, 'anthropic/claude-opus-5');
		expect(mockAgentInstances[0]?.thinking).toHaveBeenCalledWith('anthropic', {
			mode: 'adaptive',
			effort: 'medium',
		});
	});

	it('enables adaptive thinking with medium effort for Google Vertex Anthropic', () => {
		const agent = new Agent('test');
		applyAgentThinking(agent, 'google-vertex-anthropic/claude-opus-4-8');
		expect(mockAgentInstances[0]?.thinking).toHaveBeenCalledWith('google-vertex-anthropic', {
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

	it.each(['openai/gpt-5.6-sol', 'openai/gpt-5.6-terra', 'openai/gpt-5.6-luna'] as const)(
		'enables medium OpenAI reasoning effort for %s',
		(modelId) => {
			const agent = new Agent('test');
			applyAgentThinking(agent, modelId);
			expect(mockAgentInstances[0]?.thinking).toHaveBeenCalledWith('openai', {
				reasoningEffort: 'medium',
			});
		},
	);

	it('enables high OpenAI reasoning effort for non-GPT-5.6 models', () => {
		const agent = new Agent('test');
		applyAgentThinking(agent, 'openai/gpt-4.1');
		expect(mockAgentInstances[0]?.thinking).toHaveBeenCalledWith('openai', {
			reasoningEffort: 'high',
		});
	});

	it('enables mapped low reasoning effort for known custom Kimi K3 models', () => {
		const agent = new Agent('test');
		applyAgentThinking(agent, 'custom/Kimi-K3');
		expect(mockAgentInstances[0]?.thinking).toHaveBeenCalledWith('custom', {
			reasoningEffort: 'low',
		});
	});

	it('enables mapped low reasoning effort for Databricks AI Gateway Kimi-K3', () => {
		const agent = new Agent('test');
		applyAgentThinking(agent, 'custom/workspace.default.kimi-k3');
		expect(mockAgentInstances[0]?.thinking).toHaveBeenCalledWith('custom', {
			reasoningEffort: 'low',
		});
	});

	it('skips thinking for unknown custom models without an env override', () => {
		const agent = new Agent('test');
		applyAgentThinking(agent, 'custom/unknown-model');
		expect(mockAgentInstances[0]?.thinking).not.toHaveBeenCalled();
	});

	it('prefers N8N_INSTANCE_AI_REASONING_EFFORT over the known-model map', () => {
		const previous = process.env.N8N_INSTANCE_AI_REASONING_EFFORT;
		process.env.N8N_INSTANCE_AI_REASONING_EFFORT = 'high';
		try {
			const agent = new Agent('test');
			applyAgentThinking(agent, 'custom/Kimi-K3');
			expect(mockAgentInstances[0]?.thinking).toHaveBeenCalledWith('custom', {
				reasoningEffort: 'high',
			});
		} finally {
			if (previous === undefined) delete process.env.N8N_INSTANCE_AI_REASONING_EFFORT;
			else process.env.N8N_INSTANCE_AI_REASONING_EFFORT = previous;
		}
	});

	it('skips providers without thinking support', () => {
		const agent = new Agent('test');
		applyAgentThinking(agent, 'google/gemini-2.5-pro');
		expect(mockAgentInstances[0]?.thinking).not.toHaveBeenCalled();
	});

	it('skips OpenRouter models (thinking unsupported)', () => {
		const agent = new Agent('test');
		applyAgentThinking(agent, 'openrouter/moonshotai/kimi-k3');
		expect(mockAgentInstances[0]?.thinking).not.toHaveBeenCalled();
	});

	it('enables medium reasoning effort for Grok 4.5 via xAI', () => {
		const agent = new Agent('test');
		applyAgentThinking(agent, 'xai/grok-4.5');
		expect(mockAgentInstances[0]?.thinking).toHaveBeenCalledWith('xai', {
			reasoningEffort: 'medium',
		});
	});

	it('skips xAI models that are not Grok 4.5', () => {
		const agent = new Agent('test');
		applyAgentThinking(agent, 'xai/grok-3');
		expect(mockAgentInstances[0]?.thinking).not.toHaveBeenCalled();
	});
});

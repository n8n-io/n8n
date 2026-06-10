/* eslint-disable import-x/order */
import type { Mock } from 'vitest';

type MockAgentInstance = {
	model: Mock;
	instructions: Mock;
	thinking: Mock;
};

const mockAgentInstances: MockAgentInstance[] = [];

vi.mock('@n8n/agents', () => ({
	Agent: vi.fn().mockImplementation(function Agent(this: MockAgentInstance) {
		this.model = vi.fn().mockReturnThis();
		this.instructions = vi.fn().mockReturnThis();
		this.thinking = vi.fn().mockReturnThis();
		mockAgentInstances.push(this);
	}),
	Tool: vi.fn(),
}));

import { createEvalAgent, resolveEvalModelConfig } from '../eval-agents';

const ORIGINAL_ENV = { ...process.env };
const MODEL_ENV_KEYS = [
	'N8N_INSTANCE_AI_MODEL',
	'N8N_INSTANCE_AI_EVAL_MODEL',
	'N8N_INSTANCE_AI_MODEL_API_KEY',
	'N8N_AI_ANTHROPIC_KEY',
	'ANTHROPIC_API_KEY',
	'OPENAI_API_KEY',
	'GOOGLE_GENERATIVE_AI_API_KEY',
	'XAI_API_KEY',
];

function resetModelEnv(): void {
	process.env = { ...ORIGINAL_ENV };
	for (const key of MODEL_ENV_KEYS) {
		delete process.env[key];
	}
}

describe('eval agent model config', () => {
	beforeEach(() => {
		resetModelEnv();
		mockAgentInstances.length = 0;
		vi.clearAllMocks();
	});

	afterAll(() => {
		process.env = ORIGINAL_ENV;
	});

	it('keeps the legacy Anthropic key fallback for eval models', () => {
		process.env.N8N_AI_ANTHROPIC_KEY = 'legacy-anthropic-key';

		const config = resolveEvalModelConfig();

		expect(config.modelId).toBe('anthropic/claude-sonnet-4-6');
		expect(config.apiKey).toBe('legacy-anthropic-key');
	});

	it('prefers the generic eval model key over provider-specific keys', () => {
		process.env.N8N_INSTANCE_AI_MODEL_API_KEY = 'generic-key';
		process.env.N8N_AI_ANTHROPIC_KEY = 'legacy-anthropic-key';
		process.env.ANTHROPIC_API_KEY = 'provider-key';

		const config = resolveEvalModelConfig('anthropic/claude-sonnet-4-6');

		expect(config.apiKey).toBe('generic-key');
	});

	it('does not enable OpenAI reasoning when thinking is omitted', () => {
		process.env.OPENAI_API_KEY = 'openai-key';

		createEvalAgent('test-agent', {
			model: 'openai/gpt-5.5',
			instructions: 'Do the task.',
		});

		expect(mockAgentInstances[0]?.thinking).not.toHaveBeenCalled();
	});

	it('enables OpenAI reasoning only when thinking is requested', () => {
		process.env.OPENAI_API_KEY = 'openai-key';

		createEvalAgent('test-agent', {
			model: 'openai/gpt-5.5',
			instructions: 'Do the task.',
			thinking: 'adaptive',
		});

		expect(mockAgentInstances[0]?.thinking).toHaveBeenCalledWith('openai', {
			reasoningEffort: 'high',
		});
	});

	it('keeps Anthropic budgeted thinking provider-specific', () => {
		process.env.N8N_AI_ANTHROPIC_KEY = 'anthropic-key';

		createEvalAgent('test-agent', {
			model: 'anthropic/claude-sonnet-4-6',
			instructions: 'Do the task.',
			thinking: { budgetTokens: 2048 },
		});

		expect(mockAgentInstances[0]?.thinking).toHaveBeenCalledWith('anthropic', {
			mode: 'enabled',
			budgetTokens: 2048,
		});
	});
});

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

import { createEvalAgent, getShadowJudgeModel, resolveEvalModelConfig } from '../eval-agents';

const ORIGINAL_ENV = { ...process.env };
const MODEL_ENV_KEYS = [
	'N8N_INSTANCE_AI_MODEL',
	'N8N_INSTANCE_AI_MODEL_URL',
	'N8N_INSTANCE_AI_EVAL_MODEL',
	'N8N_INSTANCE_AI_EVAL_MOCK_MODEL',
	'N8N_INSTANCE_AI_EVAL_JUDGE_MODEL',
	'N8N_INSTANCE_AI_EVAL_SHADOW_JUDGE_MODEL',
	'N8N_INSTANCE_AI_MODEL_API_KEY',
	'N8N_AI_ANTHROPIC_KEY',
	'ANTHROPIC_API_KEY',
	'OPENAI_API_KEY',
	'OPENROUTER_API_KEY',
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

	it('enables thinking for supported eval models', () => {
		process.env.OPENAI_API_KEY = 'openai-key';

		createEvalAgent('test-agent', {
			model: 'openai/gpt-5.5',
			instructions: 'Do the task.',
		});

		expect(mockAgentInstances[0]?.thinking).toHaveBeenCalledWith('openai', {
			reasoningEffort: 'high',
		});
	});

	it('throws without env keys or a fallback model config', () => {
		expect(() => createEvalAgent('test-agent', { instructions: 'Do the task.' })).toThrow(
			/Missing API key/,
		);
	});

	it('uses the fallback model config when no env API key is configured', () => {
		const fallbackModelConfig = {
			id: 'anthropic/claude-opus-4-8' as const,
			url: 'https://proxy.example.com/anthropic/v1',
			apiKey: 'proxy-token',
		};

		createEvalAgent('test-agent', {
			instructions: 'Do the task.',
			fallbackModelConfig,
		});

		expect(mockAgentInstances[0]?.model).toHaveBeenCalledWith(fallbackModelConfig);
		expect(mockAgentInstances[0]?.thinking).toHaveBeenCalledWith('anthropic', {
			mode: 'adaptive',
		});
	});

	it('prefers env-based model resolution over the fallback', () => {
		process.env.N8N_AI_ANTHROPIC_KEY = 'env-key';

		createEvalAgent('test-agent', {
			instructions: 'Do the task.',
			fallbackModelConfig: { id: 'anthropic/claude-opus-4-8' as const, url: '', apiKey: 'jwt' },
		});

		expect(mockAgentInstances[0]?.model).toHaveBeenCalledWith({
			id: 'anthropic/claude-sonnet-4-6',
			apiKey: 'env-key',
			url: undefined,
		});
	});

	describe('role model overrides', () => {
		it('role env takes precedence over an explicit model for that role', () => {
			process.env.N8N_INSTANCE_AI_EVAL_JUDGE_MODEL = 'openrouter/moonshotai/kimi-k3';
			process.env.OPENROUTER_API_KEY = 'or-key';

			const config = resolveEvalModelConfig('anthropic/claude-sonnet-4-6', 'judge');

			expect(config.modelId).toBe('openrouter/moonshotai/kimi-k3');
			expect(config.provider).toBe('openrouter');
			expect(config.providerModelId).toBe('moonshotai/kimi-k3');
			expect(config.apiKey).toBe('or-key');
		});

		it('falls back to the explicit model when the role env is unset', () => {
			process.env.N8N_AI_ANTHROPIC_KEY = 'anthropic-key';

			const config = resolveEvalModelConfig('anthropic/claude-sonnet-4-6', 'judge');

			expect(config.modelId).toBe('anthropic/claude-sonnet-4-6');
			expect(config.apiKey).toBe('anthropic-key');
		});

		it('mock role env wins over the shared eval model env', () => {
			process.env.N8N_INSTANCE_AI_EVAL_MODEL = 'anthropic/claude-sonnet-4-6';
			process.env.N8N_INSTANCE_AI_EVAL_MOCK_MODEL = 'openrouter/moonshotai/kimi-k3';
			process.env.OPENROUTER_API_KEY = 'or-key';

			const config = resolveEvalModelConfig(undefined, 'mock');

			expect(config.modelId).toBe('openrouter/moonshotai/kimi-k3');
		});

		it('one role override does not move the other role', () => {
			process.env.N8N_INSTANCE_AI_EVAL_MOCK_MODEL = 'openrouter/moonshotai/kimi-k3';
			process.env.OPENROUTER_API_KEY = 'or-key';
			process.env.N8N_AI_ANTHROPIC_KEY = 'anthropic-key';

			const config = resolveEvalModelConfig(undefined, 'judge');

			expect(config.modelId).toBe('anthropic/claude-sonnet-4-6');
			expect(config.apiKey).toBe('anthropic-key');
		});
	});

	describe('openrouter key and url resolution', () => {
		it('native OPENROUTER_API_KEY beats the generic key for openrouter models only', () => {
			process.env.N8N_INSTANCE_AI_MODEL_API_KEY = 'generic-anthropic-key';
			process.env.OPENROUTER_API_KEY = 'or-key';

			expect(resolveEvalModelConfig('openrouter/moonshotai/kimi-k3').apiKey).toBe('or-key');
			expect(resolveEvalModelConfig('anthropic/claude-sonnet-4-6').apiKey).toBe(
				'generic-anthropic-key',
			);
		});

		it('falls back to the generic key when OPENROUTER_API_KEY is empty', () => {
			process.env.N8N_INSTANCE_AI_MODEL_API_KEY = 'or-key-via-generic';
			process.env.OPENROUTER_API_KEY = '';

			expect(resolveEvalModelConfig('openrouter/moonshotai/kimi-k3').apiKey).toBe(
				'or-key-via-generic',
			);
		});

		it('does not apply the generic URL override to openrouter models', () => {
			process.env.N8N_INSTANCE_AI_MODEL_URL = 'https://anthropic-proxy.example.com/v1';
			process.env.N8N_AI_ANTHROPIC_KEY = 'anthropic-key';
			process.env.OPENROUTER_API_KEY = 'or-key';

			expect(resolveEvalModelConfig('openrouter/moonshotai/kimi-k3').url).toBeUndefined();
			expect(resolveEvalModelConfig('anthropic/claude-sonnet-4-6').url).toBe(
				'https://anthropic-proxy.example.com/v1',
			);
		});
	});

	describe('getShadowJudgeModel', () => {
		it('returns undefined when unset or blank, the trimmed value otherwise', () => {
			expect(getShadowJudgeModel()).toBeUndefined();
			process.env.N8N_INSTANCE_AI_EVAL_SHADOW_JUDGE_MODEL = '  ';
			expect(getShadowJudgeModel()).toBeUndefined();
			process.env.N8N_INSTANCE_AI_EVAL_SHADOW_JUDGE_MODEL = ' openrouter/moonshotai/kimi-k3 ';
			expect(getShadowJudgeModel()).toBe('openrouter/moonshotai/kimi-k3');
		});
	});
});

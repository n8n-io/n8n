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

import type { GenerateResult } from '@n8n/agents';

import {
	createEvalAgent,
	extractText,
	isRetryableEvalError,
	resolveEvalModelConfig,
} from '../eval-agents';

const ORIGINAL_ENV = { ...process.env };
const MODEL_ENV_KEYS = [
	'N8N_INSTANCE_AI_MODEL',
	'N8N_INSTANCE_AI_EVAL_MODEL',
	'N8N_INSTANCE_AI_MODEL_API_KEY',
	'N8N_INSTANCE_AI_MODEL_URL',
	'EVAL_MODAL_LLM_HEADERS',
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

	it('enables thinking for supported eval models', () => {
		process.env.OPENAI_API_KEY = 'openai-key';

		createEvalAgent('test-agent', {
			model: 'openai/gpt-5.6-sol',
			instructions: 'Do the task.',
		});

		expect(mockAgentInstances[0]?.thinking).toHaveBeenCalledWith('openai', {
			reasoningEffort: 'medium',
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
			effort: 'medium',
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

	it('supports custom endpoints that authenticate with EVAL_MODAL_LLM_HEADERS only', () => {
		process.env.N8N_INSTANCE_AI_MODEL = 'custom/moonshotai/Kimi-K3';
		process.env.N8N_INSTANCE_AI_MODEL_URL = 'https://example.modal.direct/v1';
		process.env.EVAL_MODAL_LLM_HEADERS = '{"Modal-Key":"wk-test","Modal-Secret":"ws-test"}';

		const config = resolveEvalModelConfig();

		expect(config).toMatchObject({
			modelId: 'custom/moonshotai/Kimi-K3',
			apiKey: '',
			url: 'https://example.modal.direct/v1',
			headers: { 'Modal-Key': 'wk-test', 'Modal-Secret': 'ws-test' },
		});

		createEvalAgent('test-agent', { instructions: 'Do the task.' });

		expect(mockAgentInstances[0]?.model).toHaveBeenCalledWith({
			id: 'custom/moonshotai/Kimi-K3',
			apiKey: '',
			url: 'https://example.modal.direct/v1',
			headers: { 'Modal-Key': 'wk-test', 'Modal-Secret': 'ws-test' },
		});
	});

	it('supports keyless custom/* OpenAI-compatible routers (URL only, no API key)', () => {
		process.env.N8N_INSTANCE_AI_MODEL = 'custom/Kimi-K3';
		process.env.N8N_INSTANCE_AI_MODEL_URL = 'https://router.example.com/v1';

		const config = resolveEvalModelConfig();

		expect(config).toMatchObject({
			modelId: 'custom/Kimi-K3',
			provider: 'custom',
			providerModelId: 'Kimi-K3',
			apiKey: '',
			url: 'https://router.example.com/v1',
		});

		createEvalAgent('test-agent', { instructions: 'Do the task.' });

		expect(mockAgentInstances[0]?.model).toHaveBeenCalledWith({
			id: 'custom/Kimi-K3',
			apiKey: '',
			url: 'https://router.example.com/v1',
		});
	});

	it('still requires an API key for custom/* without a model URL', () => {
		process.env.N8N_INSTANCE_AI_MODEL = 'custom/Kimi-K3';

		expect(() => resolveEvalModelConfig()).toThrow(
			/Missing API key for eval model "custom\/Kimi-K3"/,
		);
	});

	it('keeps Anthropic eval model separate from a custom/* builder (no builder URL/key leak)', () => {
		process.env.N8N_INSTANCE_AI_MODEL = 'custom/Kimi-K3';
		process.env.N8N_INSTANCE_AI_MODEL_URL = 'https://router.example.com/v1';
		process.env.N8N_INSTANCE_AI_MODEL_API_KEY = '';
		process.env.N8N_INSTANCE_AI_EVAL_MODEL = 'anthropic/claude-sonnet-4-6';
		process.env.ANTHROPIC_API_KEY = 'anthropic-eval-key';

		const config = resolveEvalModelConfig();

		expect(config).toEqual({
			modelId: 'anthropic/claude-sonnet-4-6',
			provider: 'anthropic',
			providerModelId: 'claude-sonnet-4-6',
			apiKey: 'anthropic-eval-key',
			url: undefined,
			headers: undefined,
		});
	});

	it('prefers Anthropic keys over a non-Anthropic builder MODEL_API_KEY for the eval model', () => {
		process.env.N8N_INSTANCE_AI_MODEL = 'openai/gpt-5.6-sol';
		process.env.N8N_INSTANCE_AI_MODEL_API_KEY = 'openai-builder-key';
		process.env.N8N_INSTANCE_AI_EVAL_MODEL = 'anthropic/claude-sonnet-4-6';
		process.env.ANTHROPIC_API_KEY = 'anthropic-eval-key';

		expect(resolveEvalModelConfig()).toMatchObject({
			modelId: 'anthropic/claude-sonnet-4-6',
			apiKey: 'anthropic-eval-key',
			url: undefined,
		});
	});
});

describe('extractText', () => {
	const failed = (error: unknown) =>
		({ messages: [], finishReason: 'error', error }) as unknown as GenerateResult;

	it('joins the assistant text parts', () => {
		const result = {
			messages: [
				{ role: 'user', content: [{ type: 'text', text: 'ignored' }] },
				{
					role: 'assistant',
					content: [
						{ type: 'text', text: '{"a":' },
						{ type: 'text', text: '1}' },
					],
				},
			],
			finishReason: 'stop',
		} as unknown as GenerateResult;
		expect(extractText(result)).toBe('{"a":1}');
	});

	it('throws the model error with its status instead of returning empty text', () => {
		const apiError = Object.assign(new Error('invalid x-api-key'), {
			statusCode: 401,
			isRetryable: false,
		});
		expect(() => extractText(failed(apiError))).toThrow(
			'Eval model provider call failed (HTTP 401): invalid x-api-key',
		);
	});

	it('reads the status from the last error when the SDK retries ran out', () => {
		const lastError = Object.assign(new Error('Service Unavailable'), {
			statusCode: 503,
			isRetryable: true,
		});
		const retryError = Object.assign(
			new Error('Failed after 3 attempts. Last error: Service Unavailable'),
			{ lastError },
		);
		expect(() => extractText(failed(retryError))).toThrow(
			'Eval model provider call failed (HTTP 503): Failed after 3 attempts. Last error: Service Unavailable',
		);
	});

	it('throws a readable message for a non-Error failure', () => {
		expect(() => extractText(failed('socket closed'))).toThrow(
			'Eval model provider call failed: socket closed',
		);
	});

	it('marks a failure the provider will not recover from as not retryable', () => {
		const call = (error: unknown) => {
			try {
				extractText(failed(error));
			} catch (thrown) {
				return thrown;
			}
			throw new Error('expected a throw');
		};
		expect(isRetryableEvalError(call({ statusCode: 401, isRetryable: false }))).toBe(false);
		expect(isRetryableEvalError(call({ statusCode: 529, isRetryable: true }))).toBe(true);
		expect(isRetryableEvalError(call(new Error('fetch failed')))).toBe(true);
		expect(isRetryableEvalError(new Error('unusable shape'))).toBe(true);
	});
});

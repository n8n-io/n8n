import type { Mock } from 'vitest';

type MockAgentInstance = {
	model: Mock;
	instructions: Mock;
	thinking: Mock;
	configuration: Mock;
	telemetry: Mock;
	modelFetch: Mock;
	functionId: Mock;
};

const mockAgentInstances: MockAgentInstance[] = [];

vi.mock('@n8n/agents', () => ({
	Agent: vi.fn().mockImplementation(function Agent(this: MockAgentInstance) {
		this.model = vi.fn().mockReturnThis();
		this.instructions = vi.fn().mockReturnThis();
		this.thinking = vi.fn().mockReturnThis();
		this.configuration = vi.fn().mockReturnThis();
		this.telemetry = vi.fn().mockReturnThis();
		this.modelFetch = vi.fn().mockReturnThis();
		this.functionId = vi.fn().mockReturnThis();
		mockAgentInstances.push(this);
	}),
	Tool: vi.fn(),
}));

import type { GenerateResult } from '@n8n/agents';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
	JUDGE_MODEL,
	createEvalAgent,
	extractText,
	isRetryableEvalError,
	resolveEvalModelConfig,
	resolveJudgeModel,
} from '../eval-agents';

const ORIGINAL_ENV = { ...process.env };
const MODEL_ENV_KEYS = [
	'N8N_INSTANCE_AI_MODEL',
	'N8N_INSTANCE_AI_EVAL_MODEL',
	'N8N_INSTANCE_AI_MODEL_API_KEY',
	'N8N_INSTANCE_AI_MODEL_URL',
	'N8N_INSTANCE_AI_MODEL_REQUEST_LABELS_FILE',
	'N8N_INSTANCE_AI_EVAL_MODEL_URL',
	'N8N_INSTANCE_AI_EVAL_MODEL_API_KEY',
	'EVAL_MODAL_LLM_HEADERS',
	'N8N_AI_ANTHROPIC_KEY',
	'ANTHROPIC_API_KEY',
	'OPENAI_API_KEY',
	'GOOGLE_GENERATIVE_AI_API_KEY',
	'XAI_API_KEY',
	'N8N_INSTANCE_AI_EVAL_EFFORT',
	'N8N_INSTANCE_AI_EVAL_JUDGE_MODEL',
	'N8N_INSTANCE_AI_EVAL_JUDGE_EFFORT',
	'N8N_INSTANCE_AI_EVAL_USAGE_LOG',
	'N8N_INSTANCE_AI_MODEL_REQUEST_LABELS',
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

	it('attaches caller telemetry to helper agents', () => {
		process.env.N8N_AI_ANTHROPIC_KEY = 'test';
		const telemetry = {
			enabled: true,
			recordInputs: false,
			recordOutputs: false,
			integrations: [],
		};
		createEvalAgent('helper', { instructions: 'test', telemetry });
		expect(mockAgentInstances[0]?.telemetry).toHaveBeenCalledWith(telemetry);
	});

	it('keeps the legacy Anthropic key fallback for eval models', () => {
		process.env.N8N_AI_ANTHROPIC_KEY = 'legacy-anthropic-key';

		const config = resolveEvalModelConfig();

		expect(config.modelId).toBe('anthropic/claude-sonnet-5-5');
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
		const modelFetch = vi.fn();

		createEvalAgent('test-agent', {
			instructions: 'Do the task.',
			fallbackModelConfig,
			modelFetch,
		});

		expect(mockAgentInstances[0]?.model).toHaveBeenCalledWith(fallbackModelConfig);
		expect(mockAgentInstances[0]?.modelFetch).toHaveBeenCalledWith(modelFetch);
		expect(mockAgentInstances[0]?.functionId).not.toHaveBeenCalled();
		expect(mockAgentInstances[0]?.thinking).toHaveBeenCalledWith('anthropic', {
			mode: 'adaptive',
			effort: 'medium',
		});
	});

	it('names the caller only when model request labels are on', () => {
		process.env.N8N_AI_ANTHROPIC_KEY = 'env-key';
		process.env.N8N_INSTANCE_AI_MODEL_REQUEST_LABELS = 'true';
		try {
			createEvalAgent('test-agent', { instructions: 'Do the task.' });
		} finally {
			delete process.env.N8N_INSTANCE_AI_MODEL_REQUEST_LABELS;
		}

		expect(mockAgentInstances[0]?.functionId).toHaveBeenCalledWith('test-agent');
	});

	it('reads the request labels switch from its _FILE form, as @n8n/config does', () => {
		process.env.N8N_AI_ANTHROPIC_KEY = 'env-key';
		const dir = mkdtempSync(path.join(tmpdir(), 'labels-'));
		const file = path.join(dir, 'flag');
		writeFileSync(file, 'true\n');
		process.env.N8N_INSTANCE_AI_MODEL_REQUEST_LABELS_FILE = file;

		try {
			createEvalAgent('test-agent', { instructions: 'Do the task.' });
		} finally {
			rmSync(dir, { recursive: true });
		}

		expect(mockAgentInstances[0]?.functionId).toHaveBeenCalledWith('test-agent');
	});

	it.each(['true ', '"true"', 'yes'])(
		'stays off for %j, which @n8n/config also reads as off',
		(value) => {
			process.env.N8N_AI_ANTHROPIC_KEY = 'env-key';
			process.env.N8N_INSTANCE_AI_MODEL_REQUEST_LABELS = value;

			createEvalAgent('test-agent', { instructions: 'Do the task.' });

			expect(mockAgentInstances[0]?.functionId).not.toHaveBeenCalled();
		},
	);

	it('turns a helper name with spaces or slashes into a safe caller id', () => {
		process.env.N8N_AI_ANTHROPIC_KEY = 'env-key';
		process.env.N8N_INSTANCE_AI_MODEL_REQUEST_LABELS = 'true';

		createEvalAgent('eval mock/Slack node', { instructions: 'Do the task.' });

		expect(mockAgentInstances[0]?.functionId).toHaveBeenCalledWith('eval-mock-Slack-node');
	});

	it('prefers env-based model resolution over the fallback', () => {
		process.env.N8N_AI_ANTHROPIC_KEY = 'env-key';

		createEvalAgent('test-agent', {
			instructions: 'Do the task.',
			fallbackModelConfig: { id: 'anthropic/claude-opus-4-8' as const, url: '', apiKey: 'jwt' },
		});

		expect(mockAgentInstances[0]?.model).toHaveBeenCalledWith({
			id: 'anthropic/claude-sonnet-5-5',
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

	it('routes a dedicated eval model to its own URL and key, never the builder key', () => {
		process.env.N8N_INSTANCE_AI_MODEL = 'anthropic/claude-sonnet-4-6';
		process.env.N8N_INSTANCE_AI_MODEL_API_KEY = 'builder-key';
		process.env.ANTHROPIC_API_KEY = 'anthropic-key';
		process.env.N8N_INSTANCE_AI_EVAL_MODEL = 'custom/deepseek/deepseek-v4.1-flash';
		process.env.N8N_INSTANCE_AI_EVAL_MODEL_URL = 'https://router.example.com/v1';

		expect(resolveEvalModelConfig()).toEqual({
			modelId: 'custom/deepseek/deepseek-v4.1-flash',
			provider: 'custom',
			providerModelId: 'deepseek/deepseek-v4.1-flash',
			apiKey: '',
			url: 'https://router.example.com/v1',
			headers: undefined,
		});

		process.env.N8N_INSTANCE_AI_EVAL_MODEL_API_KEY = 'router-key';
		expect(resolveEvalModelConfig().apiKey).toBe('router-key');
	});

	it('uses the eval model URL and key when no builder model is set', () => {
		process.env.N8N_INSTANCE_AI_EVAL_MODEL = 'custom/deepseek/deepseek-v4.1-flash';
		process.env.N8N_INSTANCE_AI_EVAL_MODEL_URL = 'https://router.example.com/v1';
		process.env.N8N_INSTANCE_AI_EVAL_MODEL_API_KEY = 'router-key';

		expect(resolveEvalModelConfig()).toMatchObject({
			apiKey: 'router-key',
			url: 'https://router.example.com/v1',
		});
	});

	it('keeps judges and fixed helper ids off the eval model URL', () => {
		process.env.N8N_INSTANCE_AI_MODEL = 'anthropic/claude-sonnet-4-6';
		process.env.ANTHROPIC_API_KEY = 'anthropic-key';
		process.env.N8N_INSTANCE_AI_EVAL_MODEL = 'custom/deepseek/deepseek-v4.1-flash';
		process.env.N8N_INSTANCE_AI_EVAL_MODEL_URL = 'https://router.example.com/v1';

		expect(resolveEvalModelConfig('anthropic/claude-haiku-4-5-20251001')).toMatchObject({
			apiKey: 'anthropic-key',
			url: undefined,
		});
	});

	it('requires the eval key for a provider-native model on the eval model URL', () => {
		process.env.N8N_INSTANCE_AI_MODEL = 'anthropic/claude-sonnet-4-6';
		process.env.ANTHROPIC_API_KEY = 'anthropic-key';
		process.env.N8N_INSTANCE_AI_EVAL_MODEL = 'openai/gpt-5.6-sol';
		process.env.N8N_INSTANCE_AI_EVAL_MODEL_URL = 'https://gateway.example.com/v1';

		expect(() => resolveEvalModelConfig()).toThrow(/N8N_INSTANCE_AI_EVAL_MODEL_API_KEY/);
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

	it('throws a failure that is not a provider error as it is', () => {
		const runtimeError = new Error('memory store unavailable');
		expect(() => extractText(failed(runtimeError))).toThrow(runtimeError);
		expect(() => extractText(failed('socket closed'))).toThrow(/^socket closed$/);
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

describe('eval agent judge and effort settings', () => {
	const lastAgent = () => mockAgentInstances[mockAgentInstances.length - 1];
	const modelId = () => (lastAgent().model.mock.calls[0][0] as { id: string }).id;
	const effort = () => (lastAgent().thinking.mock.calls[0][1] as { effort: string }).effort;

	beforeEach(() => {
		resetModelEnv();
		process.env.ANTHROPIC_API_KEY = 'provider-key';
		mockAgentInstances.length = 0;
		vi.clearAllMocks();
	});

	afterAll(() => {
		process.env = ORIGINAL_ENV;
	});

	it('runs judges on the judge model at high effort by default', () => {
		createEvalAgent('judge', { instructions: 'x', judge: true });

		expect(modelId()).toBe(JUDGE_MODEL);
		expect(effort()).toBe('high');
		expect(resolveJudgeModel()).toBe(JUDGE_MODEL);
	});

	it('applies the judge model override to judges only', () => {
		process.env.N8N_INSTANCE_AI_EVAL_JUDGE_MODEL = 'anthropic/claude-sonnet-5';

		createEvalAgent('judge', {
			instructions: 'x',
			judge: true,
			model: 'anthropic/claude-sonnet-4-6',
		});
		expect(modelId()).toBe('anthropic/claude-sonnet-5');

		createEvalAgent('proxy', { instructions: 'x' });
		expect(modelId()).toBe('anthropic/claude-sonnet-5-5');
	});

	it('routes the eval effort to agents without a pinned model only', () => {
		process.env.N8N_INSTANCE_AI_EVAL_EFFORT = 'low';
		process.env.N8N_INSTANCE_AI_EVAL_JUDGE_EFFORT = 'medium';

		createEvalAgent('mock', { instructions: 'x' });
		expect(effort()).toBe('low');

		createEvalAgent('helper', { instructions: 'x', model: 'anthropic/claude-sonnet-4-6' });
		expect(effort()).toBe('medium');

		createEvalAgent('judge', { instructions: 'x', judge: true });
		expect(effort()).toBe('medium');
	});

	it('rejects an unknown effort value', () => {
		process.env.N8N_INSTANCE_AI_EVAL_JUDGE_EFFORT = 'hgih';

		expect(() => createEvalAgent('judge', { instructions: 'x', judge: true })).toThrow(
			'N8N_INSTANCE_AI_EVAL_JUDGE_EFFORT',
		);
	});

	it('appends one usage line per model step when the usage log is set', async () => {
		const dir = mkdtempSync(path.join(tmpdir(), 'eval-usage-'));
		const file = path.join(dir, 'usage.jsonl');
		try {
			process.env.N8N_INSTANCE_AI_EVAL_USAGE_LOG = file;

			createEvalAgent('judge', { instructions: 'x', judge: true });
			const hooks = lastAgent().configuration.mock.calls[0][0];
			hooks.onStepStart({ callId: 'c1', stepNumber: 0 });
			await hooks.onStepEnd({
				callId: 'c1',
				stepNumber: 0,
				model: { modelId: 'claude-sonnet-5-5' },
				rawFinishReason: 'end_turn',
				usage: {
					inputTokens: 100,
					inputTokenDetails: { cacheReadTokens: 40, cacheWriteTokens: 10 },
					outputTokens: 20,
					outputTokenDetails: { reasoningTokens: 5 },
				},
			});

			const line = JSON.parse(readFileSync(file, 'utf8').trim());
			expect(line).toMatchObject({
				agent: 'judge',
				model: 'claude-sonnet-5-5',
				effort: 'high',
				stopReason: 'end_turn',
				inputTokens: 100,
				cacheReadTokens: 40,
				cacheWriteTokens: 10,
				outputTokens: 20,
				reasoningTokens: 5,
			});
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});

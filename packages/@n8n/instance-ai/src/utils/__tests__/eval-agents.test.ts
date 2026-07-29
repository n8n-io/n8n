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
	'N8N_INSTANCE_AI_MODEL_URL',
	'N8N_INSTANCE_AI_MODEL_HEADERS',
	'EVAL_MODAL_LLM_HEADERS',
	'N8N_AI_ANTHROPIC_KEY',
	'ANTHROPIC_API_KEY',
	'OPENAI_API_KEY',
	'GOOGLE_GENERATIVE_AI_API_KEY',
	'XAI_API_KEY',
	'N8N_INSTANCE_AI_VERTEX_PROJECT',
	'N8N_INSTANCE_AI_VERTEX_LOCATION',
	'N8N_INSTANCE_AI_VERTEX_CREDENTIALS',
	'GOOGLE_VERTEX_PROJECT',
	'GOOGLE_VERTEX_LOCATION',
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

	it('resolves vertex Claude without an API key', () => {
		const sa = JSON.stringify({ type: 'service_account', project_id: 'gcp-proj' });
		process.env.N8N_INSTANCE_AI_VERTEX_PROJECT = 'gcp-proj';
		process.env.N8N_INSTANCE_AI_VERTEX_LOCATION = 'us-east5';
		process.env.N8N_INSTANCE_AI_VERTEX_CREDENTIALS = sa;

		const config = resolveEvalModelConfig('vertex/claude-opus-4-8');

		expect(config).toEqual({
			modelId: 'vertex/claude-opus-4-8',
			provider: 'vertex',
			providerModelId: 'claude-opus-4-8',
			apiKey: '',
			project: 'gcp-proj',
			location: 'us-east5',
			googleCredentialsJson: sa,
		});
	});

	it('builds a vertex eval agent with adaptive thinking', () => {
		process.env.N8N_INSTANCE_AI_VERTEX_PROJECT = 'gcp-proj';

		createEvalAgent('test-agent', {
			model: 'vertex/claude-opus-4-8',
			instructions: 'Do the task.',
		});

		expect(mockAgentInstances[0]?.model).toHaveBeenCalledWith({
			id: 'vertex/claude-opus-4-8',
			project: 'gcp-proj',
			location: 'global',
		});
		expect(mockAgentInstances[0]?.thinking).toHaveBeenCalledWith('vertex', {
			mode: 'adaptive',
			effort: 'medium',
		});
	});

	it('falls back to GOOGLE_VERTEX_* when n8n vertex env vars are blank', () => {
		process.env.N8N_INSTANCE_AI_VERTEX_PROJECT = '';
		process.env.N8N_INSTANCE_AI_VERTEX_LOCATION = '   ';
		process.env.GOOGLE_VERTEX_PROJECT = 'fallback-project';
		process.env.GOOGLE_VERTEX_LOCATION = 'us-east5';

		const config = resolveEvalModelConfig('vertex/claude-opus-4-8');

		expect(config.project).toBe('fallback-project');
		expect(config.location).toBe('us-east5');
	});

	it('supports custom endpoints that authenticate with JSON model headers only', () => {
		process.env.N8N_INSTANCE_AI_MODEL = 'custom/moonshotai/Kimi-K3';
		process.env.N8N_INSTANCE_AI_MODEL_URL = 'https://example.modal.direct/v1';
		process.env.N8N_INSTANCE_AI_MODEL_HEADERS = '{"Modal-Key":"wk-test","Modal-Secret":"ws-test"}';

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

	it('prefers EVAL_MODAL_LLM_HEADERS over N8N_INSTANCE_AI_MODEL_HEADERS', () => {
		process.env.N8N_INSTANCE_AI_MODEL = 'custom/moonshotai/Kimi-K3';
		process.env.N8N_INSTANCE_AI_MODEL_URL = 'https://example.modal.direct/v1';
		process.env.N8N_INSTANCE_AI_MODEL_HEADERS =
			'{"Modal-Key":"wk-fallback","Modal-Secret":"ws-fallback"}';
		process.env.EVAL_MODAL_LLM_HEADERS = '{"Modal-Key":"wk-eval","Modal-Secret":"ws-eval"}';

		expect(resolveEvalModelConfig()).toMatchObject({
			headers: { 'Modal-Key': 'wk-eval', 'Modal-Secret': 'ws-eval' },
		});
	});
});

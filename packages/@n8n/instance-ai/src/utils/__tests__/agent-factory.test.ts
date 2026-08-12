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

import { createAgentFromModel, EPHEMERAL_CACHE } from '../agent-factory';

const ORIGINAL_ENV = { ...process.env };

const modelConfig = {
	id: 'anthropic/claude-sonnet-4-6' as const,
	url: 'https://proxy.example.com/anthropic/v1',
	apiKey: 'proxy-token',
};

describe('createAgentFromModel', () => {
	beforeEach(() => {
		process.env = { ...ORIGINAL_ENV };
		mockAgentInstances.length = 0;
		vi.clearAllMocks();
	});

	afterAll(() => {
		process.env = ORIGINAL_ENV;
	});

	it('uses the supplied model config even when env model keys are set', () => {
		// The whole point of this factory: a user-facing feature must run on the
		// model the instance is configured with, never one an env var happens to name.
		process.env.N8N_AI_ANTHROPIC_KEY = 'env-key';
		process.env.N8N_INSTANCE_AI_EVAL_MODEL = 'anthropic/claude-opus-4-8';

		createAgentFromModel('sample-data', { modelConfig, instructions: 'Do the task.' });

		expect(mockAgentInstances[0]?.model).toHaveBeenCalledWith(modelConfig);
	});

	it('does not throw when no env model keys exist at all', () => {
		delete process.env.N8N_AI_ANTHROPIC_KEY;
		delete process.env.ANTHROPIC_API_KEY;
		delete process.env.N8N_INSTANCE_AI_MODEL_API_KEY;

		expect(() =>
			createAgentFromModel('sample-data', { modelConfig, instructions: 'Do the task.' }),
		).not.toThrow();
	});

	it('marks the instructions as an ephemeral cache breakpoint when caching', () => {
		createAgentFromModel('sample-data', {
			modelConfig,
			instructions: 'Do the task.',
			cache: true,
		});

		expect(mockAgentInstances[0]?.instructions).toHaveBeenCalledWith('Do the task.', {
			providerOptions: EPHEMERAL_CACHE,
		});
	});

	it('sets plain instructions when not caching', () => {
		createAgentFromModel('sample-data', { modelConfig, instructions: 'Do the task.' });

		expect(mockAgentInstances[0]?.instructions).toHaveBeenCalledWith('Do the task.');
	});

	it('enables thinking based on the supplied model provider', () => {
		createAgentFromModel('sample-data', { modelConfig, instructions: 'Do the task.' });

		expect(mockAgentInstances[0]?.thinking).toHaveBeenCalledWith('anthropic', {
			mode: 'adaptive',
			effort: 'medium',
		});
	});
});

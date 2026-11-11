import type { MockedFunction } from 'vitest';
import { z } from 'zod';

vi.mock('../../tracing/langsmith-tracing', () => ({ getCurrentHelperTelemetry: vi.fn() }));

vi.mock('../eval-agents', async () => {
	const actual: object = await vi.importActual('../eval-agents');
	return { ...actual, createEvalAgent: vi.fn(), extractText: vi.fn() };
});

import { getCurrentHelperTelemetry } from '../../tracing/langsmith-tracing';
import { createEvalAgent, extractText } from '../eval-agents';
import type { UtilityModelResolver } from '../../types';
import { generateValidatedJson } from '../generate-validated-json';

const mockCreateEvalAgent = createEvalAgent as MockedFunction<typeof createEvalAgent>;
const mockExtractText = extractText as MockedFunction<typeof extractText>;

const schema = z.object({ ok: z.boolean() });

function setupAgentMock(responseText: string) {
	const generate = vi.fn().mockResolvedValue({ messages: [] });
	mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
		typeof createEvalAgent
	>);
	mockExtractText.mockReturnValue(responseText);
	return generate;
}

async function generate(userText = 'do it') {
	return await generateValidatedJson('test-agent', {
		instructions: 'instructions',
		userText,
		schema,
	});
}

describe('generateValidatedJson', () => {
	beforeEach(() => vi.clearAllMocks());

	it('returns validated data for a plain JSON response', async () => {
		setupAgentMock('{"ok": true}');
		expect(await generate()).toEqual({ ok: true, data: { ok: true } });
	});

	it('strips markdown fences around the JSON', async () => {
		setupAgentMock('```json\n{"ok": false}\n```');
		expect(await generate()).toEqual({ ok: true, data: { ok: false } });
	});

	it('sends the user text as a single user message', async () => {
		const generateMock = setupAgentMock('{"ok": true}');
		await generate('classify this');
		expect(generateMock).toHaveBeenCalledWith([
			{ role: 'user', content: [{ type: 'text', text: 'classify this' }] },
		]);
	});

	it('reports invalid_json on unparseable output', async () => {
		setupAgentMock('not json');
		expect(await generate()).toEqual({ ok: false, reason: 'invalid_json' });
	});

	it('reports schema_mismatch with issues on shape errors', async () => {
		setupAgentMock('{"ok": "yes"}');
		const result = await generate();
		expect(result).toMatchObject({ ok: false, reason: 'schema_mismatch' });
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.issues?.length).toBeGreaterThan(0);
	});

	it('still calls the model, without telemetry, when tracing fails', async () => {
		vi.mocked(getCurrentHelperTelemetry).mockImplementationOnce(() => {
			throw new Error('tracing unavailable');
		});
		setupAgentMock('{"ok": true}');
		expect(await generate()).toEqual({ ok: true, data: { ok: true } });
		expect(mockCreateEvalAgent).toHaveBeenCalledWith(
			'test-agent',
			expect.objectContaining({ telemetry: undefined }),
		);
	});

	it('reports generation_failed when the LLM call throws', async () => {
		const generateMock = vi.fn().mockRejectedValue(new Error('boom'));
		mockCreateEvalAgent.mockReturnValue({ generate: generateMock } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		expect(await generate()).toEqual({ ok: false, reason: 'generation_failed', message: 'boom' });
	});

	it('reports generation_failed with the model error when the call returned an error', async () => {
		setupAgentMock('');
		mockExtractText.mockImplementation(() => {
			throw new Error('Eval model provider call failed (HTTP 401): invalid x-api-key');
		});
		expect(await generate()).toEqual({
			ok: false,
			reason: 'generation_failed',
			message: 'Eval model provider call failed (HTTP 401): invalid x-api-key',
		});
	});

	it('reports generation_failed when agent creation throws', async () => {
		mockCreateEvalAgent.mockImplementation(() => {
			throw new Error('no api key');
		});
		expect(await generate()).toEqual({
			ok: false,
			reason: 'generation_failed',
			message: 'no api key',
		});
	});

	it('forwards the fallback model config to agent creation', async () => {
		setupAgentMock('{"ok": true}');
		const fallbackModelConfig = {
			id: 'anthropic/claude-opus-4-8' as const,
			url: 'https://proxy.example.com/anthropic/v1',
			apiKey: 'proxy-token',
		};
		const modelFetch = vi.fn();
		await generateValidatedJson('test-agent', {
			instructions: 'instructions',
			userText: 'do it',
			schema,
			fallbackModelConfig,
			modelFetch,
		});
		expect(mockCreateEvalAgent).toHaveBeenCalledWith(
			'test-agent',
			expect.objectContaining({ fallbackModelConfig, modelFetch }),
		);
	});

	describe('pinned model on the host', () => {
		const runModel = 'anthropic/claude-opus-5-5';
		const pinnedModel = 'anthropic/claude-haiku-5-5';
		const hostPinnedModel = {
			id: 'anthropic/claude-haiku-5-5' as const,
			url: 'https://proxy.example.com/anthropic/v1',
			apiKey: 'proxy-token',
		};

		async function generatePinned(resolveFallbackModel: UtilityModelResolver) {
			return await generateValidatedJson('test-agent', {
				model: pinnedModel,
				instructions: 'instructions',
				userText: 'do it',
				schema,
				fallbackModelConfig: runModel,
				resolveFallbackModel,
			});
		}

		it('uses the host model for the pinned name as the fallback', async () => {
			setupAgentMock('{"ok": true}');
			const resolveFallbackModel = vi.fn().mockResolvedValue(hostPinnedModel);
			await generatePinned(resolveFallbackModel);
			expect(resolveFallbackModel).toHaveBeenCalledWith(pinnedModel);
			expect(mockCreateEvalAgent).toHaveBeenCalledWith(
				'test-agent',
				expect.objectContaining({ model: pinnedModel, fallbackModelConfig: hostPinnedModel }),
			);
		});

		it('uses the run model when the host cannot build the pinned model', async () => {
			setupAgentMock('{"ok": true}');
			await generatePinned(vi.fn().mockResolvedValue(undefined));
			expect(mockCreateEvalAgent).toHaveBeenCalledWith(
				'test-agent',
				expect.objectContaining({ fallbackModelConfig: runModel }),
			);
		});

		it('uses the run model when the host resolver throws', async () => {
			setupAgentMock('{"ok": true}');
			const result = await generatePinned(vi.fn().mockRejectedValue(new Error('proxy down')));
			expect(result).toEqual({ ok: true, data: { ok: true } });
			expect(mockCreateEvalAgent).toHaveBeenCalledWith(
				'test-agent',
				expect.objectContaining({ fallbackModelConfig: runModel }),
			);
		});

		it('does not resolve a host model when the call pins no model', async () => {
			setupAgentMock('{"ok": true}');
			const resolveFallbackModel = vi.fn();
			await generateValidatedJson('test-agent', {
				instructions: 'instructions',
				userText: 'do it',
				schema,
				fallbackModelConfig: runModel,
				resolveFallbackModel,
			});
			expect(resolveFallbackModel).not.toHaveBeenCalled();
			expect(mockCreateEvalAgent).toHaveBeenCalledWith(
				'test-agent',
				expect.objectContaining({ fallbackModelConfig: runModel }),
			);
		});
	});
});

it('passes the current product trace to verification helpers', async () => {
	const telemetry = { enabled: true, recordInputs: false, recordOutputs: false, integrations: [] };
	vi.mocked(getCurrentHelperTelemetry).mockReturnValueOnce(telemetry);
	setupAgentMock('{"ok": true}');
	await generate();
	expect(getCurrentHelperTelemetry).toHaveBeenCalledWith('test-agent');
	expect(mockCreateEvalAgent).toHaveBeenCalledWith(
		'test-agent',
		expect.objectContaining({ telemetry }),
	);
});

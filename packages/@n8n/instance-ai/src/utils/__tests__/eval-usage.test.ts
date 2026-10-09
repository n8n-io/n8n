import type { InstanceAiEvalLlmUsage } from '@n8n/api-types';
import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';

import { createEvalAgent } from '../eval-agents';
import { EvalUsageMeter, recordEvalUsage } from '../eval-usage';

const ORIGINAL_ENV = { ...process.env };

/** A model that answers "ok" to every call and reports these token counts. */
function modelReporting(tokens: {
	noCache: number;
	cacheRead: number;
	cacheWrite: number;
	output: number;
}): MockLanguageModelV3 {
	const finishReason = { unified: 'stop', raw: 'end_turn' } as const;
	const usage = {
		inputTokens: {
			total: tokens.noCache + tokens.cacheRead + tokens.cacheWrite,
			noCache: tokens.noCache,
			cacheRead: tokens.cacheRead,
			cacheWrite: tokens.cacheWrite,
		},
		outputTokens: { total: tokens.output, text: tokens.output, reasoning: 0 },
	};
	return new MockLanguageModelV3({
		provider: 'mock',
		modelId: 'judge',
		doGenerate: { content: [{ type: 'text', text: 'ok' }], finishReason, usage, warnings: [] },
		doStream: async () =>
			await Promise.resolve({
				stream: convertArrayToReadableStream([
					{ type: 'stream-start', warnings: [] },
					{ type: 'text-start', id: 'text-1' },
					{ type: 'text-delta', id: 'text-1', delta: 'ok' },
					{ type: 'text-end', id: 'text-1' },
					{ type: 'finish', finishReason, usage },
				]),
			}),
	});
}

/** No eval key in the environment, so the agent runs on the mock model. */
function judgeOn(model: MockLanguageModelV3, name = 'eval-checklist-verifier') {
	return createEvalAgent(name, { instructions: 'Judge the run.', fallbackModelConfig: model });
}

describe('eval usage meter', () => {
	beforeEach(() => {
		process.env = { ...ORIGINAL_ENV };
		for (const key of [
			'N8N_INSTANCE_AI_MODEL',
			'N8N_INSTANCE_AI_EVAL_MODEL',
			'N8N_INSTANCE_AI_MODEL_API_KEY',
			'N8N_INSTANCE_AI_MODEL_URL',
			'EVAL_MODAL_LLM_HEADERS',
			'N8N_AI_ANTHROPIC_KEY',
			'ANTHROPIC_API_KEY',
		]) {
			delete process.env[key];
		}
	});

	afterAll(() => {
		process.env = ORIGINAL_ENV;
	});

	it('counts every call an eval agent makes inside the meter, by agent and model', async () => {
		const judge = judgeOn(
			modelReporting({ noCache: 100, cacheRead: 1000, cacheWrite: 200, output: 50 }),
		);
		const meter = new EvalUsageMeter();

		await meter.run(async () => {
			await judge.generate('First scenario');
			await judge.generate('Second scenario');
		});

		expect(meter.entries()).toEqual([
			{
				agent: 'eval-checklist-verifier',
				model: 'mock/judge',
				calls: 2,
				uncachedInputTokens: 200,
				cacheReadTokens: 2000,
				cacheWriteTokens: 400,
				outputTokens: 100,
			},
		]);
	});

	it('keeps the calls of concurrent meters apart', async () => {
		const judge = judgeOn(modelReporting({ noCache: 10, cacheRead: 0, cacheWrite: 0, output: 1 }));
		const first = new EvalUsageMeter();
		const second = new EvalUsageMeter();

		await Promise.all([
			first.run(async () => await judge.generate('Case one')),
			second.run(async () => {
				await judge.generate('Case two');
				await judge.generate('Case two again');
			}),
		]);

		expect(first.entries().map((entry) => entry.calls)).toEqual([1]);
		expect(second.entries().map((entry) => entry.calls)).toEqual([2]);
	});

	it('adds usage that an eval endpoint reported to the current meter', async () => {
		const reported: InstanceAiEvalLlmUsage = {
			agent: 'eval-mock-responder',
			model: 'anthropic/claude-sonnet-4-6',
			calls: 3,
			uncachedInputTokens: 10,
			cacheReadTokens: 20,
			cacheWriteTokens: 30,
			outputTokens: 5,
		};
		const meter = new EvalUsageMeter();

		await meter.run(async () => {
			recordEvalUsage([reported]);
			recordEvalUsage([reported]);
			await Promise.resolve();
		});

		expect(meter.entries()).toEqual([
			{
				...reported,
				calls: 6,
				uncachedInputTokens: 20,
				cacheReadTokens: 40,
				cacheWriteTokens: 60,
				outputTokens: 10,
			},
		]);
	});
});

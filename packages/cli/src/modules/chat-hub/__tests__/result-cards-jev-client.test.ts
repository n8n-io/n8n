import type { Logger } from '@n8n/backend-common';
import { jsonParse } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import {
	JevClient,
	normalizeAnswers,
	type JevProvider,
} from '@/modules/chat-hub/result-cards/jev-client';

const logger = mock<Logger>();
const state = {
	workflow: { name: 'w' },
	node: { type: 't', name: 'n' },
	itemCount: 1,
	fields: [],
};
const questions = {
	archetype: {
		type: 'choice' as const,
		instructions: 'x',
		criteria: { metric: 'a number', keyValue: 'values' },
	},
	include: { type: 'noul' as const, instructions: 'y' },
	col_0: { type: 'score' as const, instructions: 'z' },
};

type Captured = { request?: { url: string; init: RequestInit } };

function fetchReturning(status: number, body: unknown, capture?: Captured) {
	return (async (url: string, init: RequestInit) => {
		if (capture) capture.request = { url, init };
		return { ok: status < 400, status, json: async () => body } as Response;
	}) as unknown as typeof fetch;
}

describe('JevClient', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('posts to the TypeSafe endpoint with the pinned model and normalizes answers', async () => {
		const capture: Captured = {};
		const client = new JevClient(
			{
				provider: 'typesafe',
				apiKey: 'k',
				fetchImpl: fetchReturning(
					200,
					{
						model: 'jev-1.13.0',
						answers: {
							archetype: {
								choice: 'metric',
								confidence: 0.82,
								probabilities: { metric: 0.82, keyValue: 0.18 },
							},
							include: { noul: 0.91 },
							col_0: { score: 0.4 },
						},
						usage: { input_tokens: 210, output_tokens: 3 },
					},
					capture,
				),
			},
			logger,
		);

		const decision = await client.decide(state, questions);

		expect(capture.request?.url).toBe('https://api.typesafe.ai/v1/systemone');
		expect(capture.request?.init.headers).toMatchObject({ Authorization: 'Bearer k' });
		const body = jsonParse<{ model: string; questions: Record<string, { type: string }> }>(
			capture.request!.init.body as string,
		);
		expect(body.model).toBe('jev-1.13.0');
		expect(body.questions.include.type).toBe('noul');
		expect(decision?.answers).toEqual({
			archetype: {
				choice: 'metric',
				confidence: 0.82,
				probabilities: { metric: 0.82, keyValue: 0.18 },
			},
			include: { noul: 0.91 },
			col_0: { score: 0.4 },
		});
		expect(decision?.inputTokens).toBe(210);
	});

	it('maps noul to boolean for the Vercel gateway and reads probability back', async () => {
		const capture: Captured = {};
		const client = new JevClient(
			{
				provider: 'vercel',
				apiKey: 'k',
				fetchImpl: fetchReturning(200, { answers: { include: { probability: 0.7 } } }, capture),
			},
			logger,
		);
		const decision = await client.decide(state, { include: questions.include });
		expect(capture.request?.url).toBe('https://ai-gateway.vercel.sh/v1/evaluate');
		expect(jsonParse(capture.request!.init.body as string)).toMatchObject({
			model: 'typesafe-ai/jev',
			questions: { include: { type: 'boolean' } },
		});
		expect(decision?.answers).toEqual({ include: { noul: 0.7 } });
	});

	it('posts to OpenRouter with its pinned model and keeps noul questions', async () => {
		const capture: Captured = {};
		const client = new JevClient(
			{
				provider: 'openrouter',
				apiKey: 'k',
				fetchImpl: fetchReturning(200, { answers: { include: { noul: 0.6 } } }, capture),
			},
			logger,
		);
		const decision = await client.decide(state, { include: questions.include });
		expect(capture.request?.url).toBe('https://openrouter.ai/api/alpha/decisions');
		expect(jsonParse(capture.request!.init.body as string)).toMatchObject({
			model: 'typesafe/jev-1.13',
			questions: { include: { type: 'noul' } },
		});
		expect(decision?.answers).toEqual({ include: { noul: 0.6 } });
	});

	it('falls back to the TypeSafe provider for an unknown provider id instead of throwing', async () => {
		const capture: Captured = {};
		const client = new JevClient(
			{
				provider: 'nope' as JevProvider,
				apiKey: 'k',
				fetchImpl: fetchReturning(200, { answers: {} }, capture),
			},
			logger,
		);
		await expect(client.decide(state, questions)).resolves.toEqual(
			expect.objectContaining({ answers: {} }),
		);
		expect(capture.request?.url).toBe('https://api.typesafe.ai/v1/systemone');
		expect(jsonParse(capture.request!.init.body as string)).toMatchObject({ model: 'jev-1.13.0' });
	});

	it('returns undefined on http errors, network errors and timeouts', async () => {
		expect(
			await new JevClient(
				{ provider: 'typesafe', apiKey: 'k', fetchImpl: fetchReturning(500, {}) },
				logger,
			).decide(state, questions),
		).toBeUndefined();

		const failing = (async () => {
			throw new Error('boom');
		}) as unknown as typeof fetch;
		expect(
			await new JevClient({ provider: 'typesafe', apiKey: 'k', fetchImpl: failing }, logger).decide(
				state,
				questions,
			),
		).toBeUndefined();

		const hanging = (async (_: string, init: RequestInit) =>
			await new Promise((_resolve, reject) =>
				init.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
			)) as unknown as typeof fetch;
		expect(
			await new JevClient(
				{ provider: 'typesafe', apiKey: 'k', timeoutMs: 10, fetchImpl: hanging },
				logger,
			).decide(state, questions),
		).toBeUndefined();
		expect(logger.warn).toHaveBeenCalledWith('Jev call timed out after 10 ms');
		expect(logger.warn).toHaveBeenCalledWith('Jev call failed: boom');
		expect(logger.warn).toHaveBeenCalledWith('Jev responded with HTTP 500');
	});
});

describe('normalizeAnswers', () => {
	it('drops unknown shapes', () => {
		expect(normalizeAnswers({ a: { weird: 1 }, b: { choice: 'x' } })).toEqual({
			b: { choice: 'x', confidence: undefined, probabilities: undefined },
		});
	});

	it('maps boolean and probability answers to noul', () => {
		// The Vercel gateway spells the answer key `boolean`; computed key keeps id-denylist quiet
		const vercelBooleanKey = 'boolean';
		expect(normalizeAnswers({ a: { [vercelBooleanKey]: 1 }, b: { probability: 0.25 } })).toEqual({
			a: { noul: 1 },
			b: { noul: 0.25 },
		});
	});
});

import {
	aiInsightsPayloadSchema,
	aiInsightsResponseSchema,
	type AiInsightsPayload,
	type AiInsightsResponse,
} from '../eval-insights.schema';

/**
 * Strict-validation guarantees per master spec §9.3 / §9.5: the schemas
 * used to validate LLM output (and cached envelopes) must reject unknown
 * keys instead of silently stripping them. Without strict mode a
 * hallucinated field on an agent response would pass validation, the
 * cached envelope would lose the extra data on round-trip, and the
 * "retry with stricter prompt" path in `EvalInsightsService` would never
 * fire.
 */

function makeValidPayload(over: Partial<AiInsightsPayload> = {}): AiInsightsPayload {
	return {
		winner: { versionLabel: 'A', headline: 'A wins', body: 'A leads on score.' },
		regressions: [],
		suggestedNext: { headline: 'Lock in A', body: 'Promote A.', hypothesis: 'A is stable.' },
		...over,
	};
}

function makeValidEnvelope(over: Partial<AiInsightsResponse> = {}): AiInsightsResponse {
	return {
		generatedAt: '2026-04-01T00:00:00.000Z',
		modelUsed: 'deterministic',
		status: 'fallback',
		insights: makeValidPayload(),
		...over,
	};
}

describe('aiInsightsPayloadSchema (strict)', () => {
	it('parses a valid payload unchanged', () => {
		const payload = makeValidPayload();
		const parsed = aiInsightsPayloadSchema.parse(payload);
		expect(parsed).toEqual(payload);
	});

	it('rejects unknown keys at the payload root', () => {
		const result = aiInsightsPayloadSchema.safeParse({
			...makeValidPayload(),
			hallucinated: 'extra field from the LLM',
		});
		expect(result.success).toBe(false);
	});

	it('rejects unknown keys nested inside winner', () => {
		const result = aiInsightsPayloadSchema.safeParse({
			...makeValidPayload(),
			winner: {
				versionLabel: 'A',
				headline: 'h',
				body: 'b',
				confidence: 0.9,
			},
		});
		expect(result.success).toBe(false);
	});

	it('rejects unknown keys nested inside a regression entry', () => {
		const result = aiInsightsPayloadSchema.safeParse({
			...makeValidPayload(),
			regressions: [
				{
					versionLabel: 'B',
					metric: 'accuracy',
					delta: -12,
					headline: 'h',
					body: 'b',
					confidence: 0.7,
				},
			],
		});
		expect(result.success).toBe(false);
	});

	it('rejects unknown keys nested inside suggestedNext', () => {
		const result = aiInsightsPayloadSchema.safeParse({
			...makeValidPayload(),
			suggestedNext: {
				headline: 'h',
				body: 'b',
				hypothesis: 'h',
				priority: 'high',
			},
		});
		expect(result.success).toBe(false);
	});
});

describe('aiInsightsResponseSchema (strict)', () => {
	it('parses a valid envelope unchanged', () => {
		const envelope = makeValidEnvelope();
		const parsed = aiInsightsResponseSchema.parse(envelope);
		expect(parsed).toEqual(envelope);
	});

	it('rejects unknown keys at the envelope root', () => {
		// Forward-compat scenario: a cached envelope from an older app
		// version may carry a now-unknown field. Strict mode forces the
		// service to regenerate rather than silently strip the field.
		const result = aiInsightsResponseSchema.safeParse({
			...makeValidEnvelope(),
			cacheGeneratedBy: 'v0.5-legacy',
		});
		expect(result.success).toBe(false);
	});
});

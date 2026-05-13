import {
	buildN8nObservationLogReflectorPrompt,
	DEFAULT_REFLECTOR_PROMPT,
	DEFAULT_REFLECTOR_THRESHOLD_TOKENS,
} from '../observation-log-reflector';

describe('n8n observation-log reflector policy', () => {
	it('uses the n8n reflector defaults', () => {
		expect(DEFAULT_REFLECTOR_THRESHOLD_TOKENS).toBe(8_000);
		expect(DEFAULT_REFLECTOR_PROMPT).toContain('Return JSON with two arrays');
		expect(DEFAULT_REFLECTOR_PROMPT).toContain('🔴 Critical');
	});

	it('builds the reflector prompt from active log and token budget', () => {
		const prompt = buildN8nObservationLogReflectorPrompt({
			scopeKind: 'thread',
			scopeId: 'thread-1',
			now: new Date('2026-05-12T15:00:00.000Z'),
			activeObservationLog: [],
			renderedObservationLog:
				'* [obs-1] 🔴 2026-05-12T14:30:00.000Z User chose observation-log memory.',
			tokenCount: 42,
			tokenBudget: 24_000,
		});

		expect(prompt).toContain('Current timestamp: 2026-05-12T15:00:00.000Z');
		expect(prompt).toContain('Scope: thread:thread-1');
		expect(prompt).toContain('Active observation log tokens: 42');
		expect(prompt).toContain('Token budget: 24000');
		expect(prompt).toContain('[obs-1] 🔴');
	});
});

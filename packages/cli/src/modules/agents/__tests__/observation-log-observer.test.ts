import {
	buildN8nObservationLogObserverPrompt,
	DEFAULT_OBSERVATION_LOG_TAIL_LIMIT,
	DEFAULT_OBSERVER_THRESHOLD_TOKENS,
	DEFAULT_OBSERVER_PROMPT,
} from '../observation-log-observer';

describe('n8n observation-log observer policy', () => {
	it('uses the n8n observer defaults', () => {
		expect(DEFAULT_OBSERVER_THRESHOLD_TOKENS).toBe(500);
		expect(DEFAULT_OBSERVATION_LOG_TAIL_LIMIT).toBe(20);
		expect(DEFAULT_OBSERVER_PROMPT).toContain('Output the new observations only');
		expect(DEFAULT_OBSERVER_PROMPT).toContain('CRITICAL. Things the agent must not forget');
	});

	it('uses parseable markdown bullets for good output examples', () => {
		expect(DEFAULT_OBSERVER_PROMPT).toContain(
			'GOOD:\n* IMPORTANT (14:30) User is purchasing Claude Code subscriptions for their team.',
		);
	});

	it('builds the observer prompt from log tail and transcript delta', () => {
		const prompt = buildN8nObservationLogObserverPrompt({
			observationScopeId: 'thread-1',
			now: new Date('2026-05-12T14:30:00.000Z'),
			deltaMessages: [],
			transcript: '[2026-05-12T14:29:00.000Z] user:\nRemember daily-report-prod.',
			transcriptTokenCount: 42,
			observationLogTail: [],
			renderedObservationLogTail:
				'## Memory\n\n* CRITICAL (14:28) User is rebuilding observational memory.',
		});

		expect(prompt).toContain('Current timestamp: 2026-05-12T14:30:00.000Z');
		expect(prompt).toContain('* CRITICAL (14:28) User is rebuilding observational memory.');
		expect(prompt).toContain('Remember daily-report-prod.');
		expect(prompt).toContain('Unobserved transcript tokens: 42');
	});
});

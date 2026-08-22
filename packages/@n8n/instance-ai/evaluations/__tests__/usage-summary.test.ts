import type { InstanceAiRunDebugResponse } from '@n8n/api-types';

import { summarizeBuildUsage, totalToolCalls } from '../harness/usage-summary';
import type { TranscriptTurn } from '../types';

function run(usages: Array<Record<string, unknown> | undefined>): InstanceAiRunDebugResponse {
	return {
		threadId: 'thread-1',
		runId: 'run-1',
		startedAt: 1,
		steps: usages.map((usage, i) => ({
			stepNumber: i,
			output: usage ? { usage } : {},
		})),
		workflowCode: [],
	};
}

describe('summarizeBuildUsage', () => {
	it('returns undefined when nothing was captured', () => {
		expect(summarizeBuildUsage(undefined)).toBeUndefined();
		expect(summarizeBuildUsage([])).toBeUndefined();
	});

	it('returns undefined when no step carried a usage record', () => {
		// A row of zeros would read as a genuinely free build.
		expect(summarizeBuildUsage([run([undefined, undefined])])).toBeUndefined();
	});

	it('reads the AI SDK shape (inputTokenDetails.*Tokens)', () => {
		const summary = summarizeBuildUsage([
			run([
				{
					inputTokens: 1_000,
					outputTokens: 200,
					totalTokens: 1_200,
					inputTokenDetails: { noCacheTokens: 300, cacheReadTokens: 600, cacheWriteTokens: 100 },
				},
			]),
		]);
		expect(summary).toEqual({
			uncachedInput: 300,
			cacheRead: 600,
			cacheWrite: 100,
			output: 200,
			totalTokens: 1_200,
			steps: 1,
		});
	});

	it('reads the runtime finish-chunk shape (inputTokenDetails without the Tokens suffix)', () => {
		// UsageAccumulator's schema uses these names; reading only the SDK spelling
		// would report zero tokens for a whole arm and look like a free memory system.
		const summary = summarizeBuildUsage([
			run([
				{
					promptTokens: 500,
					completionTokens: 50,
					totalTokens: 550,
					inputTokenDetails: { noCache: 200, cacheRead: 250, cacheWrite: 50 },
				},
			]),
		]);
		expect(summary?.uncachedInput).toBe(200);
		expect(summary?.cacheRead).toBe(250);
		expect(summary?.cacheWrite).toBe(50);
		expect(summary?.output).toBe(50);
	});

	it('backs out uncached input when the provider reports no explicit non-cached count', () => {
		const summary = summarizeBuildUsage([
			run([
				{
					inputTokens: 1_000,
					inputTokenDetails: { cacheReadTokens: 700, cacheWriteTokens: 100 },
				},
			]),
		]);
		expect(summary?.uncachedInput).toBe(200);
	});

	it('trusts a reported zero non-cached count instead of deriving one', () => {
		// Absent and zero are different claims: deriving here would invent 500
		// uncached tokens the provider explicitly said were not there.
		const summary = summarizeBuildUsage([
			run([
				{
					inputTokens: 1_000,
					inputTokenDetails: { noCacheTokens: 0, cacheReadTokens: 500 },
				},
			]),
		]);
		expect(summary?.uncachedInput).toBe(0);
		expect(summary?.cacheRead).toBe(500);
	});

	it('never reports negative uncached input when the parts exceed the total', () => {
		const summary = summarizeBuildUsage([
			run([{ inputTokens: 100, inputTokenDetails: { cacheReadTokens: 900 } }]),
		]);
		expect(summary?.uncachedInput).toBe(0);
	});

	it('treats input as fully uncached when there is no details object', () => {
		const summary = summarizeBuildUsage([run([{ inputTokens: 400, outputTokens: 10 }])]);
		expect(summary?.uncachedInput).toBe(400);
		expect(summary?.cacheRead).toBe(0);
	});

	it('sums across steps and runs, skipping steps without usage', () => {
		const summary = summarizeBuildUsage([
			run([{ inputTokens: 100, outputTokens: 10, totalTokens: 110 }, undefined]),
			{
				threadId: 'thread-1',
				runId: 'run-2',
				startedAt: 2,
				steps: [{ stepNumber: 0, output: { usage: { inputTokens: 50, outputTokens: 5 } } }],
				workflowCode: [],
			},
		]);
		expect(summary?.uncachedInput).toBe(150);
		expect(summary?.output).toBe(15);
		expect(summary?.steps).toBe(2);
	});

	it('ignores non-numeric usage fields rather than producing NaN', () => {
		const summary = summarizeBuildUsage([
			run([{ inputTokens: 'lots', outputTokens: null, totalTokens: 5 }]),
		]);
		expect(summary?.uncachedInput).toBe(0);
		expect(summary?.output).toBe(0);
		expect(summary?.totalTokens).toBe(5);
	});
});

describe('totalToolCalls', () => {
	const step = (kind: string): TranscriptTurn['steps'][number] => {
		switch (kind) {
			case 'tool-call':
				return { kind: 'tool-call', toolName: 't' };
			// `create-tasks` renders ONLY as this kind, never as `tool-call`.
			case 'plan':
				return { kind: 'plan', tasks: [{ title: 'do the thing' }] };
			// `ask-user` likewise — it is rendered from the confirmation-request.
			case 'ask-user':
				return { kind: 'ask-user', questions: [] };
			case 'confirmation':
				return { kind: 'confirmation', toolName: 'publish', resumeReason: 'approval' };
			default:
				return { kind: 'agent-text', text: 'hi' };
		}
	};
	const turn = (kinds: string[], seeded = false): TranscriptTurn => ({
		userMessage: 'x',
		seeded,
		steps: kinds.map(step),
	});

	it('returns undefined without a transcript', () => {
		expect(totalToolCalls(undefined)).toBeUndefined();
	});

	it('counts only tool-call steps', () => {
		expect(totalToolCalls([turn(['tool-call', 'agent-text', 'tool-call'])])).toBe(2);
	});

	it('excludes seeded turns', () => {
		// Seeded turns are restored fixture, not work this run did — counting them
		// would charge every seeded case for its own setup.
		const transcript = [turn(['tool-call', 'tool-call'], true), turn(['tool-call'])];
		expect(totalToolCalls(transcript)).toBe(1);
	});

	it('counts orchestration steps that never render as kind tool-call', () => {
		// `create-tasks` → `plan` and `ask-user` → `ask-user`; filtering on
		// `kind === 'tool-call'` dropped both, undercounting most multi-step
		// conversations and hiding exactly the re-reads this metric exists to show.
		expect(totalToolCalls([turn(['plan', 'ask-user', 'confirmation'])])).toBe(3);
	});

	it('matches the harness convention of every non-narration step', () => {
		// Same rule as seededTurnCounters in outcome/event-parser.ts, which produces
		// the per-turn toolCallCount reported alongside this number.
		expect(totalToolCalls([turn(['agent-text', 'plan', 'agent-text', 'tool-call'])])).toBe(2);
	});

	it('returns 0 for a transcript with no tool calls', () => {
		expect(totalToolCalls([turn(['agent-text'])])).toBe(0);
	});
});

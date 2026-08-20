import type { InstanceAiRunDebugResponse, InstanceAiRunDebugStep } from '@n8n/api-types';

import { buildMemoryContextBlock, summarizeMemoryContext } from '../harness/memory-context';

/**
 * These exercise the REAL `parseSystemPromptForDisplay` from `@n8n/api-types` — the
 * observation block is extracted by that parser, and mocking it would make these
 * tests pass against a shape the product never produces. Fixtures therefore embed
 * observations the way the agent actually does: an `<observations>` element inside
 * the system prompt.
 */
function step(system: string, stepNumber = 1, messages?: unknown[]): InstanceAiRunDebugStep {
	return { stepNumber, input: messages ? { system, messages } : { system } };
}

function run(
	runId: string,
	startedAt: number,
	steps: InstanceAiRunDebugStep[],
): InstanceAiRunDebugResponse {
	return { threadId: 'thread-1', runId, startedAt, steps, workflowCode: [] };
}

describe('summarizeMemoryContext', () => {
	it('returns undefined when no run debug was captured', () => {
		expect(summarizeMemoryContext(undefined)).toBeUndefined();
		expect(summarizeMemoryContext([])).toBeUndefined();
	});

	it('returns undefined when runs carry no steps at all', () => {
		expect(summarizeMemoryContext([run('r1', 1, [])])).toBeUndefined();
	});

	it('extracts the observation block out of the system prompt', () => {
		const summary = summarizeMemoryContext([
			run('r1', 1, [
				step('You are a builder.\n<observations>Channel is #billing-alerts</observations>'),
			]),
		]);
		expect(summary?.observations).toBe('Channel is #billing-alerts');
		expect(summary?.observationStepCount).toBe(1);
	});

	it('keeps the observation block out of the reported system prompt', () => {
		// The two are rendered as separate sections, so leaking observations into the
		// system-prompt section would show the judge the same text twice.
		const summary = summarizeMemoryContext([
			run('r1', 1, [
				step('You are a builder.\n<observations>Channel is #billing-alerts</observations>'),
			]),
		]);
		expect(summary?.finalSystemPrompt).toContain('You are a builder.');
		expect(summary?.finalSystemPrompt).not.toContain('#billing-alerts');
		expect(summary?.finalSystemPrompt).not.toContain('<observations>');
	});

	it('reports null observations when compression never ran', () => {
		const summary = summarizeMemoryContext([run('r1', 1, [step('You are a builder.')])]);
		expect(summary?.observations).toBeNull();
		expect(summary?.observationStepCount).toBe(0);
	});

	it('takes the LAST observation block, ordering runs by startedAt', () => {
		// Out of order on purpose: the newest compressed state is what a memory
		// expectation asserts about, so input order must not decide the winner.
		const summary = summarizeMemoryContext([
			run('late', 200, [step('sys\n<observations>final state</observations>')]),
			run('early', 100, [step('sys\n<observations>earlier state</observations>')]),
		]);
		expect(summary?.observations).toBe('final state');
		expect(summary?.observationStepCount).toBe(2);
		expect(summary?.runCount).toBe(2);
		expect(summary?.stepCount).toBe(2);
	});

	it('takes the last observation block across steps within a run', () => {
		const summary = summarizeMemoryContext([
			run('r1', 1, [
				step('sys\n<observations>first</observations>', 1),
				step('sys\n<observations>second</observations>', 2),
			]),
		]);
		expect(summary?.observations).toBe('second');
	});

	it('retains the last observation block when a later step has none', () => {
		// Compression having run is a fact about the thread; a subsequent
		// uncompressed step must not erase it.
		const summary = summarizeMemoryContext([
			run('r1', 1, [step('sys\n<observations>kept</observations>', 1), step('sys only', 2)]),
		]);
		expect(summary?.observations).toBe('kept');
		expect(summary?.observationStepCount).toBe(1);
		expect(summary?.stepCount).toBe(2);
	});

	it('does not let a trailing unparseable system prompt blank out the last real one', () => {
		const summary = summarizeMemoryContext([
			run('r1', 1, [step('real prompt', 1), { stepNumber: 2, input: {} }]),
		]);
		expect(summary?.finalSystemPrompt).toBe('real prompt');
		expect(summary?.stepCount).toBe(2);
	});
});

describe('buildMemoryContextBlock', () => {
	it('tells the judge an absent observation block is not itself a failure', () => {
		// The Observer only compresses past a token threshold, so most threads have no
		// observation block while still holding every fact in the raw window. Reading
		// the empty block as a failure would red every memory expectation structurally.
		const summary = summarizeMemoryContext([run('r1', 1, [step('sys')])]);
		const block = buildMemoryContextBlock(summary!);
		expect(block).toContain('the Observer never compressed this thread');
		expect(block).toContain('NOT itself a failure');
		expect(block).toContain('"compressionRan": false');
	});

	it('reports compressionRan when the Observer did compress', () => {
		const summary = summarizeMemoryContext([
			run('r1', 1, [step('sys\n<observations>kept</observations>')]),
		]);
		expect(buildMemoryContextBlock(summary!)).toContain('"compressionRan": true');
	});

	it('includes the raw message window so an uncompressed thread is still gradable', () => {
		const summary = summarizeMemoryContext([
			run('r1', 1, [step('sys', 1, [{ role: 'user', content: 'alert channel is #payments-eu' }])]),
		]);
		expect(summary?.finalMessageWindow).toContain('#payments-eu');
		const block = buildMemoryContextBlock(summary!);
		expect(block).toContain('Raw message window');
		expect(block).toContain('#payments-eu');
	});

	it('renders tool-result payloads, not just a placeholder', () => {
		// Context the agent fetches on demand arrives as a tool result. Rendering only
		// `[tool-result: name]` would make the judge report retrieved facts as absent —
		// exactly the content a retrieval system exists to deliver.
		const summary = summarizeMemoryContext([
			run('r1', 1, [
				step('sys', 1, [
					{
						role: 'assistant',
						content: [
							{ type: 'tool-call', toolName: 'workflows', input: { q: 'billing' } },
							{
								type: 'tool-result',
								toolName: 'workflows',
								output: { name: 'Billing Sync', schedule: '07:00 weekdays' },
							},
						],
					},
				]),
			]),
		]);
		expect(summary?.finalMessageWindow).toContain('tool-result: workflows');
		expect(summary?.finalMessageWindow).toContain('Billing Sync');
		expect(summary?.finalMessageWindow).toContain('07:00 weekdays');
		// Tool-call arguments matter too — they show what the agent went looking for.
		expect(summary?.finalMessageWindow).toContain('billing');
	});

	it('bounds a single huge tool payload so it cannot crowd out the rest', () => {
		const summary = summarizeMemoryContext([
			run('r1', 1, [
				step('sys', 1, [
					{
						role: 'assistant',
						content: [
							{ type: 'tool-result', toolName: 'big', output: { blob: 'z'.repeat(50_000) } },
							{ type: 'text', text: 'NEEDLE_AFTER_BIG_PAYLOAD' },
						],
					},
				]),
			]),
		]);
		expect(summary?.finalMessageWindow).toContain('[payload truncated]');
		// The segment after the giant one must survive.
		expect(summary?.finalMessageWindow).toContain('NEEDLE_AFTER_BIG_PAYLOAD');
	});

	it('keeps both ends of an oversized window and labels the gap', () => {
		// A planted fact sits at the head, a fresh retrieval at the tail; cutting either
		// end would let the judge read a truncation as absence.
		const blocks = [
			{ role: 'user', content: 'HEAD_FACT_MARKER' },
			{ role: 'user', content: 'x'.repeat(120_000) },
			{ role: 'user', content: 'TAIL_FACT_MARKER' },
		];
		const summary = summarizeMemoryContext([run('r1', 1, [step('sys', 1, blocks)])]);
		const block = buildMemoryContextBlock(summary!);
		expect(block).toContain('HEAD_FACT_MARKER');
		expect(block).toContain('TAIL_FACT_MARKER');
		expect(block).toContain('omitted');
		expect(block).toContain('treat absence here as unknown');
	});

	it('caps an oversized message window', () => {
		const summary = summarizeMemoryContext([
			run('r1', 1, [step('sys', 1, [{ role: 'user', content: 'y'.repeat(200_000) }])]),
		]);
		const block = buildMemoryContextBlock(summary!);
		expect(block).toContain('omitted');
		expect(block.length).toBeLessThan(120_000);
	});

	it('includes the observation block, the system prompt and the counters', () => {
		const summary = summarizeMemoryContext([
			run('r1', 1, [step('You are a builder.\n<observations>Channel is #ops</observations>')]),
		]);
		const block = buildMemoryContextBlock(summary!);
		expect(block).toContain('Channel is #ops');
		expect(block).toContain('You are a builder.');
		expect(block).toContain('"stepsCarryingObservations": 1');
	});

	it('truncates an oversized system prompt so the observation block stays visible', () => {
		const summary = summarizeMemoryContext([
			run('r1', 1, [step(`${'x'.repeat(60_000)}\n<observations>needle</observations>`)]),
		]);
		const block = buildMemoryContextBlock(summary!);
		expect(block).toContain('[…truncated]');
		expect(block).toContain('needle');
		expect(block.length).toBeLessThan(50_000);
	});
});

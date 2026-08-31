import type { InstanceAiRunDebugResponse, InstanceAiRunDebugStep } from '@n8n/api-types';

import { captureContext, snapshotFor, tiersOf } from '../harness/context-capture';

/**
 * These exercise the REAL `parseSystemPromptForDisplay` / `parseMessageBlocks` from
 * `@n8n/api-types`. The observation block is extracted by that parser, so mocking it
 * would make these pass against a shape the product never emits — fixtures therefore
 * embed observations the way the agent actually does, as an `<observations>` element
 * inside the system prompt.
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

const msg = (text: string) => [{ role: 'user', content: text }];

describe('captureContext', () => {
	it('returns undefined when nothing was captured', () => {
		expect(captureContext(undefined)).toBeUndefined();
		expect(captureContext([])).toBeUndefined();
		expect(captureContext([run('r1', 1, [])])).toBeUndefined();
	});

	it('extracts the observation block out of the system prompt', () => {
		const captured = captureContext([
			run('r1', 1, [
				step('You build things.\n<observations>alerts go to #ops</observations>', 1, msg('hi')),
			]),
		]);
		expect(captured?.turnEnd.observations).toBe('alerts go to #ops');
		// Rendered as its own tier, so it must not leak back into the prompt text.
		expect(captured?.turnEnd.systemPrompt).not.toContain('alerts go to #ops');
	});

	it('anchors the probe to the first step of the LAST run', () => {
		const captured = captureContext([
			run('r1', 1, [step('sys', 1, msg('an earlier session turn'))]),
			run('r2', 2, [
				step('sys', 1, msg('state as the request arrived')),
				step('sys', 2, msg('what the agent produced while answering')),
			]),
		]);
		expect(captured?.probe?.messageWindow).toContain('state as the request arrived');
		expect(captured?.probe?.messageWindow).not.toContain('while answering');
		// Turn end keeps the newest state, which is the point of having two anchors.
		expect(captured?.turnEnd.messageWindow).toContain('while answering');
	});

	it('orders steps by stepNumber, not array position', () => {
		const captured = captureContext([
			run('r1', 1, [step('sys', 2, msg('later step')), step('sys', 1, msg('probe step'))]),
		]);
		expect(captured?.probe?.messageWindow).toContain('probe step');
	});

	// The bug this design exists to make impossible: a probe step that captured nothing
	// must not silently borrow the end-of-turn state. Grading a retention claim against
	// borrowed content counts what the agent produced WHILE ANSWERING as evidence that
	// it remembered, and it fails toward PASS.
	it('reports no probe at all when the graded turn captured nothing usable', () => {
		const captured = captureContext([
			run('r1', 1, [step('real prompt', 1, msg('real content'))]),
			run('r2', 2, [{ stepNumber: 1, input: {} }]),
		]);
		expect(captured?.probe).toBeUndefined();
		// The end-of-turn state is still reported — it is a different question.
		expect(captured?.turnEnd.messageWindow).toContain('real content');
	});

	it('needs BOTH a prompt and a window before it will call a snapshot gradable', () => {
		const promptOnly = captureContext([run('r1', 1, [step('a prompt with no window')])]);
		expect(promptOnly?.probe).toBeUndefined();

		const both = captureContext([run('r1', 1, [step('a prompt', 1, msg('and a window'))])]);
		expect(both?.probe).toBeDefined();
	});

	it('keeps the newest non-empty value per tier at turn end', () => {
		// A trailing step whose prompt failed to parse must not blank out the state we
		// would otherwise report.
		const captured = captureContext([
			run('r1', 1, [step('good prompt', 1, msg('good window')), { stepNumber: 2, input: {} }]),
		]);
		expect(captured?.turnEnd.systemPrompt).toContain('good prompt');
		expect(captured?.turnEnd.messageWindow).toContain('good window');
	});

	it('searches tool payloads, untruncated', () => {
		// A value can arrive deep inside a tool result. This text is searched, never
		// shown to a model, so there is no attention budget to protect.
		const captured = captureContext([
			run('r1', 1, [
				step('sys', 1, [
					{
						role: 'assistant',
						content: [
							{
								type: 'tool-result',
								toolName: 'get_workflow',
								output: { nodes: [{ name: 'Daily 06:00' }] },
							},
						],
					},
				]),
			]),
		]);
		expect(captured?.turnEnd.messageWindow).toContain('Daily 06:00');
	});
});

describe('snapshotFor', () => {
	it('selects the snapshot the anchor names', () => {
		const captured = captureContext([
			run('r1', 1, [step('sys', 1, msg('probe')), step('sys', 2, msg('end'))]),
		]);
		expect(captured).toBeDefined();
		expect(snapshotFor(captured!, 'probe')?.messageWindow).toContain('probe');
		expect(snapshotFor(captured!, 'turn-end')?.messageWindow).toContain('end');
	});
});

describe('tiersOf', () => {
	it('names all three tiers even when the observation block is absent', () => {
		const tiers = tiersOf({ observations: null, systemPrompt: 'p', messageWindow: 'w' });
		expect(tiers.map(([name]) => name)).toEqual([
			'observation block',
			'message window',
			'system prompt',
		]);
	});
});

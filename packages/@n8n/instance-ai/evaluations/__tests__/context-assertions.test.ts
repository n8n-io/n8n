import type { InstanceAiRunDebugResponse } from '@n8n/api-types';

import { checkContextAssertions } from '../harness/context-assertions';

/** Real capture shape: system prompt string plus SDK message parts. */
function debug(system: string, messages?: unknown[]): InstanceAiRunDebugResponse[] {
	return [
		{
			threadId: 't1',
			runId: 'r1',
			startedAt: 1,
			steps: [{ stepNumber: 0, input: messages ? { system, messages } : { system } }],
			workflowCode: [],
		},
	];
}

describe('checkContextAssertions', () => {
	it('returns nothing when a case declares none', () => {
		expect(checkContextAssertions(undefined, debug('sys'))).toEqual([]);
		expect(checkContextAssertions([], debug('sys'))).toEqual([]);
	});

	it('passes when the value is present, naming the tier it was found in', () => {
		const [v] = checkContextAssertions(
			[{ text: '#ops-alerts' }],
			debug('sys', [{ role: 'user', content: 'post failures to #ops-alerts please' }]),
		);
		expect(v.pass).toBe(true);
		expect(v.kind).toBe('memory');
		expect(v.reason).toContain('message window');
	});

	it('fails when the value never reached the context', () => {
		const [v] = checkContextAssertions(
			[{ text: 'maxTries' }],
			debug('sys', [{ role: 'user', content: 'just fetch it' }]),
		);
		expect(v.pass).toBe(false);
		expect(v.reason).toContain('not present');
	});

	it('finds values that arrived inside a tool result', () => {
		// The whole point: fetched context arrives as a tool payload, not as prose.
		const [v] = checkContextAssertions(
			[{ text: 'triggerAtHour' }],
			debug('sys', [
				{
					role: 'assistant',
					content: [
						{
							type: 'tool-result',
							toolName: 'workflows',
							output: { nodes: [{ parameters: { rule: { triggerAtHour: 6 } } }] },
						},
					],
				},
			]),
		);
		expect(v.pass).toBe(true);
	});

	it('searches the system prompt and the observation block too', () => {
		const sys = 'You are a builder.\n<observations>channel is #ops-alerts</observations>';
		const [inObs] = checkContextAssertions([{ text: '#ops-alerts' }], debug(sys));
		expect(inObs.pass).toBe(true);
		expect(inObs.reason).toContain('observation block');

		const [inSys] = checkContextAssertions([{ text: 'You are a builder' }], debug(sys));
		expect(inSys.pass).toBe(true);
		expect(inSys.reason).toContain('system prompt');
	});

	it('supports must-NOT-appear for stale values that should have been dropped', () => {
		const stale = debug('sys', [{ role: 'user', content: 'the old column was email_address' }]);
		const [present] = checkContextAssertions([{ text: 'email_address', mustAppear: false }], stale);
		expect(present.pass).toBe(false);
		expect(present.reason).toContain('still present');

		const [absent] = checkContextAssertions(
			[{ text: 'email_address', mustAppear: false }],
			debug('sys', [{ role: 'user', content: 'the column is subscriber_email' }]),
		);
		expect(absent.pass).toBe(true);
		expect(absent.reason).toContain('correctly absent');
	});

	it('matches case-insensitively, since casing drifts as content is re-rendered', () => {
		const [v] = checkContextAssertions(
			[{ text: 'notify ops' }],
			debug('sys', [{ role: 'user', content: 'the alert node is called Notify Ops' }]),
		);
		expect(v.pass).toBe(true);
	});

	it('searches past the judge truncation cap', () => {
		// The judge's view is capped so the interesting part stays in its attention;
		// this check has no such limit, so a value in an elided region is still found.
		const buried = [
			{ role: 'user', content: 'x'.repeat(200_000) },
			{ role: 'user', content: 'BURIED_NEEDLE' },
			{ role: 'user', content: 'y'.repeat(200_000) },
		];
		const [v] = checkContextAssertions([{ text: 'BURIED_NEEDLE' }], debug('sys', buried));
		expect(v.pass).toBe(true);
	});

	it('records incomplete, not failed, when no run debug was captured', () => {
		const [v] = checkContextAssertions([{ text: 'anything' }], undefined);
		expect(v.pass).toBe(false);
		expect(v.incomplete).toBe(true);
		expect(v.kind).toBe('memory');
		expect(v.reason).toContain('no run debug');
	});

	it('includes the author note in the verdict label', () => {
		const [v] = checkContextAssertions(
			[{ text: '2026-03-01', note: 'the cutover agreed at thread start' }],
			debug('sys'),
		);
		expect(v.expectation).toContain('2026-03-01');
		expect(v.expectation).toContain('the cutover agreed at thread start');
	});
});

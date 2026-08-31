import type { InstanceAiRunDebugResponse } from '@n8n/api-types';

import { checkContextAssertions } from '../harness/context-assertions';

/** Real capture shape: a system prompt plus SDK message parts. Both tiers are present
 *  because that is what a real step produces — a step missing either is a failed
 *  capture, which several tests below exercise deliberately. */
function debug(system: string, messages: unknown[] = [{ role: 'user', content: 'go on' }]) {
	return [
		{
			threadId: 't1',
			runId: 'r1',
			startedAt: 1,
			steps: [{ stepNumber: 1, input: { system, messages } }],
			workflowCode: [],
		},
	] satisfies InstanceAiRunDebugResponse[];
}

describe('checkContextAssertions', () => {
	it('returns nothing when a case declares none', () => {
		expect(checkContextAssertions(undefined, debug('sys'))).toEqual([]);
		expect(checkContextAssertions([], debug('sys'))).toEqual([]);
	});

	it('passes when the value is present, naming the tier it was found in', () => {
		const [verdict] = checkContextAssertions(
			[{ text: '#ops-alerts' }],
			debug('sys', [{ role: 'user', content: 'send failures to #ops-alerts' }]),
		);
		expect(verdict.pass).toBe(true);
		expect(verdict.kind).toBe('context');
		expect(verdict.reason).toContain('retained');
		expect(verdict.reason).toContain('message window');
	});

	it('matches case-insensitively', () => {
		// Casing drifts as content is re-rendered through tool payloads, and a casing
		// difference is never the finding.
		const [verdict] = checkContextAssertions(
			[{ text: '#OPS-Alerts' }],
			debug('sys', [{ role: 'user', content: 'use #ops-alerts' }]),
		);
		expect(verdict.pass).toBe(true);
	});

	it('searches the system prompt and the observation block, not just messages', () => {
		const sys = 'You build things.\n<observations>channel is #ops-alerts</observations>';
		const [inObs] = checkContextAssertions([{ text: '#ops-alerts' }], debug(sys));
		expect(inObs.pass).toBe(true);
		expect(inObs.reason).toContain('observation block');

		const [inSys] = checkContextAssertions([{ text: 'You build things' }], debug(sys));
		expect(inSys.pass).toBe(true);
		expect(inSys.reason).toContain('system prompt');
	});

	it('separates "never had it" from "re-derived it while answering"', () => {
		// The distinction that makes a retention claim worth measuring: the memory
		// subsystem did not carry this, the agent reproduced it during the turn.
		const runDebug: InstanceAiRunDebugResponse[] = [
			{
				threadId: 't1',
				runId: 'r1',
				startedAt: 1,
				steps: [
					{
						stepNumber: 1,
						input: { system: 'sys', messages: [{ role: 'user', content: 'fix it' }] },
					},
					{
						stepNumber: 2,
						input: {
							system: 'sys',
							messages: [{ role: 'assistant', content: 'looked it up: #ops-alerts' }],
						},
					},
				],
				workflowCode: [],
			},
		];
		const [verdict] = checkContextAssertions([{ text: '#ops-alerts' }], runDebug);
		expect(verdict.pass).toBe(false);
		expect(verdict.reason).toContain('NOT retained');
		expect(verdict.reason).toContain('re-derived');
	});

	it('reports a plain miss when the value is nowhere in the turn', () => {
		const [verdict] = checkContextAssertions([{ text: 'maxTries' }], debug('sys'));
		expect(verdict.pass).toBe(false);
		expect(verdict.reason).toContain('not present at the probe');
		expect(verdict.reason).not.toContain('re-derived');
	});

	it('supports must-NOT-appear for stale values that should have been dropped', () => {
		const stale = debug('sys', [{ role: 'user', content: 'the old column was email_address' }]);
		const [present] = checkContextAssertions([{ text: 'email_address', mustAppear: false }], stale);
		expect(present.pass).toBe(false);
		expect(present.reason).toContain('still present');

		const [absent] = checkContextAssertions(
			[{ text: 'email_address', mustAppear: false }],
			debug('sys'),
		);
		expect(absent.pass).toBe(true);
		expect(absent.reason).toContain('correctly absent');
	});

	it('grades a turn-end claim against the end of the turn', () => {
		// Retrieval happens AFTER the request arrives, so this claim can only be
		// answered at turn end — grading it at the probe could never pass.
		const runDebug: InstanceAiRunDebugResponse[] = [
			{
				threadId: 't1',
				runId: 'r1',
				startedAt: 1,
				steps: [
					{
						stepNumber: 1,
						input: { system: 'sys', messages: [{ role: 'user', content: 'fix it' }] },
					},
					{
						stepNumber: 2,
						input: {
							system: 'sys',
							messages: [{ role: 'assistant', content: 'fetched Daily Sync' }],
						},
					},
				],
				workflowCode: [],
			},
		];
		const [atEnd] = checkContextAssertions([{ text: 'Daily Sync', anchor: 'turn-end' }], runDebug);
		expect(atEnd.pass).toBe(true);
		expect(atEnd.reason).toContain('carried in or fetched');
		expect(atEnd.reason).not.toContain('retained');
	});

	it('declines to grade rather than inventing a verdict when nothing was captured', () => {
		const [verdict] = checkContextAssertions([{ text: '#ops-alerts' }], undefined);
		expect(verdict.incomplete).toBe(true);
		expect(verdict.pass).toBe(false);
		expect(verdict.reason).toContain('no run debug was captured');
	});

	// A probe claim graded against borrowed end-of-turn state fails toward PASS, which
	// is the direction that manufactures a finding. It must report "not checked".
	it('declines to grade a probe claim when the graded turn captured no probe state', () => {
		const runDebug: InstanceAiRunDebugResponse[] = [
			{
				threadId: 't1',
				runId: 'r1',
				startedAt: 1,
				steps: [
					{
						stepNumber: 1,
						input: { system: 'sys', messages: [{ role: 'user', content: 'use #ops-alerts' }] },
					},
				],
				workflowCode: [],
			},
			{
				threadId: 't1',
				runId: 'r2',
				startedAt: 2,
				steps: [{ stepNumber: 1, input: {} }],
				workflowCode: [],
			},
		];

		const [probe] = checkContextAssertions([{ text: '#ops-alerts' }], runDebug);
		expect(probe.incomplete).toBe(true);
		expect(probe.reason).toContain('not checked');
		expect(probe.reason).not.toContain('retained');

		// The end-of-turn state is unaffected, so a turn-end claim is still gradable.
		const [atEnd] = checkContextAssertions([{ text: '#ops-alerts', anchor: 'turn-end' }], runDebug);
		expect(atEnd.incomplete).toBeUndefined();
		expect(atEnd.pass).toBe(true);
	});

	it('describes the claim so the report is readable without the case file', () => {
		const [withNote] = checkContextAssertions(
			[{ text: '#ops-alerts', note: 'the agreed alert channel', anchor: 'turn-end' }],
			debug('sys'),
		);
		expect(withNote.expectation).toBe(
			'context contains "#ops-alerts" [by turn end] (the agreed alert channel)',
		);

		const [excludes] = checkContextAssertions(
			[{ text: 'email_address', mustAppear: false }],
			debug('sys'),
		);
		expect(excludes.expectation).toBe('context excludes "email_address"');
	});
});

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import { automationResultOf, summariseAutomationResult } from '../automationResult';

const RESULT = { workflowId: 'wf-1', url: 'http://localhost:5678/workflow/wf-1', kept: true };
const ON = { ...RESULT, active: true };
const OFF = { ...RESULT, active: false };
const ERROR = 'Saved "Morning digest", but could not turn it on: x';
const DENIED = { denied: true, message: 'The user declined this action.' };
const TURN_ON = { kind: 'capabilityDecision', approved: true, values: { activate: true } };

describe('automationResultOf', () => {
	it.each([
		['a workflow that is on', ON, { kind: 'kept', active: true, failed: false }],
		['a saved workflow that is off', OFF, { kind: 'kept', active: false, failed: false }],
		['a failed publish', { ...OFF, error: ERROR }, { kind: 'kept', active: false, failed: true }],
		['a declined or blocked answer', DENIED, { kind: 'refused' }],
		['"denied" without a message', { denied: true }, { kind: 'refused' }],
	])('reads %s', (_name, output, expected) => {
		expect(automationResultOf(output)).toEqual(expected);
	});
});

describe('summariseAutomationResult', () => {
	it.each([
		['a workflow that is on', ON, 'instanceAi.automation.summary.on'],
		['a saved workflow that is off', OFF, 'instanceAi.automation.summary.off'],
		[
			'a workflow that could not be turned on',
			{ ...OFF, error: ERROR },
			'instanceAi.automation.summary.notOn',
		],
		[
			'a live workflow whose changes are not live',
			{ ...ON, error: ERROR },
			'instanceAi.automation.summary.notLive',
		],
		['a declined or blocked answer', DENIED, 'instanceAi.automation.summary.declined'],
		[
			'a result with warnings',
			{ ...ON, warnings: ['Ignored the cron'] },
			'instanceAi.automation.summary.on',
		],
	])('summarises %s', (_name, output, key) => {
		expect(summariseAutomationResult(output)).toBe(key);
	});

	it.each([
		['no output', undefined],
		['null', null],
		['text', 'It is on'],
		['an empty object', {}],
		['only "active"', { active: true }],
		['a result that was not kept', { ...ON, kept: false }],
		['"active" as text', { ...RESULT, active: 'true' }],
		['"denied" as text', { denied: 'true' }],
		['the answer itself', TURN_ON],
	])('has no summary for %s', (_name, output) => {
		expect(automationResultOf(output)).toBeUndefined();
		expect(summariseAutomationResult(output)).toBeUndefined();
	});
});

describe('automation result properties', () => {
	const decisionArb = fc
		.record({
			approved: fc.boolean(),
			values: fc.option(
				fc.dictionary(
					fc.constantFrom('activate', 'target'),
					fc.oneof(fc.boolean(), fc.constantFrom('local', 'true')),
				),
				{ nil: undefined },
			),
		})
		.map((fields) => ({ kind: 'capabilityDecision' as const, ...fields }));

	/** Results with any mix of the fields that the summary reads. */
	const resultLikeArb = fc.record(
		{
			workflowId: fc.constantFrom('wf-1', 7),
			url: fc.constantFrom('http://localhost/workflow/wf-1', null),
			active: fc.constantFrom(true, false, 'true', 1),
			kept: fc.constantFrom(true, false, 'true'),
			error: fc.constantFrom('Could not publish', 42),
			denied: fc.constantFrom(true, false, 'true'),
		},
		{ requiredKeys: [] },
	);

	it('gives the answer itself no summary, so the step waits for the result', () => {
		fc.assert(
			fc.property(decisionArb, (decision) => {
				expect(automationResultOf(decision)).toBeUndefined();
				expect(summariseAutomationResult(decision)).toBeUndefined();
			}),
		);
	});

	it('never says "on" unless the result is a kept workflow that is live without an error', () => {
		fc.assert(
			fc.property(resultLikeArb, (output) => {
				const isOn =
					output.denied !== true &&
					typeof output.workflowId === 'string' &&
					typeof output.url === 'string' &&
					output.kept === true &&
					output.active === true &&
					output.error === undefined;

				expect(summariseAutomationResult(output) === 'instanceAi.automation.summary.on').toBe(isOn);
			}),
		);
	});

	it('says "Not automated" exactly when the result is denied', () => {
		fc.assert(
			fc.property(resultLikeArb, (output) => {
				const declined =
					summariseAutomationResult(output) === 'instanceAi.automation.summary.declined';

				expect(declined).toBe(output.denied === true);
			}),
		);
	});
});

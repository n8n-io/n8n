import { describe, expect, it } from 'vitest';
import fc from 'fast-check';

import { automationResultOf, summariseAutomationResult } from '../automationResult';

const RESULT = { workflowId: 'wf-1', url: 'http://localhost:5678/workflow/wf-1', kept: true };
const ON = { ...RESULT, active: true };
const OFF = { ...RESULT, active: false };
const ERROR = 'Saved "Morning digest", but could not turn it on: x';
const DENIED = { denied: true, message: 'The user declined this action.' };
const TURN_ON = { kind: 'capabilityDecision', approved: true, values: { activate: true } };
const REMOTE_URL = 'https://cloud.example.test/workflow/remote-9';
const CLOUD_PLACE = {
	targetId: '3f1c2b6e-8a4d-4e2b-9c1a-7d5e6f8a9b0c',
	kind: 'linked',
	name: 'Cloud',
};

describe('automationResultOf', () => {
	it.each([
		['a workflow that is on', ON, { kind: 'kept', active: true, failed: false, url: RESULT.url }],
		[
			'a saved workflow that is off',
			OFF,
			{ kind: 'kept', active: false, failed: false, url: RESULT.url },
		],
		[
			'a failed publish',
			{ ...OFF, error: ERROR },
			{ kind: 'kept', active: false, failed: true, url: RESULT.url },
		],
		[
			'a workflow in a linked instance',
			{ ...ON, url: REMOTE_URL, place: CLOUD_PLACE },
			{ kind: 'kept', active: true, failed: false, url: REMOTE_URL, place: CLOUD_PLACE },
		],
		[
			'a copy that is live there while the workflow here still runs',
			{ ...ON, url: REMOTE_URL, place: CLOUD_PLACE, error: 'x', problems: ['still-on-here'] },
			{
				kind: 'kept',
				active: true,
				failed: true,
				url: REMOTE_URL,
				place: CLOUD_PLACE,
				problems: ['still-on-here'],
			},
		],
		[
			'an empty list of problems as no problems',
			{ ...ON, url: REMOTE_URL, place: CLOUD_PLACE, problems: [] },
			{ kind: 'kept', active: true, failed: false, url: REMOTE_URL, place: CLOUD_PLACE },
		],
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
		[
			'a live copy in a linked instance that needs a check',
			{ ...ON, error: ERROR, place: CLOUD_PLACE },
			'instanceAi.automation.summary.needsCheck',
		],
		[
			'a copy in a linked instance that could not be turned on',
			{ ...OFF, error: ERROR, place: CLOUD_PLACE, problems: ['not-on', 'kept-on-here'] },
			'instanceAi.automation.summary.notOn',
		],
		[
			'a copy in a linked instance with only an error, from before the problem kinds',
			{ ...OFF, error: ERROR, place: CLOUD_PLACE },
			'instanceAi.automation.summary.notOn',
		],
		[
			'a saved copy that is off there, of a workflow that n8n could not keep here',
			{ ...OFF, error: ERROR, place: CLOUD_PLACE, problems: ['not-kept-here'] },
			'instanceAi.automation.summary.savedNeedsCheck',
		],
		[
			'a live copy of a workflow that n8n could not keep here',
			{ ...ON, error: ERROR, place: CLOUD_PLACE, problems: ['not-kept-here'] },
			'instanceAi.automation.summary.needsCheck',
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
		['a place without a target', { ...ON, place: { kind: 'linked' } }],
		['an unknown problem', { ...ON, place: CLOUD_PLACE, problems: ['runs-twice'] }],
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

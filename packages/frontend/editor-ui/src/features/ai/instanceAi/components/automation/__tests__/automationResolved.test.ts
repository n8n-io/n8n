import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
	automationTriggerKindSchema,
	type AutomationProposalCard as Proposal,
} from '@n8n/api-types';

import { capabilityDecisionOf } from '@/features/ai/shared/agentsChat/resolvedCards';
import {
	actionOf,
	decisionFor,
	triggerLineKey,
	type AutomationAction,
} from '../automationProposal';
import {
	automationResultOf,
	resolvedStatus,
	summariseAutomationResult,
	toolOutcome,
	type AutomationToolOutcome,
} from '../automationResolved';
import { makeManualProposal, makeProposal } from './automationProposalFixtures';

const RESULT = { workflowId: 'wf-1', url: 'http://localhost:5678/workflow/wf-1', kept: true };
const ON = { ...RESULT, active: true };
const OFF = { ...RESULT, active: false };
const ON_WITH_ERROR = { ...ON, error: 'Saved "Morning digest", but could not turn it on: x' };
const OFF_WITH_ERROR = { ...OFF, error: 'Saved "Morning digest", but could not turn it on: x' };
const DENIED = { denied: true, message: 'The user declined this action.' };

const TURN_ON = { kind: 'capabilityDecision', approved: true, values: { activate: true } };

const WAITING: AutomationToolOutcome = { kind: 'waiting' };
const REFUSED: AutomationToolOutcome = { kind: 'refused' };
const kept = (active: boolean, failed = false): AutomationToolOutcome => ({
	kind: 'kept',
	active,
	failed,
});

const ACTIONS: AutomationAction[] = ['activate', 'save', 'decline'];

describe('actionOf', () => {
	it.each([
		['a decline', { approved: false }, 'decline'],
		[
			'a decline that also says activate',
			{ approved: false, values: { activate: true } },
			'decline',
		],
		['an approval with activate', { approved: true, values: { activate: true } }, 'activate'],
		['an approval without activate', { approved: true, values: { activate: false } }, 'save'],
		['an approval without values', { approved: true }, 'save'],
		['an approval with activate as text', { approved: true, values: { activate: 'true' } }, 'save'],
	] as const)('reads %s as "%s"', (_name, fields, expected) => {
		expect(actionOf({ kind: 'capabilityDecision', ...fields })).toBe(expected);
	});
});

describe('triggerLineKey as a clause', () => {
	it.each([
		['schedule', 'instanceAi.automation.resolved.trigger.schedule'],
		['webhook', 'instanceAi.automation.resolved.trigger.webhook'],
		['form', 'instanceAi.automation.resolved.trigger.form'],
		['chat', 'instanceAi.automation.resolved.trigger.chat'],
		['app-event', 'instanceAi.automation.resolved.trigger.appEvent'],
		['other', 'instanceAi.automation.resolved.trigger.other'],
	] as const)('names a %s trigger with a clause', (kind, key) => {
		expect(triggerLineKey({ kind }, 'clause')).toEqual({ key });
	});

	it('keeps the schedule and its zone, with the clause of the kind as the fallback', () => {
		const trigger = { kind: 'schedule' as const, cron: '0 8 * * 1-5', timezone: 'Europe/London' };

		expect(triggerLineKey(trigger, 'clause')).toEqual({
			key: 'instanceAi.automation.resolved.trigger.cronWithTimezone',
			cron: '0 8 * * 1-5',
			timezone: 'Europe/London',
			fallbackKey: 'instanceAi.automation.resolved.trigger.schedule',
		});
		expect(triggerLineKey({ kind: 'schedule', cron: '0 8 * * *' }, 'clause')).toEqual({
			key: 'instanceAi.automation.resolved.trigger.cron',
			cron: '0 8 * * *',
			fallbackKey: 'instanceAi.automation.resolved.trigger.schedule',
		});
	});

	it('has no clause for a manual workflow, and keeps the full line as the default', () => {
		expect(triggerLineKey({ kind: 'manual' }, 'clause')).toBeUndefined();
		expect(triggerLineKey({ kind: 'webhook' })).toEqual({
			key: 'instanceAi.automation.trigger.webhook',
		});
	});
});

describe('toolOutcome', () => {
	it('waits while the tool step holds the answer in place of the result', () => {
		expect(toolOutcome({ result: TURN_ON })).toEqual(WAITING);
		expect(toolOutcome({})).toEqual(WAITING);
	});

	it('reads a kept workflow from the result', () => {
		expect(toolOutcome({ result: ON })).toEqual(kept(true));
		expect(toolOutcome({ result: OFF_WITH_ERROR })).toEqual(kept(false, true));
	});

	it('reads a declined or blocked result and a failed call as refused', () => {
		expect(toolOutcome({ result: DENIED })).toEqual(REFUSED);
		expect(toolOutcome({ error: 'You cannot reach this workflow' })).toEqual(REFUSED);
		// The error wins: a failed call has no result to trust.
		expect(toolOutcome({ result: ON, error: 'Tool call failed' })).toEqual(REFUSED);
	});
});

describe('resolvedStatus', () => {
	const offProposal = makeProposal();
	const liveProposal = makeProposal({ active: true, hasUnpublishedChanges: true });

	it.each([
		['decline', offProposal, undefined, 'declined'],
		['decline', offProposal, kept(true), 'declined'],
		['activate', offProposal, undefined, 'on'],
		['activate', offProposal, WAITING, 'turning-on'],
		['activate', offProposal, kept(true), 'on'],
		['activate', offProposal, kept(false), 'not-on'],
		['activate', offProposal, kept(false, true), 'not-on'],
		['activate', liveProposal, kept(true, true), 'not-live'],
		['activate', offProposal, REFUSED, 'not-saved'],
		['save', offProposal, undefined, 'saved'],
		['save', offProposal, WAITING, 'saved'],
		['save', offProposal, kept(false), 'saved'],
		['save', liveProposal, undefined, 'saved-live'],
		['save', liveProposal, WAITING, 'saved-live'],
		['save', liveProposal, kept(true), 'saved-live'],
		// The result is the truth when it disagrees with the card.
		['save', liveProposal, kept(false), 'saved'],
		['save', offProposal, kept(true), 'saved-live'],
		['save', offProposal, REFUSED, 'not-saved'],
	] as const)('"%s" with outcome %#: %s', (action, proposal, outcome, kind) => {
		expect(resolvedStatus(action, proposal, outcome).kind).toBe(kind);
	});

	it.each([
		{ kind: 'on', action: 'activate', outcome: kept(true), tone: 'success', showsLink: true },
		{ kind: 'turning-on', action: 'activate', outcome: WAITING, tone: 'neutral', showsLink: true },
		{ kind: 'not-on', action: 'activate', outcome: kept(false), tone: 'warning', showsLink: true },
		{ kind: 'saved', action: 'save', outcome: undefined, tone: 'success', showsLink: true },
		{ kind: 'not-saved', action: 'save', outcome: REFUSED, tone: 'warning', showsLink: false },
		{ kind: 'declined', action: 'decline', outcome: undefined, tone: 'neutral', showsLink: false },
	] as const)('shows "$kind" with its tone and link', ({ kind, action, outcome, ...view }) => {
		expect(resolvedStatus(action, makeProposal(), outcome)).toMatchObject({ kind, ...view });
	});

	it.each([
		['on', 'instanceAi.automation.resolved.on'],
		['turning-on', 'instanceAi.automation.resolved.turningOn'],
		['not-on', 'instanceAi.automation.resolved.notOn'],
		['not-live', 'instanceAi.automation.resolved.notLive'],
		['saved', 'instanceAi.automation.resolved.saved'],
		['saved-live', 'instanceAi.automation.resolved.savedLive'],
		['not-saved', 'instanceAi.automation.resolved.notSaved'],
		['declined', 'instanceAi.automation.resolved.declined'],
	] as const)('has its own copy for "%s"', (kind, key) => {
		const cases = {
			on: ['activate', undefined],
			'turning-on': ['activate', WAITING],
			'not-on': ['activate', kept(false)],
			'not-live': ['activate', kept(true, true)],
			saved: ['save', kept(false)],
			'saved-live': ['save', kept(true)],
			'not-saved': ['save', REFUSED],
			declined: ['decline', undefined],
		} as const;
		const [action, outcome] = cases[kind];

		expect(resolvedStatus(action, makeProposal(), outcome)).toMatchObject({
			kind,
			messageKey: key,
		});
	});

	it('says that a workflow without a trigger line is active, without a "runs" clause', () => {
		const status = resolvedStatus('activate', makeManualProposal(), kept(true));

		expect(status).toEqual({
			kind: 'on',
			messageKey: 'instanceAi.automation.resolved.onNoTrigger',
			tone: 'success',
			showsLink: true,
		});
	});
});

describe('automationResultOf and summariseAutomationResult', () => {
	it.each([
		['a workflow that is on', ON, 'instanceAi.automation.summary.on'],
		['a saved workflow that is off', OFF, 'instanceAi.automation.summary.off'],
		[
			'a workflow that could not be turned on',
			OFF_WITH_ERROR,
			'instanceAi.automation.summary.notOn',
		],
		[
			'a live workflow whose changes are not live',
			ON_WITH_ERROR,
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

// --- Properties ---

const triggerArb: fc.Arbitrary<Proposal['trigger']> = fc
	.constantFrom(...automationTriggerKindSchema.options)
	.map((kind) => (kind === 'schedule' ? { kind, cron: '0 8 * * 1-5' } : { kind }));

const proposalArb = fc
	.record({
		active: fc.boolean(),
		hasUnpublishedChanges: fc.boolean(),
		trigger: triggerArb,
		offered: fc.record({
			target: fc.uniqueArray(fc.constantFrom('local', 'cloud-1'), { minLength: 1 }),
			activate: fc.uniqueArray(fc.boolean(), { minLength: 1 }),
		}),
	})
	.map((fields) => makeProposal(fields));

const outcomeArb: fc.Arbitrary<AutomationToolOutcome | undefined> = fc.oneof(
	fc.constant(undefined),
	fc.constant(WAITING),
	fc.constant(REFUSED),
	fc.record({ kind: fc.constant('kept' as const), active: fc.boolean(), failed: fc.boolean() }),
);

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

describe('answered card properties', () => {
	it('reads every answer of the card back as its button', () => {
		fc.assert(
			fc.property(proposalArb, fc.constantFrom(...ACTIONS), (proposal, action) => {
				const decision = capabilityDecisionOf(decisionFor(action, proposal));

				expect(decision).toBeDefined();
				expect(decision && actionOf(decision)).toBe(action);
			}),
		);
	});

	it('says "on" only for "Turn it on", and only when no result says otherwise', () => {
		fc.assert(
			fc.property(fc.constantFrom(...ACTIONS), proposalArb, outcomeArb, (action, p, outcome) => {
				const { kind } = resolvedStatus(action, p, outcome);
				const resultSaysOn =
					outcome === undefined || (outcome.kind === 'kept' && outcome.active && !outcome.failed);

				expect(kind === 'on').toBe(action === 'activate' && resultSaysOn);
			}),
		);
	});

	it('declines only for "Not now", and links the workflow only when it was kept', () => {
		fc.assert(
			fc.property(fc.constantFrom(...ACTIONS), proposalArb, outcomeArb, (action, p, outcome) => {
				const status = resolvedStatus(action, p, outcome);
				const refused = action !== 'decline' && outcome?.kind === 'refused';

				expect(status.kind === 'declined').toBe(action === 'decline');
				expect(status.kind === 'not-saved').toBe(refused);
				expect(status.showsLink).toBe(action !== 'decline' && !refused);
			}),
		);
	});

	it('gives the answer itself no summary, so the step waits for the result', () => {
		fc.assert(
			fc.property(decisionArb, (decision) => {
				expect(summariseAutomationResult(decision)).toBeUndefined();
				expect(toolOutcome({ result: decision })).toEqual(WAITING);
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
});

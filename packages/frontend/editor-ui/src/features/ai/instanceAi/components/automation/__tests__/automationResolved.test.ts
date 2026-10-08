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
import { resolvedStatus, toolOutcome, type AutomationToolOutcome } from '../automationResolved';
import { makeManualProposal, makeProposal } from './automationProposalFixtures';

const RESULT = { workflowId: 'wf-1', url: 'http://localhost:5678/workflow/wf-1', kept: true };
const ON = { ...RESULT, active: true };
const OFF = { ...RESULT, active: false };
const OFF_WITH_ERROR = { ...OFF, error: 'Saved "Morning digest", but could not turn it on: x' };
const DENIED = { denied: true, message: 'The user declined this action.' };

const TURN_ON = { kind: 'capabilityDecision', approved: true, values: { activate: true } };

const WAITING: AutomationToolOutcome = { kind: 'waiting' };
const REFUSED: AutomationToolOutcome = { kind: 'refused' };
const FAILED: AutomationToolOutcome = { kind: 'failed' };
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

	it('reads a declined or blocked result as refused', () => {
		expect(toolOutcome({ result: DENIED })).toEqual(REFUSED);
	});

	it('reads a call that ended in an error as failed, whatever its result says', () => {
		expect(toolOutcome({ error: 'You cannot reach this workflow' })).toEqual(FAILED);
		// The error wins: a failed call has no result to trust.
		expect(toolOutcome({ result: ON, error: 'Tool call failed' })).toEqual(FAILED);
		expect(toolOutcome({ result: DENIED, error: '' })).toEqual(FAILED);
	});
});

describe('resolvedStatus', () => {
	const offProposal = makeProposal();
	const liveProposal = makeProposal({ active: true, hasUnpublishedChanges: true });

	it.each([
		['decline', offProposal, undefined, 'declined'],
		['decline', offProposal, kept(true), 'declined'],
		['decline', offProposal, FAILED, 'declined'],
		['activate', offProposal, undefined, 'on'],
		['activate', offProposal, WAITING, 'turning-on'],
		['activate', offProposal, kept(true), 'on'],
		['activate', offProposal, kept(false), 'not-on'],
		['activate', offProposal, kept(false, true), 'not-on'],
		['activate', liveProposal, kept(true, true), 'not-live'],
		['activate', liveProposal, kept(false, true), 'not-on'],
		['activate', offProposal, REFUSED, 'not-saved'],
		['activate', offProposal, FAILED, 'failed'],
		// "Make changes live" on a workflow that was on already.
		['activate', liveProposal, undefined, 'changes-live'],
		['activate', liveProposal, WAITING, 'making-live'],
		['activate', liveProposal, kept(true), 'changes-live'],
		['activate', liveProposal, REFUSED, 'not-saved'],
		['activate', liveProposal, FAILED, 'failed'],
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
		['save', liveProposal, FAILED, 'failed'],
	] as const)('"%s" with outcome %#: %s', (action, proposal, outcome, kind) => {
		expect(resolvedStatus(action, proposal, outcome).kind).toBe(kind);
	});

	it.each([
		{ kind: 'on', action: 'activate', outcome: kept(true), tone: 'success', showsLink: true },
		{ kind: 'turning-on', action: 'activate', outcome: WAITING, tone: 'neutral', showsLink: true },
		{ kind: 'not-on', action: 'activate', outcome: kept(false), tone: 'warning', showsLink: true },
		{ kind: 'saved', action: 'save', outcome: undefined, tone: 'success', showsLink: true },
		{ kind: 'not-saved', action: 'save', outcome: REFUSED, tone: 'warning', showsLink: false },
		{ kind: 'failed', action: 'save', outcome: FAILED, tone: 'warning', showsLink: true },
		{ kind: 'declined', action: 'decline', outcome: undefined, tone: 'neutral', showsLink: false },
	] as const)('shows "$kind" with its tone and link', ({ kind, action, outcome, ...view }) => {
		expect(resolvedStatus(action, makeProposal(), outcome)).toMatchObject({ kind, ...view });
	});

	it.each([
		['on', 'instanceAi.automation.resolved.on'],
		['changes-live', 'instanceAi.automation.resolved.changesLive'],
		['turning-on', 'instanceAi.automation.resolved.turningOn'],
		['making-live', 'instanceAi.automation.resolved.makingLive'],
		['not-on', 'instanceAi.automation.resolved.notOn'],
		['not-live', 'instanceAi.automation.resolved.notLive'],
		['saved', 'instanceAi.automation.resolved.saved'],
		['saved-live', 'instanceAi.automation.resolved.savedLive'],
		['not-saved', 'instanceAi.automation.resolved.notSaved'],
		['failed', 'instanceAi.automation.resolved.failed'],
		['declined', 'instanceAi.automation.resolved.declined'],
	] as const)('has its own copy for "%s"', (kind, key) => {
		const live = makeProposal({ active: true, hasUnpublishedChanges: true });
		const cases = {
			on: ['activate', undefined, makeProposal()],
			'changes-live': ['activate', kept(true), live],
			'turning-on': ['activate', WAITING, makeProposal()],
			'making-live': ['activate', WAITING, live],
			'not-on': ['activate', kept(false), makeProposal()],
			'not-live': ['activate', kept(true, true), makeProposal()],
			saved: ['save', kept(false), makeProposal()],
			'saved-live': ['save', kept(true), makeProposal()],
			'not-saved': ['save', REFUSED, makeProposal()],
			failed: ['activate', FAILED, makeProposal()],
			declined: ['decline', undefined, makeProposal()],
		} as const;
		const [action, outcome, proposal] = cases[kind];

		expect(resolvedStatus(action, proposal, outcome)).toMatchObject({
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

	it('says that the changes are live, without a "runs" clause, for a live workflow without a trigger line', () => {
		const status = resolvedStatus('activate', makeManualProposal({ active: true }), kept(true));

		expect(status).toEqual({
			kind: 'changes-live',
			messageKey: 'instanceAi.automation.resolved.changesLiveNoTrigger',
			tone: 'success',
			showsLink: true,
		});
	});

	it('keeps the "runs" clause for every other state, also without a trigger line', () => {
		expect(resolvedStatus('save', makeManualProposal(), kept(false)).messageKey).toBe(
			'instanceAi.automation.resolved.saved',
		);
		expect(resolvedStatus('activate', makeManualProposal(), WAITING).messageKey).toBe(
			'instanceAi.automation.resolved.turningOn',
		);
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
	fc.constant(FAILED),
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

	it('says that it is on only for "Turn it on", and only when no result says otherwise', () => {
		fc.assert(
			fc.property(fc.constantFrom(...ACTIONS), proposalArb, outcomeArb, (action, p, outcome) => {
				const { kind } = resolvedStatus(action, p, outcome);
				const resultSaysOn =
					outcome === undefined || (outcome.kind === 'kept' && outcome.active && !outcome.failed);
				const saysOn = kind === 'on' || kind === 'changes-live';

				expect(saysOn).toBe(action === 'activate' && resultSaysOn);
				// A workflow that was on already gets "Your changes are live", never "It's on".
				if (saysOn) expect(kind).toBe(p.active ? 'changes-live' : 'on');
			}),
		);
	});

	it('declines only for "Not now", and links the workflow unless nothing was kept', () => {
		fc.assert(
			fc.property(fc.constantFrom(...ACTIONS), proposalArb, outcomeArb, (action, p, outcome) => {
				const status = resolvedStatus(action, p, outcome);
				const answered = action !== 'decline';
				const refused = answered && outcome?.kind === 'refused';

				expect(status.kind === 'declined').toBe(!answered);
				expect(status.kind === 'not-saved').toBe(refused);
				expect(status.kind === 'failed').toBe(answered && outcome?.kind === 'failed');
				expect(status.showsLink).toBe(answered && !refused);
			}),
		);
	});

	it('reads the answer itself as a wait for the result', () => {
		fc.assert(
			fc.property(decisionArb, (decision) => {
				expect(toolOutcome({ result: decision })).toEqual(WAITING);
			}),
		);
	});
});

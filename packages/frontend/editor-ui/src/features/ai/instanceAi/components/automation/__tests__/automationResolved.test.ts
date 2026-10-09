import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
	automationLinkedProblemSchema,
	automationTriggerKindSchema,
	type AutomationLinkedProblem,
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
	proposalOutcome,
	resolvedLink,
	resolvedStatus,
	toolOutcome,
	type AnsweredPlace,
	type AutomationToolOutcome,
} from '../automationResolved';
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
	url: RESULT.url,
});

const ACTIONS: AutomationAction[] = ['activate', 'save', 'decline'];

const HERE: AnsweredPlace = { linked: false, ownLink: false };
/** A linked place of the viewer's own: the owner of the chat. */
const OWN_LINK: AnsweredPlace = { linked: true, ownLink: true };
/** A linked place that the viewer does not have: a teammate in a shared chat. */
const OTHERS_LINK: AnsweredPlace = { linked: true, ownLink: false };

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

describe('proposalOutcome', () => {
	it('reads the outcome of a propose_automation call', () => {
		expect(proposalOutcome({ toolName: 'propose_automation', result: ON })).toEqual(kept(true));
		expect(proposalOutcome({ toolName: 'propose_automation', error: 'x' })).toEqual(FAILED);
	});

	it('reads nothing from a call of another tool with the id of the card', () => {
		// A model can use a tool call id again: an earlier build call can have the card's id.
		expect(proposalOutcome({ toolName: 'build-workflow', result: { workflowId: 'wf-1' } })).toBe(
			undefined,
		);
		expect(proposalOutcome({ toolName: 'build-workflow', error: 'x' })).toBeUndefined();
		expect(proposalOutcome({ result: ON })).toBeUndefined();
	});

	it('reads nothing without a call', () => {
		expect(proposalOutcome(undefined)).toBeUndefined();
	});
});

describe('resolvedStatus', () => {
	const offProposal = makeProposal();
	const liveProposal = makeProposal({ active: true, hasUnpublishedChanges: true });
	const manualProposal = makeManualProposal();
	// The user may not publish, or an admin blocked publishing for the Assistant.
	const lockedProposal = makeProposal({
		canActivate: false,
		offered: { target: ['local'], activate: [false] },
	});

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
		// A manual workflow cannot be turned on, so "Save" does not ask the user to.
		['save', manualProposal, undefined, 'saved-manual'],
		['save', manualProposal, WAITING, 'saved-manual'],
		['save', manualProposal, kept(false), 'saved-manual'],
		['save', manualProposal, REFUSED, 'not-saved'],
		// The card said that it cannot turn the workflow on, so "Save" does not ask either.
		['save', lockedProposal, undefined, 'saved-locked'],
		['save', lockedProposal, WAITING, 'saved-locked'],
		['save', lockedProposal, kept(false), 'saved-locked'],
		['save', lockedProposal, FAILED, 'failed'],
		// A live version keeps running, whatever the trigger or the rights.
		['save', manualProposal, kept(true), 'saved-live'],
		['save', makeProposal({ canActivate: false, active: true }), undefined, 'saved-live'],
		['save', makeProposal({ canActivate: false, active: true }), kept(false), 'saved-locked'],
	] as const)('"%s" with outcome %#: %s', (action, proposal, outcome, kind) => {
		expect(resolvedStatus(action, proposal, outcome).kind).toBe(kind);
	});

	it.each([
		{ kind: 'on', action: 'activate', outcome: kept(true), tone: 'success', showsLink: true },
		{ kind: 'turning-on', action: 'activate', outcome: WAITING, tone: 'pending', showsLink: true },
		{ kind: 'not-on', action: 'activate', outcome: kept(false), tone: 'warning', showsLink: true },
		{ kind: 'saved', action: 'save', outcome: undefined, tone: 'success', showsLink: true },
		{ kind: 'saved-manual', action: 'save', outcome: undefined, tone: 'success', showsLink: true },
		{ kind: 'saved-locked', action: 'save', outcome: undefined, tone: 'success', showsLink: true },
		{ kind: 'not-saved', action: 'save', outcome: REFUSED, tone: 'warning', showsLink: false },
		{ kind: 'failed', action: 'save', outcome: FAILED, tone: 'warning', showsLink: true },
		{ kind: 'declined', action: 'decline', outcome: undefined, tone: 'neutral', showsLink: false },
	] as const)('shows "$kind" with its tone and link', ({ kind, action, outcome, ...view }) => {
		const proposals: Partial<Record<string, Proposal>> = {
			'saved-manual': makeManualProposal(),
			'saved-locked': makeProposal({ canActivate: false }),
		};
		const proposal = proposals[kind] ?? makeProposal();

		expect(resolvedStatus(action, proposal, outcome)).toMatchObject({ kind, ...view });
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
		['saved-manual', 'instanceAi.automation.resolved.savedManual'],
		['saved-locked', 'instanceAi.automation.resolved.savedLocked'],
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
			'saved-manual': ['save', kept(false), makeManualProposal()],
			'saved-locked': ['save', kept(false), makeProposal({ canActivate: false })],
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
			'instanceAi.automation.resolved.savedManual',
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
		canActivate: fc.boolean(),
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
	fc.record(
		{
			kind: fc.constant('kept' as const),
			active: fc.boolean(),
			failed: fc.boolean(),
			url: fc.constantFrom(RESULT.url, 'https://cloud.example.test/workflow/remote-9'),
			problems: fc.uniqueArray(fc.constantFrom(...automationLinkedProblemSchema.options), {
				minLength: 1,
			}),
		},
		{ requiredKeys: ['kind', 'active', 'failed', 'url'] },
	),
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

describe('resolvedStatus and resolvedLink for a linked instance', () => {
	const REMOTE_URL = 'https://cloud.example.test/workflow/remote-9';
	const keptThere = (active: boolean, url = REMOTE_URL): AutomationToolOutcome => ({
		kind: 'kept',
		active,
		failed: false,
		url,
	});

	it('says that a saved copy is in the linked instance, and links to it there', () => {
		const status = resolvedStatus('save', makeProposal(), keptThere(false), true);

		expect(status).toMatchObject({
			kind: 'saved',
			messageKey: 'instanceAi.automation.resolved.savedIn',
		});
		expect(resolvedLink(status, keptThere(false), OWN_LINK)).toEqual({
			kind: 'remote',
			url: REMOTE_URL,
		});
	});

	it('says where a saved manual copy is', () => {
		expect(resolvedStatus('save', makeManualProposal(), keptThere(false), true).messageKey).toBe(
			'instanceAi.automation.resolved.savedManualIn',
		);
	});

	it('keeps the "on" copy, which names the place already', () => {
		expect(resolvedStatus('activate', makeProposal(), keptThere(true), true)).toMatchObject({
			kind: 'on',
			messageKey: 'instanceAi.automation.resolved.on',
		});
	});

	it('links nowhere while the copy is on its way, nor after a failed copy, which kept nothing here', () => {
		const waiting = resolvedStatus('activate', makeProposal(), WAITING, true);
		const failed = resolvedStatus('activate', makeProposal(), FAILED, true);

		expect(waiting).toMatchObject({
			kind: 'turning-on',
			messageKey: 'instanceAi.automation.resolved.turningOnIn',
			tone: 'pending',
		});
		expect(resolvedLink(waiting, WAITING, OWN_LINK)).toBeUndefined();
		expect(resolvedLink(waiting, undefined, OWN_LINK)).toBeUndefined();
		expect(failed).toMatchObject({
			kind: 'failed',
			messageKey: 'instanceAi.automation.resolved.failedIn',
			showsLink: false,
		});
		expect(resolvedLink(failed, FAILED, OWN_LINK)).toBeUndefined();
	});

	it('says that a live copy is on there, not that changes are live, for a workflow live here', () => {
		const live = makeProposal({ active: true });

		expect(resolvedStatus('activate', live, keptThere(true), true)).toMatchObject({
			kind: 'on',
			messageKey: 'instanceAi.automation.resolved.on',
		});
		expect(resolvedStatus('activate', live, WAITING, true).kind).toBe('turning-on');
		expect(resolvedStatus('activate', live, undefined, true).kind).toBe('on');
		expect(
			resolvedStatus('activate', makeManualProposal({ active: true }), keptThere(true), true)
				.messageKey,
		).toBe('instanceAi.automation.resolved.onNoTriggerIn');
	});

	const withProblems = (
		active: boolean,
		problems: AutomationLinkedProblem[],
	): AutomationToolOutcome => ({
		kind: 'kept',
		active,
		failed: true,
		url: REMOTE_URL,
		problems,
	});

	interface ProblemCase {
		label: string;
		active: boolean;
		problems: AutomationLinkedProblem[];
		kind: string;
		key: string;
	}

	it.each<ProblemCase>([
		{
			label: 'a copy that is off there',
			active: false,
			problems: ['not-on'],
			kind: 'not-on',
			key: 'notOnIn',
		},
		{
			label: 'an earlier version that stays live there',
			active: true,
			problems: ['not-on'],
			kind: 'not-live',
			key: 'notLiveIn',
		},
		{
			label: 'a live copy that needs set-up there',
			active: true,
			problems: ['not-ready'],
			kind: 'not-ready',
			key: 'notReadyIn',
		},
		{
			label: 'a copy that runs there and here',
			active: true,
			problems: ['still-on-here'],
			kind: 'still-on-here',
			key: 'stillOnHere',
		},
		{
			label: 'a copy that is off there, with the workflow here kept on',
			active: false,
			problems: ['not-on', 'kept-on-here'],
			kind: 'not-on',
			key: 'notOnKeptHere',
		},
		{
			label: 'an earlier version live there, with the workflow here kept on',
			active: true,
			problems: ['not-on', 'kept-on-here'],
			kind: 'not-live',
			key: 'notLiveKeptHere',
		},
		{
			label: 'a live copy that needs set-up, with the workflow here kept on until then',
			active: true,
			problems: ['not-ready', 'kept-on-here'],
			kind: 'not-ready',
			key: 'notReadyKeptHere',
		},
	])('names the problem of "Turn it on" for $label', ({ active, problems, kind, key }) => {
		const status = resolvedStatus('activate', makeProposal(), withProblems(active, problems), true);

		expect(status).toMatchObject({
			kind,
			messageKey: `instanceAi.automation.resolved.${key}`,
			tone: 'warning',
		});
		expect(status).not.toHaveProperty('noteKey');
	});

	it('links here for a copy that runs there and here, so that the user can turn this one off', () => {
		const outcome = withProblems(true, ['still-on-here']);
		const status = resolvedStatus('activate', makeProposal(), outcome, true);

		expect(resolvedLink(status, outcome, OWN_LINK)).toEqual({ kind: 'local' });
	});

	it('opens the copy there while the workflow here keeps running until the copy is ready', () => {
		const outcome = withProblems(true, ['not-ready', 'kept-on-here']);
		const status = resolvedStatus('activate', makeProposal(), outcome, true);

		expect(resolvedLink(status, outcome, OWN_LINK)).toEqual({ kind: 'remote', url: REMOTE_URL });
	});

	it('says what the copy did and adds that n8n could not keep the workflow here', () => {
		const on = resolvedStatus(
			'activate',
			makeProposal(),
			withProblems(true, ['not-kept-here']),
			true,
		);
		const notOn = resolvedStatus(
			'activate',
			makeProposal(),
			withProblems(false, ['not-on', 'not-kept-here']),
			true,
		);
		const saved = resolvedStatus(
			'save',
			makeProposal(),
			withProblems(false, ['not-kept-here']),
			true,
		);

		expect(on).toMatchObject({
			kind: 'on',
			messageKey: 'instanceAi.automation.resolved.on',
			tone: 'warning',
			noteKey: 'instanceAi.automation.resolved.notKeptHere',
		});
		expect(notOn).toMatchObject({
			kind: 'not-on',
			noteKey: 'instanceAi.automation.resolved.notKeptHere',
		});
		expect(saved).toMatchObject({
			kind: 'saved',
			messageKey: 'instanceAi.automation.resolved.savedIn',
			tone: 'warning',
			noteKey: 'instanceAi.automation.resolved.notKeptHere',
		});
	});

	it('reads a failed live copy without problem kinds as one that needs a check there', () => {
		const failed: AutomationToolOutcome = {
			kind: 'kept',
			active: true,
			failed: true,
			url: REMOTE_URL,
		};

		expect(resolvedStatus('activate', makeProposal(), failed, true).kind).toBe('not-ready');
		expect(resolvedStatus('save', makeProposal(), failed, true).kind).toBe('saved-not-ready');
	});

	it('warns after a save that finds a copy there that runs, or that needs set-up', () => {
		const live = makeProposal({ active: true });

		expect(resolvedStatus('save', live, withProblems(true, ['still-on-here']), true)).toMatchObject(
			{
				kind: 'still-on-here',
				messageKey: 'instanceAi.automation.resolved.stillOnHere',
				tone: 'warning',
			},
		);
		// A save does not tell which version is live there, so the line does not say that the live
		// copy cannot run: it can be an earlier version that runs.
		for (const proposal of [makeProposal(), live]) {
			const status = resolvedStatus('save', proposal, withProblems(true, ['not-ready']), true);
			expect(status).toMatchObject({
				kind: 'saved-not-ready',
				messageKey: 'instanceAi.automation.resolved.savedNotReadyIn',
				tone: 'warning',
			});
			expect(resolvedLink(status, withProblems(true, ['not-ready']), OWN_LINK)).toEqual({
				kind: 'remote',
				url: REMOTE_URL,
			});
		}
	});

	it("gives a teammate no link to the copy, because the address names the owner's link", () => {
		const status = resolvedStatus('activate', makeProposal(), keptThere(true), true);

		expect(resolvedLink(status, keptThere(true), OTHERS_LINK)).toBeUndefined();
		expect(resolvedLink(status, keptThere(true), OWN_LINK)).toEqual({
			kind: 'remote',
			url: REMOTE_URL,
		});
	});

	it('bases a linked save on the copy there, not on the workflow here', () => {
		const live = makeProposal({ active: true });

		expect(resolvedStatus('save', live, WAITING, true)).toMatchObject({
			kind: 'copying',
			messageKey: 'instanceAi.automation.resolved.copyingTo',
			tone: 'pending',
			showsLink: false,
		});
		expect(resolvedStatus('save', live, keptThere(false), true)).toMatchObject({
			kind: 'saved-copy',
			messageKey: 'instanceAi.automation.resolved.savedCopyIn',
		});
		expect(resolvedStatus('save', makeProposal(), keptThere(true), true)).toMatchObject({
			kind: 'saved-live',
			messageKey: 'instanceAi.automation.resolved.savedLiveIn',
		});
		expect(
			resolvedStatus('save', makeProposal({ canActivate: false }), keptThere(false), true)
				.messageKey,
		).toBe('instanceAi.automation.resolved.savedLockedIn');
	});

	it('links nowhere for an address that is not http(s), and never for "Not now"', () => {
		const unsafe = keptThere(true, 'javascript:alert(1)');
		const declined = resolvedStatus('decline', makeProposal(), undefined, true);

		expect(
			resolvedLink(resolvedStatus('activate', makeProposal(), unsafe, true), unsafe, OWN_LINK),
		).toBe(undefined);
		expect(resolvedLink(declined, undefined, OWN_LINK)).toBeUndefined();
	});

	it('opens a workflow here in the editor, as before', () => {
		const status = resolvedStatus('activate', makeProposal(), kept(true));

		expect(status.messageKey).toBe('instanceAi.automation.resolved.on');
		expect(resolvedLink(status, kept(true), HERE)).toEqual({ kind: 'local' });
		expect(resolvedStatus('save', makeProposal(), kept(false)).messageKey).toBe(
			'instanceAi.automation.resolved.saved',
		);
	});
});

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

	it('asks the user to turn a saved workflow on only when the user can', () => {
		fc.assert(
			fc.property(proposalArb, outcomeArb, (p, outcome) => {
				const { kind } = resolvedStatus('save', p, outcome);
				if (outcome?.kind === 'refused' || outcome?.kind === 'failed') return;
				const live = outcome?.kind === 'kept' ? outcome.active : p.active;
				const canTurnOn = p.trigger.kind !== 'manual' && p.canActivate;

				expect(['saved', 'saved-live', 'saved-manual', 'saved-locked']).toContain(kind);
				expect(kind === 'saved-live').toBe(live);
				expect(kind === 'saved').toBe(!live && canTurnOn);
				expect(kind === 'saved-manual').toBe(!live && p.trigger.kind === 'manual');
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

	it('never reports a linked problem in the tone of a success', () => {
		fc.assert(
			fc.property(
				fc.constantFrom<AutomationAction>('activate', 'save'),
				proposalArb,
				outcomeArb,
				(action, p, outcome) => {
					const status = resolvedStatus(action, p, outcome, true);
					const problems: readonly AutomationLinkedProblem[] =
						outcome?.kind === 'kept' ? (outcome.problems ?? []) : [];
					// "kept-on-here" comes only with "not-on" or "not-ready", which name the problem.
					const flagged = problems.some((problem) => problem !== 'kept-on-here');

					if (flagged) expect(status.tone).toBe('warning');
					expect(status.noteKey !== undefined).toBe(problems.includes('not-kept-here'));
				},
			),
		);
	});

	it('opens a linked copy only at the http(s) address of a kept result, and nothing it did not keep', () => {
		fc.assert(
			fc.property(
				fc.constantFrom(...ACTIONS),
				proposalArb,
				outcomeArb,
				fc.record({ linked: fc.boolean(), ownLink: fc.boolean() }),
				(action, p, outcome, place) => {
					const { linked, ownLink } = place;
					const status = resolvedStatus(action, p, outcome, linked);
					const link = resolvedLink(status, outcome, place);

					if (!status.showsLink) expect(link).toBeUndefined();
					if (link?.kind === 'remote') {
						expect(linked && ownLink).toBe(true);
						expect(outcome?.kind === 'kept' && outcome.url).toBe(link.url);
						expect(link.url).toMatch(/^https?:\/\//);
					}
					// Only a workflow that still runs here sends a linked answer to the workflow here.
					if (link?.kind === 'local' && linked) expect(status.kind).toBe('still-on-here');
					if (status.showsLink && !linked) expect(link).toEqual({ kind: 'local' });
				},
			),
		);
	});
});

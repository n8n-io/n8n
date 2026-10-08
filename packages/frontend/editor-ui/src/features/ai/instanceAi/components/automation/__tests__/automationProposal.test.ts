import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
	AUTOMATION_PROPOSAL_LIMITS,
	automationProposalCardSchema,
	automationRecommendationReasonSchema,
	automationTriggerKindSchema,
	type AutomationProposalCard as Proposal,
	type AutomationRecommendationReason,
	type AutomationTriggerKind,
} from '@n8n/api-types';

import {
	activationNoteKey,
	answerTargetId,
	cardActions,
	decisionFor,
	hiddenStepCount,
	liveStatusKey,
	LOCAL_CAVEAT_KEY,
	placeOf,
	placeReasonKey,
	sharedProjectCount,
	showsLocalCaveat,
	titleKey,
	triggerLineKey,
	visibleSteps,
} from '../automationProposal';
import { makeManualProposal, makeProposal } from './automationProposalFixtures';

const local = (reasons: AutomationRecommendationReason[]): Proposal['recommended'] => ({
	targetId: 'local',
	kind: 'local',
	reasons,
});

const CLOUD_TARGET = {
	id: 'cloud-1',
	kind: 'linked',
	label: 'Team cloud',
	status: 'online',
} as const;

describe('triggerLineKey', () => {
	it.each<[Exclude<AutomationTriggerKind, 'manual'>, string]>([
		['schedule', 'instanceAi.automation.trigger.schedule'],
		['webhook', 'instanceAi.automation.trigger.webhook'],
		['form', 'instanceAi.automation.trigger.form'],
		['chat', 'instanceAi.automation.trigger.chat'],
		['app-event', 'instanceAi.automation.trigger.appEvent'],
		['other', 'instanceAi.automation.trigger.other'],
	])('gives the %s trigger its own line', (kind, key) => {
		expect(triggerLineKey({ kind })).toEqual({ key });
	});

	it('gives a manual workflow no trigger line, also with a cron', () => {
		expect(triggerLineKey({ kind: 'manual' })).toBeUndefined();
		expect(triggerLineKey({ kind: 'manual', cron: '0 8 * * *' })).toBeUndefined();
	});

	it('describes a cron with its time zone and keeps the kind line as the fallback', () => {
		expect(
			triggerLineKey({ kind: 'schedule', cron: '0 8 * * 1-5', timezone: 'Europe/London' }),
		).toEqual({
			key: 'instanceAi.automation.trigger.cronWithTimezone',
			cron: '0 8 * * 1-5',
			timezone: 'Europe/London',
			fallbackKey: 'instanceAi.automation.trigger.schedule',
		});
	});

	it('describes a cron without a time zone with the plain schedule copy', () => {
		expect(triggerLineKey({ kind: 'schedule', cron: '*/15 * * * *' })).toEqual({
			key: 'instanceAi.automation.trigger.cron',
			cron: '*/15 * * * *',
			fallbackKey: 'instanceAi.automation.trigger.schedule',
		});
	});
});

describe('placeReasonKey', () => {
	it.each<[AutomationRecommendationReason, string | undefined]>([
		['needs-local-files', 'instanceAi.automation.reason.needsLocalFiles'],
		['needs-local-commands', 'instanceAi.automation.reason.needsLocalCommands'],
		['needs-local-trigger', 'instanceAi.automation.reason.needsLocalTrigger'],
		['always-on-trigger', LOCAL_CAVEAT_KEY],
		['no-cloud-linked', undefined],
		['manual-only', undefined],
		['cloud-offline', undefined],
	])('maps the local reason %s', (reason, key) => {
		expect(placeReasonKey(local([reason]), { kind: 'schedule' })).toBe(key);
	});

	it('shows only the first reason', () => {
		expect(
			placeReasonKey(local(['needs-local-commands', 'needs-local-files']), { kind: 'schedule' }),
		).toBe('instanceAi.automation.reason.needsLocalCommands');
		expect(
			placeReasonKey(local(['no-cloud-linked', 'needs-local-files']), { kind: 'schedule' }),
		).toBeUndefined();
	});

	it('has no local reason for a linked recommendation', () => {
		const linked: Proposal['recommended'] = {
			targetId: 'cloud-1',
			kind: 'linked',
			reasons: ['needs-local-files'],
		};

		expect(
			placeReasonKey({ ...linked, reasons: ['needs-local-files'] }, { kind: 'webhook' }),
		).toBeUndefined();
		expect(
			placeReasonKey({ ...linked, reasons: ['always-on-trigger'] }, { kind: 'webhook' }),
		).toBeUndefined();
	});

	it('has no caveat for a manual workflow, but keeps a local need', () => {
		expect(placeReasonKey(local(['always-on-trigger']), { kind: 'manual' })).toBeUndefined();
		expect(placeReasonKey(local(['needs-local-files']), { kind: 'manual' })).toBe(
			'instanceAi.automation.reason.needsLocalFiles',
		);
	});
});

describe('showsLocalCaveat', () => {
	it.each<AutomationTriggerKind>(['schedule', 'webhook', 'form', 'chat', 'app-event'])(
		'adds the caveat for a %s trigger on this computer',
		(kind) => {
			const proposal = makeProposal({
				trigger: { kind },
				recommended: local(['needs-local-files']),
			});

			expect(showsLocalCaveat(proposal)).toBe(true);
		},
	);

	it.each<AutomationTriggerKind>(['manual', 'other'])('adds no caveat for a %s trigger', (kind) => {
		const proposal = makeProposal({ trigger: { kind }, recommended: local(['needs-local-files']) });

		expect(showsLocalCaveat(proposal)).toBe(false);
	});

	it('adds no second caveat when the place line already says it', () => {
		const proposal = makeProposal({ recommended: local(['always-on-trigger', 'no-cloud-linked']) });

		expect(placeOf(proposal).reasonKey).toBe(LOCAL_CAVEAT_KEY);
		expect(showsLocalCaveat(proposal)).toBe(false);
	});

	it('adds the caveat when the first reason has no text', () => {
		const proposal = makeProposal({ recommended: local(['no-cloud-linked']) });

		expect(placeOf(proposal).reasonKey).toBeUndefined();
		expect(showsLocalCaveat(proposal)).toBe(true);
	});

	it('adds no caveat for a linked place', () => {
		const proposal = makeProposal({
			recommended: { targetId: 'cloud-1', kind: 'linked', reasons: ['always-on-trigger'] },
			targets: [CLOUD_TARGET],
			offered: { target: ['cloud-1'], activate: [true, false] },
		});

		expect(showsLocalCaveat(proposal)).toBe(false);
	});
});

describe('placeOf', () => {
	it('names this computer with the reason of the recommendation', () => {
		const proposal = makeProposal({ recommended: local(['needs-local-trigger']) });

		expect(placeOf(proposal)).toEqual({
			linked: false,
			reasonKey: 'instanceAi.automation.reason.needsLocalTrigger',
			caveat: true,
		});
	});

	it('names a linked instance by its label, and never by its id', () => {
		const linked: Partial<Proposal> = {
			recommended: { targetId: 'cloud-1', kind: 'linked', reasons: ['always-on-trigger'] },
			offered: { target: ['cloud-1'], activate: [true, false] },
		};

		expect(placeOf(makeProposal({ ...linked, targets: [CLOUD_TARGET] }))).toEqual({
			linked: true,
			linkedLabel: 'Team cloud',
			caveat: false,
		});
		for (const label of [undefined, '', '   ']) {
			expect(placeOf(makeProposal({ ...linked, targets: [{ ...CLOUD_TARGET, label }] }))).toEqual({
				linked: true,
				caveat: false,
			});
		}
	});

	it('names the offered target, without the reason, when the recommendation is not offered', () => {
		const proposal = makeProposal({
			recommended: { targetId: 'cloud-1', kind: 'linked', reasons: ['always-on-trigger'] },
			targets: [{ id: 'local', kind: 'local', status: 'online' }, CLOUD_TARGET],
			offered: { target: ['local'], activate: [true, false] },
		});

		expect(answerTargetId(proposal)).toBe('local');
		expect(placeOf(proposal)).toEqual({ linked: false, caveat: true });
	});

	it('shows no local reason when the targets list says the place is linked', () => {
		const proposal = makeProposal({
			targets: [{ id: 'local', kind: 'linked', label: 'Team cloud', status: 'online' }],
		});

		expect(placeOf(proposal)).toEqual({ linked: true, linkedLabel: 'Team cloud', caveat: false });
	});

	it('reads the kind of a target that the targets list leaves out', () => {
		const missingLocal = makeProposal({ targets: [CLOUD_TARGET] });
		const missingLinked = makeProposal({
			recommended: { targetId: 'cloud-2', kind: 'linked', reasons: ['always-on-trigger'] },
			targets: [{ id: 'local', kind: 'local', status: 'online' }],
			offered: { target: ['cloud-2'], activate: [true] },
		});

		expect(placeOf(missingLocal).linked).toBe(false);
		expect(placeOf(missingLinked)).toEqual({ linked: true, caveat: false });
	});
});

describe('answerTargetId', () => {
	it('prefers the recommended target when the card offers it', () => {
		const proposal = makeProposal({
			targets: [{ id: 'local', kind: 'local', status: 'online' }, CLOUD_TARGET],
			offered: { target: ['cloud-1', 'local'], activate: [true, false] },
		});

		expect(answerTargetId(proposal)).toBe('local');
	});

	it('takes the first offered target otherwise', () => {
		const proposal = makeProposal({
			offered: { target: ['cloud-1', 'cloud-2'], activate: [false] },
		});

		expect(answerTargetId(proposal)).toBe('cloud-1');
	});
});

describe('titleKey and cardActions', () => {
	it('offers to turn on, to save switched off and to decline, in this order', () => {
		const proposal = makeProposal();

		expect(titleKey(proposal)).toBe('instanceAi.automation.proposal.title');
		expect(cardActions(proposal)).toEqual([
			{ action: 'activate', labelKey: 'instanceAi.automation.action.turnOn', type: 'primary' },
			{ action: 'save', labelKey: 'instanceAi.automation.action.saveOff', type: 'secondary' },
			{ action: 'decline', labelKey: 'instanceAi.automation.action.notNow', type: 'tertiary' },
		]);
	});

	it('asks to keep a manual workflow and makes saving the primary action', () => {
		const proposal = makeManualProposal();

		expect(titleKey(proposal)).toBe('instanceAi.automation.proposal.titleKeep');
		expect(cardActions(proposal)).toEqual([
			{ action: 'save', labelKey: 'instanceAi.automation.action.saveWorkflow', type: 'primary' },
			{ action: 'decline', labelKey: 'instanceAi.automation.action.notNow', type: 'tertiary' },
		]);
	});

	it('does not offer to turn on when the card does not offer activate: true', () => {
		const proposal = makeProposal({ offered: { target: ['local'], activate: [false] } });

		expect(titleKey(proposal)).toBe('instanceAi.automation.proposal.titleKeep');
		expect(cardActions(proposal).map(({ action }) => action)).toEqual(['save', 'decline']);
	});

	it('does not offer to save switched off when the card does not offer activate: false', () => {
		const proposal = makeProposal({ offered: { target: ['local'], activate: [true] } });

		expect(cardActions(proposal).map(({ action }) => action)).toEqual(['activate', 'decline']);
	});
});

describe('a workflow that is live now', () => {
	const live = (overrides: Partial<Proposal> = {}) =>
		makeProposal({ active: true, hasUnpublishedChanges: false, ...overrides });

	it('offers to make saved changes live, or to save them and keep the live version', () => {
		const proposal = live({ hasUnpublishedChanges: true });

		expect(titleKey(proposal)).toBe('instanceAi.automation.proposal.titleUpdate');
		expect(liveStatusKey(proposal)).toBe('instanceAi.automation.status.liveWithChanges');
		expect(activationNoteKey(proposal)).toBeUndefined();
		expect(cardActions(proposal)).toEqual([
			{ action: 'activate', labelKey: 'instanceAi.automation.action.makeLive', type: 'primary' },
			{
				action: 'save',
				labelKey: 'instanceAi.automation.action.saveKeepLive',
				type: 'secondary',
			},
			{ action: 'decline', labelKey: 'instanceAi.automation.action.notNow', type: 'tertiary' },
		]);
	});

	it('only offers to keep a workflow whose saved version is live, as turning it on changes nothing', () => {
		const proposal = live();

		expect(titleKey(proposal)).toBe('instanceAi.automation.proposal.titleKeep');
		expect(liveStatusKey(proposal)).toBe('instanceAi.automation.status.live');
		expect(activationNoteKey(proposal)).toBeUndefined();
		expect(cardActions(proposal)).toEqual([
			{ action: 'save', labelKey: 'instanceAi.automation.action.saveWorkflow', type: 'primary' },
			{ action: 'decline', labelKey: 'instanceAi.automation.action.notNow', type: 'tertiary' },
		]);
	});

	it('says that changes cannot go live from the card when it cannot activate', () => {
		const proposal = live({
			hasUnpublishedChanges: true,
			canActivate: false,
			offered: { target: ['local'], activate: [false] },
		});

		expect(titleKey(proposal)).toBe('instanceAi.automation.proposal.titleKeep');
		expect(activationNoteKey(proposal)).toBe('instanceAi.automation.note.cannotMakeLive');
		expect(cardActions(proposal).map(({ labelKey }) => labelKey)).toEqual([
			'instanceAi.automation.action.saveWorkflow',
			'instanceAi.automation.action.notNow',
		]);
	});

	it('has no live status for a workflow that is off', () => {
		expect(liveStatusKey(makeProposal())).toBeUndefined();
		// The flag means nothing without a live version.
		expect(liveStatusKey(makeProposal({ hasUnpublishedChanges: true }))).toBeUndefined();
	});
});

describe('activationNoteKey', () => {
	it('says why a trigger that can start the workflow has no "Turn it on" button', () => {
		const proposal = makeProposal({
			canActivate: false,
			offered: { target: ['local'], activate: [false] },
		});

		expect(cardActions(proposal).map(({ action }) => action)).toEqual(['save', 'decline']);
		expect(activationNoteKey(proposal)).toBe('instanceAi.automation.note.cannotTurnOn');
	});

	it('adds no note when the card can turn the workflow on', () => {
		expect(activationNoteKey(makeProposal())).toBeUndefined();
	});

	it('adds no note for a manual workflow, as its title already asks only to keep it', () => {
		expect(activationNoteKey(makeManualProposal())).toBeUndefined();
	});

	it.each<AutomationTriggerKind>(['webhook', 'form', 'chat', 'app-event', 'other'])(
		'adds the note for a %s trigger that the card cannot turn on',
		(kind) => {
			const proposal = makeProposal({
				trigger: { kind },
				offered: { target: ['local'], activate: [false] },
			});

			expect(activationNoteKey(proposal)).toBe('instanceAi.automation.note.cannotTurnOn');
		},
	);
});

describe('sharedProjectCount', () => {
	const project = (index: number) => ({
		projectId: `project-${index}`,
		projectName: `Project ${index}`,
		projectType: 'team' as const,
	});

	it('counts every other project, also those that the card does not list', () => {
		expect(sharedProjectCount(makeProposal())).toBe(0);
		expect(
			sharedProjectCount(makeProposal({ sharedWith: { projects: [project(1)], total: 14 } })),
		).toBe(14);
	});

	it('never counts fewer projects than the card lists', () => {
		const sharedWith = { projects: [project(1), project(2)], total: 1 };

		expect(sharedProjectCount(makeProposal({ sharedWith }))).toBe(2);
	});
});

describe('decisionFor', () => {
	const proposal = makeProposal();

	it('turns the workflow on at the recommended target', () => {
		expect(decisionFor('activate', proposal)).toEqual({
			kind: 'capabilityDecision',
			approved: true,
			values: { target: 'local', activate: true },
		});
	});

	it('saves the workflow switched off at the recommended target', () => {
		expect(decisionFor('save', proposal)).toEqual({
			kind: 'capabilityDecision',
			approved: true,
			values: { target: 'local', activate: false },
		});
	});

	it('declines without values', () => {
		expect(decisionFor('decline', proposal)).toEqual({
			kind: 'capabilityDecision',
			approved: false,
		});
	});
});

describe('visibleSteps and hiddenStepCount', () => {
	const step = (index: number) => ({ name: `Step ${index}`, type: 'n8n-nodes-base.set' });

	it('counts the running nodes that have no icon', () => {
		const steps = Array.from({ length: AUTOMATION_PROPOSAL_LIMITS.steps }, (_, index) =>
			step(index),
		);
		const proposal = makeProposal({ steps, stepCount: 15 });

		expect(visibleSteps(proposal)).toHaveLength(12);
		expect(hiddenStepCount(proposal)).toBe(3);
	});

	it('hides nothing when every step has an icon', () => {
		expect(hiddenStepCount(makeProposal())).toBe(0);
		expect(hiddenStepCount(makeProposal({ stepCount: 1 }))).toBe(0);
	});

	it('keeps at most twelve icons', () => {
		// The schema rejects more steps, so build the card without it.
		const steps = Array.from({ length: 13 }, (_, index) => step(index));
		const proposal = { ...makeProposal(), steps, stepCount: 13 };

		expect(visibleSteps(proposal)).toEqual(steps.slice(0, 12));
		expect(hiddenStepCount(proposal)).toBe(1);
	});
});

// --- Properties ---

const TARGET_IDS = ['local', 'cloud-1', 'cloud-2'] as const;
const targetIdArb = fc.constantFrom(...TARGET_IDS);

const triggerArb = fc.record(
	{
		kind: fc.constantFrom(...automationTriggerKindSchema.options),
		cron: fc.constantFrom('0 8 * * 1-5', '*/15 * * * *', 'not a cron'),
		timezone: fc.constantFrom('Europe/London', 'Asia/Kolkata'),
	},
	{ requiredKeys: ['kind'] },
);

const targetArb = fc.record(
	{
		id: targetIdArb,
		kind: fc.constantFrom('local' as const, 'linked' as const),
		label: fc.string({ minLength: 1, maxLength: 12 }),
		status: fc.constantFrom('online' as const, 'offline' as const, 'unauthorised' as const),
	},
	{ requiredKeys: ['id', 'kind', 'status'] },
);

/** Any card that the schema accepts, also cards whose fields disagree with each other. */
const proposalArb: fc.Arbitrary<Proposal> = fc
	.record({
		title: fc.string({ minLength: 1, maxLength: 40 }),
		trigger: triggerArb,
		steps: fc.array(
			fc.record({
				name: fc.string({ maxLength: 12 }),
				type: fc.constantFrom('n8n-nodes-base.slack', 'n8n-nodes-base.scheduleTrigger'),
			}),
			{ maxLength: AUTOMATION_PROPOSAL_LIMITS.steps },
		),
		stepCount: fc.nat({ max: 40 }),
		recommended: fc.record({
			targetId: targetIdArb,
			kind: fc.constantFrom('local' as const, 'linked' as const),
			reasons: fc.array(fc.constantFrom(...automationRecommendationReasonSchema.options), {
				minLength: 1,
				maxLength: 3,
			}),
		}),
		targets: fc.array(targetArb, { minLength: 1, maxLength: 3 }),
		active: fc.boolean(),
		hasUnpublishedChanges: fc.boolean(),
		canActivate: fc.boolean(),
		offered: fc.record({
			target: fc.uniqueArray(targetIdArb, { minLength: 1 }),
			activate: fc.uniqueArray(fc.boolean(), { minLength: 1 }),
		}),
	})
	.map((fields) => makeProposal(fields));

const TYPE_ORDER = { primary: 0, secondary: 1, tertiary: 2 } as const;

/** The title asks the question of the primary button, or only to keep the workflow. */
function expectedTitle(proposal: Proposal, offersTurnOn: boolean): string {
	if (!offersTurnOn) return 'instanceAi.automation.proposal.titleKeep';
	if (proposal.active) return 'instanceAi.automation.proposal.titleUpdate';
	return 'instanceAi.automation.proposal.title';
}

describe('automation proposal properties', () => {
	it('sends only values that the card offered, as the server checks them', () => {
		fc.assert(
			fc.property(proposalArb, (proposal) => {
				expect(automationProposalCardSchema.safeParse(proposal).success).toBe(true);
				const offered: Record<string, ReadonlyArray<string | boolean>> = proposal.offered;
				for (const { action } of cardActions(proposal)) {
					const body = decisionFor(action, proposal);
					if (body.kind !== 'capabilityDecision') throw new Error('Wrong answer kind');
					if (!body.approved) {
						expect(action).toBe('decline');
						expect(body.values).toBeUndefined();
						continue;
					}
					for (const [field, value] of Object.entries(body.values ?? {})) {
						const options = Object.hasOwn(offered, field) ? offered[field] : [];
						expect(options).toContain(value);
					}
					expect(body.values?.activate).toBe(action === 'activate');
				}
			}),
		);
	});

	it('never offers to turn on when the card cannot activate or the saved version is live', () => {
		fc.assert(
			fc.property(proposalArb, (proposal) => {
				const actions = cardActions(proposal).map(({ action }) => action);
				const savedVersionLive = proposal.active && !proposal.hasUnpublishedChanges;
				if (!proposal.canActivate || savedVersionLive) expect(actions).not.toContain('activate');
				expect(titleKey(proposal)).toBe(expectedTitle(proposal, actions.includes('activate')));
			}),
		);
	});

	it('explains a missing "Turn it on" exactly when the trigger could start the workflow', () => {
		fc.assert(
			fc.property(proposalArb, (proposal) => {
				const offersTurnOn = cardActions(proposal).some(({ action }) => action === 'activate');
				const savedVersionLive = proposal.active && !proposal.hasUnpublishedChanges;
				const needsNote = !offersTurnOn && proposal.trigger.kind !== 'manual' && !savedVersionLive;

				expect(activationNoteKey(proposal) !== undefined).toBe(needsNote);
				expect(liveStatusKey(proposal) !== undefined).toBe(proposal.active);
			}),
		);
	});

	it('never says "leave it off" for a workflow that is live', () => {
		fc.assert(
			fc.property(proposalArb, (proposal) => {
				const labels = cardActions(proposal).map(({ labelKey }) => labelKey);
				const offLabels = [
					'instanceAi.automation.action.saveOff',
					'instanceAi.automation.action.turnOn',
				];

				if (proposal.active) for (const label of offLabels) expect(labels).not.toContain(label);
			}),
		);
	});

	it('keeps one primary action first, then secondary, then "Not now" last', () => {
		fc.assert(
			fc.property(proposalArb, (proposal) => {
				const actions = cardActions(proposal);
				const types = actions.map(({ type }) => TYPE_ORDER[type]);

				expect(types).toEqual([...types].sort((a, b) => a - b));
				expect(actions.at(-1)?.action).toBe('decline');
				expect(actions.filter(({ type }) => type === 'primary').length).toBeLessThanOrEqual(1);
				expect(new Set(actions.map(({ action }) => action)).size).toBe(actions.length);
			}),
		);
	});

	it('shows the local caveat at most once', () => {
		fc.assert(
			fc.property(proposalArb, (proposal) => {
				const place = placeOf(proposal);
				const caveats = [place.reasonKey === LOCAL_CAVEAT_KEY, place.caveat].filter(Boolean);

				expect(caveats.length).toBeLessThanOrEqual(1);
				if (place.linked) expect(caveats).toEqual([]);
				if (!place.linked) expect(place.linkedLabel).toBeUndefined();
			}),
		);
	});

	it('names the target that the answer sends', () => {
		fc.assert(
			fc.property(proposalArb, (proposal) => {
				const target = answerTargetId(proposal);

				expect(target === undefined || proposal.offered.target.includes(target)).toBe(true);
				if (proposal.offered.target.includes(proposal.recommended.targetId)) {
					expect(target).toBe(proposal.recommended.targetId);
				}
			}),
		);
	});

	it('gives every running node an icon or a place in the hidden count', () => {
		fc.assert(
			fc.property(proposalArb, (proposal) => {
				const shown = visibleSteps(proposal).length;

				expect(shown).toBeLessThanOrEqual(AUTOMATION_PROPOSAL_LIMITS.steps);
				expect(shown + hiddenStepCount(proposal)).toBe(Math.max(shown, proposal.stepCount));
			}),
		);
	});
});

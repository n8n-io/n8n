import {
	AUTOMATION_LOCAL_TARGET_ID,
	AUTOMATION_PROPOSAL_LIMITS,
	type AutomationProposalCard,
	type AutomationRecommendationReason,
	type AutomationTriggerKind,
	type InstanceAiConfirmRequest,
} from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';

/**
 * Pure rules for the card of `propose_automation`. The component only renders what these
 * functions return, so the rules are tested without Vue.
 */

type Proposal = AutomationProposalCard;
type Trigger = Proposal['trigger'];
type Recommendation = Proposal['recommended'];
type Step = Proposal['steps'][number];

export type AutomationAction = 'activate' | 'save' | 'decline';

export interface AutomationCardAction {
	action: AutomationAction;
	labelKey: BaseTextKey;
	type: 'primary' | 'secondary' | 'tertiary';
}

/** A trigger line without a schedule, or a schedule with the key to use when cron is unreadable. */
export type AutomationTriggerLine =
	| { key: BaseTextKey }
	| { key: BaseTextKey; cron: string; timezone?: string; fallbackKey: BaseTextKey };

/** Where the workflow runs after the answer, and why the card recommends that place. */
export interface AutomationPlace {
	/** True when the workflow runs on a linked instance, not on this computer. */
	linked: boolean;
	/** Display name of the linked instance. Absent when the server sent no name. */
	linkedLabel?: string;
	reasonKey?: BaseTextKey;
	/** Show the local caveat on a line of its own. */
	caveat: boolean;
}

export const LOCAL_CAVEAT_KEY: BaseTextKey = 'instanceAi.automation.place.localCaveat';

const TRIGGER_KEYS: Record<Exclude<AutomationTriggerKind, 'manual'>, BaseTextKey> = {
	schedule: 'instanceAi.automation.trigger.schedule',
	webhook: 'instanceAi.automation.trigger.webhook',
	form: 'instanceAi.automation.trigger.form',
	chat: 'instanceAi.automation.trigger.chat',
	'app-event': 'instanceAi.automation.trigger.appEvent',
	other: 'instanceAi.automation.trigger.other',
};

/** Reasons that explain a local place. The other reasons add nothing that the user can act on. */
const LOCAL_REASON_KEYS: Partial<Record<AutomationRecommendationReason, BaseTextKey>> = {
	'needs-local-files': 'instanceAi.automation.reason.needsLocalFiles',
	'needs-local-commands': 'instanceAi.automation.reason.needsLocalCommands',
	'needs-local-trigger': 'instanceAi.automation.reason.needsLocalTrigger',
	'always-on-trigger': LOCAL_CAVEAT_KEY,
};

/** Triggers that wait for an event, so the workflow stops when this computer is off. */
const ALWAYS_ON_KINDS: ReadonlySet<AutomationTriggerKind> = new Set([
	'schedule',
	'webhook',
	'form',
	'chat',
	'app-event',
]);

/** The trigger line. A manual workflow has none. */
export function triggerLineKey(trigger: Trigger): AutomationTriggerLine | undefined {
	if (trigger.kind === 'manual') return undefined;
	const kindKey = TRIGGER_KEYS[trigger.kind];
	if (trigger.cron === undefined) return { key: kindKey };
	if (trigger.timezone === undefined) {
		return { key: 'instanceAi.automation.trigger.cron', cron: trigger.cron, fallbackKey: kindKey };
	}
	return {
		key: 'instanceAi.automation.trigger.cronWithTimezone',
		cron: trigger.cron,
		timezone: trigger.timezone,
		fallbackKey: kindKey,
	};
}

/**
 * A readable name for an IANA zone, for example "Eastern Time" for America/New_York. The generic
 * name stays the same in summer and winter, as the schedule does. The browser can lack a zone that
 * the server knows, so the fallback is the zone id with spaces in place of underscores.
 */
export function timezoneLabel(timezone: string, locale?: string): string {
	const options: Intl.DateTimeFormatOptions = { timeZone: timezone, timeZoneName: 'longGeneric' };
	try {
		const parts = new Intl.DateTimeFormat(locale, options).formatToParts(new Date());
		const name = parts.find((part) => part.type === 'timeZoneName')?.value;
		if (name) return name;
	} catch {
		// Intl rejects a zone or a locale that it does not know.
	}
	return timezone.replaceAll('_', ' ');
}

/** The text for the first reason of a local recommendation. */
export function placeReasonKey(
	recommended: Recommendation,
	trigger: Trigger,
): BaseTextKey | undefined {
	if (recommended.kind !== 'local') return undefined;
	const [first] = recommended.reasons;
	// Nothing waits for an event in a manual workflow, so the caveat does not apply.
	if (first === 'always-on-trigger' && trigger.kind === 'manual') return undefined;
	return first === undefined ? undefined : LOCAL_REASON_KEYS[first];
}

/** The run target that "Turn it on" and "Save" send: the recommended one when the card offers it. */
export function answerTargetId(proposal: Proposal): string | undefined {
	const { recommended, offered } = proposal;
	return offered.target.includes(recommended.targetId)
		? recommended.targetId
		: offered.target.at(0);
}

/** The target that the place line names: the answer target, else the recommended one. */
interface PlaceTarget {
	id: string;
	label?: string;
	isLocal: boolean;
	isRecommended: boolean;
}

function placeTarget(proposal: Proposal): PlaceTarget {
	const { recommended, targets } = proposal;
	const id = answerTargetId(proposal) ?? recommended.targetId;
	const target = targets.find((entry) => entry.id === id);
	const isRecommended = id === recommended.targetId;
	let isLocal = id === AUTOMATION_LOCAL_TARGET_ID;
	if (target) isLocal = target.kind === 'local';
	else if (isRecommended) isLocal = recommended.kind === 'local';
	const label = target?.label?.trim();
	return { id, ...(label && { label }), isLocal, isRecommended };
}

/**
 * The reason is about the recommended target, so it shows only for that target. Every reason
 * text describes this computer, so a linked place shows none.
 */
function shownReasonKey(proposal: Proposal, place: PlaceTarget): BaseTextKey | undefined {
	if (!place.isRecommended || !place.isLocal) return undefined;
	return placeReasonKey(proposal.recommended, proposal.trigger);
}

function hasLocalCaveat(proposal: Proposal, place: PlaceTarget, reasonKey?: BaseTextKey): boolean {
	return (
		place.isLocal && ALWAYS_ON_KINDS.has(proposal.trigger.kind) && reasonKey !== LOCAL_CAVEAT_KEY
	);
}

/** True when the card adds "Only runs while this computer is on." The text shows once. */
export function showsLocalCaveat(proposal: Proposal): boolean {
	const place = placeTarget(proposal);
	return hasLocalCaveat(proposal, place, shownReasonKey(proposal, place));
}

export function placeOf(proposal: Proposal): AutomationPlace {
	const place = placeTarget(proposal);
	const reasonKey = shownReasonKey(proposal, place);
	return {
		linked: !place.isLocal,
		// Only a linked place shows a name from the server. The component names this computer.
		...(!place.isLocal && place.label !== undefined && { linkedLabel: place.label }),
		...(reasonKey && { reasonKey }),
		caveat: hasLocalCaveat(proposal, place, reasonKey),
	};
}

/**
 * The copy of a workflow that is off, and of a workflow that is live with saved changes. For a
 * live workflow, "Save" keeps the live version: the server does not turn the workflow off.
 */
const ACTIVATION_COPY = {
	off: {
		title: 'instanceAi.automation.proposal.title',
		keep: 'instanceAi.automation.proposal.titleKeep',
		activate: 'instanceAi.automation.action.turnOn',
		save: 'instanceAi.automation.action.saveOff',
		note: 'instanceAi.automation.note.cannotTurnOn',
	},
	live: {
		title: 'instanceAi.automation.proposal.titleUpdate',
		// The status line says "It's on now", so the title does not call it a workflow to keep.
		keep: 'instanceAi.automation.proposal.titleKeepLive',
		activate: 'instanceAi.automation.action.makeLive',
		save: 'instanceAi.automation.action.saveKeepLive',
		note: 'instanceAi.automation.note.cannotMakeLive',
	},
} as const satisfies Record<string, Record<string, BaseTextKey>>;

function activationCopy(proposal: Proposal) {
	return ACTIVATION_COPY[proposal.active ? 'live' : 'off'];
}

/** False when the saved version is live already, so "Turn it on" would change nothing. */
function hasSomethingToTurnOn(proposal: Proposal): boolean {
	return !proposal.active || proposal.hasUnpublishedChanges;
}

function offersActivation(proposal: Proposal): boolean {
	return (
		proposal.canActivate &&
		hasSomethingToTurnOn(proposal) &&
		proposal.offered.activate.includes(true) &&
		answerTargetId(proposal) !== undefined
	);
}

/** The card asks to keep the workflow when it cannot turn it on or the saved version is live. */
export function titleKey(proposal: Proposal): BaseTextKey {
	const copy = activationCopy(proposal);
	return offersActivation(proposal) ? copy.title : copy.keep;
}

/** The line that says that a version of the workflow is live now. */
export function liveStatusKey(proposal: Proposal): BaseTextKey | undefined {
	if (!proposal.active) return undefined;
	return proposal.hasUnpublishedChanges
		? 'instanceAi.automation.status.liveWithChanges'
		: 'instanceAi.automation.status.live';
}

/**
 * The line that says why the card has no button to turn the workflow on. The title of a
 * manual workflow says it already, and a live workflow without changes needs no button.
 */
export function activationNoteKey(proposal: Proposal): BaseTextKey | undefined {
	if (offersActivation(proposal) || proposal.trigger.kind === 'manual') return undefined;
	return hasSomethingToTurnOn(proposal) ? activationCopy(proposal).note : undefined;
}

/** The buttons in DOM order. A button shows only when the card offers the values it sends. */
export function cardActions(proposal: Proposal): AutomationCardAction[] {
	const actions: AutomationCardAction[] = [];
	const copy = activationCopy(proposal);
	const canTurnOn = offersActivation(proposal);
	if (canTurnOn) actions.push({ action: 'activate', labelKey: copy.activate, type: 'primary' });
	const canSave =
		proposal.offered.activate.includes(false) && answerTargetId(proposal) !== undefined;
	if (canSave) {
		actions.push({
			action: 'save',
			labelKey: canTurnOn ? copy.save : 'instanceAi.automation.action.saveWorkflow',
			type: canTurnOn ? 'secondary' : 'primary',
		});
	}
	actions.push({
		action: 'decline',
		labelKey: 'instanceAi.automation.action.notNow',
		type: 'tertiary',
	});
	return actions;
}

/** The resume body for a button. The server accepts only values that the card offered. */
export function decisionFor(
	action: AutomationAction,
	proposal: Proposal,
): InstanceAiConfirmRequest {
	if (action === 'decline') return { kind: 'capabilityDecision', approved: false };
	const target = answerTargetId(proposal);
	return {
		kind: 'capabilityDecision',
		approved: true,
		values: { ...(target !== undefined && { target }), activate: action === 'activate' },
	};
}

/** The steps that get an icon. The schema already limits them; the cap keeps the row short. */
export function visibleSteps(proposal: Proposal): Step[] {
	return proposal.steps.slice(0, AUTOMATION_PROPOSAL_LIMITS.steps);
}

/** The number of running nodes without an icon on the card. */
export function hiddenStepCount(proposal: Proposal): number {
	return Math.max(0, proposal.stepCount - visibleSteps(proposal).length);
}

/** The number of other projects that can also see the workflow. */
export function sharedProjectCount(proposal: Proposal): number {
	const { projects, total } = proposal.sharedWith;
	return Math.max(total, projects.length);
}

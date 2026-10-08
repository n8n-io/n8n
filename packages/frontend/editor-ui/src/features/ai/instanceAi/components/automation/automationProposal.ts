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
	/** Display name of a linked instance. Absent when the workflow runs on this computer. */
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
function placeTargetId(proposal: Proposal): string {
	return answerTargetId(proposal) ?? proposal.recommended.targetId;
}

function isLocalPlace(proposal: Proposal): boolean {
	const targetId = placeTargetId(proposal);
	const target = proposal.targets.find((entry) => entry.id === targetId);
	if (target) return target.kind === 'local';
	if (targetId === proposal.recommended.targetId) return proposal.recommended.kind === 'local';
	return targetId === AUTOMATION_LOCAL_TARGET_ID;
}

/**
 * The reason is about the recommended target, so it shows only for that target. Every reason
 * text describes this computer, so a linked place shows none.
 */
function shownReasonKey(proposal: Proposal): BaseTextKey | undefined {
	if (placeTargetId(proposal) !== proposal.recommended.targetId) return undefined;
	if (!isLocalPlace(proposal)) return undefined;
	return placeReasonKey(proposal.recommended, proposal.trigger);
}

/** True when the card adds "Only runs while this computer is on." The text shows once. */
export function showsLocalCaveat(proposal: Proposal): boolean {
	if (!isLocalPlace(proposal) || !ALWAYS_ON_KINDS.has(proposal.trigger.kind)) return false;
	return shownReasonKey(proposal) !== LOCAL_CAVEAT_KEY;
}

export function placeOf(proposal: Proposal): AutomationPlace {
	const reasonKey = shownReasonKey(proposal);
	const place: AutomationPlace = {
		...(reasonKey && { reasonKey }),
		caveat: showsLocalCaveat(proposal),
	};
	if (isLocalPlace(proposal)) return place;
	const targetId = placeTargetId(proposal);
	const target = proposal.targets.find((entry) => entry.id === targetId);
	return { ...place, linkedLabel: target?.label ?? targetId };
}

function offersActivation(proposal: Proposal): boolean {
	return (
		proposal.canActivate &&
		proposal.offered.activate.includes(true) &&
		answerTargetId(proposal) !== undefined
	);
}

/** The card asks to keep the workflow when it cannot turn it on. */
export function titleKey(proposal: Proposal): BaseTextKey {
	return offersActivation(proposal)
		? 'instanceAi.automation.proposal.title'
		: 'instanceAi.automation.proposal.titleKeep';
}

/** The buttons in DOM order. A button shows only when the card offers the values it sends. */
export function cardActions(proposal: Proposal): AutomationCardAction[] {
	const actions: AutomationCardAction[] = [];
	const canTurnOn = offersActivation(proposal);
	if (canTurnOn) {
		actions.push({
			action: 'activate',
			labelKey: 'instanceAi.automation.action.turnOn',
			type: 'primary',
		});
	}
	const canSave =
		proposal.offered.activate.includes(false) && answerTargetId(proposal) !== undefined;
	if (canSave) {
		actions.push({
			action: 'save',
			labelKey: canTurnOn
				? 'instanceAi.automation.action.saveOff'
				: 'instanceAi.automation.action.saveWorkflow',
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

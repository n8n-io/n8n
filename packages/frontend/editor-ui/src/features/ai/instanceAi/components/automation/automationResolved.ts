import type { AutomationProposalCard } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';

import {
	automationResultOf,
	PROPOSE_AUTOMATION_TOOL_NAME,
	type AutomationResult,
} from '@/features/ai/shared/agentsChat/automationResult';
import { safeHttpUrl } from '@/features/linkedInstances/transfer/transferResult';
import { triggerLineKey, type AutomationAction } from './automationProposal';

/**
 * Pure rules for an answered automation card. The answer says what the user chose. The tool
 * result says what happened, so it wins.
 */

/**
 * What the tool step of an answered card says now. `failed` is a tool call that ended in an
 * error, so the card cannot tell what the server changed.
 */
export type AutomationToolOutcome = AutomationResult | { kind: 'waiting' } | { kind: 'failed' };

/** The tool call fields that the outcome reads (the Assistant thread mirror has this shape). */
export interface AutomationToolCall {
	toolName?: string;
	result?: unknown;
	error?: string;
}

export type AutomationResolvedKind =
	| 'on'
	| 'changes-live'
	| 'turning-on'
	| 'making-live'
	| 'not-on'
	| 'not-live'
	| 'still-on-here'
	| 'copying'
	| 'saved'
	| 'saved-live'
	| 'saved-copy'
	| 'saved-manual'
	| 'saved-locked'
	| 'not-saved'
	| 'failed'
	| 'declined';

/** `pending` waits for the tool result. `neutral` ends the card without a result to report. */
export type AutomationResolvedTone = 'success' | 'warning' | 'pending' | 'neutral';

export interface AutomationResolvedStatus {
	kind: AutomationResolvedKind;
	messageKey: BaseTextKey;
	tone: AutomationResolvedTone;
	/** True when the workflow can be there to open, so "Open workflow" leads to it. */
	showsLink: boolean;
}

type ResolvedView = Omit<AutomationResolvedStatus, 'kind'>;

const RESOLVED_VIEWS: Record<AutomationResolvedKind, ResolvedView> = {
	on: { messageKey: 'instanceAi.automation.resolved.on', tone: 'success', showsLink: true },
	'changes-live': {
		messageKey: 'instanceAi.automation.resolved.changesLive',
		tone: 'success',
		showsLink: true,
	},
	'turning-on': {
		messageKey: 'instanceAi.automation.resolved.turningOn',
		tone: 'pending',
		showsLink: true,
	},
	'making-live': {
		messageKey: 'instanceAi.automation.resolved.makingLive',
		tone: 'pending',
		showsLink: true,
	},
	'not-on': {
		messageKey: 'instanceAi.automation.resolved.notOn',
		tone: 'warning',
		showsLink: true,
	},
	'not-live': {
		messageKey: 'instanceAi.automation.resolved.notLive',
		tone: 'warning',
		showsLink: true,
	},
	'still-on-here': {
		messageKey: 'instanceAi.automation.resolved.stillOnHere',
		tone: 'warning',
		showsLink: true,
	},
	copying: {
		messageKey: 'instanceAi.automation.resolved.copyingTo',
		tone: 'pending',
		showsLink: false,
	},
	saved: { messageKey: 'instanceAi.automation.resolved.saved', tone: 'success', showsLink: true },
	'saved-live': {
		messageKey: 'instanceAi.automation.resolved.savedLive',
		tone: 'success',
		showsLink: true,
	},
	'saved-copy': {
		messageKey: 'instanceAi.automation.resolved.savedCopyIn',
		tone: 'success',
		showsLink: true,
	},
	'saved-manual': {
		messageKey: 'instanceAi.automation.resolved.savedManual',
		tone: 'success',
		showsLink: true,
	},
	'saved-locked': {
		messageKey: 'instanceAi.automation.resolved.savedLocked',
		tone: 'success',
		showsLink: true,
	},
	'not-saved': {
		messageKey: 'instanceAi.automation.resolved.notSaved',
		tone: 'warning',
		showsLink: false,
	},
	failed: { messageKey: 'instanceAi.automation.resolved.failed', tone: 'warning', showsLink: true },
	declined: {
		messageKey: 'instanceAi.automation.resolved.declined',
		tone: 'neutral',
		showsLink: false,
	},
};

/** A workflow without a trigger line has no clause for "runs …". */
const NO_TRIGGER_KEYS: Partial<Record<AutomationResolvedKind, BaseTextKey>> = {
	on: 'instanceAi.automation.resolved.onNoTrigger',
	'changes-live': 'instanceAi.automation.resolved.changesLiveNoTrigger',
};

/** The copy in a linked instance: the line says where it is, and what happened there. */
const LINKED_VIEWS: Partial<Record<AutomationResolvedKind, Partial<ResolvedView>>> = {
	'turning-on': { messageKey: 'instanceAi.automation.resolved.turningOnIn' },
	'not-on': { messageKey: 'instanceAi.automation.resolved.notOnIn' },
	'not-live': { messageKey: 'instanceAi.automation.resolved.notReadyIn' },
	saved: { messageKey: 'instanceAi.automation.resolved.savedIn' },
	'saved-live': { messageKey: 'instanceAi.automation.resolved.savedLiveIn' },
	'saved-manual': { messageKey: 'instanceAi.automation.resolved.savedManualIn' },
	'saved-locked': { messageKey: 'instanceAi.automation.resolved.savedLockedIn' },
	// The server keeps nothing here when the copy fails, so there is nothing to open.
	failed: { messageKey: 'instanceAi.automation.resolved.failedIn', showsLink: false },
};

/** A linked workflow without a trigger line has no clause for "runs …". */
const LINKED_NO_TRIGGER_KEYS: Partial<Record<AutomationResolvedKind, BaseTextKey>> = {
	on: 'instanceAi.automation.resolved.onNoTriggerIn',
};

/** What the link of an answered card opens: the copy in the linked instance, or the workflow here. */
export type AutomationResolvedLink = { kind: 'remote'; url: string } | { kind: 'local' };

/**
 * The outcome of the tool step. Right after the answer, the chat puts the answer in the place
 * of the result until the server sends it, so only a parsed result counts. A failed call can
 * come before or after the server kept the workflow: the server refuses most requests before
 * its first change, but an unexpected error while it turns the workflow on comes after it.
 */
export function toolOutcome(call: AutomationToolCall): AutomationToolOutcome {
	if (call.error !== undefined) return { kind: 'failed' };
	return automationResultOf(call.result) ?? { kind: 'waiting' };
}

/**
 * The outcome of the card's own tool step. A model can use a tool call id again, so a call with
 * the card's id can be a call of another tool. Its result says nothing about the card, so it
 * gives no outcome.
 */
export function proposalOutcome(
	call: AutomationToolCall | undefined,
): AutomationToolOutcome | undefined {
	if (call?.toolName !== PROPOSE_AUTOMATION_TOOL_NAME) return undefined;
	return toolOutcome(call);
}

/** "Make changes live" is "Turn it on" for a workflow that was on already. */
function successKind(proposal: AutomationProposalCard): AutomationResolvedKind {
	return proposal.active ? 'changes-live' : 'on';
}

function waitingKind(proposal: AutomationProposalCard): AutomationResolvedKind {
	return proposal.active ? 'making-live' : 'turning-on';
}

/** An outcome that leaves the answer to decide: no refusal and no failed call. */
type OpenOutcome = Exclude<AutomationToolOutcome, { kind: 'refused' | 'failed' }>;

function activateKind(
	proposal: AutomationProposalCard,
	outcome: OpenOutcome | undefined,
): AutomationResolvedKind {
	// Without a tool step to read, the card trusts the answer.
	if (outcome === undefined) return successKind(proposal);
	if (outcome.kind === 'waiting') return waitingKind(proposal);
	if (outcome.active && !outcome.failed) return successKind(proposal);
	// A failed publish can leave the version that was live before running.
	return outcome.active ? 'not-live' : 'not-on';
}

/**
 * The state after "Save". It keeps a live version running: the result says if one is live, else
 * the card does. Only "saved" tells the user to turn the workflow on. A manual workflow has no
 * trigger, and the card says that it cannot turn on a locked workflow, so they get other copy.
 */
function saveKind(
	proposal: AutomationProposalCard,
	outcome: OpenOutcome | undefined,
): AutomationResolvedKind {
	const live = outcome?.kind === 'kept' ? outcome.active : proposal.active;
	if (live) return 'saved-live';
	return offKind(proposal);
}

/** A saved workflow that is off. */
function offKind(proposal: AutomationProposalCard): AutomationResolvedKind {
	if (proposal.trigger.kind === 'manual') return 'saved-manual';
	return proposal.canActivate ? 'saved' : 'saved-locked';
}

/**
 * "Turn it on" in a linked instance. The copy there is new to the user, so a success is "on",
 * never "changes live". A live copy with a problem either still runs here too, or may not run
 * as set up there (an earlier version, or credentials without a value).
 */
function linkedActivateKind(outcome: OpenOutcome | undefined): AutomationResolvedKind {
	if (outcome === undefined) return 'on';
	if (outcome.kind === 'waiting') return 'turning-on';
	if (!outcome.active) return 'not-on';
	if (!outcome.failed) return 'on';
	return outcome.localStillOn ? 'still-on-here' : 'not-live';
}

/**
 * "Save" in a linked instance. `active` of the card is about the workflow here, so the state
 * waits for the result, which says if the copy there is on. A workflow that is live here keeps
 * running here.
 */
function linkedSaveKind(
	proposal: AutomationProposalCard,
	outcome: OpenOutcome | undefined,
): AutomationResolvedKind {
	if (outcome?.kind === 'waiting') return 'copying';
	if (outcome?.kind === 'kept' && outcome.active) return 'saved-live';
	return proposal.active ? 'saved-copy' : offKind(proposal);
}

function answerKind(
	action: Exclude<AutomationAction, 'decline'>,
	proposal: AutomationProposalCard,
	outcome: OpenOutcome | undefined,
	linked: boolean,
): AutomationResolvedKind {
	if (linked) {
		return action === 'save' ? linkedSaveKind(proposal, outcome) : linkedActivateKind(outcome);
	}
	return action === 'save' ? saveKind(proposal, outcome) : activateKind(proposal, outcome);
}

function resolvedKind(
	action: AutomationAction,
	proposal: AutomationProposalCard,
	outcome: AutomationToolOutcome | undefined,
	linked: boolean,
): AutomationResolvedKind {
	if (action === 'decline') return 'declined';
	if (outcome?.kind === 'refused') return 'not-saved';
	if (outcome?.kind === 'failed') return 'failed';
	return answerKind(action, proposal, outcome, linked);
}

/** The view of a kind: the one of a linked place when the answer chose one. */
function viewOf(kind: AutomationResolvedKind, linked: boolean): ResolvedView {
	const view = RESOLVED_VIEWS[kind];
	return linked ? { ...view, ...LINKED_VIEWS[kind] } : view;
}

/**
 * The state of an answered card. `outcome` is undefined when the card cannot read its tool
 * step; then the card shows what the answer asked for. `linked` is true when the answer put the
 * workflow on a linked instance.
 */
export function resolvedStatus(
	action: AutomationAction,
	proposal: AutomationProposalCard,
	outcome?: AutomationToolOutcome,
	linked = false,
): AutomationResolvedStatus {
	const kind = resolvedKind(action, proposal, outcome, linked);
	const view = viewOf(kind, linked);
	const noTriggerKey = (linked ? LINKED_NO_TRIGGER_KEYS : NO_TRIGGER_KEYS)[kind];
	if (noTriggerKey !== undefined && triggerLineKey(proposal.trigger) === undefined) {
		return { kind, ...view, messageKey: noTriggerKey };
	}
	return { kind, ...view };
}

/**
 * The link of an answered card. A copy in a linked instance opens there, from the address in the
 * result. Until that result arrives, the card links nowhere. A workflow that still runs here
 * needs the user here, to turn it off.
 */
export function resolvedLink(
	status: AutomationResolvedStatus,
	outcome: AutomationToolOutcome | undefined,
	linked: boolean,
): AutomationResolvedLink | undefined {
	if (!status.showsLink) return undefined;
	if (!linked || status.kind === 'still-on-here') return { kind: 'local' };
	const url = outcome?.kind === 'kept' ? safeHttpUrl(outcome.url) : undefined;
	return url === undefined ? undefined : { kind: 'remote', url };
}

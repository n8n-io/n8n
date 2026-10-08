import type { AutomationProposalCard } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';

import {
	automationResultOf,
	type AutomationResult,
} from '@/features/ai/shared/agentsChat/automationResult';
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
	| 'saved'
	| 'saved-live'
	| 'not-saved'
	| 'failed'
	| 'declined';

export type AutomationResolvedTone = 'success' | 'warning' | 'neutral';

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
		tone: 'neutral',
		showsLink: true,
	},
	'making-live': {
		messageKey: 'instanceAi.automation.resolved.makingLive',
		tone: 'neutral',
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
	saved: { messageKey: 'instanceAi.automation.resolved.saved', tone: 'success', showsLink: true },
	'saved-live': {
		messageKey: 'instanceAi.automation.resolved.savedLive',
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

function saveKind(
	proposal: AutomationProposalCard,
	outcome: OpenOutcome | undefined,
): AutomationResolvedKind {
	// "Save" keeps a live version running. The result says if one is live, else the card does.
	const live = outcome?.kind === 'kept' ? outcome.active : proposal.active;
	return live ? 'saved-live' : 'saved';
}

function resolvedKind(
	action: AutomationAction,
	proposal: AutomationProposalCard,
	outcome: AutomationToolOutcome | undefined,
): AutomationResolvedKind {
	if (action === 'decline') return 'declined';
	if (outcome?.kind === 'refused') return 'not-saved';
	if (outcome?.kind === 'failed') return 'failed';
	return action === 'save' ? saveKind(proposal, outcome) : activateKind(proposal, outcome);
}

/**
 * The state of an answered card. `outcome` is undefined when the card cannot read its tool
 * step; then the card shows what the answer asked for.
 */
export function resolvedStatus(
	action: AutomationAction,
	proposal: AutomationProposalCard,
	outcome?: AutomationToolOutcome,
): AutomationResolvedStatus {
	const kind = resolvedKind(action, proposal, outcome);
	const view = RESOLVED_VIEWS[kind];
	const noTriggerKey = NO_TRIGGER_KEYS[kind];
	if (noTriggerKey !== undefined && triggerLineKey(proposal.trigger) === undefined) {
		return { kind, ...view, messageKey: noTriggerKey };
	}
	return { kind, ...view };
}

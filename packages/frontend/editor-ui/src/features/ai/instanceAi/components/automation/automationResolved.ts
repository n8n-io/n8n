import { automationProposalResultSchema, type AutomationProposalCard } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';
import { isRecord } from '@n8n/utils/is-record';

import { triggerLineKey, type AutomationAction } from './automationProposal';

/**
 * Pure rules for an answered automation card and for the tool step of `propose_automation`.
 * The answer says what the user chose. The tool result says what happened, so it wins.
 */

export const PROPOSE_AUTOMATION_TOOL_NAME = 'propose_automation';

/** What a `propose_automation` result says about the workflow. */
export type AutomationResult =
	| { kind: 'kept'; active: boolean; failed: boolean }
	/** Declined, blocked by an admin, or refused: nothing was kept. */
	| { kind: 'refused' };

/** What the tool step of an answered card says now. */
export type AutomationToolOutcome = AutomationResult | { kind: 'waiting' };

/** The tool call fields that the outcome reads (the Assistant thread mirror has this shape). */
export interface AutomationToolCall {
	result?: unknown;
	error?: string;
}

export type AutomationResolvedKind =
	| 'on'
	| 'turning-on'
	| 'not-on'
	| 'not-live'
	| 'saved'
	| 'saved-live'
	| 'not-saved'
	| 'declined';

export type AutomationResolvedTone = 'success' | 'warning' | 'neutral';

export interface AutomationResolvedStatus {
	kind: AutomationResolvedKind;
	messageKey: BaseTextKey;
	tone: AutomationResolvedTone;
	/** True when the workflow was kept or is being kept, so "Open workflow" leads to it. */
	showsLink: boolean;
}

type ResolvedView = Omit<AutomationResolvedStatus, 'kind'>;

const RESOLVED_VIEWS: Record<AutomationResolvedKind, ResolvedView> = {
	on: { messageKey: 'instanceAi.automation.resolved.on', tone: 'success', showsLink: true },
	'turning-on': {
		messageKey: 'instanceAi.automation.resolved.turningOn',
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
	declined: {
		messageKey: 'instanceAi.automation.resolved.declined',
		tone: 'neutral',
		showsLink: false,
	},
};

/** A declined or blocked capability answers `{ denied: true, message }`. */
function isDenied(output: unknown): boolean {
	return isRecord(output) && output.denied === true;
}

/** The outcome in a tool result, or undefined for any other value (for example the answer). */
export function automationResultOf(output: unknown): AutomationResult | undefined {
	if (isDenied(output)) return { kind: 'refused' };
	const parsed = automationProposalResultSchema.safeParse(output);
	if (!parsed.success) return undefined;
	return { kind: 'kept', active: parsed.data.active, failed: parsed.data.error !== undefined };
}

/**
 * The outcome of the tool step. Right after the answer, the chat puts the answer in the place
 * of the result until the server sends it, so only a parsed result counts. A failed call kept
 * nothing: the server checks every condition before its first change.
 */
export function toolOutcome(call: AutomationToolCall): AutomationToolOutcome {
	if (call.error !== undefined) return { kind: 'refused' };
	return automationResultOf(call.result) ?? { kind: 'waiting' };
}

function activateKind(
	outcome: AutomationToolOutcome | undefined,
): Exclude<AutomationResolvedKind, 'saved' | 'saved-live' | 'declined'> {
	// Without a tool step to read, the card trusts the answer.
	if (outcome === undefined) return 'on';
	if (outcome.kind === 'waiting') return 'turning-on';
	if (outcome.kind === 'refused') return 'not-saved';
	if (outcome.active && !outcome.failed) return 'on';
	// A failed publish can leave the version that was live before running.
	return outcome.active ? 'not-live' : 'not-on';
}

function saveKind(
	proposal: AutomationProposalCard,
	outcome: AutomationToolOutcome | undefined,
): AutomationResolvedKind {
	if (outcome?.kind === 'refused') return 'not-saved';
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
	if (action === 'save') return saveKind(proposal, outcome);
	return activateKind(outcome);
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
	// A workflow without a trigger line has no clause for "runs …".
	if (kind === 'on' && triggerLineKey(proposal.trigger) === undefined) {
		return { kind, ...view, messageKey: 'instanceAi.automation.resolved.onNoTrigger' };
	}
	return { kind, ...view };
}

/**
 * The summary of a `propose_automation` tool step, from its result only. It names the state,
 * not the button: "Save" on a live workflow also gives `active: true`.
 */
export function summariseAutomationResult(output: unknown): BaseTextKey | undefined {
	const result = automationResultOf(output);
	if (result === undefined) return undefined;
	if (result.kind === 'refused') return 'instanceAi.automation.summary.declined';
	if (result.failed) {
		return result.active
			? 'instanceAi.automation.summary.notLive'
			: 'instanceAi.automation.summary.notOn';
	}
	return result.active ? 'instanceAi.automation.summary.on' : 'instanceAi.automation.summary.off';
}

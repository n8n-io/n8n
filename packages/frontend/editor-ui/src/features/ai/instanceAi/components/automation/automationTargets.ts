import type { AutomationRecommendationReason } from '@n8n/api-types';

import type { TransferDialogState } from '@/features/linkedInstances/transfer/transferDialogState';
import { remoteCredentialsUrl } from '@/features/linkedInstances/transfer/transferResult';
import { UNAVAILABLE_LINK, type RunTargetTranslate } from '../../runTarget/runTargetOptions';
import { answerTargetId, chosenTargetId } from './automationProposal';
import type { CardTarget, ViewedProposal } from './automationViewerLinks';

/**
 * Pure rules for the place that an automation card sends: the choice in Power mode, and the
 * check of a linked instance before the workflow goes there.
 */

type Proposal = ViewedProposal;

/** One row of the "Change" menu. */
export interface AutomationTargetOption {
	id: string;
	linked: boolean;
	label: string;
	description: string;
	/** The card did not offer it, so the server would refuse it. */
	disabled: boolean;
}

/** The check of a linked instance: not needed, running, failed, or what it found. */
export type AutomationCheck = 'idle' | 'checking' | 'failed' | TransferDialogState;

/** What the check allows, and what the card lists under it. */
export interface AutomationGate {
	/** Credentials that arrive empty there. "Turn it on" waits for them. */
	needsSetUp: string[];
	/** Credentials that the linked instance did not list. They may need setting up. */
	unchecked: string[];
	canTurnOn: boolean;
	canSave: boolean;
}

/** Reasons that say that the workflow needs this computer. */
const NEEDS_THIS_COMPUTER: ReadonlySet<AutomationRecommendationReason> = new Set([
	'needs-local-files',
	'needs-local-commands',
	'needs-local-trigger',
]);

function linkName(target: CardTarget, translate: RunTargetTranslate): string {
	const label = target.label?.trim();
	if (label) return label;
	return translate('instanceAi.automation.place.otherInstance');
}

function targetOption(
	target: CardTarget,
	offered: readonly string[],
	translate: RunTargetTranslate,
): AutomationTargetOption {
	const disabled = !offered.includes(target.id);
	if (target.kind === 'local') {
		return {
			id: target.id,
			linked: false,
			label: translate('instanceAi.automation.place.thisComputer'),
			description: translate('instanceAi.runTarget.local.description'),
			disabled,
		};
	}
	const name = linkName(target, translate);
	if (target.status === 'online') {
		const description = translate('instanceAi.runTarget.linked.description');
		return { id: target.id, linked: true, label: name, description, disabled };
	}
	const unavailable = UNAVAILABLE_LINK[target.status];
	return {
		id: target.id,
		linked: true,
		label: translate(unavailable.label, { name }),
		description: translate(unavailable.hint),
		disabled: true,
	};
}

/** The rows of the "Change" menu, in the order of the card. */
export function targetOptions(
	proposal: Proposal,
	translate: RunTargetTranslate,
): AutomationTargetOption[] {
	return proposal.targets.map((target) => targetOption(target, proposal.offered.target, translate));
}

/** True when the card offers more than one place, so that the user can choose. */
export function offersTargetChoice(proposal: Proposal): boolean {
	return proposal.offered.target.length > 1;
}

/**
 * The place that the card starts with: the place of the chat when the card offers it, else the
 * recommendation. A workflow that needs this computer keeps the recommendation.
 */
export function initialTargetId(proposal: Proposal, chatTargetId?: string): string | undefined {
	const needsThisComputer = proposal.recommended.reasons.some((reason) =>
		NEEDS_THIS_COMPUTER.has(reason),
	);
	if (
		chatTargetId !== undefined &&
		!needsThisComputer &&
		proposal.offered.target.includes(chatTargetId)
	) {
		return chatTargetId;
	}
	return answerTargetId(proposal);
}

/** The linked instance of the target, or `undefined` for this computer. */
export function linkedTargetOf(
	proposal: Proposal,
	targetId: string | undefined,
): CardTarget | undefined {
	const target = proposal.targets.find(({ id }) => id === targetId);
	return target?.kind === 'linked' ? target : undefined;
}

/**
 * True when the answer for `targetId` put the workflow on a link of the viewer. Only then is the
 * address of the copy the viewer's to open: a teammate who reads a shared chat does not have the
 * owner's links, so the card names no address for them.
 */
export function isViewerLinkAnswer(proposal: Proposal, targetId?: string): boolean {
	return linkedTargetOf(proposal, chosenTargetId(proposal, targetId))?.baseUrl !== undefined;
}

/**
 * Opens the credentials of the linked instance. The check names no credential ids, so the link
 * opens the list. `undefined` when the address is not http(s), or when the viewer has no link
 * with this id.
 */
export function credentialsUrl(target: CardTarget): string | undefined {
	return target.baseUrl === undefined ? undefined : remoteCredentialsUrl(target.baseUrl);
}

const OPEN_GATE: AutomationGate = { needsSetUp: [], unchecked: [], canTurnOn: true, canSave: true };

/**
 * The project that the copy goes to: one with a name, the personal project there, or the
 * project of the link for new automations when the check could not name it.
 */
export type LinkedProject =
	| { kind: 'project'; name: string }
	| { kind: 'personal' }
	| { kind: 'unknown' };

/**
 * Where the check says the copy goes. `undefined` while nothing is known yet, and when the copy
 * cannot go there at all. After a failed check, the server still decides at the move, so the
 * card names the project of the link in words. The move can still put the copy in the personal
 * project when the linked instance refuses the default project.
 */
export function linkedProjectOf(check: AutomationCheck): LinkedProject | undefined {
	if (check === 'failed') return { kind: 'unknown' };
	if (typeof check === 'string' || !check.canMove) return undefined;
	const name = check.targetProjectName;
	return name === null ? { kind: 'personal' } : { kind: 'project', name };
}

/**
 * True when the check has something to show: it runs, it failed, the workflow cannot move, or
 * credentials need or may need set-up there. A check that found nothing to report shows nothing,
 * so the card adds no empty block.
 */
export function preflightHasNotice(check: AutomationCheck): boolean {
	if (check === 'idle') return false;
	if (typeof check === 'string') return true;
	const gate = automationGate(check);
	return !check.canMove || gate.needsSetUp.length > 0 || gate.unchecked.length > 0;
}

/**
 * A failed check lets the server decide, so the user can still save or turn it on: the move
 * checks the credentials again and does not put a copy live that needs set-up. While the check
 * runs, the buttons wait. A workflow that cannot move waits for nothing, and empty credentials
 * stop only "Turn it on", because the move does not put such a copy live.
 */
export function automationGate(check: AutomationCheck): AutomationGate {
	if (check === 'idle' || check === 'failed') return OPEN_GATE;
	if (check === 'checking') return { ...OPEN_GATE, canTurnOn: false, canSave: false };
	const needsSetUp = check.needsSetUp.filter(({ status }) => status === 'needs-set-up');
	const unchecked = check.needsSetUp.filter(({ status }) => status === 'unknown');
	return {
		needsSetUp: needsSetUp.map(({ name }) => name),
		unchecked: unchecked.map(({ name }) => name),
		canTurnOn: check.canMove && needsSetUp.length === 0,
		canSave: check.canMove,
	};
}

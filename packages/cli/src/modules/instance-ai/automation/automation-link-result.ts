import { stripInvisibleUnicode, wrapUntrustedData } from '@n8n/agents';
import type {
	AutomationLinkedProblem,
	AutomationProposalResult,
	LinkedInstancePushResult,
	LinkedInstanceSummary,
} from '@n8n/api-types';
import { ForbiddenError, NotFoundError } from '@n8n/errors';
import { UserError } from 'n8n-workflow';

/**
 * Pure rules for the result of `propose_automation` when the workflow went to a linked instance.
 * Names, node types, warnings and refusals can repeat text of that instance, so the model gets
 * them only as fenced, untrusted data.
 */

/** The link that took the workflow. Its name was set on this instance, so it is plain text. */
export type ResultLink = Pick<LinkedInstanceSummary, 'id' | 'name'>;

export type LinkedMove = {
	link: ResultLink;
	workflowName: string;
	/** The move asked to turn on the copy there. */
	publish: boolean;
	/** A version of the workflow was live here before the move. */
	liveHere: boolean;
	/** Warnings of this instance, for example about the cron expression of the model. */
	warnings: readonly string[];
};

/**
 * True when the move asks to turn off the workflow here: "Turn it on" of a live workflow. A save
 * never asks it, because the linked instance turns off the workflow here also when the copy there
 * is not live: the automation would then run nowhere.
 */
export function asksToTurnOffHere(move: Pick<LinkedMove, 'publish' | 'liveHere'>): boolean {
	return move.publish && move.liveHere;
}

const LINKED_SOURCE = 'linked-instance';

/** Marks text from a linked instance as data, so that the model never follows it. */
export function fenceLinkedText(text: string, link: ResultLink): string {
	return wrapUntrustedData(stripInvisibleUnicode(text), LINKED_SOURCE, link.name);
}

/** The notes of the linked instance about the copy, one per line, or none. */
function remoteNotes(push: LinkedInstancePushResult): string[] {
	const notes: string[] = [];
	if (push.credentialsNeedingSetup.length > 0) {
		const names = push.credentialsNeedingSetup.map(({ name, type }) => `${name} (${type})`);
		notes.push(`Credentials without a value there: ${names.join(', ')}`);
	}
	if (push.missingNodeTypes.length > 0) {
		notes.push(`Node types missing there: ${push.missingNodeTypes.join(', ')}`);
	}
	return [...notes, ...push.warnings];
}

/** What went other than the user asked. `error` names each of these problems. */
export type MoveState = {
	/** The move asked to turn on the copy, and the new version did not go live there. */
	notOn: boolean;
	/**
	 * A version of the copy is live there, and the new version needs set-up there. After "Turn it
	 * on" the live version is the new one, so it cannot run as set up. After a save it can be an
	 * earlier version, because the push result does not say which version is live.
	 */
	notReady: boolean;
	/**
	 * The move asked to turn off the workflow here, and the linked instance kept it on, because the
	 * new version does not run there as set up. This is by design: the automation keeps running.
	 */
	keptOnHere: boolean;
	/**
	 * The new version runs there as set up, and the workflow here is still live too: the turn-off
	 * here failed, or a save found a live copy there. The automation runs twice.
	 */
	stillOn: boolean;
};

/** The copy there uses credentials without a value or node types that the instance lacks. */
function needsSetUpThere(push: LinkedInstancePushResult): boolean {
	return push.credentialsNeedingSetup.length > 0 || push.missingNodeTypes.length > 0;
}

/** `needsSetUp`: the value of `needsSetUpThere(push)`. The caller reads it once for all rules. */
export function moveStateOf(
	push: LinkedInstancePushResult,
	move: LinkedMove,
	needsSetUp: boolean,
): MoveState {
	// A version is live there, and the move did not fail to put the new one live.
	const liveThere = push.published && !push.publishFailed;
	const notOn = move.publish && push.publishFailed;
	const notReady = liveThere && needsSetUp;
	const onHere = move.liveHere && !push.localDeactivated;
	return {
		notOn,
		notReady,
		// `onHere` includes `liveHere`, so `publish` completes the rule of `asksToTurnOffHere`.
		keptOnHere: move.publish && onHere && (notOn || notReady),
		stillOn: onHere && liveThere && !needsSetUp,
	};
}

/** The problems in the order of `error`, for the frontend. */
function problemKinds(state: MoveState): AutomationLinkedProblem[] {
	const kinds: AutomationLinkedProblem[] = [];
	if (state.notOn) kinds.push('not-on');
	if (state.notReady) kinds.push('not-ready');
	if (state.keptOnHere) kinds.push('kept-on-here');
	if (state.stillOn) kinds.push('still-on-here');
	return kinds;
}

/**
 * The problems of the copy there, in the words of this instance, for `error`. The model reads
 * them there, and the frontend reads `problems`. The notes of the linked instance stay fenced in
 * the warnings. After a save, the live version there can be an earlier one, so the text does not
 * say that the live copy cannot run.
 */
function copyProblems(
	push: LinkedInstancePushResult,
	move: LinkedMove,
	state: MoveState,
): string[] {
	const { link, workflowName } = move;
	const problems: string[] = [];
	if (state.notOn) {
		const earlier = push.published ? ' An earlier version stays live there.' : '';
		problems.push(
			`Copied "${workflowName}" to ${link.name}, but could not turn it on there.${earlier}`,
		);
	}
	if (state.notReady && move.publish) {
		problems.push(
			`"${workflowName}" is live in ${link.name}, but it cannot run as set up there: it uses credentials without a value or node types that ${link.name} does not have.`,
		);
	} else if (state.notReady) {
		const here = move.liveHere
			? ` "${workflowName}" still runs on this n8n instance too. Set up the copy in ${link.name} before you turn it off here.`
			: '';
		problems.push(
			`A version of "${workflowName}" is live in ${link.name}. The new version uses credentials without a value or node types that ${link.name} does not have, so it needs set-up there before it can run.${here}`,
		);
	}
	return problems;
}

/** The problems of the workflow here, in the words of this instance, for `error`. */
function hereProblems(move: LinkedMove, state: MoveState): string[] {
	const { link, workflowName } = move;
	const problems: string[] = [];
	if (state.keptOnHere) {
		problems.push(
			state.notOn
				? `"${workflowName}" keeps running on this n8n instance, because the new version is not live in ${link.name}.`
				: `"${workflowName}" keeps running on this n8n instance until the copy in ${link.name} is set up. Set it up there, then turn it off here.`,
		);
	}
	if (state.stillOn) {
		problems.push(
			`"${workflowName}" runs in ${link.name} and still runs on this n8n instance too. Turn it off here, so that it does not run twice.`,
		);
	}
	return problems;
}

/** A save that did not ask to turn on the copy can still find a live copy there. */
function liveCopyWarning(push: LinkedInstancePushResult, move: LinkedMove): string | undefined {
	if (move.publish || !push.published) return undefined;
	return `The copy in ${move.link.name} is on, because a version of it was live there before. Saving did not turn it off there.`;
}

/**
 * The result names the copy in the linked instance. `active` says if a version of the copy is
 * live there. It can be an earlier version, so `error` says when the new one did not go live,
 * when the copy needs set-up there, and when the workflow here still runs too.
 */
export function linkedAutomationResult(
	push: LinkedInstancePushResult,
	move: LinkedMove,
): AutomationProposalResult {
	const notes = remoteNotes(push);
	const warnings = [...move.warnings];
	const liveCopy = liveCopyWarning(push, move);
	if (liveCopy) warnings.push(liveCopy);
	if (notes.length > 0) {
		const fenced = fenceLinkedText(notes.join('\n'), move.link);
		warnings.push(`Notes about the copy in ${move.link.name}: ${fenced}`);
	}
	const state = moveStateOf(push, move, needsSetUpThere(push));
	const problemTexts = [...copyProblems(push, move, state), ...hereProblems(move, state)];
	if (problemTexts.length > 0 && notes.length > 0) {
		problemTexts.push('The notes in the warnings say why.');
	}
	const kinds = problemKinds(state);
	return {
		workflowId: push.remoteWorkflowId,
		url: push.remoteUrl,
		active: push.published,
		kept: true,
		place: { targetId: move.link.id, kind: 'linked', name: move.link.name },
		...(warnings.length > 0 && { warnings }),
		...(problemTexts.length > 0 && { error: problemTexts.join(' ') }),
		...(kinds.length > 0 && { problems: kinds }),
	};
}

/**
 * True for a refusal in the words of this instance. The move turns every failure of the linked
 * instance into a 400, so a 403 or a 404 is always a check here (export or turn-off rights, a
 * workflow or link that is gone). The local 400 refusals (archived, calls to other workflows) do
 * not get here: the proposal refuses an archived workflow first, and offers no linked place for a
 * workflow that calls others by ID.
 */
function isLocalRefusal(error: Error): boolean {
	return error instanceof ForbiddenError || error instanceof NotFoundError;
}

/**
 * A refused or failed copy. A refusal of the linked instance can repeat its text, so it is fenced.
 * The copy changes this instance only after the linked instance took it, so nothing changed here.
 */
export function linkedMoveError(error: Error, workflowName: string, link: ResultLink): UserError {
	const reason = isLocalRefusal(error) ? error.message : fenceLinkedText(error.message, link);
	return new UserError(
		`Could not copy "${workflowName}" to ${link.name}. Nothing changed on this instance. ${reason}`,
		{ cause: error },
	);
}

/**
 * The copy is in the linked instance, but the workflow here was not kept. The result still names
 * the copy, so that the user can find it. The reason stays in the log: the texts of the keep step
 * say that nothing changed, which is not true after the copy.
 */
export function withKeepFailure(
	result: AutomationProposalResult,
	move: Pick<LinkedMove, 'link' | 'workflowName'>,
): AutomationProposalResult {
	const problem = `The copy is in ${move.link.name}, but n8n could not keep "${move.workflowName}" on this n8n instance, so the clean-up at the end of this run can archive it here.`;
	return {
		...result,
		error: result.error === undefined ? problem : `${result.error} ${problem}`,
		problems: [...(result.problems ?? []), 'not-kept-here'],
	};
}

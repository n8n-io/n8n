import { stripInvisibleUnicode, wrapUntrustedData } from '@n8n/agents';
import type {
	AutomationProposalResult,
	LinkedInstancePushResult,
	LinkedInstanceSummary,
} from '@n8n/api-types';
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
	/** The move asked to turn off the workflow here, because it was live here. */
	deactivateLocal: boolean;
	/** Warnings of this instance, for example about the cron expression of the model. */
	warnings: readonly string[];
};

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
	/** A version of the copy is live there, but it needs set-up: it cannot run as set up. */
	notReady: boolean;
	/**
	 * The copy is live there and the workflow here is live too, although the move asked to turn
	 * it off here. When the copy did not go live, the workflow here stays on by design.
	 */
	stillOn: boolean;
};

export function moveStateOf(push: LinkedInstancePushResult, move: LinkedMove): MoveState {
	const needsSetUp = push.credentialsNeedingSetup.length > 0 || push.missingNodeTypes.length > 0;
	return {
		notOn: move.publish && push.publishFailed,
		notReady: push.published && !push.publishFailed && needsSetUp,
		stillOn: move.deactivateLocal && push.published && !push.localDeactivated,
	};
}

/**
 * The problems in the words of this instance. The model and the card read them from `error`;
 * the notes of the linked instance stay fenced in the warnings.
 */
function moveProblems(
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
	if (state.notReady) {
		problems.push(
			`"${workflowName}" is live in ${link.name}, but it cannot run as set up there: it uses credentials without a value or node types that ${link.name} does not have.`,
		);
	}
	if (state.stillOn) {
		problems.push(
			`"${workflowName}" still runs on this n8n instance too, because it was not turned off here. Turn it off here, so that it does not run twice.`,
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
 * when the copy cannot run as set up, and when the workflow here still runs too.
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
	const state = moveStateOf(push, move);
	const problems = moveProblems(push, move, state);
	if (problems.length > 0 && notes.length > 0) problems.push('The notes in the warnings say why.');
	return {
		workflowId: push.remoteWorkflowId,
		url: push.remoteUrl,
		active: push.published,
		kept: true,
		place: { targetId: move.link.id, kind: 'linked', name: move.link.name },
		...(warnings.length > 0 && { warnings }),
		...(problems.length > 0 && { error: problems.join(' ') }),
		...(state.stillOn && { localStillOn: true }),
	};
}

/**
 * A refused or failed copy. The refusal can repeat text of the linked instance, so it is fenced.
 * The copy changes this instance only after the linked instance took it, so nothing changed here.
 */
export function linkedMoveError(error: Error, workflowName: string, link: ResultLink): UserError {
	return new UserError(
		`Could not copy "${workflowName}" to ${link.name}. Nothing changed on this instance. ${fenceLinkedText(error.message, link)}`,
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
	return { ...result, error: result.error === undefined ? problem : `${result.error} ${problem}` };
}

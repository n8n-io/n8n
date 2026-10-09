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

/**
 * The result names the copy in the linked instance. `active` says if a version of the copy is
 * live there. It can be an earlier version, so `error` says when the new one did not go live.
 */
export function linkedAutomationResult(
	push: LinkedInstancePushResult,
	move: LinkedMove,
): AutomationProposalResult {
	const notes = remoteNotes(push);
	const warnings = [...move.warnings];
	if (notes.length > 0) {
		const fenced = fenceLinkedText(notes.join('\n'), move.link);
		warnings.push(`Notes about the copy in ${move.link.name}: ${fenced}`);
	}
	const notOn = move.publish && push.publishFailed;
	return {
		workflowId: push.remoteWorkflowId,
		url: push.remoteUrl,
		active: push.published,
		kept: true,
		place: { targetId: move.link.id, kind: 'linked', name: move.link.name },
		...(warnings.length > 0 && { warnings }),
		...(notOn && {
			error: `Copied "${move.workflowName}" to ${move.link.name}, but could not turn it on there. The notes in the warnings say why.`,
		}),
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

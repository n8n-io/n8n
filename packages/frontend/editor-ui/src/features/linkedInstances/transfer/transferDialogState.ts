import type {
	LinkedInstanceTransferCredential,
	LinkedInstanceTransferPreflight,
	LinkedInstanceTransferRequestDto,
	LinkedInstanceTransferSubWorkflow,
} from '@n8n/api-types';

/** A credential that the user must look at in the linked instance after the move. */
export type TransferSetUpItem = Omit<LinkedInstanceTransferCredential, 'status'> & {
	/** `needs-set-up`: the move creates it empty. `unknown`: the linked instance did not tell. */
	status: Exclude<LinkedInstanceTransferCredential['status'], 'matched'>;
};

/** Something that the user should know before the move, although the move can go ahead. */
export type TransferWarning = 'nodeTypesUnchecked' | 'credentialsUnchecked';

/** What the dialog shows for one preflight. */
export interface TransferDialogState {
	nodeCount: number;
	/** `null`: the personal project of the access token's user in the linked instance. */
	targetProjectName: string | null;
	/** Names of the credentials that the copy uses there. They can still be empty. */
	matchedCredentials: string[];
	/** "Needs setting up", in the order of the preflight. */
	needsSetUp: TransferSetUpItem[];
	/** "Can't move": node types that the linked instance does not have, as "type@version". */
	missingNodeTypes: string[];
	/** "Can't move": a move copies one workflow only, so it cannot take the workflows that this one calls. */
	subWorkflowCalls: LinkedInstanceTransferSubWorkflow[];
	/** `false` while anything is listed under "Can't move". */
	canMove: boolean;
	warnings: TransferWarning[];
}

/** Builds the sections of the dialog from a preflight. */
export function transferDialogState(preflight: LinkedInstanceTransferPreflight): TransferDialogState {
	const matchedCredentials: string[] = [];
	const needsSetUp: TransferSetUpItem[] = [];
	for (const { name, type, status } of preflight.credentials) {
		if (status === 'matched') matchedCredentials.push(name);
		else needsSetUp.push({ name, type, status });
	}

	const warnings: TransferWarning[] = [];
	if (preflight.nodeTypeCheck === 'unknown') warnings.push('nodeTypesUnchecked');
	if (needsSetUp.some(({ status }) => status === 'unknown')) warnings.push('credentialsUnchecked');

	return {
		nodeCount: preflight.moves.nodes,
		targetProjectName: preflight.targetProject?.name ?? null,
		matchedCredentials,
		needsSetUp,
		missingNodeTypes: [...preflight.missingNodeTypes],
		subWorkflowCalls: [...preflight.subWorkflowCalls],
		canMove: preflight.missingNodeTypes.length === 0 && preflight.subWorkflowCalls.length === 0,
		warnings,
	};
}

/** What the caller knows about the workflow here and about the request of the user. */
export interface TransferOptionsInput {
	/** A version of the workflow is live here. */
	liveHere: boolean;
	/** The user can turn off the workflow here (`workflow:unpublish`). */
	canUnpublish: boolean;
	/** The user asked for a live automation, so the dialog offers to turn the copy on. */
	offerTurnOn: boolean;
}

/** The choices that the dialog offers. Both choices start off. */
export interface TransferOptions {
	/** "The copy here": only for a live workflow that the user can turn off. */
	showTurnOffHere: boolean;
	/** "Turn it on in {place}": only when the user asked for a live automation. */
	showTurnOn: boolean;
}

export function transferOptions(input: TransferOptionsInput): TransferOptions {
	return {
		showTurnOffHere: input.liveHere && input.canUnpublish,
		showTurnOn: input.offerTurnOn,
	};
}

/** What the user picked. A choice that the dialog does not show has no effect. */
export interface TransferChoice {
	turnOffHere: boolean;
	turnOn: boolean;
}

/** A line under the choices that tells what the picked choices do. */
export type TransferHint = 'nothingRuns' | 'staysOffUntilSetUp' | 'staysOnHereUntilLive';

export function transferHints(
	state: Pick<TransferDialogState, 'needsSetUp'>,
	options: TransferOptions,
	choice: TransferChoice,
): TransferHint[] {
	const turnOffHere = options.showTurnOffHere && choice.turnOffHere;
	const turnOn = options.showTurnOn && choice.turnOn;
	// The move does not publish a copy that has empty credentials, so the copy stays off there.
	const blocked = turnOn && state.needsSetUp.some(({ status }) => status === 'needs-set-up');

	const hints: TransferHint[] = [];
	if (turnOffHere && !turnOn) hints.push('nothingRuns');
	if (blocked) hints.push('staysOffUntilSetUp');
	// The server keeps the workflow here on when the new version does not go live there.
	if (blocked && turnOffHere) hints.push('staysOnHereUntilLive');
	return hints;
}

/** The request of the move. It never asks for a choice that the dialog did not offer. */
export function transferRequest(
	workflowId: string,
	options: TransferOptions,
	choice: TransferChoice,
): LinkedInstanceTransferRequestDto {
	return {
		workflowId,
		publish: options.showTurnOn && choice.turnOn,
		deactivateLocal: options.showTurnOffHere && choice.turnOffHere,
	};
}

import type { InstanceAiContext } from '../types';

/**
 * `untested` means the type declares no connection test, not that testing was skipped.
 * `managed` means n8n supplies the credential, so there is nothing to test.
 */
type SelectionConnectionState = 'passed' | 'failed' | 'untested' | 'managed';

export interface SelectedCredentialOutcome {
	credentialType: string;
	credentialId: string;
	connection: SelectionConnectionState;
	connectionMessage?: string;
	/** Only set when the credential is known to carry no values at all. */
	hasNoValues?: true;
}

export function isSelectionVerified(selection: SelectedCredentialOutcome): boolean {
	return selection.connection === 'passed' || selection.connection === 'managed';
}

/**
 * Establish what a selected credential actually is: connection-test it when its
 * type has a test, and otherwise fall back to whether it carries any values —
 * the only signal available for generic auth types, which is where a re-offered
 * empty credential hides.
 */
export async function verifySelectedCredential(
	context: InstanceAiContext,
	credentialType: string,
	credentialId: string,
): Promise<SelectedCredentialOutcome> {
	// Absent capability means "assume testable", matching workflow setup's default.
	const canTest = context.credentialService.isTestable
		? await context.credentialService.isTestable(credentialType).catch(() => true)
		: true;

	if (canTest) {
		const result = await context.credentialService.test(credentialId).catch((error: unknown) => ({
			success: false,
			message: error instanceof Error ? error.message : 'Credential test failed',
		}));
		if (result.success) return { credentialType, credentialId, connection: 'passed' };
		return {
			credentialType,
			credentialId,
			connection: 'failed',
			...(result.message ? { connectionMessage: result.message } : {}),
		};
	}

	const fillState =
		(await context.credentialService
			.getCredentialFillState?.(credentialId)
			.catch(() => 'unknown' as const)) ?? 'unknown';

	return {
		credentialType,
		credentialId,
		connection: 'untested',
		...(fillState === 'blank' ? { hasNoValues: true as const } : {}),
	};
}

const SETUP_CARD_CLOSED_NOTE = 'The setup card is no longer open.';

function describeSelectionProblem(selection: SelectedCredentialOutcome): string | undefined {
	const label = `${selection.credentialType} (${selection.credentialId})`;
	if (selection.connection === 'failed') {
		return selection.connectionMessage
			? `${label} failed its connection test: ${selection.connectionMessage}`
			: `${label} failed its connection test`;
	}
	if (selection.hasNoValues) return `${label} has no values filled in`;
	if (selection.connection === 'untested') {
		return (
			`${label} could not be verified — n8n has no connection test for this credential type, ` +
			'so the selection may be a pre-existing credential belonging to a different service'
		);
	}
	return undefined;
}

/**
 * The result the agent relays. Only a verified selection may be reported as
 * ready — anything else names what is unresolved so the agent does not tell
 * the user a workflow or Agent works when it still does not.
 */
export function buildSetupOutcomeMessage(selections: SelectedCredentialOutcome[]): string {
	const problems = selections
		.map(describeSelectionProblem)
		.filter((problem): problem is string => problem !== undefined);

	if (problems.length === 0) {
		return (
			'Credential setup is complete — every selected credential is verified and ' +
			`ready to use. ${SETUP_CARD_CLOSED_NOTE} No further user action (such as OAuth ` +
			'authorization) is needed; confirm the outcome to the user.'
		);
	}

	return (
		`${SETUP_CARD_CLOSED_NOTE} These selections are not confirmed working: ${problems.join('; ')}. ` +
		'Do not tell the user they are ready or that the workflow can now run. Report what is unresolved, ' +
		'and when a credential is empty or belongs to another service, call setup_credentials ' +
		'again for that type with preferNew: true so the card opens on creating a new, distinct credential ' +
		'instead of re-offering the existing one.'
	);
}

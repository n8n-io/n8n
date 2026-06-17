import type { CredentialResolution, CredentialResolutionFailure } from './credential.types';
import type { CredentialMissingMode } from '../../n8n-packages.types';

/**
 * Classifies which unresolved credential references block the import, per missing-mode
 * policy. Read-only — never writes.
 */
/* eslint-disable @typescript-eslint/naming-convention -- API credential missing mode keys */
const BLOCKING_FAILURES: Record<
	CredentialMissingMode,
	(resolution: CredentialResolution) => CredentialResolutionFailure[]
> = {
	'must-preexist': (resolution) => resolution.failures,
	'create-stub': (resolution) =>
		resolution.failures.filter(
			(failure) => failure.kind !== 'not_found' || failure.targetId !== undefined,
		),
};
/* eslint-enable @typescript-eslint/naming-convention */

export function credentialBlockingFailures(
	mode: CredentialMissingMode,
	resolution: CredentialResolution,
): CredentialResolutionFailure[] {
	return BLOCKING_FAILURES[mode](resolution);
}

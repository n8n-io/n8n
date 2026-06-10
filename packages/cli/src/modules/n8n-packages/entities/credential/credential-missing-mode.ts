import type { CredentialResolution, CredentialResolutionFailure } from './credential.types';
import type { CredentialMissingMode } from '../../n8n-packages.types';

/**
 * Classifies which unresolved credential references block the import, per missing-mode
 * policy. Read-only — never writes. `must-preexist` is the only mode today.
 */
/* eslint-disable @typescript-eslint/naming-convention -- API credential missing mode keys */
const BLOCKING_FAILURES: Record<
	CredentialMissingMode,
	(resolution: CredentialResolution) => CredentialResolutionFailure[]
> = {
	'must-preexist': (resolution) => resolution.failures,
};
/* eslint-enable @typescript-eslint/naming-convention */

export function credentialBlockingFailures(
	mode: CredentialMissingMode,
	resolution: CredentialResolution,
): CredentialResolutionFailure[] {
	return BLOCKING_FAILURES[mode](resolution);
}

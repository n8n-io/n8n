import { toCredentialResolutionFailedError } from './credential-resolution-error';
import type { CredentialMissingModeContext, CredentialResolution } from './credential.types';

export abstract class CredentialMissingModeHandler {
	abstract handle(
		result: CredentialResolution,
		context: CredentialMissingModeContext,
	): Promise<CredentialResolution>;
}

export class MustPreexistCredentialMissingModeHandler extends CredentialMissingModeHandler {
	// eslint-disable-next-line @typescript-eslint/require-await -- async contract shared with the create-stubs handler, which performs DB writes
	async handle(result: CredentialResolution): Promise<CredentialResolution> {
		if (result.failures.length === 0) {
			return result;
		}

		throw toCredentialResolutionFailedError(result.failures);
	}
}

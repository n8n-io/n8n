import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';

import type { CredentialResolution } from './credential.types';
import type { CredentialMissingMode } from '../../n8n-packages.types';

export abstract class CredentialMissingModeHandler {
	abstract handle(result: CredentialResolution): CredentialResolution;
}

export class MustPreexistCredentialMissingModeHandler extends CredentialMissingModeHandler {
	handle(result: CredentialResolution): CredentialResolution {
		if (result.failures.length === 0) {
			return result;
		}

		throw toCredentialResolutionFailedError(result.failures);
	}
}

export function createCredentialMissingModeHandler(
	mode: CredentialMissingMode,
): CredentialMissingModeHandler {
	if (!(mode in credentialMissingModeHandlers)) {
		throw new BadRequestError(`Unsupported credential missing mode: ${mode as string}`);
	}

	const HandlerClass = credentialMissingModeHandlers[mode as CredentialMissingModeKey];
	return new HandlerClass();
}

export function applyCredentialMissingMode(
	mode: CredentialMissingMode,
	result: CredentialResolution,
): CredentialResolution {
	return createCredentialMissingModeHandler(mode).handle(result);
}

export function toCredentialResolutionFailedError(
	failures: CredentialResolution['failures'],
): UnprocessableRequestError {
	const count = failures.length;
	const message =
		count === 1
			? '1 credential reference could not be resolved.'
			: `${count} credential references could not be resolved.`;

	const error = new UnprocessableRequestError(message);
	Object.assign(error, { meta: { failures } });

	return error;
}

/* eslint-disable @typescript-eslint/naming-convention -- API credential missing mode keys */
const credentialMissingModeHandlers = {
	'must-preexist': MustPreexistCredentialMissingModeHandler,
} as const;
/* eslint-enable @typescript-eslint/naming-convention */

type CredentialMissingModeKey = keyof typeof credentialMissingModeHandlers;

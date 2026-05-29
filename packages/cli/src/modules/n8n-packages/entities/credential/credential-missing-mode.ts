import { Container, Service } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { CredentialMissingModeContext, CredentialResolution } from './credential.types';
import { toCredentialResolutionFailedError } from './credential-resolution-error';
import type { CredentialMissingMode } from '../../n8n-packages.types';

export abstract class CredentialMissingModeHandler {
	abstract handle(
		result: CredentialResolution,
		context: CredentialMissingModeContext,
	): Promise<CredentialResolution>;
}

@Service()
export class MustPreexistCredentialMissingModeHandler extends CredentialMissingModeHandler {
	// eslint-disable-next-line @typescript-eslint/require-await -- async contract shared with the create-stubs handler, which performs DB writes
	async handle(result: CredentialResolution): Promise<CredentialResolution> {
		if (result.failures.length === 0) {
			return result;
		}

		throw toCredentialResolutionFailedError(result.failures);
	}
}

export function createCredentialMissingModeHandler(
	mode: CredentialMissingMode,
): CredentialMissingModeHandler {
	if (!(mode in handlerByMode)) {
		throw new BadRequestError(`Unsupported credential missing mode: ${mode as string}`);
	}

	const HandlerClass = handlerByMode[mode as ImplementedMissingMode];
	return Container.get(HandlerClass);
}

export async function applyCredentialMissingMode(
	mode: CredentialMissingMode,
	result: CredentialResolution,
	context: CredentialMissingModeContext,
): Promise<CredentialResolution> {
	return await createCredentialMissingModeHandler(mode).handle(result, context);
}

/* eslint-disable @typescript-eslint/naming-convention -- API credential missing mode keys */
const handlerByMode = {
	'must-preexist': MustPreexistCredentialMissingModeHandler,
} as const;
/* eslint-enable @typescript-eslint/naming-convention */

type ImplementedMissingMode = keyof typeof handlerByMode;

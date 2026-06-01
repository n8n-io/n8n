import { Service } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { MustPreexistCredentialMissingModeHandler } from './credential-missing-mode';
import type { CredentialMissingModeHandler } from './credential-missing-mode';
import type { CredentialMissingMode } from '../../n8n-packages.types';

@Service()
export class CredentialMissingModeFactory {
	private readonly handlers: Record<CredentialMissingMode, CredentialMissingModeHandler>;

	constructor(mustPreexistHandler: MustPreexistCredentialMissingModeHandler) {
		/* eslint-disable @typescript-eslint/naming-convention -- API credential missing mode keys */
		this.handlers = {
			'must-preexist': mustPreexistHandler,
		};
		/* eslint-enable @typescript-eslint/naming-convention */
	}

	getHandler(mode: CredentialMissingMode): CredentialMissingModeHandler {
		const handler = this.handlers[mode];
		if (!handler) {
			throw new BadRequestError(`Unsupported credential missing mode: ${mode as string}`);
		}
		return handler;
	}
}

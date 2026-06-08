import { Service } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error.js';

import {
	MustPreexistCredentialMissingModeHandler,
	type CredentialMissingModeHandler,
} from './credential-missing-mode.js';
import type { CredentialMissingMode } from '../../n8n-packages.types.js';

@Service()
export class CredentialMissingModeFactory {
	private readonly handlers: Record<CredentialMissingMode, CredentialMissingModeHandler>;

	constructor() {
		/* eslint-disable @typescript-eslint/naming-convention -- API credential missing mode keys */
		this.handlers = {
			'must-preexist': new MustPreexistCredentialMissingModeHandler(),
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

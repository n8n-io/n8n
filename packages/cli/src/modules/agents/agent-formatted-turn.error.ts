import { OperationalError } from '@n8n/errors';

import type { FormattedTurnError } from './types/agent-turn-outcome';

/** A turn error that a host formatted. The client error event shows its text and code. */
export class AgentFormattedTurnError extends OperationalError {
	readonly errorCode?: string;

	constructor(formatted: FormattedTurnError, cause: unknown) {
		super(formatted.message, { cause });
		this.errorCode = formatted.code;
	}
}

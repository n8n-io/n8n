import { OperationalError, UserError } from '@n8n/errors';
import { redactText } from '@n8n/utils/redaction/redact-text';

const MAX_ERROR_MESSAGE_CHARS = 300;

/** The `errorType` values the tools return to the model. */
export type LiveSourceErrorType =
	| 'source_unavailable'
	| 'out_of_scope'
	| 'invalid_ref'
	| 'unknown_provider'
	| 'invalid_input';

/**
 * Removes secrets and noise from a message that came from a node or an API
 * before it reaches a log or the model. Raw node errors never reach the model.
 */
export function sanitizeLiveSourceErrorMessage(message: string): string {
	const oneLine = redactText(message).text.replace(/\s+/g, ' ').trim();
	return oneLine.length > MAX_ERROR_MESSAGE_CHARS
		? `${oneLine.slice(0, MAX_ERROR_MESSAGE_CHARS)}…`
		: oneLine;
}

/** The source cannot answer now: an API error, a missing credential, a policy refusal. */
export class LiveSourceUnavailableError extends OperationalError {
	readonly errorType: LiveSourceErrorType = 'source_unavailable';

	constructor(
		readonly sourceId: string,
		detail: string,
		options?: { cause?: unknown },
	) {
		super(
			`Knowledge source "${sourceId}" is unavailable: ${sanitizeLiveSourceErrorMessage(detail)}`,
			{ cause: options?.cause, level: 'warning' },
		);
	}
}

/** The ref points at an item that the agent did not pick and that no picked container contains. */
export class LiveSourceScopeError extends UserError {
	readonly errorType: LiveSourceErrorType = 'out_of_scope';

	constructor() {
		super('Not in the selected knowledge', { level: 'info' });
	}
}

/** The ref is not a `knowledge://live/<sourceId>/<itemId>` ref of this agent. */
export class LiveSourceRefError extends UserError {
	readonly errorType: LiveSourceErrorType = 'invalid_ref';

	constructor(detail: string) {
		super(`Invalid knowledge ref: ${detail}`, { level: 'info' });
	}
}

/** The agent config names a provider that the registry does not know. */
export class LiveSourceUnknownProviderError extends UserError {
	readonly errorType: LiveSourceErrorType = 'unknown_provider';

	constructor(provider: string) {
		super(`Unknown live knowledge provider "${provider}"`, { level: 'warning' });
	}
}

/** The tool input is valid for the schema but not for the sources, such as a container ref given to read. */
export class LiveSourceInputError extends UserError {
	readonly errorType: LiveSourceErrorType = 'invalid_input';

	constructor(detail: string) {
		super(detail, { level: 'info' });
	}
}

export function isLiveSourceError(
	error: unknown,
): error is Error & { errorType: LiveSourceErrorType } {
	return error instanceof Error && 'errorType' in error && typeof error.errorType === 'string';
}

import { ResponseError } from '@n8n/errors';
import { OperationalError, UserError } from 'n8n-workflow';

/**
 * An admin blocked the action for the n8n Assistant. The tool reports it as a denied action,
 * as the confirmation bridge does for other admin blocks.
 */
export class AutomationBlockedError extends UserError {}

/**
 * True for a failure that the user or the model can act on: a refusal, a conflict or a
 * transient problem. Other errors are bugs, so callers let them reach error reporting.
 */
export function isExpectedFailure(error: unknown): error is Error {
	return (
		error instanceof UserError ||
		error instanceof OperationalError ||
		error instanceof ResponseError
	);
}

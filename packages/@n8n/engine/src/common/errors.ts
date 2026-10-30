import { BaseError } from '@n8n/errors';

export { UnexpectedError } from '@n8n/errors';

/**
 * Thrown when the engine reaches a code path that isn't implemented yet.
 * Not a `UserError`, because that level is not reported to Sentry.
 */
export class UnimplementedError extends BaseError {}

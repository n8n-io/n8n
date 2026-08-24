import type { EnforcementPoint } from '@n8n/decorators';
import { OperationalError } from 'n8n-workflow';

/**
 * A check broke, so the action is blocked. Not knowing whether a policy allows something is not
 * the same as it being allowed.
 *
 * Deliberately opaque: check internals never reach `violations` or a response body, since an
 * infrastructure fault rendered as a policy rule is something a user would try to satisfy. The
 * correlation ids tie the response back to the server logs holding the real errors.
 */
export class PolicyCheckFailedError extends OperationalError {
	readonly httpStatusCode = 503;

	readonly errorCode = 503;

	readonly meta: { correlationIds: string[] };

	constructor(point: EnforcementPoint, correlationIds: string[]) {
		super(`Could not verify policy for ${point}, so the action was blocked`);

		this.meta = { correlationIds };
	}
}

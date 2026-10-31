import type { SkillSourceReason } from '@n8n/api-types';
import { OperationalError, type OperationalErrorOptions } from '@n8n/errors';

/**
 * The source answered, but not with what n8n can use: a rate limit, a failure on its side, or
 * content over a limit. `reason` is the reason code that telemetry and the editor show.
 */
export class SkillSourceReadError extends OperationalError {
	constructor(
		readonly reason: Extract<
			SkillSourceReason,
			'rate_limited' | 'unreachable' | 'archive_too_large' | 'credential_invalid' | 'host_blocked'
		>,
		message: string,
		options: OperationalErrorOptions & {
			/** For `rate_limited`: how long the source asked n8n to wait, from its answer. */
			retryAfterSeconds?: number;
		} = {},
	) {
		const { retryAfterSeconds, ...base } = options;
		super(message, base);
		this.retryAfterSeconds = retryAfterSeconds;
	}

	readonly retryAfterSeconds?: number;
}

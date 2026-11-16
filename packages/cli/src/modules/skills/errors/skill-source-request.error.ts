import type { SkillSourceReason } from '@n8n/api-types';
import { ResponseError } from '@n8n/errors';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';

import { SkillParseError } from './skill-parse.error';
import { SkillSourceNotFoundError } from './skill-source-not-found.error';
import { SkillSourceReadError } from './skill-source-read.error';
import { SkillSourceUrlError } from './skill-source-url.error';

const STATUS: Record<SkillSourceReason, number> = {
	invalid_url: 400,
	unsupported_provider: 400,
	parse_error: 400,
	not_found: 404,
	no_skills_found: 422,
	too_many_skills: 422,
	too_deep: 422,
	archive_too_large: 422,
	blocked_by_check: 422,
	review_required: 422,
	name_taken: 409,
	duplicate_source: 409,
	rate_limited: 429,
	credential_invalid: 400,
	credential_missing: 404,
	credential_out_of_scope: 403,
	host_blocked: 400,
	unreachable: 503,
};

/**
 * A Skill Sync request that failed for a known reason. The response carries the reason code
 * in `meta.reason`, so the editor can pick its text, and telemetry reports the same code.
 */
export class SkillSourceRequestError extends ResponseError {
	readonly meta: { reason: SkillSourceReason };

	constructor(
		readonly reason: SkillSourceReason,
		message: string,
		options: { cause?: unknown } = {},
	) {
		super(message, STATUS[reason], STATUS[reason], undefined, options.cause);
		this.meta = { reason };
	}
}

/** The reason code of an error from a source client, or undefined for a bug. */
export function skillSourceReasonOf(error: unknown): SkillSourceReason | undefined {
	if (error instanceof SkillSourceRequestError) return error.reason;
	if (error instanceof SkillSourceUrlError) return 'invalid_url';
	if (error instanceof SkillSourceNotFoundError) return 'not_found';
	if (error instanceof SkillSourceReadError) return error.reason;
	if (error instanceof SkillParseError) return 'parse_error';
	return undefined;
}

/** A source client error as the response of a request. A bug stays as it is, a 500. */
export function toSkillSourceRequestError(error: unknown): unknown {
	const reason = skillSourceReasonOf(error);
	if (!reason || error instanceof SkillSourceRequestError) return error;
	return new SkillSourceRequestError(reason, getErrorMessage(error), { cause: error });
}

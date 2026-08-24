import crypto from 'crypto';
import z from 'zod';

import { IdentifierValidationError } from './identifier-interface';

export const OAuth2OptionsSchema = z.object({
	metadataUri: z.string().url(),
	subjectClaim: z.string().optional().default('sub'),
	/**
	 * The `aud` value a token must carry. See {@link assertAudience}.
	 *
	 * Left blank the field arrives as an empty string, since the form sends every
	 * property it renders. That means "not configured", so it is normalised away
	 * rather than rejected — an unset audience is a valid, unenforced resolver.
	 */
	expectedAudience: z
		.string()
		.trim()
		.optional()
		.transform((value) => (value === '' ? undefined : value)),
});

export type OAuth2Options = z.infer<typeof OAuth2OptionsSchema>;

export function sha256(token: string): string {
	return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Reads the `aud` claim, which may be a single value or a list.
 *
 * Deliberately only `aud`. It is the one claim that names who a token is *for*
 * (RFC 7519 s4.1.3, RFC 9068 s2.2); `azp` and `client_id` name the client that
 * *requested* it. Where one client serves several applications, honouring those two
 * would accept a token minted for a different application of that client, which is
 * the confusion this check exists to prevent. A provider that issues no audience
 * should be configured to issue one rather than have us infer it.
 */
function collectAudienceClaims(claims: Record<string, unknown>): string[] {
	const value = claims.aud;

	if (typeof value === 'string') {
		return [value];
	}
	if (Array.isArray(value)) {
		return value.filter((entry): entry is string => typeof entry === 'string');
	}
	return [];
}

export const AUDIENCE_NOT_DECLARED_MESSAGE =
	'Token declares no audience, so it cannot be confirmed as issued for this instance';

export const AUDIENCE_MISMATCH_MESSAGE = 'Token was not issued for the expected audience';

/**
 * Asserts that a token names this instance as its intended audience.
 *
 * An IdP recognising a token says only that the token is one of its own. Identity is
 * only trustworthy once the token is also addressed to us.
 *
 * @throws {IdentifierValidationError} When the audience names a different party, or
 * when there is none to compare. Only reached once an audience has been configured,
 * which is the admin asking for the check, so both outcomes are failures.
 */
export function assertAudience(claims: Record<string, unknown>, expectedAudience: string): void {
	const audiences = collectAudienceClaims(claims);

	if (audiences.length === 0) {
		throw new IdentifierValidationError(AUDIENCE_NOT_DECLARED_MESSAGE);
	}

	if (!audiences.includes(expectedAudience)) {
		throw new IdentifierValidationError(AUDIENCE_MISMATCH_MESSAGE);
	}
}

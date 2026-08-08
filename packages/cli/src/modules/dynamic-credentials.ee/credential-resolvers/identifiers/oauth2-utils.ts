import crypto from 'crypto';
import z from 'zod';

export const OAuth2OptionsSchema = z.object({
	metadataUri: z.string().url(),
	subjectClaim: z.string().optional().default('sub'),
	/** Override for the audience a token must carry. See {@link assertAudience}. */
	expectedAudience: z.string().trim().min(1).optional(),
});

export type OAuth2Options = z.infer<typeof OAuth2OptionsSchema>;

export function sha256(token: string): string {
	return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Collects every claim an IdP may use to name the party a token was issued for.
 *
 * IdPs disagree on which claim carries this: Auth0 and Okta put a resource identifier
 * in `aud` and the client id in `azp`, while Keycloak commonly puts the client id
 * straight into `aud`. Gathering all of them keeps both shapes working without asking
 * the admin to know which their IdP uses.
 */
function collectAudienceClaims(claims: Record<string, unknown>): string[] {
	const values: string[] = [];

	for (const claim of ['aud', 'azp', 'client_id'] as const) {
		const value = claims[claim];
		if (typeof value === 'string') {
			values.push(value);
		} else if (Array.isArray(value)) {
			values.push(...value.filter((entry): entry is string => typeof entry === 'string'));
		}
	}

	return values;
}

export const AUDIENCE_NOT_DECLARED_MESSAGE =
	'Token declares no audience, so it cannot be confirmed as issued for this instance';

export const AUDIENCE_MISMATCH_MESSAGE = 'Token was not issued for the expected audience';

/** Outcome of comparing a token's audience claims against the expected audience. */
export type AudienceCheckResult =
	/** The claims name us as the intended relying party. */
	| 'matched'
	/** The claims name a different party. */
	| 'mismatched'
	/** The provider reported no audience at all, so there was nothing to compare. */
	| 'not-declared';

/**
 * Compares a token's audience claims against the audience expected for this instance.
 *
 * An IdP recognising a token says only that the token is one of its own. Identity is
 * only trustworthy once the token is also bound to us as the intended relying party.
 *
 * Reports rather than decides: whether a given outcome is fatal depends on how the
 * caller learned what to expect. An audience the admin configured carries more weight
 * than one inferred from other settings, so the callers apply their own policy.
 */
export function checkAudience(
	claims: Record<string, unknown>,
	expectedAudience: string,
): AudienceCheckResult {
	const audiences = collectAudienceClaims(claims);

	if (audiences.length === 0) {
		return 'not-declared';
	}

	return audiences.includes(expectedAudience) ? 'matched' : 'mismatched';
}

/** The failure to report for a non-matching {@link checkAudience} result. */
export function audienceFailureMessage(result: Exclude<AudienceCheckResult, 'matched'>): string {
	return result === 'not-declared' ? AUDIENCE_NOT_DECLARED_MESSAGE : AUDIENCE_MISMATCH_MESSAGE;
}

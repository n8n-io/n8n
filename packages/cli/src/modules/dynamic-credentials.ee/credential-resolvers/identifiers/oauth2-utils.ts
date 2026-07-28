import crypto from 'crypto';
import z from 'zod';

import { IdentifierValidationError } from './identifier-interface';

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

/**
 * Asserts that a token was issued for this instance.
 *
 * An IdP recognising a token says only that the token is one of its own. Identity is
 * only trustworthy once the token is also bound to us as the intended relying party.
 *
 * @throws {IdentifierValidationError} When the claims name a different party, or name
 * no party at all. An absent audience is a rejection, not a pass: the IdP told us
 * nothing about who the token was for, so there is nothing to trust.
 */
export function assertAudience(claims: Record<string, unknown>, expectedAudience: string): void {
	const audiences = collectAudienceClaims(claims);

	if (audiences.length === 0) {
		throw new IdentifierValidationError(
			'Token declares no audience, so it cannot be confirmed as issued for this instance',
		);
	}

	if (!audiences.includes(expectedAudience)) {
		throw new IdentifierValidationError('Token was not issued for the expected audience');
	}
}

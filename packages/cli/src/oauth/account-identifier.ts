import { jsonParse } from 'n8n-workflow';

/**
 * Best-effort extraction of the provider-side account an OAuth token belongs to
 * (an email, login, display name or user id), used to label a connection in the
 * UI as "Connected as …". Providers expose this inconsistently and many expose it
 * not at all — `undefined` is an expected result, not a failure. What comes back
 * is only ever a label; nothing keys off it.
 */
export function extractAccountIdentifier(tokenData: Record<string, unknown>): string | undefined {
	for (const key of ['email', 'login', 'username', 'user', 'account']) {
		if (typeof tokenData[key] === 'string' && tokenData[key]) {
			return tokenData[key];
		}
	}

	if (typeof tokenData.id_token === 'string') {
		const parts = tokenData.id_token.split('.');
		if (parts.length === 3) {
			// A malformed JWT just means no identity, so fall through rather than throw.
			const payload = jsonParse<Record<string, unknown>>(
				Buffer.from(parts[1], 'base64url').toString(),
				{ fallbackValue: {} },
			);
			// Standard OIDC claims, most to least precise. `name` is the display name
			// a `profile`-scoped grant returns when `email` was not requested — worth
			// showing, unlike the opaque `sub`, which we deliberately never use.
			for (const claim of ['email', 'preferred_username', 'name']) {
				if (typeof payload[claim] === 'string' && payload[claim]) {
					return payload[claim];
				}
			}
		}
	}

	const authedUser = tokenData.authed_user;
	if (authedUser && typeof authedUser === 'object') {
		const user = authedUser as Record<string, unknown>;
		if (typeof user.id === 'string' && user.id) {
			return user.id;
		}
	}

	return undefined;
}

/**
 * {@link extractAccountIdentifier} for a decrypted credential payload, read off its
 * `oauthTokenData` if it has one. Callers reach this from three different sources —
 * a per-user storage entry, a credential blob, an in-flight update — so the guard
 * and the cast live here once rather than at each call site.
 */
export function extractAccountIdentifierFromData(
	data: Record<string, unknown> | undefined,
): string | undefined {
	const tokenData = data?.oauthTokenData;
	if (!tokenData || typeof tokenData !== 'object') return undefined;
	return extractAccountIdentifier(tokenData as Record<string, unknown>);
}

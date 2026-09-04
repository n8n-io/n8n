import { z } from 'zod';

import {
	signSharedSecretToken,
	verifySharedSecretToken,
	type SharedSecretTokenSpec,
} from './shared-secret-token';

/**
 * What an action token authorizes. Scoped, so a leaked token buys only one of
 * the things the data plane can already do: report lifecycle events, or read a
 * credential for a step it runs.
 */
export type ActionScope = 'lifecycle-events:write' | 'credentials:read';

/** Every scope, so the schema and the type cannot drift apart. */
export const ACTION_SCOPES = [
	'lifecycle-events:write',
	'credentials:read',
] as const satisfies readonly ActionScope[];

/**
 * Deliberately the mirror image of the identity token's spec. The swapped
 * issuer and audience are what stop a token minted for CP → DP being replayed
 * at a control plane endpoint, and vice versa, even though both are signed with
 * the same shared secret.
 */
export const ACTION_TOKEN: SharedSecretTokenSpec = Object.freeze({
	issuer: 'n8n-engine-dp',
	audience: 'n8n-cp',
	ttlSeconds: 60,
	clockToleranceSeconds: 30,
});

const actionClaimsSchema = z.object({
	scope: z.enum(ACTION_SCOPES),
	iat: z.number().int(),
	exp: z.number().int(),
});

/** Every rejection path throws this one type, so no caller learns which check failed. */
export class InvalidActionTokenError extends Error {}

/** Signs an action token {@link verifyActionToken} accepts. The DP → CP direction. */
export function mintActionToken(secret: string, scope: ActionScope): string {
	return signSharedSecretToken(ACTION_TOKEN, secret, { scope });
}

/**
 * Throws unless the token is trustworthy and carries `requiredScope`. The secret
 * is read per call, and an unset or under-length one rejects everything.
 */
export function verifyActionToken(secret: string, token: string, requiredScope: ActionScope): void {
	const claims = verifySharedSecretToken(ACTION_TOKEN, secret, token, actionClaimsSchema);
	if (!claims || claims.scope !== requiredScope) throw new InvalidActionTokenError();
}

import { z } from 'zod';

import {
	signSharedSecretToken,
	verifySharedSecretToken,
	type UnexpiringTokenSpec,
} from './shared-secret-token';

/**
 * The capability token a resume URL carries (ADR-20260904-a-derived-token-authorizes-a-resume-request).
 *
 * It has its own audience. No other verifier accepts it, and its verifier
 * accepts no other token. No lifetime: the status of the step decides whether
 * a request still applies, and a wait can last months.
 */
export const RESUME_TOKEN: UnexpiringTokenSpec = Object.freeze({
	issuer: 'n8n-engine-dp',
	audience: 'n8n-engine-dp/resume',
	ttlSeconds: null,
	clockToleranceSeconds: 30,
});

/**
 * An execution-bound token names the execution and not the step:
 * `$execution.resumeUrl` is built by whichever node reads it, usually before
 * the step that waits exists. The token states its kind in `k`, so a wait
 * bound to a step can refuse it.
 */
const resumeClaimsSchema = z.object({
	k: z.literal('execution-bound'),
	eid: z.string().min(1),
	iat: z.number().int(),
});

/** Mints an execution-bound token for a resume URL of `executionId`. */
export function mintResumeToken(secret: string, executionId: string): string {
	return signSharedSecretToken(RESUME_TOKEN, secret, { k: 'execution-bound', eid: executionId });
}

/**
 * Whether `token` is an execution-bound token for `executionId`. An unset or
 * under-length secret rejects everything.
 */
export function verifyResumeToken(secret: string, token: string, executionId: string): boolean {
	const claims = verifySharedSecretToken(RESUME_TOKEN, secret, token, resumeClaimsSchema);
	return claims?.eid === executionId;
}

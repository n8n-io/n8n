import { z } from 'zod';

import {
	signSharedSecretToken,
	verifySharedSecretToken,
	type UnexpiringTokenSpec,
} from './shared-secret-token';

/**
 * The capability token a resume URL carries (ADR-20260904-a-derived-token-authorizes-a-resume-request).
 *
 * Its own issuer and audience, so it replays at neither plane's other
 * endpoints, and neither plane's other tokens replay here. No lifetime: the
 * status of the step decides whether a request still applies, and a wait can
 * last months.
 */
export const RESUME_TOKEN: UnexpiringTokenSpec = Object.freeze({
	issuer: 'n8n-engine-dp',
	audience: 'n8n-engine-dp/resume',
	ttlSeconds: null,
	clockToleranceSeconds: 30,
});

/**
 * The secrets of the resume token. A process signs with `signing` and accepts
 * `signing` and every `accepted` one, so a rolling rollout can rotate the
 * secret without ending an outstanding resume URL.
 */
export interface ResumeSecrets {
	signing: string;
	accepted?: readonly string[];
}

/**
 * An execution-bound token names the execution and not the step:
 * `$execution.resumeUrl` is built by whichever node reads it, usually before
 * the step that waits exists. The kind is a claim, so a step-bound wait can
 * refuse this token.
 */
const resumeClaimsSchema = z.object({
	k: z.literal('execution-bound'),
	eid: z.string().min(1),
	iat: z.number().int(),
});

/** Derives an execution-bound token for a resume URL of `executionId`. Nothing stores it. */
export function mintResumeToken(secret: string, executionId: string): string {
	return signSharedSecretToken(RESUME_TOKEN, secret, { k: 'execution-bound', eid: executionId });
}

/**
 * Whether `token` is an execution-bound token for `executionId`, signed with
 * one of `secrets`. One boolean for every failure, so a caller cannot learn
 * which check failed. An under-length secret matches nothing.
 */
export function verifyResumeToken(
	secrets: ResumeSecrets,
	token: string,
	executionId: string,
): boolean {
	// ponytail: trial over every secret. A set holds one or two during a rotation.
	return [secrets.signing, ...(secrets.accepted ?? [])].some(
		(secret) =>
			verifySharedSecretToken(RESUME_TOKEN, secret, token, resumeClaimsSchema)?.eid === executionId,
	);
}

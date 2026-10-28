import { createHmac, timingSafeEqual } from 'node:crypto';

import { UUID_V7_PATTERN } from '@n8n/constants';
import { z } from 'zod';

import {
	MIN_SECRET_LENGTH,
	signSharedSecretToken,
	verifySharedSecretToken,
	type UnexpiringTokenSpec,
} from './shared-secret-token';
import { UnexpectedError } from '../common';

/**
 * The spec of the capability token a resume URL carries (ADR-20260904-a-derived-token-authorizes-a-resume-request).
 *
 * It has its own audience. No other verifier accepts it, and its verifier
 * accepts no other token. No lifetime: the status of the step decides whether
 * a request still applies, and a wait can last months.
 */
export const RESUME_TOKEN_SPEC: UnexpiringTokenSpec = Object.freeze({
	issuer: 'n8n-engine-dp',
	audience: 'n8n-engine-dp/resume',
	ttlSeconds: null,
	clockToleranceSeconds: 30,
});

/** The answer of an approval button: `a` approves, `d` declines. */
export type ApprovalDecision = 'a' | 'd';

/**
 * What a verified resume token proves. The token states its kind, and the
 * data plane applies the rule of that kind (token record, decisions 3 to 5).
 */
export type ResumeTokenClaims =
	| { kind: 'execution-bound'; executionId: string }
	| { kind: 'step-bound'; stepId: string; binding: string }
	| { kind: 'approval-callback'; stepId: string; decision: ApprovalDecision };

/**
 * An execution-bound token names the execution and not the step:
 * `$execution.resumeUrl` is built by whichever node reads it, usually before
 * the step that waits exists. A step-bound token names the step whose node
 * built the URL, and `b` holds the path and query of that URL.
 */
const resumeClaimsSchema = z.discriminatedUnion('k', [
	z.object({
		k: z.literal('execution-bound'),
		eid: z.string().regex(UUID_V7_PATTERN),
		iat: z.number().int(),
	}),
	z.object({
		k: z.literal('step-bound'),
		sid: z.string().regex(UUID_V7_PATTERN),
		b: z.string().min(1),
		iat: z.number().int(),
	}),
]);

/** Mints an execution-bound token for a resume URL of `executionId`. */
export function mintResumeToken(secret: string, executionId: string): string {
	return signSharedSecretToken(RESUME_TOKEN_SPEC, secret, {
		k: 'execution-bound',
		eid: executionId,
	});
}

/**
 * Mints a step-bound token for a resume URL of `stepId`. `binding` is the path
 * and query of the URL as the node built it, without the token parameter. The
 * request must arrive with the same string (token record, decision 5).
 */
export function mintStepBoundResumeToken(secret: string, stepId: string, binding: string): string {
	return signSharedSecretToken(RESUME_TOKEN_SPEC, secret, {
		k: 'step-bound',
		sid: stepId,
		b: binding,
	});
}

/**
 * Starts an approval callback. Telegram allows 64 bytes for the data of a
 * button, so the callback carries its claims in a compact signed form and not
 * as a JWT: the prefix, the 16 bytes of the step id in 22 base64url
 * characters, the decision, and 32 base64url characters of an HMAC-SHA256.
 */
export const APPROVAL_CALLBACK_PREFIX = 'nhitl2|';

const encodeStepId = (stepId: string) =>
	Buffer.from(stepId.replaceAll('-', ''), 'hex').toString('base64url');

function decodeStepId(encoded: string): string | undefined {
	const hex = Buffer.from(encoded, 'base64url').toString('hex');
	const stepId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
	// The last character carries four unused bits. Encoding again refuses every second spelling.
	return UUID_V7_PATTERN.test(stepId) && encodeStepId(stepId) === encoded ? stepId : undefined;
}

const callbackMac = (secret: string, stepId: string, decision: ApprovalDecision) =>
	createHmac('sha256', secret)
		.update(`n8n-resume-callback:v2:${stepId}:${decision}`)
		.digest('base64url')
		.slice(0, 32);

/** Mints the approval callback that gives `decision` to the wait of `stepId`. */
export function mintApprovalCallback(
	secret: string,
	stepId: string,
	decision: ApprovalDecision,
): string {
	if (!UUID_V7_PATTERN.test(stepId)) {
		throw new UnexpectedError(`An approval callback needs a UUID v7 step id, not "${stepId}"`);
	}
	const id = stepId.toLowerCase();
	return `${APPROVAL_CALLBACK_PREFIX}${encodeStepId(id)}|${decision}|${callbackMac(secret, id, decision)}`;
}

function readApprovalCallback(
	reference: string,
): { stepId: string; decision: ApprovalDecision; mac: string } | undefined {
	if (!reference.startsWith(APPROVAL_CALLBACK_PREFIX)) return undefined;
	const parts = reference.slice(APPROVAL_CALLBACK_PREFIX.length).split('|');
	if (parts.length !== 3) return undefined;
	const [encoded, decision, mac] = parts;
	const stepId = decodeStepId(encoded);
	if (!stepId || (decision !== 'a' && decision !== 'd') || !mac) return undefined;
	return { stepId, decision, mac };
}

/**
 * The step and the decision of an approval callback, without verification.
 * The control plane reads the step id to pick the engine, and forwards the
 * callback unread.
 */
export function parseApprovalCallback(
	reference: string,
): { stepId: string; decision: ApprovalDecision } | undefined {
	const parsed = readApprovalCallback(reference);
	return parsed && { stepId: parsed.stepId, decision: parsed.decision };
}

function verifyApprovalCallback(secret: string, reference: string): ResumeTokenClaims | undefined {
	// As for a JWT, an under-length secret rejects everything.
	if (secret.length < MIN_SECRET_LENGTH) return undefined;
	const parsed = readApprovalCallback(reference);
	if (!parsed) return undefined;
	const expected = Buffer.from(callbackMac(secret, parsed.stepId, parsed.decision));
	const given = Buffer.from(parsed.mac);
	if (given.length !== expected.length || !timingSafeEqual(given, expected)) return undefined;
	return { kind: 'approval-callback', stepId: parsed.stepId, decision: parsed.decision };
}

/**
 * The claims that `token` proves, or `undefined` for every failure, so a
 * caller cannot learn which check failed. An unset or under-length secret
 * rejects everything.
 */
export function verifyResumeToken(secret: string, token: string): ResumeTokenClaims | undefined {
	if (token.startsWith(APPROVAL_CALLBACK_PREFIX)) return verifyApprovalCallback(secret, token);

	const claims = verifySharedSecretToken(RESUME_TOKEN_SPEC, secret, token, resumeClaimsSchema);
	switch (claims?.k) {
		case 'execution-bound':
			return { kind: 'execution-bound', executionId: claims.eid };
		case 'step-bound':
			return { kind: 'step-bound', stepId: claims.sid, binding: claims.b };
		default:
			return undefined;
	}
}

import { createHmac, timingSafeEqual } from 'crypto';
import { UnexpectedError } from 'n8n-workflow';

/**
 * Versioned prefix for every HITL callback reference. Platform webhook handlers
 * (e.g. the Telegram Trigger) key their forwarding decision off this prefix.
 */
export const HITL_CALLBACK_PREFIX = 'nhitl1|';

/**
 * Suffix appended to the waiting-webhook base path to build Telegram's fixed
 * HITL endpoint. Shared by the CLI (mounting the endpoint), the Telegram node
 * (registering it as the bot's webhook), and the Telegram Trigger (forwarding
 * callback taps to it), so the three stay in sync without a duplicated literal.
 */
export const TELEGRAM_HITL_WEBHOOK_SUFFIX = '-telegram';

export type HitlCallbackDecision = 'a' | 'd';

export interface ParsedHitlCallbackReference {
	executionId: string;
	decision: HitlCallbackDecision;
	hmac: string;
}

function buildHmacInput(executionId: string, decision: HitlCallbackDecision): string {
	return `n8n-hitl-callback:v1:${executionId}:${decision}`;
}

function computeHmac(executionId: string, decision: HitlCallbackDecision, secret: string): string {
	// 32 hex chars = 128 bits. Comfortably fits the 64-byte reference budget even
	// for a long execution id, so there is no reason to settle for less.
	return createHmac('sha256', secret)
		.update(buildHmacInput(executionId, decision))
		.digest('hex')
		.slice(0, 32);
}

/**
 * Builds a compact, HMAC-verified reference for a HITL approval decision, meant
 * to be embedded in a platform-native callback payload (e.g. Telegram's
 * `callback_data`, capped at 64 bytes). The reference is platform-neutral: it
 * carries only the execution id, the decision, and a truncated HMAC, so the
 * same helper can back Telegram, Slack, or Gmail HITL callbacks.
 */
export function buildHitlCallbackReference(
	executionId: string,
	decision: HitlCallbackDecision,
	secret: string,
): string {
	const hmac = computeHmac(executionId, decision, secret);
	const reference = `${HITL_CALLBACK_PREFIX}${executionId}|${decision}|${hmac}`;
	if (reference.length > 64) {
		throw new UnexpectedError(
			`HITL callback reference exceeds the 64-byte platform limit (${reference.length} bytes) for execution "${executionId}"`,
		);
	}
	return reference;
}

/**
 * Parses a raw callback payload into its constituent parts, without verifying
 * the HMAC. Returns `null` if the payload does not match the expected format.
 */
export function parseHitlCallbackReference(data: string): ParsedHitlCallbackReference | null {
	if (!data.startsWith(HITL_CALLBACK_PREFIX)) return null;

	const [executionId, decision, hmac] = data.slice(HITL_CALLBACK_PREFIX.length).split('|');
	if (!executionId || !hmac || (decision !== 'a' && decision !== 'd')) return null;

	return { executionId, decision, hmac };
}

/**
 * Verifies a parsed reference's HMAC against the instance secret, using a
 * timing-safe comparison. This is the only check needed to prove the reference
 * was minted by this instance; it says nothing about the caller's identity.
 */
export function verifyHitlCallbackReference(
	parsed: ParsedHitlCallbackReference,
	secret: string,
): boolean {
	const expected = computeHmac(parsed.executionId, parsed.decision, secret);
	const expectedBuffer = Buffer.from(expected);
	const providedBuffer = Buffer.from(parsed.hmac);

	return (
		expectedBuffer.byteLength === providedBuffer.byteLength &&
		timingSafeEqual(expectedBuffer, providedBuffer)
	);
}

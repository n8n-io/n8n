import { APPROVAL_CALLBACK_PREFIX, decodeStepId } from '@n8n/utils/approval-callback';
import { createHmac, timingSafeEqual } from 'crypto';
import { UnexpectedError } from 'n8n-workflow';

/** Prefix of an engine v1 callback reference. The Telegram Trigger keys its forwarding on it. */
export const HITL_CALLBACK_PREFIX = 'nhitl1|';

/**
 * Suffix on the waiting-webhook base path for Telegram's fixed HITL endpoint. Shared by the
 * CLI, the Telegram node, and the Telegram Trigger so the literal stays in one place.
 */
export const TELEGRAM_HITL_WEBHOOK_SUFFIX = '-telegram';

/**
 * Suffix on the waiting-webhook base path for Slack's fixed HITL endpoint. Shared by the CLI
 * and the Slack Request URL so the literal stays in one place.
 */
export const SLACK_HITL_WEBHOOK_SUFFIX = '-slack';

/**
 * Marker set by the CLI's Slack interaction route (`SlackInteractionWebhooks`) on the request.
 * The Slack node's handler reads it to hard-require a valid Slack signature and never fall back
 * to the query-param approval path. A non-enumerable Symbol keeps it off the request's
 * serializable surface, so it can't be spoofed via the body, query, or headers.
 */
const SLACK_INTERACTION_REQUEST = Symbol('n8nSlackInteractionRequest');

/** Flags a request as having arrived via the Slack interaction webhook route. */
export function markSlackInteractionRequest(req: object): void {
	Object.defineProperty(req, SLACK_INTERACTION_REQUEST, {
		value: true,
		enumerable: false,
		configurable: true,
	});
}

/** Whether a request was flagged by `markSlackInteractionRequest`. */
export function isSlackInteractionRequest(req: object): boolean {
	return (req as Record<PropertyKey, unknown>)[SLACK_INTERACTION_REQUEST] === true;
}

/**
 * Telegram's counterpart to `SLACK_INTERACTION_REQUEST`, set by `TelegramInteractionWebhooks`.
 * The Telegram node's handler reads it to route the request to its chat-approval branch, which
 * verifies the bot secret token.
 */
const TELEGRAM_INTERACTION_REQUEST = Symbol('n8nTelegramInteractionRequest');

/** Flags a request as having arrived via the Telegram interaction webhook route. */
export function markTelegramInteractionRequest(req: object): void {
	Object.defineProperty(req, TELEGRAM_INTERACTION_REQUEST, {
		value: true,
		enumerable: false,
		configurable: true,
	});
}

/** Whether a request was flagged by `markTelegramInteractionRequest`. */
export function isTelegramInteractionRequest(req: object): boolean {
	return (req as Record<PropertyKey, unknown>)[TELEGRAM_INTERACTION_REQUEST] === true;
}

/** Prefix of an engine v2 approval callback. It names a step. */
export const HITL_CALLBACK_PREFIX_V2 = APPROVAL_CALLBACK_PREFIX;

export type HitlCallbackDecision = 'a' | 'd';

/** An engine v1 reference. The instance HMAC secret signs it. */
export interface ExecutionBoundHitlCallbackReference {
	kind: 'execution';
	executionId: string;
	decision: HitlCallbackDecision;
	hmac: string;
}

/** An engine v2 reference. The data plane's resume secret signs it. */
export interface StepBoundHitlCallbackReference {
	kind: 'step';
	stepId: string;
	decision: HitlCallbackDecision;
	hmac: string;
}

export type ParsedHitlCallbackReference =
	| ExecutionBoundHitlCallbackReference
	| StepBoundHitlCallbackReference;

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
 * Builds a compact, HMAC-verified reference for a HITL approval decision, embedded in a
 * platform-native callback payload (e.g. Telegram's `callback_data`, capped at 64 bytes). It
 * carries only the execution id, decision, and a truncated HMAC, so it's platform-neutral.
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
 * the HMAC. An engine v1 reference names the execution, an engine v2 reference
 * names the step. Returns `null` if the payload does not match either format.
 */
export function parseHitlCallbackReference(data: string): ParsedHitlCallbackReference | null {
	if (data.startsWith(HITL_CALLBACK_PREFIX_V2)) {
		const [encodedStepId, decision, hmac] = data.slice(HITL_CALLBACK_PREFIX_V2.length).split('|');
		if (!encodedStepId || !hmac || (decision !== 'a' && decision !== 'd')) return null;
		const stepId = decodeStepId(encodedStepId);
		if (!stepId) return null;
		return { kind: 'step', stepId, decision, hmac };
	}

	if (!data.startsWith(HITL_CALLBACK_PREFIX)) return null;

	const [executionId, decision, hmac] = data.slice(HITL_CALLBACK_PREFIX.length).split('|');
	if (!executionId || !hmac || (decision !== 'a' && decision !== 'd')) return null;

	return { kind: 'execution', executionId, decision, hmac };
}

/**
 * Verifies a parsed reference's HMAC against the instance secret, using a
 * timing-safe comparison. This is the only check needed to prove the reference
 * was minted by this instance; it says nothing about the caller's identity.
 * A step-bound reference never passes; the resume secret signs it.
 */
export function verifyHitlCallbackReference(
	parsed: ParsedHitlCallbackReference,
	secret: string,
): boolean {
	if (parsed.kind !== 'execution') return false;
	const expected = computeHmac(parsed.executionId, parsed.decision, secret);
	const expectedBuffer = Buffer.from(expected);
	const providedBuffer = Buffer.from(parsed.hmac);

	return (
		expectedBuffer.byteLength === providedBuffer.byteLength &&
		timingSafeEqual(expectedBuffer, providedBuffer)
	);
}

// ---------------------------------------------------------------------------
// Deterministic shortcuts — bypass the LLM for cases where its judgement
// adds no value.
//
// 1. Reference-turn replay: when the test case's conversation has
//    unsent user turns, send them verbatim instead of asking the LLM what
//    the user "would" say.
//
// 2. Infrastructure confirmation events (credentials, domain access,
//    resource decisions): no user-intent signal is needed — the eval has
//    no credentials and grants all access. Same defaults the v1
//    buildAutoApprovePayload shim used; preserved here so the LLM only
//    sees events that genuinely need user judgement.
// ---------------------------------------------------------------------------

import type { InstanceAiConfirmRequest } from '@n8n/api-types';

import type { CapturedEvent, ConversationTurn } from '../../types';

// ---------------------------------------------------------------------------
// Reference-turn shortcut (between-run decisions)
// ---------------------------------------------------------------------------

/**
 * The next user turn from the reference conversation that hasn't been sent yet.
 * The opening user turn is consumed on send; each follow-up consumes one more.
 * Returns undefined once the reference is exhausted.
 */
export function getNextUnsentReferenceUserTurn(
	conversation: ConversationTurn[],
	messagesSent: number,
): string | undefined {
	const userTurns = conversation.filter((t) => t.role === 'user');
	// +1 because the opening message drains the first user turn before any decideFollowUp call.
	const idx = messagesSent + 1;
	return userTurns[idx]?.text;
}

// ---------------------------------------------------------------------------
// Infrastructure event handlers (confirmation responses)
// ---------------------------------------------------------------------------

/**
 * Try to handle a confirmation event with a deterministic response. Returns
 * the payload when the event is infrastructure-only (credentials, domain
 * access, resource decisions); returns undefined when the event carries
 * user intent and should go to the LLM agent.
 *
 * Order matters: setup wizard with credentialRequests goes to the LLM (it
 * needs to fill parameters from conversation). Standalone credential
 * requests get deferred.
 */
export function tryDeterministicConfirmationResponse(
	event: CapturedEvent,
): InstanceAiConfirmRequest | undefined {
	const payload = getNestedRecord(event.data, 'payload') ?? {};

	// Domain access — always allow_all in eval.
	if (getNestedRecord(payload, 'domainAccess')) {
		return { kind: 'domainAccessApprove', domainAccessAction: 'allow_all' };
	}

	// Resource decision — pick first "allow" option, or first option, or fallback.
	const resourceDecision = getNestedRecord(payload, 'resourceDecision');
	if (resourceDecision) {
		const options = Array.isArray(resourceDecision.options)
			? (resourceDecision.options as unknown[]).filter((o): o is string => typeof o === 'string')
			: [];
		const allowOption = options.find((o) => o.toLowerCase().includes('allow')) ?? options[0];
		return { kind: 'resourceDecision', resourceDecision: allowOption ?? 'allowOnce' };
	}

	// Setup wizard goes to the LLM — it has nodeParameters to fill from conversation.
	if (Array.isArray(payload.setupRequests)) {
		return undefined;
	}

	// Standalone credential request (no setup wizard) — defer.
	if (Array.isArray(payload.credentialRequests)) {
		return { kind: 'credentialSelection', credentials: {} };
	}

	// inputType=questions, text, plan-review, or default approval — LLM handles.
	return undefined;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getNestedRecord(
	obj: Record<string, unknown>,
	key: string,
): Record<string, unknown> | undefined {
	const value = obj[key];
	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	return undefined;
}

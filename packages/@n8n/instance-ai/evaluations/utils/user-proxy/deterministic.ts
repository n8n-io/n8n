// Deterministic shortcuts that bypass the LLM for events with no user-intent signal.

import type { InstanceAiConfirmRequest } from '@n8n/api-types';

import type { CapturedEvent, ConversationTurn } from '../../types';

/** Next unsent reference user turn, or undefined when the reference is exhausted. */
export function getNextUnsentReferenceUserTurn(
	conversation: ConversationTurn[],
	messagesSent: number,
): string | undefined {
	const userTurns = conversation.filter((t) => t.role === 'user');
	// +1 because the opening message drains the first user turn before any decideFollowUp call.
	const idx = messagesSent + 1;
	return userTurns[idx]?.text;
}

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

	// Setup wizard with credentials-only requests: skip. The eval has no
	// credentials and applying an empty payload loops the agent ("partial 0/N").
	// Mixed (credential + parameter issues, or parameter-only) → LLM fills params.
	if (Array.isArray(payload.setupRequests)) {
		if (payload.setupRequests.every(isCredentialOnlySetupRequest)) {
			return { kind: 'approval', approved: false };
		}
		return undefined;
	}

	// Standalone credential request (no setup wizard) — defer.
	if (Array.isArray(payload.credentialRequests)) {
		return { kind: 'credentialSelection', credentials: {} };
	}

	// inputType=questions, text, plan-review, or default approval — LLM handles.
	return undefined;
}

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

function isCredentialOnlySetupRequest(value: unknown): boolean {
	if (typeof value !== 'object' || value === null) return false;
	const req = value as Record<string, unknown>;
	if (typeof req.credentialType !== 'string') return false;
	const issues = req.parameterIssues;
	if (issues && typeof issues === 'object' && Object.keys(issues).length > 0) return false;
	return true;
}

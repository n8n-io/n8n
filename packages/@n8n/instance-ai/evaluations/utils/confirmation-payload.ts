// Shared confirmation-event helpers — used by both the deterministic shortcut
// (utils/user-proxy/deterministic.ts) and the autoApprove fallback
// (harness/chat-loop.ts) to avoid copy-pasted dispatch logic.

import { instanceGatewayResourceDecisionSchema } from '@n8n/api-types';
import type { InstanceAiConfirmRequest } from '@n8n/api-types';

import { getNestedRecord } from './safe-extract';
import type { CapturedEvent } from '../types';

/**
 * Handle confirmation events that carry no user-intent signal — domain access,
 * resource decisions, standalone credential requests. The eval grants all
 * access, has no credentials, and picks the most-permissive option for
 * resource gates. Returns `undefined` for events that need caller-specific
 * handling: setup wizards, ask-user questions, plan reviews.
 */
export function tryInfrastructureResponse(
	event: CapturedEvent,
): InstanceAiConfirmRequest | undefined {
	const payload = getNestedRecord(event.data, 'payload') ?? {};

	if (getNestedRecord(payload, 'domainAccess')) {
		return { kind: 'domainAccessApprove', domainAccessAction: 'allow_all' };
	}

	const resourceDecision = getNestedRecord(payload, 'resourceDecision');
	if (resourceDecision) {
		const options = Array.isArray(resourceDecision.options)
			? (resourceDecision.options as unknown[]).filter((o): o is string => typeof o === 'string')
			: [];
		const allowOption = options.find((o) => o.toLowerCase().includes('allow')) ?? options[0];
		const parsed = instanceGatewayResourceDecisionSchema.safeParse(allowOption);
		return {
			kind: 'resourceDecision',
			resourceDecision: parsed.success ? parsed.data : 'allowOnce',
		};
	}

	// Standalone credential request only — when setupRequests is also present,
	// the setup wizard takes priority because it carries node parameters to
	// fill (handled by the caller).
	if (Array.isArray(payload.credentialRequests) && !Array.isArray(payload.setupRequests)) {
		return { kind: 'credentialSelection', credentials: {} };
	}

	return undefined;
}

export function getEventPayload(event: CapturedEvent): Record<string, unknown> {
	return getNestedRecord(event.data, 'payload') ?? {};
}

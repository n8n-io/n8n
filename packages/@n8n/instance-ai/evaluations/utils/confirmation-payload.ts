// Shared confirmation-event helpers — used by both the deterministic shortcut
// (utils/user-proxy/deterministic.ts) and the autoApprove fallback
// (harness/chat-loop.ts) to avoid copy-pasted dispatch logic.

import { instanceGatewayResourceDecisionSchema } from '@n8n/api-types';
import type { InstanceAiConfirmRequest } from '@n8n/api-types';

import { getNestedRecord } from './safe-extract';
import type { CapturedEvent } from '../types';

export interface InfrastructureResponseOptions {
	/**
	 * TRUST-349: when true, a standalone credential-request event is left
	 * unhandled here (`undefined`) so the caller can route it to the LLM's
	 * `choose_credential_setup_option` action instead of the default deferral.
	 * Set only when a stage direction is still pending delivery — see
	 * `UserProxyLlm.hasPendingStageDirection` in `user-proxy/index.ts`, the
	 * same content-agnostic check domain access and plan review already use.
	 * Absent/false reproduces today's behavior exactly, so every existing case
	 * (and every other caller, e.g. `chat-loop.ts`'s `buildAutoApprovePayload`)
	 * is unaffected.
	 */
	allowCredentialEngagement?: boolean;
}

/**
 * Handle confirmation events that carry no user-intent signal — domain access,
 * web search, resource decisions, standalone credential requests. The eval
 * grants all access, has no credentials, and picks the most-permissive option
 * for resource gates. Returns `undefined` for events that need caller-specific
 * handling: setup wizards, ask-user questions, plan reviews.
 */
export function tryInfrastructureResponse(
	event: CapturedEvent,
	options?: InfrastructureResponseOptions,
): InstanceAiConfirmRequest | undefined {
	const payload = getNestedRecord(event.data, 'payload') ?? {};

	// Web search reuses domain access's approval shape.
	if (getNestedRecord(payload, 'domainAccess') || getNestedRecord(payload, 'webSearch')) {
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
		if (options?.allowCredentialEngagement) return undefined;
		return { kind: 'credentialSelection', credentials: {} };
	}

	return undefined;
}

export function getEventPayload(event: CapturedEvent): Record<string, unknown> {
	return getNestedRecord(event.data, 'payload') ?? {};
}

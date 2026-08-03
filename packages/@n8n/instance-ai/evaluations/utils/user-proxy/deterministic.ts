// Deterministic shortcuts that bypass the LLM for events with no user-intent signal.

import type { InstanceAiConfirmRequest } from '@n8n/api-types';

import type { CapturedEvent } from '../../types';
import {
	getEventPayload,
	tryInfrastructureResponse,
	type InfrastructureResponseOptions,
} from '../confirmation-payload';

export function tryDeterministicConfirmationResponse(
	event: CapturedEvent,
	options?: InfrastructureResponseOptions,
): InstanceAiConfirmRequest | undefined {
	const infra = tryInfrastructureResponse(event, options);
	if (infra) return infra;

	const payload = getEventPayload(event);

	// Setup wizard with credentials-only requests: skip by default (the eval
	// has no credentials to apply and an empty payload just loops the agent,
	// "partial 0/N") — unless a stage direction asks the user to engage with
	// this card (TRUST-349's `allowCredentialEngagement`), in which case fall
	// through so the LLM's apply_setup_wizard can populate nodeCredentialsJson.
	// Mixed (credential + parameter issues, or parameter-only) → LLM fills params.
	if (Array.isArray(payload.setupRequests)) {
		if (
			payload.setupRequests.length > 0 &&
			payload.setupRequests.every(isCredentialOnlySetupRequest) &&
			!options?.allowCredentialEngagement
		) {
			return { kind: 'approval', approved: false };
		}
		return undefined;
	}

	// inputType=questions, text, plan-review, or default approval — LLM handles.
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

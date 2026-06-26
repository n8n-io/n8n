// Deterministic shortcuts that bypass the LLM for events with no user-intent signal.

import type { InstanceAiConfirmRequest } from '@n8n/api-types';

import type { CapturedEvent } from '../../types';
import { getEventPayload, tryInfrastructureResponse } from '../confirmation-payload';

export function tryDeterministicConfirmationResponse(
	event: CapturedEvent,
): InstanceAiConfirmRequest | undefined {
	const infra = tryInfrastructureResponse(event);
	if (infra) return infra;

	const payload = getEventPayload(event);

	// Setup wizard with credentials-only requests: skip. The eval has no
	// credentials and applying an empty payload loops the agent ("partial 0/N").
	// Mixed (credential + parameter issues, or parameter-only) → LLM fills params.
	if (Array.isArray(payload.setupRequests)) {
		if (
			payload.setupRequests.length > 0 &&
			payload.setupRequests.every(isCredentialOnlySetupRequest)
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

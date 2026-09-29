import type { InstanceAiConfirmRequest } from '@n8n/api-types';

import type { ConfirmationData } from './run-state-registry';

/**
 * The two-step translation from a frontend confirmation to a tool resume payload:
 * wire union → flat `ConfirmationData` → the object handed to `runtime.resume()`,
 * which the suspended tool's `resumeSchema` validates.
 *
 * Kept next to `ConfirmationData` and the tool schemas (rather than in the
 * service) because a field the emitter names differently from the receiving
 * schema is silently dropped at resume time — `resumeSchema` validation strips
 * undeclared keys. `confirmation-payload.test.ts` pins emitter and schemas
 * together so that drift fails in CI instead of at runtime (INS-1095).
 *
 * Exposed as its own `@n8n/instance-ai/confirmation-payload` entry point: both
 * functions are pure, so downstream suites that mock the agent-tainted barrel
 * still exercise the real translation.
 */

/** Collapse the frontend's typed confirmation union into the flat payload
 *  consumed by native tool resume schemas and sub-agent HITL. Only the fields
 *  relevant to the submitted kind are populated — everything else stays undefined.
 *
 *  Most kinds carry implicit approval (you wouldn't be submitting answers,
 *  selected credentials, or a setup action otherwise) — only `approval`,
 *  `domainAccessDeny`, and `planDeny` carry a denial path. */
export function toConfirmationData(request: InstanceAiConfirmRequest): ConfirmationData {
	switch (request.kind) {
		case 'approval':
			return { approved: request.approved, userInput: request.userInput, scope: request.scope };
		case 'domainAccessApprove':
			return { approved: true, domainAccessAction: request.domainAccessAction };
		case 'domainAccessDeny':
			return { approved: false };
		case 'planDeny':
			return { approved: false, denied: true };
		case 'questions':
			return { approved: true, answers: request.answers };
		case 'credentialSelection':
			return { approved: true, credentials: request.credentials };
		case 'credentialAutoSetup':
			return {
				approved: true,
				autoSetup: { credentialType: request.credentialType, attemptId: request.attemptId },
			};
		case 'credentialDestination':
			return {
				approved: request.approved,
				credentialDestination: { origin: request.origin },
			};
		case 'resourceDecision':
			return { approved: true, resourceDecision: request.resourceDecision };
		case 'mcpConnect':
			return { approved: request.approved, connectedSlugs: request.connectedSlugs };
		case 'setupWorkflowApply':
			return {
				approved: true,
				action: 'apply',
				nodeCredentials: request.nodeCredentials,
				nodeParameters: request.nodeParameters,
				skippedNodes: request.skippedNodes,
			};
		case 'setupWorkflowTestTrigger':
			return {
				approved: true,
				action: 'test-trigger',
				testTriggerNode: request.testTriggerNode,
				nodeCredentials: request.nodeCredentials,
				nodeParameters: request.nodeParameters,
			};
	}
}

/**
 * Build the payload passed to `runtime.resume()`, dropping absent fields so a
 * tool's `resumeSchema` only ever sees keys the user actually submitted.
 */
export function buildResumeData(data: ConfirmationData): Record<string, unknown> {
	// setup-workflow uses nodeCredentials (per-node) format for its credentials field;
	// other tools use the flat credentials map. Prefer nodeCredentials when present.
	const credentialsPayload = data.nodeCredentials ?? data.credentials;
	return {
		approved: data.approved,
		...(credentialsPayload ? { credentials: credentialsPayload } : {}),
		...(data.userInput !== undefined ? { userInput: data.userInput } : {}),
		...(data.domainAccessAction ? { domainAccessAction: data.domainAccessAction } : {}),
		...(data.action ? { action: data.action } : {}),
		...(data.nodeParameters ? { nodeParameters: data.nodeParameters } : {}),
		...(data.skippedNodes ? { skippedNodes: data.skippedNodes } : {}),
		...(data.testTriggerNode ? { testTriggerNode: data.testTriggerNode } : {}),
		...(data.answers ? { answers: data.answers } : {}),
		...(data.resourceDecision ? { resourceDecision: data.resourceDecision } : {}),
		...(data.scope ? { scope: data.scope } : {}),
		...(data.autoSetup ? { autoSetup: data.autoSetup } : {}),
		...(data.credentialDestination ? { credentialDestination: data.credentialDestination } : {}),
		...(data.denied ? { denied: true } : {}),
		...(data.connectedSlugs ? { connectedSlugs: data.connectedSlugs } : {}),
	};
}

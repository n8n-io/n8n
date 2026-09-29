// ---------------------------------------------------------------------------
// How the harness answers confirmation / HITL suspensions.
//
// Production waits for the user; the harness answers from the scenario, keyed on
// the suspending tool's name and defaulting to approve, so a scenario only
// declares the answers it wants to differ. A bare approval resumes
// `{ approved: true }`, which is the whole contract for an `approval` card — an
// MCP tool call included.
//
// Cards that need the user to *supply* something (a credential choice, a
// connect card's slugs, a Q&A wizard's answers) are filled in by an
// ApprovalResponder living with that domain — `credential-approval.ts`,
// `stub-mcp-registry.ts`. This module stays payload-agnostic: to cover a new
// card kind, write a responder next to its domain and register it in the
// runner. A scenario can always bypass the lot with `resumeWith`.
// ---------------------------------------------------------------------------

import { isRecord } from '@n8n/utils/is-record';

import type { ConfirmationAnswer, DiscoveryTestCase } from './types';
import type { SuspensionInfo } from '../../src/utils/stream-helpers';

export type ConfirmationPolicy = Map<string, ConfirmationAnswer>;

// Supplies what an approving user would have filled in for one kind of card.
export type ApprovalResponder = (
	payload: Record<string, unknown>,
) => Record<string, unknown> | undefined;

export function buildConfirmationPolicy(scenario: DiscoveryTestCase): ConfirmationPolicy {
	const policy: ConfirmationPolicy = new Map();
	for (const [toolName, answer] of Object.entries(scenario.confirmations ?? {})) {
		policy.set(toolName, typeof answer === 'string' ? { decision: answer } : answer);
	}
	return policy;
}

export function resolveConfirmation(
	suspension: SuspensionInfo | undefined,
	policy: ConfirmationPolicy,
	responders: ApprovalResponder[] = [],
): Record<string, unknown> {
	const answer = policy.get(suspendedToolName(suspension));
	if (answer?.decision === 'deny') return { ...answer.resumeWith, approved: false };

	const payload = suspension?.suspendPayload ?? {};
	for (const responder of responders) {
		const responderAnswer = responder(payload);
		if (responderAnswer) return { ...responderAnswer, ...answer?.resumeWith, approved: true };
	}
	return { ...answer?.resumeWith, approved: true };
}

export function unmatchedConfirmations(
	policy: ConfirmationPolicy,
	suspensions: Iterable<SuspensionInfo>,
): string[] {
	const asked = new Set([...suspensions].map(suspendedToolName));
	return [...policy]
		.filter(
			([tool, answer]) => !asked.has(tool) && (answer.decision === 'deny' || answer.resumeWith),
		)
		.map(([tool]) => tool);
}

function suspendedToolName(suspension: SuspensionInfo | undefined): string {
	if (suspension?.toolName) return suspension.toolName;
	const payload = suspension?.suspendPayload;
	return isRecord(payload) && typeof payload.toolName === 'string' ? payload.toolName : '';
}

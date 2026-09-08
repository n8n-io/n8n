/**
 * Deterministic verdict disclosure.
 *
 * A direct build never calls `report-verification-verdict`, so the loop
 * guidance cannot be the channel that tells the user how strong the claim is.
 * This emits the claim straight from the persisted record, at the point the
 * run hands control back — independent of anything the model wrote.
 *
 * The claim travels as structure, not as rendered text: the event log is
 * append-only, so a persisted sentence could never be reworded or translated
 * afterwards. The client owns the wording.
 */

import type { InstanceAiEvent } from '@n8n/api-types';

import type { VerificationClaim, WorkflowBuildOutcome } from './workflow-loop-state';

export const VERDICT_DISCLOSURE_RESPONSE_PREFIX = 'verdict-disclosure';

/** The slice of a stored work item the disclosure needs. */
export interface VerdictDisclosureRecord {
	state: { workItemId: string };
	lastBuildOutcome?: WorkflowBuildOutcome;
}

interface LatestVerification {
	workItemId: string;
	verifiedAt: string;
	claim: VerificationClaim;
	workflowId?: string;
}

function disclosureResponseId(workItemId: string, verifiedAt: string): string {
	return `${VERDICT_DISCLOSURE_RESPONSE_PREFIX}:${workItemId}:${verifiedAt}`;
}

/**
 * The most recently verified work item that carries a claim. Records without a
 * `verifiedAt` are skipped: it is the disclosure's identity, and without it the
 * same claim could be disclosed on every hand-back.
 */
function latestVerification(
	records: readonly VerdictDisclosureRecord[],
): LatestVerification | undefined {
	let latest: LatestVerification | undefined;
	for (const record of records) {
		const verification = record.lastBuildOutcome?.verification;
		const claim = verification?.claim;
		const verifiedAt = verification?.verifiedAt;
		if (!claim || verifiedAt === undefined) continue;
		if (latest === undefined || verifiedAt > latest.verifiedAt) {
			latest = {
				workItemId: record.state.workItemId,
				verifiedAt,
				claim,
				...(record.lastBuildOutcome?.workflowId
					? { workflowId: record.lastBuildOutcome.workflowId }
					: {}),
			};
		}
	}
	return latest;
}

/**
 * The disclosure event for this thread's latest verification, or undefined when
 * it was fully verified or already disclosed. Keyed on the verification itself,
 * so one run is disclosed exactly once however many times the thread hands
 * control back, and a later re-verification discloses again.
 */
export function buildVerdictDisclosureEvent(args: {
	runId: string;
	agentId: string;
	records: readonly VerdictDisclosureRecord[];
	events: readonly InstanceAiEvent[];
}): InstanceAiEvent | undefined {
	const latest = latestVerification(args.records);
	if (!latest) return undefined;

	// A verified claim needs no disclosure. A verdict on every successful build
	// is noise, and noise teaches people to skip it.
	if (latest.claim.level === 'verified') return undefined;

	const responseId = disclosureResponseId(latest.workItemId, latest.verifiedAt);
	if (args.events.some((event) => event.responseId === responseId)) return undefined;

	return {
		type: 'verification-verdict',
		runId: args.runId,
		agentId: args.agentId,
		responseId,
		payload: {
			claim: latest.claim,
			...(latest.workflowId ? { workflowId: latest.workflowId } : {}),
		},
	};
}

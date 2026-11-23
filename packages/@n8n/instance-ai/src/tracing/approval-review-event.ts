/**
 * Trace-only `approval: review` event. Each event records one decision of Auto
 * mode with its route and its result. A decision of the fixed rules makes no
 * model call, so no other run in the trace shows it.
 */

import { emitTraceOnlyChildRun } from './langsmith-tracing';
import type { ApprovalReviewOutcome } from '../approval-review/approval-review';
import type { PendingApproval } from '../approval-review/pending-approval';
import type { InstanceAiTraceContext } from '../types';

export async function emitApprovalReviewTraceEvent(
	tracing: InstanceAiTraceContext | undefined,
	approval: Pick<PendingApproval, 'toolName' | 'toolCallId'>,
	outcome: ApprovalReviewOutcome,
): Promise<void> {
	const metadata = {
		tool_name: approval.toolName,
		...(approval.toolCallId ? { tool_call_id: approval.toolCallId } : {}),
		approval_route: outcome.route,
		approval_decision: outcome.decision,
		approval_decided_by: outcome.decidedBy,
		approval_judge_failed: outcome.judgeFailed === true,
	};
	try {
		await emitTraceOnlyChildRun(
			tracing,
			{
				name: 'approval: review',
				// 'chain' like the other bookkeeping spans: a tool-typed run reads as a
				// real agent tool call in trace UIs.
				runType: 'chain',
				canonicalName: 'instance-ai.approval.review',
				tags: ['approval-review'],
				metadata,
			},
			{ outputs: { ...metadata, approval_reason: outcome.reason } },
		);
	} catch {
		// Best-effort: tracing must never stop the action or its card.
	}
}

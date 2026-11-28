import { describe, expect, it, vi } from 'vitest';

import type { ApprovalReviewOutcome } from '../../approval-review/approval-review';
import type { InstanceAiTraceContext } from '../../types';
import { emitApprovalReviewTraceEvent } from '../approval-review-event';

function makeTracing(startChildRun = vi.fn(async () => await Promise.resolve({ id: 'run-1' }))) {
	const finishRun = vi.fn(async () => await Promise.resolve());
	const tracing = {
		actorRun: { id: 'actor-run-1' },
		startChildRun,
		finishRun,
	} as unknown as InstanceAiTraceContext;
	return { tracing, startChildRun, finishRun };
}

const approval = { toolName: 'publish_workflow', toolCallId: 'call-1' };

describe('emitApprovalReviewTraceEvent', () => {
	it.each<ApprovalReviewOutcome>([
		{ route: 'always-ask', decision: 'ask', decidedBy: 'rule', reason: 'Always asks.' },
		{ route: 'low-risk', decision: 'approve', decidedBy: 'rule', reason: 'Low risk.' },
		{ route: 'judge', decision: 'approve', decidedBy: 'judge', reason: 'The user asked for it.' },
		{
			route: 'judge',
			decision: 'ask',
			decidedBy: 'judge',
			reason: 'The check did not answer.',
			judgeFailed: true,
		},
	])('records a $route decision of the $decidedBy: $decision', async (outcome) => {
		const { tracing, startChildRun, finishRun } = makeTracing();
		const metadata = {
			tool_name: 'publish_workflow',
			tool_call_id: 'call-1',
			approval_route: outcome.route,
			approval_decision: outcome.decision,
			approval_decided_by: outcome.decidedBy,
			approval_judge_failed: outcome.judgeFailed === true,
		};

		await emitApprovalReviewTraceEvent(tracing, approval, outcome);

		expect(startChildRun.mock.calls[0]).toStrictEqual([
			{ id: 'actor-run-1' },
			{
				name: 'approval: review',
				runType: 'chain',
				canonicalName: 'instance-ai.approval.review',
				tags: ['approval-review'],
				metadata,
			},
		]);
		expect(finishRun.mock.calls[0]).toStrictEqual([
			{ id: 'run-1' },
			{ outputs: { ...metadata, approval_reason: outcome.reason } },
		]);
	});

	it('does not throw when the trace export fails', async () => {
		const { tracing } = makeTracing(vi.fn(async () => await Promise.reject(new Error('down'))));

		await expect(
			emitApprovalReviewTraceEvent(tracing, approval, {
				route: 'low-risk',
				decision: 'approve',
				decidedBy: 'rule',
				reason: 'Low risk.',
			}),
		).resolves.toBeUndefined();
	});
});

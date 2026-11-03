import type {
	BuiltTool,
	InterruptibleToolContext,
	ToolContext,
	ToolSuspendOptions,
} from '@n8n/agents';
import type { InstanceAiAutoApprovalDecider } from '@n8n/api-types';

import { createToolRegistry } from '../tool-registry';
import type { InstanceAiContext, InstanceAiToolRegistry } from '../types';
import { renderApprovalJudgeAction } from './approval-judge';
import { readPendingApproval, routeApproval } from './pending-approval';
import type { ApprovalRoute, PendingApproval } from './pending-approval';
import { runProbe } from './probe-telemetry';

export interface ApprovalJudgeDecision {
	decision: 'approve' | 'ask';
	reason: string;
	/** True when the judge failed or timed out. The decision is then `ask`. */
	failed?: boolean;
}

export interface ApprovalReviewOutcome {
	decision: 'approve' | 'ask';
	decidedBy: InstanceAiAutoApprovalDecider;
	reason: string;
	route: ApprovalRoute;
	judgeFailed?: boolean;
}

/**
 * What the host supplies for Auto mode. When it is absent, every approval
 * shows its card (Manual mode).
 */
export interface InstanceAiApprovalReviewer {
	/** The judge's decision for one pending approval. Resolve `ask` when the judge fails. */
	judge(approval: PendingApproval): Promise<ApprovalJudgeDecision>;
	/** Receives each reviewed approval before the action runs or the card shows. */
	onReviewed(approval: PendingApproval, outcome: ApprovalReviewOutcome): void | Promise<void>;
}

export const ALWAYS_ASK_REASON = 'Auto mode always asks you to confirm this action.';
export const LOW_RISK_REASON = 'Low-risk action that is easy to undo.';
export const TOO_LONG_REASON = 'This call is too long to check automatically, so you confirm it.';
const JUDGE_FAILED_REASON = 'The automatic check did not answer, so you confirm it.';

/** Thrown by the probe `suspend()` so that the tool stops where it asks for approval. */
class SuspendRequested extends Error {}

function isInterruptible(
	ctx: ToolContext | InterruptibleToolContext,
): ctx is InterruptibleToolContext {
	return 'suspend' in ctx && typeof ctx.suspend === 'function';
}

function isFirstCall(ctx: InterruptibleToolContext): boolean {
	return (
		ctx.resumeData === undefined &&
		ctx.cancellation === undefined &&
		ctx.suspendPayload === undefined
	);
}

/**
 * The decision of the fixed rules, or `undefined` when the judge decides.
 * The arguments of an MCP call mean what the server makes of them, so the
 * judge must see all of them: a cut call shows its card.
 */
export function decideByRule(approval: PendingApproval): ApprovalReviewOutcome | undefined {
	const route = routeApproval(approval);
	if (route === 'always-ask') {
		return { decision: 'ask', decidedBy: 'rule', reason: ALWAYS_ASK_REASON, route };
	}
	if (route === 'low-risk') {
		return { decision: 'approve', decidedBy: 'rule', reason: LOW_RISK_REASON, route };
	}
	if (approval.mcp && renderApprovalJudgeAction(approval).cut) {
		return { decision: 'ask', decidedBy: 'rule', reason: TOO_LONG_REASON, route };
	}
	return undefined;
}

async function review(
	approval: PendingApproval,
	reviewer: InstanceAiApprovalReviewer,
): Promise<ApprovalReviewOutcome> {
	const ruled = decideByRule(approval);
	if (ruled) return ruled;
	try {
		const judged = await reviewer.judge(approval);
		return {
			// A failed judge never approves.
			decision: judged.failed ? 'ask' : judged.decision,
			decidedBy: 'judge',
			reason: judged.reason,
			route: 'judge',
			...(judged.failed ? { judgeFailed: true } : {}),
		};
	} catch {
		return {
			decision: 'ask',
			decidedBy: 'judge',
			reason: JUDGE_FAILED_REASON,
			route: 'judge',
			judgeFailed: true,
		};
	}
}

type ApprovalReviewContext = Pick<InstanceAiContext, 'logger' | 'trackTelemetry'> & {
	approvalReviewer: InstanceAiApprovalReviewer;
};

/**
 * Auto mode for one tool. A tool asks for approval by calling `suspend()` and
 * runs the action when it is called again with `{ approved: true }`, so every
 * tool already supports being called twice. The first call runs with a probe
 * `suspend()` that records the request. A plain approval then goes to review.
 * When the review approves, the tool runs again at once with the approval, as
 * if the user had approved the card. In every other case the real `suspend()`
 * shows the card. Telemetry that the probe tracks is sent only when the card
 * shows (see `holdProbeTelemetry`).
 */
function withApprovalReview(tool: BuiltTool, context: ApprovalReviewContext): BuiltTool {
	const { handler } = tool;
	if (!handler || tool.suspendSchema === undefined) return tool;
	const { approvalReviewer: reviewer, logger } = context;

	return {
		...tool,
		async handler(input, ctx) {
			// A resumed call carries a decision already.
			if (!isInterruptible(ctx) || !isFirstCall(ctx)) return await handler.call(tool, input, ctx);

			let requested: { payload: unknown; options?: ToolSuspendOptions } | undefined;
			const probe: InterruptibleToolContext = {
				...ctx,
				suspend: async (payload, options) => {
					requested = { payload, options };
					throw new SuspendRequested();
				},
			};
			const { held, outcome: probeOutcome } = await runProbe(
				async () => await handler.call(tool, input, probe),
			);
			const sendHeldTelemetry = () => {
				for (const [eventName, properties] of held) context.trackTelemetry?.(eventName, properties);
			};
			if (!requested) {
				// No approval was asked for: the probe was the real call.
				sendHeldTelemetry();
				if (!probeOutcome.ok) throw probeOutcome.error;
				return probeOutcome.value;
			}

			const approval = readPendingApproval(tool, input, requested.payload, ctx.toolCallId);
			if (!approval) {
				sendHeldTelemetry();
				return await ctx.suspend(requested.payload, requested.options);
			}

			const outcome = await review(approval, reviewer);
			try {
				await reviewer.onReviewed(approval, outcome);
			} catch (error) {
				logger.warn('Failed to record an approval review', {
					toolName: tool.name,
					error: error instanceof Error ? error.message : String(error),
				});
			}
			if (outcome.decision !== 'approve') {
				sendHeldTelemetry();
				return await ctx.suspend(requested.payload, requested.options);
			}

			ctx.abortSignal?.throwIfAborted();
			return await handler.call(tool, input, {
				...ctx,
				resumeData: { approved: true },
				suspendPayload: requested.payload,
				continuation: requested.options?.continuation,
				resumeSchema: requested.options?.resumeSchema,
				// Session grants of the SDK belong to decisions that a person makes. A tool can
				// still keep its own grant: an approved fetch allows its host for the rest of
				// the run, as "Allow once" does in Manual mode.
				approvalContext: undefined,
			});
		},
	};
}

/**
 * Applies Auto mode to the tools of one run. Without a reviewer in the context,
 * returns the tools unchanged (Manual mode).
 */
export function applyApprovalReview(
	tools: InstanceAiToolRegistry,
	context: Pick<InstanceAiContext, 'approvalReviewer' | 'logger' | 'trackTelemetry'>,
): InstanceAiToolRegistry {
	const { approvalReviewer } = context;
	if (!approvalReviewer) return tools;
	const reviewed = createToolRegistry();
	for (const [name, tool] of tools) {
		reviewed.set(name, withApprovalReview(tool, { ...context, approvalReviewer }));
	}
	return reviewed;
}

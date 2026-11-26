import type { BuiltTelemetry, FetchFn, Telemetry as AgentTelemetry, TokenUsage } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	conversationForApprovalJudge,
	emitApprovalReviewTraceEvent,
	judgeApproval,
	modelConfigId,
	modelIdTraceMetadata,
	orchestratorAgentId,
	tokenUsageToBuilderUsageItems,
	type ApprovalJudgeMessage,
	type ApprovalJudgeResult,
	type ApprovalReviewOutcome,
	type InstanceAiApprovalReviewer,
	type InstanceAiEventBus,
	type InstanceAiTraceContext,
	type ModelConfig,
	type PendingApproval,
} from '@n8n/instance-ai';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { raceAbort } from '@n8n/utils/race-abort';

import { TelemetryProxy } from '@n8n/backend-services';

import { InstanceAiCreditService } from '../instance-ai-credit.service';
import { cleanStoredUserMessage } from '../internal-messages';
import type { AssistantTurnMemory } from '../turn-setup/assistant-turn-runtime';

/**
 * How far back the judge reads. The judge sees the user's messages of the older part,
 * so a limit that the user set early stays in view. Each review that goes to the judge
 * reads these messages again.
 */
const CONVERSATION_MESSAGE_LIMIT = 200;

/** A review slower than this shows the card. It covers the judge model, the thread read and the judge call. */
const APPROVAL_REVIEW_TIMEOUT_MS = 10_000;

export interface ApprovalReviewerParams {
	user: User;
	threadId: string;
	runId: string;
	/** The memory resource that owns the thread. */
	resourceId: string;
	abortSignal: AbortSignal;
	memory: Pick<AssistantTurnMemory, 'getMessages'>;
	eventBus: InstanceAiEventBus;
	/** Resolves the judge model. Called on the first review of the run only. */
	resolveJudgeModel: () => Promise<ModelConfig>;
	modelFetch?: FetchFn;
	/** Tag outgoing judge requests with `x-n8n-function-id` when request labels are enabled. */
	requestLabels?: boolean;
	/**
	 * The trace of the run, read at each review: the host attaches it after the
	 * reviewer is built, and a resumed run has a new one.
	 */
	getTracing?: () => InstanceAiTraceContext | undefined;
	/** Defaults to `APPROVAL_REVIEW_TIMEOUT_MS`. */
	reviewTimeoutMs?: number;
}

/** What telemetry reports about one review that went to the judge. */
interface JudgeReview {
	startedAt: number;
	/** Known once the judge model resolves, also when the judge fails later. */
	model?: string;
	judgeRun?: ApprovalJudgeResult;
}

/** Builds the Auto mode reviewer of one Assistant run. */
@Service()
export class InstanceAiApprovalReviewerFactory {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly creditService: InstanceAiCreditService,
		private readonly telemetry: TelemetryProxy,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	create(params: ApprovalReviewerParams): InstanceAiApprovalReviewer {
		let judgeModel: Promise<ModelConfig> | undefined;
		const judgeReviews = new WeakMap<PendingApproval, JudgeReview>();

		return {
			judge: async (approval) => {
				const review: JudgeReview = { startedAt: Date.now() };
				judgeReviews.set(approval, review);
				const signal = AbortSignal.any([
					params.abortSignal,
					AbortSignal.timeout(params.reviewTimeoutMs ?? APPROVAL_REVIEW_TIMEOUT_MS),
				]);
				const stopped = () =>
					new Error(
						params.abortSignal.aborted ? 'The run was stopped' : 'The approval review timed out',
					);
				const fail = (error: string): never => {
					this.logger.warn('Approval judge failed, showing the approval card', {
						threadId: params.threadId,
						runId: params.runId,
						toolName: approval.toolName,
						error,
					});
					throw new Error(error);
				};

				let model: ModelConfig;
				let conversation: ApprovalJudgeMessage[];
				let olderMessagesLeftOut = false;
				let telemetry: AgentTelemetry | BuiltTelemetry | undefined;
				try {
					judgeModel ??= params.resolveJudgeModel();
					model = await raceAbort(judgeModel, signal, stopped);
					review.model = modelConfigId(model);
					const messages = await raceAbort(
						params.memory.getMessages(params.threadId, {
							limit: CONVERSATION_MESSAGE_LIMIT,
							resourceId: params.resourceId,
						}),
						signal,
						stopped,
					);
					// The judge reads the user's own words, not the blocks that the host adds.
					conversation = conversationForApprovalJudge(messages, {
						cleanUserText: cleanStoredUserMessage,
					});
					olderMessagesLeftOut = messages.length >= CONVERSATION_MESSAGE_LIMIT;
					telemetry = params.getTracing?.()?.getTelemetry?.({
						agentRole: 'approval-judge',
						functionId: 'instance-ai.approval-judge',
						metadata: modelIdTraceMetadata(model),
					});
				} catch (error) {
					return fail(getErrorMessage(error));
				}

				const result = await judgeApproval(
					{ conversation, approval, olderMessagesLeftOut },
					{
						model,
						modelFetch: params.modelFetch,
						requestLabels: params.requestLabels,
						abortSignal: signal,
						telemetry,
					},
				);
				review.judgeRun = result;
				const modelName = result.model ?? modelConfigId(model);
				if (modelName) this.claimJudgeUsage(params, approval, modelName, result.usage);
				if (!result.ok) return fail(result.error);
				return { decision: result.verdict.decision, reason: result.verdict.reason };
			},

			onReviewed: async (approval, outcome) => {
				if (outcome.decision === 'approve' && approval.toolCallId) {
					params.eventBus.publish(params.threadId, {
						type: 'auto-approval',
						runId: params.runId,
						agentId: orchestratorAgentId(params.runId),
						payload: {
							toolCallId: approval.toolCallId,
							message: approval.message,
							reason: outcome.reason,
							decidedBy: outcome.decidedBy,
						},
					});
				}
				this.trackReview(params, approval, outcome, judgeReviews.get(approval));
				// A decision of the fixed rules makes no model call, so the trace shows it only here.
				await emitApprovalReviewTraceEvent(params.getTracing?.(), approval, outcome);
			},
		};
	}

	/** Judge calls are paid from the user's credits, like the run's own model calls. */
	private claimJudgeUsage(
		params: ApprovalReviewerParams,
		approval: PendingApproval,
		model: string,
		usage: TokenUsage | undefined,
	): void {
		if (!usage) return;
		const items = tokenUsageToBuilderUsageItems(model, usage);
		if (items.length === 0) return;
		const dedupeId = `${params.runId}:approval-judge:${approval.toolCallId ?? approval.toolName}`;
		// Billing must not delay the action that the judge approved.
		void this.creditService
			.claimRunUsage(params.user, params.threadId, dedupeId, items, 'completed')
			.catch((error: unknown) => {
				this.logger.warn('Failed to claim approval judge usage', {
					threadId: params.threadId,
					runId: params.runId,
					error: getErrorMessage(error),
				});
			});
	}

	private trackReview(
		params: ApprovalReviewerParams,
		approval: PendingApproval,
		outcome: ApprovalReviewOutcome,
		review: JudgeReview | undefined,
	): void {
		const judgeRun = review?.judgeRun;
		const judgeModel = judgeRun?.model ?? review?.model;
		this.telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.APPROVAL_DECIDED_IN_AUTO_MODE, {
			user_id: params.user.id,
			thread_id: params.threadId,
			run_id: params.runId,
			...(approval.toolCallId ? { tool_call_id: approval.toolCallId } : {}),
			tool_name: approval.toolName,
			is_mcp_tool: approval.mcp !== undefined,
			severity: approval.severity,
			route: outcome.route,
			decision: outcome.decision,
			decided_by: outcome.decidedBy,
			judge_failed: outcome.judgeFailed === true,
			...(judgeRun ? { judge_duration_ms: judgeRun.durationMs } : {}),
			// The review ends when this runs, so the duration includes model setup and the thread read.
			...(review ? { review_duration_ms: Date.now() - review.startedAt } : {}),
			...(judgeModel ? { judge_model: judgeModel } : {}),
		});
	}
}

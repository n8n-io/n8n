import type { FetchFn, TokenUsage } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	conversationForApprovalJudge,
	judgeApproval,
	modelConfigId,
	orchestratorAgentId,
	tokenUsageToBuilderUsageItems,
	type ApprovalJudgeMessage,
	type ApprovalJudgeResult,
	type ApprovalReviewOutcome,
	type InstanceAiApprovalReviewer,
	type InstanceAiEventBus,
	type ModelConfig,
	type PendingApproval,
} from '@n8n/instance-ai';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { raceAbort } from '@n8n/utils/race-abort';

import { Telemetry } from '@/telemetry';

import { InstanceAiCreditService } from '../instance-ai-credit.service';
import { cleanStoredUserMessage } from '../internal-messages';
import type { AssistantTurnMemory } from '../turn-setup/assistant-turn-runtime';

/** The judge reads the recent part of the thread. Older turns rarely decide an approval. */
const CONVERSATION_MESSAGE_LIMIT = 30;

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
	/** Defaults to `APPROVAL_REVIEW_TIMEOUT_MS`. */
	reviewTimeoutMs?: number;
}

/** Builds the Auto mode reviewer of one Assistant run. */
@Service()
export class InstanceAiApprovalReviewerFactory {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly creditService: InstanceAiCreditService,
		private readonly telemetry: Telemetry,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	create(params: ApprovalReviewerParams): InstanceAiApprovalReviewer {
		let judgeModel: Promise<ModelConfig> | undefined;
		const judgeRuns = new WeakMap<PendingApproval, ApprovalJudgeResult>();

		return {
			judge: async (approval) => {
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
				try {
					judgeModel ??= params.resolveJudgeModel();
					model = await raceAbort(judgeModel, signal, stopped);
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
				} catch (error) {
					return fail(getErrorMessage(error));
				}

				const result = await judgeApproval(
					{ conversation, approval, olderMessagesLeftOut },
					{ model, modelFetch: params.modelFetch, abortSignal: signal },
				);
				judgeRuns.set(approval, result);
				const modelName = result.model ?? modelConfigId(model);
				if (modelName) this.claimJudgeUsage(params, approval, modelName, result.usage);
				if (!result.ok) return fail(result.error);
				return { decision: result.verdict.decision, reason: result.verdict.reason };
			},

			onReviewed: (approval, outcome) => {
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
				this.trackReview(params, approval, outcome, judgeRuns.get(approval));
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
		judgeRun: ApprovalJudgeResult | undefined,
	): void {
		this.telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.APPROVAL_DECIDED_IN_AUTO_MODE, {
			user_id: params.user.id,
			thread_id: params.threadId,
			run_id: params.runId,
			tool_name: approval.toolName,
			is_mcp_tool: approval.mcp !== undefined,
			severity: approval.severity,
			route: outcome.route,
			decision: outcome.decision,
			decided_by: outcome.decidedBy,
			judge_failed: outcome.judgeFailed === true,
			...(judgeRun ? { judge_duration_ms: judgeRun.durationMs } : {}),
			...(judgeRun?.ok && judgeRun.model ? { judge_model: judgeRun.model } : {}),
		});
	}
}

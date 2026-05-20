import {
	DEFAULT_AGENT_REVIEW_REJECTION_REASON,
	type AgentDebugInsight,
	type AgentDebugInsightsResponse,
	type AgentDebugRun,
	type AgentDebugRunDetail,
	type AgentDebugRunsResponse,
	type AgentDebugSignal,
	type AgentDebugSignalType,
	type AgentReviewCase,
	type AgentReviewCasesResponse,
	type UpsertAgentReviewCaseDto,
} from '@n8n/api-types';
import { Service } from '@n8n/di';

import type { AgentEvaluationCase } from './entities/agent-evaluation-case.entity';
import type { AgentExecution } from './entities/agent-execution.entity';
import type { AgentExecutionThread } from './entities/agent-execution-thread.entity';
import type { TimelineEvent } from './execution-recorder';
import { AgentEvaluationCaseRepository } from './repositories/agent-evaluation-case.repository';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';
import { AgentRepository } from './repositories/agent.repository';
import { getAgentCurrentVersionId } from './utils/agent-version.utils';

const DEFAULT_RUNS_LIMIT = 20;
const MAX_RUNS_LIMIT = 100;
const DEFAULT_REVIEW_CASES_LIMIT = 20;
const MAX_REVIEW_CASES_LIMIT = 100;
const INSIGHTS_RUN_LIMIT = 200;
const SLOW_RUN_MS = 30_000;
const HIGH_COST_USD = 0.1;
const HIGH_TOKEN_COUNT = 10_000;
const AGENT_EXECUTION_DEBUG_COLUMNS = [
	'execution.id',
	'execution.threadId',
	'execution.status',
	'execution.startedAt',
	'execution.stoppedAt',
	'execution.duration',
	'execution.userMessage',
	'execution.assistantResponse',
	'execution.model',
	'execution.promptTokens',
	'execution.completionTokens',
	'execution.totalTokens',
	'execution.cost',
	'execution.toolCalls',
	'execution.timeline',
	'execution.error',
	'execution.hitlStatus',
	'execution.source',
	'execution.createdAt',
	'execution.updatedAt',
];
const AGENT_EXECUTION_THREAD_DEBUG_COLUMNS = ['thread.id', 'thread.sessionNumber', 'thread.title'];

type AgentExecutionWithThread = AgentExecution & { thread: AgentExecutionThread };
type ToolCallTimelineEvent = Extract<TimelineEvent, { type: 'tool-call' }>;

function toIsoString(date: Date | null): string | null {
	return date?.toISOString() ?? null;
}

function isEmptyOutput(output: unknown): boolean {
	if (output === null || output === undefined) return true;
	if (typeof output === 'string') return output.trim().length === 0;
	if (Array.isArray(output)) return output.length === 0;
	if (typeof output === 'object') return Object.keys(output).length === 0;
	return false;
}

function toolCallEvents(execution: Pick<AgentExecution, 'timeline'>): ToolCallTimelineEvent[] {
	return (execution.timeline ?? []).filter((event): event is ToolCallTimelineEvent => {
		return event.type === 'tool-call';
	});
}

function signal(
	type: AgentDebugSignalType,
	severity: AgentDebugSignal['severity'],
	label: string,
	description: string,
	count = 1,
): AgentDebugSignal {
	return { type, severity, label, description, count };
}

export function computeAgentDebugSignals(
	execution: Pick<
		AgentExecution,
		| 'status'
		| 'duration'
		| 'cost'
		| 'totalTokens'
		| 'timeline'
		| 'toolCalls'
		| 'hitlStatus'
		| 'assistantResponse'
		| 'error'
	>,
): AgentDebugSignal[] {
	const signals: AgentDebugSignal[] = [];

	if (execution.status === 'error') {
		signals.push(
			signal(
				'failed_run',
				'error',
				'Failed run',
				execution.error?.trim() || 'The agent run ended with an error.',
			),
		);
	}

	if (execution.duration >= SLOW_RUN_MS) {
		signals.push(
			signal(
				'slow_run',
				'warning',
				'Slow run',
				`The run took ${(execution.duration / 1000).toFixed(1)}s to complete.`,
			),
		);
	}

	const totalTokens = execution.totalTokens ?? 0;
	const cost = execution.cost ?? 0;
	if (cost >= HIGH_COST_USD || totalTokens >= HIGH_TOKEN_COUNT) {
		signals.push(
			signal(
				'high_cost',
				'warning',
				'High cost',
				'The run used more tokens or estimated cost than the debug threshold.',
			),
		);
	}

	const timelineToolCalls = toolCallEvents(execution);
	const failedToolCalls = timelineToolCalls.filter((event) => !event.success);
	if (failedToolCalls.length > 0) {
		signals.push(
			signal(
				'tool_failure',
				'error',
				'Tool failure',
				'One or more tools failed during the run.',
				failedToolCalls.length,
			),
		);
	}

	const emptyTimelineOutputs = timelineToolCalls.filter(
		(event) => event.success && isEmptyOutput(event.output),
	);
	const emptyRecordedOutputs =
		timelineToolCalls.length === 0
			? (execution.toolCalls ?? []).filter((toolCall) => isEmptyOutput(toolCall.output))
			: [];
	const emptyToolOutputCount = emptyTimelineOutputs.length + emptyRecordedOutputs.length;
	if (emptyToolOutputCount > 0) {
		signals.push(
			signal(
				'empty_tool_output',
				'info',
				'Empty tool output',
				'One or more tools returned no output.',
				emptyToolOutputCount,
			),
		);
	}

	const hasSuspension = execution.hitlStatus === 'suspended' || execution.hitlStatus === 'resumed';
	if (hasSuspension || (execution.timeline ?? []).some((event) => event.type === 'suspension')) {
		signals.push(
			signal(
				'human_input_required',
				'info',
				'Human input required',
				'The run paused or resumed around a human-in-the-loop tool call.',
			),
		);
	}

	if (execution.status === 'success' && execution.assistantResponse.trim().length === 0) {
		signals.push(
			signal(
				'empty_response',
				'warning',
				'Empty response',
				'The run succeeded but did not record an assistant response.',
			),
		);
	}

	return signals;
}

@Service()
export class AgentDebugService {
	constructor(
		private readonly agentExecutionRepository: AgentExecutionRepository,
		private readonly agentEvaluationCaseRepository: AgentEvaluationCaseRepository,
		private readonly agentRepository: AgentRepository,
	) {}

	async listRuns(
		projectId: string,
		agentId: string,
		limit = DEFAULT_RUNS_LIMIT,
		cursor?: string,
	): Promise<AgentDebugRunsResponse> {
		const agentVersionId = await this.getCurrentAgentVersionId(projectId, agentId);
		if (!agentVersionId) return { runs: [], nextCursor: null };

		const pageSize = Math.min(Math.max(limit, 1), MAX_RUNS_LIMIT);
		const executions = await this.findRuns(projectId, agentId, pageSize + 1, cursor);
		const hasMore = executions.length > pageSize;
		if (hasMore) executions.pop();
		const reviewsByExecutionId = await this.findReviewsByExecutionIds(
			executions.map((execution) => execution.id),
			agentVersionId,
		);

		return {
			runs: executions.map((execution) =>
				this.toRunDto(execution, reviewsByExecutionId.get(execution.id) ?? null),
			),
			nextCursor: hasMore ? toIsoString(executions[executions.length - 1].createdAt) : null,
		};
	}

	async getRunDetail(
		projectId: string,
		agentId: string,
		executionId: string,
	): Promise<AgentDebugRunDetail | null> {
		const execution = await this.findRun(projectId, agentId, executionId);

		if (!execution) return null;
		const agentVersionId = await this.getCurrentAgentVersionId(projectId, agentId);
		if (!agentVersionId) return null;

		const review = await this.agentEvaluationCaseRepository.findByExecutionIdAndVersion(
			projectId,
			agentId,
			executionId,
			agentVersionId,
		);

		return {
			...this.toRunDto(execution, review),
			toolCalls: execution.toolCalls,
			timeline: execution.timeline,
			workingMemory: null,
		};
	}

	async listReviewCases(
		projectId: string,
		agentId: string,
		limit = DEFAULT_REVIEW_CASES_LIMIT,
		cursor?: string,
	): Promise<AgentReviewCasesResponse> {
		const agentVersionId = await this.getCurrentAgentVersionId(projectId, agentId);
		if (!agentVersionId) {
			return { cases: [], summary: { total: 0, approved: 0, rejected: 0 }, nextCursor: null };
		}

		const pageSize = Math.min(Math.max(limit, 1), MAX_REVIEW_CASES_LIMIT);
		const [reviews, summary] = await Promise.all([
			this.agentEvaluationCaseRepository.findByAgent(
				projectId,
				agentId,
				agentVersionId,
				pageSize + 1,
				cursor,
			),
			this.agentEvaluationCaseRepository.countByStatus(projectId, agentId, agentVersionId),
		]);
		const hasMore = reviews.length > pageSize;
		if (hasMore) reviews.pop();

		return {
			cases: reviews.map((review) => this.toReviewDto(review)),
			summary,
			nextCursor: hasMore ? reviews[reviews.length - 1].updatedAt.toISOString() : null,
		};
	}

	async upsertRunReview(
		projectId: string,
		agentId: string,
		executionId: string,
		payload: UpsertAgentReviewCaseDto,
		userId: string,
	): Promise<AgentReviewCase | null> {
		const execution = await this.findRun(projectId, agentId, executionId);
		if (!execution) return null;
		const agentVersionId = await this.getCurrentAgentVersionId(projectId, agentId);
		if (!agentVersionId) return null;

		const existing = await this.agentEvaluationCaseRepository.findByExecutionId(
			projectId,
			agentId,
			executionId,
		);
		const review =
			existing ??
			this.agentEvaluationCaseRepository.create({
				projectId,
				agentId,
				agentVersionId,
				executionId,
				input: execution.userMessage,
				createdById: userId,
			});

		review.status = payload.status;
		review.agentVersionId = agentVersionId;
		review.rejectionReason =
			payload.status === 'rejected'
				? (payload.rejectionReason ?? DEFAULT_AGENT_REVIEW_REJECTION_REASON)
				: null;
		review.input = execution.userMessage;
		review.expectedOutput = payload.expectedOutput ?? execution.assistantResponse;
		review.actualOutput = execution.assistantResponse;
		review.notes = payload.notes?.trim() || null;
		review.updatedById = userId;

		const savedReview = await this.agentEvaluationCaseRepository.save(review);
		return this.toReviewDto(savedReview);
	}

	async deleteRunReview(projectId: string, agentId: string, executionId: string): Promise<boolean> {
		const execution = await this.findRun(projectId, agentId, executionId);
		if (!execution) return false;
		const agentVersionId = await this.getCurrentAgentVersionId(projectId, agentId);
		if (!agentVersionId) return false;

		await this.agentEvaluationCaseRepository.deleteByExecutionId(
			projectId,
			agentId,
			executionId,
			agentVersionId,
		);
		return true;
	}

	async getInsights(projectId: string, agentId: string): Promise<AgentDebugInsightsResponse> {
		const executions = await this.findRuns(projectId, agentId, INSIGHTS_RUN_LIMIT);
		const signalCounts = new Map<AgentDebugSignalType, AgentDebugInsight>();
		let totalSignals = 0;
		let totalDuration = 0;
		let totalCost = 0;
		let errorCount = 0;

		for (const execution of executions) {
			totalDuration += execution.duration;
			totalCost += execution.cost ?? 0;
			if (execution.status === 'error') errorCount++;

			for (const currentSignal of computeAgentDebugSignals(execution)) {
				totalSignals += currentSignal.count;
				const existing = signalCounts.get(currentSignal.type);
				if (existing) {
					existing.count += currentSignal.count;
					continue;
				}

				signalCounts.set(currentSignal.type, {
					type: currentSignal.type,
					severity: currentSignal.severity,
					label: currentSignal.label,
					description: currentSignal.description,
					count: currentSignal.count,
					latestRunId: execution.id,
				});
			}
		}

		const totalRuns = executions.length;

		return {
			totalRuns,
			totalSignals,
			errorRate: totalRuns === 0 ? 0 : errorCount / totalRuns,
			averageDuration: totalRuns === 0 ? 0 : Math.round(totalDuration / totalRuns),
			totalCost,
			insights: Array.from(signalCounts.values()).sort((a, b) => b.count - a.count),
		};
	}

	private async findRuns(
		projectId: string,
		agentId: string,
		limit: number,
		cursor?: string,
	): Promise<AgentExecutionWithThread[]> {
		const query = this.agentExecutionRepository
			.createQueryBuilder('execution')
			.innerJoinAndSelect(
				'execution.thread',
				'thread',
				'thread.projectId = :projectId AND thread.agentId = :agentId',
				{ projectId, agentId },
			)
			.select(AGENT_EXECUTION_DEBUG_COLUMNS)
			.addSelect(AGENT_EXECUTION_THREAD_DEBUG_COLUMNS)
			.orderBy('execution.createdAt', 'DESC')
			.take(limit);

		if (cursor) {
			query.andWhere('execution.createdAt < :cursor', { cursor: new Date(cursor) });
		}

		return await query.getMany();
	}

	private async findRun(
		projectId: string,
		agentId: string,
		executionId: string,
	): Promise<AgentExecutionWithThread | null> {
		return await this.agentExecutionRepository
			.createQueryBuilder('execution')
			.innerJoinAndSelect(
				'execution.thread',
				'thread',
				'thread.projectId = :projectId AND thread.agentId = :agentId',
				{ projectId, agentId },
			)
			.select(AGENT_EXECUTION_DEBUG_COLUMNS)
			.addSelect(AGENT_EXECUTION_THREAD_DEBUG_COLUMNS)
			.where('execution.id = :executionId', { executionId })
			.getOne();
	}

	private async findReviewsByExecutionIds(
		executionIds: string[],
		agentVersionId: string,
	): Promise<Map<string, AgentEvaluationCase>> {
		const reviews = await this.agentEvaluationCaseRepository.findByExecutionIds(
			executionIds,
			agentVersionId,
		);
		return new Map(reviews.map((review) => [review.executionId, review]));
	}

	private async getCurrentAgentVersionId(
		projectId: string,
		agentId: string,
	): Promise<string | null> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) return null;
		return getAgentCurrentVersionId(agent);
	}

	private toRunDto(
		execution: AgentExecutionWithThread,
		review: AgentEvaluationCase | null,
	): AgentDebugRun {
		return {
			id: execution.id,
			threadId: execution.threadId,
			sessionNumber: execution.thread.sessionNumber,
			sessionTitle: execution.thread.title,
			status: execution.status,
			createdAt: execution.createdAt.toISOString(),
			startedAt: toIsoString(execution.startedAt),
			stoppedAt: toIsoString(execution.stoppedAt),
			duration: execution.duration,
			userMessage: execution.userMessage,
			assistantResponse: execution.assistantResponse,
			model: execution.model,
			promptTokens: execution.promptTokens,
			completionTokens: execution.completionTokens,
			totalTokens: execution.totalTokens,
			cost: execution.cost,
			error: execution.error,
			hitlStatus: execution.hitlStatus,
			source: execution.source,
			signals: computeAgentDebugSignals(execution),
			review: review ? this.toReviewDto(review) : null,
		};
	}

	private toReviewDto(review: AgentEvaluationCase): AgentReviewCase {
		return {
			id: review.id,
			projectId: review.projectId,
			agentId: review.agentId,
			agentVersionId: review.agentVersionId,
			executionId: review.executionId,
			status: review.status,
			rejectionReason: review.rejectionReason,
			input: review.input,
			expectedOutput: review.expectedOutput,
			actualOutput: review.actualOutput,
			notes: review.notes,
			createdById: review.createdById,
			updatedById: review.updatedById,
			createdAt: review.createdAt.toISOString(),
			updatedAt: review.updatedAt.toISOString(),
		};
	}
}

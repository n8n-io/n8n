import type {
	AgentEvaluationDatasetReadiness,
	AgentEvaluationDatasetResponse,
	AgentEvaluationMetricSuggestion,
	AgentEvaluationRunCaseResult,
	AgentEvaluationRunMetricResult,
	AgentEvaluationRunSummary,
	AgentEvaluationSuiteDraft,
	AgentEvaluationSuiteRun,
	AgentEvaluationSuiteRunRequest,
	AgentEvaluationSuiteRunResponse,
	AgentEvaluationSuiteSetupResponse,
	AgentEvaluationVersionSummary,
	AgentReviewCase,
	AgentReviewSummary,
} from '@n8n/api-types';
import { AGENT_EVALUATION_MIN_REVIEWED_CASES } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { randomUUID } from 'crypto';

import {
	AgentsService,
	type AgentEvaluationConversationMessage,
	type AgentEvaluationToolMock,
} from './agents.service';
import type { AgentEvaluationCase } from './entities/agent-evaluation-case.entity';
import type { AgentEvaluationRun } from './entities/agent-evaluation-run.entity';
import type { AgentExecution } from './entities/agent-execution.entity';
import type { TimelineEvent } from './execution-recorder';
import { AgentEvaluationCaseRepository } from './repositories/agent-evaluation-case.repository';
import { AgentEvaluationRunRepository } from './repositories/agent-evaluation-run.repository';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';
import { AgentRepository } from './repositories/agent.repository';
import { getAgentCurrentVersionId } from './utils/agent-version.utils';

const DATASET_PREVIEW_LIMIT = 10;
const RECENT_RUNS_LIMIT = 20;
const SUITE_CASE_LIMIT = 100;
const FIRST_RUN_CASE_LIMIT = AGENT_EVALUATION_MIN_REVIEWED_CASES;
const SIMILARITY_PASS_THRESHOLD = 0.65;
const ANSWER_CORRECTNESS_METRIC_ID = 'answer-correctness';
const CALLED_TOOLS_METRIC_ID = 'called-tools-unordered';

interface AgentEvaluationVersionContext {
	currentAgentVersionId: string;
	selectedAgentVersionId: string;
	selectedVersionCanRun: boolean;
	versions: AgentEvaluationVersionSummary[];
}

interface ExpectedToolCall {
	id: string;
	name: string;
}

@Service()
export class AgentEvaluationsService {
	constructor(
		private readonly agentEvaluationCaseRepository: AgentEvaluationCaseRepository,
		private readonly agentEvaluationRunRepository: AgentEvaluationRunRepository,
		private readonly agentExecutionRepository: AgentExecutionRepository,
		private readonly agentsService: AgentsService,
		private readonly agentRepository: AgentRepository,
	) {}

	async getDataset(
		projectId: string,
		agentId: string,
		agentVersionId?: string,
	): Promise<AgentEvaluationDatasetResponse> {
		const summary = await this.agentEvaluationCaseRepository.countByStatus(projectId, agentId);
		const versionContext = await this.resolveVersionContext(
			projectId,
			agentId,
			summary,
			agentVersionId,
		);
		if (!versionContext) return this.emptyDatasetResponse();

		const [cases, recentRuns] = await Promise.all([
			this.agentEvaluationCaseRepository.findByAgent(projectId, agentId, DATASET_PREVIEW_LIMIT),
			this.agentEvaluationRunRepository.findRecentByAgent(projectId, agentId, RECENT_RUNS_LIMIT),
		]);

		return {
			currentAgentVersionId: versionContext.currentAgentVersionId,
			versions: versionContext.versions,
			recentRuns: recentRuns.map((run) => this.toRunDto(run)),
			cases: cases.map((evaluationCase) => this.toReviewDto(evaluationCase)),
			summary,
			nextCursor: null,
			readiness: this.toReadiness(summary, versionContext),
		};
	}

	async setupSuite(
		projectId: string,
		agentId: string,
		_agentVersionId?: string,
	): Promise<AgentEvaluationSuiteSetupResponse> {
		const summary = await this.agentEvaluationCaseRepository.countByStatus(projectId, agentId);
		const versionContext = await this.resolveVersionContext(projectId, agentId, summary);
		if (!versionContext) return this.emptySuiteSetupResponse();

		const cases = await this.agentEvaluationCaseRepository.findByAgent(
			projectId,
			agentId,
			SUITE_CASE_LIMIT,
		);
		const readiness = this.toReadiness(summary, versionContext);

		if (!readiness.isReady) {
			return {
				currentAgentVersionId: versionContext.currentAgentVersionId,
				versions: versionContext.versions,
				readiness,
				suite: null,
			};
		}

		return {
			currentAgentVersionId: versionContext.currentAgentVersionId,
			versions: versionContext.versions,
			readiness,
			suite: this.toSuiteDraft(agentId, versionContext.selectedAgentVersionId, summary, cases),
		};
	}

	async runSuite(
		projectId: string,
		agentId: string,
		userId: string,
		options: AgentEvaluationSuiteRunRequest = {},
	): Promise<AgentEvaluationSuiteRunResponse> {
		const summary = await this.agentEvaluationCaseRepository.countByStatus(projectId, agentId);
		const versionContext = await this.resolveVersionContext(projectId, agentId, summary);
		if (!versionContext) return this.emptySuiteRunResponse();

		const cases = await this.agentEvaluationCaseRepository.findByAgent(
			projectId,
			agentId,
			FIRST_RUN_CASE_LIMIT,
		);
		const readiness = this.toReadiness(summary, versionContext);

		if (!readiness.isReady || !readiness.agentVersionCanRun) {
			return {
				currentAgentVersionId: versionContext.currentAgentVersionId,
				versions: versionContext.versions,
				readiness,
				run: null,
			};
		}

		const startedAt = new Date();
		const warnings = new Set<string>();
		const executionsById = await this.findExecutionsById(
			projectId,
			agentId,
			cases.map((evaluationCase) => evaluationCase.executionId),
		);
		const results: AgentEvaluationRunCaseResult[] = [];
		const metrics = this.selectMetrics(options.enabledMetricIds);

		for (const evaluationCase of cases) {
			const execution = executionsById.get(evaluationCase.executionId) ?? null;
			if (!execution) {
				warnings.add('Some reviewed cases no longer have recorded run data.');
			}

			const toolMocks = execution ? this.toToolMocks(execution) : [];
			const conversationHistory = execution
				? this.toConversationHistory(
						await this.findConversationHistoryBefore(projectId, agentId, execution),
					)
				: [];
			try {
				const executionResult = await this.agentsService.executeEvaluationCase({
					agentId,
					agentVersionId: versionContext.selectedAgentVersionId,
					projectId,
					userId,
					message: evaluationCase.input,
					conversationHistory,
					toolMocks,
				});
				for (const warning of executionResult.warnings) warnings.add(warning);
				if (executionResult.missingToolMocks.length > 0) {
					warnings.add('Some tool calls did not have recorded outputs.');
				}

				const expectedToolNames = execution
					? this.toExpectedToolNames(execution, evaluationCase)
					: [];
				const actualToolNames = executionResult.toolCalls.map((toolCall) => toolCall.name);
				const metricResults = metrics.map((metric) =>
					this.scoreMetric(
						metric,
						evaluationCase,
						executionResult.output,
						executionResult.error,
						expectedToolNames,
						actualToolNames,
					),
				);
				const status =
					executionResult.error !== null
						? 'error'
						: metricResults.every((metric) => metric.pass)
							? 'passed'
							: 'failed';

				results.push({
					caseId: evaluationCase.id,
					input: evaluationCase.input,
					expectedOutput: evaluationCase.expectedOutput,
					output: executionResult.output,
					status,
					durationMs: executionResult.durationMs,
					error: executionResult.error,
					metrics: metricResults,
					toolCalls: executionResult.toolCalls.map((toolCall) => ({
						name: toolCall.name,
						input: toolCall.input,
						output: toolCall.output,
						mocked: !executionResult.missingToolMocks.includes(toolCall.name),
						missingMock: executionResult.missingToolMocks.includes(toolCall.name),
					})),
					missingToolMocks: executionResult.missingToolMocks,
				});
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				results.push({
					caseId: evaluationCase.id,
					input: evaluationCase.input,
					expectedOutput: evaluationCase.expectedOutput,
					output: '',
					status: 'error',
					durationMs: 0,
					error: message,
					metrics: metrics.map((metric) => ({
						id: metric.id,
						name: metric.name,
						score: 0,
						pass: false,
						reason: 'The evaluation case could not run.',
					})),
					toolCalls: [],
					missingToolMocks: [],
				});
			}
		}

		const completedAt = new Date();
		const run: AgentEvaluationSuiteRun = {
			id: randomUUID(),
			suiteId: this.toSuiteId(agentId),
			agentVersionId: versionContext.selectedAgentVersionId,
			startedAt: startedAt.toISOString(),
			completedAt: completedAt.toISOString(),
			summary: this.toRunSummary(results),
			cases: results,
			warnings: [...warnings],
		};
		await this.agentEvaluationRunRepository.saveRun(projectId, agentId, userId, run);

		return {
			currentAgentVersionId: versionContext.currentAgentVersionId,
			versions: versionContext.versions,
			readiness,
			run,
		};
	}

	private emptySummary(): AgentReviewSummary {
		return { total: 0, approved: 0, rejected: 0 };
	}

	private emptyReadiness(): AgentEvaluationDatasetReadiness {
		return {
			isReady: false,
			agentVersionId: '',
			agentVersionCanRun: false,
			minimumReviewedCases: AGENT_EVALUATION_MIN_REVIEWED_CASES,
			reviewedCases: 0,
			remainingCases: AGENT_EVALUATION_MIN_REVIEWED_CASES,
		};
	}

	private emptyDatasetResponse(): AgentEvaluationDatasetResponse {
		return {
			currentAgentVersionId: '',
			versions: [],
			recentRuns: [],
			cases: [],
			summary: this.emptySummary(),
			nextCursor: null,
			readiness: this.emptyReadiness(),
		};
	}

	private emptySuiteSetupResponse(): AgentEvaluationSuiteSetupResponse {
		return {
			currentAgentVersionId: '',
			versions: [],
			readiness: this.emptyReadiness(),
			suite: null,
		};
	}

	private emptySuiteRunResponse(): AgentEvaluationSuiteRunResponse {
		return {
			currentAgentVersionId: '',
			versions: [],
			readiness: this.emptyReadiness(),
			run: null,
		};
	}

	private async resolveVersionContext(
		projectId: string,
		agentId: string,
		summary: AgentReviewSummary,
		requestedAgentVersionId?: string,
	): Promise<AgentEvaluationVersionContext | null> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) return null;

		const currentAgentVersionId = getAgentCurrentVersionId(agent);
		const publishedAgentVersionId = agent.publishedVersion?.publishedFromVersionId ?? null;
		const summaries = await this.agentEvaluationCaseRepository.summarizeVersions(
			projectId,
			agentId,
		);
		const versionsById = new Map<string, AgentEvaluationVersionSummary>();

		for (const versionSummary of summaries) {
			versionsById.set(versionSummary.agentVersionId, {
				agentVersionId: versionSummary.agentVersionId,
				...this.withSharedDatasetSummary(versionSummary.updatedAt, summary),
				isCurrent: versionSummary.agentVersionId === currentAgentVersionId,
				isPublished: versionSummary.agentVersionId === publishedAgentVersionId,
				canRun: versionSummary.agentVersionId === currentAgentVersionId,
			});
		}

		for (const agentVersionId of [currentAgentVersionId, publishedAgentVersionId]) {
			if (!agentVersionId || versionsById.has(agentVersionId)) continue;
			versionsById.set(agentVersionId, {
				agentVersionId,
				isCurrent: agentVersionId === currentAgentVersionId,
				isPublished: agentVersionId === publishedAgentVersionId,
				canRun: agentVersionId === currentAgentVersionId,
				...this.withSharedDatasetSummary(null, summary),
			});
		}

		const selectedAgentVersionId =
			requestedAgentVersionId && versionsById.has(requestedAgentVersionId)
				? requestedAgentVersionId
				: currentAgentVersionId;
		const selectedVersion = versionsById.get(selectedAgentVersionId);

		return {
			currentAgentVersionId,
			selectedAgentVersionId,
			selectedVersionCanRun: selectedVersion?.canRun ?? false,
			versions: [...versionsById.values()].sort((left, right) => {
				if (left.isCurrent !== right.isCurrent) return left.isCurrent ? -1 : 1;
				if (left.isPublished !== right.isPublished) return left.isPublished ? -1 : 1;
				return (right.updatedAt ?? '').localeCompare(left.updatedAt ?? '');
			}),
		};
	}

	private withSharedDatasetSummary(
		updatedAt: string | null,
		summary: AgentReviewSummary,
	): AgentReviewSummary & { updatedAt: string | null } {
		return {
			...summary,
			updatedAt,
		};
	}

	private toReadiness(
		summary: AgentReviewSummary,
		versionContext: Pick<
			AgentEvaluationVersionContext,
			'selectedAgentVersionId' | 'selectedVersionCanRun'
		>,
	): AgentEvaluationDatasetReadiness {
		const remainingCases = Math.max(AGENT_EVALUATION_MIN_REVIEWED_CASES - summary.total, 0);

		return {
			isReady: remainingCases === 0,
			agentVersionId: versionContext.selectedAgentVersionId,
			agentVersionCanRun: versionContext.selectedVersionCanRun,
			minimumReviewedCases: AGENT_EVALUATION_MIN_REVIEWED_CASES,
			reviewedCases: summary.total,
			remainingCases,
		};
	}

	private toSuiteId(agentId: string): string {
		return `agent-${agentId}-reviewed-cases-v0`;
	}

	private toSuiteDraft(
		agentId: string,
		agentVersionId: string,
		summary: AgentReviewSummary,
		cases: AgentEvaluationCase[],
	): AgentEvaluationSuiteDraft {
		return {
			id: this.toSuiteId(agentId),
			agentVersionId,
			name: 'Reviewed cases suite',
			description: 'Draft evaluation suite generated from reviewed agent runs.',
			caseCount: cases.length,
			approvedCases: summary.approved,
			rejectedCases: summary.rejected,
			toolMocking: 'Recorded tool outputs from reviewed runs when available',
			memoryMocking: 'Empty memory for the first evaluation run',
			metrics: this.suggestMetrics(),
		};
	}

	private suggestMetrics(): AgentEvaluationMetricSuggestion[] {
		return [
			{
				id: ANSWER_CORRECTNESS_METRIC_ID,
				name: 'Answer correctness',
				type: 'judge',
				description: 'Checks the agent response against the expected answer saved during review.',
				enabled: true,
			},
			{
				id: CALLED_TOOLS_METRIC_ID,
				name: 'Called tools',
				type: 'check',
				description: 'Checks the unordered list of called tools against the reviewed expectation.',
				enabled: true,
			},
		];
	}

	private selectMetrics(enabledMetricIds: string[] | undefined): AgentEvaluationMetricSuggestion[] {
		const metrics = this.suggestMetrics();
		if (!enabledMetricIds || enabledMetricIds.length === 0) return metrics;

		const enabled = new Set(enabledMetricIds);
		return metrics.filter((metric) => enabled.has(metric.id));
	}

	private async findExecutionsById(
		projectId: string,
		agentId: string,
		executionIds: string[],
	): Promise<Map<string, AgentExecution>> {
		if (executionIds.length === 0) return new Map();

		const executions = await this.agentExecutionRepository
			.createQueryBuilder('execution')
			.innerJoin('execution.thread', 'thread')
			.where('execution.id IN (:...executionIds)', { executionIds })
			.andWhere('thread.projectId = :projectId', { projectId })
			.andWhere('thread.agentId = :agentId', { agentId })
			.getMany();

		return new Map(executions.map((execution) => [execution.id, execution]));
	}

	private async findConversationHistoryBefore(
		projectId: string,
		agentId: string,
		execution: AgentExecution,
	): Promise<AgentExecution[]> {
		return await this.agentExecutionRepository
			.createQueryBuilder('execution')
			.innerJoin('execution.thread', 'thread')
			.where('execution.threadId = :threadId', { threadId: execution.threadId })
			.andWhere('execution.createdAt < :createdAt', { createdAt: execution.createdAt })
			.andWhere('thread.projectId = :projectId', { projectId })
			.andWhere('thread.agentId = :agentId', { agentId })
			.orderBy('execution.createdAt', 'ASC')
			.getMany();
	}

	private toConversationHistory(
		executions: AgentExecution[],
	): AgentEvaluationConversationMessage[] {
		return executions.flatMap((execution) => {
			const messages: AgentEvaluationConversationMessage[] = [];
			if (execution.userMessage?.trim()) {
				messages.push({ role: 'user', text: execution.userMessage });
			}
			const assistantText =
				execution.assistantResponse?.trim() ||
				(execution.error?.trim() ? `Error: ${execution.error}` : '');
			if (assistantText) {
				messages.push({ role: 'assistant', text: assistantText });
			}
			return messages;
		});
	}

	private toToolMocks(execution: AgentExecution): AgentEvaluationToolMock[] {
		const outputsByToolName = new Map<string, unknown[]>();

		for (const event of execution.timeline ?? []) {
			if (!this.isToolCallEvent(event)) continue;
			if (event.output === undefined) continue;
			this.addToolMockOutput(outputsByToolName, event.name, event.output);
		}

		if (outputsByToolName.size === 0) {
			for (const toolCall of execution.toolCalls ?? []) {
				if (toolCall.output === undefined) continue;
				this.addToolMockOutput(outputsByToolName, toolCall.name, toolCall.output);
			}
		}

		return [...outputsByToolName.entries()].map(([toolName, outputs]) => ({
			toolName,
			outputs,
		}));
	}

	private addToolMockOutput(
		outputsByToolName: Map<string, unknown[]>,
		toolName: string,
		output: unknown,
	): void {
		const outputs = outputsByToolName.get(toolName) ?? [];
		outputs.push(output);
		outputsByToolName.set(toolName, outputs);
	}

	private isToolCallEvent(
		event: TimelineEvent,
	): event is Extract<TimelineEvent, { type: 'tool-call' }> {
		return event.type === 'tool-call';
	}

	private toExpectedToolNames(
		execution: AgentExecution,
		evaluationCase: AgentEvaluationCase,
	): string[] {
		const expectedCalls = this.toExpectedToolCalls(execution);
		if (
			evaluationCase.status !== 'rejected' ||
			evaluationCase.rejectionReason !== 'wrong_tool_calling' ||
			!evaluationCase.toolCallCorrection
		) {
			return expectedCalls.map((toolCall) => toolCall.name);
		}

		const correctedCalls = [...expectedCalls];
		for (const toolCallToRemove of evaluationCase.toolCallCorrection.removeToolCalls) {
			const indexById = correctedCalls.findIndex((toolCall) => toolCall.id === toolCallToRemove.id);
			if (indexById !== -1) {
				correctedCalls.splice(indexById, 1);
				continue;
			}

			const indexByName = correctedCalls.findIndex(
				(toolCall) => toolCall.name === toolCallToRemove.name,
			);
			if (indexByName !== -1) correctedCalls.splice(indexByName, 1);
		}

		return [
			...correctedCalls.map((toolCall) => toolCall.name),
			...evaluationCase.toolCallCorrection.addToolNames,
		];
	}

	private toExpectedToolCalls(execution: AgentExecution): ExpectedToolCall[] {
		const timelineToolCalls = (execution.timeline ?? [])
			.filter((event) => this.isToolCallEvent(event))
			.map((event, index) => ({
				id: event.toolCallId ?? `${execution.id}:tool:${index}`,
				name: event.name,
			}));

		if (timelineToolCalls.length > 0) return timelineToolCalls;

		return (execution.toolCalls ?? []).map((toolCall, index) => ({
			id: `${execution.id}:tool:${index}`,
			name: toolCall.name,
		}));
	}

	private scoreMetric(
		metric: AgentEvaluationMetricSuggestion,
		evaluationCase: AgentEvaluationCase,
		output: string,
		error: string | null,
		expectedToolNames: string[],
		actualToolNames: string[],
	): AgentEvaluationRunMetricResult {
		if (metric.id === CALLED_TOOLS_METRIC_ID) {
			return this.scoreCalledToolsMetric(metric, expectedToolNames, actualToolNames, error);
		}

		const score = this.scoreTextSimilarity(output, evaluationCase.expectedOutput);
		const pass = error === null && score >= SIMILARITY_PASS_THRESHOLD;
		return {
			id: metric.id,
			name: metric.name,
			score,
			pass,
			reason: pass
				? 'The answer matches the expected answer.'
				: 'The answer differs from the expected answer.',
		};
	}

	private scoreCalledToolsMetric(
		metric: AgentEvaluationMetricSuggestion,
		expectedToolNames: string[],
		actualToolNames: string[],
		error: string | null,
	): AgentEvaluationRunMetricResult {
		const expected = this.toSortedToolNames(expectedToolNames);
		const actual = this.toSortedToolNames(actualToolNames);
		const pass = error === null && this.sameStringList(expected, actual);
		const score = error === null ? this.scoreToolListOverlap(expected, actual) : 0;

		return {
			id: metric.id,
			name: metric.name,
			score,
			pass,
			reason: pass
				? 'The called tools match the reviewed expectation.'
				: `Expected tools: ${this.formatToolList(expected)}. Called tools: ${this.formatToolList(actual)}.`,
		};
	}

	private toSortedToolNames(toolNames: string[]): string[] {
		return toolNames
			.map((toolName) => toolName.trim())
			.filter(Boolean)
			.sort();
	}

	private sameStringList(left: string[], right: string[]): boolean {
		return left.length === right.length && left.every((value, index) => value === right[index]);
	}

	private scoreToolListOverlap(expected: string[], actual: string[]): number {
		if (expected.length === 0 && actual.length === 0) return 1;
		if (expected.length === 0 || actual.length === 0) return 0;

		const actualCounts = new Map<string, number>();
		for (const toolName of actual) {
			actualCounts.set(toolName, (actualCounts.get(toolName) ?? 0) + 1);
		}

		let overlap = 0;
		for (const toolName of expected) {
			const count = actualCounts.get(toolName) ?? 0;
			if (count === 0) continue;
			overlap += 1;
			actualCounts.set(toolName, count - 1);
		}

		return overlap / Math.max(expected.length, actual.length);
	}

	private formatToolList(toolNames: string[]): string {
		return toolNames.length > 0 ? toolNames.join(', ') : 'none';
	}

	private scoreTextSimilarity(left: string, right: string): number {
		const leftTokens = new Set(this.toTokens(left));
		const rightTokens = new Set(this.toTokens(right));
		if (leftTokens.size === 0 && rightTokens.size === 0) return 1;
		if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

		let overlap = 0;
		for (const token of leftTokens) {
			if (rightTokens.has(token)) overlap += 1;
		}
		return overlap / new Set([...leftTokens, ...rightTokens]).size;
	}

	private toTokens(value: string): string[] {
		return (
			value
				.normalize('NFKC')
				.toLocaleLowerCase()
				.match(/[\p{L}\p{N}]+/gu) ?? []
		);
	}

	private toRunSummary(results: AgentEvaluationRunCaseResult[]): AgentEvaluationRunSummary {
		const totalCases = results.length;
		const passedCases = results.filter((result) => result.status === 'passed').length;
		const errorCases = results.filter((result) => result.status === 'error').length;
		const failedCases = totalCases - passedCases - errorCases;
		const scores = results.flatMap((result) => result.metrics.map((metric) => metric.score));
		const averageScore =
			scores.length === 0 ? 0 : scores.reduce((total, score) => total + score, 0) / scores.length;

		return {
			totalCases,
			passedCases,
			failedCases,
			errorCases,
			averageScore,
		};
	}

	private toRunDto(run: AgentEvaluationRun): AgentEvaluationSuiteRun {
		return {
			id: run.id,
			suiteId: run.suiteId,
			agentVersionId: run.agentVersionId,
			startedAt: run.startedAt.toISOString(),
			completedAt: run.completedAt.toISOString(),
			summary: run.summary,
			cases: run.cases,
			warnings: run.warnings,
		};
	}

	private toReviewDto(evaluationCase: AgentEvaluationCase): AgentReviewCase {
		return {
			id: evaluationCase.id,
			projectId: evaluationCase.projectId,
			agentId: evaluationCase.agentId,
			agentVersionId: evaluationCase.agentVersionId,
			conversationId: evaluationCase.conversationId,
			executionId: evaluationCase.executionId,
			status: evaluationCase.status,
			rejectionReason: evaluationCase.rejectionReason,
			toolCallCorrection: evaluationCase.toolCallCorrection,
			input: evaluationCase.input,
			expectedOutput: evaluationCase.expectedOutput,
			actualOutput: evaluationCase.actualOutput,
			notes: evaluationCase.notes,
			createdById: evaluationCase.createdById,
			updatedById: evaluationCase.updatedById,
			createdAt: evaluationCase.createdAt.toISOString(),
			updatedAt: evaluationCase.updatedAt.toISOString(),
		};
	}
}

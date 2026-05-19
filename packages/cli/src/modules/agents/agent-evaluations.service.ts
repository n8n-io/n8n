import type {
	AgentEvaluationDatasetReadiness,
	AgentEvaluationDatasetResponse,
	AgentEvaluationMetricSuggestion,
	AgentEvaluationRunCaseResult,
	AgentEvaluationRunMetricResult,
	AgentEvaluationRunSummary,
	AgentEvaluationSuiteDraft,
	AgentEvaluationSuiteRunRequest,
	AgentEvaluationSuiteRunResponse,
	AgentEvaluationSuiteSetupResponse,
	AgentReviewCase,
	AgentReviewSummary,
} from '@n8n/api-types';
import { AGENT_EVALUATION_MIN_REVIEWED_CASES } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { randomUUID } from 'crypto';

import { AgentsService, type AgentEvaluationToolMock } from './agents.service';
import type { AgentEvaluationCase } from './entities/agent-evaluation-case.entity';
import type { AgentExecution } from './entities/agent-execution.entity';
import type { TimelineEvent } from './execution-recorder';
import { AgentEvaluationCaseRepository } from './repositories/agent-evaluation-case.repository';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';

const DATASET_PREVIEW_LIMIT = 10;
const SUITE_CASE_LIMIT = 100;
const FIRST_RUN_CASE_LIMIT = AGENT_EVALUATION_MIN_REVIEWED_CASES;
const SIMILARITY_PASS_THRESHOLD = 0.65;
const REJECTED_PATTERN_THRESHOLD = 0.8;

@Service()
export class AgentEvaluationsService {
	constructor(
		private readonly agentEvaluationCaseRepository: AgentEvaluationCaseRepository,
		private readonly agentExecutionRepository: AgentExecutionRepository,
		private readonly agentsService: AgentsService,
	) {}

	async getDataset(projectId: string, agentId: string): Promise<AgentEvaluationDatasetResponse> {
		const [summary, cases] = await Promise.all([
			this.agentEvaluationCaseRepository.countByStatus(projectId, agentId),
			this.agentEvaluationCaseRepository.findByAgent(projectId, agentId, DATASET_PREVIEW_LIMIT),
		]);

		return {
			cases: cases.map((evaluationCase) => this.toReviewDto(evaluationCase)),
			summary,
			nextCursor: null,
			readiness: this.toReadiness(summary),
		};
	}

	async setupSuite(projectId: string, agentId: string): Promise<AgentEvaluationSuiteSetupResponse> {
		const [summary, cases] = await Promise.all([
			this.agentEvaluationCaseRepository.countByStatus(projectId, agentId),
			this.agentEvaluationCaseRepository.findByAgent(projectId, agentId, SUITE_CASE_LIMIT),
		]);
		const readiness = this.toReadiness(summary);

		if (!readiness.isReady) {
			return { readiness, suite: null };
		}

		return {
			readiness,
			suite: this.toSuiteDraft(agentId, summary, cases),
		};
	}

	async runSuite(
		projectId: string,
		agentId: string,
		userId: string,
		options: AgentEvaluationSuiteRunRequest = {},
	): Promise<AgentEvaluationSuiteRunResponse> {
		const [summary, cases] = await Promise.all([
			this.agentEvaluationCaseRepository.countByStatus(projectId, agentId),
			this.agentEvaluationCaseRepository.findByAgent(projectId, agentId, FIRST_RUN_CASE_LIMIT),
		]);
		const readiness = this.toReadiness(summary);

		if (!readiness.isReady) {
			return { readiness, run: null };
		}

		const startedAt = new Date();
		const warnings = new Set<string>();
		const executionsById = await this.findExecutionsById(
			projectId,
			agentId,
			cases.map((evaluationCase) => evaluationCase.executionId),
		);
		const results: AgentEvaluationRunCaseResult[] = [];
		const metrics = this.selectMetrics(summary, options.enabledMetricIds);

		for (const evaluationCase of cases) {
			const execution = executionsById.get(evaluationCase.executionId) ?? null;
			if (!execution) {
				warnings.add('Some reviewed cases no longer have recorded run data.');
			}

			const toolMocks = execution ? this.toToolMocks(execution) : [];
			try {
				const executionResult = await this.agentsService.executeEvaluationCase({
					agentId,
					projectId,
					userId,
					message: evaluationCase.input,
					toolMocks,
				});
				for (const warning of executionResult.warnings) warnings.add(warning);
				if (executionResult.missingToolMocks.length > 0) {
					warnings.add('Some tool calls did not have recorded outputs.');
				}

				const metricResults = metrics.map((metric) =>
					this.scoreMetric(metric, evaluationCase, executionResult.output, executionResult.error),
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
		return {
			readiness,
			run: {
				id: randomUUID(),
				suiteId: this.toSuiteId(agentId),
				startedAt: startedAt.toISOString(),
				completedAt: completedAt.toISOString(),
				summary: this.toRunSummary(results),
				cases: results,
				warnings: [...warnings],
			},
		};
	}

	private toReadiness(summary: AgentReviewSummary): AgentEvaluationDatasetReadiness {
		const remainingCases = Math.max(AGENT_EVALUATION_MIN_REVIEWED_CASES - summary.total, 0);

		return {
			isReady: remainingCases === 0,
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
		summary: AgentReviewSummary,
		cases: AgentEvaluationCase[],
	): AgentEvaluationSuiteDraft {
		return {
			id: this.toSuiteId(agentId),
			name: 'Reviewed cases suite',
			description: 'Draft evaluation suite generated from reviewed agent runs.',
			caseCount: cases.length,
			approvedCases: summary.approved,
			rejectedCases: summary.rejected,
			toolMocking: 'Recorded tool outputs from reviewed runs when available',
			memoryMocking: 'Empty memory for the first evaluation run',
			metrics: this.suggestMetrics(summary),
		};
	}

	private suggestMetrics(summary: AgentReviewSummary): AgentEvaluationMetricSuggestion[] {
		return [
			{
				id: 'expected-output-similarity',
				name: 'Expected output similarity',
				type: 'judge',
				description: 'Compare the new agent response with the expected output saved during review.',
				enabled: true,
			},
			{
				id: 'task-completion',
				name: 'Task completion',
				type: 'judge',
				description: 'Check whether the response satisfies the reviewed user input.',
				enabled: true,
			},
			{
				id: 'rejected-pattern-check',
				name: 'Rejected pattern check',
				type: 'check',
				description: 'Flag responses that repeat behavior captured in rejected reviewed cases.',
				enabled: summary.rejected > 0,
			},
		];
	}

	private selectMetrics(
		summary: AgentReviewSummary,
		enabledMetricIds: string[] | undefined,
	): AgentEvaluationMetricSuggestion[] {
		const metrics = this.suggestMetrics(summary);
		if (enabledMetricIds === undefined) return metrics.filter((metric) => metric.enabled);

		const enabledIds = new Set(enabledMetricIds);
		return metrics.filter((metric) => enabledIds.has(metric.id));
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

	private scoreMetric(
		metric: AgentEvaluationMetricSuggestion,
		evaluationCase: AgentEvaluationCase,
		output: string,
		error: string | null,
	): AgentEvaluationRunMetricResult {
		if (metric.id === 'task-completion') {
			const pass = error === null && output.trim().length > 0;
			return {
				id: metric.id,
				name: metric.name,
				score: pass ? 1 : 0,
				pass,
				reason: pass
					? 'The agent returned a response.'
					: 'The agent did not return a usable response.',
			};
		}

		if (metric.id === 'rejected-pattern-check') {
			if (evaluationCase.status !== 'rejected') {
				return {
					id: metric.id,
					name: metric.name,
					score: 1,
					pass: true,
					reason: 'The reviewed case was approved.',
				};
			}
			const similarity = this.scoreTextSimilarity(output, evaluationCase.actualOutput);
			const pass = similarity < REJECTED_PATTERN_THRESHOLD;
			return {
				id: metric.id,
				name: metric.name,
				score: 1 - similarity,
				pass,
				reason: pass
					? 'The response does not closely match the rejected output.'
					: 'The response is too similar to the rejected output.',
			};
		}

		const score = this.scoreTextSimilarity(output, evaluationCase.expectedOutput);
		const pass = error === null && score >= SIMILARITY_PASS_THRESHOLD;
		return {
			id: metric.id,
			name: metric.name,
			score,
			pass,
			reason: pass
				? 'The response is similar to the expected output.'
				: 'The response differs from the expected output.',
		};
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
		return value
			.toLowerCase()
			.split(/[^a-z0-9]+/)
			.filter((token) => token.length > 0);
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

	private toReviewDto(evaluationCase: AgentEvaluationCase): AgentReviewCase {
		return {
			id: evaluationCase.id,
			projectId: evaluationCase.projectId,
			agentId: evaluationCase.agentId,
			executionId: evaluationCase.executionId,
			status: evaluationCase.status,
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

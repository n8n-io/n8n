import type {
	AgentEvaluationDatasetReadiness,
	AgentEvaluationDatasetResponse,
	AgentEvaluationMetricSuggestion,
	AgentEvaluationSuiteDraft,
	AgentEvaluationSuiteSetupResponse,
	AgentReviewCase,
	AgentReviewSummary,
} from '@n8n/api-types';
import { AGENT_EVALUATION_MIN_REVIEWED_CASES } from '@n8n/api-types';
import { Service } from '@n8n/di';

import type { AgentEvaluationCase } from './entities/agent-evaluation-case.entity';
import { AgentEvaluationCaseRepository } from './repositories/agent-evaluation-case.repository';

const DATASET_PREVIEW_LIMIT = 10;
const SUITE_CASE_LIMIT = 100;

@Service()
export class AgentEvaluationsService {
	constructor(private readonly agentEvaluationCaseRepository: AgentEvaluationCaseRepository) {}

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

	private toReadiness(summary: AgentReviewSummary): AgentEvaluationDatasetReadiness {
		const remainingCases = Math.max(AGENT_EVALUATION_MIN_REVIEWED_CASES - summary.total, 0);

		return {
			isReady: remainingCases === 0,
			minimumReviewedCases: AGENT_EVALUATION_MIN_REVIEWED_CASES,
			reviewedCases: summary.total,
			remainingCases,
		};
	}

	private toSuiteDraft(
		agentId: string,
		summary: AgentReviewSummary,
		cases: AgentEvaluationCase[],
	): AgentEvaluationSuiteDraft {
		return {
			id: `agent-${agentId}-reviewed-cases-v0`,
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

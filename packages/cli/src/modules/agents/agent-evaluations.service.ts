import type {
	AgentEvaluationDatasetReadiness,
	AgentEvaluationDatasetResponse,
	AgentEvaluationMetricSuggestion,
	AgentEvaluationSuiteDraft,
	AgentEvaluationSuiteRun,
	AgentEvaluationSuiteSetupResponse,
	AgentEvaluationVersionSummary,
	AgentReviewCase,
	AgentReviewSummary,
} from '@n8n/api-types';
import { AGENT_EVALUATION_MIN_REVIEWED_CASES } from '@n8n/api-types';
import { Service } from '@n8n/di';

import type { AgentEvaluationCase } from './entities/agent-evaluation-case.entity';
import type { AgentEvaluationRun } from './entities/agent-evaluation-run.entity';
import { AgentEvaluationCaseRepository } from './repositories/agent-evaluation-case.repository';
import { AgentEvaluationRunRepository } from './repositories/agent-evaluation-run.repository';
import { AgentRepository } from './repositories/agent.repository';
import { getAgentCurrentVersionId } from './utils/agent-version.utils';

const DATASET_PREVIEW_LIMIT = 10;
const RECENT_RUNS_LIMIT = 20;
const SUITE_CASE_LIMIT = 100;
const ANSWER_CORRECTNESS_METRIC_ID = 'answer-correctness';
const CALLED_TOOLS_METRIC_ID = 'called-tools-unordered';

interface AgentEvaluationVersionContext {
	currentAgentVersionId: string;
	selectedAgentVersionId: string;
	selectedVersionCanRun: boolean;
	versions: AgentEvaluationVersionSummary[];
}

@Service()
export class AgentEvaluationsService {
	constructor(
		private readonly agentEvaluationCaseRepository: AgentEvaluationCaseRepository,
		private readonly agentEvaluationRunRepository: AgentEvaluationRunRepository,
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

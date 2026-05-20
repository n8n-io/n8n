import { AGENT_EVALUATION_MIN_REVIEWED_CASES } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';

import { AgentEvaluationsService } from '../agent-evaluations.service';
import type { AgentsService } from '../agents.service';
import type { AgentEvaluationCase } from '../entities/agent-evaluation-case.entity';
import type { AgentEvaluationRun } from '../entities/agent-evaluation-run.entity';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { AgentEvaluationCaseRepository } from '../repositories/agent-evaluation-case.repository';
import type { AgentEvaluationRunRepository } from '../repositories/agent-evaluation-run.repository';
import type { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import type { AgentRepository } from '../repositories/agent.repository';

describe('AgentEvaluationsService', () => {
	const now = new Date('2026-05-18T12:00:00.000Z');
	let agentEvaluationCaseRepository: jest.Mocked<AgentEvaluationCaseRepository>;
	let agentEvaluationRunRepository: jest.Mocked<AgentEvaluationRunRepository>;
	let agentExecutionRepository: jest.Mocked<AgentExecutionRepository>;
	let agentsService: jest.Mocked<AgentsService>;
	let agentRepository: jest.Mocked<AgentRepository>;
	let queryBuilder: {
		innerJoin: jest.Mock;
		where: jest.Mock;
		andWhere: jest.Mock;
		orderBy: jest.Mock;
		getMany: jest.Mock;
	};
	let service: AgentEvaluationsService;

	beforeEach(() => {
		agentEvaluationCaseRepository = mock<AgentEvaluationCaseRepository>();
		agentEvaluationRunRepository = mock<AgentEvaluationRunRepository>();
		agentExecutionRepository = mock<AgentExecutionRepository>();
		agentsService = mock<AgentsService>();
		agentRepository = mock<AgentRepository>();
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: 'agent-1',
			versionId: 'version-1',
			updatedAt: now,
			publishedVersion: null,
		} as never);
		agentEvaluationCaseRepository.summarizeVersions.mockResolvedValue([]);
		agentEvaluationRunRepository.findRecentByAgent.mockResolvedValue([]);
		queryBuilder = {
			innerJoin: jest.fn().mockReturnThis(),
			where: jest.fn().mockReturnThis(),
			andWhere: jest.fn().mockReturnThis(),
			orderBy: jest.fn().mockReturnThis(),
			getMany: jest.fn().mockResolvedValue([]),
		};
		agentExecutionRepository.createQueryBuilder.mockReturnValue(queryBuilder as never);
		service = new AgentEvaluationsService(
			agentEvaluationCaseRepository,
			agentEvaluationRunRepository,
			agentExecutionRepository,
			agentsService,
			agentRepository,
		);
	});

	function reviewFixture(overrides: Partial<AgentEvaluationCase> = {}): AgentEvaluationCase {
		return {
			id: 'review-1',
			projectId: 'project-1',
			agentId: 'agent-1',
			agentVersionId: 'version-1',
			conversationId: 'thread-1',
			executionId: 'execution-1',
			status: 'approved',
			rejectionReason: null,
			toolCallCorrection: null,
			input: 'Question',
			expectedOutput: 'Expected answer',
			actualOutput: 'Actual answer',
			notes: null,
			createdById: 'user-1',
			updatedById: 'user-1',
			createdAt: now,
			updatedAt: now,
			...overrides,
		} as AgentEvaluationCase;
	}

	function runFixture(overrides: Partial<AgentEvaluationRun> = {}): AgentEvaluationRun {
		return {
			id: 'run-1',
			projectId: 'project-1',
			agentId: 'agent-1',
			agentVersionId: 'version-1',
			suiteId: 'agent-agent-1-reviewed-cases-v0',
			startedAt: now,
			completedAt: now,
			summary: {
				totalCases: 1,
				passedCases: 1,
				failedCases: 0,
				errorCases: 0,
				averageScore: 1,
			},
			cases: [],
			warnings: [],
			createdById: 'user-1',
			createdAt: now,
			updatedAt: now,
			...overrides,
		} as AgentEvaluationRun;
	}

	it('requires more reviewed cases when the dataset is below the threshold', async () => {
		agentEvaluationCaseRepository.countByStatus.mockResolvedValue({
			total: 4,
			approved: 3,
			rejected: 1,
		});
		agentEvaluationCaseRepository.findByAgent.mockResolvedValue([reviewFixture()]);

		const dataset = await service.getDataset('project-1', 'agent-1');

		expect(agentEvaluationCaseRepository.findByAgent).toHaveBeenCalledWith(
			'project-1',
			'agent-1',
			10,
		);
		expect(dataset.readiness).toEqual({
			isReady: false,
			agentVersionId: 'version-1',
			agentVersionCanRun: true,
			minimumReviewedCases: AGENT_EVALUATION_MIN_REVIEWED_CASES,
			reviewedCases: 4,
			remainingCases: AGENT_EVALUATION_MIN_REVIEWED_CASES - 4,
		});
		expect(dataset.summary).toEqual({ total: 4, approved: 3, rejected: 1 });
		expect(dataset.cases).toEqual([
			expect.objectContaining({ id: 'review-1', updatedAt: now.toISOString() }),
		]);
	});

	it('marks the dataset as ready at the reviewed-case threshold', async () => {
		agentEvaluationCaseRepository.countByStatus.mockResolvedValue({
			total: AGENT_EVALUATION_MIN_REVIEWED_CASES,
			approved: 4,
			rejected: 1,
		});
		agentEvaluationCaseRepository.findByAgent.mockResolvedValue([]);

		const dataset = await service.getDataset('project-1', 'agent-1');

		expect(dataset.readiness).toEqual({
			isReady: true,
			agentVersionId: 'version-1',
			agentVersionCanRun: true,
			minimumReviewedCases: AGENT_EVALUATION_MIN_REVIEWED_CASES,
			reviewedCases: AGENT_EVALUATION_MIN_REVIEWED_CASES,
			remainingCases: 0,
		});
	});

	it('loads recent evaluation runs with the dataset', async () => {
		agentEvaluationCaseRepository.countByStatus.mockResolvedValue({
			total: AGENT_EVALUATION_MIN_REVIEWED_CASES,
			approved: 4,
			rejected: 1,
		});
		agentEvaluationCaseRepository.findByAgent.mockResolvedValue([]);
		agentEvaluationRunRepository.findRecentByAgent.mockResolvedValue([
			runFixture({ id: 'run-1', agentVersionId: 'version-1' }),
			runFixture({ id: 'run-2', agentVersionId: 'version-2' }),
		]);

		const dataset = await service.getDataset('project-1', 'agent-1');

		expect(agentEvaluationRunRepository.findRecentByAgent).toHaveBeenCalledWith(
			'project-1',
			'agent-1',
			20,
		);
		expect(dataset.recentRuns).toEqual([
			expect.objectContaining({
				id: 'run-1',
				agentVersionId: 'version-1',
				completedAt: now.toISOString(),
			}),
			expect.objectContaining({
				id: 'run-2',
				agentVersionId: 'version-2',
				completedAt: now.toISOString(),
			}),
		]);
	});

	it('loads a requested reviewed version for dataset context only', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: 'agent-1',
			versionId: 'version-2',
			updatedAt: now,
			publishedVersion: {
				publishedFromVersionId: 'version-1',
			},
		} as never);
		agentEvaluationCaseRepository.summarizeVersions.mockResolvedValue([
			{
				agentVersionId: 'version-1',
				total: AGENT_EVALUATION_MIN_REVIEWED_CASES,
				approved: 4,
				rejected: 1,
				updatedAt: now.toISOString(),
			},
		]);
		agentEvaluationCaseRepository.countByStatus.mockResolvedValue({
			total: AGENT_EVALUATION_MIN_REVIEWED_CASES,
			approved: 4,
			rejected: 1,
		});
		agentEvaluationCaseRepository.findByAgent.mockResolvedValue([
			reviewFixture({ agentVersionId: 'version-1' }),
		]);

		const dataset = await service.getDataset('project-1', 'agent-1', 'version-1');

		expect(agentEvaluationCaseRepository.findByAgent).toHaveBeenCalledWith(
			'project-1',
			'agent-1',
			10,
		);
		expect(dataset.currentAgentVersionId).toBe('version-2');
		expect(dataset.readiness).toEqual({
			isReady: true,
			agentVersionId: 'version-1',
			agentVersionCanRun: false,
			minimumReviewedCases: AGENT_EVALUATION_MIN_REVIEWED_CASES,
			reviewedCases: AGENT_EVALUATION_MIN_REVIEWED_CASES,
			remainingCases: 0,
		});
		expect(dataset.versions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					agentVersionId: 'version-2',
					isCurrent: true,
					canRun: true,
				}),
				expect.objectContaining({
					agentVersionId: 'version-1',
					isPublished: true,
					canRun: false,
				}),
			]),
		);
	});

	it('does not set up a suite below the reviewed-case threshold', async () => {
		agentEvaluationCaseRepository.countByStatus.mockResolvedValue({
			total: 3,
			approved: 2,
			rejected: 1,
		});
		agentEvaluationCaseRepository.findByAgent.mockResolvedValue([reviewFixture()]);

		const response = await service.setupSuite('project-1', 'agent-1');

		expect(response.suite).toBeNull();
		expect(response.readiness).toEqual({
			isReady: false,
			agentVersionId: 'version-1',
			agentVersionCanRun: true,
			minimumReviewedCases: AGENT_EVALUATION_MIN_REVIEWED_CASES,
			reviewedCases: 3,
			remainingCases: AGENT_EVALUATION_MIN_REVIEWED_CASES - 3,
		});
	});

	it('sets up a draft suite with suggested metrics from reviewed cases', async () => {
		agentEvaluationCaseRepository.countByStatus.mockResolvedValue({
			total: AGENT_EVALUATION_MIN_REVIEWED_CASES,
			approved: 4,
			rejected: 1,
		});
		agentEvaluationCaseRepository.findByAgent.mockResolvedValue([
			reviewFixture(),
			reviewFixture({ id: 'review-2', executionId: 'execution-2', status: 'rejected' }),
		]);

		const response = await service.setupSuite('project-1', 'agent-1');

		expect(agentEvaluationCaseRepository.findByAgent).toHaveBeenCalledWith(
			'project-1',
			'agent-1',
			100,
		);
		expect(response.suite).toEqual(
			expect.objectContaining({
				id: 'agent-agent-1-reviewed-cases-v0',
				agentVersionId: 'version-1',
				name: 'Reviewed cases suite',
				caseCount: 2,
				approvedCases: 4,
				rejectedCases: 1,
				memoryMocking: 'Empty memory for the first evaluation run',
				toolMocking: 'Recorded tool outputs from reviewed runs when available',
				metrics: [
					expect.objectContaining({ id: 'answer-correctness', enabled: true }),
					expect.objectContaining({ id: 'called-tools-unordered', enabled: true }),
				],
			}),
		);
	});

	it('does not run a suite below the reviewed-case threshold', async () => {
		agentEvaluationCaseRepository.countByStatus.mockResolvedValue({
			total: 3,
			approved: 2,
			rejected: 1,
		});
		agentEvaluationCaseRepository.findByAgent.mockResolvedValue([reviewFixture()]);

		const response = await service.runSuite('project-1', 'agent-1', 'user-1');

		expect(response.run).toBeNull();
		expect(agentExecutionRepository.createQueryBuilder).not.toHaveBeenCalled();
		expect(agentsService.executeEvaluationCase).not.toHaveBeenCalled();
		expect(agentEvaluationRunRepository.saveRun).not.toHaveBeenCalled();
	});

	it('runs the current version even when an older reviewed version is requested', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: 'agent-1',
			versionId: 'version-2',
			updatedAt: now,
			publishedVersion: null,
		} as never);
		agentEvaluationCaseRepository.summarizeVersions.mockResolvedValue([
			{
				agentVersionId: 'version-1',
				total: AGENT_EVALUATION_MIN_REVIEWED_CASES,
				approved: 4,
				rejected: 1,
				updatedAt: now.toISOString(),
			},
		]);
		agentEvaluationCaseRepository.countByStatus.mockResolvedValue({
			total: AGENT_EVALUATION_MIN_REVIEWED_CASES,
			approved: 4,
			rejected: 1,
		});
		agentEvaluationCaseRepository.findByAgent.mockResolvedValue([
			reviewFixture({ agentVersionId: 'version-1' }),
		]);
		agentsService.executeEvaluationCase.mockResolvedValue({
			output: 'Expected answer',
			error: null,
			finishReason: 'stop',
			durationMs: 125,
			toolCalls: [],
			missingToolMocks: [],
			warnings: [],
		});

		const response = await service.runSuite('project-1', 'agent-1', 'user-1', {
			agentVersionId: 'version-1',
		});

		expect(response.readiness).toEqual({
			isReady: true,
			agentVersionId: 'version-2',
			agentVersionCanRun: true,
			minimumReviewedCases: AGENT_EVALUATION_MIN_REVIEWED_CASES,
			reviewedCases: AGENT_EVALUATION_MIN_REVIEWED_CASES,
			remainingCases: 0,
		});
		expect(agentsService.executeEvaluationCase).toHaveBeenCalledWith(
			expect.objectContaining({
				agentVersionId: 'version-2',
			}),
		);
		expect(agentEvaluationRunRepository.saveRun).toHaveBeenCalledWith(
			'project-1',
			'agent-1',
			'user-1',
			expect.objectContaining({
				agentVersionId: 'version-2',
			}),
		);
		expect(response.run).toEqual(expect.objectContaining({ agentVersionId: 'version-2' }));
	});

	it('runs the first evaluation with reviewed cases and recorded tool mocks', async () => {
		const review = reviewFixture({
			expectedOutput: 'Expected answer',
			actualOutput: 'Old answer',
		});
		agentEvaluationCaseRepository.countByStatus.mockResolvedValue({
			total: AGENT_EVALUATION_MIN_REVIEWED_CASES,
			approved: AGENT_EVALUATION_MIN_REVIEWED_CASES,
			rejected: 0,
		});
		agentEvaluationCaseRepository.findByAgent.mockResolvedValue([review]);
		queryBuilder.getMany.mockResolvedValueOnce([
			{
				id: review.executionId,
				threadId: 'thread-1',
				createdAt: now,
				userMessage: 'Question',
				assistantResponse: 'Old answer',
				error: null,
				timeline: [
					{
						type: 'tool-call',
						name: 'lookup',
						output: { answer: 42 },
					},
				],
				toolCalls: null,
			} as AgentExecution,
		]);
		queryBuilder.getMany.mockResolvedValueOnce([
			{
				id: 'execution-0',
				threadId: 'thread-1',
				createdAt: new Date('2026-05-18T11:00:00.000Z'),
				userMessage: 'Earlier question',
				assistantResponse: 'Earlier answer',
				error: null,
				timeline: null,
				toolCalls: null,
			} as AgentExecution,
		]);
		agentsService.executeEvaluationCase.mockResolvedValue({
			output: 'Expected answer',
			error: null,
			finishReason: 'stop',
			durationMs: 125,
			toolCalls: [{ name: 'lookup', input: { query: 'Question' }, output: { answer: 42 } }],
			missingToolMocks: [],
			warnings: [],
		});

		const response = await service.runSuite('project-1', 'agent-1', 'user-1');

		expect(agentEvaluationCaseRepository.findByAgent).toHaveBeenCalledWith(
			'project-1',
			'agent-1',
			AGENT_EVALUATION_MIN_REVIEWED_CASES,
		);
		expect(agentsService.executeEvaluationCase).toHaveBeenCalledWith({
			agentId: 'agent-1',
			agentVersionId: 'version-1',
			projectId: 'project-1',
			userId: 'user-1',
			message: 'Question',
			conversationHistory: [
				{ role: 'user', text: 'Earlier question' },
				{ role: 'assistant', text: 'Earlier answer' },
			],
			toolMocks: [{ toolName: 'lookup', outputs: [{ answer: 42 }] }],
		});
		expect(agentEvaluationRunRepository.saveRun).toHaveBeenCalledWith(
			'project-1',
			'agent-1',
			'user-1',
			expect.objectContaining({
				suiteId: 'agent-agent-1-reviewed-cases-v0',
				agentVersionId: 'version-1',
			}),
		);
		expect(response.run).toEqual(
			expect.objectContaining({
				suiteId: 'agent-agent-1-reviewed-cases-v0',
				agentVersionId: 'version-1',
				summary: {
					totalCases: 1,
					passedCases: 1,
					failedCases: 0,
					errorCases: 0,
					averageScore: 1,
				},
				cases: [
					expect.objectContaining({
						caseId: review.id,
						status: 'passed',
						output: 'Expected answer',
						toolCalls: [
							{
								name: 'lookup',
								input: { query: 'Question' },
								output: { answer: 42 },
								mocked: true,
								missingMock: false,
							},
						],
					}),
				],
			}),
		);
	});

	it('always runs the required answer and tool metrics', async () => {
		const review = reviewFixture({
			expectedOutput: 'Expected answer',
			actualOutput: 'Old answer',
		});
		agentEvaluationCaseRepository.countByStatus.mockResolvedValue({
			total: AGENT_EVALUATION_MIN_REVIEWED_CASES,
			approved: AGENT_EVALUATION_MIN_REVIEWED_CASES,
			rejected: 0,
		});
		agentEvaluationCaseRepository.findByAgent.mockResolvedValue([review]);
		agentsService.executeEvaluationCase.mockResolvedValue({
			output: 'Expected answer',
			error: null,
			finishReason: 'stop',
			durationMs: 125,
			toolCalls: [],
			missingToolMocks: [],
			warnings: [],
		});

		const response = await service.runSuite('project-1', 'agent-1', 'user-1', {
			enabledMetricIds: ['answer-correctness'],
		});

		expect(response.run?.cases[0].metrics).toEqual([
			expect.objectContaining({ id: 'answer-correctness', pass: true }),
			expect.objectContaining({ id: 'called-tools-unordered', pass: true }),
		]);
	});
});

import { AGENT_EVALUATION_MIN_REVIEWED_CASES } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';

import { AgentEvaluationsService } from '../agent-evaluations.service';
import type { AgentsService } from '../agents.service';
import type { AgentEvaluationCase } from '../entities/agent-evaluation-case.entity';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { AgentEvaluationCaseRepository } from '../repositories/agent-evaluation-case.repository';
import type { AgentExecutionRepository } from '../repositories/agent-execution.repository';

describe('AgentEvaluationsService', () => {
	const now = new Date('2026-05-18T12:00:00.000Z');
	let agentEvaluationCaseRepository: jest.Mocked<AgentEvaluationCaseRepository>;
	let agentExecutionRepository: jest.Mocked<AgentExecutionRepository>;
	let agentsService: jest.Mocked<AgentsService>;
	let queryBuilder: {
		innerJoin: jest.Mock;
		where: jest.Mock;
		andWhere: jest.Mock;
		getMany: jest.Mock;
	};
	let service: AgentEvaluationsService;

	beforeEach(() => {
		agentEvaluationCaseRepository = mock<AgentEvaluationCaseRepository>();
		agentExecutionRepository = mock<AgentExecutionRepository>();
		agentsService = mock<AgentsService>();
		queryBuilder = {
			innerJoin: jest.fn().mockReturnThis(),
			where: jest.fn().mockReturnThis(),
			andWhere: jest.fn().mockReturnThis(),
			getMany: jest.fn().mockResolvedValue([]),
		};
		agentExecutionRepository.createQueryBuilder.mockReturnValue(queryBuilder as never);
		service = new AgentEvaluationsService(
			agentEvaluationCaseRepository,
			agentExecutionRepository,
			agentsService,
		);
	});

	function reviewFixture(overrides: Partial<AgentEvaluationCase> = {}): AgentEvaluationCase {
		return {
			id: 'review-1',
			projectId: 'project-1',
			agentId: 'agent-1',
			executionId: 'execution-1',
			status: 'approved',
			rejectionReason: null,
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
			minimumReviewedCases: AGENT_EVALUATION_MIN_REVIEWED_CASES,
			reviewedCases: AGENT_EVALUATION_MIN_REVIEWED_CASES,
			remainingCases: 0,
		});
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
				name: 'Reviewed cases suite',
				caseCount: 2,
				approvedCases: 4,
				rejectedCases: 1,
				memoryMocking: 'Empty memory for the first evaluation run',
				toolMocking: 'Recorded tool outputs from reviewed runs when available',
				metrics: [
					expect.objectContaining({ id: 'expected-output-similarity', enabled: true }),
					expect.objectContaining({ id: 'task-completion', enabled: true }),
					expect.objectContaining({ id: 'rejected-pattern-check', enabled: true }),
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
		queryBuilder.getMany.mockResolvedValue([
			{
				id: review.executionId,
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
			projectId: 'project-1',
			userId: 'user-1',
			message: 'Question',
			toolMocks: [{ toolName: 'lookup', outputs: [{ answer: 42 }] }],
		});
		expect(response.run).toEqual(
			expect.objectContaining({
				suiteId: 'agent-agent-1-reviewed-cases-v0',
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
						toolCalls: [{ name: 'lookup', mocked: true, missingMock: false }],
					}),
				],
			}),
		);
	});

	it('runs only the selected metrics', async () => {
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
			enabledMetricIds: ['task-completion'],
		});

		expect(response.run?.cases[0].metrics).toEqual([
			expect.objectContaining({ id: 'task-completion', pass: true }),
		]);
	});
});

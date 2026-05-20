import {
	DEFAULT_AGENT_REVIEW_REJECTION_REASON,
	type UpsertAgentReviewCaseDto,
} from '@n8n/api-types';
import { mock } from 'jest-mock-extended';

import { AgentDebugService, computeAgentDebugSignals } from '../agent-debug.service';
import type { AgentEvaluationCase } from '../entities/agent-evaluation-case.entity';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { AgentEvaluationCaseRepository } from '../repositories/agent-evaluation-case.repository';
import type { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import type { AgentRepository } from '../repositories/agent.repository';

type SignalInput = Parameters<typeof computeAgentDebugSignals>[0];

const baseExecution = {
	status: 'success',
	duration: 1200,
	cost: null,
	totalTokens: null,
	timeline: null,
	toolCalls: null,
	hitlStatus: null,
	assistantResponse: 'Done',
	error: null,
} satisfies SignalInput;

describe('computeAgentDebugSignals', () => {
	it('flags failed runs, slow runs, high-cost runs, and empty responses', () => {
		const signals = computeAgentDebugSignals({
			...baseExecution,
			status: 'error',
			duration: 45_000,
			cost: 0.2,
			assistantResponse: '',
			error: 'Model request failed',
		});

		expect(signals.map((signal) => signal.type)).toEqual(['failed_run', 'slow_run', 'high_cost']);
		expect(signals[0].description).toBe('Model request failed');
	});

	it('flags failed and empty tool outputs from timeline events', () => {
		const signals = computeAgentDebugSignals({
			...baseExecution,
			timeline: [
				{
					type: 'tool-call',
					kind: 'tool',
					name: 'search',
					toolCallId: 'tool-1',
					input: {},
					output: { error: 'Unavailable' },
					startTime: 1,
					endTime: 2,
					success: false,
				},
				{
					type: 'tool-call',
					kind: 'tool',
					name: 'lookup',
					toolCallId: 'tool-2',
					input: {},
					output: '',
					startTime: 3,
					endTime: 4,
					success: true,
				},
			],
		} satisfies SignalInput);

		expect(signals).toEqual([
			expect.objectContaining({ type: 'tool_failure', count: 1 }),
			expect.objectContaining({ type: 'empty_tool_output', count: 1 }),
		]);
	});

	it('uses recorded tool calls for empty output only when timeline tool calls are absent', () => {
		const toolCalls: AgentExecution['toolCalls'] = [
			{ name: 'lookup', input: {}, output: null },
			{ name: 'search', input: {}, output: ['result'] },
		];

		const signals = computeAgentDebugSignals({
			...baseExecution,
			toolCalls,
		});

		expect(signals).toEqual([expect.objectContaining({ type: 'empty_tool_output', count: 1 })]);
	});

	it('flags human input handoff from status or suspension events', () => {
		const statusSignals = computeAgentDebugSignals({
			...baseExecution,
			hitlStatus: 'suspended',
		});
		const timelineSignals = computeAgentDebugSignals({
			...baseExecution,
			timeline: [{ type: 'suspension', toolName: 'approval', toolCallId: 'tool-1', timestamp: 1 }],
		});

		expect(statusSignals.map((signal) => signal.type)).toContain('human_input_required');
		expect(timelineSignals.map((signal) => signal.type)).toContain('human_input_required');
	});
});

describe('AgentDebugService', () => {
	const now = new Date('2026-05-18T12:00:00.000Z');
	let agentExecutionRepository: jest.Mocked<AgentExecutionRepository>;
	let agentEvaluationCaseRepository: jest.Mocked<AgentEvaluationCaseRepository>;
	let agentRepository: jest.Mocked<AgentRepository>;
	let service: AgentDebugService;

	beforeEach(() => {
		agentExecutionRepository = mock<AgentExecutionRepository>();
		agentEvaluationCaseRepository = mock<AgentEvaluationCaseRepository>();
		agentRepository = mock<AgentRepository>();
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: 'agent-1',
			versionId: 'version-1',
			updatedAt: now,
		} as never);
		service = new AgentDebugService(
			agentExecutionRepository,
			agentEvaluationCaseRepository,
			agentRepository,
		);
	});

	function executionFixture(): AgentExecution & { thread: AgentExecutionThread } {
		return {
			id: 'execution-1',
			threadId: 'thread-1',
			thread: {
				id: 'thread-1',
				agentId: 'agent-1',
				agentName: 'Support agent',
				projectId: 'project-1',
				sessionNumber: 7,
				totalPromptTokens: 0,
				totalCompletionTokens: 0,
				totalCost: 0,
				totalDuration: 0,
				title: 'Support session',
				emoji: null,
				createdAt: now,
				updatedAt: now,
			},
			status: 'success',
			startedAt: now,
			stoppedAt: now,
			duration: 1200,
			userMessage: 'Can you summarize this?',
			assistantResponse: 'Summary',
			model: 'gpt-test',
			promptTokens: 12,
			completionTokens: 8,
			totalTokens: 20,
			cost: 0.001,
			toolCalls: null,
			timeline: null,
			error: null,
			hitlStatus: null,
			workingMemory: null,
			source: 'chat',
			createdAt: now,
			updatedAt: now,
		} as unknown as AgentExecution & { thread: AgentExecutionThread };
	}

	function mockRunLookup(execution: (AgentExecution & { thread: AgentExecutionThread }) | null) {
		const queryBuilder = {
			innerJoinAndSelect: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			addSelect: jest.fn().mockReturnThis(),
			where: jest.fn().mockReturnThis(),
			getOne: jest.fn().mockResolvedValue(execution),
		};

		agentExecutionRepository.createQueryBuilder.mockReturnValue(queryBuilder as never);
		return queryBuilder;
	}

	function reviewFixture(overrides: Partial<AgentEvaluationCase> = {}): AgentEvaluationCase {
		return {
			id: 'review-1',
			projectId: 'project-1',
			agentId: 'agent-1',
			agentVersionId: 'version-1',
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

	it('lists review cases with summary and pagination', async () => {
		const updatedAt = new Date('2026-05-18T12:00:00.000Z');
		const nextUpdatedAt = new Date('2026-05-18T11:00:00.000Z');
		agentEvaluationCaseRepository.findByAgent.mockResolvedValue([
			reviewFixture({ updatedAt }),
			reviewFixture({
				id: 'review-2',
				executionId: 'execution-2',
				status: 'rejected',
				updatedAt: nextUpdatedAt,
			}),
		]);
		agentEvaluationCaseRepository.countByStatus.mockResolvedValue({
			total: 2,
			approved: 1,
			rejected: 1,
		});

		const response = await service.listReviewCases('project-1', 'agent-1', 1);

		expect(agentEvaluationCaseRepository.findByAgent).toHaveBeenCalledWith(
			'project-1',
			'agent-1',
			'version-1',
			2,
			undefined,
		);
		expect(response).toEqual({
			cases: [
				expect.objectContaining({
					id: 'review-1',
					status: 'approved',
					updatedAt: updatedAt.toISOString(),
				}),
			],
			summary: { total: 2, approved: 1, rejected: 1 },
			nextCursor: updatedAt.toISOString(),
		});
	});

	it('creates a review case from an existing run', async () => {
		const execution = executionFixture();
		const queryBuilder = mockRunLookup(execution);
		agentEvaluationCaseRepository.findByExecutionId.mockResolvedValue(null);
		agentEvaluationCaseRepository.create.mockReturnValue({
			id: 'review-1',
			projectId: 'project-1',
			agentId: 'agent-1',
			executionId: 'execution-1',
			status: 'approved',
			rejectionReason: null,
			input: execution.userMessage,
			expectedOutput: '',
			actualOutput: '',
			notes: null,
			createdById: 'user-1',
			updatedById: null,
			createdAt: now,
			updatedAt: now,
		} as AgentEvaluationCase);
		agentEvaluationCaseRepository.save.mockImplementation(
			async (review) =>
				({
					...review,
					id: 'review-1',
					createdAt: now,
					updatedAt: now,
				}) as AgentEvaluationCase,
		);

		const payload: UpsertAgentReviewCaseDto = {
			status: 'approved',
			expectedOutput: 'Expected summary',
			notes: ' Looks good ',
		};

		const review = await service.upsertRunReview(
			'project-1',
			'agent-1',
			'execution-1',
			payload,
			'user-1',
		);

		expect(agentEvaluationCaseRepository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				projectId: 'project-1',
				agentId: 'agent-1',
				agentVersionId: 'version-1',
				executionId: 'execution-1',
				status: 'approved',
				rejectionReason: null,
				input: execution.userMessage,
				expectedOutput: 'Expected summary',
				actualOutput: execution.assistantResponse,
				notes: 'Looks good',
				createdById: 'user-1',
				updatedById: 'user-1',
			}),
		);
		const selectedExecutionColumns = queryBuilder.select.mock.calls[0][0] as string[];
		expect(selectedExecutionColumns).not.toContain('execution.workingMemory');
		expect(review).toEqual(
			expect.objectContaining({
				id: 'review-1',
				status: 'approved',
				rejectionReason: null,
				expectedOutput: 'Expected summary',
				actualOutput: execution.assistantResponse,
				createdAt: now.toISOString(),
			}),
		);
	});

	it('stores a rejection reason for rejected review cases', async () => {
		const execution = executionFixture();
		mockRunLookup(execution);
		agentEvaluationCaseRepository.findByExecutionId.mockResolvedValue(null);
		agentEvaluationCaseRepository.create.mockReturnValue({
			id: 'review-1',
			projectId: 'project-1',
			agentId: 'agent-1',
			agentVersionId: 'version-1',
			executionId: 'execution-1',
			status: 'approved',
			rejectionReason: null,
			input: execution.userMessage,
			expectedOutput: '',
			actualOutput: '',
			notes: null,
			createdById: 'user-1',
			updatedById: null,
			createdAt: now,
			updatedAt: now,
		} as AgentEvaluationCase);
		agentEvaluationCaseRepository.save.mockImplementation(
			async (review) =>
				({
					...review,
					id: 'review-1',
					createdAt: now,
					updatedAt: now,
				}) as AgentEvaluationCase,
		);

		const review = await service.upsertRunReview(
			'project-1',
			'agent-1',
			'execution-1',
			{ status: 'rejected', rejectionReason: 'wrong_tool' },
			'user-1',
		);

		expect(agentEvaluationCaseRepository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 'rejected',
				rejectionReason: 'wrong_tool',
			}),
		);
		expect(review).toEqual(
			expect.objectContaining({
				status: 'rejected',
				rejectionReason: 'wrong_tool',
			}),
		);
	});

	it('defaults missing rejection reasons for rejected review cases', async () => {
		const execution = executionFixture();
		mockRunLookup(execution);
		agentEvaluationCaseRepository.findByExecutionId.mockResolvedValue(reviewFixture());
		agentEvaluationCaseRepository.save.mockImplementation(
			async (review) =>
				({
					...review,
					updatedAt: now,
				}) as AgentEvaluationCase,
		);

		await service.upsertRunReview(
			'project-1',
			'agent-1',
			'execution-1',
			{ status: 'rejected' },
			'user-1',
		);

		expect(agentEvaluationCaseRepository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 'rejected',
				rejectionReason: DEFAULT_AGENT_REVIEW_REJECTION_REASON,
			}),
		);
	});

	it('does not create a review case for a run outside the agent project', async () => {
		mockRunLookup(null);

		const review = await service.upsertRunReview(
			'project-1',
			'agent-1',
			'execution-1',
			{ status: 'rejected' },
			'user-1',
		);

		expect(review).toBeNull();
		expect(agentEvaluationCaseRepository.save).not.toHaveBeenCalled();
	});
});

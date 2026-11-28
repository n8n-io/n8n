import type { User } from '@n8n/db';
import { NotFoundError, UnprocessableRequestError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { AgentExecutionService } from '../agent-execution.service';
import { AgentPublicRunService } from '../agent-public-run.service';
import type { AgentSessionStopService } from '../agent-session-stop.service';
import type { AgentTestRunService } from '../agent-test-run.service';
import type { AgentsService } from '../agents.service';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { ProjectAgent } from '../entities/agent.entity';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { AgentExecutionRepository } from '../repositories/agent-execution.repository';

describe('AgentPublicRunService', () => {
	const agentsService = mock<AgentsService>();
	const agentTestRunService = mock<AgentTestRunService>();
	const executionRepository = mock<AgentExecutionRepository>();
	const executionService = mock<AgentExecutionService>();
	const sessionStopService = mock<AgentSessionStopService>();
	const service = new AgentPublicRunService(
		agentsService,
		agentTestRunService,
		executionRepository,
		executionService,
		sessionStopService,
	);
	const user = { id: 'user-1' } as User;

	/** A published agent: the run uses `activeVersion`, never the draft `schema`. */
	const agent = {
		id: 'agent-1',
		projectId: 'project-1',
		activeVersionId: 'version-1',
		activeVersion: { schema: { tools: [], mcpServers: [] } },
		schema: { tools: [], mcpServers: [] },
		integrations: [],
	} as unknown as ProjectAgent;

	beforeEach(() => {
		vi.clearAllMocks();
		agentsService.findById.mockResolvedValue(agent);
	});

	describe('run', () => {
		it('returns the recorded execution for a completed run', async () => {
			agentTestRunService.executePublishedRun.mockResolvedValue({
				status: 'completed',
				response: 'Hello',
				sessionId: 'session-1',
				executionId: 'execution-1',
			});
			executionRepository.findExecution.mockResolvedValue({
				status: 'success',
				promptTokens: 2,
				completionTokens: 3,
				totalTokens: 5,
				cost: null,
				error: null,
			} as AgentExecution);

			await expect(service.run(user, 'agent-1', { message: 'Hi' })).resolves.toEqual({
				response: 'Hello',
				sessionId: 'session-1',
				executionId: 'execution-1',
				status: 'success',
				usage: { promptTokens: 2, completionTokens: 3, totalTokens: 5, cost: null },
			});
			expect(agentTestRunService.executePublishedRun).toHaveBeenCalledWith({
				agentId: 'agent-1',
				projectId: 'project-1',
				message: 'Hi',
				sessionId: undefined,
				user,
			});
		});

		it('passes sessionId through for a follow-up run', async () => {
			agentTestRunService.executePublishedRun.mockResolvedValue({
				status: 'completed',
				response: 'Again',
				sessionId: 'session-1',
				executionId: 'execution-2',
			});
			executionRepository.findExecution.mockResolvedValue({
				status: 'success',
				promptTokens: null,
				completionTokens: null,
				totalTokens: null,
				cost: null,
				error: null,
			} as AgentExecution);

			await service.run(user, 'agent-1', { message: 'Continue', sessionId: 'session-1' });

			expect(agentTestRunService.executePublishedRun).toHaveBeenCalledWith(
				expect.objectContaining({ sessionId: 'session-1' }),
			);
		});

		it('returns 404 for an unknown agent or session', async () => {
			agentsService.findById.mockResolvedValue(null);
			await expect(service.run(user, 'missing', { message: 'Hi' })).rejects.toThrow(NotFoundError);

			agentsService.findById.mockResolvedValue(agent);
			agentTestRunService.executePublishedRun.mockResolvedValue({ status: 'session_not_found' });
			await expect(
				service.run(user, 'agent-1', { message: 'Hi', sessionId: 'missing' }),
			).rejects.toThrow(NotFoundError);
		});

		it('returns 422 when the agent has no published version', async () => {
			agentsService.findById.mockResolvedValue({ ...agent, activeVersionId: null });

			await expect(service.run(user, 'agent-1', { message: 'Hi' })).rejects.toThrow(
				UnprocessableRequestError,
			);
			await expect(service.run(user, 'agent-1', { message: 'Hi' })).rejects.toThrow(
				/no published version/,
			);
			expect(agentTestRunService.executePublishedRun).not.toHaveBeenCalled();
		});

		it.each([
			{
				name: 'workflow tool',
				publishedSchema: { tools: [{ type: 'workflow', requireApproval: true, enabled: true }] },
			},
			{
				name: 'MCP server',
				publishedSchema: {
					mcpServers: [
						{
							toolPermissions: {
								categories: { read: 'require_approval', write: 'blocked' },
							},
						},
					],
				},
			},
		])(
			'returns 422 before running when the published version uses a $name that needs approval',
			async ({ publishedSchema }) => {
				agentsService.findById.mockResolvedValue({
					...agent,
					activeVersion: {
						schema: {
							tools: [],
							mcpServers: [],
							...publishedSchema,
						},
					},
				} as unknown as ProjectAgent);

				await expect(service.run(user, 'agent-1', { message: 'Hi' })).rejects.toThrow(
					UnprocessableRequestError,
				);
				expect(agentTestRunService.executePublishedRun).not.toHaveBeenCalled();
			},
		);

		it('returns 422 before running when the published version has an approvable integration', async () => {
			agentsService.findById.mockResolvedValue({
				...agent,
				integrations: [{ type: 'slack', approval: { mode: 'global' } }],
			} as unknown as ProjectAgent);

			await expect(service.run(user, 'agent-1', { message: 'Hi' })).rejects.toThrow(
				UnprocessableRequestError,
			);
			expect(agentTestRunService.executePublishedRun).not.toHaveBeenCalled();
		});

		it('runs when only the draft needs approval', async () => {
			agentsService.findById.mockResolvedValue({
				...agent,
				schema: { tools: [{ type: 'workflow', requireApproval: true, enabled: true }] },
			} as unknown as ProjectAgent);
			agentTestRunService.executePublishedRun.mockResolvedValue({
				status: 'completed',
				response: 'Hello',
				sessionId: 'session-1',
				executionId: 'execution-1',
			});
			executionRepository.findExecution.mockResolvedValue({
				status: 'success',
				promptTokens: null,
				completionTokens: null,
				totalTokens: null,
				cost: null,
				error: null,
			} as AgentExecution);

			await expect(service.run(user, 'agent-1', { message: 'Hi' })).resolves.toEqual(
				expect.objectContaining({ status: 'success' }),
			);
			expect(agentTestRunService.executePublishedRun).toHaveBeenCalled();
		});

		it('cancels a suspended run before returning 422', async () => {
			const suspensions = [{ runId: 'run-1', toolCallId: 'call-1', toolName: 'lookup' }];
			agentTestRunService.executePublishedRun.mockResolvedValue({
				status: 'suspended',
				response: '',
				sessionId: 'session-1',
				executionId: 'execution-1',
				suspensions,
			});
			agentTestRunService.cancelSuspendedRuns.mockResolvedValue(true);

			await expect(service.run(user, 'agent-1', { message: 'Hi' })).rejects.toThrow(
				UnprocessableRequestError,
			);
			expect(agentTestRunService.cancelSuspendedRuns).toHaveBeenCalledWith({
				agentId: 'agent-1',
				suspensions,
				userId: 'user-1',
				resourceId: 'public-api:user-1',
			});
		});

		it('names the execution when a suspended run cannot be cancelled', async () => {
			agentTestRunService.executePublishedRun.mockResolvedValue({
				status: 'suspended',
				response: '',
				sessionId: 'session-1',
				executionId: 'execution-1',
				suspensions: [{ runId: 'run-1', toolCallId: 'call-1', toolName: 'lookup' }],
			});
			agentTestRunService.cancelSuspendedRuns.mockResolvedValue(false);

			await expect(service.run(user, 'agent-1', { message: 'Hi' })).rejects.toThrow(
				/Stop execution execution-1/,
			);
		});
	});

	describe('stop', () => {
		const thread = {
			id: 'thread-1',
			agentId: 'agent-1',
			projectId: 'project-1',
			accessScope: 'user',
			ownerId: 'user-1',
			parentThreadId: null,
		} as AgentExecutionThread;

		it('returns the status of a finished run', async () => {
			executionRepository.findExecution.mockResolvedValue({
				threadId: 'thread-1',
				status: 'success',
			} as AgentExecution);
			executionService.findThreadById.mockResolvedValue(thread);

			await expect(service.stop(user, 'agent-1', 'execution-1')).resolves.toEqual({
				executionId: 'execution-1',
				status: 'success',
			});
			expect(sessionStopService.abortExecution).not.toHaveBeenCalled();
		});

		it('aborts a running run through the execution controller', async () => {
			executionRepository.findExecution.mockResolvedValue({
				threadId: 'thread-1',
				status: 'running',
			} as AgentExecution);
			executionService.findThreadById.mockResolvedValue(thread);
			sessionStopService.abortExecution.mockResolvedValue(true);

			await expect(service.stop(user, 'agent-1', 'execution-1')).resolves.toEqual({
				executionId: 'execution-1',
				status: 'cancel_requested',
			});
			expect(sessionStopService.abortExecution).toHaveBeenCalledWith(
				'agent-1',
				'thread-1',
				'execution-1',
			);
		});

		it('returns the finished status when this process cannot abort the run', async () => {
			executionRepository.findExecution
				.mockResolvedValueOnce({
					threadId: 'thread-1',
					status: 'running',
				} as AgentExecution)
				.mockResolvedValueOnce({
					threadId: 'thread-1',
					status: 'success',
				} as AgentExecution);
			executionService.findThreadById.mockResolvedValue(thread);
			sessionStopService.abortExecution.mockResolvedValue(false);

			await expect(service.stop(user, 'agent-1', 'execution-1')).resolves.toEqual({
				executionId: 'execution-1',
				status: 'success',
			});
		});

		it('returns 404 for an unknown execution or a thread the user does not own', async () => {
			executionRepository.findExecution.mockResolvedValue(null);
			await expect(service.stop(user, 'agent-1', 'missing')).rejects.toThrow(NotFoundError);

			executionRepository.findExecution.mockResolvedValue({
				threadId: 'thread-1',
				status: 'running',
			} as AgentExecution);
			executionService.findThreadById.mockResolvedValue({ ...thread, ownerId: 'user-2' });
			await expect(service.stop(user, 'agent-1', 'execution-1')).rejects.toThrow(NotFoundError);
		});
	});

	describe('listExecutions', () => {
		it('lists the runs the user can see, with filters and pagination', async () => {
			executionRepository.findListForAgent.mockResolvedValue([
				[
					{
						id: 'execution-1',
						threadId: 'thread-1',
						status: 'running',
						source: 'public_api',
						createdAt: new Date('2026-11-19T14:00:00Z'),
						startedAt: new Date('2026-11-19T14:00:01Z'),
						stoppedAt: null,
						promptTokens: 2,
						completionTokens: 3,
						totalTokens: 5,
						cost: 0.1,
					} as unknown as AgentExecution,
				],
				1,
			]);

			await expect(
				service.listExecutions(user, 'agent-1', {
					sessionId: 'thread-1',
					status: 'running',
					offset: 0,
					limit: 100,
				}),
			).resolves.toEqual({
				count: 1,
				data: [
					{
						executionId: 'execution-1',
						sessionId: 'thread-1',
						status: 'running',
						source: 'public_api',
						createdAt: '2026-11-19T14:00:00.000Z',
						startedAt: '2026-11-19T14:00:01.000Z',
						stoppedAt: null,
						usage: { promptTokens: 2, completionTokens: 3, totalTokens: 5, cost: 0.1 },
					},
				],
			});
			expect(executionRepository.findListForAgent).toHaveBeenCalledWith(
				'agent-1',
				'user-1',
				{ sessionId: 'thread-1', status: 'running' },
				{ offset: 0, limit: 100 },
			);
		});

		it('returns 404 for an unknown agent', async () => {
			agentsService.findById.mockResolvedValue(null);

			await expect(
				service.listExecutions(user, 'missing', { offset: 0, limit: 100 }),
			).rejects.toThrow(NotFoundError);
			expect(executionRepository.findListForAgent).not.toHaveBeenCalled();
		});
	});
});

import type { User } from '@n8n/db';
import { NotFoundError, UnprocessableRequestError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';

import type { AgentChatExecutionService } from '../agent-chat-execution.service';
import type { AgentExecutionService } from '../agent-execution.service';
import { AgentPublicRunService } from '../agent-public-run.service';
import type { AgentTestRunService } from '../agent-test-run.service';
import type { AgentsService } from '../agents.service';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { ProjectAgent } from '../entities/agent.entity';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { AgentExecutionRepository } from '../repositories/agent-execution.repository';

describe('AgentPublicRunService', () => {
	const agentsService = mock<AgentsService>();
	const agentTestRunService = mock<AgentTestRunService>();
	const credentialsService = mock<CredentialsService>();
	const executionRepository = mock<AgentExecutionRepository>();
	const executionService = mock<AgentExecutionService>();
	const chatExecutionService = mock<AgentChatExecutionService>();
	const service = new AgentPublicRunService(
		agentsService,
		agentTestRunService,
		credentialsService,
		executionRepository,
		executionService,
		chatExecutionService,
	);
	const user = { id: 'user-1' } as User;

	const agent = {
		id: 'agent-1',
		projectId: 'project-1',
		schema: { tools: [], mcpServers: [] },
		integrations: [],
	} as unknown as ProjectAgent;

	beforeEach(() => {
		vi.clearAllMocks();
		agentsService.findById.mockResolvedValue(agent);
	});

	describe('run', () => {
		it('returns the recorded execution for a completed run', async () => {
			agentTestRunService.executeDraftRun.mockResolvedValue({
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
			expect(agentTestRunService.executeDraftRun).toHaveBeenCalledWith(
				expect.objectContaining({
					agentId: 'agent-1',
					projectId: 'project-1',
					message: 'Hi',
					source: 'public_api',
					user,
				}),
			);
		});

		it('passes sessionId through for a follow-up run', async () => {
			agentTestRunService.executeDraftRun.mockResolvedValue({
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

			expect(agentTestRunService.executeDraftRun).toHaveBeenCalledWith(
				expect.objectContaining({ sessionId: 'session-1' }),
			);
		});

		it('returns 404 for an unknown agent or session', async () => {
			agentsService.findById.mockResolvedValue(null);
			await expect(service.run(user, 'missing', { message: 'Hi' })).rejects.toThrow(NotFoundError);

			agentsService.findById.mockResolvedValue(agent);
			agentTestRunService.executeDraftRun.mockResolvedValue({ status: 'session_not_found' });
			await expect(
				service.run(user, 'agent-1', { message: 'Hi', sessionId: 'missing' }),
			).rejects.toThrow(NotFoundError);
		});

		it('returns 422 when the agent is not runnable or needs approval', async () => {
			agentTestRunService.executeDraftRun.mockResolvedValue({
				status: 'agent_misconfigured',
				missing: ['model'],
			});
			await expect(service.run(user, 'agent-1', { message: 'Hi' })).rejects.toThrow(
				UnprocessableRequestError,
			);

			agentsService.findById.mockResolvedValue({
				...agent,
				schema: { tools: [{ type: 'workflow', requireApproval: true, enabled: true }] },
			} as unknown as ProjectAgent);
			await expect(service.run(user, 'agent-1', { message: 'Hi' })).rejects.toThrow(
				UnprocessableRequestError,
			);
			expect(agentTestRunService.executeDraftRun).toHaveBeenCalledTimes(1);
		});

		it('returns 422 when the run stops for approval', async () => {
			agentTestRunService.executeDraftRun.mockResolvedValue({
				status: 'suspended',
				response: '',
				sessionId: 'session-1',
				executionId: 'execution-1',
				suspensions: [],
			});

			await expect(service.run(user, 'agent-1', { message: 'Hi' })).rejects.toThrow(
				UnprocessableRequestError,
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
			expect(chatExecutionService.requestCancel).not.toHaveBeenCalled();
		});

		it('requests cancel for a running run', async () => {
			executionRepository.findExecution.mockResolvedValue({
				threadId: 'thread-1',
				status: 'running',
			} as AgentExecution);
			executionService.findThreadById.mockResolvedValue(thread);
			chatExecutionService.requestCancel.mockResolvedValue(true);

			await expect(service.stop(user, 'agent-1', 'execution-1')).resolves.toEqual({
				executionId: 'execution-1',
				status: 'cancel_requested',
			});
			expect(chatExecutionService.requestCancel).toHaveBeenCalledWith(
				expect.objectContaining({
					agentId: 'agent-1',
					executionId: 'execution-1',
					threadId: 'thread-1',
					userId: 'user-1',
					surface: 'preview',
				}),
			);
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
});

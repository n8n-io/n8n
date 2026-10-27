import type { ExecutionsConfig } from '@n8n/config';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentChatExecutionService } from '../agent-chat-execution.service';
import { AgentSessionStopService } from '../agent-session-stop.service';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import { SystemAgentRegistry } from '../system-agents/system-agent-registry';

describe('AgentSessionStopService', () => {
	const executionService = mock<AgentExecutionService>();
	const repository = mock<AgentExecutionRepository>();
	const publisher = mock<Publisher>();
	const config = mock<ExecutionsConfig>({ mode: 'regular' });
	const systemAgents = new SystemAgentRegistry();
	const chatExecutions = mock<AgentChatExecutionService>();
	const service = new AgentSessionStopService(
		executionService,
		repository,
		publisher,
		config,
		systemAgents,
		chatExecutions,
	);
	const thread = mock<AgentExecutionThread>({
		id: 'thread-1',
		projectId: 'project-1',
		agentId: 'agent-1',
		accessScope: 'project',
		ownerId: null,
	});

	beforeEach(() => {
		vi.clearAllMocks();
		config.mode = 'regular';
		executionService.findAccessibleThreadById.mockResolvedValue(thread);
		repository.findRunningByThread.mockResolvedValue([
			mock<AgentExecution>({ id: 'execution-1', status: 'running', source: 'slack' }),
		]);
	});

	it.each(['slack', 'task', 'workflow', 'mcp', 'chat', 'n8n_chat_production', 'subagent'])(
		'stops a running %s execution',
		async (source) => {
			repository.findRunningByThread.mockResolvedValue([
				mock<AgentExecution>({ id: 'execution-1', status: 'running', source }),
			]);

			await expect(
				service.stopSession('project-1', 'agent-1', 'thread-1', 'user-1'),
			).resolves.toEqual({ cancelRequested: true });
			expect(executionService.stopExecution).toHaveBeenCalledExactlyOnceWith('execution-1');
			expect(executionService.findAccessibleThreadById).toHaveBeenCalledExactlyOnceWith(
				'thread-1',
				'project-1',
				'agent-1',
				'user-1',
			);
			expect(chatExecutions.cancelSessionWork).toHaveBeenCalledExactlyOnceWith(
				'agent-1',
				'thread-1',
				['execution-1'],
			);
			expect(publisher.publishCommand).not.toHaveBeenCalled();
		},
	);

	it('rejects a session outside the requested scope', async () => {
		executionService.findAccessibleThreadById.mockResolvedValue(null);

		await expect(service.stopSession('project-1', 'agent-1', 'thread-1', 'user-1')).rejects.toThrow(
			NotFoundError,
		);
		expect(repository.findRunningByThread).not.toHaveBeenCalled();
		expect(executionService.stopExecution).not.toHaveBeenCalled();
		expect(publisher.publishCommand).not.toHaveBeenCalled();
		expect(chatExecutions.cancelSessionWork).not.toHaveBeenCalled();
	});

	it('stops the current user’s private session', async () => {
		executionService.findAccessibleThreadById.mockResolvedValue(
			mock<AgentExecutionThread>({ ...thread, accessScope: 'user', ownerId: 'user-1' }),
		);

		await expect(
			service.stopSession('project-1', 'agent-1', 'thread-1', 'user-1'),
		).resolves.toEqual({ cancelRequested: true });
	});

	it('rejects a missing session', async () => {
		executionService.findAccessibleThreadById.mockResolvedValue(null);

		await expect(service.stopSession('project-1', 'agent-1', 'thread-1', 'user-1')).rejects.toThrow(
			NotFoundError,
		);
		expect(repository.findRunningByThread).not.toHaveBeenCalled();
	});

	it('keeps system Agent sessions on their own control route', async () => {
		vi.spyOn(systemAgents, 'has').mockReturnValueOnce(true);

		await expect(service.stopSession('project-1', 'agent-1', 'thread-1', 'user-1')).rejects.toThrow(
			NotFoundError,
		);
		expect(repository.findRunningByThread).not.toHaveBeenCalled();
	});

	it('does nothing when the session has already finished', async () => {
		repository.findRunningByThread.mockResolvedValue([]);

		await expect(
			service.stopSession('project-1', 'agent-1', 'thread-1', 'user-1'),
		).resolves.toEqual({ cancelRequested: false });
		expect(executionService.stopExecution).not.toHaveBeenCalled();
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});

	it('relays the selected executions to other processes in queue mode', async () => {
		config.mode = 'queue';
		repository.findRunningByThread.mockResolvedValue([
			mock<AgentExecution>({ id: 'execution-1' }),
			mock<AgentExecution>({ id: 'execution-2' }),
		]);

		await service.stopSession('project-1', 'agent-1', 'thread-1', 'user-1');

		expect(executionService.stopExecution.mock.calls).toEqual([['execution-1'], ['execution-2']]);
		expect(publisher.publishCommand).toHaveBeenCalledExactlyOnceWith({
			command: 'stop-agent-session',
			payload: {
				agentId: 'agent-1',
				threadId: 'thread-1',
				executionIds: ['execution-1', 'execution-2'],
			},
		});
	});

	it('stops only the executions named in a relayed request', async () => {
		await service.onStopSession({
			agentId: 'agent-1',
			threadId: 'thread-1',
			executionIds: ['remote-execution'],
		});

		expect(executionService.stopExecution).toHaveBeenCalledExactlyOnceWith('remote-execution');
		expect(repository.findRunningByThread).not.toHaveBeenCalled();
		expect(chatExecutions.cancelSessionWork).toHaveBeenCalledExactlyOnceWith(
			'agent-1',
			'thread-1',
			['remote-execution'],
		);
	});

	it('relays Stop even when local child cleanup fails', async () => {
		config.mode = 'queue';
		chatExecutions.cancelSessionWork.mockRejectedValueOnce(new Error('Cleanup failed'));

		await expect(service.stopSession('project-1', 'agent-1', 'thread-1', 'user-1')).rejects.toThrow(
			'Cleanup failed',
		);

		expect(executionService.stopExecution).toHaveBeenCalledWith('execution-1');
		expect(publisher.publishCommand).toHaveBeenCalledWith({
			command: 'stop-agent-session',
			payload: { agentId: 'agent-1', threadId: 'thread-1', executionIds: ['execution-1'] },
		});
	});
});

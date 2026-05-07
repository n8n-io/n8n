import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';

import { AgentExecutionService } from '../agent-execution.service';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { N8nMemory } from '../integrations/n8n-memory';
import type { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import type { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';

function makeThread(overrides: Partial<AgentExecutionThread> = {}): AgentExecutionThread {
	return {
		id: 'thread-1',
		agentId: 'agent-1',
		agentName: 'Agent',
		projectId: 'project-1',
		title: null,
		emoji: null,
		sessionNumber: 1,
		totalPromptTokens: 0,
		totalCompletionTokens: 0,
		totalCost: 0,
		totalDuration: 0,
		createdAt: new Date('2026-05-07T10:00:00Z'),
		updatedAt: new Date('2026-05-07T10:00:00Z'),
		...overrides,
	} as AgentExecutionThread;
}

describe('AgentExecutionService', () => {
	let service: AgentExecutionService;
	let agentExecutionRepository: jest.Mocked<AgentExecutionRepository>;
	let agentExecutionThreadRepository: jest.Mocked<AgentExecutionThreadRepository>;
	let n8nMemory: jest.Mocked<N8nMemory>;

	beforeEach(() => {
		jest.clearAllMocks();

		agentExecutionRepository = mock<AgentExecutionRepository>();
		agentExecutionThreadRepository = mock<AgentExecutionThreadRepository>();
		n8nMemory = mock<N8nMemory>();

		service = new AgentExecutionService(
			mockLogger(),
			agentExecutionRepository,
			agentExecutionThreadRepository,
			n8nMemory,
		);
	});

	describe('getThreadDetail', () => {
		it('returns the latest thread working memory after ownership validation', async () => {
			const thread = makeThread();
			const executions = [{ id: 'execution-1' }] as AgentExecution[];
			agentExecutionThreadRepository.findOneBy.mockResolvedValue(thread);
			agentExecutionRepository.findByThreadIdOrdered.mockResolvedValue(executions);
			n8nMemory.getWorkingMemory.mockResolvedValue('# Thread memory');

			const result = await service.getThreadDetail('thread-1', 'project-1', 'agent-1');

			expect(result).toEqual({ thread, executions, workingMemory: '# Thread memory' });
			expect(n8nMemory.getWorkingMemory).toHaveBeenCalledWith({
				threadId: 'thread-1',
				resourceId: 'thread-1',
				scope: 'thread',
			});
		});

		it('returns null working memory when the thread has no saved memory', async () => {
			const thread = makeThread();
			agentExecutionThreadRepository.findOneBy.mockResolvedValue(thread);
			agentExecutionRepository.findByThreadIdOrdered.mockResolvedValue([]);
			n8nMemory.getWorkingMemory.mockResolvedValue(null);

			const result = await service.getThreadDetail('thread-1', 'project-1', 'agent-1');

			expect(result).toEqual({ thread, executions: [], workingMemory: null });
		});

		it('does not read working memory for a thread outside the requested scope', async () => {
			agentExecutionThreadRepository.findOneBy.mockResolvedValue(
				makeThread({ projectId: 'other-project' }),
			);

			const result = await service.getThreadDetail('thread-1', 'project-1', 'agent-1');

			expect(result).toBeNull();
			expect(n8nMemory.getWorkingMemory).not.toHaveBeenCalled();
			expect(agentExecutionRepository.findByThreadIdOrdered).not.toHaveBeenCalled();
		});
	});

	describe('deleteThread', () => {
		it('cleans SDK memory before deleting the execution thread', async () => {
			agentExecutionThreadRepository.findOneBy.mockResolvedValue({
				id: 'thread-1',
				projectId: 'project-1',
			} as AgentExecutionThread);

			const result = await service.deleteThread('project-1', 'thread-1');

			expect(result).toBe(true);
			expect(n8nMemory.deleteThread).toHaveBeenCalledWith('thread-1');
			expect(agentExecutionThreadRepository.delete).toHaveBeenCalledWith({ id: 'thread-1' });
		});

		it('does not clean SDK memory when the execution thread is not found', async () => {
			agentExecutionThreadRepository.findOneBy.mockResolvedValue(null);

			const result = await service.deleteThread('project-1', 'thread-1');

			expect(result).toBe(false);
			expect(n8nMemory.deleteThread).not.toHaveBeenCalled();
			expect(agentExecutionThreadRepository.delete).not.toHaveBeenCalled();
		});
	});
});

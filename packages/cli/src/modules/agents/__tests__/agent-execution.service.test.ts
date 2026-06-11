import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';

import { AgentExecutionService } from '../agent-execution.service';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { MessageRecord } from '../execution-recorder';
import type { N8nMemory } from '../integrations/n8n-memory';
import type { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';
import type { AgentExecutionRepository } from '../repositories/agent-execution.repository';

type N8nMemoryImplementation = ReturnType<N8nMemory['getImplementation']>;

function makeThread(overrides: Partial<AgentExecutionThread> = {}): AgentExecutionThread {
	return {
		id: 'thread-1',
		agentId: 'agent-1',
		agentName: 'Agent',
		projectId: 'project-1',
		title: null,
		emoji: null,
		parentThreadId: null,
		parentAgentId: null,
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

function makeMessageRecord(overrides: Partial<MessageRecord> = {}): MessageRecord {
	return {
		assistantResponse: 'Done',
		model: null,
		finishReason: 'stop',
		usage: null,
		totalCost: null,
		toolCalls: [],
		timeline: [],
		startTime: 0,
		duration: 1,
		error: null,
		...overrides,
	};
}

describe('AgentExecutionService', () => {
	let service: AgentExecutionService;
	let agentExecutionRepository: jest.Mocked<AgentExecutionRepository>;
	let agentExecutionThreadRepository: jest.Mocked<AgentExecutionThreadRepository>;
	let n8nMemory: jest.Mocked<N8nMemory>;
	let memoryBackend: jest.Mocked<N8nMemoryImplementation>;

	beforeEach(() => {
		jest.clearAllMocks();

		agentExecutionRepository = mock<AgentExecutionRepository>();
		agentExecutionThreadRepository = mock<AgentExecutionThreadRepository>();
		n8nMemory = mock<N8nMemory>();
		memoryBackend = mock<N8nMemoryImplementation>();
		n8nMemory.getImplementation.mockReturnValue(memoryBackend);

		service = new AgentExecutionService(
			mockLogger(),
			agentExecutionRepository,
			agentExecutionThreadRepository,
			n8nMemory,
		);
	});

	describe('recordMessage', () => {
		it('passes thread metadata when creating a subagent execution session', async () => {
			const thread = makeThread({ parentThreadId: 'parent-thread-1' });
			const record: MessageRecord = {
				assistantResponse: 'Done',
				model: 'anthropic/claude-sonnet-4-5',
				finishReason: 'stop',
				usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
				totalCost: 0.01,
				toolCalls: [],
				timeline: [],
				startTime: Date.parse('2026-05-07T10:00:00Z'),
				duration: 1234,
				error: null,
			};
			agentExecutionThreadRepository.findOrCreate.mockResolvedValue({ thread, created: true });
			agentExecutionRepository.create.mockImplementation((entity) => entity as AgentExecution);
			agentExecutionRepository.save.mockResolvedValue({ id: 'execution-1' } as AgentExecution);

			await service.recordMessage({
				threadId: 'thread-1',
				agentId: 'agent-1',
				agentName: 'Agent',
				projectId: 'project-1',
				userMessage: 'Goal:\nResearch API behavior.',
				record,
				source: 'subagent',
				threadMetadata: {
					parentThreadId: 'parent-thread-1',
					parentAgentId: 'parent-agent-1',
				},
			});

			expect(agentExecutionThreadRepository.findOrCreate).toHaveBeenCalledWith(
				'thread-1',
				'agent-1',
				'Agent',
				'project-1',
				{
					parentThreadId: 'parent-thread-1',
					parentAgentId: 'parent-agent-1',
				},
				undefined,
				undefined,
			);
		});

		it('stamps the task snapshot version on newly created task sessions', async () => {
			agentExecutionThreadRepository.findOrCreate.mockResolvedValue({
				thread: makeThread({ title: 'Task run' }),
				created: false,
			});
			agentExecutionRepository.create.mockImplementation((data) => data as AgentExecution);
			agentExecutionRepository.save.mockResolvedValue({ id: 'execution-1' } as AgentExecution);

			await service.recordMessage({
				threadId: 'thread-1',
				agentId: 'agent-1',
				agentName: 'Agent',
				projectId: 'project-1',
				userMessage: 'Run task',
				record: makeMessageRecord(),
				source: 'task',
				taskId: 'task-1',
				taskVersionId: 'version-1',
			});

			expect(agentExecutionThreadRepository.findOrCreate).toHaveBeenCalledWith(
				'thread-1',
				'agent-1',
				'Agent',
				'project-1',
				undefined,
				'task-1',
				'version-1',
			);
		});

		it('syncs a generated title from memory on later messages when the thread has no title yet', async () => {
			agentExecutionThreadRepository.findOrCreate.mockResolvedValue({
				thread: makeThread({ title: null }),
				created: false,
			});
			agentExecutionRepository.create.mockImplementation((data) => data as AgentExecution);
			agentExecutionRepository.save.mockResolvedValue({ id: 'execution-1' } as AgentExecution);
			memoryBackend.getThread.mockResolvedValue({
				id: 'thread-1',
				resourceId: 'user-1',
				title: 'Workflow builder chat',
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await service.recordMessage({
				threadId: 'thread-1',
				agentId: 'agent-1',
				agentName: 'Agent',
				projectId: 'project-1',
				userMessage: 'Follow up',
				record: makeMessageRecord(),
			});

			expect(agentExecutionThreadRepository.update).toHaveBeenCalledWith('thread-1', {
				title: 'Workflow builder chat',
			});
		});

		it('does not sync title from memory when the thread already has a title', async () => {
			agentExecutionThreadRepository.findOrCreate.mockResolvedValue({
				thread: makeThread({ title: 'Existing title' }),
				created: false,
			});
			agentExecutionRepository.create.mockImplementation((data) => data as AgentExecution);
			agentExecutionRepository.save.mockResolvedValue({ id: 'execution-1' } as AgentExecution);

			await service.recordMessage({
				threadId: 'thread-1',
				agentId: 'agent-1',
				agentName: 'Agent',
				projectId: 'project-1',
				userMessage: 'Follow up',
				record: makeMessageRecord(),
			});

			expect(memoryBackend.getThread).not.toHaveBeenCalled();
			expect(agentExecutionThreadRepository.update).not.toHaveBeenCalled();
		});
	});

	describe('getThreadDetail', () => {
		it('returns thread executions after ownership validation', async () => {
			const thread = makeThread();
			const executions = [{ id: 'execution-1' }] as AgentExecution[];
			agentExecutionThreadRepository.findOneBy.mockResolvedValue(thread);
			agentExecutionRepository.findByThreadIdOrdered.mockResolvedValue(executions);

			const result = await service.getThreadDetail('thread-1', 'project-1', 'agent-1');

			expect(result).toEqual({ thread, executions });
		});

		it('does not read executions for a thread outside the requested scope', async () => {
			agentExecutionThreadRepository.findOneBy.mockResolvedValue(
				makeThread({ projectId: 'other-project' }),
			);

			const result = await service.getThreadDetail('thread-1', 'project-1', 'agent-1');

			expect(result).toBeNull();
			expect(agentExecutionRepository.findByThreadIdOrdered).not.toHaveBeenCalled();
		});
	});

	describe('deleteThread', () => {
		it('cleans SDK memory before deleting the execution thread', async () => {
			agentExecutionThreadRepository.findOneBy.mockResolvedValue({
				id: 'thread-1',
				agentId: 'agent-1',
				projectId: 'project-1',
			} as AgentExecutionThread);

			const result = await service.deleteThread('project-1', 'thread-1');

			expect(result).toBe(true);
			expect(n8nMemory.getImplementation).toHaveBeenCalledWith('agent-1');
			expect(memoryBackend.deleteThread).toHaveBeenCalledWith('thread-1');
			expect(agentExecutionThreadRepository.delete).toHaveBeenCalledWith({ id: 'thread-1' });
		});

		it('does not clean SDK memory when the execution thread is not found', async () => {
			agentExecutionThreadRepository.findOneBy.mockResolvedValue(null);

			const result = await service.deleteThread('project-1', 'thread-1');

			expect(result).toBe(false);
			expect(n8nMemory.getImplementation).not.toHaveBeenCalled();
			expect(memoryBackend.deleteThread).not.toHaveBeenCalled();
			expect(agentExecutionThreadRepository.delete).not.toHaveBeenCalled();
		});
	});
});

import type { Mocked } from 'vitest';
import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'vitest-mock-extended';

import type { Telemetry } from '@/telemetry';

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
		timeline: [],
		startTime: 0,
		duration: 1,
		error: null,
		...overrides,
	};
}

describe('AgentExecutionService', () => {
	let service: AgentExecutionService;
	let agentExecutionRepository: Mocked<AgentExecutionRepository>;
	let agentExecutionThreadRepository: Mocked<AgentExecutionThreadRepository>;
	let n8nMemory: Mocked<N8nMemory>;
	let memoryBackend: Mocked<N8nMemoryImplementation>;
	let telemetry: Mocked<Telemetry>;

	beforeEach(() => {
		vi.clearAllMocks();

		agentExecutionRepository = mock<AgentExecutionRepository>();
		agentExecutionThreadRepository = mock<AgentExecutionThreadRepository>();
		n8nMemory = mock<N8nMemory>();
		memoryBackend = mock<N8nMemoryImplementation>();
		n8nMemory.getImplementation.mockReturnValue(memoryBackend);
		telemetry = mock<Telemetry>();

		service = new AgentExecutionService(
			mockLogger(),
			agentExecutionRepository,
			agentExecutionThreadRepository,
			n8nMemory,
			telemetry,
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

		it('tracks succeeded turn telemetry after recording the execution', async () => {
			agentExecutionThreadRepository.findOrCreate.mockResolvedValue({
				thread: makeThread(),
				created: false,
			});
			agentExecutionRepository.create.mockImplementation((data) => data as AgentExecution);
			agentExecutionRepository.save.mockResolvedValue({ id: 'execution-1' } as AgentExecution);

			await service.recordMessage({
				threadId: 'thread-1',
				agentId: 'agent-1',
				agentName: 'Agent',
				projectId: 'project-1',
				userMessage: 'Run',
				record: makeMessageRecord({
					usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
					totalCost: 25,
					timeline: [
						{
							type: 'tool-call',
							kind: 'tool',
							name: 'lookup',
							toolCallId: 'tc1',
							input: {},
							output: {},
							startTime: 0,
							endTime: 123,
							success: true,
						},
					],
					duration: 123,
				}),
				telemetry: {
					runType: 'test',
					configuration: {
						model: 'anthropic/claude-sonnet-4-5',
						channels: [],
						tool_types: ['custom'],
						tool_count: 1,
						num_skills: 0,
						memory_type: 'none',
					},
				},
			});

			expect(telemetry.trackAgentTurnFinished).toHaveBeenCalledWith({
				agent_id: 'agent-1',
				thread_id: 'thread-1',
				run_type: 'test',
				turn_status: 'succeeded',
				configuration: {
					model: 'anthropic/claude-sonnet-4-5',
					channels: [],
					tool_types: ['custom'],
					tool_count: 1,
					num_skills: 0,
					memory_type: 'none',
				},
				latency_ms: 123,
				cost: 25,
				tool_call_count: 1,
			});
		});

		it('tracks failed turn telemetry and does not reject when telemetry throws', async () => {
			agentExecutionThreadRepository.findOrCreate.mockResolvedValue({
				thread: makeThread(),
				created: false,
			});
			agentExecutionRepository.create.mockImplementation((data) => data as AgentExecution);
			agentExecutionRepository.save.mockResolvedValue({ id: 'execution-1' } as AgentExecution);
			telemetry.trackAgentTurnFinished.mockImplementation(() => {
				throw new Error('telemetry failed');
			});

			await expect(
				service.recordMessage({
					threadId: 'thread-1',
					agentId: 'agent-1',
					agentName: 'Agent',
					projectId: 'project-1',
					userMessage: 'Run',
					record: makeMessageRecord({ error: 'model failed', totalCost: null, duration: 456 }),
					telemetry: {
						runType: 'production',
						configuration: {
							model: null,
							channels: [],
							tool_types: [],
							tool_count: 0,
							num_skills: 0,
							memory_type: 'none',
						},
					},
				}),
			).resolves.toBe('execution-1');

			expect(telemetry.trackAgentTurnFinished).toHaveBeenCalledWith(
				expect.objectContaining({
					agent_id: 'agent-1',
					thread_id: 'thread-1',
					run_type: 'production',
					turn_status: 'failed',
					latency_ms: 456,
					cost: 0,
					tool_call_count: 0,
				}),
			);
		});

		it('tracks finishReason error as a failed turn even without a recorded error', async () => {
			agentExecutionThreadRepository.findOrCreate.mockResolvedValue({
				thread: makeThread(),
				created: false,
			});
			agentExecutionRepository.create.mockImplementation((data) => data as AgentExecution);
			agentExecutionRepository.save.mockResolvedValue({ id: 'execution-1' } as AgentExecution);

			await service.recordMessage({
				threadId: 'thread-1',
				agentId: 'agent-1',
				agentName: 'Agent',
				projectId: 'project-1',
				userMessage: 'Run',
				record: makeMessageRecord({ finishReason: 'error', error: null }),
				telemetry: {
					runType: 'production',
					configuration: {
						model: null,
						channels: [],
						tool_types: [],
						tool_count: 0,
						num_skills: 0,
						memory_type: 'none',
					},
				},
			});

			expect(telemetry.trackAgentTurnFinished).toHaveBeenCalledWith(
				expect.objectContaining({
					turn_status: 'failed',
				}),
			);
		});

		it.each([
			{ name: 'suspended turn', record: makeMessageRecord(), hitlStatus: 'suspended' as const },
			{
				name: 'max-iterations turn',
				record: makeMessageRecord({ finishReason: 'max-iterations' }),
			},
		])('tracks $name without an error as succeeded', async ({ record, hitlStatus }) => {
			agentExecutionThreadRepository.findOrCreate.mockResolvedValue({
				thread: makeThread(),
				created: false,
			});
			agentExecutionRepository.create.mockImplementation((data) => data as AgentExecution);
			agentExecutionRepository.save.mockResolvedValue({ id: 'execution-1' } as AgentExecution);

			await service.recordMessage({
				threadId: 'thread-1',
				agentId: 'agent-1',
				agentName: 'Agent',
				projectId: 'project-1',
				userMessage: 'Run',
				record,
				...(hitlStatus ? { hitlStatus } : {}),
				telemetry: {
					runType: 'test',
					configuration: {
						model: null,
						channels: [],
						tool_types: [],
						tool_count: 0,
						num_skills: 0,
						memory_type: 'none',
					},
				},
			});

			expect(telemetry.trackAgentTurnFinished).toHaveBeenCalledWith(
				expect.objectContaining({
					turn_status: 'succeeded',
				}),
			);
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

		it.each([
			{ name: 'project', thread: makeThread({ projectId: 'other-project' }) },
			{ name: 'agent', thread: makeThread({ agentId: 'other-agent' }) },
		])('does not read executions for a thread outside the requested $name', async ({ thread }) => {
			agentExecutionThreadRepository.findOneBy.mockResolvedValue(thread);

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

			const result = await service.deleteThread('project-1', 'agent-1', 'thread-1');

			expect(result).toBe(true);
			expect(agentExecutionThreadRepository.findOneBy).toHaveBeenCalledWith({
				id: 'thread-1',
				projectId: 'project-1',
				agentId: 'agent-1',
			});
			expect(n8nMemory.getImplementation).toHaveBeenCalledWith('agent-1');
			expect(memoryBackend.deleteThread).toHaveBeenCalledWith('thread-1');
			expect(agentExecutionThreadRepository.delete).toHaveBeenCalledWith({ id: 'thread-1' });
		});

		it('does not clean SDK memory when the execution thread is not found', async () => {
			agentExecutionThreadRepository.findOneBy.mockResolvedValue(null);

			const result = await service.deleteThread('project-1', 'agent-1', 'thread-1');

			expect(result).toBe(false);
			expect(agentExecutionThreadRepository.findOneBy).toHaveBeenCalledWith({
				id: 'thread-1',
				projectId: 'project-1',
				agentId: 'agent-1',
			});
			expect(n8nMemory.getImplementation).not.toHaveBeenCalled();
			expect(memoryBackend.deleteThread).not.toHaveBeenCalled();
			expect(agentExecutionThreadRepository.delete).not.toHaveBeenCalled();
		});
	});
});

import { mockLogger } from '@n8n/backend-test-utils';
import type { AgentExecutionLogStorageLocation } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import type { Telemetry } from '@/telemetry';

import type { AgentExecutionLogPersistence } from '../agent-execution-log-persistence';
import { AgentExecutionService } from '../agent-execution.service';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { MessageRecord } from '../execution-recorder';
import type { N8nMemory } from '../integrations/n8n-memory';
import type { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';
import type { AgentExecutionRepository } from '../repositories/agent-execution.repository';

jest.mock('@n8n/utils', () => ({
	...jest.requireActual('@n8n/utils'),
	generateNanoId: jest.fn(() => 'execution-1'),
}));

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
	let telemetry: jest.Mocked<Telemetry>;
	let agentExecutionLogPersistence: jest.Mocked<AgentExecutionLogPersistence> & {
		currentLocation: AgentExecutionLogStorageLocation;
	};

	beforeEach(() => {
		jest.clearAllMocks();

		agentExecutionRepository = mock<AgentExecutionRepository>();
		agentExecutionThreadRepository = mock<AgentExecutionThreadRepository>();
		n8nMemory = mock<N8nMemory>();
		memoryBackend = mock<N8nMemoryImplementation>();
		n8nMemory.getImplementation.mockReturnValue(memoryBackend);
		telemetry = mock<Telemetry>();
		agentExecutionLogPersistence = {
			currentLocation: 'fs',
			write: jest.fn().mockResolvedValue(42),
			readMany: jest.fn().mockResolvedValue(new Map()),
			deleteExternal: jest.fn().mockResolvedValue(undefined),
			setS3Store: jest.fn(),
			setAzStore: jest.fn(),
		} as unknown as jest.Mocked<AgentExecutionLogPersistence> & {
			currentLocation: AgentExecutionLogStorageLocation;
		};
		agentExecutionRepository.findByThreadIdOrdered.mockResolvedValue([]);
		agentExecutionRepository.findLogRefsByThreadId.mockResolvedValue([]);

		service = new AgentExecutionService(
			mockLogger(),
			agentExecutionRepository,
			agentExecutionThreadRepository,
			n8nMemory,
			telemetry,
			agentExecutionLogPersistence,
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

		it('stores the log payload through the configured log storage mode', async () => {
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
					assistantResponse: 'Done',
					toolCalls: [{ name: 'lookup', input: { q: 'x' }, output: { ok: true } }],
				}),
			});

			const savedEntity = agentExecutionRepository.create.mock.calls[0][0] as Record<
				string,
				unknown
			>;
			expect(savedEntity).toEqual(
				expect.objectContaining({
					storedAt: 'fs',
					logSizeBytes: 42,
				}),
			);
			expect(savedEntity).not.toHaveProperty('assistantResponse');
			expect(savedEntity).not.toHaveProperty('toolCalls');
			expect(savedEntity).not.toHaveProperty('timeline');
			expect(savedEntity).not.toHaveProperty('error');
			expect(agentExecutionLogPersistence.write).toHaveBeenCalledWith(
				{ agentId: 'agent-1', threadId: 'thread-1', executionId: 'execution-1' },
				{
					assistantResponse: 'Done',
					toolCalls: [{ name: 'lookup', input: { q: 'x' }, output: { ok: true } }],
					timeline: null,
					error: null,
				},
				'fs',
			);
			expect(agentExecutionRepository.update).not.toHaveBeenCalled();
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
					toolCalls: [{ name: 'lookup', input: {}, output: {} }],
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
			const executions = [
				{ id: 'execution-1', threadId: 'thread-1', storedAt: 'fs' },
			] as AgentExecution[];
			agentExecutionThreadRepository.findOneBy.mockResolvedValue(thread);
			agentExecutionRepository.findByThreadIdOrdered.mockResolvedValue(executions);
			agentExecutionLogPersistence.readMany.mockResolvedValue(
				new Map([
					[
						'execution-1',
						{
							assistantResponse: 'Stored response',
							toolCalls: null,
							timeline: null,
							error: null,
							version: 1,
						},
					],
				]),
			);

			const result = await service.getThreadDetail('thread-1', 'project-1', 'agent-1');

			expect(result?.thread).toBe(thread);
			expect(result?.executions[0].assistantResponse).toBe('Stored response');
		});

		it('hydrates externally stored logs', async () => {
			const thread = makeThread();
			const executions = [
				{
					id: 'execution-1',
					threadId: 'thread-1',
					storedAt: 'fs',
				},
			] as AgentExecution[];
			agentExecutionThreadRepository.findOneBy.mockResolvedValue(thread);
			agentExecutionRepository.findByThreadIdOrdered.mockResolvedValue(executions);
			agentExecutionLogPersistence.readMany.mockResolvedValue(
				new Map([
					[
						'execution-1',
						{
							assistantResponse: 'Stored response',
							toolCalls: null,
							timeline: null,
							error: null,
							version: 1,
						},
					],
				]),
			);

			const result = await service.getThreadDetail('thread-1', 'project-1', 'agent-1');

			expect(agentExecutionLogPersistence.readMany).toHaveBeenCalledWith([
				{
					agentId: 'agent-1',
					threadId: 'thread-1',
					executionId: 'execution-1',
					storedAt: 'fs',
				},
			]);
			expect(result?.executions[0].assistantResponse).toBe('Stored response');
		});

		it('throws when an externally stored execution log is missing', async () => {
			const thread = makeThread();
			const executions = [
				{
					id: 'execution-1',
					threadId: 'thread-1',
					storedAt: 'fs',
				},
			] as AgentExecution[];
			agentExecutionThreadRepository.findOneBy.mockResolvedValue(thread);
			agentExecutionRepository.findByThreadIdOrdered.mockResolvedValue(executions);
			agentExecutionLogPersistence.readMany.mockResolvedValue(new Map());

			await expect(service.getThreadDetail('thread-1', 'project-1', 'agent-1')).rejects.toThrow(
				'Agent execution log bundle is missing',
			);
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
		it('cleans SDK memory and deletes the execution thread before external logs', async () => {
			agentExecutionThreadRepository.findOneBy.mockResolvedValue({
				id: 'thread-1',
				agentId: 'agent-1',
				projectId: 'project-1',
			} as AgentExecutionThread);
			agentExecutionRepository.findLogRefsByThreadId.mockResolvedValue([
				{
					id: 'fs-execution',
					threadId: 'thread-1',
					storedAt: 'fs',
				},
				{
					id: 's3-execution',
					threadId: 'thread-1',
					storedAt: 's3',
				},
			] as AgentExecution[]);

			const result = await service.deleteThread('project-1', 'agent-1', 'thread-1');

			expect(result).toBe(true);
			expect(agentExecutionThreadRepository.findOneBy).toHaveBeenCalledWith({
				id: 'thread-1',
				projectId: 'project-1',
				agentId: 'agent-1',
			});
			expect(n8nMemory.getImplementation).toHaveBeenCalledWith('agent-1');
			expect(memoryBackend.deleteThread).toHaveBeenCalledWith('thread-1');
			expect(agentExecutionLogPersistence.deleteExternal).toHaveBeenCalledWith([
				{
					agentId: 'agent-1',
					threadId: 'thread-1',
					executionId: 'fs-execution',
					storedAt: 'fs',
				},
				{
					agentId: 'agent-1',
					threadId: 'thread-1',
					executionId: 's3-execution',
					storedAt: 's3',
				},
			]);
			expect(agentExecutionThreadRepository.delete).toHaveBeenCalledWith({ id: 'thread-1' });
			expect(memoryBackend.deleteThread.mock.invocationCallOrder[0]).toBeLessThan(
				agentExecutionThreadRepository.delete.mock.invocationCallOrder[0],
			);
			expect(agentExecutionThreadRepository.delete.mock.invocationCallOrder[0]).toBeLessThan(
				agentExecutionLogPersistence.deleteExternal.mock.invocationCallOrder[0],
			);
		});

		it('does not delete the execution thread when memory cleanup fails', async () => {
			agentExecutionThreadRepository.findOneBy.mockResolvedValue({
				id: 'thread-1',
				agentId: 'agent-1',
				projectId: 'project-1',
			} as AgentExecutionThread);
			agentExecutionRepository.findLogRefsByThreadId.mockResolvedValue([
				{
					id: 'fs-execution',
					threadId: 'thread-1',
					storedAt: 'fs',
				},
			] as AgentExecution[]);
			memoryBackend.deleteThread.mockRejectedValue(new Error('memory cleanup failed'));

			await expect(service.deleteThread('project-1', 'agent-1', 'thread-1')).rejects.toThrow(
				'memory cleanup failed',
			);

			expect(agentExecutionLogPersistence.deleteExternal).not.toHaveBeenCalled();
			expect(agentExecutionThreadRepository.delete).not.toHaveBeenCalled();
		});

		it('keeps the thread deleted when external log cleanup fails', async () => {
			agentExecutionThreadRepository.findOneBy.mockResolvedValue({
				id: 'thread-1',
				agentId: 'agent-1',
				projectId: 'project-1',
			} as AgentExecutionThread);
			agentExecutionRepository.findLogRefsByThreadId.mockResolvedValue([
				{
					id: 'fs-execution',
					threadId: 'thread-1',
					storedAt: 'fs',
				},
			] as AgentExecution[]);
			agentExecutionLogPersistence.deleteExternal.mockRejectedValue(
				new Error('log cleanup failed'),
			);

			await expect(service.deleteThread('project-1', 'agent-1', 'thread-1')).resolves.toBe(true);

			expect(memoryBackend.deleteThread).toHaveBeenCalledWith('thread-1');
			expect(agentExecutionThreadRepository.delete).toHaveBeenCalledWith({ id: 'thread-1' });
			expect(agentExecutionLogPersistence.deleteExternal).toHaveBeenCalledWith([
				{
					agentId: 'agent-1',
					threadId: 'thread-1',
					executionId: 'fs-execution',
					storedAt: 'fs',
				},
			]);
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

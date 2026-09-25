import type { Mocked } from 'vitest';
import { mockLogger } from '@n8n/backend-test-utils';
import type { TransactionRunner } from '@n8n/db';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { mock } from 'vitest-mock-extended';
import type { ErrorReporter, StorageConfig } from 'n8n-core';

import type { Telemetry } from '@/telemetry';

import type { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import { AgentExecutionService, type RecordMessageParams } from '../agent-execution.service';
import type { AgentExecutionUpdateBroadcaster } from '../agent-execution-update-broadcaster';
import type {
	AgentExecutionThread,
	AgentThreadAccess,
} from '../entities/agent-execution-thread.entity';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { MessageRecord, TimelineEvent } from '../execution-recorder';
import type { AgentExecutionLogStore } from '../execution-log/agent-execution-log-store';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { N8nMemory } from '../integrations/n8n-memory';
import type { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';
import type { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import type { AgentMessageQueueRepository } from '../repositories/agent-message-queue.repository';

const previewAccess = { accessScope: 'user' as const, ownerId: 'user-1' };

type N8nMemoryImplementation = ReturnType<N8nMemory['getImplementation']>;

function makeThread(overrides: Partial<AgentExecutionThread> = {}): AgentExecutionThread {
	return {
		id: 'thread-1',
		agentId: 'agent-1',
		agentName: 'Agent',
		projectId: 'project-1',
		...previewAccess,
		title: null,
		emoji: null,
		parentThreadId: null,
		parentAgentId: null,
		taskId: null,
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
	let agentExecutionLogStore: Mocked<AgentExecutionLogStore>;
	let storageConfig: Mocked<StorageConfig>;
	let errorReporter: Mocked<ErrorReporter>;
	let agentChatAttachmentService: Mocked<AgentChatAttachmentService>;
	const checkpointStorage = mock<N8NCheckpointStorage>();
	let executionUpdateBroadcaster: Mocked<AgentExecutionUpdateBroadcaster>;
	const txRunner = mock<TransactionRunner>();
	const queueRepository = mock<AgentMessageQueueRepository>();

	beforeEach(() => {
		vi.clearAllMocks();

		agentExecutionRepository = mock<AgentExecutionRepository>();
		agentExecutionRepository.findRunningByThread.mockResolvedValue([]);
		agentExecutionRepository.touchRunning.mockResolvedValue(true);
		queueRepository.findActive.mockResolvedValue(null);
		queueRepository.findHead.mockResolvedValue(null);
		checkpointStorage.findSuspendedForThread.mockResolvedValue(null);
		agentExecutionRepository.updateIfRunning.mockResolvedValue(true);
		agentExecutionRepository.updateTimelineIfRunning.mockResolvedValue(true);
		agentExecutionThreadRepository = mock<AgentExecutionThreadRepository>();
		agentExecutionThreadRepository.lockById.mockResolvedValue(makeThread());
		n8nMemory = mock<N8nMemory>();
		memoryBackend = mock<N8nMemoryImplementation>();
		n8nMemory.getImplementation.mockReturnValue(memoryBackend);
		telemetry = mock<Telemetry>();
		agentExecutionLogStore = mock<AgentExecutionLogStore>();
		storageConfig = mock<StorageConfig>({ modeTag: 'db' });
		errorReporter = mock<ErrorReporter>();
		agentChatAttachmentService = mock<AgentChatAttachmentService>();
		executionUpdateBroadcaster = mock<AgentExecutionUpdateBroadcaster>();
		txRunner.run.mockImplementation(async (ctx, fn) => await fn(ctx));

		service = new AgentExecutionService(
			mockLogger(),
			agentExecutionRepository,
			agentExecutionThreadRepository,
			n8nMemory,
			telemetry,
			agentChatAttachmentService,
			agentExecutionLogStore,
			storageConfig,
			errorReporter,
			executionUpdateBroadcaster,
			checkpointStorage,
			txRunner,
			queueRepository,
		);
	});

	async function recordExecution(
		params: RecordMessageParams,
		access: AgentThreadAccess = previewAccess,
	): Promise<string> {
		const { record, ...startParams } = params;
		const executionId = await service.startExecutionRecording(
			{ ...startParams, access },
			new Date(record.startTime),
		);
		return await service.finalizeExecution(executionId, params);
	}

	describe('recordSideCallUsage', () => {
		it('increments the execution cost and thread totalCost by the report cost', async () => {
			await service.recordSideCallUsage('execution-1', 'thread-1', {
				task: 'title',
				model: 'openai/gpt-4o',
				cost: 0.00125,
				reportId: 'report-1',
			});

			expect(agentExecutionRepository.incrementCost).toHaveBeenCalledWith('execution-1', 0.00125);
			expect(agentExecutionThreadRepository.incrementUsage).toHaveBeenCalledWith(
				'thread-1',
				0,
				0,
				0.00125,
				0,
			);
		});

		it('does not apply the same reportId twice (idempotent)', async () => {
			const report = { task: 'observer', model: 'openai/gpt-4o', cost: 0.0007, reportId: 'dup-1' };

			await service.recordSideCallUsage('execution-1', 'thread-1', report);
			await service.recordSideCallUsage('execution-1', 'thread-1', report);

			expect(agentExecutionRepository.incrementCost).toHaveBeenCalledTimes(1);
			expect(agentExecutionThreadRepository.incrementUsage).toHaveBeenCalledTimes(1);
		});

		it('applies two different reportIds separately', async () => {
			await service.recordSideCallUsage('execution-1', 'thread-1', {
				task: 'title',
				model: 'openai/gpt-4o',
				cost: 0.001,
				reportId: 'report-a',
			});
			await service.recordSideCallUsage('execution-1', 'thread-1', {
				task: 'observer',
				model: 'openai/gpt-4o',
				cost: 0.002,
				reportId: 'report-b',
			});

			expect(agentExecutionRepository.incrementCost).toHaveBeenCalledTimes(2);
			expect(agentExecutionThreadRepository.incrementUsage).toHaveBeenCalledTimes(2);
		});

		it('swallows repository errors so a side-call cost failure never breaks the run', async () => {
			agentExecutionRepository.incrementCost.mockRejectedValueOnce(new Error('db down'));

			await expect(
				service.recordSideCallUsage('execution-1', 'thread-1', {
					task: 'title',
					model: 'openai/gpt-4o',
					cost: 0.001,
					reportId: 'report-err',
				}),
			).resolves.toBeUndefined();
		});
	});

	describe('startExecutionRecording', () => {
		it('stores the signal before publishing the execution update', async () => {
			agentExecutionThreadRepository.findOrCreate.mockResolvedValue({
				thread: makeThread(),
				created: false,
			});
			const execution = mock<AgentExecution>({ id: 'execution-1' });
			agentExecutionRepository.create.mockReturnValue(execution);
			agentExecutionRepository.saveInContext.mockResolvedValue(execution);
			const initialTimeline: TimelineEvent[] = [
				{
					type: 'background-task-signal',
					timestamp: 100,
					signal: {
						tasks: [{ id: 'job-1', title: 'Research', kind: 'subagent', status: 'completed' }],
					},
				},
			];
			const params = {
				access: previewAccess,
				threadId: 'thread-1',
				agentId: 'agent-1',
				agentName: 'Agent',
				projectId: 'project-1',
				userMessage: null,
				initialTimeline,
			};
			executionUpdateBroadcaster.notify.mockImplementation(() => {
				expect(agentExecutionRepository.saveInContext).toHaveBeenCalled();
				expect(agentExecutionRepository.create).toHaveBeenCalledWith(
					expect.objectContaining({
						timeline: initialTimeline,
						userMessage: null,
						status: 'running',
					}),
				);
			});
			const id = await service.startExecutionRecording(params, new Date(100));
			expect(executionUpdateBroadcaster.notify).toHaveBeenCalledOnce();
			await service.finalizeExecution(id, {
				...params,
				record: makeMessageRecord({ timeline: initialTimeline }),
			});
			expect(agentExecutionRepository.updateIfRunning).toHaveBeenCalledWith(
				id,
				expect.objectContaining({ timeline: initialTimeline }),
			);
		});

		it('keeps an execution alive until finalization and then synchronizes its title', async () => {
			vi.useFakeTimers();
			const titleLookupStarted = createDeferredPromise();
			const titleLookup =
				createDeferredPromise<Awaited<ReturnType<N8nMemoryImplementation['getThread']>>>();
			try {
				agentExecutionThreadRepository.findOrCreate.mockResolvedValue({
					thread: makeThread(),
					created: false,
				});
				memoryBackend.getThread.mockImplementation(async () => {
					titleLookupStarted.resolve();
					return await titleLookup.promise;
				});
				agentExecutionRepository.create.mockImplementation((data) => data as AgentExecution);
				agentExecutionRepository.saveInContext.mockResolvedValue({
					id: 'execution-1',
				} as AgentExecution);
				agentExecutionRepository.touchRunning.mockResolvedValue(true);
				agentExecutionRepository.updateIfRunning.mockResolvedValue(true);

				const recording = service.startExecutionRecording(
					{
						access: previewAccess,
						threadId: 'thread-1',
						agentId: 'agent-1',
						agentName: 'Agent',
						projectId: 'project-1',
						userMessage: 'Run',
					},
					new Date(),
				);
				const executionId = await recording;
				expect(memoryBackend.getThread).not.toHaveBeenCalled();
				await vi.advanceTimersByTimeAsync(30_000);
				expect(agentExecutionRepository.touchRunning).toHaveBeenCalledWith('execution-1');

				expect(executionUpdateBroadcaster.notify).toHaveBeenCalledWith({
					projectId: 'project-1',
					agentId: 'agent-1',
					threadId: 'thread-1',
					executionId,
				});
				expect(agentExecutionRepository.create).toHaveBeenCalledWith(
					expect.objectContaining({ status: 'running' }),
				);
				expect(agentExecutionRepository.touchRunning).toHaveBeenCalledWith(executionId);

				const finalization = service.finalizeExecution(executionId, {
					threadId: 'thread-1',
					agentId: 'agent-1',
					agentName: 'Agent',
					projectId: 'project-1',
					userMessage: 'Run',
					record: makeMessageRecord(),
				});
				await titleLookupStarted.promise;
				await vi.advanceTimersByTimeAsync(30_000);
				expect(agentExecutionRepository.touchRunning).toHaveBeenCalledOnce();
				titleLookup.resolve(null);
				await finalization;
			} finally {
				titleLookup.resolve(null);
				vi.useRealTimers();
			}
		});
	});

	async function startSnapshotExecution() {
		agentExecutionThreadRepository.findOrCreate.mockResolvedValue({
			thread: makeThread(),
			created: false,
		});
		agentExecutionRepository.saveInContext.mockResolvedValue(
			mock<AgentExecution>({ id: 'execution-1' }),
		);
		const params = {
			access: previewAccess,
			threadId: 'thread-1',
			agentId: 'agent-1',
			agentName: 'Agent',
			projectId: 'project-1',
			userMessage: 'Run',
		};
		await service.startExecutionRecording(params, new Date());
		executionUpdateBroadcaster.notify.mockClear();
		return params;
	}

	it('retries failed heartbeats and aborts only after confirmed ownership loss', async () => {
		vi.useFakeTimers();
		try {
			await startSnapshotExecution();
			const signal = service.getAbortSignal('execution-1');
			agentExecutionRepository.touchRunning
				.mockRejectedValueOnce(new Error('temporarily unavailable'))
				.mockResolvedValueOnce(true)
				.mockResolvedValue(false);
			await vi.advanceTimersByTimeAsync(30_000);
			expect(signal.aborted).toBe(false);

			const timeline: TimelineEvent[] = [{ type: 'text', content: 'Working', timestamp: 1 }];
			service.recordTimelineSnapshot({
				executionId: 'execution-1',
				projectId: 'project-1',
				agentId: 'agent-1',
				threadId: 'thread-1',
				timeline,
			});
			await vi.advanceTimersByTimeAsync(0);
			expect(agentExecutionRepository.updateTimelineIfRunning).toHaveBeenCalledWith(
				'execution-1',
				timeline,
			);

			await vi.advanceTimersByTimeAsync(30_000);
			expect(agentExecutionRepository.touchRunning).toHaveBeenCalledTimes(2);
			expect(signal.aborted).toBe(false);
			await vi.advanceTimersByTimeAsync(30_000);
			expect(signal.aborted).toBe(true);
			await vi.advanceTimersByTimeAsync(30_000);
			expect(agentExecutionRepository.touchRunning).toHaveBeenCalledTimes(3);
		} finally {
			vi.useRealTimers();
		}
	});

	it('serializes timeline snapshot updates', async () => {
		const params = await startSnapshotExecution();
		let releaseFirstWrite!: () => void;
		agentExecutionRepository.updateTimelineIfRunning
			.mockImplementationOnce(
				async () =>
					await new Promise<boolean>((resolve) => {
						releaseFirstWrite = () => resolve(true);
					}),
			)
			.mockResolvedValue(true);
		const first: TimelineEvent[] = [{ type: 'text', content: 'First', timestamp: 1 }];
		const second: TimelineEvent[] = [{ type: 'text', content: 'Second', timestamp: 1 }];

		service.recordTimelineSnapshot({
			executionId: 'execution-1',
			projectId: 'project-1',
			agentId: 'agent-1',
			threadId: 'thread-1',
			timeline: first,
		});
		service.recordTimelineSnapshot({
			executionId: 'execution-1',
			projectId: 'project-1',
			agentId: 'agent-1',
			threadId: 'thread-1',
			timeline: second,
		});
		await vi.waitFor(() =>
			expect(agentExecutionRepository.updateTimelineIfRunning).toHaveBeenCalledTimes(1),
		);
		releaseFirstWrite();
		await vi.waitFor(() =>
			expect(agentExecutionRepository.updateTimelineIfRunning).toHaveBeenCalledTimes(2),
		);

		expect(agentExecutionRepository.updateTimelineIfRunning).toHaveBeenLastCalledWith(
			'execution-1',
			second,
		);
		await service.finalizeExecution('execution-1', { ...params, record: makeMessageRecord() });
	});

	it('notifies only after a timeline snapshot retry persists', async () => {
		vi.useFakeTimers();
		try {
			const params = await startSnapshotExecution();
			agentExecutionRepository.updateTimelineIfRunning
				.mockRejectedValueOnce(new Error('temporarily unavailable'))
				.mockResolvedValueOnce(true);

			service.recordTimelineSnapshot({
				executionId: 'execution-1',
				projectId: 'project-1',
				agentId: 'agent-1',
				threadId: 'thread-1',
				timeline: [{ type: 'text', content: 'Working', timestamp: 1 }],
			});
			await vi.advanceTimersByTimeAsync(0);

			expect(agentExecutionRepository.updateTimelineIfRunning).toHaveBeenCalledTimes(1);
			expect(executionUpdateBroadcaster.notify).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(1_000);

			expect(executionUpdateBroadcaster.notify).toHaveBeenCalledWith({
				projectId: 'project-1',
				agentId: 'agent-1',
				threadId: 'thread-1',
				executionId: 'execution-1',
			});
			await service.finalizeExecution('execution-1', { ...params, record: makeMessageRecord() });
		} finally {
			vi.useRealTimers();
		}
	});

	it('does not notify when a late timeline snapshot is rejected', async () => {
		const params = await startSnapshotExecution();
		agentExecutionRepository.updateTimelineIfRunning.mockResolvedValue(false);

		service.recordTimelineSnapshot({
			executionId: 'execution-1',
			projectId: 'project-1',
			agentId: 'agent-1',
			threadId: 'thread-1',
			timeline: [{ type: 'text', content: 'Too late', timestamp: 1 }],
		});
		await vi.waitFor(() =>
			expect(agentExecutionRepository.updateTimelineIfRunning).toHaveBeenCalled(),
		);

		expect(executionUpdateBroadcaster.notify).not.toHaveBeenCalled();
		await service.finalizeExecution('execution-1', { ...params, record: makeMessageRecord() });
	});

	it('rejects completion when the terminal update loses the running-state race', async () => {
		agentExecutionRepository.updateIfRunning.mockResolvedValue(false);
		Object.defineProperty(storageConfig, 'modeTag', { value: 'fs' });

		await expect(
			service.finalizeExecution('execution-1', {
				threadId: 'thread-1',
				agentId: 'agent-1',
				agentName: 'Agent',
				projectId: 'project-1',
				userMessage: 'Run',
				record: makeMessageRecord({
					timeline: [{ type: 'text', content: 'Late output', timestamp: 1 }],
				}),
			}),
		).rejects.toThrow('no longer running');

		expect(executionUpdateBroadcaster.notify).not.toHaveBeenCalled();
		expect(agentExecutionLogStore.write).not.toHaveBeenCalled();
	});

	it.each(['in flight', 'retry queued'])(
		'stops liveness writes after finalization fails with a snapshot %s',
		async (snapshotState) => {
			vi.useFakeTimers();
			try {
				const params = await startSnapshotExecution();
				const snapshot = createDeferredPromise<boolean>();
				agentExecutionRepository.updateTimelineIfRunning.mockReturnValueOnce(snapshot.promise);
				const cause = new Error('terminal write failed');
				agentExecutionRepository.updateIfRunning.mockRejectedValue(cause);
				const update = {
					...params,
					executionId: 'execution-1',
					timeline: [{ type: 'text' as const, content: 'Partial', timestamp: 1 }],
				};
				service.recordTimelineSnapshot(update);
				if (snapshotState === 'retry queued') {
					snapshot.reject(new Error('snapshot unavailable'));
					await vi.advanceTimersByTimeAsync(0);
				}
				const finished = service
					.finalizeExecution('execution-1', { ...params, record: makeMessageRecord() })
					.catch((error: unknown) => error);
				expect(agentExecutionRepository.updateIfRunning).not.toHaveBeenCalled();
				if (snapshotState === 'in flight') snapshot.reject(new Error('snapshot unavailable'));
				await vi.advanceTimersByTimeAsync(1_000);
				expect(await finished).toBe(cause);
				service.recordTimelineSnapshot(update);
				await vi.advanceTimersByTimeAsync(180_000);
				expect(agentExecutionRepository.updateTimelineIfRunning).toHaveBeenCalledOnce();
				expect(agentExecutionRepository.touchRunning).not.toHaveBeenCalled();
			} finally {
				vi.useRealTimers();
			}
		},
	);

	it('keeps terminal persistence successful when usage totals and model backfill fail', async () => {
		agentExecutionThreadRepository.incrementUsage.mockRejectedValue(
			new Error('usage update failed'),
		);
		agentExecutionRepository.findSuspendedWithoutModel.mockRejectedValue(
			new Error('model backfill failed'),
		);
		await expect(
			service.finalizeExecution('execution-1', {
				threadId: 'thread-1',
				agentId: 'agent-1',
				agentName: 'Agent',
				projectId: 'project-1',
				userMessage: null,
				hitlStatus: 'resumed',
				record: makeMessageRecord({
					model: 'mock',
					usage: { promptTokens: 2, completionTokens: 3, totalTokens: 5 },
				}),
			}),
		).resolves.toBe('execution-1');
		expect(agentExecutionThreadRepository.incrementUsage).toHaveBeenCalledWith(
			'thread-1',
			2,
			3,
			0,
			1,
		);
		expect(agentExecutionRepository.findSuspendedWithoutModel).toHaveBeenCalledWith('thread-1');
		expect(agentExecutionRepository.updateIfRunning).toHaveBeenCalledWith(
			'execution-1',
			expect.objectContaining({ status: 'success', totalTokens: 5, model: 'mock' }),
		);
		expect(executionUpdateBroadcaster.notify).toHaveBeenCalledOnce();
	});

	describe('execution lifecycle', () => {
		it('writes the timeline to blob storage in non-db mode', async () => {
			storageConfig = mock<StorageConfig>({ modeTag: 'fs' });
			service = new AgentExecutionService(
				mockLogger(),
				agentExecutionRepository,
				agentExecutionThreadRepository,
				n8nMemory,
				telemetry,
				mock<AgentChatAttachmentService>(),
				agentExecutionLogStore,
				storageConfig,
				errorReporter,
				executionUpdateBroadcaster,
				checkpointStorage,
				txRunner,
				queueRepository,
			);

			const record = makeMessageRecord({
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
						success: false,
					},
				],
			});
			agentExecutionThreadRepository.findOrCreate.mockResolvedValue({
				thread: makeThread(),
				created: true,
			});
			agentExecutionRepository.create.mockImplementation((data) => data as AgentExecution);
			agentExecutionRepository.saveInContext.mockResolvedValue({
				id: 'execution-1',
			} as AgentExecution);

			await recordExecution({
				threadId: 'thread-1',
				agentId: 'agent-1',
				agentName: 'Agent',
				projectId: 'project-1',
				userMessage: 'Run',
				record,
			});

			expect(agentExecutionRepository.updateIfRunning).toHaveBeenCalledWith(
				'execution-1',
				expect.objectContaining({
					timeline: record.timeline,
					storedAt: 'db',
					failureSummary: {
						count: 1,
						latest: {
							kind: 'tool',
							name: 'lookup',
							message: null,
							occurredAt: 123,
						},
					},
				}),
			);
			expect(agentExecutionRepository.moveTimelineToBlob).toHaveBeenCalledWith('execution-1', 'fs');
			expect(agentExecutionRepository.updateIfRunning.mock.invocationCallOrder[0]).toBeLessThan(
				agentExecutionLogStore.write.mock.invocationCallOrder[0],
			);

			expect(agentExecutionLogStore.write).toHaveBeenCalledWith(
				{ agentId: 'agent-1', threadId: 'thread-1', executionId: 'execution-1' },
				{ timeline: record.timeline },
				'fs',
			);
			expect(executionUpdateBroadcaster.notify).toHaveBeenLastCalledWith({
				projectId: 'project-1',
				agentId: 'agent-1',
				threadId: 'thread-1',
				executionId: 'execution-1',
			});
			expect(executionUpdateBroadcaster.notify).toHaveBeenCalledTimes(2);
		});

		it.each([
			['blob write', null, false],
			['storage pointer update', 'db', true],
			['storage pointer acknowledgement', 'fs', false],
		] as const)(
			'keeps the finalized execution in the database when the %s fails',
			async (failure, currentLocation, shouldDeleteBlob) => {
				storageConfig = mock<StorageConfig>({ modeTag: 'fs' });
				service = new AgentExecutionService(
					mockLogger(),
					agentExecutionRepository,
					agentExecutionThreadRepository,
					n8nMemory,
					telemetry,
					mock<AgentChatAttachmentService>(),
					agentExecutionLogStore,
					storageConfig,
					errorReporter,
					executionUpdateBroadcaster,
					checkpointStorage,
					txRunner,
					queueRepository,
				);

				const record = makeMessageRecord({
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
				});
				agentExecutionThreadRepository.findOrCreate.mockResolvedValue({
					thread: makeThread(),
					created: true,
				});
				agentExecutionRepository.create.mockImplementation((data) => data as AgentExecution);
				agentExecutionRepository.saveInContext.mockResolvedValue({
					id: 'execution-1',
				} as AgentExecution);
				const error = new Error('storage unavailable');
				if (failure === 'blob write') {
					agentExecutionLogStore.write.mockRejectedValue(error);
				} else {
					agentExecutionRepository.moveTimelineToBlob.mockRejectedValue(error);
					agentExecutionRepository.findTimelineStorageLocation.mockResolvedValue(currentLocation);
				}

				await recordExecution({
					threadId: 'thread-1',
					agentId: 'agent-1',
					agentName: 'Agent',
					projectId: 'project-1',
					userMessage: 'Run',
					record,
				});

				expect(agentExecutionRepository.updateIfRunning).toHaveBeenCalledWith(
					'execution-1',
					expect.objectContaining({
						status: 'success',
						timeline: record.timeline,
						storedAt: 'db',
						failureSummary: null,
					}),
				);
				expect(errorReporter.error).toHaveBeenCalledWith(error);
				if (shouldDeleteBlob) {
					expect(agentExecutionLogStore.delete).toHaveBeenCalledWith([
						{
							agentId: 'agent-1',
							threadId: 'thread-1',
							executionId: 'execution-1',
							storedAt: 'fs',
						},
					]);
				} else {
					expect(agentExecutionLogStore.delete).not.toHaveBeenCalled();
				}
			},
		);

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
			agentExecutionRepository.saveInContext.mockResolvedValue({
				id: 'execution-1',
			} as AgentExecution);

			await recordExecution({
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
				previewAccess,
				{},
				{
					parentThreadId: 'parent-thread-1',
					parentAgentId: 'parent-agent-1',
				},
				undefined,
				undefined,
				undefined,
			);
		});

		it('stamps the task snapshot version on newly created task sessions', async () => {
			const access: AgentThreadAccess = { accessScope: 'project', ownerId: null };
			agentExecutionThreadRepository.findOrCreate.mockResolvedValue({
				thread: makeThread({ title: 'Task run', ...access }),
				created: false,
			});
			agentExecutionRepository.create.mockImplementation((data) => data as AgentExecution);
			agentExecutionRepository.saveInContext.mockResolvedValue({
				id: 'execution-1',
			} as AgentExecution);

			await recordExecution(
				{
					threadId: 'thread-1',
					agentId: 'agent-1',
					agentName: 'Agent',
					projectId: 'project-1',
					userMessage: 'Run task',
					record: makeMessageRecord(),
					source: 'task',
					taskId: 'task-1',
					taskVersionId: 'version-1',
				},
				access,
			);

			expect(agentExecutionThreadRepository.findOrCreate).toHaveBeenCalledWith(
				'thread-1',
				'agent-1',
				'Agent',
				'project-1',
				access,
				{},
				undefined,
				'task-1',
				'version-1',
				undefined,
			);
		});

		it('syncs a generated title from memory on later messages when the thread has no title yet', async () => {
			agentExecutionThreadRepository.findOrCreate.mockResolvedValue({
				thread: makeThread({ title: null }),
				created: false,
			});
			agentExecutionRepository.create.mockImplementation((data) => data as AgentExecution);
			agentExecutionRepository.saveInContext.mockResolvedValue({
				id: 'execution-1',
			} as AgentExecution);
			memoryBackend.getThread.mockResolvedValue({
				id: 'thread-1',
				resourceId: 'user-1',
				title: 'Workflow builder chat',
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			await recordExecution({
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
			agentExecutionRepository.saveInContext.mockResolvedValue({
				id: 'execution-1',
			} as AgentExecution);

			await recordExecution({
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
			agentExecutionRepository.saveInContext.mockResolvedValue({
				id: 'execution-1',
			} as AgentExecution);

			await recordExecution({
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
				token_count: 15,
				tool_call_count: 1,
			});
		});

		it('tracks failed turn telemetry and does not reject when telemetry throws', async () => {
			agentExecutionThreadRepository.findOrCreate.mockResolvedValue({
				thread: makeThread(),
				created: false,
			});
			agentExecutionRepository.create.mockImplementation((data) => data as AgentExecution);
			agentExecutionRepository.saveInContext.mockResolvedValue({
				id: 'execution-1',
			} as AgentExecution);
			telemetry.trackAgentTurnFinished.mockImplementation(() => {
				throw new Error('telemetry failed');
			});

			await expect(
				recordExecution({
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
			agentExecutionRepository.saveInContext.mockResolvedValue({
				id: 'execution-1',
			} as AgentExecution);

			await recordExecution({
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
			agentExecutionRepository.saveInContext.mockResolvedValue({
				id: 'execution-1',
			} as AgentExecution);

			await recordExecution({
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

	describe('finalizeExecution', () => {
		it('makes the terminal timeline authoritative', async () => {
			const record = makeMessageRecord({
				finishReason: 'cancelled',
				timeline: [{ type: 'text', content: 'Done', timestamp: 1, endTime: 2 }],
			});
			agentExecutionRepository.updateIfRunning.mockResolvedValue(true);

			await service.finalizeExecution('execution-1', {
				threadId: 'thread-1',
				agentId: 'agent-1',
				agentName: 'Agent',
				projectId: 'project-1',
				userMessage: 'Run',
				record,
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

			expect(agentExecutionRepository.updateIfRunning).toHaveBeenCalledWith(
				'execution-1',
				expect.objectContaining({
					status: 'cancelled',
					timeline: record.timeline,
					storedAt: 'db',
					failureSummary: null,
				}),
			);
			expect(telemetry.trackAgentTurnFinished).toHaveBeenCalledWith(
				expect.objectContaining({ turn_status: 'failed' }),
			);
		});

		it('applies the terminal main-loop cost additively so in-flight side-call increments survive', async () => {
			// A side-call `incrementCost` that lands before the terminal write must
			// not be overwritten by `cost = record.totalCost`. The terminal write
			// therefore omits `cost` from `updateIfRunning` and adds the main-loop
			// cost through the same additive `incrementCost` path the side calls use.
			const record = makeMessageRecord({ totalCost: 0.05 });
			agentExecutionRepository.updateIfRunning.mockResolvedValue(true);

			await service.finalizeExecution('execution-1', {
				threadId: 'thread-1',
				agentId: 'agent-1',
				agentName: 'Agent',
				projectId: 'project-1',
				userMessage: 'Run',
				record,
			});

			const [, terminalPayload] = agentExecutionRepository.updateIfRunning.mock.calls.at(-1)!;
			expect(terminalPayload).not.toHaveProperty('cost');
			expect(agentExecutionRepository.incrementCost).toHaveBeenCalledWith('execution-1', 0.05);
			expect(agentExecutionRepository.updateIfRunning.mock.invocationCallOrder[0]).toBeLessThan(
				agentExecutionRepository.incrementCost.mock.invocationCallOrder[0],
			);
		});

		it('does not issue a cost increment when the terminal run has no priced usage', async () => {
			const record = makeMessageRecord({ totalCost: null });
			agentExecutionRepository.updateIfRunning.mockResolvedValue(true);

			await service.finalizeExecution('execution-1', {
				threadId: 'thread-1',
				agentId: 'agent-1',
				agentName: 'Agent',
				projectId: 'project-1',
				userMessage: 'Run',
				record,
			});

			expect(agentExecutionRepository.incrementCost).not.toHaveBeenCalled();
		});

		it('preserves an interrupted execution inline without overwriting blob storage', async () => {
			storageConfig = mock<StorageConfig>({ modeTag: 'fs' });
			service = new AgentExecutionService(
				mockLogger(),
				agentExecutionRepository,
				agentExecutionThreadRepository,
				n8nMemory,
				telemetry,
				agentChatAttachmentService,
				agentExecutionLogStore,
				storageConfig,
				errorReporter,
				executionUpdateBroadcaster,
				checkpointStorage,
				txRunner,
				queueRepository,
			);
			const partial = [{ type: 'text', content: 'Partial', timestamp: 1, endTime: 2 }] as const;
			agentExecutionRepository.updateIfRunning.mockResolvedValue(true);
			agentExecutionThreadRepository.findOneBy.mockResolvedValue(makeThread());

			await service.finalizeInterruptedExecution(
				{
					id: 'execution-1',
					threadId: 'thread-1',
					startedAt: new Date(Date.now() - 100),
					timeline: [...partial],
					thread: makeThread(),
				} as AgentExecution,
				new Date(Date.now() - 120_000),
			);

			await vi.waitFor(() =>
				expect(executionUpdateBroadcaster.notify).toHaveBeenCalledWith({
					projectId: 'project-1',
					agentId: 'agent-1',
					threadId: 'thread-1',
					executionId: 'execution-1',
				}),
			);
			expect(agentExecutionRepository.updateIfRunning).toHaveBeenCalledWith(
				'execution-1',
				expect.objectContaining({
					status: 'interrupted',
					timeline: partial,
					storedAt: 'db',
					error: expect.stringContaining('interrupted'),
					failureSummary: {
						count: 1,
						latest: {
							kind: 'execution',
							name: null,
							message: expect.stringContaining('interrupted'),
							occurredAt: expect.any(Number),
						},
					},
				}),
				expect.any(Date),
				{},
			);
			expect(agentExecutionLogStore.write).not.toHaveBeenCalled();
		});
	});

	describe('getThreads', () => {
		it('returns composite statuses and aggregated failure summaries', async () => {
			const failedThread = makeThread({ id: 'thread-failed' });
			const cleanThread = makeThread({ id: 'thread-clean', accessScope: 'project', ownerId: null });
			const runningThread = makeThread({ id: 'thread-running', parentThreadId: 'parent' });
			const emptyThread = makeThread({ id: 'thread-empty' });
			const failureSummary = {
				count: 2,
				latest: {
					kind: 'tool' as const,
					name: 'lookup',
					message: 'request failed',
					occurredAt: 20,
					executionId: 'execution-2',
				},
			};
			agentExecutionThreadRepository.findByProjectIdPaginated.mockResolvedValue({
				threads: [failedThread, cleanThread, runningThread, emptyThread],
				nextCursor: null,
			});
			agentExecutionRepository.findFirstUserMessageByThreadIds.mockResolvedValue(new Map());
			agentExecutionRepository.findFirstSourceByThreadIds.mockResolvedValue(new Map());
			agentExecutionRepository.findFailureSummariesByThreadIds.mockResolvedValue(
				new Map([[failedThread.id, failureSummary]]),
			);
			agentExecutionRepository.findLatestStatusesByThreadIds.mockResolvedValue(
				new Map([
					[failedThread.id, 'success'],
					[cleanThread.id, 'success'],
					[runningThread.id, 'running'],
				]),
			);

			const result = await service.getThreads('project-1', 'agent-1', 'user-1', 20);

			expect(result.threads).toEqual([
				expect.objectContaining({
					id: failedThread.id,
					failureSummary,
					status: 'error',
					canContinueInPreview: true,
				}),
				expect.objectContaining({
					id: cleanThread.id,
					failureSummary: null,
					status: 'succeeded',
					canContinueInPreview: false,
				}),
				expect.objectContaining({
					id: runningThread.id,
					failureSummary: null,
					status: 'running',
					canContinueInPreview: false,
				}),
				expect.objectContaining({ id: emptyThread.id, failureSummary: null, status: null }),
			]);
		});
	});

	describe('canUseDraftThread', () => {
		it.each<{
			name: string;
			thread: Partial<AgentExecutionThread>;
			allowed: boolean;
		}>([
			{ name: 'owned private root', thread: {}, allowed: true },
			{ name: 'shared session', thread: { accessScope: 'project', ownerId: null }, allowed: false },
			{ name: 'sub-agent session', thread: { parentThreadId: 'parent' }, allowed: false },
			{ name: 'task session', thread: { taskId: 'task-1' }, allowed: true },
			{ name: 'other owner', thread: { ownerId: 'other-user' }, allowed: false },
			{ name: 'unresolved owner', thread: { ownerId: null }, allowed: false },
			{ name: 'other project', thread: { projectId: 'other-project' }, allowed: false },
			{ name: 'other agent', thread: { agentId: 'other-agent' }, allowed: false },
			{ name: 'owned legacy ID', thread: { id: 'test-agent-1:user-1' }, allowed: true },
			{ name: 'owned unscoped legacy ID', thread: { id: 'test-agent-1' }, allowed: true },
		])('checks an existing $name', async ({ thread: overrides, allowed }) => {
			const thread = makeThread(overrides);
			agentExecutionThreadRepository.findOneBy.mockResolvedValue(thread);
			expect(await service.canUseDraftThread(thread.id, 'project-1', 'agent-1', 'user-1')).toBe(
				allowed,
			);
		});

		it.each([
			{ name: 'unused ID', memoryResourceId: null, checkpointAllowed: true, allowed: true },
			{
				name: 'memory owned by another user',
				memoryResourceId: 'draft-chat:other-user',
				checkpointAllowed: true,
				allowed: false,
			},
			{
				name: 'checkpoint owned by another user',
				memoryResourceId: null,
				checkpointAllowed: false,
				allowed: false,
			},
		])('checks a new $name', async ({ memoryResourceId, checkpointAllowed, allowed }) => {
			agentExecutionThreadRepository.findOneBy.mockResolvedValue(null);
			memoryBackend.getThread.mockResolvedValue(
				memoryResourceId
					? {
							id: 'new-thread',
							resourceId: memoryResourceId,
							createdAt: new Date(),
							updatedAt: new Date(),
						}
					: null,
			);
			checkpointStorage.hasNoConflictingThreadResource.mockResolvedValue(checkpointAllowed);

			await expect(
				service.canUseDraftThread('new-thread', 'project-1', 'agent-1', 'user-1'),
			).resolves.toBe(allowed);
		});
	});

	describe('getThreadDetail', () => {
		it.each(['user', 'project'] as const)(
			'returns readable %s thread executions',
			async (accessScope) => {
				const thread = makeThread({
					accessScope,
					ownerId: accessScope === 'user' ? 'user-1' : null,
				});
				const executions = [{ id: 'execution-1', storedAt: 'db' }] as AgentExecution[];
				agentExecutionThreadRepository.findOneBy.mockResolvedValue(thread);
				agentExecutionRepository.findByThreadIdOrdered.mockResolvedValue(executions);

				const result = await service.getThreadDetail('thread-1', 'project-1', 'agent-1', 'user-1');

				expect(result).toEqual({ thread, executions });
			},
		);

		it('returns inline progress for running executions', async () => {
			const thread = makeThread();
			const partial = [{ type: 'text', content: 'Working', timestamp: 1, endTime: 2 }] as const;
			const execution = {
				id: 'execution-1',
				status: 'running',
				storedAt: 'db',
				timeline: [...partial],
			} as AgentExecution;
			agentExecutionThreadRepository.findOneBy.mockResolvedValue(thread);
			agentExecutionRepository.findByThreadIdOrdered.mockResolvedValue([execution]);

			const result = await service.getThreadDetail('thread-1', 'project-1', 'agent-1', 'user-1');

			expect(result?.executions[0]?.timeline).toEqual(partial);
		});

		it('hydrates blob-stored timelines from the log store', async () => {
			const dbEvent = {
				type: 'tool-call' as const,
				kind: 'tool' as const,
				name: 'lookup',
				toolCallId: 'tc-db',
				input: {},
				output: {},
				startTime: 0,
				endTime: 123,
				success: true,
			};
			const fsEvent = {
				type: 'tool-call' as const,
				kind: 'tool' as const,
				name: 'lookup',
				toolCallId: 'tc-fs',
				input: {},
				output: {},
				startTime: 0,
				endTime: 456,
				success: true,
			};
			const executions = [
				{ id: 'execution-1', storedAt: 'db', timeline: [dbEvent] },
				{ id: 'execution-2', storedAt: 'fs', timeline: null },
				{ id: 'execution-3', storedAt: 'fs', timeline: null },
			] as AgentExecution[];
			agentExecutionThreadRepository.findOneBy.mockResolvedValue(makeThread());
			agentExecutionRepository.findByThreadIdOrdered.mockResolvedValue(executions);
			agentExecutionLogStore.hasLocation.mockReturnValue(true);
			agentExecutionLogStore.readMany.mockResolvedValue(
				new Map([['execution-2', { timeline: [fsEvent], version: 1 }]]),
			);

			const result = await service.getThreadDetail('thread-1', 'project-1', 'agent-1', 'user-1');

			expect(agentExecutionLogStore.readMany).toHaveBeenCalledWith([
				{ agentId: 'agent-1', threadId: 'thread-1', executionId: 'execution-2', storedAt: 'fs' },
				{ agentId: 'agent-1', threadId: 'thread-1', executionId: 'execution-3', storedAt: 'fs' },
			]);
			expect(result?.executions[0].timeline).toEqual([dbEvent]);
			expect(result?.executions[1].timeline).toEqual([fsEvent]);
			expect(result?.executions[2].timeline).toBeNull();
		});

		it('returns the thread with null timelines when the blob read fails', async () => {
			agentExecutionThreadRepository.findOneBy.mockResolvedValue(makeThread());
			agentExecutionRepository.findByThreadIdOrdered.mockResolvedValue([
				{ id: 'execution-1', storedAt: 'fs', timeline: null },
			] as AgentExecution[]);
			agentExecutionLogStore.hasLocation.mockReturnValue(true);
			agentExecutionLogStore.readMany.mockRejectedValue(new Error('fs read failed'));

			const result = await service.getThreadDetail('thread-1', 'project-1', 'agent-1', 'user-1');

			expect(result).not.toBeNull();
			expect(result!.executions[0].timeline).toBeNull();
			expect(errorReporter.error).toHaveBeenCalledWith(expect.any(Error));
		});

		it.each([
			{ name: 'project', thread: makeThread({ projectId: 'other-project' }) },
			{ name: 'agent', thread: makeThread({ agentId: 'other-agent' }) },
			{ name: 'owner', thread: makeThread({ ownerId: 'other-user' }) },
			{ name: 'unresolved owner', thread: makeThread({ ownerId: null }) },
		])('does not read executions for a thread outside the requested $name', async ({ thread }) => {
			agentExecutionThreadRepository.findOneBy.mockResolvedValue(thread);

			await expect(
				service.getThreadDetail('thread-1', 'project-1', 'agent-1', 'user-1'),
			).resolves.toBeNull();
			expect(agentExecutionRepository.findByThreadIdOrdered).not.toHaveBeenCalled();
		});
	});

	describe('findLatestSuspendedRun', () => {
		it('delegates to the repository and returns its result', async () => {
			const suspended = { id: 'execution-1', source: 'telegram' } as AgentExecution;
			agentExecutionRepository.findLatestSuspendedByThreadId.mockResolvedValue(suspended);

			const result = await service.findLatestSuspendedRun('thread-1');

			expect(agentExecutionRepository.findLatestSuspendedByThreadId).toHaveBeenCalledWith(
				'thread-1',
			);
			expect(result).toBe(suspended);
		});

		it('returns null when there is no suspended execution in the thread', async () => {
			agentExecutionRepository.findLatestSuspendedByThreadId.mockResolvedValue(null);

			const result = await service.findLatestSuspendedRun('thread-1');

			expect(result).toBeNull();
		});
	});

	describe('deleteThread', () => {
		it('deletes thread memory, attachments, and the execution thread', async () => {
			agentExecutionThreadRepository.deleteSession.mockResolvedValue({
				status: 'deleted',
				refs: { attachmentBinaryDataIds: ['binary-1'], executionLogs: [] },
			});

			const result = await service.deleteThread('project-1', 'agent-1', 'thread-1', 'user-1');

			expect(result).toBe(true);
			expect(agentExecutionThreadRepository.deleteSession).toHaveBeenCalledWith(
				'project-1',
				'agent-1',
				'thread-1',
				'user-1',
				{},
			);
			expect(n8nMemory.getImplementation).toHaveBeenCalledWith('agent-1');
			expect(memoryBackend.deleteThread).toHaveBeenCalledWith('thread-1', {});
			expect(agentChatAttachmentService.deleteStoredData).toHaveBeenCalledWith(['binary-1'], {
				threadId: 'thread-1',
			});
		});

		it('deletes blob-stored logs when deleting a thread', async () => {
			agentExecutionThreadRepository.deleteSession.mockResolvedValue({
				status: 'deleted',
				refs: {
					attachmentBinaryDataIds: [],
					executionLogs: [{ id: 'execution-1', storedAt: 'fs' }],
				},
			});

			const result = await service.deleteThread('project-1', 'agent-1', 'thread-1', 'user-1');

			expect(result).toBe(true);
			expect(agentExecutionLogStore.delete).toHaveBeenCalledWith([
				{ agentId: 'agent-1', threadId: 'thread-1', executionId: 'execution-1', storedAt: 'fs' },
			]);
		});

		it('does not clean SDK memory when the execution thread is not found', async () => {
			agentExecutionThreadRepository.deleteSession.mockResolvedValue(null);

			const result = await service.deleteThread('project-1', 'agent-1', 'thread-1', 'user-1');

			expect(result).toBe(false);
			expect(n8nMemory.getImplementation).not.toHaveBeenCalled();
			expect(memoryBackend.deleteThread).not.toHaveBeenCalled();
			expect(agentChatAttachmentService.deleteStoredData).not.toHaveBeenCalled();
		});
	});

	describe('deleteExecutionLogsForAgent', () => {
		it('deletes all blob-stored logs for an agent', async () => {
			agentExecutionRepository.findBlobRefsByAgentId.mockResolvedValue([
				{ id: 'execution-1', threadId: 'thread-1', storedAt: 'fs' },
				{ id: 'execution-2', threadId: 'thread-2', storedAt: 's3' },
			]);

			await service.deleteExecutionLogsForAgent('agent-1');

			expect(agentExecutionLogStore.delete).toHaveBeenCalledWith([
				{ agentId: 'agent-1', threadId: 'thread-1', executionId: 'execution-1', storedAt: 'fs' },
				{ agentId: 'agent-1', threadId: 'thread-2', executionId: 'execution-2', storedAt: 's3' },
			]);
		});
	});
});

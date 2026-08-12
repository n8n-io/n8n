import { mockLogger, mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import type { ExecutionPersistence } from '@/executions/execution-persistence';

import type { JobProcessor } from '../job-processor';
import { BullJobQueue } from '../queue/bull-job-queue';
import { IpcJobQueue } from '../queue/ipc-job-queue';
import type { QueueJob } from '../queue/job-queue.interface';
import { ScalingService } from '../scaling.service';
import type { JobData, JobMessage } from '../scaling.types';
import type { TransportModeService } from '../transport-mode.service';
import { ENCODED_BUFFER_KEY, type WebhookResponseRelay } from '../webhook-response-relay';

const { mcpServer } = vi.hoisted(() => ({
	mcpServer: {
		hasSession: vi.fn(),
		hasPendingResponse: vi.fn(),
		handleWorkerResponse: vi.fn(),
		setSessionStore: vi.fn(),
		setExecutionStrategy: vi.fn(),
		getPendingCallsManager: vi.fn(),
	},
}));

vi.mock('@n8n/n8n-nodes-langchain/mcp/core', () => ({
	McpServer: { instance: () => mcpServer },
	RedisSessionStore: vi.fn(function () {
		return {};
	}),
	QueuedExecutionStrategy: vi.fn(function () {
		return {};
	}),
}));

describe('ScalingService', () => {
	const globalConfig = mockInstance(GlobalConfig, {
		queue: {
			bull: {
				prefix: 'bull',
				redis: {
					clusterNodes: '',
					host: 'localhost',
					password: '',
					port: 6379,
					tls: false,
				},
			},
		},
		endpoints: {
			metrics: {
				includeQueueMetrics: false,
				queueMetricsInterval: 20,
			},
		},
		executions: {
			queueRecovery: {
				interval: 180,
				batchSize: 100,
			},
			queueRetention: {
				keepLastCompleted: 0,
				keepLastFailed: 0,
			},
		},
	});

	// ScalingService resolves the queue implementations from the container; these
	// register mocks there so no real Bull queue or IPC channel is ever created.
	const jobQueue = mockInstance(BullJobQueue);
	const ipcJobQueue = mockInstance(IpcJobQueue);

	const instanceSettings = Container.get(InstanceSettings);
	const jobProcessor = mock<JobProcessor>();
	const executionRepository = mock<ExecutionRepository>();
	const executionPersistence = mock<ExecutionPersistence>();
	const webhookResponseRelay = mock<WebhookResponseRelay>();
	const transportModeService = mock<TransportModeService>();

	let scalingService: ScalingService;

	let registerMainOrWebhookListenersSpy: MockInstance;
	let registerWorkerListenersSpy: MockInstance;
	let scheduleQueueRecoverySpy: MockInstance;
	let stopQueueRecoverySpy: MockInstance;
	let stopQueueMetricsSpy: MockInstance;
	let getRunningJobsCountSpy: MockInstance;

	/** The job message handler ScalingService registered on the queue. */
	const getMessageHandler = () => {
		const handler = jobQueue.onMessage.mock.calls.at(-1)?.[0] as
			| ((jobId: string, msg: JobMessage) => void)
			| undefined;
		expect(handler).toBeDefined();
		return handler!;
	};

	const newScalingService = (activeExecutions?: ActiveExecutions) =>
		new ScalingService(
			mockLogger(),
			mock(),
			activeExecutions ?? mock(),
			jobProcessor,
			globalConfig,
			executionRepository,
			executionPersistence,
			instanceSettings,
			mock(),
			webhookResponseRelay,
			transportModeService,
		);

	beforeEach(() => {
		vi.clearAllMocks();
		instanceSettings.instanceType = 'main';
		instanceSettings.markAsLeader();
		transportModeService.resolve.mockReturnValue('redis');

		scalingService = newScalingService();

		getRunningJobsCountSpy = vi.spyOn(scalingService, 'getRunningJobsCount');

		// @ts-expect-error Private method
		ScalingService.prototype.scheduleQueueRecovery = vi.fn();
		registerMainOrWebhookListenersSpy = vi.spyOn(
			scalingService,
			// @ts-expect-error Private method
			'registerMainOrWebhookListeners',
		);
		// @ts-expect-error Private method
		registerWorkerListenersSpy = vi.spyOn(scalingService, 'registerWorkerListeners');
		// @ts-expect-error Private method
		scheduleQueueRecoverySpy = vi.spyOn(scalingService, 'scheduleQueueRecovery');
		// @ts-expect-error Private method
		stopQueueRecoverySpy = vi.spyOn(scalingService, 'stopQueueRecovery');

		// @ts-expect-error Private method
		stopQueueMetricsSpy = vi.spyOn(scalingService, 'stopQueueMetrics');
	});

	describe('setupQueue', () => {
		describe('if leader main', () => {
			it('should set up queue + listeners + queue recovery', async () => {
				await scalingService.setupQueue();

				expect(jobQueue.start).toHaveBeenCalled();
				expect(registerMainOrWebhookListenersSpy).toHaveBeenCalled();
				expect(registerWorkerListenersSpy).not.toHaveBeenCalled();
				expect(scheduleQueueRecoverySpy).toHaveBeenCalledWith(0);
			});
		});

		describe('if follower main', () => {
			it('should set up queue + listeners', async () => {
				instanceSettings.markAsFollower();

				await scalingService.setupQueue();

				expect(jobQueue.start).toHaveBeenCalled();
				expect(registerMainOrWebhookListenersSpy).toHaveBeenCalled();
				expect(registerWorkerListenersSpy).not.toHaveBeenCalled();
				expect(scheduleQueueRecoverySpy).not.toHaveBeenCalled();
			});
		});

		describe('if worker', () => {
			it('should set up queue + listeners', async () => {
				instanceSettings.instanceType = 'worker';

				await scalingService.setupQueue();

				expect(jobQueue.start).toHaveBeenCalled();
				expect(registerWorkerListenersSpy).toHaveBeenCalled();
				expect(registerMainOrWebhookListenersSpy).not.toHaveBeenCalled();
			});
		});

		describe('webhook', () => {
			it('should set up a queue + listeners', async () => {
				instanceSettings.instanceType = 'webhook';

				await scalingService.setupQueue();

				expect(jobQueue.start).toHaveBeenCalled();
				expect(registerWorkerListenersSpy).not.toHaveBeenCalled();
				expect(registerMainOrWebhookListenersSpy).toHaveBeenCalled();
			});
		});

		describe('if transport mode is ipc', () => {
			it('should use the ipc queue instead of Bull', async () => {
				transportModeService.resolve.mockReturnValue('ipc');

				await scalingService.setupQueue();

				expect(ipcJobQueue.start).toHaveBeenCalled();
				expect(jobQueue.start).not.toHaveBeenCalled();
				expect(registerMainOrWebhookListenersSpy).toHaveBeenCalled();
			});
		});
	});

	describe('setupWorker', () => {
		it('should set up a worker with concurrency', async () => {
			instanceSettings.instanceType = 'worker';
			await scalingService.setupQueue();
			const concurrency = 5;

			scalingService.setupWorker(concurrency);

			expect(jobQueue.registerProcessor).toHaveBeenCalledWith(concurrency, expect.any(Function));
		});

		it('should throw if called on a non-worker instance', async () => {
			await scalingService.setupQueue();

			expect(() => scalingService.setupWorker(5)).toThrow();
		});

		it('should throw if called before queue is ready', async () => {
			instanceSettings.instanceType = 'worker';

			expect(() => scalingService.setupWorker(5)).toThrow();
		});
	});

	describe('stop', () => {
		describe('if main', () => {
			it('should pause queue, stop queue recovery and queue metrics', async () => {
				instanceSettings.instanceType = 'main';
				await scalingService.setupQueue();
				// @ts-expect-error readonly property
				scalingService.queueRecoveryContext.timeout = 1;
				vi.spyOn(scalingService, 'isQueueMetricsEnabled', 'get').mockReturnValue(true);

				await scalingService.stop();

				expect(getRunningJobsCountSpy).not.toHaveBeenCalled();
				expect(jobQueue.pause).toHaveBeenCalled();
				expect(stopQueueRecoverySpy).toHaveBeenCalled();
				expect(stopQueueMetricsSpy).toHaveBeenCalled();
			});
		});

		describe('if worker', () => {
			it('should pause queue and wait for running jobs to finish', async () => {
				instanceSettings.instanceType = 'worker';
				await scalingService.setupQueue();
				jobProcessor.getRunningJobIds.mockReturnValue([]);

				await scalingService.stop();

				expect(getRunningJobsCountSpy).toHaveBeenCalled();
				expect(jobQueue.pause).toHaveBeenCalled();
				expect(stopQueueRecoverySpy).not.toHaveBeenCalled();
			});
		});
	});

	describe('pingQueue', () => {
		it('should ping the queue', async () => {
			await scalingService.setupQueue();

			await scalingService.pingQueue();

			expect(jobQueue.ping).toHaveBeenCalled();
		});
	});

	describe('addJob', () => {
		it('should enqueue the job with the given priority', async () => {
			await scalingService.setupQueue();
			jobQueue.enqueue.mockResolvedValue(mock<QueueJob>({ id: '456' }));

			const jobData = mock<JobData>({ executionId: '123' });
			const job = await scalingService.addJob(jobData, { priority: 100 });

			expect(jobQueue.enqueue).toHaveBeenCalledWith(jobData, { priority: 100 });
			expect(job.id).toBe('456');
		});
	});

	describe('getJob', () => {
		it('should get a job', async () => {
			await scalingService.setupQueue();
			const jobId = '123';
			jobQueue.getJob.mockResolvedValue(mock<QueueJob>({ id: jobId }));

			const job = await scalingService.getJob(jobId);

			expect(jobQueue.getJob).toHaveBeenCalledWith(jobId);
			expect(job?.id).toBe(jobId);
		});
	});

	describe('findJobsByStatus', () => {
		it('should find jobs by status', async () => {
			await scalingService.setupQueue();
			jobQueue.findJobsByStatus.mockResolvedValue([mock<QueueJob>({ id: '123' })]);

			const jobs = await scalingService.findJobsByStatus(['active']);

			expect(jobQueue.findJobsByStatus).toHaveBeenCalledWith(['active']);
			expect(jobs).toHaveLength(1);
			expect(jobs.at(0)?.id).toBe('123');
		});
	});

	describe('stopJob', () => {
		it('should stop an active job by sending abort signal only', async () => {
			await scalingService.setupQueue();
			const job = mock<QueueJob>({ isActive: vi.fn().mockResolvedValue(true) });

			const result = await scalingService.stopJob(job);

			expect(job.sendMessage).toHaveBeenCalledWith({ kind: 'abort-job' });
			expect(job.remove).not.toHaveBeenCalled();
			expect(result).toBe(true);
		});

		it('should stop an inactive job', async () => {
			await scalingService.setupQueue();
			const job = mock<QueueJob>({ isActive: vi.fn().mockResolvedValue(false) });

			const result = await scalingService.stopJob(job);

			expect(job.remove).toHaveBeenCalled();
			expect(result).toBe(true);
		});

		it('should report failure to stop a job', async () => {
			await scalingService.setupQueue();
			const job = mock<QueueJob>({
				isActive: vi.fn().mockImplementation(() => {
					throw new UnexpectedError('Something went wrong');
				}),
			});

			const result = await scalingService.stopJob(job);

			expect(result).toBe(false);
		});
	});

	describe('message handling', () => {
		it('should handle send-chunk messages', async () => {
			const activeExecutions = mock<ActiveExecutions>();
			scalingService = newScalingService(activeExecutions);

			await scalingService.setupQueue();

			const messageHandler = getMessageHandler();

			const sendChunkMessage = {
				kind: 'send-chunk',
				executionId: 'exec-123',
				chunkText: { type: 'item', content: 'test' },
				workerId: 'worker-456',
			};

			messageHandler('job-789', sendChunkMessage as unknown as JobMessage);

			expect(activeExecutions.sendChunk).toHaveBeenCalledWith('exec-123', {
				type: 'item',
				content: 'test',
			});
		});

		it('should resolve responsePromise with empty response when job-finished has success=true', async () => {
			const activeExecutions = mock<ActiveExecutions>();
			scalingService = newScalingService(activeExecutions);

			await scalingService.setupQueue();

			const messageHandler = getMessageHandler();

			const jobFinishedMessage = {
				kind: 'job-finished',
				executionId: 'exec-123',
				workerId: 'worker-456',
				success: true,
			};

			messageHandler('job-789', jobFinishedMessage as unknown as JobMessage);

			expect(activeExecutions.resolveResponsePromise).toHaveBeenCalledWith('exec-123', {});
		});

		it('should resolve responsePromise with error response when job-finished has success=false', async () => {
			const activeExecutions = mock<ActiveExecutions>();
			scalingService = newScalingService(activeExecutions);

			await scalingService.setupQueue();

			const messageHandler = getMessageHandler();

			const jobFinishedMessage = {
				kind: 'job-finished',
				executionId: 'exec-123',
				workerId: 'worker-456',
				success: false,
			};

			messageHandler('job-789', jobFinishedMessage as unknown as JobMessage);

			expect(activeExecutions.resolveResponsePromise).toHaveBeenCalledWith('exec-123', {
				body: { message: 'Workflow execution failed' },
				statusCode: 500,
			});
		});

		it('should keep waitTill when storing a v2 job-finished result', async () => {
			const activeExecutions = mock<ActiveExecutions>();
			scalingService = newScalingService(activeExecutions);

			await scalingService.setupQueue();

			const messageHandler = getMessageHandler();

			const waitTill = new Date('2026-07-25T12:00:00.000Z');
			// Progress messages are JSON-serialized in transit, so dates arrive as ISO strings
			const jobFinishedMessage = {
				kind: 'job-finished',
				version: 2,
				executionId: 'exec-123',
				workerId: 'worker-456',
				success: true,
				status: 'waiting',
				startedAt: '2026-07-25T11:59:00.000Z',
				stoppedAt: '2026-07-25T11:59:30.000Z',
				waitTill: waitTill.toISOString(),
			};

			messageHandler('job-789', jobFinishedMessage as unknown as JobMessage);

			const result = scalingService.popJobResult('exec-123');

			expect(result?.status).toBe('waiting');
			// A missing waitTill makes main treat a waiting execution as finished and
			// delete it when the workflow does not save successful executions
			expect(result?.waitTill).toEqual(waitTill);
		});
	});

	describe('recoverFromQueue', () => {
		it('should mark running executions as crashed if they are missing from the queue and queue is empty', async () => {
			await scalingService.setupQueue();
			executionRepository.getInProgressExecutionIds.mockResolvedValue(['123']);
			jobQueue.findJobsByStatus.mockResolvedValue([]);

			await scalingService.recoverFromQueue();

			expect(executionRepository.markAsCrashed).toHaveBeenCalledWith(['123']);
		});

		it('should mark running executions as crashed if they are missing from the queue and queue is not empty', async () => {
			await scalingService.setupQueue();
			executionRepository.getInProgressExecutionIds.mockResolvedValue(['123']);
			jobQueue.findJobsByStatus.mockResolvedValue([
				mock<QueueJob>({ data: { executionId: '321' } }),
			]);

			await scalingService.recoverFromQueue();

			expect(executionRepository.markAsCrashed).toHaveBeenCalledWith(['123']);
		});

		it('should not mark running executions as crashed if they are present in the queue', async () => {
			await scalingService.setupQueue();
			executionRepository.getInProgressExecutionIds.mockResolvedValue(['123']);
			jobQueue.findJobsByStatus.mockResolvedValue([
				mock<QueueJob>({ data: { executionId: '123' } }),
			]);

			await scalingService.recoverFromQueue();

			expect(executionRepository.markAsCrashed).not.toHaveBeenCalled();
		});
	});

	describe('MCP response handling', () => {
		it('should process mcp-response messages without throwing', async () => {
			await scalingService.setupQueue();

			const messageHandler = getMessageHandler();

			const mcpResponseMessage = {
				kind: 'mcp-response',
				executionId: 'exec-123',
				mcpType: 'service',
				sessionId: 'session-456',
				messageId: 'msg-789',
				response: { success: true },
				workerId: 'worker-abc',
			};

			// Should not throw - all mains receive and try to process MCP responses
			// Only the one with the pending response/session will handle it successfully
			// The handler is async but we verify it doesn't throw synchronously
			expect(() =>
				messageHandler('job-999', mcpResponseMessage as unknown as JobMessage),
			).not.toThrow();
		});

		it('should handle mcp-response for trigger type', async () => {
			await scalingService.setupQueue();

			const messageHandler = getMessageHandler();

			const mcpTriggerResponseMessage = {
				kind: 'mcp-response',
				executionId: 'exec-456',
				mcpType: 'trigger',
				sessionId: 'session-trigger',
				messageId: 'msg-trigger',
				response: { toolResult: 'test-data' },
				workerId: 'worker-xyz',
			};

			// Should not throw for trigger type either
			expect(() =>
				messageHandler('job-trigger', mcpTriggerResponseMessage as unknown as JobMessage),
			).not.toThrow();
		});

		it('should restore an offloaded body without reclaiming it on the session-owning main', async () => {
			await scalingService.setupQueue();
			mcpServer.hasSession.mockReturnValue(true);
			webhookResponseRelay.restoreOffloadedBody.mockImplementation(async (response) => response);

			const messageHandler = getMessageHandler();

			const response = {
				body: { binaryData: { id: 'database:abc' } },
				headers: {},
				statusCode: 200,
			};

			messageHandler('job-trigger', {
				kind: 'mcp-response',
				executionId: 'exec-456',
				mcpType: 'trigger',
				sessionId: 'session-trigger',
				messageId: 'msg-trigger',
				response,
				workerId: 'worker-xyz',
			});

			await vi.waitFor(() =>
				expect(webhookResponseRelay.restoreOffloadedBody).toHaveBeenCalledWith(response, {
					reclaim: false,
					context: { executionId: 'exec-456' },
				}),
			);
			expect(mcpServer.handleWorkerResponse).toHaveBeenCalledWith(
				'session-trigger',
				'msg-trigger',
				response,
			);
		});

		it('should decode a Buffer body the worker base64-encoded to relay it', async () => {
			await scalingService.setupQueue();
			mcpServer.hasSession.mockReturnValue(true);
			webhookResponseRelay.restoreOffloadedBody.mockImplementation(async (response) => response);

			const messageHandler = getMessageHandler();

			messageHandler('job-trigger', {
				kind: 'mcp-response',
				executionId: 'exec-456',
				mcpType: 'trigger',
				sessionId: 'session-trigger',
				messageId: 'msg-trigger',
				response: {
					body: { [ENCODED_BUFFER_KEY]: Buffer.from('tool output').toString('base64') },
					headers: {},
					statusCode: 200,
				},
				workerId: 'worker-xyz',
			});

			await vi.waitFor(() =>
				expect(webhookResponseRelay.restoreOffloadedBody).toHaveBeenCalledWith(
					expect.objectContaining({ body: Buffer.from('tool output') }),
					{ reclaim: false, context: { executionId: 'exec-456' } },
				),
			);
		});

		it('should not restore an offloaded body on a main that does not hold the session', async () => {
			await scalingService.setupQueue();
			mcpServer.hasSession.mockReturnValue(false);
			mcpServer.hasPendingResponse.mockReturnValue(false);

			const messageHandler = getMessageHandler();

			messageHandler('job-trigger', {
				kind: 'mcp-response',
				executionId: 'exec-456',
				mcpType: 'trigger',
				sessionId: 'session-trigger',
				messageId: 'msg-trigger',
				response: {
					body: { binaryData: { id: 'database:abc' } },
					headers: {},
					statusCode: 200,
				},
				workerId: 'worker-xyz',
			});

			await vi.waitFor(() => expect(mcpServer.hasSession).toHaveBeenCalledWith('session-trigger'));
			expect(mcpServer.hasPendingResponse).toHaveBeenCalledWith('session-trigger', 'msg-trigger');
			expect(webhookResponseRelay.restoreOffloadedBody).not.toHaveBeenCalled();
			expect(mcpServer.handleWorkerResponse).not.toHaveBeenCalled();
		});

		it('should deliver a response a pending call awaits when the transport is gone', async () => {
			await scalingService.setupQueue();
			mcpServer.hasSession.mockReturnValue(false);
			mcpServer.hasPendingResponse.mockReturnValue(true);
			webhookResponseRelay.restoreOffloadedBody.mockImplementation(async (response) => response);

			const messageHandler = getMessageHandler();

			const response = {
				body: { binaryData: { id: 'database:abc' } },
				headers: {},
				statusCode: 200,
			};

			messageHandler('job-trigger', {
				kind: 'mcp-response',
				executionId: 'exec-456',
				mcpType: 'trigger',
				sessionId: 'session-trigger',
				messageId: 'msg-trigger',
				response,
				workerId: 'worker-xyz',
			});

			await vi.waitFor(() =>
				expect(mcpServer.handleWorkerResponse).toHaveBeenCalledWith(
					'session-trigger',
					'msg-trigger',
					response,
				),
			);
			expect(webhookResponseRelay.restoreOffloadedBody).toHaveBeenCalledWith(response, {
				reclaim: false,
				context: { executionId: 'exec-456' },
			});
		});
	});
});

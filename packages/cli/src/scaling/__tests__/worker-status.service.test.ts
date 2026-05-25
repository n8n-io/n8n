import type { WorkerStatus } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { Push } from '@/push';
import type { Publisher } from '@/scaling/pubsub/publisher.service';
import { WorkerStatusService } from '@/scaling/worker-status.service.ee';

describe('WorkerStatusService', () => {
	let workerStatusService: WorkerStatusService;
	let mockInstanceSettings: InstanceSettings;
	let mockPublisher: jest.Mocked<Publisher>;
	let mockPush: jest.Mocked<Push>;

	beforeEach(() => {
		mockInstanceSettings = { instanceType: 'main' } as InstanceSettings;

		mockPublisher = mock<Publisher>();
		mockPush = mock<Push>();

		workerStatusService = new WorkerStatusService(
			mock(), // jobProcessor
			mockInstanceSettings,
			mockPublisher,
			mockPush,
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('handleWorkerStatusResponse', () => {
		const createMockWorkerStatus = (
			overrides?: Partial<WorkerStatus & { requestingUserId: string }>,
		): WorkerStatus & { requestingUserId: string } => ({
			senderId: 'test-worker-1',
			runningJobsSummary: [],
			freeMem: 1000000,
			totalMem: 2000000,
			uptime: 3600,
			loadAvg: [1.0, 1.5, 2.0],
			cpus: '4x Intel Core',
			arch: 'x64',
			platform: 'linux',
			hostname: 'test-worker',
			interfaces: [],
			version: '1.0.0',
			isInContainer: false,
			process: {
				memory: {
					available: 1000000,
					constraint: 2000000,
					rss: 100000,
					heapTotal: 50000,
					heapUsed: 30000,
				},
				uptime: 3600,
			},
			host: {
				memory: {
					total: 2000000,
					free: 1000000,
				},
			},
			requestingUserId: 'user-123',
			...overrides,
		});

		it('should send worker status only to requesting user', () => {
			const requestingUserId = 'user-123';
			const mockWorkerStatus = createMockWorkerStatus({ requestingUserId });

			workerStatusService.handleWorkerStatusResponse(mockWorkerStatus);

			expect(mockPush.sendToUsers).toHaveBeenCalledWith(
				{
					type: 'sendWorkerStatusMessage',
					data: {
						workerId: 'test-worker-1',
						status: mockWorkerStatus,
					},
				},
				[requestingUserId],
			);
		});

		it('should include worker status data in push message', () => {
			const requestingUserId = 'user-456';
			const mockWorkerStatus = createMockWorkerStatus({
				requestingUserId,
				senderId: 'worker-2',
				freeMem: 2000000,
			});

			workerStatusService.handleWorkerStatusResponse(mockWorkerStatus);

			expect(mockPush.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'sendWorkerStatusMessage',
					data: expect.objectContaining({
						workerId: 'worker-2',
						status: expect.objectContaining({
							freeMem: 2000000,
							requestingUserId,
						}),
					}),
				}),
				[requestingUserId],
			);
		});
	});

	describe('drainWorker', () => {
		it('should publish drain-worker to the API workerId target hostId', async () => {
			const workerId = 'worker-host-1';

			await workerStatusService.drainWorker(workerId);

			expect(mockPublisher.publishCommand).toHaveBeenCalledWith({
				command: 'drain-worker',
				targets: [workerId],
			});
		});
	});
});

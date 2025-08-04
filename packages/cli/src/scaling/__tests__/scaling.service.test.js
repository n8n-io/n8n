'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
const BullModule = __importStar(require('bull'));
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const constants_1 = require('../constants');
const scaling_service_1 = require('../scaling.service');
const queue = (0, jest_mock_extended_1.mock)({
	client: { ping: jest.fn() },
});
jest.mock('bull', () => ({
	__esModule: true,
	default: jest.fn(() => queue),
}));
describe('ScalingService', () => {
	const Bull = jest.mocked(BullModule.default);
	const globalConfig = (0, backend_test_utils_1.mockInstance)(config_1.GlobalConfig, {
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
	});
	const instanceSettings = di_1.Container.get(n8n_core_1.InstanceSettings);
	const jobProcessor = (0, jest_mock_extended_1.mock)();
	let scalingService;
	let registerMainOrWebhookListenersSpy;
	let registerWorkerListenersSpy;
	let scheduleQueueRecoverySpy;
	let stopQueueRecoverySpy;
	let stopQueueMetricsSpy;
	let getRunningJobsCountSpy;
	const bullConstructorArgs = [
		constants_1.QUEUE_NAME,
		{
			prefix: globalConfig.queue.bull.prefix,
			settings: globalConfig.queue.bull.settings,
			createClient: expect.any(Function),
		},
	];
	beforeEach(() => {
		jest.clearAllMocks();
		instanceSettings.instanceType = 'main';
		instanceSettings.markAsLeader();
		scalingService = new scaling_service_1.ScalingService(
			(0, backend_test_utils_1.mockLogger)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			jobProcessor,
			globalConfig,
			(0, jest_mock_extended_1.mock)(),
			instanceSettings,
			(0, jest_mock_extended_1.mock)(),
		);
		getRunningJobsCountSpy = jest.spyOn(scalingService, 'getRunningJobsCount');
		scaling_service_1.ScalingService.prototype.scheduleQueueRecovery = jest.fn();
		registerMainOrWebhookListenersSpy = jest.spyOn(
			scalingService,
			'registerMainOrWebhookListeners',
		);
		registerWorkerListenersSpy = jest.spyOn(scalingService, 'registerWorkerListeners');
		scheduleQueueRecoverySpy = jest.spyOn(scalingService, 'scheduleQueueRecovery');
		stopQueueRecoverySpy = jest.spyOn(scalingService, 'stopQueueRecovery');
		stopQueueMetricsSpy = jest.spyOn(scalingService, 'stopQueueMetrics');
	});
	describe('setupQueue', () => {
		describe('if leader main', () => {
			it('should set up queue + listeners + queue recovery', async () => {
				await scalingService.setupQueue();
				expect(Bull).toHaveBeenCalledWith(...bullConstructorArgs);
				expect(registerMainOrWebhookListenersSpy).toHaveBeenCalled();
				expect(registerWorkerListenersSpy).not.toHaveBeenCalled();
				expect(scheduleQueueRecoverySpy).toHaveBeenCalled();
			});
		});
		describe('if follower main', () => {
			it('should set up queue + listeners', async () => {
				instanceSettings.markAsFollower();
				await scalingService.setupQueue();
				expect(Bull).toHaveBeenCalledWith(...bullConstructorArgs);
				expect(registerMainOrWebhookListenersSpy).toHaveBeenCalled();
				expect(registerWorkerListenersSpy).not.toHaveBeenCalled();
				expect(scheduleQueueRecoverySpy).not.toHaveBeenCalled();
			});
		});
		describe('if worker', () => {
			it('should set up queue + listeners', async () => {
				instanceSettings.instanceType = 'worker';
				await scalingService.setupQueue();
				expect(Bull).toHaveBeenCalledWith(...bullConstructorArgs);
				expect(registerWorkerListenersSpy).toHaveBeenCalled();
				expect(registerMainOrWebhookListenersSpy).not.toHaveBeenCalled();
			});
		});
		describe('webhook', () => {
			it('should set up a queue + listeners', async () => {
				instanceSettings.instanceType = 'webhook';
				await scalingService.setupQueue();
				expect(Bull).toHaveBeenCalledWith(...bullConstructorArgs);
				expect(registerWorkerListenersSpy).not.toHaveBeenCalled();
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
			expect(queue.process).toHaveBeenCalledWith(
				constants_1.JOB_TYPE_NAME,
				concurrency,
				expect.any(Function),
			);
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
				scalingService.queueRecoveryContext.timeout = 1;
				jest.spyOn(scalingService, 'isQueueMetricsEnabled', 'get').mockReturnValue(true);
				await scalingService.stop();
				expect(getRunningJobsCountSpy).not.toHaveBeenCalled();
				expect(queue.pause).toHaveBeenCalledWith(true, true);
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
				expect(queue.pause).toHaveBeenCalled();
				expect(stopQueueRecoverySpy).not.toHaveBeenCalled();
			});
		});
	});
	describe('pingQueue', () => {
		it('should ping the queue', async () => {
			await scalingService.setupQueue();
			await scalingService.pingQueue();
			expect(queue.client.ping).toHaveBeenCalled();
		});
	});
	describe('addJob', () => {
		it('should add a job', async () => {
			await scalingService.setupQueue();
			queue.add.mockResolvedValue((0, jest_mock_extended_1.mock)({ id: '456' }));
			const jobData = (0, jest_mock_extended_1.mock)({ executionId: '123' });
			await scalingService.addJob(jobData, { priority: 100 });
			expect(queue.add).toHaveBeenCalledWith(constants_1.JOB_TYPE_NAME, jobData, {
				priority: 100,
				removeOnComplete: true,
				removeOnFail: true,
			});
		});
	});
	describe('getJob', () => {
		it('should get a job', async () => {
			await scalingService.setupQueue();
			const jobId = '123';
			queue.getJob.mockResolvedValue((0, jest_mock_extended_1.mock)({ id: jobId }));
			const job = await scalingService.getJob(jobId);
			expect(queue.getJob).toHaveBeenCalledWith(jobId);
			expect(job?.id).toBe(jobId);
		});
	});
	describe('findJobsByStatus', () => {
		it('should find jobs by status', async () => {
			await scalingService.setupQueue();
			queue.getJobs.mockResolvedValue([(0, jest_mock_extended_1.mock)({ id: '123' })]);
			const jobs = await scalingService.findJobsByStatus(['active']);
			expect(queue.getJobs).toHaveBeenCalledWith(['active']);
			expect(jobs).toHaveLength(1);
			expect(jobs.at(0)?.id).toBe('123');
		});
		it('should filter out `null` in Redis response', async () => {
			await scalingService.setupQueue();
			queue.getJobs.mockResolvedValue([(0, jest_mock_extended_1.mock)(), null]);
			const jobs = await scalingService.findJobsByStatus(['waiting']);
			expect(jobs).toHaveLength(1);
		});
	});
	describe('stopJob', () => {
		it('should stop an active job', async () => {
			await scalingService.setupQueue();
			const job = (0, jest_mock_extended_1.mock)({ isActive: jest.fn().mockResolvedValue(true) });
			const result = await scalingService.stopJob(job);
			expect(job.progress).toHaveBeenCalledWith({ kind: 'abort-job' });
			expect(job.discard).toHaveBeenCalled();
			expect(job.moveToFailed).toHaveBeenCalledWith(
				new n8n_workflow_1.ExecutionCancelledError('123'),
				true,
			);
			expect(result).toBe(true);
		});
		it('should stop an inactive job', async () => {
			await scalingService.setupQueue();
			const job = (0, jest_mock_extended_1.mock)({ isActive: jest.fn().mockResolvedValue(false) });
			const result = await scalingService.stopJob(job);
			expect(job.remove).toHaveBeenCalled();
			expect(result).toBe(true);
		});
		it('should report failure to stop a job', async () => {
			await scalingService.setupQueue();
			const job = (0, jest_mock_extended_1.mock)({
				isActive: jest.fn().mockImplementation(() => {
					throw new n8n_workflow_1.ApplicationError('Something went wrong');
				}),
			});
			const result = await scalingService.stopJob(job);
			expect(result).toBe(false);
		});
	});
	describe('message handling', () => {
		it('should handle send-chunk messages', async () => {
			const activeExecutions = (0, jest_mock_extended_1.mock)();
			scalingService = new scaling_service_1.ScalingService(
				(0, backend_test_utils_1.mockLogger)(),
				(0, jest_mock_extended_1.mock)(),
				activeExecutions,
				jobProcessor,
				globalConfig,
				(0, jest_mock_extended_1.mock)(),
				instanceSettings,
				(0, jest_mock_extended_1.mock)(),
			);
			await scalingService.setupQueue();
			const messageHandler = queue.on.mock.calls.find(
				([event]) => event === 'global:progress',
			)?.[1];
			expect(messageHandler).toBeDefined();
			const sendChunkMessage = {
				kind: 'send-chunk',
				executionId: 'exec-123',
				chunkText: { type: 'item', content: 'test' },
				workerId: 'worker-456',
			};
			messageHandler('job-789', sendChunkMessage);
			expect(activeExecutions.sendChunk).toHaveBeenCalledWith('exec-123', {
				type: 'item',
				content: 'test',
			});
		});
	});
});
//# sourceMappingURL=scaling.service.test.js.map

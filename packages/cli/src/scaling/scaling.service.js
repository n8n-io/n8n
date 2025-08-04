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
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
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
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.ScalingService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const constants_1 = require('@n8n/constants');
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const node_assert_1 = __importStar(require('node:assert'));
const active_executions_1 = require('@/active-executions');
const config_2 = __importDefault(require('@/config'));
const constants_2 = require('@/constants');
const event_service_1 = require('@/events/event.service');
const utils_1 = require('@/utils');
const constants_3 = require('./constants');
const job_processor_1 = require('./job-processor');
let ScalingService = class ScalingService {
	constructor(
		logger,
		errorReporter,
		activeExecutions,
		jobProcessor,
		globalConfig,
		executionRepository,
		instanceSettings,
		eventService,
	) {
		this.logger = logger;
		this.errorReporter = errorReporter;
		this.activeExecutions = activeExecutions;
		this.jobProcessor = jobProcessor;
		this.globalConfig = globalConfig;
		this.executionRepository = executionRepository;
		this.instanceSettings = instanceSettings;
		this.eventService = eventService;
		this.jobCounters = { completed: 0, failed: 0 };
		this.queueRecoveryContext = {
			batchSize: config_2.default.getEnv('executions.queueRecovery.batchSize'),
			waitMs: config_2.default.getEnv('executions.queueRecovery.interval') * 60 * 1000,
		};
		this.logger = this.logger.scoped('scaling');
	}
	async setupQueue() {
		const { default: BullQueue } = await Promise.resolve().then(() =>
			__importStar(require('bull')),
		);
		const { RedisClientService } = await Promise.resolve().then(() =>
			__importStar(require('@/services/redis-client.service')),
		);
		if (this.queue) return;
		const service = di_1.Container.get(RedisClientService);
		const bullPrefix = this.globalConfig.queue.bull.prefix;
		const prefix = service.toValidPrefix(bullPrefix);
		this.queue = new BullQueue(constants_3.QUEUE_NAME, {
			prefix,
			settings: this.globalConfig.queue.bull.settings,
			createClient: (type) => service.createClient({ type: `${type}(bull)` }),
		});
		this.registerListeners();
		if (this.instanceSettings.isLeader) this.scheduleQueueRecovery();
		this.scheduleQueueMetrics();
		this.logger.debug('Queue setup completed');
	}
	setupWorker(concurrency) {
		this.assertWorker();
		this.assertQueue();
		void this.queue.process(constants_3.JOB_TYPE_NAME, concurrency, async (job) => {
			try {
				this.eventService.emit('job-dequeued', {
					executionId: job.data.executionId,
					workflowId: job.data.workflowId,
					hostId: this.instanceSettings.hostId,
					jobId: job.id.toString(),
				});
				if (!this.hasValidJobData(job)) {
					throw new n8n_workflow_1.UnexpectedError('Worker received invalid job', {
						extra: {
							jobData: (0, n8n_workflow_1.jsonStringify)(job, { replaceCircularRefs: true }),
						},
					});
				}
				await this.jobProcessor.processJob(job);
			} catch (error) {
				await this.reportJobProcessingError((0, n8n_workflow_1.ensureError)(error), job);
			}
		});
		this.logger.debug('Worker setup completed');
	}
	async reportJobProcessingError(error, job) {
		const { executionId } = job.data;
		this.logger.error(`Worker errored while running execution ${executionId} (job ${job.id})`, {
			error,
			executionId,
			jobId: job.id,
		});
		const msg = {
			kind: 'job-failed',
			executionId,
			workerId: this.instanceSettings.hostId,
			errorMsg: error.message,
			errorStack: error.stack ?? '',
		};
		await job.progress(msg);
		this.errorReporter.error(error, { executionId });
		throw error;
	}
	async stop() {
		const { instanceType } = this.instanceSettings;
		if (instanceType === 'main') await this.stopMain();
		else if (instanceType === 'worker') await this.stopWorker();
	}
	async pauseQueue() {
		await this.queue.pause(true, true);
		this.logger.debug('Paused queue');
	}
	async stopMain() {
		if (this.instanceSettings.isSingleMain) await this.pauseQueue();
		if (this.queueRecoveryContext.timeout) this.stopQueueRecovery();
		if (this.isQueueMetricsEnabled) this.stopQueueMetrics();
	}
	async stopWorker() {
		await this.pauseQueue();
		let count = 0;
		while (this.getRunningJobsCount() !== 0) {
			if (count++ % 4 === 0) {
				this.logger.info(
					`Waiting for ${this.getRunningJobsCount()} active executions to finish...`,
				);
			}
			await (0, n8n_workflow_1.sleep)(500);
		}
	}
	async pingQueue() {
		await this.queue.client.ping();
	}
	async getPendingJobCounts() {
		const { active, waiting } = await this.queue.getJobCounts();
		return { active, waiting };
	}
	async addJob(jobData, { priority }) {
		(0, node_assert_1.strict)(priority > 0 && priority <= Number.MAX_SAFE_INTEGER);
		const jobOptions = {
			priority,
			removeOnComplete: true,
			removeOnFail: true,
		};
		const job = await this.queue.add(constants_3.JOB_TYPE_NAME, jobData, jobOptions);
		const { executionId } = jobData;
		const jobId = job.id;
		this.logger.info(`Enqueued execution ${executionId} (job ${jobId})`, { executionId, jobId });
		this.eventService.emit('job-enqueued', {
			executionId,
			workflowId: jobData.workflowId,
			hostId: this.instanceSettings.hostId,
			jobId: jobId.toString(),
		});
		return job;
	}
	async getJob(jobId) {
		return await this.queue.getJob(jobId);
	}
	async findJobsByStatus(statuses) {
		const jobs = await this.queue.getJobs(statuses);
		return jobs.filter((job) => job !== null);
	}
	async stopJob(job) {
		const props = { jobId: job.id, executionId: job.data.executionId };
		try {
			if (await job.isActive()) {
				await job.progress({ kind: 'abort-job' });
				await job.discard();
				await job.moveToFailed(
					new n8n_workflow_1.ExecutionCancelledError(job.data.executionId),
					true,
				);
				return true;
			}
			await job.remove();
			this.logger.debug('Stopped inactive job', props);
			return true;
		} catch (error) {
			(0, node_assert_1.default)(error instanceof Error);
			this.logger.error('Failed to stop job', {
				...props,
				error: {
					message: error.message,
					name: error.name,
					stack: error.stack,
				},
			});
			return false;
		}
	}
	getRunningJobsCount() {
		return this.jobProcessor.getRunningJobIds().length;
	}
	registerListeners() {
		const { instanceType } = this.instanceSettings;
		if (instanceType === 'main' || instanceType === 'webhook') {
			this.registerMainOrWebhookListeners();
		} else if (instanceType === 'worker') {
			this.registerWorkerListeners();
		}
	}
	registerWorkerListeners() {
		this.queue.on('global:progress', (jobId, msg) => {
			if (!this.isJobMessage(msg)) return;
			if (msg.kind === 'abort-job') this.jobProcessor.stopJob(jobId);
		});
		this.queue.on('error', (error) => {
			if ('code' in error && error.code === 'ECONNREFUSED') return;
			if (error.message.includes('Error initializing Lua scripts')) {
				this.logger.error('Fatal error initializing worker', { error });
				this.logger.error('Exiting process...');
				process.exit(1);
			}
			this.logger.error('Queue errored', { error });
			throw error;
		});
	}
	registerMainOrWebhookListeners() {
		this.queue.on('error', (error) => {
			if ('code' in error && error.code === 'ECONNREFUSED') return;
			this.logger.error('Queue errored', { error });
			throw error;
		});
		this.queue.on('global:progress', (jobId, msg) => {
			if (!this.isJobMessage(msg)) return;
			switch (msg.kind) {
				case 'send-chunk':
					this.activeExecutions.sendChunk(msg.executionId, msg.chunkText);
					break;
				case 'respond-to-webhook':
					const decodedResponse = this.decodeWebhookResponse(msg.response);
					this.activeExecutions.resolveResponsePromise(msg.executionId, decodedResponse);
					break;
				case 'job-finished':
					this.activeExecutions.resolveResponsePromise(msg.executionId, {});
					this.logger.info(`Execution ${msg.executionId} (job ${jobId}) finished successfully`, {
						workerId: msg.workerId,
						executionId: msg.executionId,
						jobId,
					});
					break;
				case 'job-failed':
					this.logger.error(
						[
							`Execution ${msg.executionId} (job ${jobId}) failed`,
							msg.errorStack ? `\n${msg.errorStack}\n` : '',
						].join(''),
						{
							workerId: msg.workerId,
							errorMsg: msg.errorMsg,
							executionId: msg.executionId,
							jobId,
						},
					);
					break;
				case 'abort-job':
					break;
				default:
					(0, utils_1.assertNever)(msg);
			}
		});
		if (this.isQueueMetricsEnabled) {
			this.queue.on('global:completed', () => this.jobCounters.completed++);
			this.queue.on('global:failed', () => this.jobCounters.failed++);
		}
	}
	isJobMessage(candidate) {
		return typeof candidate === 'object' && candidate !== null && 'kind' in candidate;
	}
	decodeWebhookResponse(response) {
		if (
			typeof response === 'object' &&
			typeof response.body === 'object' &&
			response.body !== null &&
			'__@N8nEncodedBuffer@__' in response.body &&
			typeof response.body['__@N8nEncodedBuffer@__'] === 'string'
		) {
			response.body = Buffer.from(
				response.body['__@N8nEncodedBuffer@__'],
				n8n_workflow_1.BINARY_ENCODING,
			);
		}
		return response;
	}
	assertQueue() {
		if (this.queue) return;
		throw new n8n_workflow_1.UnexpectedError('This method must be called after `setupQueue`');
	}
	assertWorker() {
		if (this.instanceSettings.instanceType === 'worker') return;
		throw new n8n_workflow_1.UnexpectedError('This method must be called on a `worker` instance');
	}
	get isQueueMetricsEnabled() {
		return (
			this.globalConfig.endpoints.metrics.includeQueueMetrics &&
			this.instanceSettings.instanceType === 'main' &&
			this.instanceSettings.isSingleMain
		);
	}
	scheduleQueueMetrics() {
		if (!this.isQueueMetricsEnabled || this.queueMetricsInterval) return;
		this.queueMetricsInterval = setInterval(async () => {
			const pendingJobCounts = await this.getPendingJobCounts();
			this.eventService.emit('job-counts-updated', {
				...pendingJobCounts,
				...this.jobCounters,
			});
			this.jobCounters.completed = 0;
			this.jobCounters.failed = 0;
		}, this.globalConfig.endpoints.metrics.queueMetricsInterval *
			constants_1.Time.seconds.toMilliseconds);
	}
	stopQueueMetrics() {
		if (this.queueMetricsInterval) {
			clearInterval(this.queueMetricsInterval);
			this.queueMetricsInterval = undefined;
			this.logger.debug('Queue metrics collection stopped');
		}
	}
	scheduleQueueRecovery(waitMs = this.queueRecoveryContext.waitMs) {
		this.queueRecoveryContext.timeout = setTimeout(async () => {
			try {
				const nextWaitMs = await this.recoverFromQueue();
				this.scheduleQueueRecovery(nextWaitMs);
			} catch (error) {
				this.logger.error('Failed to recover dangling executions from queue', {
					msg: this.toErrorMsg(error),
				});
				this.logger.error('Retrying...');
				this.scheduleQueueRecovery();
			}
		}, waitMs);
		const wait = [
			this.queueRecoveryContext.waitMs / constants_1.Time.minutes.toMilliseconds,
			'min',
		].join(' ');
		this.logger.debug(`Scheduled queue recovery check for next ${wait}`);
	}
	stopQueueRecovery() {
		if (!this.queueRecoveryContext.timeout) return;
		clearTimeout(this.queueRecoveryContext.timeout);
		this.logger.debug('Queue recovery stopped');
	}
	async recoverFromQueue() {
		const { waitMs, batchSize } = this.queueRecoveryContext;
		const storedIds = await this.executionRepository.getInProgressExecutionIds(batchSize);
		if (storedIds.length === 0) {
			this.logger.debug('Completed queue recovery check, no dangling executions');
			return waitMs;
		}
		const runningJobs = await this.findJobsByStatus(['active', 'waiting']);
		const queuedIds = new Set(runningJobs.map((job) => job.data.executionId));
		if (queuedIds.size === 0) {
			this.logger.debug('Completed queue recovery check, no dangling executions');
			return waitMs;
		}
		const danglingIds = storedIds.filter((id) => !queuedIds.has(id));
		if (danglingIds.length === 0) {
			this.logger.debug('Completed queue recovery check, no dangling executions');
			return waitMs;
		}
		await this.executionRepository.markAsCrashed(danglingIds);
		this.logger.info('Completed queue recovery check, recovered dangling executions', {
			danglingIds,
		});
		return storedIds.length >= this.queueRecoveryContext.batchSize ? waitMs / 2 : waitMs;
	}
	toErrorMsg(error) {
		return error instanceof Error
			? error.message
			: (0, n8n_workflow_1.jsonStringify)(error, { replaceCircularRefs: true });
	}
	hasValidJobData(job) {
		return (
			(0, backend_common_1.isObjectLiteral)(job.data) &&
			'executionId' in job.data &&
			'loadStaticData' in job.data
		);
	}
};
exports.ScalingService = ScalingService;
__decorate(
	[
		(0, decorators_1.OnShutdown)(constants_2.HIGHEST_SHUTDOWN_PRIORITY),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', Promise),
	],
	ScalingService.prototype,
	'stop',
	null,
);
__decorate(
	[
		(0, decorators_1.OnLeaderTakeover)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	ScalingService.prototype,
	'scheduleQueueRecovery',
	null,
);
__decorate(
	[
		(0, decorators_1.OnLeaderStepdown)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', void 0),
	],
	ScalingService.prototype,
	'stopQueueRecovery',
	null,
);
exports.ScalingService = ScalingService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			n8n_core_1.ErrorReporter,
			active_executions_1.ActiveExecutions,
			job_processor_1.JobProcessor,
			config_1.GlobalConfig,
			db_1.ExecutionRepository,
			n8n_core_1.InstanceSettings,
			event_service_1.EventService,
		]),
	],
	ScalingService,
);
//# sourceMappingURL=scaling.service.js.map

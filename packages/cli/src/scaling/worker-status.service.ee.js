'use strict';
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
exports.WorkerStatusService = void 0;
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const node_os_1 = __importDefault(require('node:os'));
const constants_1 = require('@/constants');
const push_1 = require('@/push');
const job_processor_1 = require('./job-processor');
const publisher_service_1 = require('./pubsub/publisher.service');
let WorkerStatusService = class WorkerStatusService {
	constructor(jobProcessor, instanceSettings, publisher, push) {
		this.jobProcessor = jobProcessor;
		this.instanceSettings = instanceSettings;
		this.publisher = publisher;
		this.push = push;
	}
	async requestWorkerStatus() {
		if (this.instanceSettings.instanceType !== 'main') return;
		return await this.publisher.publishCommand({ command: 'get-worker-status' });
	}
	handleWorkerStatusResponse(payload) {
		this.push.broadcast({
			type: 'sendWorkerStatusMessage',
			data: {
				workerId: payload.senderId,
				status: payload,
			},
		});
	}
	async publishWorkerResponse() {
		await this.publisher.publishWorkerResponse({
			senderId: this.instanceSettings.hostId,
			response: 'response-to-get-worker-status',
			payload: this.generateStatus(),
		});
	}
	generateStatus() {
		return {
			senderId: this.instanceSettings.hostId,
			runningJobsSummary: this.jobProcessor.getRunningJobsSummary(),
			freeMem: node_os_1.default.freemem(),
			totalMem: node_os_1.default.totalmem(),
			uptime: process.uptime(),
			loadAvg: node_os_1.default.loadavg(),
			cpus: this.getOsCpuString(),
			arch: node_os_1.default.arch(),
			platform: node_os_1.default.platform(),
			hostname: node_os_1.default.hostname(),
			interfaces: Object.values(node_os_1.default.networkInterfaces()).flatMap((interfaces) =>
				(interfaces ?? [])?.map((net) => ({
					family: net.family,
					address: net.address,
					internal: net.internal,
				})),
			),
			version: constants_1.N8N_VERSION,
		};
	}
	getOsCpuString() {
		const cpus = node_os_1.default.cpus();
		if (cpus.length === 0) return 'no CPU info';
		return `${cpus.length}x ${cpus[0].model} - speed: ${cpus[0].speed}`;
	}
};
exports.WorkerStatusService = WorkerStatusService;
__decorate(
	[
		(0, decorators_1.OnPubSubEvent)('response-to-get-worker-status', { instanceType: 'main' }),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	WorkerStatusService.prototype,
	'handleWorkerStatusResponse',
	null,
);
__decorate(
	[
		(0, decorators_1.OnPubSubEvent)('get-worker-status', { instanceType: 'worker' }),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', Promise),
	],
	WorkerStatusService.prototype,
	'publishWorkerResponse',
	null,
);
exports.WorkerStatusService = WorkerStatusService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			job_processor_1.JobProcessor,
			n8n_core_1.InstanceSettings,
			publisher_service_1.Publisher,
			push_1.Push,
		]),
	],
	WorkerStatusService,
);
//# sourceMappingURL=worker-status.service.ee.js.map

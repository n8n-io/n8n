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
Object.defineProperty(exports, '__esModule', { value: true });
exports.TaskRunnerProcess = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const a = __importStar(require('node:assert/strict'));
const node_child_process_1 = require('node:child_process');
const process = __importStar(require('node:process'));
const forward_to_logger_1 = require('./forward-to-logger');
const node_process_oom_detector_1 = require('./node-process-oom-detector');
const task_broker_auth_service_1 = require('./task-broker/auth/task-broker-auth.service');
const task_runner_lifecycle_events_1 = require('./task-runner-lifecycle-events');
const typed_emitter_1 = require('../typed-emitter');
let TaskRunnerProcess = class TaskRunnerProcess extends typed_emitter_1.TypedEmitter {
	get isRunning() {
		return this.process !== null;
	}
	get pid() {
		return this.process?.pid;
	}
	get runPromise() {
		return this._runPromise;
	}
	constructor(logger, runnerConfig, authService, runnerLifecycleEvents) {
		super();
		this.runnerConfig = runnerConfig;
		this.authService = authService;
		this.runnerLifecycleEvents = runnerLifecycleEvents;
		this.process = null;
		this._runPromise = null;
		this.oomDetector = null;
		this.isShuttingDown = false;
		this.passthroughEnvVars = [
			'PATH',
			'HOME',
			'GENERIC_TIMEZONE',
			'NODE_FUNCTION_ALLOW_BUILTIN',
			'NODE_FUNCTION_ALLOW_EXTERNAL',
			'N8N_SENTRY_DSN',
			'N8N_RUNNERS_INSECURE_MODE',
			'N8N_VERSION',
			'ENVIRONMENT',
			'DEPLOYMENT_NAME',
			'NODE_PATH',
		];
		this.mode = 'secure';
		a.ok(
			this.runnerConfig.mode !== 'external',
			'Task Runner Process cannot be used in external mode',
		);
		this.mode = this.runnerConfig.insecureMode ? 'insecure' : 'secure';
		this.logger = logger.scoped('task-runner');
		this.runnerLifecycleEvents.on('runner:failed-heartbeat-check', () => {
			this.logger.warn('Task runner failed heartbeat check, restarting...');
			void this.forceRestart();
		});
		this.runnerLifecycleEvents.on('runner:timed-out-during-task', () => {
			this.logger.warn('Task runner timed out during task, restarting...');
			void this.forceRestart();
		});
	}
	async start() {
		a.ok(!this.process, 'Task Runner Process already running');
		const grantToken = await this.authService.createGrantToken();
		const taskBrokerUri = `http://127.0.0.1:${this.runnerConfig.port}`;
		this.process = this.startNode(grantToken, taskBrokerUri);
		(0, forward_to_logger_1.forwardToLogger)(this.logger, this.process, '[Task Runner]: ');
		this.monitorProcess(this.process);
	}
	startNode(grantToken, taskBrokerUri) {
		const startScript = require.resolve('@n8n/task-runner/start');
		const flags =
			this.mode === 'secure'
				? ['--disallow-code-generation-from-strings', '--disable-proto=delete']
				: [];
		return (0, node_child_process_1.spawn)('node', [...flags, startScript], {
			env: this.getProcessEnvVars(grantToken, taskBrokerUri),
		});
	}
	async stop() {
		if (!this.process) return;
		this.isShuttingDown = true;
		this.killNode();
		await this._runPromise;
		this.isShuttingDown = false;
	}
	async forceRestart() {
		if (!this.process) return;
		this.process.kill('SIGKILL');
		await this._runPromise;
	}
	killNode() {
		if (!this.process) return;
		this.process.kill();
	}
	monitorProcess(taskRunnerProcess) {
		this._runPromise = new Promise((resolve) => {
			this.oomDetector = new node_process_oom_detector_1.NodeProcessOomDetector(taskRunnerProcess);
			taskRunnerProcess.on('exit', (code) => {
				this.onProcessExit(code, resolve);
			});
		});
	}
	onProcessExit(_code, resolveFn) {
		this.process = null;
		this.emit('exit', { reason: this.oomDetector?.didProcessOom ? 'oom' : 'unknown' });
		resolveFn();
		if (!this.isShuttingDown) {
			setImmediate(async () => await this.start());
		}
	}
	getProcessEnvVars(grantToken, taskBrokerUri) {
		const envVars = {
			N8N_RUNNERS_GRANT_TOKEN: grantToken,
			N8N_RUNNERS_TASK_BROKER_URI: taskBrokerUri,
			N8N_RUNNERS_MAX_PAYLOAD: this.runnerConfig.maxPayload.toString(),
			N8N_RUNNERS_MAX_CONCURRENCY: this.runnerConfig.maxConcurrency.toString(),
			N8N_RUNNERS_TASK_TIMEOUT: this.runnerConfig.taskTimeout.toString(),
			N8N_RUNNERS_HEARTBEAT_INTERVAL: this.runnerConfig.heartbeatInterval.toString(),
			...this.getPassthroughEnvVars(),
		};
		if (this.runnerConfig.maxOldSpaceSize) {
			envVars.NODE_OPTIONS = `--max-old-space-size=${this.runnerConfig.maxOldSpaceSize}`;
		}
		return envVars;
	}
	getPassthroughEnvVars() {
		return this.passthroughEnvVars.reduce((env, key) => {
			if (process.env[key]) {
				env[key] = process.env[key];
			}
			return env;
		}, {});
	}
};
exports.TaskRunnerProcess = TaskRunnerProcess;
__decorate(
	[
		(0, decorators_1.OnShutdown)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', Promise),
	],
	TaskRunnerProcess.prototype,
	'stop',
	null,
);
exports.TaskRunnerProcess = TaskRunnerProcess = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			config_1.TaskRunnersConfig,
			task_broker_auth_service_1.TaskBrokerAuthService,
			task_runner_lifecycle_events_1.TaskRunnerLifecycleEvents,
		]),
	],
	TaskRunnerProcess,
);
//# sourceMappingURL=task-runner-process.js.map

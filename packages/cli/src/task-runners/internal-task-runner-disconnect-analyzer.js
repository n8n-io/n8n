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
Object.defineProperty(exports, '__esModule', { value: true });
exports.InternalTaskRunnerDisconnectAnalyzer = void 0;
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
const default_task_runner_disconnect_analyzer_1 = require('./default-task-runner-disconnect-analyzer');
const task_runner_oom_error_1 = require('./errors/task-runner-oom-error');
const sliding_window_signal_1 = require('./sliding-window-signal');
const task_runner_process_1 = require('./task-runner-process');
let InternalTaskRunnerDisconnectAnalyzer = class InternalTaskRunnerDisconnectAnalyzer extends default_task_runner_disconnect_analyzer_1.DefaultTaskRunnerDisconnectAnalyzer {
	constructor(runnerConfig, taskRunnerProcess) {
		super();
		this.runnerConfig = runnerConfig;
		this.taskRunnerProcess = taskRunnerProcess;
		this.exitReasonSignal = new sliding_window_signal_1.SlidingWindowSignal(
			this.taskRunnerProcess,
			'exit',
			{
				windowSizeInMs: 500,
			},
		);
	}
	async toDisconnectError(opts) {
		const exitCode = await this.awaitExitSignal();
		if (exitCode === 'oom') {
			return new task_runner_oom_error_1.TaskRunnerOomError(
				opts.runnerId ?? 'Unknown runner ID',
				this.isCloudDeployment,
			);
		}
		return await super.toDisconnectError(opts);
	}
	async awaitExitSignal() {
		if (this.runnerConfig.mode === 'external') {
			return 'unknown';
		}
		const lastExitReason = await this.exitReasonSignal.getSignal();
		return lastExitReason?.reason ?? 'unknown';
	}
};
exports.InternalTaskRunnerDisconnectAnalyzer = InternalTaskRunnerDisconnectAnalyzer;
exports.InternalTaskRunnerDisconnectAnalyzer = InternalTaskRunnerDisconnectAnalyzer = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			config_1.TaskRunnersConfig,
			task_runner_process_1.TaskRunnerProcess,
		]),
	],
	InternalTaskRunnerDisconnectAnalyzer,
);
//# sourceMappingURL=internal-task-runner-disconnect-analyzer.js.map

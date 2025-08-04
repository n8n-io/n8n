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
Object.defineProperty(exports, '__esModule', { value: true });
exports.DefaultTaskRunnerDisconnectAnalyzer = void 0;
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
const task_runner_disconnected_error_1 = require('./errors/task-runner-disconnected-error');
const task_runner_failed_heartbeat_error_1 = require('./errors/task-runner-failed-heartbeat.error');
let DefaultTaskRunnerDisconnectAnalyzer = class DefaultTaskRunnerDisconnectAnalyzer {
	get isCloudDeployment() {
		return di_1.Container.get(config_1.GlobalConfig).deployment.type === 'cloud';
	}
	async toDisconnectError(opts) {
		const { reason, heartbeatInterval } = opts;
		if (reason === 'failed-heartbeat-check' && heartbeatInterval) {
			return new task_runner_failed_heartbeat_error_1.TaskRunnerFailedHeartbeatError(
				heartbeatInterval,
				di_1.Container.get(config_1.GlobalConfig).deployment.type !== 'cloud',
			);
		}
		return new task_runner_disconnected_error_1.TaskRunnerDisconnectedError(
			opts.runnerId ?? 'Unknown runner ID',
			this.isCloudDeployment,
		);
	}
};
exports.DefaultTaskRunnerDisconnectAnalyzer = DefaultTaskRunnerDisconnectAnalyzer;
exports.DefaultTaskRunnerDisconnectAnalyzer = DefaultTaskRunnerDisconnectAnalyzer = __decorate(
	[(0, di_1.Service)()],
	DefaultTaskRunnerDisconnectAnalyzer,
);
//# sourceMappingURL=default-task-runner-disconnect-analyzer.js.map

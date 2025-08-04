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
exports.TaskBrokerWsServer = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const constants_1 = require('@n8n/constants');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
const constants_2 = require('@/constants');
const default_task_runner_disconnect_analyzer_1 = require('@/task-runners/default-task-runner-disconnect-analyzer');
const task_runner_lifecycle_events_1 = require('@/task-runners/task-runner-lifecycle-events');
const task_broker_service_1 = require('./task-broker.service');
function heartbeat() {
	this.isAlive = true;
}
let TaskBrokerWsServer = class TaskBrokerWsServer {
	constructor(logger, taskBroker, disconnectAnalyzer, taskTunnersConfig, runnerLifecycleEvents) {
		this.logger = logger;
		this.taskBroker = taskBroker;
		this.disconnectAnalyzer = disconnectAnalyzer;
		this.taskTunnersConfig = taskTunnersConfig;
		this.runnerLifecycleEvents = runnerLifecycleEvents;
		this.runnerConnections = new Map();
	}
	start() {
		this.startHeartbeatChecks();
	}
	startHeartbeatChecks() {
		const { heartbeatInterval } = this.taskTunnersConfig;
		if (heartbeatInterval <= 0) {
			throw new n8n_workflow_1.UserError('Heartbeat interval must be greater than 0');
		}
		this.heartbeatTimer = setInterval(() => {
			for (const [runnerId, connection] of this.runnerConnections.entries()) {
				if (!connection.isAlive) {
					void this.removeConnection(
						runnerId,
						'failed-heartbeat-check',
						constants_2.WsStatusCodes.CloseNoStatus,
					);
					this.runnerLifecycleEvents.emit('runner:failed-heartbeat-check');
					return;
				}
				connection.isAlive = false;
				connection.ping();
			}
		}, heartbeatInterval * constants_1.Time.seconds.toMilliseconds);
	}
	async stop() {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = undefined;
		}
		await this.stopConnectedRunners();
	}
	setDisconnectAnalyzer(disconnectAnalyzer) {
		this.disconnectAnalyzer = disconnectAnalyzer;
	}
	getDisconnectAnalyzer() {
		return this.disconnectAnalyzer;
	}
	sendMessage(id, message) {
		this.runnerConnections
			.get(id)
			?.send((0, n8n_workflow_1.jsonStringify)(message, { replaceCircularRefs: true }));
	}
	add(id, connection) {
		connection.isAlive = true;
		connection.on('pong', heartbeat);
		let isConnected = false;
		const onMessage = async (data) => {
			try {
				const buffer = Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data);
				const message = JSON.parse(buffer.toString('utf8'));
				if (!isConnected && message.type !== 'runner:info') {
					return;
				} else if (!isConnected && message.type === 'runner:info') {
					await this.removeConnection(id);
					isConnected = true;
					this.runnerConnections.set(id, connection);
					this.taskBroker.registerRunner(
						{
							id,
							taskTypes: message.types,
							lastSeen: new Date(),
							name: message.name,
						},
						this.sendMessage.bind(this, id),
					);
					this.logger.info(`Registered runner "${message.name}" (${id}) `);
					return;
				}
				void this.taskBroker.onRunnerMessage(id, message);
			} catch (error) {
				this.logger.error(`Couldn't parse message from runner "${id}"`, {
					error: error,
					id,
					data,
				});
			}
		};
		connection.once('close', async () => {
			connection.off('pong', heartbeat);
			connection.off('message', onMessage);
			await this.removeConnection(id);
		});
		connection.on('message', onMessage);
		connection.send(JSON.stringify({ type: 'broker:inforequest' }));
	}
	async removeConnection(id, reason = 'unknown', code = constants_2.WsStatusCodes.CloseNormal) {
		const connection = this.runnerConnections.get(id);
		if (connection) {
			const disconnectError = await this.disconnectAnalyzer.toDisconnectError({
				runnerId: id,
				reason,
				heartbeatInterval: this.taskTunnersConfig.heartbeatInterval,
			});
			this.taskBroker.deregisterRunner(id, disconnectError);
			this.logger.debug(`Deregistered runner "${id}"`);
			connection.close(code);
			this.runnerConnections.delete(id);
		}
	}
	handleRequest(req, _res) {
		this.add(req.query.id, req.ws);
	}
	async stopConnectedRunners() {
		await Promise.all(
			Array.from(this.runnerConnections.keys()).map(
				async (id) =>
					await this.removeConnection(
						id,
						'shutting-down',
						constants_2.WsStatusCodes.CloseGoingAway,
					),
			),
		);
	}
};
exports.TaskBrokerWsServer = TaskBrokerWsServer;
exports.TaskBrokerWsServer = TaskBrokerWsServer = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			task_broker_service_1.TaskBroker,
			default_task_runner_disconnect_analyzer_1.DefaultTaskRunnerDisconnectAnalyzer,
			config_1.TaskRunnersConfig,
			task_runner_lifecycle_events_1.TaskRunnerLifecycleEvents,
		]),
	],
	TaskBrokerWsServer,
);
//# sourceMappingURL=task-broker-ws-server.js.map

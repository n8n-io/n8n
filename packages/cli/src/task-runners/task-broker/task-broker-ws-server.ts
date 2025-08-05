import { Logger } from '@n8n/backend-common';
import { TaskRunnersConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import type { BrokerMessage, RunnerMessage } from '@n8n/task-runner';
import { jsonStringify, UserError } from 'n8n-workflow';
import type WebSocket from 'ws';

import { WsStatusCodes } from '@/constants';
import { DefaultTaskRunnerDisconnectAnalyzer } from '@/task-runners/default-task-runner-disconnect-analyzer';
import type {
	DisconnectAnalyzer,
	DisconnectReason,
	TaskBrokerServerInitRequest,
	TaskBrokerServerInitResponse,
} from '@/task-runners/task-broker/task-broker-types';
import { TaskRunnerLifecycleEvents } from '@/task-runners/task-runner-lifecycle-events';

import { TaskBroker, type MessageCallback, type TaskRunner } from './task-broker.service';

function heartbeat(this: WebSocket) {
	this.isAlive = true;
}

type WsStatusCode = (typeof WsStatusCodes)[keyof typeof WsStatusCodes];

/**
 * Responsible for handling WebSocket connections with task runners
 * and monitoring the connection liveness
 */
@Service()
export class TaskBrokerWsServer {
	runnerConnections: Map<TaskRunner['id'], WebSocket> = new Map();

	private heartbeatTimer: NodeJS.Timeout | undefined;

	constructor(
		private readonly logger: Logger,
		private readonly taskBroker: TaskBroker,
		private disconnectAnalyzer: DefaultTaskRunnerDisconnectAnalyzer,
		private readonly taskTunnersConfig: TaskRunnersConfig,
		private readonly runnerLifecycleEvents: TaskRunnerLifecycleEvents,
	) {}

	start() {
		this.startHeartbeatChecks();
	}

	private startHeartbeatChecks() {
		const { heartbeatInterval } = this.taskTunnersConfig;

		if (heartbeatInterval <= 0) {
			throw new UserError('Heartbeat interval must be greater than 0');
		}

		this.heartbeatTimer = setInterval(() => {
			for (const [runnerId, connection] of this.runnerConnections.entries()) {
				if (!connection.isAlive) {
					void this.removeConnection(
						runnerId,
						'failed-heartbeat-check',
						WsStatusCodes.CloseNoStatus,
					);
					this.runnerLifecycleEvents.emit('runner:failed-heartbeat-check');
					return;
				}
				connection.isAlive = false;
				connection.ping();
			}
		}, heartbeatInterval * Time.seconds.toMilliseconds);
	}

	async stop() {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = undefined;
		}

		await this.stopConnectedRunners();
	}

	setDisconnectAnalyzer(disconnectAnalyzer: DisconnectAnalyzer) {
		this.disconnectAnalyzer = disconnectAnalyzer;
	}

	getDisconnectAnalyzer() {
		return this.disconnectAnalyzer;
	}

	sendMessage(id: TaskRunner['id'], message: BrokerMessage.ToRunner.All) {
		this.runnerConnections.get(id)?.send(jsonStringify(message, { replaceCircularRefs: true }));
	}

	add(id: TaskRunner['id'], connection: WebSocket) {
		connection.isAlive = true;
		connection.on('pong', heartbeat);

		let isConnected = false;

		const onMessage = async (data: WebSocket.RawData) => {
			try {
				const buffer = Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data);

				const message: RunnerMessage.ToBroker.All = JSON.parse(
					buffer.toString('utf8'),
				) as RunnerMessage.ToBroker.All;

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
						this.sendMessage.bind(this, id) as MessageCallback,
					);

					this.logger.info(`Registered runner "${message.name}" (${id}) `);
					return;
				}

				void this.taskBroker.onRunnerMessage(id, message);
			} catch (error) {
				this.logger.error(`Couldn't parse message from runner "${id}"`, {
					error: error as unknown,
					id,
					data,
				});
			}
		};

		// Makes sure to remove the session if the connection is closed
		connection.once('close', async () => {
			connection.off('pong', heartbeat);
			connection.off('message', onMessage);
			await this.removeConnection(id);
		});

		connection.on('message', onMessage);
		connection.send(
			JSON.stringify({ type: 'broker:inforequest' } as BrokerMessage.ToRunner.InfoRequest),
		);
	}

	async removeConnection(
		id: TaskRunner['id'],
		reason: DisconnectReason = 'unknown',
		code: WsStatusCode = WsStatusCodes.CloseNormal,
	) {
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

	handleRequest(req: TaskBrokerServerInitRequest, _res: TaskBrokerServerInitResponse) {
		this.add(req.query.id, req.ws);
	}

	private async stopConnectedRunners() {
		// TODO: We should give runners some time to finish their tasks before
		// shutting them down
		await Promise.all(
			Array.from(this.runnerConnections.keys()).map(
				async (id) =>
					await this.removeConnection(id, 'shutting-down', WsStatusCodes.CloseGoingAway),
			),
		);
	}
}

import { Logger } from '@n8n/backend-common';
import { GlobalConfig, TaskRunnersConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import type { BrokerMessage, RunnerMessage } from '@n8n/task-runner';
import { sleep } from '@n8n/utils/sleep';
import { jsonStringify, UserError } from 'n8n-workflow';
import type WebSocket from 'ws';

import { WsStatusCodes } from '@/constants';
import { EventService } from '@/events/event.service';
import { DefaultTaskRunnerDisconnectAnalyzer } from '@/task-runners/default-task-runner-disconnect-analyzer';
import type {
	DisconnectAnalyzer,
	DisconnectReason,
	TaskBrokerServerInitRequest,
	TaskBrokerServerInitResponse,
} from '@/task-runners/task-broker/task-broker-types';
import {
	TaskRunnerLifecycleEvents,
	type TaskRunnerLifecycleEventMap,
} from '@/task-runners/task-runner-lifecycle-events';

import { TaskBroker, type MessageCallback, type TaskRunner } from './task-broker.service';

function heartbeat(this: WebSocket) {
	this.isAlive = true;
}

type WsStatusCode = (typeof WsStatusCodes)[keyof typeof WsStatusCodes];

type RemoveConnectionOptions = {
	reason?: DisconnectReason;
	/** Close code sent to the runner. */
	code?: WsStatusCode;
	/**
	 * The connection the caller intends to remove. If the runner is registered
	 * with a different connection by now, the removal is skipped as stale.
	 */
	expectedConnection?: WebSocket;
};

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
		private readonly taskRunnersConfig: TaskRunnersConfig,
		private readonly runnerLifecycleEvents: TaskRunnerLifecycleEvents,
		private readonly globalConfig: GlobalConfig,
		private readonly eventService: EventService,
	) {}

	start() {
		this.startHeartbeatChecks();
		this.runnerLifecycleEvents.on('runner:unresponsive', this.onRunnerUnresponsive);
	}

	private readonly onRunnerUnresponsive = ({
		runnerId,
	}: TaskRunnerLifecycleEventMap['runner:unresponsive']) => {
		void this.removeConnection(runnerId, {
			reason: 'runner-unresponsive',
			code: WsStatusCodes.CloseProtocolError,
		});
	};

	private startHeartbeatChecks() {
		const { heartbeatInterval } = this.taskRunnersConfig;

		if (heartbeatInterval <= 0) {
			throw new UserError('Heartbeat interval must be greater than 0');
		}

		this.heartbeatTimer = setInterval(
			() => this.checkConnectionLiveness(),
			heartbeatInterval * Time.seconds.toMilliseconds,
		);
	}

	private checkConnectionLiveness() {
		for (const [runnerId, connection] of this.runnerConnections) {
			if (connection.isAlive) {
				connection.isAlive = false;
				connection.ping();
			} else {
				const taskTypes = this.taskBroker.getKnownRunners().get(runnerId)?.runner.taskTypes ?? [];

				void this.removeConnection(runnerId, {
					reason: 'failed-heartbeat-check',
					code: WsStatusCodes.CloseProtocolError,
					expectedConnection: connection,
				});

				this.runnerLifecycleEvents.emit('runner:failed-heartbeat-check', {
					runnerId,
					taskTypes,
				});
			}
		}
	}

	async stop() {
		this.runnerLifecycleEvents.off('runner:unresponsive', this.onRunnerUnresponsive);

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
				const buffer = Array.isArray(data)
					? Buffer.concat(data)
					: data instanceof ArrayBuffer
						? Buffer.from(data)
						: data;

				const message: RunnerMessage.ToBroker.All = JSON.parse(
					buffer.toString('utf8'),
				) as RunnerMessage.ToBroker.All;

				if (!isConnected) {
					if (message.type === 'runner:info') {
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
							() => this.isRunnerReachable(id, connection),
						);

						this.logger.info(`Registered runner "${message.name}" (${id}) `);
					}
				} else if (this.isCurrentConnection(id, connection)) {
					void this.taskBroker.onRunnerMessage(id, message);
				}
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
			await this.removeConnection(id, { expectedConnection: connection });
		});

		connection.on('message', onMessage);
		connection.send(
			JSON.stringify({ type: 'broker:inforequest' } as BrokerMessage.ToRunner.InfoRequest),
		);
	}

	async removeConnection(
		id: TaskRunner['id'],
		{
			reason = 'unknown',
			code = WsStatusCodes.CloseNormal,
			expectedConnection,
		}: RemoveConnectionOptions = {},
	) {
		const connection = this.runnerConnections.get(id);
		const isStaleRemoval =
			expectedConnection !== undefined && !this.isCurrentConnection(id, expectedConnection);

		if (connection && !isStaleRemoval) {
			// Stop routing to the runner before the disconnect analysis, which may be slow.
			this.runnerConnections.delete(id);
			connection.close(code);

			if (reason === 'failed-heartbeat-check' || reason === 'runner-unresponsive') {
				this.eventService.emit('runner-disconnected', {
					reason,
					mode: this.taskRunnersConfig.mode,
				});
			}

			const inFlightTaskIds = this.taskBroker.getInFlightTaskIds(id);

			const disconnectError = await this.disconnectAnalyzer.toDisconnectError({
				runnerId: id,
				reason,
				heartbeatInterval: this.taskRunnersConfig.heartbeatInterval,
			});

			const hasReconnected = this.runnerConnections.has(id);

			if (hasReconnected) {
				this.taskBroker.failTasks(inFlightTaskIds, disconnectError);
			} else {
				this.taskBroker.deregisterRunner(id, disconnectError);
				this.logger.debug(`Deregistered runner "${id}"`);
			}
		}
	}

	handleRequest(req: TaskBrokerServerInitRequest, _res: TaskBrokerServerInitResponse) {
		this.add(req.query.id, req.ws);
	}

	/**
	 * Whether `connection` is the connection the runner is currently registered with. A
	 * replaced connection keeps delivering the frames it already buffered, and nothing in
	 * those frames distinguishes them from the current connection's, since both speak for
	 * the same runner id.
	 */
	private isCurrentConnection(id: TaskRunner['id'], connection: WebSocket) {
		return this.runnerConnections.get(id) === connection;
	}

	/**
	 * Whether the runner behind `connection` can still be sent messages. A socket leaves
	 * `OPEN` as soon as it starts closing, while frames it already buffered keep arriving.
	 */
	private isRunnerReachable(id: TaskRunner['id'], connection: WebSocket) {
		return this.isCurrentConnection(id, connection) && connection.readyState === connection.OPEN;
	}

	private async stopConnectedRunners() {
		await this.drainActiveTasks();

		await Promise.all(
			Array.from(this.runnerConnections.entries()).map(
				async ([id, connection]) =>
					await this.removeConnection(id, {
						reason: 'shutting-down',
						code: WsStatusCodes.CloseGoingAway,
						expectedConnection: connection,
					}),
			),
		);
	}

	private async drainActiveTasks() {
		const drainTimeout = Math.floor(this.globalConfig.generic.gracefulShutdownTimeout * 0.8);

		const drainTimeoutMs = drainTimeout * Time.seconds.toMilliseconds;

		this.taskBroker.startDraining();

		for (const connection of this.runnerConnections.values()) {
			try {
				connection.send(JSON.stringify({ type: 'broker:drain' }));
			} catch {
				// Connection may be closed or errored, continue notifying other runners
			}
		}

		const start = Date.now();
		while (this.taskBroker.hasActiveTasks() && Date.now() - start < drainTimeoutMs) {
			await sleep(100);
		}

		if (this.taskBroker.hasActiveTasks()) {
			this.logger.warn(
				`Drain timeout reached after ${drainTimeout}s, will force-shutdown with active tasks...`,
			);
		}
	}
}

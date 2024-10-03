import { GlobalConfig } from '@n8n/config';
import type { Application } from 'express';
import { ServerResponse, type Server } from 'http';
import { ApplicationError } from 'n8n-workflow';
import type { Socket } from 'net';
import Container, { Service } from 'typedi';
import { parse as parseUrl } from 'url';
import { Server as WSServer } from 'ws';
import type WebSocket from 'ws';

import { Logger } from '@/logging/logger.service';
import { send } from '@/response-helper';
import { TaskRunnerAuthController } from '@/runners/auth/task-runner-auth.controller';

import type {
	RunnerMessage,
	N8nMessage,
	TaskRunnerServerInitRequest,
	TaskRunnerServerInitResponse,
} from './runner-types';
import { TaskBroker, type MessageCallback, type TaskRunner } from './task-broker.service';

function heartbeat(this: WebSocket) {
	this.isAlive = true;
}

function getEndpointBasePath(restEndpoint: string) {
	const globalConfig = Container.get(GlobalConfig);

	let path = globalConfig.taskRunners.path;
	if (path.startsWith('/')) {
		path = path.slice(1);
	}
	if (path.endsWith('/')) {
		path = path.slice(-1);
	}

	return `/${restEndpoint}/${path}`;
}

function getWsEndpoint(restEndpoint: string) {
	return `${getEndpointBasePath(restEndpoint)}/_ws`;
}

@Service()
export class TaskRunnerService {
	runnerConnections: Map<TaskRunner['id'], WebSocket> = new Map();

	constructor(
		private readonly logger: Logger,
		private readonly taskBroker: TaskBroker,
	) {}

	sendMessage(id: TaskRunner['id'], message: N8nMessage.ToRunner.All) {
		this.runnerConnections.get(id)?.send(JSON.stringify(message));
	}

	add(id: TaskRunner['id'], connection: WebSocket) {
		connection.isAlive = true;
		connection.on('pong', heartbeat);

		let isConnected = false;

		const onMessage = (data: WebSocket.RawData) => {
			try {
				const buffer = Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data);

				const message: RunnerMessage.ToN8n.All = JSON.parse(
					buffer.toString('utf8'),
				) as RunnerMessage.ToN8n.All;

				if (!isConnected && message.type !== 'runner:info') {
					return;
				} else if (!isConnected && message.type === 'runner:info') {
					this.removeConnection(id);
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

					this.sendMessage(id, { type: 'broker:runnerregistered' });

					this.logger.info(`Runner "${message.name}"(${id}) has been registered`);
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
		connection.once('close', () => {
			connection.off('pong', heartbeat);
			connection.off('message', onMessage);
			this.removeConnection(id);
		});

		connection.on('message', onMessage);
		connection.send(
			JSON.stringify({ type: 'broker:inforequest' } as N8nMessage.ToRunner.InfoRequest),
		);
	}

	removeConnection(id: TaskRunner['id']) {
		const connection = this.runnerConnections.get(id);
		if (connection) {
			this.taskBroker.deregisterRunner(id);
			connection.close();
			this.runnerConnections.delete(id);
		}
	}

	handleRequest(req: TaskRunnerServerInitRequest, _res: TaskRunnerServerInitResponse) {
		this.add(req.query.id, req.ws);
	}
}

// Checks for upgrade requests on the runners path and upgrades the connection
// then, passes the request back to the app to handle the routing
export const setupRunnerServer = (restEndpoint: string, server: Server, app: Application) => {
	const globalConfig = Container.get(GlobalConfig);
	const { authToken } = globalConfig.taskRunners;

	if (!authToken) {
		throw new ApplicationError(
			'Authentication token must be configured when task runners are enabled. Use N8N_RUNNERS_AUTH_TOKEN environment variable to set it.',
		);
	}

	const endpoint = getWsEndpoint(restEndpoint);
	const wsServer = new WSServer({ noServer: true });
	server.on('upgrade', (request: TaskRunnerServerInitRequest, socket: Socket, head) => {
		if (parseUrl(request.url).pathname !== endpoint) {
			// We can't close the connection here since the Push connections
			// are using the same HTTP server and upgrade requests and this
			// gets triggered for both
			return;
		}

		wsServer.handleUpgrade(request, socket, head, (ws) => {
			request.ws = ws;

			const response = new ServerResponse(request);
			response.writeHead = (statusCode) => {
				if (statusCode > 200) ws.close();
				return response;
			};

			// @ts-expect-error Hidden API?
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			app.handle(request, response);
		});
	});
};

export const setupRunnerHandler = (restEndpoint: string, app: Application) => {
	const wsEndpoint = getWsEndpoint(restEndpoint);
	const authEndpoint = `${getEndpointBasePath(restEndpoint)}/auth`;

	const taskRunnerAuthController = Container.get(TaskRunnerAuthController);
	const taskRunnerService = Container.get(TaskRunnerService);
	app.use(
		wsEndpoint,
		// eslint-disable-next-line @typescript-eslint/unbound-method
		taskRunnerAuthController.authMiddleware,
		(req: TaskRunnerServerInitRequest, res: TaskRunnerServerInitResponse) =>
			taskRunnerService.handleRequest(req, res),
	);

	app.post(
		authEndpoint,
		send(async (req) => await taskRunnerAuthController.createGrantToken(req)),
	);
};

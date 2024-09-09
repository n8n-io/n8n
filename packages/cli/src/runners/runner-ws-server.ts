import type { Application, Response } from 'express';
import { ServerResponse, type Server } from 'http';
import type { Socket } from 'net';
import { parse as parseUrl } from 'url';
import Container, { Service } from 'typedi';
import { Server as WSServer } from 'ws';
import type WebSocket from 'ws';
import type { AuthlessRequest } from '@/requests';
import { Logger } from '@/logger';
import type { RunnerMessage, N8nMessage } from './runner-types';
import { GlobalConfig } from '@n8n/config';
import { TaskBroker, type MessageCallback, type TaskRunner } from './task-broker.service';

export type RunnerServerRequest = AuthlessRequest<{}, {}, {}, { id: TaskRunner['id'] }> & {
	ws: WebSocket;
};
export type RunnerServerResponse = Response & { req: RunnerServerRequest };

function heartbeat(this: WebSocket) {
	this.isAlive = true;
}

@Service()
export class TaskRunnerService {
	runnerConnections: Record<TaskRunner['id'], WebSocket> = {};

	constructor(
		private readonly logger: Logger,
		private readonly taskBroker: TaskBroker,
	) {}

	sendMessage(id: TaskRunner['id'], message: N8nMessage.ToRunner.All) {
		this.runnerConnections[id]?.send(JSON.stringify(message));
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

					this.runnerConnections[id] = connection;

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
		if (id in this.runnerConnections) {
			this.runnerConnections[id].close();
			delete this.runnerConnections[id];
		}
	}

	handleRequest(req: RunnerServerRequest, _res: RunnerServerResponse) {
		this.add(req.query.id, req.ws);
	}
}

// Checks for upgrade requests on the runners path and upgrades the connection
// then, passes the request back to the app to handle the routing
export const setupRunnerServer = (restEndpoint: string, server: Server, app: Application) => {
	const globalConfig = Container.get(GlobalConfig);
	let path = globalConfig.taskRunners.path;
	if (!path.startsWith('/')) {
		path = '/' + path;
	}
	const endpoint = `/${restEndpoint}${path}`;
	const wsServer = new WSServer({ noServer: true });
	server.on('upgrade', (request: RunnerServerRequest, socket: Socket, head) => {
		if (parseUrl(request.url).pathname === endpoint) {
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
		}
	});
};

export const setupRunnerHandler = (restEndpoint: string, app: Application) => {
	const globalConfig = Container.get(GlobalConfig);
	let path = globalConfig.taskRunners.path;
	if (!path.startsWith('/')) {
		path = '/' + path;
	}
	const endpoint = `/${restEndpoint}${path}`;
	const taskRunnerService = Container.get(TaskRunnerService);
	app.use(endpoint, (req: RunnerServerRequest, res: RunnerServerResponse) =>
		taskRunnerService.handleRequest(req, res),
	);
};

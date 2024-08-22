import type { Application, Response } from 'express';
import { ServerResponse, type Server } from 'http';
import type { Socket } from 'net';
import { parse as parseUrl } from 'url';
import Container, { Service } from 'typedi';
import { Server as WSServer } from 'ws';
import type WebSocket from 'ws';
import type { AuthlessRequest } from '@/requests';
import { Logger } from '@/Logger';
import type { Agent, AgentMessage, N8nMessage } from './agent-types';
import { GlobalConfig } from '@n8n/config';
import { AgentManager, type MessageCallback } from './agent-manager.service';

export type AgentServerRequest = AuthlessRequest<{}, {}, {}, { id: Agent['id'] }> & {
	ws: WebSocket;
};
export type AgentServerResponse = Response & { req: AgentServerRequest };

function heartbeat(this: WebSocket) {
	this.isAlive = true;
}

@Service()
export class AgentService {
	agentConnections: Record<Agent['id'], WebSocket> = {};

	constructor(
		private readonly logger: Logger,
		private readonly agentManager: AgentManager,
	) {}

	sendMessage(id: Agent['id'], message: N8nMessage.ToAgent.All) {
		this.agentConnections[id]?.send(JSON.stringify(message));
	}

	add(id: Agent['id'], connection: WebSocket) {
		connection.isAlive = true;
		connection.on('pong', heartbeat);

		let isConnected = false;

		const onMessage = (data: WebSocket.RawData) => {
			try {
				const buffer = Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data);

				const message: AgentMessage.ToN8n.All = JSON.parse(
					buffer.toString('utf8'),
				) as AgentMessage.ToN8n.All;

				if (!isConnected && message.type !== 'agent:info') {
					return;
				} else if (!isConnected && message.type === 'agent:info') {
					this.removeConnection(id);
					isConnected = true;

					this.agentManager.registerAgent(
						{
							id,
							jobTypes: message.types,
							lastSeen: new Date(),
							name: message.name,
						},
						this.sendMessage.bind(this, id) as MessageCallback,
					);

					this.logger.info(`Agent "${message.name}"(${id}) has registered`);
					return;
				}

				void this.agentManager.onAgentMessage(id, message);
			} catch (error) {
				this.logger.error(`Couldn't parse message from agent "${id}"`, {
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
		connection.send(JSON.stringify({ type: 'n8n:inforequest' } as N8nMessage.ToAgent.InfoRequest));
	}

	removeConnection(id: Agent['id']) {
		if (id in this.agentConnections) {
			this.agentConnections[id].close();
			delete this.agentConnections[id];
		}
	}

	handleRequest(req: AgentServerRequest, _res: AgentServerResponse) {
		this.add(req.query.id, req.ws);
	}
}

// Checks for upgrade requests on the agents path and upgrades the connection
// then, passes the request back to the app to handle the routing
export const setupAgentServer = (restEndpoint: string, server: Server, app: Application) => {
	const globalConfig = Container.get(GlobalConfig);
	let path = globalConfig.agents.path;
	if (!path.startsWith('/')) {
		path = '/' + path;
	}
	const endpoint = `/${restEndpoint}${path}`;
	const wsServer = new WSServer({ noServer: true });
	server.on('upgrade', (request: AgentServerRequest, socket: Socket, head) => {
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

export const setupAgentHandler = (restEndpoint: string, app: Application) => {
	const globalConfig = Container.get(GlobalConfig);
	let path = globalConfig.agents.path;
	if (!path.startsWith('/')) {
		path = '/' + path;
	}
	const endpoint = `/${restEndpoint}${path}`;
	const agentService = Container.get(AgentService);
	app.use(endpoint, (req: AgentServerRequest, res: AgentServerResponse) =>
		agentService.handleRequest(req, res),
	);
};

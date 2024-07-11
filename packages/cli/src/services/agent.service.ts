import { ApplicationError, type IDataObject, type INodeExecutionData } from 'n8n-workflow';
import type { Application, Response } from 'express';
import { ServerResponse, type Server } from 'http';
import type { Socket } from 'net';
import { parse as parseUrl } from 'url';
import Container, { Service } from 'typedi';
import { Server as WSServer } from 'ws';
import type WebSocket from 'ws';
import type { AuthlessRequest } from '@/requests';
import { Logger } from '@/Logger';
import type { AgentResponse, AgentInfoRequest, AgentRequest } from '@/agentTypes';
import { nanoid } from 'nanoid';
import { assertNever } from '@/utils';

export type AgentServerRequest = AuthlessRequest<{}, {}, {}, { id: Agent['id'] }> & {
	ws: WebSocket;
};
export type AgentServerResponse = Response & { req: AgentServerRequest };

export interface Agent {
	socket: WebSocket;
	id: string;
	name: string;
	types: string[];
}

function heartbeat(this: WebSocket) {
	this.isAlive = true;
}

interface Job {
	id: string;
	agentType: string;
	settings: IDataObject;
	nodeExecutionData: INodeExecutionData[];

	jobDoneHandler: (data: INodeExecutionData[]) => void;
	jobErrorHandler: (error: unknown) => void;
}

@Service()
export class AgentService {
	agents: Record<Agent['id'], Agent>;

	jobs: Record<Job['id'], Job>;

	constructor(private logger: Logger) {
		this.agents = {};
		this.jobs = {};
	}

	async startExecution(
		agentType: string,
		settings: IDataObject,
		nodeExecutionData: INodeExecutionData[],
	): Promise<INodeExecutionData[]> {
		const id = nanoid(16);

		return await new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				if (id in this.jobs) {
					reject(new ApplicationError('Agent timed out', { level: 'info' }));
				}
			}, 10000);

			const jobDoneHandler = (data: INodeExecutionData[]) => {
				delete this.jobs[id];
				clearTimeout(timeout);
				resolve(data);
			};

			const jobErrorHandler = (error: unknown) => {
				delete this.jobs[id];
				clearTimeout(timeout);
				reject(error);
			};
			this.jobs[id] = {
				id,
				agentType,
				settings,
				nodeExecutionData,
				jobDoneHandler,
				jobErrorHandler,
			};
			console.log('running job', { agents: this.agents, agentType });

			const agent = Object.values(this.agents).find((a) => a.types.includes(agentType));
			if (!agent) {
				jobErrorHandler(
					new ApplicationError(`Unknown agent type: ${agentType}`, { level: 'warning' }),
				);
				return;
			}
			this.sendMessage(agent.id, {
				type: 'job',
				jobId: id,
				data: nodeExecutionData,
				jobType: agentType,
				settings,
			});
		});
	}

	sendMessage(id: Agent['id'], message: AgentRequest) {
		this.agents[id]?.socket.send(JSON.stringify(message));
	}

	add(id: Agent['id'], connection: WebSocket) {
		connection.isAlive = true;
		connection.on('pong', heartbeat);

		let isConnected = false;

		const onMessage = (data: WebSocket.RawData) => {
			try {
				const buffer = Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data);

				const message: AgentResponse = JSON.parse(buffer.toString('utf8')) as AgentResponse;

				if (!isConnected && message.type !== 'info') {
					return;
				} else if (!isConnected && message.type === 'info') {
					this.remove(id);
					this.agents[id] = {
						id,
						socket: connection,
						name: message.name,
						types: message.types,
					};
					isConnected = true;

					this.logger.info(`Agent "${message.name}"(${id}) has registered`);
					return;
				}

				this.onRealMessage(id, message);
			} catch (error) {
				this.logger.error(`Couldn't parse message from agent "${id}"`, {
					error: error as unknown,
					id,
					data,
				});
				console.error(error);
			}
		};

		// Makes sure to remove the session if the connection is closed
		connection.once('close', () => {
			connection.off('pong', heartbeat);
			connection.off('message', onMessage);
			this.remove(id);
		});

		connection.on('message', onMessage);
		connection.send(JSON.stringify({ type: 'info' } as AgentInfoRequest));
	}

	onRealMessage(_id: Agent['id'], message: AgentResponse) {
		console.log('new response', message);
		switch (message.type) {
			case 'jobdone':
				this.jobs[message.jobId]?.jobDoneHandler(message.data);
				break;
			case 'joberror':
				this.jobs[message.jobId]?.jobErrorHandler(message.error);
			case 'info':
				break;
			default:
				assertNever(message);
		}
	}

	remove(id: Agent['id']) {
		if (id in this.agents) {
			this.agents[id].socket.close();
			delete this.agents[id];
		}
	}

	handleRequest(req: AgentServerRequest, _res: AgentServerResponse) {
		this.add(req.query.id, req.ws);
	}
}

export const setupAgentServer = (restEndpoint: string, server: Server, app: Application) => {
	const wsServer = new WSServer({ noServer: true });
	server.on('upgrade', (request: AgentServerRequest, socket: Socket, head) => {
		if (parseUrl(request.url).pathname === `/${restEndpoint}/agent`) {
			wsServer.handleUpgrade(request, socket, head, (ws) => {
				request.ws = ws;

				const response = new ServerResponse(request);
				response.writeHead = (statusCode) => {
					if (statusCode > 200) ws.close();
					return response;
				};

				// @ts-expect-error ???
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call
				app.handle(request, response);
			});
		}
	});
};

export const setupAgentHandler = (restEndpoint: string, app: Application) => {
	const endpoint = `/${restEndpoint}/agent`;
	const agentService = Container.get(AgentService);
	app.use(endpoint, (req: AgentServerRequest, res: AgentServerResponse) =>
		agentService.handleRequest(req, res),
	);
};

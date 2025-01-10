import { Service } from '@n8n/di';
import type { Application, Request } from 'express';
import type { Server } from 'http';
import { ServerResponse } from 'http';
import type { IWorkflowDataProxyAdditionalKeys } from 'n8n-workflow';
import { jsonParse, jsonStringify, Workflow } from 'n8n-workflow';
import type { Socket } from 'net';
import { parse as parseUrl } from 'url';
import { type RawData, type WebSocket, Server as WebSocketServer } from 'ws';

import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { NodeTypes } from '@/node-types';

type ChatRequest = Request<{ workflowId: string }, {}, {}, { sessionId: string }> & {
	ws: WebSocket;
};
type Session = {
	connection: WebSocket;
	workflowId: string;
	executionId?: string;
};

function heartbeat(this: WebSocket) {
	this.isAlive = true;
}

@Service()
export class ChatService {
	private readonly sessions = new Map<string, Session>();

	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly nodeTypes: NodeTypes,
	) {
		// Ping all connected clients every 60 seconds
		setInterval(() => this.pingAll(), 60 * 1000);
	}

	getConnection(executionID: string | undefined) {
		if (!executionID) return undefined;
		for (const { connection, executionId } of this.sessions.values()) {
			if (executionId === executionID) return connection;
		}
		return undefined;
	}

	setup(server: Server, app: Application) {
		const wsServer = new WebSocketServer({ noServer: true });
		server.on('upgrade', (request: ChatRequest, socket: Socket, head) => {
			if (parseUrl(request.url).pathname?.startsWith('/chat')) {
				wsServer.handleUpgrade(request, socket, head, (ws) => {
					request.ws = ws;

					const response = new ServerResponse(request);
					response.writeHead = (statusCode) => {
						if (statusCode > 200) ws.close();
						return response;
					};

					// @ts-ignore
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call
					app.handle(request, response);
				});
			}
		});

		app.use('/chat/:workflowId', async (req: ChatRequest) => await this.startSession(req));
	}

	async startSession(req: ChatRequest) {
		const {
			ws,
			query: { sessionId },
			params: { workflowId },
		} = req;
		if (!sessionId) {
			ws.send('The query parameter "sessionId" is missing!');
			ws.close(1008);
			return;
		}

		const workflowData = await this.workflowRepository.findOne({
			where: { id: workflowId },
			relations: { shared: { project: { projectRelations: true } } },
		});

		if (workflowData === null) {
			ws.send(`Could not find workflow with id "${workflowId}"`);
			ws.close(1008);
			return;
		}

		const session: Session = this.sessions.get(sessionId) ?? { connection: ws, workflowId };
		// Make sure that the session always points to the latest websocket connection
		session.connection = ws;

		const workflow = new Workflow({
			id: workflowId,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: workflowData.active,
			nodeTypes: this.nodeTypes,
			staticData: workflowData.staticData,
			settings: workflowData.settings,
		});

		const startNode = workflowData.nodes.find(
			(node) => node.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi',
		);

		if (startNode === undefined) {
			ws.send('Could not find chat node in workflow');
			ws.close(1008);
			return;
		}

		const additionalKeys: IWorkflowDataProxyAdditionalKeys = {
			$executionId: session.executionId,
		};
		console.log(workflow, startNode, additionalKeys);

		// TODO: setup a trigger context to call `.trigger` on the chat node on every message

		ws.isAlive = true;
		ws.on('pong', heartbeat);
		this.sessions.set(sessionId, session);

		const onMessage = this.messageHandler(sessionId, session);
		ws.once('close', () => {
			ws.off('pong', heartbeat);
			ws.off('message', onMessage);
			this.sessions.delete(sessionId);
		});
		ws.on('message', onMessage);

		ws.send(
			jsonStringify({
				type: 'chat_started',
				data: { sessionId },
			}),
		);
	}

	private messageHandler(sessionId: string, { workflowId, executionId }: Session) {
		return (data: RawData) => {
			// TODO: handle closed sessions
			const buffer = Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data);
			// TODO: start a new execution, or resume an existing one
			// TODO: Add executionId to the session
			// TODO: Call `.trigger` on the chat node
			console.log(sessionId, workflowId, executionId, jsonParse(buffer.toString('utf8')));
		};
	}

	private pingAll() {
		for (const { connection, executionId } of this.sessions.values()) {
			// If a connection did not respond with a `PONG` in the last 60 seconds, disconnect
			if (!connection.isAlive) {
				return connection.terminate();
				if (executionId) {
					// TODO: schedule the execution for cancellation
				}
			}
			connection.isAlive = false;
			connection.ping();
		}
	}
}

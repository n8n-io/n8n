import { ExecutionRepository } from '@n8n/db';
import type { IExecutionResponse, Project } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import type { Application, Request } from 'express';
import type { Server } from 'http';
import { ServerResponse } from 'http';
import { ExecuteContext } from 'n8n-core';
import type { IWorkflowExecutionDataProcess } from 'n8n-workflow';
import { jsonParse, Workflow } from 'n8n-workflow';
import type { Socket } from 'net';
import { parse as parseUrl } from 'url';
import { type RawData, type WebSocket, Server as WebSocketServer } from 'ws';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { WorkflowRunner } from '@/workflow-runner';

import { NodeTypes } from '../node-types';
import { OwnershipService } from '../services/ownership.service';

type ChatRequest = Request<
	{ workflowId: string },
	{},
	{},
	{ sessionId: string; executionId?: string }
> & {
	ws: WebSocket;
};

type Session = {
	connection: WebSocket;
	executionId?: string;
	intervalId?: NodeJS.Timer;
	sendFromNode?: string;
};

type ChatMessage = {
	sessionId: string;
	action: string;
	chatInput: string;
	files?: Array<{
		name: string;
		type: string;
		data: string;
	}>;
};

function heartbeat(this: WebSocket) {
	this.isAlive = true;
}

@Service()
export class ChatService {
	private readonly sessions = new Map<string, Session>();

	constructor(private readonly executionRepository: ExecutionRepository) {
		// Ping all connected clients every 60 seconds
		setInterval(async () => await this.pingAll(), 60 * 1000);
	}

	private async getExecution(executionId: string, sessionId?: string) {
		const execution = await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});

		if (!execution) {
			throw new NotFoundError(`The execution "${executionId}" does not exist.`);
		}

		if (execution.status === 'running') {
			throw new ConflictError(`The execution "${executionId}" is running already.`);
		}

		if (execution.data?.resultData?.error) {
			throw new ConflictError(`The execution "${executionId}" has finished with error.`);
		}

		if (execution.finished) {
			throw new ConflictError(`The execution "${executionId} has finished already.`);
		}

		return execution;
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

		app.use('/chat', async (req: ChatRequest) => await this.startSession(req));
	}

	async startSession(req: ChatRequest) {
		const {
			ws,
			query: { sessionId, executionId },
		} = req;

		if (!sessionId) {
			ws.send('The query parameter "sessionId" is missing!');
			ws.close(1008);
			return;
		}

		const previousSessionConnection = this.sessions.get(sessionId)?.connection;

		ws.isAlive = true;
		ws.on('pong', heartbeat);

		if (previousSessionConnection) {
			previousSessionConnection.close(1008);
		}

		const onMessage = this.messageHandler(sessionId);

		const intervalId = setInterval(
			async () => await this.handleChatIncomingMessages(sessionId),
			3000,
		);

		ws.once('close', async () => {
			ws.off('pong', heartbeat);
			ws.off('message', await onMessage);
			clearInterval(intervalId);
			this.sessions.delete(sessionId);
		});

		ws.on('message', await onMessage);

		const session: Session = { connection: ws, executionId, intervalId };

		this.sessions.set(sessionId, session);
	}

	private async messageHandler(sessionId: string) {
		return async (data: RawData) => {
			const executionId = this.sessions.get(sessionId)?.executionId;

			if (executionId) {
				await this.resumeExecution(executionId, data);
			}
		};
	}

	updateSessionExecutionId(sessionId: string, executionId: string) {
		const session = this.sessions.get(sessionId);
		if (session) {
			session.executionId = executionId;
			return;
		}

		throw new NotFoundError(`The session "${sessionId}" does not exist.`);
	}

	private getWorkflow(execution: IExecutionResponse) {
		const { workflowData } = execution;
		return new Workflow({
			id: workflowData.id,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: workflowData.active,
			nodeTypes: Container.get(NodeTypes),
			staticData: workflowData.staticData,
			settings: workflowData.settings,
		});
	}

	private async runNode(execution: IExecutionResponse, message: ChatMessage) {
		const workflow = this.getWorkflow(execution);
		const lastNodeExecuted = execution.data.resultData.lastNodeExecuted as string;
		const node = workflow.getNode(lastNodeExecuted);
		const additionalData = await WorkflowExecuteAdditionalData.getBase();
		const executionData = execution.data.executionData?.nodeExecutionStack[0];

		if (node && executionData) {
			const inputData = executionData.data;
			const connectionInputData = executionData.data.main[0];
			const nodeType = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
			const context = new ExecuteContext(
				workflow,
				node,
				additionalData,
				'manual',
				execution.data,
				0,
				connectionInputData ?? [],
				inputData,
				executionData,
				[],
			);

			if (nodeType.onMessage) {
				return await nodeType.onMessage(context, message);
			}
		}

		return null;
	}

	private async getRunData(execution: IExecutionResponse, message: ChatMessage) {
		const { workflowData, mode: executionMode, data: runExecutionData } = execution;

		runExecutionData.executionData!.nodeExecutionStack[0].data.main = (await this.runNode(
			execution,
			message,
		)) ?? [[{ json: message }]];

		let project: Project | undefined = undefined;
		try {
			project = await Container.get(OwnershipService).getWorkflowProjectCached(workflowData.id);
		} catch (error) {
			throw new NotFoundError('Cannot find workflow');
		}

		const runData: IWorkflowExecutionDataProcess = {
			executionMode,
			executionData: runExecutionData,
			pushRef: runExecutionData.pushRef,
			workflowData,
			pinData: runExecutionData.resultData.pinData,
			projectId: project?.id,
		};

		return runData;
	}

	private async resumeExecution(executionId: string, data: RawData) {
		const execution = await this.getExecution(executionId ?? '');

		const buffer = Array.isArray(data)
			? Buffer.concat(data.map((chunk) => Buffer.from(chunk)))
			: Buffer.from(data);

		const message = jsonParse<ChatMessage>(buffer.toString('utf8'));

		if (message.files) {
			message.files = message.files.map((file) => ({
				...file,
				data: file.data.includes('base64,') ? file.data.split('base64,')[1] : file.data,
			}));
		}

		await Container.get(WorkflowRunner).run(
			await this.getRunData(execution, message),
			true,
			true,
			executionId,
		);
	}

	private async cancelExecution(executionId: string) {
		await this.executionRepository.update({ id: executionId }, { status: 'canceled' });
	}

	private async handleChatIncomingMessages(sessionId: string) {
		const { connection, executionId, sendFromNode } = this.sessions.get(sessionId)!;

		if (!executionId) return;

		const execution = await this.getExecution(executionId);

		if (execution.status === 'waiting') {
			const lastNodeExecuted = execution.data.resultData.lastNodeExecuted as string;
			if (sendFromNode === lastNodeExecuted) return;
			const nodeExecutionData =
				execution.data.resultData.runData[lastNodeExecuted][0]?.data?.main[0];
			const message = nodeExecutionData?.[0] ? nodeExecutionData[0].sendMessage : undefined;

			if (message) {
				connection.send(message);
				this.sessions.get(sessionId)!.sendFromNode = lastNodeExecuted;
			}
		}
	}

	/*
	 *  If a connection did not respond with a `PONG` in the last 60 seconds, disconnect
	 */
	private async pingAll() {
		const sessionsToClose: string[] = [];

		for (const sessionId of this.sessions.keys()) {
			const { connection, executionId, intervalId } = this.sessions.get(sessionId)!;

			if (!connection.isAlive) {
				if (executionId) await this.cancelExecution(executionId);
				connection.terminate();
				clearInterval(intervalId);
				sessionsToClose.push(sessionId);
			}

			connection.isAlive = false;
			connection.ping();
		}

		for (const sessionId of sessionsToClose) {
			this.sessions.delete(sessionId);
		}
	}
}

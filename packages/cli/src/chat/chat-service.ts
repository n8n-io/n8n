import { ExecutionRepository } from '@n8n/db';
import type { IExecutionResponse, Project } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import type { Application } from 'express';
import type { Server } from 'http';
import { ServerResponse } from 'http';
import { ExecuteContext } from 'n8n-core';
import type {
	IBinaryKeyData,
	INodeExecutionData,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import { jsonParse, Workflow, BINARY_ENCODING } from 'n8n-workflow';
import type { Socket } from 'net';
import { parse as parseUrl } from 'url';
import { type RawData, type WebSocket, Server as WebSocketServer } from 'ws';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { WorkflowRunner } from '@/workflow-runner';

import type { ChatMessage, ChatRequest, Session } from './chat-service.types';
import { NodeTypes } from '../node-types';
import { OwnershipService } from '../services/ownership.service';

function heartbeat(this: WebSocket) {
	this.isAlive = true;
}

const PING_INTERVAL = 60 * 1000;
const CHECK_FOR_RESPONSE_INTERVAL = 3000;

@Service()
export class ChatService {
	private readonly sessions = new Map<string, Session>();

	constructor(private readonly executionRepository: ExecutionRepository) {
		setInterval(async () => await this.pingAllAndRemoveDisconnected(), PING_INTERVAL);
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
			query: { sessionId, executionId, isPublic },
		} = req;

		if (!sessionId) {
			ws.send('The query parameter "sessionId" is missing!');
			ws.close(1008);
			return;
		}

		ws.isAlive = true;
		ws.on('pong', heartbeat);

		const onMessage = this.incomingMessageHandler(sessionId);
		const respondToChat = this.outgoingMessageHandler(sessionId);

		const intervalId = setInterval(async () => await respondToChat(), CHECK_FOR_RESPONSE_INTERVAL);

		ws.once('close', async () => {
			ws.off('pong', heartbeat);
			ws.off('message', onMessage);
			clearInterval(intervalId);
			this.sessions.delete(sessionId);
		});

		ws.on('message', onMessage);

		const session: Session = {
			connection: ws,
			executionId,
			intervalId,
			nodeWaitingForResponse: null,
			isPublic,
		};

		this.sessions.set(sessionId, session);
	}

	private outgoingMessageHandler(sessionId: string) {
		return async () => {
			const { connection, executionId, nodeWaitingForResponse, isPublic } =
				this.sessions.get(sessionId) || {};

			if (!executionId || !connection || nodeWaitingForResponse) return;

			const execution = await this.getExecution(executionId, sessionId);

			if (!execution) {
				return;
			}

			if (execution?.status === 'waiting') {
				const lastNodeExecuted = execution.data.resultData.lastNodeExecuted as string;
				const nodeExecutionData =
					execution.data.resultData.runData[lastNodeExecuted][0]?.data?.main[0];
				const message = nodeExecutionData?.[0] ? nodeExecutionData[0].sendMessage : undefined;

				if (message) {
					connection.send(message);
					this.sessions.get(sessionId)!.nodeWaitingForResponse = lastNodeExecuted;
				}
				return;
			}

			if (execution?.status === 'success') {
				if (!isPublic) {
					connection.close();
					return;
				}
				const lastNodeExecuted = execution.data.resultData.lastNodeExecuted as string;
				const nodeExecutionData =
					execution.data.resultData.runData[lastNodeExecuted][0]?.data?.main[0];
				const json = nodeExecutionData?.[0] ? nodeExecutionData[0].json : {};

				let textMessage = json.output ?? json.text ?? json.message ?? '';
				if (typeof textMessage !== 'string') {
					textMessage = JSON.stringify(textMessage);
				}

				connection.send(textMessage);
				connection.close();

				return;
			}
		};
	}

	private incomingMessageHandler(sessionId: string) {
		return async (data: RawData) => {
			const executionId = this.sessions.get(sessionId)?.executionId;

			if (executionId) {
				await this.resumeExecution(executionId, data, sessionId);
				this.sessions.get(sessionId)!.nodeWaitingForResponse = null;
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

	private async getExecution(executionId: string, sessionId: string) {
		const execution = await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});

		if (!execution || ['error', 'canceled', 'crashed'].includes(execution.status)) {
			const { connection, intervalId } = this.sessions.get(sessionId) || {};
			if (connection) {
				connection.terminate();
			}
			clearInterval(intervalId);
			this.sessions.delete(sessionId);
			return null;
		}

		if (execution.status === 'running') {
			return null;
		}

		return execution;
	}

	private async cancelExecution(executionId: string) {
		await this.executionRepository.update({ id: executionId }, { status: 'canceled' });
	}

	private async resumeExecution(executionId: string, data: RawData, sessionId: string) {
		const execution = (await this.getExecution(executionId ?? '', sessionId)) as IExecutionResponse;

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

			const { sessionId, action, chatInput, files } = message;
			const binary: IBinaryKeyData = {};

			if (files) {
				for (const [index, file] of files.entries()) {
					const base64 = file.data;
					const buffer = Buffer.from(base64, BINARY_ENCODING);
					const binaryData = await context.helpers.prepareBinaryData(buffer, file.name, file.type);

					binary[`data_${index}`] = binaryData;
				}
			}

			const nodeExecutionData: INodeExecutionData = { json: { sessionId, action, chatInput } };
			if (Object.keys(binary).length > 0) {
				nodeExecutionData.binary = binary;
			}

			if (nodeType.onMessage) {
				return await nodeType.onMessage(context, nodeExecutionData);
			}

			return [[nodeExecutionData]];
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

	private async pingAllAndRemoveDisconnected() {
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

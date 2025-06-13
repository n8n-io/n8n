import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';
import { type RawData, WebSocket } from 'ws';

import { ChatExecutionManager } from './chat-execution-manager';
import type { ChatMessage, ChatRequest, Session } from './chat-service.types';
import {
	getLastNodeExecuted,
	getMessage,
	isResponseNodeMode,
	prepareMessageFromLastNode,
	shouldResumeImmediately,
} from './utils';

const PING_INTERVAL = 60 * 1000;
const CHECK_FOR_RESPONSE_INTERVAL = 3000;
const DRAIN_TIMEOUT = 50;

function heartbeat(ws: WebSocket) {
	ws.isAlive = true;
}

function closeConnection(ws: WebSocket) {
	if (ws.readyState !== WebSocket.OPEN) return;

	ws.once('drain', () => {
		ws.close();
	});

	setTimeout(() => {
		if (ws.readyState === WebSocket.OPEN) {
			ws.close();
		}
	}, DRAIN_TIMEOUT);
}

@Service()
export class ChatService {
	private readonly sessions = new Map<string, Session>();

	constructor(
		private readonly executionManager: ChatExecutionManager,
		private readonly logger: Logger,
	) {
		setInterval(async () => await this.pingAllAndRemoveDisconnected(), PING_INTERVAL);
	}

	async startSession(req: ChatRequest) {
		const {
			ws,
			query: { sessionId, executionId, isPublic },
		} = req;

		if (!sessionId || !executionId) {
			const parameter = sessionId ? 'executionId' : 'sessionId';
			ws.send(`The query parameter "${parameter}" is missing`);
			ws.close(1008);
			return;
		}

		ws.isAlive = true;
		ws.on('pong', heartbeat);

		const key = `${sessionId}|${executionId}|${isPublic ? 'public' : 'integrated'}`;

		if (this.sessions.has(key)) {
			this.sessions.get(key)?.connection.terminate();
			clearInterval(this.sessions.get(key)?.intervalId);
			this.sessions.delete(key);
		}

		const onMessage = this.incomingMessageHandler(key);
		const respondToChat = this.outgoingMessageHandler(key);

		const intervalId = setInterval(async () => await respondToChat(), CHECK_FOR_RESPONSE_INTERVAL);

		ws.once('close', async () => {
			ws.off('pong', heartbeat);
			ws.off('message', onMessage);
			clearInterval(intervalId);
			this.sessions.delete(key);
		});

		ws.on('message', onMessage);

		const session: Session = {
			connection: ws,
			executionId,
			sessionId,
			intervalId,
			waitingForResponse: false,
			isPublic,
		};

		this.sessions.set(key, session);
	}

	private outgoingMessageHandler(sessionKey: string) {
		return async () => {
			let session: Session | undefined;
			try {
				session = this.sessions.get(sessionKey);

				if (!session) return;
				if (session.isProcessing) {
					return;
				}
				session.isProcessing = true;

				const { connection, executionId, sessionId, waitingForResponse, isPublic } = session;

				if (!executionId || !connection || waitingForResponse) {
					session.isProcessing = false;
					return;
				}

				const execution = await this.getExecution(executionId, sessionKey);

				if (!execution) {
					session.isProcessing = false;
					return;
				}

				if (execution.status === 'waiting') {
					const message = getMessage(execution);

					if (message !== undefined) {
						connection.send(message);

						const lastNode = getLastNodeExecuted(execution);

						if (lastNode && shouldResumeImmediately(lastNode)) {
							connection.send('n8n|continue');
							const data = { action: 'user', chatInput: '', sessionId };
							await this.resumeExecution(executionId, data, sessionKey);
							session.waitingForResponse = false;
						} else {
							session.waitingForResponse = true;
						}
					}

					session.isProcessing = false;
					return;
				}

				if (execution.status === 'success') {
					const shouldNotReturnLastNodeResponse =
						!isPublic || (isPublic && isResponseNodeMode(execution));

					if (shouldNotReturnLastNodeResponse) {
						closeConnection(connection);
						session.isProcessing = false;
						return;
					}

					const textMessage = prepareMessageFromLastNode(execution);

					connection.send(textMessage, () => {
						closeConnection(connection);
					});

					session.isProcessing = false;
					return;
				}

				session.isProcessing = false;
			} catch (error) {
				if (session) session.isProcessing = false;
				this.logger.error(
					`Error sending message to chat in session ${sessionKey}: ${(error as Error).message}`,
				);
			}
		};
	}

	private incomingMessageHandler(sessionKey: string) {
		return async (data: RawData) => {
			try {
				const session = this.sessions.get(sessionKey);

				if (!session) return;

				const executionId = session.executionId;

				await this.resumeExecution(executionId, this.processIncomingData(data), sessionKey);
				session.waitingForResponse = false;
			} catch (error) {
				this.logger.error(
					`Error processing message from chat in session ${sessionKey}: ${(error as Error).message}`,
				);
			}
		};
	}

	private async resumeExecution(executionId: string, message: ChatMessage, sessionKey: string) {
		const execution = await this.getExecution(executionId, sessionKey);
		if (!execution) return;
		await this.executionManager.runWorkflow(execution, message);
	}

	private async getExecution(executionId: string, sessionKey: string) {
		const execution = await this.executionManager.findExecution(executionId);

		if (!execution || ['error', 'canceled', 'crashed'].includes(execution.status)) {
			const session = this.sessions.get(sessionKey);

			if (!session) return null;

			session.connection.terminate();
			clearInterval(session.intervalId);
			this.sessions.delete(sessionKey);
			return null;
		}

		if (execution.status === 'running') return null;

		return execution;
	}

	private processIncomingData(data: RawData) {
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

		return message;
	}

	private async pingAllAndRemoveDisconnected() {
		try {
			const disconnected: string[] = [];

			for (const key of this.sessions.keys()) {
				const session = this.sessions.get(key);

				if (!session) continue;

				if (!session.connection.isAlive) {
					await this.executionManager.cancelExecution(session.executionId);
					session.connection.terminate();
					clearInterval(session.intervalId);
					disconnected.push(key);
				}

				session.connection.isAlive = false;
				session.connection.ping();
			}

			for (const key of disconnected) {
				this.sessions.delete(key);
			}
		} catch (error) {
			this.logger.error(`Error pinging chat sessions: ${(error as Error).message}`);
		}
	}
}

import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { jsonParse, UnexpectedError } from 'n8n-workflow';
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

const CHECK_FOR_RESPONSE_INTERVAL = 3000;
const DRAIN_TIMEOUT = 50;
const HEARTBEAT_INTERVAL = 30 * 1000;
const HEARTBEAT_TIMEOUT = 60 * 1000;

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
		setInterval(async () => await this.checkHeartbeats(), HEARTBEAT_INTERVAL);
	}

	async startSession(req: ChatRequest) {
		const {
			ws,
			query: { sessionId, executionId, isPublic },
		} = req;

		if (!ws) {
			throw new UnexpectedError('WebSocket connection is missing');
		}

		if (!sessionId || !executionId) {
			const parameter = sessionId ? 'executionId' : 'sessionId';
			ws.send(`The query parameter "${parameter}" is missing`);
			ws.close(1008);
			return;
		}

		const execution = await this.executionManager.findExecution(executionId);

		if (!execution) {
			ws.send(`Execution with id "${executionId}" does not exist`);
			ws.close(1008);
			return;
		}

		ws.isAlive = true;

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
			isPublic,
			lastHeartbeat: Date.now(),
		};

		this.sessions.set(key, session);

		ws.send('n8n|heartbeat');
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

				const { connection, executionId, sessionId, waitingNodeName, isPublic } = session;

				if (!executionId || !connection) {
					session.isProcessing = false;
					return;
				}

				const execution = await this.getExecution(executionId, sessionKey);

				if (!execution) {
					session.isProcessing = false;
					return;
				}

				if (waitingNodeName) {
					const lastNode = getLastNodeExecuted(execution);

					if (execution.status === 'waiting' && lastNode?.name !== waitingNodeName) {
						connection.send('n8n|continue');
						session.waitingNodeName = undefined;
					}
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
							session.waitingNodeName = undefined;
						} else {
							session.waitingNodeName = lastNode?.name;
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

				const message = data.toString();

				if (message === 'n8n|heartbeat-ack') {
					session.lastHeartbeat = Date.now();
					return;
				}

				const executionId = session.executionId;

				await this.resumeExecution(executionId, this.processIncomingData(data), sessionKey);
				session.waitingNodeName = undefined;
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

	private async checkHeartbeats() {
		try {
			const now = Date.now();
			const disconnected: string[] = [];

			for (const [key, session] of this.sessions.entries()) {
				if (!session) continue;

				const timeSinceLastHeartbeat = now - (session.lastHeartbeat || 0);

				if (timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT) {
					await this.executionManager.cancelExecution(session.executionId);
					session.connection.terminate();
					clearInterval(session.intervalId);
					disconnected.push(key);
				} else {
					try {
						session.connection.send('n8n|heartbeat');
					} catch (error) {
						disconnected.push(key);
					}
				}
			}

			if (disconnected.length > 0) {
				for (const key of disconnected) {
					this.sessions.delete(key);
				}
			}
		} catch (error) {
			this.logger.error(`Error checking heartbeats: ${(error as Error).message}`);
		}
	}
}

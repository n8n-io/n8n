import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { OnShutdown } from '@n8n/decorators';
import { jsonParse, UnexpectedError, ensureError } from 'n8n-workflow';
import { type RawData, WebSocket } from 'ws';
import { z } from 'zod';

import { ChatExecutionManager } from './chat-execution-manager';
import {
	chatMessageSchema,
	type ChatMessage,
	type ChatRequest,
	Session,
} from './chat-service.types';
import { getLastNodeExecuted, getMessage, shouldResumeImmediately } from './utils';
import { ErrorReporter } from 'n8n-core';
import { IExecutionResponse } from '@n8n/db';

const CHECK_FOR_RESPONSE_INTERVAL = 3000;
const DRAIN_TIMEOUT = 50;
const HEARTBEAT_INTERVAL = 30 * 1000;
const HEARTBEAT_TIMEOUT = 60 * 1000;

/**
 * let frontend know that no user input is expected
 */
const N8N_CONTINUE = 'n8n|continue';
/**
 * send message for heartbeat check
 */
const N8N_HEARTBEAT = 'n8n|heartbeat';
/**
 * frontend did acknowledge the heartbeat
 */
const N8N_HEARTBEAT_ACK = 'n8n|heartbeat-ack';

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
	private heartbeatIntervalId: NodeJS.Timeout;

	constructor(
		private readonly executionManager: ChatExecutionManager,
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
	) {
		this.heartbeatIntervalId = setInterval(
			async () => await this.checkHeartbeats(),
			HEARTBEAT_INTERVAL,
		);
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
			ws.close(1008);
			return;
		}

		const execution = await this.executionManager.checkIfExecutionExists(executionId);

		if (!execution) {
			ws.send(`Execution with id "${executionId}" does not exist`);
			ws.close(1008);
			return;
		}

		ws.isAlive = true;

		const key = `${sessionId}|${executionId}|${isPublic ? 'public' : 'integrated'}`;

		const existingSession = this.sessions.get(key);
		if (existingSession) {
			this.cleanupSession(existingSession, key);
		}

		const onMessage = this.incomingMessageHandler(key);
		const respondToChat = this.pollAndProcessChatResponses(key);

		const intervalId = setInterval(async () => await respondToChat(), CHECK_FOR_RESPONSE_INTERVAL);

		ws.once('close', () => {
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
			isPublic: isPublic ?? false,
			isProcessing: false,
			lastHeartbeat: Date.now(),
		};

		this.sessions.set(key, session);

		ws.send(N8N_HEARTBEAT);
	}

	private async processWaitingExecution(
		execution: IExecutionResponse,
		session: Session,
		sessionKey: string,
	) {
		const message = getMessage(execution);

		if (message === undefined) return;

		session.connection.send(message);

		const lastNode = getLastNodeExecuted(execution);

		if (lastNode && shouldResumeImmediately(lastNode)) {
			session.connection.send(N8N_CONTINUE);
			const data: ChatMessage = {
				action: 'sendMessage',
				chatInput: '',
				sessionId: session.sessionId,
			};
			await this.resumeExecution(session.executionId, data, sessionKey);
			session.nodeWaitingForChatResponse = undefined;
		} else {
			session.nodeWaitingForChatResponse = lastNode?.name;
		}
	}

	private processSuccessExecution(session: Session) {
		closeConnection(session.connection);
		return;
	}

	private waitForChatResponseOrContinue(execution: IExecutionResponse, session: Session) {
		const lastNode = getLastNodeExecuted(execution);

		if (execution.status === 'waiting' && lastNode?.name !== session.nodeWaitingForChatResponse) {
			session.connection.send(N8N_CONTINUE);
			session.nodeWaitingForChatResponse = undefined;
		}
	}

	private pollAndProcessChatResponses(sessionKey: string) {
		return async () => {
			const session = this.sessions.get(sessionKey);

			if (!session) return;
			if (session.isProcessing) return;

			try {
				session.isProcessing = true;

				if (!session.executionId || !session.connection) return;

				const execution = await this.getExecutionOrCleanupSession(session.executionId, sessionKey);

				if (!execution) return;

				if (session.nodeWaitingForChatResponse) {
					this.waitForChatResponseOrContinue(execution, session);
					return;
				}

				if (execution.status === 'waiting') {
					await this.processWaitingExecution(execution, session, sessionKey);
					return;
				}

				if (execution.status === 'success') {
					this.processSuccessExecution(session);
					return;
				}
			} catch (e) {
				const error = ensureError(e);
				this.errorReporter.error(error);

				this.logger.error(
					`Error sending message to chat in session ${sessionKey}: ${error.message}`,
				);
			} finally {
				// get only active sessions, as it could have been deleted, and set isProcessing to false
				const activeSession = this.sessions.get(sessionKey);
				if (activeSession) {
					activeSession.isProcessing = false;
				}
			}
		};
	}

	private incomingMessageHandler(sessionKey: string) {
		return async (data: RawData) => {
			try {
				const session = this.sessions.get(sessionKey);

				if (!session) return;

				const message = this.stringifyRawData(data);

				if (message === N8N_HEARTBEAT_ACK) {
					session.lastHeartbeat = Date.now();
					return;
				}

				const executionId = session.executionId;

				await this.resumeExecution(executionId, this.parseChatMessage(message), sessionKey);
				session.nodeWaitingForChatResponse = undefined;
			} catch (e) {
				const error = ensureError(e);
				this.errorReporter.error(error);
				this.logger.error(
					`Error processing message from chat in session ${sessionKey}: ${error.message}`,
				);
			}
		};
	}

	private async resumeExecution(executionId: string, message: ChatMessage, sessionKey: string) {
		const execution = await this.getExecutionOrCleanupSession(executionId, sessionKey);
		if (!execution || execution.status !== 'waiting') return;
		await this.executionManager.runWorkflow(execution, message);
	}

	private async getExecutionOrCleanupSession(executionId: string, sessionKey: string) {
		const execution = await this.executionManager.findExecution(executionId);

		if (!execution || ['error', 'canceled', 'crashed'].includes(execution.status)) {
			const session = this.sessions.get(sessionKey);

			if (!session) return null;

			this.cleanupSession(session, sessionKey);
			return null;
		}

		if (execution.status === 'running') return null;

		return execution;
	}

	private stringifyRawData(data: RawData) {
		const buffer = Array.isArray(data)
			? Buffer.concat(data.map((chunk) => Buffer.from(chunk)))
			: data instanceof ArrayBuffer
				? Buffer.from(data)
				: data;
		return buffer.toString('utf8');
	}

	private cleanupSession(session: Session, sessionKey: string) {
		session.connection.terminate();
		clearInterval(session.intervalId);
		if (sessionKey) this.sessions.delete(sessionKey);
	}

	private parseChatMessage(message: string): ChatMessage {
		try {
			const parsedMessage = chatMessageSchema.parse(jsonParse(message));

			if (parsedMessage.files) {
				parsedMessage.files = parsedMessage.files.map((file) => ({
					...file,
					data: file.data.includes('base64,') ? file.data.split('base64,')[1] : file.data,
				}));
			}

			return parsedMessage;
		} catch (error) {
			if (error instanceof z.ZodError) {
				throw new UnexpectedError(
					`Chat message validation error: ${error.errors.map((error) => error.message).join(', ')}`,
				);
			}
			throw error;
		}
	}

	private async checkHeartbeats() {
		try {
			const now = Date.now();

			for (const [key, session] of this.sessions.entries()) {
				const timeSinceLastHeartbeat = now - (session.lastHeartbeat ?? 0);

				if (timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT) {
					await this.executionManager.cancelExecution(session.executionId);
					this.cleanupSession(session, key);
				} else {
					try {
						session.connection.send(N8N_HEARTBEAT);
					} catch (e) {
						this.cleanupSession(session, key);
						const error = ensureError(e);
						this.errorReporter.error(error);
						this.logger.error(`Error sending heartbeat to session ${key}: ${error.message}`);
					}
				}
			}
		} catch (e) {
			const error = ensureError(e);
			this.errorReporter.error(error);
			this.logger.error(`Error checking heartbeats: ${error.message}`);
		}
	}

	@OnShutdown()
	shutdown() {
		for (const [key, session] of this.sessions.entries()) {
			this.cleanupSession(session, key);
		}

		this.sessions.clear();
		clearInterval(this.heartbeatIntervalId);
	}
}

'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.ChatService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const ws_1 = require('ws');
const zod_1 = require('zod');
const chat_execution_manager_1 = require('./chat-execution-manager');
const chat_service_types_1 = require('./chat-service.types');
const utils_1 = require('./utils');
const CHECK_FOR_RESPONSE_INTERVAL = 3000;
const DRAIN_TIMEOUT = 50;
const HEARTBEAT_INTERVAL = 30 * 1000;
const HEARTBEAT_TIMEOUT = 60 * 1000;
const N8N_CONTINUE = 'n8n|continue';
const N8N_HEARTBEAT = 'n8n|heartbeat';
const N8N_HEARTBEAT_ACK = 'n8n|heartbeat-ack';
function closeConnection(ws) {
	if (ws.readyState !== ws_1.WebSocket.OPEN) return;
	ws.once('drain', () => {
		ws.close();
	});
	setTimeout(() => {
		if (ws.readyState === ws_1.WebSocket.OPEN) {
			ws.close();
		}
	}, DRAIN_TIMEOUT);
}
let ChatService = class ChatService {
	constructor(executionManager, logger, errorReporter) {
		this.executionManager = executionManager;
		this.logger = logger;
		this.errorReporter = errorReporter;
		this.sessions = new Map();
		this.heartbeatIntervalId = setInterval(
			async () => await this.checkHeartbeats(),
			HEARTBEAT_INTERVAL,
		);
	}
	async startSession(req) {
		const {
			ws,
			query: { sessionId, executionId, isPublic },
		} = req;
		if (!ws) {
			throw new n8n_workflow_1.UnexpectedError('WebSocket connection is missing');
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
		const session = {
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
	async processWaitingExecution(execution, session, sessionKey) {
		const message = (0, utils_1.getMessage)(execution);
		if (message === undefined) return;
		session.connection.send(message);
		const lastNode = (0, utils_1.getLastNodeExecuted)(execution);
		if (lastNode && (0, utils_1.shouldResumeImmediately)(lastNode)) {
			session.connection.send(N8N_CONTINUE);
			const data = {
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
	processSuccessExecution(session) {
		closeConnection(session.connection);
		return;
	}
	waitForChatResponseOrContinue(execution, session) {
		const lastNode = (0, utils_1.getLastNodeExecuted)(execution);
		if (execution.status === 'waiting' && lastNode?.name !== session.nodeWaitingForChatResponse) {
			session.connection.send(N8N_CONTINUE);
			session.nodeWaitingForChatResponse = undefined;
		}
	}
	pollAndProcessChatResponses(sessionKey) {
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
				const error = (0, n8n_workflow_1.ensureError)(e);
				this.errorReporter.error(error);
				this.logger.error(
					`Error sending message to chat in session ${sessionKey}: ${error.message}`,
				);
			} finally {
				const activeSession = this.sessions.get(sessionKey);
				if (activeSession) {
					activeSession.isProcessing = false;
				}
			}
		};
	}
	incomingMessageHandler(sessionKey) {
		return async (data) => {
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
				const error = (0, n8n_workflow_1.ensureError)(e);
				this.errorReporter.error(error);
				this.logger.error(
					`Error processing message from chat in session ${sessionKey}: ${error.message}`,
				);
			}
		};
	}
	async resumeExecution(executionId, message, sessionKey) {
		const execution = await this.getExecutionOrCleanupSession(executionId, sessionKey);
		if (!execution || execution.status !== 'waiting') return;
		await this.executionManager.runWorkflow(execution, message);
	}
	async getExecutionOrCleanupSession(executionId, sessionKey) {
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
	stringifyRawData(data) {
		const buffer = Array.isArray(data)
			? Buffer.concat(data.map((chunk) => Buffer.from(chunk)))
			: Buffer.from(data);
		return buffer.toString('utf8');
	}
	cleanupSession(session, sessionKey) {
		session.connection.terminate();
		clearInterval(session.intervalId);
		if (sessionKey) this.sessions.delete(sessionKey);
	}
	parseChatMessage(message) {
		try {
			const parsedMessage = chat_service_types_1.chatMessageSchema.parse(
				(0, n8n_workflow_1.jsonParse)(message),
			);
			if (parsedMessage.files) {
				parsedMessage.files = parsedMessage.files.map((file) => ({
					...file,
					data: file.data.includes('base64,') ? file.data.split('base64,')[1] : file.data,
				}));
			}
			return parsedMessage;
		} catch (error) {
			if (error instanceof zod_1.z.ZodError) {
				throw new n8n_workflow_1.UnexpectedError(
					`Chat message validation error: ${error.errors.map((error) => error.message).join(', ')}`,
				);
			}
			throw error;
		}
	}
	async checkHeartbeats() {
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
						const error = (0, n8n_workflow_1.ensureError)(e);
						this.errorReporter.error(error);
						this.logger.error(`Error sending heartbeat to session ${key}: ${error.message}`);
					}
				}
			}
		} catch (e) {
			const error = (0, n8n_workflow_1.ensureError)(e);
			this.errorReporter.error(error);
			this.logger.error(`Error checking heartbeats: ${error.message}`);
		}
	}
	shutdown() {
		for (const [key, session] of this.sessions.entries()) {
			this.cleanupSession(session, key);
		}
		this.sessions.clear();
		clearInterval(this.heartbeatIntervalId);
	}
};
exports.ChatService = ChatService;
__decorate(
	[
		(0, decorators_1.OnShutdown)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', void 0),
	],
	ChatService.prototype,
	'shutdown',
	null,
);
exports.ChatService = ChatService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			chat_execution_manager_1.ChatExecutionManager,
			backend_common_1.Logger,
			n8n_core_1.ErrorReporter,
		]),
	],
	ChatService,
);
//# sourceMappingURL=chat-service.js.map

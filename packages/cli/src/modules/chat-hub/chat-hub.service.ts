import {
	PROVIDER_CREDENTIAL_TYPE_MAP,
	type ChatHubProvider,
	type ChatHubConversationsResponse,
	type ChatHubConversationResponse,
	ChatHubMessageDto,
	type ChatMessageId,
	type ChatSessionId,
	ChatHubConversationModel,
	type ChatHubUpdateConversationRequest,
	type ChatHubSessionDto,
	type ChatHubAgentKnowledgeItem,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { ExecutionRepository, User } from '@n8n/db';
import type { EntityManager } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import {
	CHAT_TRIGGER_NODE_TYPE,
	OperationalError,
	type INode,
	type INodeCredentials,
	type IBinaryData,
	UnexpectedError,
} from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { ChatHubAgentService } from './chat-hub-agent.service';
import { ChatHubExecutionService } from './chat-hub-execution.service';
import { ChatHubAuthenticationMetadata } from './chat-hub-extractor';
import type { ChatHubMessage } from './chat-hub-message.entity';
import type { ChatHubSession, IChatHubSession } from './chat-hub-session.entity';
import { ChatHubTitleService } from './chat-hub-title.service';
import { ChatHubToolService } from './chat-hub-tool.service';
import { ChatHubWorkflowService } from './chat-hub-workflow.service';
import { ChatHubAttachmentService } from './chat-hub.attachment.service';
import { ChatHubModelsService } from './chat-hub.models.service';
import {
	HumanMessagePayload,
	RegenerateMessagePayload,
	EditMessagePayload,
	PreparedChatWorkflow,
	type ChatInput,
	type MessageRecord,
	type ContentBlock,
} from './chat-hub.types';
import { ChatHubMessageRepository } from './chat-message.repository';
import { ChatHubSessionRepository } from './chat-session.repository';
import { ChatStreamService } from './chat-stream.service';
import { inE2ETests } from '@/constants';
import { DateTime } from 'luxon';
import { collectChatArtifacts, parseMessage } from '@n8n/chat-hub';

@Service()
export class ChatHubService {
	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly sessionRepository: ChatHubSessionRepository,
		private readonly messageRepository: ChatHubMessageRepository,
		private readonly chatHubAgentService: ChatHubAgentService,
		private readonly chatHubModelsService: ChatHubModelsService,
		private readonly chatHubAttachmentService: ChatHubAttachmentService,
		private readonly chatStreamService: ChatStreamService,
		private readonly chatHubExecutionService: ChatHubExecutionService,
		private readonly chatHubTitleService: ChatHubTitleService,
		private readonly chatHubToolService: ChatHubToolService,
		private readonly chatHubWorkflowService: ChatHubWorkflowService,
		private readonly globalConfig: GlobalConfig,
	) {
		this.logger = this.logger.scoped('chat-hub');
	}

	private pickCredentialId(
		provider: ChatHubProvider,
		credentials: INodeCredentials,
	): string | null {
		if (provider === 'n8n' || provider === 'custom-agent') {
			return null;
		}

		return credentials[PROVIDER_CREDENTIAL_TYPE_MAP[provider]]?.id ?? null;
	}

	private async ensurePreviousMessage(
		previousMessageId: ChatMessageId | null,
		sessionId: string,
		trx?: EntityManager,
	) {
		if (!previousMessageId) {
			return;
		}

		const previousMessage = await this.messageRepository.getOneById(
			previousMessageId,
			sessionId,
			[],
			trx,
		);
		if (!previousMessage) {
			throw new BadRequestError('The previous message does not exist in the session');
		}

		return previousMessage;
	}

	async stopGeneration(user: User, sessionId: ChatSessionId, messageId: ChatMessageId) {
		await this.ensureConversation(user.id, sessionId);

		const message = await this.getChatMessage(sessionId, messageId, [
			'execution',
			'execution.workflow',
		]);

		if (message.type !== 'ai') {
			throw new BadRequestError('Can only stop AI messages');
		}

		if (!message.executionId || !message.execution) {
			throw new BadRequestError('Message is not associated with a workflow execution');
		}

		if (message.status !== 'running') {
			throw new BadRequestError('Can only stop messages that are currently running');
		}

		await this.chatHubExecutionService.stop(message.execution.id, message.execution.workflowId);
		await this.messageRepository.updateChatMessage(messageId, { status: 'cancelled' });
	}

	private getModelCredential(model: ChatHubConversationModel, credentials: INodeCredentials) {
		const credentialId =
			model.provider !== 'n8n' ? this.pickCredentialId(model.provider, credentials) : null;

		return credentialId;
	}

	private async getChatSession(user: User, sessionId: ChatSessionId, trx?: EntityManager) {
		return await this.sessionRepository.getOneById(sessionId, user.id, trx);
	}

	private async createChatSession(
		user: User,
		sessionId: ChatSessionId,
		model: ChatHubConversationModel,
		credentialId: string | null,
		agentName?: string,
		trx?: EntityManager,
	) {
		await this.ensureValidModel(user, model, trx);

		const session = await this.sessionRepository.createChatSession(
			{
				id: sessionId,
				ownerId: user.id,
				title: 'New Chat',
				lastMessageAt: new Date(),
				agentName,
				credentialId,
				...model,
			},
			trx,
		);

		// Populate session tools from enabled configured tools
		const enabledTools = await this.chatHubToolService.getEnabledTools(user.id, trx);
		const toolIds = enabledTools.map((t) => t.id);
		if (toolIds.length > 0) {
			await this.chatHubToolService.setSessionTools(sessionId, toolIds, trx);
		}

		return session;
	}

	private async getChatMessage(
		sessionId: ChatSessionId,
		messageId: ChatMessageId,
		relations: string[] = [],
		trx?: EntityManager,
	) {
		const message = await this.messageRepository.getOneById(messageId, sessionId, relations, trx);
		if (!message) {
			throw new NotFoundError('Chat message not found');
		}
		return message;
	}

	/**
	 * Get all conversations for a user
	 */
	async getConversations(
		userId: string,
		limit: number,
		cursor?: string,
	): Promise<ChatHubConversationsResponse> {
		const sessions = await this.sessionRepository.getManyByUserId(userId, limit + 1, cursor);

		const hasMore = sessions.length > limit;
		const data = hasMore ? sessions.slice(0, limit) : sessions;
		const nextCursor = hasMore ? data[data.length - 1].id : null;

		return {
			data: data.map((session) => this.convertSessionEntityToDto(session)),
			nextCursor,
			hasMore,
		};
	}

	/**
	 * Ensures conversation exists and belongs to the user, throws otherwise
	 * */
	async ensureConversation(userId: string, sessionId: string, trx?: EntityManager): Promise<void> {
		const sessionExists = await this.sessionRepository.existsById(sessionId, userId, trx);
		if (!sessionExists) {
			throw new NotFoundError('Chat session not found');
		}
	}

	/**
	 * Get a single conversation with messages and ready to render timeline of latest messages
	 * */
	async getConversation(userId: string, sessionId: string): Promise<ChatHubConversationResponse> {
		const session = await this.sessionRepository.getOneById(sessionId, userId);
		if (!session) {
			throw new NotFoundError('Chat session not found');
		}

		const messages = session.messages ?? [];
		const toolIds = await this.chatHubToolService.getToolIdsForSession(sessionId);

		return {
			session: this.convertSessionEntityToDto(session, toolIds),
			conversation: {
				messages: Object.fromEntries(messages.map((m) => [m.id, this.convertMessageToDto(m)])),
			},
		};
	}

	/**
	 * Build the message history chain ending to the message with ID `lastMessageId`
	 */
	private buildMessageHistory(
		messages: Record<ChatMessageId, ChatHubMessage>,
		lastMessageId: ChatMessageId | null,
	) {
		if (!lastMessageId) return [];

		const visited = new Set<string>();
		const historyIds = [];

		let current: ChatMessageId | null = lastMessageId;

		while (current && !visited.has(current)) {
			historyIds.unshift(current);
			visited.add(current);
			current = messages[current]?.previousMessageId ?? null;
		}

		const history = historyIds.flatMap((id) => messages[id] ?? []);
		return history;
	}

	async deleteAllSessions() {
		await this.chatHubAttachmentService.deleteAllMessageAttachments();
		const result = await this.sessionRepository.deleteAll();
		return result;
	}

	/**
	 * Updates a session with the provided fields
	 */
	async updateSession(
		user: User,
		sessionId: ChatSessionId,
		updates: ChatHubUpdateConversationRequest,
	) {
		await this.ensureConversation(user.id, sessionId);

		// Prepare the actual updates to be sent to the repository
		const sessionUpdates: Partial<IChatHubSession> = {};

		if (updates.agent) {
			const model = updates.agent.model;

			await this.ensureValidModel(user, model);

			sessionUpdates.agentName = updates.agent.name;
			sessionUpdates.provider = model.provider;
			sessionUpdates.model = null;
			sessionUpdates.credentialId = null;
			sessionUpdates.agentId = null;
			sessionUpdates.workflowId = null;

			if (updates.agent.model.provider === 'n8n') {
				sessionUpdates.workflowId = updates.agent.model.workflowId;
			} else if (updates.agent.model.provider === 'custom-agent') {
				sessionUpdates.agentId = updates.agent.model.agentId;
			} else {
				sessionUpdates.model = updates.agent.model.model;
			}
		}

		if (updates.title !== undefined) sessionUpdates.title = updates.title;
		if (updates.credentialId !== undefined) sessionUpdates.credentialId = updates.credentialId;

		await this.sessionRepository.updateChatSession(sessionId, sessionUpdates);

		if (updates.toolIds !== undefined) {
			await this.chatHubToolService.setSessionTools(sessionId, updates.toolIds);
		}
	}

	/**
	 * Deletes a session
	 */
	async deleteSession(userId: string, sessionId: ChatSessionId) {
		await this.messageRepository.manager.transaction(async (trx) => {
			await this.ensureConversation(userId, sessionId, trx);
			await this.chatHubAttachmentService.deleteAllMessageAttachmentsBySessionId(sessionId, trx);
			await this.sessionRepository.deleteChatHubSession(sessionId, trx);
		});
	}

	private async ensureValidModel(user: User, model: ChatHubConversationModel, trx?: EntityManager) {
		if (model.provider === 'custom-agent') {
			// Find the agent to get its name
			const agent = await this.chatHubAgentService.getAgentById(model.agentId, user.id, trx);
			if (!agent) {
				throw new BadRequestError('Agent not found for chat session initialization');
			}
		}

		if (model.provider === 'n8n') {
			// Find the workflow to get its name
			const workflowEntity = await this.workflowFinderService.findWorkflowForUser(
				model.workflowId,
				user,
				['workflow:execute-chat'],
				{ includeTags: false, includeParentFolder: false, includeActiveVersion: true, em: trx },
			);

			if (!workflowEntity?.activeVersion) {
				throw new BadRequestError('Workflow not found for chat session initialization');
			}

			const chatTrigger = workflowEntity.activeVersion.nodes?.find(
				(node) => node.type === CHAT_TRIGGER_NODE_TYPE,
			);

			if (!chatTrigger) {
				throw new BadRequestError(
					'Chat trigger not found in workflow for chat session initialization',
				);
			}
		}
	}

	/**
	 * Send a human message and stream the AI response via Push events.
	 * Returns immediately, streaming happens in background after.
	 */
	async sendHumanMessage(
		user: User,
		payload: HumanMessagePayload,
		executionMetadata: ChatHubAuthenticationMetadata,
	): Promise<void> {
		const {
			sessionId,
			messageId,
			message,
			model,
			credentials,
			previousMessageId,
			attachments,
			timeZone,
		} = payload;
		const tz = timeZone ?? this.globalConfig.generic.timezone;

		const credentialId = this.getModelCredential(model, credentials);

		let processedAttachments: IBinaryData[] = [];
		let workflow: PreparedChatWorkflow;
		let previousMessage: ChatHubMessage | undefined;

		try {
			const vectorStoreCredential =
				model.provider === 'custom-agent'
					? await this.chatHubAgentService.ensureVectorStoreCredential(user)
					: undefined;
			const result = await this.messageRepository.manager.transaction(async (trx) => {
				let session = await this.getChatSession(user, sessionId, trx);
				const isNewSession = !session;
				session ??= await this.createChatSession(
					user,
					sessionId,
					model,
					credentialId,
					payload.agentName,
					trx,
				);

				const previousMessage = await this.ensurePreviousMessage(previousMessageId, sessionId, trx);
				const messages = Object.fromEntries((session.messages ?? []).map((m) => [m.id, m]));
				const history = this.buildMessageHistory(messages, previousMessageId);

				// Store attachments to populate 'id' field via BinaryDataService
				processedAttachments = await this.chatHubAttachmentService.storeMessageAttachments(
					sessionId,
					messageId,
					attachments,
				);

				await this.messageRepository.createHumanMessage(
					payload,
					processedAttachments,
					user,
					previousMessageId,
					model,
					undefined,
					trx,
				);

				// Resolve tool definitions from the session's join table
				const tools = isNewSession
					? (await this.chatHubToolService.getEnabledTools(user.id, trx)).map((t) => t.definition)
					: await this.chatHubToolService.getToolDefinitionsForSession(sessionId, trx);

				const replyWorkflow = await this.prepareReplyWorkflow(
					user,
					sessionId,
					credentials,
					model,
					history,
					{ message, attachments: processedAttachments },
					tools,
					tz,
					trx,
					executionMetadata,
					vectorStoreCredential?.id,
				);

				return { workflow: replyWorkflow, previousMessage };
			});
			workflow = result.workflow;
			previousMessage = result.previousMessage;
		} catch (error) {
			if (processedAttachments.length > 0) {
				try {
					await this.chatHubAttachmentService.deleteAttachments(processedAttachments);
				} catch {
					this.errorReporter.warn(`Could not clean up ${processedAttachments.length} files`);
				}
			}

			throw error;
		}

		if (!workflow) {
			throw new UnexpectedError('Failed to prepare chat workflow.');
		}

		// Broadcast human message to all user connections for cross-client sync
		await this.chatStreamService.sendHumanMessage({
			userId: user.id,
			sessionId,
			messageId,
			previousMessageId,
			content: message,
			attachments: processedAttachments.map((a) => ({
				id: a.id!,
				fileName: a.fileName ?? 'file',
				mimeType: a.mimeType,
			})),
		});

		// Check if we should resume a waiting execution instead of starting a new one
		// This happens when the previous message is in 'waiting' state (Chat node waiting for user input)
		if (
			model.provider === 'n8n' &&
			workflow.responseMode === 'responseNodes' &&
			previousMessage?.status === 'waiting' &&
			previousMessage?.executionId
		) {
			const execution = await this.executionRepository.findSingleExecution(
				previousMessage.executionId.toString(),
				{
					includeData: true,
					unflattenData: true,
				},
			);
			if (!execution) {
				throw new OperationalError('Chat session has expired.');
			}
			this.logger.debug(
				`Resuming execution ${execution.id} from waiting state for session ${sessionId}`,
			);

			// Mark the waiting AI message as successful before resuming
			await this.messageRepository.updateChatMessage(previousMessage.id, {
				status: 'success',
			});

			void this.chatHubExecutionService.resumeChatExecution(
				execution,
				message,
				sessionId,
				user,
				messageId,
				model,
				workflow.responseMode,
			);
			return;
		}

		// Start the workflow execution with streaming
		void this.executeChatWorkflowWithCleanup(
			user,
			model,
			workflow,
			sessionId,
			messageId,
			null,
			previousMessageId,
			credentials,
			message,
			processedAttachments,
		);
	}

	/**
	 * Edit a message and stream the AI response via Push events.
	 * Returns immediately, streaming happens in background after.
	 */
	async editMessage(
		user: User,
		payload: EditMessagePayload,
		executionMetadata: ChatHubAuthenticationMetadata,
	): Promise<void> {
		const { sessionId, editId, messageId, message, model, credentials, timeZone } = payload;
		const tz = timeZone ?? this.globalConfig.generic.timezone;

		let result: {
			workflow: PreparedChatWorkflow | null;
			combinedAttachments: IBinaryData[];
		} | null = null;
		let newStoredAttachments: IBinaryData[] = [];

		try {
			const vectorStoreCredential =
				model.provider === 'custom-agent'
					? await this.chatHubAgentService.ensureVectorStoreCredential(user)
					: undefined;

			result = await this.messageRepository.manager.transaction(async (trx) => {
				const session = await this.getChatSession(user, sessionId, trx);
				if (!session) {
					throw new NotFoundError('Chat session not found');
				}

				const messageToEdit = await this.getChatMessage(session.id, editId, [], trx);

				if (messageToEdit.type === 'ai') {
					throw new BadRequestError('Editing AI messages is not supported');
				}

				if (messageToEdit.type === 'human') {
					const messages = Object.fromEntries((session.messages ?? []).map((m) => [m.id, m]));
					const history = this.buildMessageHistory(messages, messageToEdit.previousMessageId);

					const revisionOfMessageId = messageToEdit.revisionOfMessageId ?? messageToEdit.id;
					const originalAttachments = messageToEdit.attachments ?? [];

					const keptAttachments = payload.keepAttachmentIndices.flatMap((index) => {
						const attachment = originalAttachments[index];
						return attachment ? [attachment] : [];
					});

					newStoredAttachments =
						payload.newAttachments.length > 0
							? await this.chatHubAttachmentService.storeMessageAttachments(
									sessionId,
									messageId,
									payload.newAttachments,
								)
							: [];

					const attachments = [...keptAttachments, ...newStoredAttachments];

					await this.messageRepository.createHumanMessage(
						payload,
						attachments,
						user,
						messageToEdit.previousMessageId,
						model,
						revisionOfMessageId,
						trx,
					);

					const tools = await this.chatHubToolService.getToolDefinitionsForSession(sessionId, trx);

					const workflow = await this.prepareReplyWorkflow(
						user,
						sessionId,
						credentials,
						model,
						history,
						{ message, attachments },
						tools,
						tz,
						trx,
						executionMetadata,
						vectorStoreCredential?.id,
					);

					return { workflow, combinedAttachments: attachments };
				}

				throw new BadRequestError('Only human and AI messages can be edited');
			});
		} catch (error) {
			if (newStoredAttachments.length > 0) {
				try {
					await this.chatHubAttachmentService.deleteAttachments(newStoredAttachments);
				} catch {
					this.errorReporter.warn(`Could not clean up ${newStoredAttachments.length} files`);
				}
			}

			throw error;
		}

		if (!result?.workflow) {
			// AI message edit - no streaming needed
			return;
		}

		const { workflow } = result;

		// Broadcast message edit to all user connections for cross-client sync
		await this.chatStreamService.sendMessageEdit({
			userId: user.id,
			sessionId,
			revisionOfMessageId: editId,
			messageId,
			content: message,
			attachments: result.combinedAttachments.map((a) => ({
				id: a.id!,
				fileName: a.fileName ?? 'file',
				mimeType: a.mimeType,
			})),
		});

		// Start the workflow execution with streaming
		void this.executeChatWorkflowWithCleanup(
			user,
			model,
			workflow,
			sessionId,
			messageId,
			null,
			null,
			{},
			'',
			[],
		);
	}

	/**
	 * Regenerate an AI message and stream via Push events.
	 * Returns immediately; streaming happens in background.
	 */
	async regenerateAIMessage(
		user: User,
		payload: RegenerateMessagePayload,
		executionMetadata: ChatHubAuthenticationMetadata,
	): Promise<void> {
		const { sessionId, retryId, model, credentials, timeZone } = payload;
		const tz = timeZone ?? this.globalConfig.generic.timezone;

		const vectorStoreCredential =
			model.provider === 'custom-agent'
				? await this.chatHubAgentService.ensureVectorStoreCredential(user)
				: undefined;

		const { retryOfMessageId, previousMessageId, workflow } =
			await this.messageRepository.manager.transaction(async (trx) => {
				const session = await this.getChatSession(user, sessionId, trx);
				if (!session) {
					throw new NotFoundError('Chat session not found');
				}

				const messageToRetry = await this.getChatMessage(session.id, retryId, [], trx);

				if (messageToRetry.type !== 'ai') {
					throw new BadRequestError('Can only retry AI messages');
				}

				const messages = Object.fromEntries((session.messages ?? []).map((m) => [m.id, m]));
				const history = this.buildMessageHistory(messages, messageToRetry.previousMessageId);

				const lastHumanMessage = history.filter((m) => m.type === 'human').pop();
				if (!lastHumanMessage) {
					throw new BadRequestError('No human message found to base the retry on');
				}

				const lastHumanMessageIndex = history.indexOf(lastHumanMessage);
				if (lastHumanMessageIndex !== -1) {
					history.splice(lastHumanMessageIndex + 1);
				}

				const retryOfMessageId = messageToRetry.retryOfMessageId ?? messageToRetry.id;
				const message = lastHumanMessage ? lastHumanMessage.content : '';
				const attachments = lastHumanMessage.attachments ?? [];

				const tools = await this.chatHubToolService.getToolDefinitionsForSession(sessionId, trx);

				const workflow = await this.prepareReplyWorkflow(
					user,
					sessionId,
					credentials,
					model,
					history,
					{ message, attachments },
					tools,
					tz,
					trx,
					executionMetadata,
					vectorStoreCredential?.id,
				);

				return {
					previousMessageId: lastHumanMessage.id,
					retryOfMessageId,
					workflow,
				};
			});

		// Start the workflow execution with streaming (fire and forget)
		void this.executeChatWorkflowWithCleanup(
			user,
			model,
			workflow,
			sessionId,
			previousMessageId,
			retryOfMessageId,
			null,
			{},
			'',
			[],
		);
	}

	private async prepareReplyWorkflow(
		user: User,
		sessionId: ChatSessionId,
		credentials: INodeCredentials,
		model: ChatHubConversationModel,
		history: ChatHubMessage[],
		input: ChatInput,
		tools: INode[],
		timeZone: string,
		trx: EntityManager,
		executionMetadata: ChatHubAuthenticationMetadata,
		vectorStoreCredentialId?: string,
	) {
		if (model.provider === 'n8n') {
			return await this.chatHubWorkflowService.prepareWorkflowAgentWorkflow(
				user,
				sessionId,
				model.workflowId,
				input,
				trx,
				executionMetadata,
			);
		}

		if (model.provider === 'custom-agent') {
			const agent =
				model.provider === 'custom-agent'
					? await this.chatHubAgentService.getAgentById(model.agentId, user.id)
					: null;

			if (!agent) {
				throw new BadRequestError('Agent not found');
			}

			const knowledgeItems = agent.files.filter((f) => f.type === 'embedding');
			const embeddingModel =
				knowledgeItems.length > 0
					? await this.chatHubAgentService.determineEmbeddingProvider(user)
					: null;

			for (const item of knowledgeItems) {
				if (item.provider !== embeddingModel?.provider) {
					throw new BadRequestError(
						`Credential for processing agent's file knowledge is missing. Configure credential for ${item.provider} or remove '${item.fileName}' from agent.`,
					);
				}
			}

			return await this.chatHubWorkflowService.prepareChatAgentWorkflow(
				agent,
				user,
				sessionId,
				await this.buildConversationHistory(history, agent.files),
				input,
				trx,
				agent.systemPrompt + '\n\n' + this.getSystemMessage(timeZone, history),
				executionMetadata,
				embeddingModel && vectorStoreCredentialId
					? { agentId: agent.id, embeddingModel, credentialId: vectorStoreCredentialId }
					: null,
			);
		}

		return await this.chatHubWorkflowService.prepareBaseChatWorkflow(
			user,
			sessionId,
			credentials,
			model,
			await this.buildConversationHistory(history, []),
			input,
			'You are a helpful assistant.\n\n' + this.getSystemMessage(timeZone, history),
			tools,
			null,
			trx,
			executionMetadata,
		);
	}

	/**
	 * Reconnect to an active chat stream
	 * Returns pending chunks that the client may have missed
	 */
	async reconnectToStream(
		sessionId: ChatSessionId,
		lastReceivedSequence: number,
	): Promise<{
		hasActiveStream: boolean;
		currentMessageId: ChatMessageId | null;
		pendingChunks: Array<{ sequenceNumber: number; content: string }>;
		lastSequenceNumber: number;
	}> {
		const hasActiveStream = await this.chatStreamService.hasActiveStream(sessionId);
		const currentMessageId = await this.chatStreamService.getCurrentMessageId(sessionId);
		const pendingChunks = await this.chatStreamService.getPendingChunks(
			sessionId,
			lastReceivedSequence,
		);

		return {
			hasActiveStream,
			currentMessageId,
			pendingChunks,
			lastSequenceNumber:
				pendingChunks.length > 0
					? pendingChunks[pendingChunks.length - 1].sequenceNumber
					: lastReceivedSequence,
		};
	}

	private async executeChatWorkflowWithCleanup(
		user: User,
		model: ChatHubConversationModel,
		workflow: PreparedChatWorkflow,
		sessionId: ChatSessionId,
		previousMessageId: ChatMessageId,
		retryOfMessageId: ChatMessageId | null,
		originalPreviousMessageId: ChatMessageId | null,
		credentials: INodeCredentials,
		humanMessage: string,
		processedAttachments: IBinaryData[],
	) {
		await this.chatHubExecutionService.executeChatWorkflowWithCleanup(
			user,
			model,
			workflow.workflowData,
			workflow.executionData,
			sessionId,
			previousMessageId,
			retryOfMessageId,
			workflow.responseMode,
		);

		// Generate title for the session on receiving the first human message
		if (originalPreviousMessageId === null && humanMessage) {
			try {
				await this.chatHubTitleService.generateSessionTitle(
					user,
					sessionId,
					humanMessage,
					processedAttachments,
					credentials,
					model,
				);
			} catch (error) {
				this.logger.warn(`Title generation failed: ${error}`);
			}
		}
	}

	private convertMessageToDto(message: ChatHubMessage): ChatHubMessageDto {
		return {
			id: message.id,
			sessionId: message.sessionId,
			type: message.type,
			name: message.name,
			content: parseMessage(message),
			provider: message.provider,
			model: message.model,
			workflowId: message.workflowId,
			agentId: message.agentId,
			executionId: message.executionId,
			status: message.status,
			createdAt: message.createdAt.toISOString(),
			updatedAt: message.updatedAt.toISOString(),

			previousMessageId: message.previousMessageId,
			retryOfMessageId: message.retryOfMessageId,
			revisionOfMessageId: message.revisionOfMessageId,

			attachments: (message.attachments ?? []).map(({ fileName, mimeType }) => ({
				fileName,
				mimeType,
			})),
		};
	}

	private convertSessionEntityToDto(
		session: ChatHubSession,
		toolIds: string[] = [],
	): ChatHubSessionDto {
		const agent = session.workflow
			? this.chatHubModelsService.extractModelFromWorkflow(session.workflow, [])
			: session.agent
				? this.chatHubAgentService.convertAgentEntityToModel(session.agent)
				: undefined;

		return {
			id: session.id,
			title: session.title,
			ownerId: session.ownerId,
			lastMessageAt: session.lastMessageAt?.toISOString() ?? null,
			credentialId: session.credentialId,
			provider: session.provider,
			model: session.model,
			workflowId: session.workflowId,
			agentId: session.agentId,
			agentName: agent?.name ?? session.agentName ?? session.model ?? '',
			agentIcon: agent?.icon ?? null,
			createdAt: session.createdAt.toISOString(),
			updatedAt: session.updatedAt.toISOString(),
			toolIds,
		};
	}

	async buildConversationHistory(
		history: ChatHubMessage[],
		contextFiles: ChatHubAgentKnowledgeItem[],
	): Promise<MessageRecord[]> {
		// Gemini has 20MB limit, the value should also be what n8n instance can safely handle
		const maxTotalPayloadSize = 20 * 1024 * 1024 * 0.9;

		const typeMap: Record<string, MessageRecord['type']> = {
			human: 'user',
			ai: 'ai',
			system: 'system',
		};

		const messageValues: MessageRecord[] = [];

		let currentTotalSize = 0;

		const messages = history.slice().reverse(); // Traversing messages from last to prioritize newer attachments

		for (const message of messages) {
			// Empty messages can't be restored by the memory manager
			if (message.content.length === 0) {
				continue;
			}

			const attachments = message.attachments ?? [];
			const type = typeMap[message.type] || 'system';

			// TODO: Tool messages etc?

			const textSize = message.content.length;
			currentTotalSize += textSize;

			if (attachments.length === 0) {
				messageValues.push({
					type,
					message: message.content,
					hideFromUI: false,
				});
				continue;
			}

			const blocks: ContentBlock[] = [{ type: 'text', text: message.content }];

			// Add attachments if within size limit
			for (const attachment of attachments) {
				const attachmentBlocks = await this.buildContentBlockForAttachment(
					{ type: 'file', binaryData: attachment },
					currentTotalSize,
					maxTotalPayloadSize,
					'File',
				);

				for (const block of attachmentBlocks) {
					blocks.push(block);
					currentTotalSize += block.type === 'text' ? block.text.length : block.image_url.length;
				}
			}

			messageValues.push({
				type,
				message: blocks,
				hideFromUI: false,
			});
		}

		const contextFileBlocks: ContentBlock[] = [];

		for (let i = 0; i < contextFiles.length; i++) {
			const file = contextFiles[i];
			const blocks = await this.buildContentBlockForAttachment(
				file,
				currentTotalSize,
				maxTotalPayloadSize,
				`Context file (${i + 1} of ${contextFiles.length})`,
			);

			for (const block of blocks) {
				contextFileBlocks.push(block);
				currentTotalSize += block.type === 'text' ? block.text.length : block.image_url.length;
			}
		}

		if (contextFileBlocks.length > 0) {
			messageValues.push({
				type: 'user',
				message: contextFileBlocks,
				hideFromUI: true,
			});
		}

		// Reverse to restore original order
		messageValues.reverse();

		return messageValues;
	}

	private async buildContentBlockForAttachment(
		file: ChatHubAgentKnowledgeItem,
		currentTotalSize: number,
		maxTotalPayloadSize: number,
		prefix: string,
	): Promise<ContentBlock[]> {
		class TotalFileSizeExceededError extends Error {}
		class UnsupportedMimeTypeError extends Error {}

		try {
			if (currentTotalSize >= maxTotalPayloadSize) {
				throw new TotalFileSizeExceededError();
			}

			if (file.type === 'embedding') {
				return [
					{
						type: 'text',
						text: `${prefix}: ${file.fileName ?? 'attachment'}\nContent: \n(Use vector store question tool to query this document)`,
					},
				];
			}

			const attachment = file.binaryData;

			if (this.isTextFile(attachment.mimeType)) {
				const buffer = await this.chatHubAttachmentService.getAsBuffer(attachment);
				const content = buffer.toString('utf-8');

				if (currentTotalSize + content.length > maxTotalPayloadSize) {
					throw new TotalFileSizeExceededError();
				}

				return [
					{
						type: 'text',
						text: `${prefix}: ${attachment.fileName ?? 'attachment'}\nContent: \n${content}`,
					},
				];
			}

			const url = await this.chatHubAttachmentService.getDataUrl(attachment);

			if (currentTotalSize + url.length > maxTotalPayloadSize) {
				throw new TotalFileSizeExceededError();
			}

			return [
				{ type: 'text', text: `${prefix}: ${attachment.fileName ?? 'attachment'}` },
				{ type: 'image_url', image_url: url },
			];
		} catch (e) {
			const fileName =
				file.type === 'embedding' ? file.fileName : (file.binaryData.fileName ?? 'attachment');

			if (e instanceof TotalFileSizeExceededError) {
				return [
					{
						type: 'text',
						text: `${prefix}: ${fileName}\n(Content omitted due to size limit)`,
					},
				];
			}

			if (e instanceof UnsupportedMimeTypeError) {
				return [
					{
						type: 'text',
						text: `${prefix}: ${fileName}\n(Unsupported file type)`,
					},
				];
			}

			throw e;
		}
	}

	private isTextFile(mimeType: string): boolean {
		return (
			mimeType.startsWith('text/') ||
			mimeType === 'application/json' ||
			mimeType === 'application/xml' ||
			mimeType === 'application/csv' ||
			mimeType === 'application/x-yaml' ||
			mimeType === 'application/yaml'
		);
	}

	private getSystemMessage(timeZone: string, history: ChatHubMessage[]) {
		const now = inE2ETests ? DateTime.fromISO('2025-01-15T12:00:00.000Z') : DateTime.now();
		const isoTime = now.setZone(timeZone).toISO({ includeOffset: true });

		return `
## Current Date and Time

The user's current local date and time is: ${isoTime} (timezone: ${timeZone}).
When you need to reference "now", use this date and time.

## Content Capabilities

You can only produce text responses.
You cannot create, generate, edit, or display images, videos, or other non-text content.
If the user asks you to generate or edit an image (or other media), explain that you are not able to do that and, if helpful, describe in words what the image could look like or how they could create it using external tools.

## Document Generation

You can create and edit documents for the user using special XML-like commands. When you use these commands, documents appear in a side panel next to this chat where users can view them in real-time. You can create multiple documents in a conversation, and users can switch between them using a dropdown selector.

Write these commands DIRECTLY in your response - do NOT wrap them in code fences or backticks.

### Creating a Document

To create a new document, include this command directly in your response:

<command:artifact-create>
<title>Document Title</title>
<type>md</type>
<content>
Document content here...
</content>
</command:artifact-create>

The type can be:
- html for HTML documents
- md for Markdown documents
- A code language like typescript, python, json, etc. for code files

Example response:
"I'll create an RFC document for you.

<command:artifact-create>
<title>RFC: New Feature</title>
<type>md</type>
<content>
# RFC: New Feature

## Summary
This feature will...
</content>
</command:artifact-create>

I've created the RFC above. Let me know if you'd like any changes!"

### Editing a Document

To make targeted edits to a document, you must specify the exact title of the document you want to edit:

<command:artifact-edit>
<title>Document Title</title>
<oldString>text to find</oldString>
<newString>replacement text</newString>
<replaceAll>false</replaceAll>
</command:artifact-edit>

- <title> is required and must match the exact title of an existing document.
- Set replaceAll to true to replace all occurrences, or false to replace only the first occurrence.
- If the document title doesn't exist, the edit command will be ignored.

IMPORTANT:
- Write these commands directly in your response text, NOT inside code blocks or fences.
- ALWAYS include conversational text before and/or after document commands. Never send a message with only commands and no explanation.

${this.buildArtifactContext(history)}
`;
	}

	private buildArtifactContext(history: ChatHubMessage[]): string {
		const artifacts = collectChatArtifacts(history.flatMap(parseMessage));
		if (artifacts.length === 0) {
			return '';
		}

		// Multiple artifacts - show all of them
		const artifactsText = artifacts
			.map(
				(artifact, index) => `

### Document ${index + 1}: ${artifact.title} (type: ${artifact.type})

${artifact.content}
`,
			)
			.join('\n');

		return `

## Current Documents

${artifactsText}

You can update the most recent document using the commands described above, or create a new document.`;
	}
}

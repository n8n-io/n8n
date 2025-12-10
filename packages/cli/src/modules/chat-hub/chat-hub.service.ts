import {
	PROVIDER_CREDENTIAL_TYPE_MAP,
	type ChatHubProvider,
	type ChatHubLLMProvider,
	type ChatHubConversationsResponse,
	type ChatHubConversationResponse,
	ChatHubMessageDto,
	type ChatMessageId,
	type ChatSessionId,
	ChatHubConversationModel,
	ChatHubMessageStatus,
	type EnrichedStructuredChunk,
	ChatHubBaseLLMModel,
	ChatHubN8nModel,
	ChatHubCustomAgentModel,
	type ChatHubUpdateConversationRequest,
	type ChatModelDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { ExecutionRepository, IExecutionResponse, User, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import type { Response } from 'express';
import { ErrorReporter, InstanceSettings } from 'n8n-core';
import {
	CHAT_TRIGGER_NODE_TYPE,
	OperationalError,
	ManualExecutionCancelledError,
	type INodeCredentials,
	type IWorkflowBase,
	jsonParse,
	jsonStringify,
	StructuredChunk,
	RESPOND_TO_CHAT_NODE_TYPE,
	IRunExecutionData,
	INodeParameters,
	INode,
	type IBinaryData,
	createRunExecutionData,
	WorkflowExecuteMode,
	AGENT_LANGCHAIN_NODE_TYPE,
} from 'n8n-workflow';

import { ChatHubAgentService } from './chat-hub-agent.service';
import { ChatHubCredentialsService } from './chat-hub-credentials.service';
import type { ChatHubMessage } from './chat-hub-message.entity';
import type { ChatHubSession } from './chat-hub-session.entity';
import { ChatHubWorkflowService } from './chat-hub-workflow.service';
import { ChatHubAttachmentService } from './chat-hub.attachment.service';
import {
	EXECUTION_FINISHED_STATUSES,
	EXECUTION_POLL_INTERVAL,
	JSONL_STREAM_HEADERS,
	NODE_NAMES,
	PROVIDER_NODE_TYPE_MAP,
	TOOLS_AGENT_NODE_MIN_VERSION,
} from './chat-hub.constants';
import { ChatHubSettingsService } from './chat-hub.settings.service';
import {
	HumanMessagePayload,
	RegenerateMessagePayload,
	EditMessagePayload,
	chatTriggerParamsShape,
	ChatTriggerResponseMode,
} from './chat-hub.types';
import { ChatHubMessageRepository } from './chat-message.repository';
import { ChatHubSessionRepository } from './chat-session.repository';
import { interceptResponseWrites, createStructuredChunkAggregator } from './stream-capturer';

import { ActiveExecutions } from '@/active-executions';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ExecutionService } from '@/executions/execution.service';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

@Service()
export class ChatHubService {
	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly executionService: ExecutionService,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowExecutionService: WorkflowExecutionService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly activeExecutions: ActiveExecutions,
		private readonly sessionRepository: ChatHubSessionRepository,
		private readonly messageRepository: ChatHubMessageRepository,
		private readonly chatHubAgentService: ChatHubAgentService,
		private readonly chatHubCredentialsService: ChatHubCredentialsService,
		private readonly chatHubWorkflowService: ChatHubWorkflowService,
		private readonly chatHubSettingsService: ChatHubSettingsService,
		private readonly chatHubAttachmentService: ChatHubAttachmentService,
		private readonly instanceSettings: InstanceSettings,
		private readonly globalConfig: GlobalConfig,
	) {}

	private async deleteChatWorkflow(workflowId: string): Promise<void> {
		await this.workflowRepository.delete(workflowId);
	}

	private getErrorMessage(execution: IExecutionResponse): string | undefined {
		if (execution.data.resultData.error) {
			return execution.data.resultData.error.description ?? execution.data.resultData.error.message;
		}

		return undefined;
	}

	private getAIOutput(execution: IExecutionResponse, nodeName: string): string | undefined {
		const agent = execution.data.resultData.runData[nodeName];
		if (!agent || !Array.isArray(agent) || agent.length === 0) return undefined;

		const runIndex = agent.length - 1;
		const mainOutputs = agent[runIndex].data?.main;

		// Check all main output branches for a message
		if (mainOutputs && Array.isArray(mainOutputs)) {
			for (const branch of mainOutputs) {
				if (branch && Array.isArray(branch) && branch.length > 0 && branch[0].json?.output) {
					if (typeof branch[0].json.output === 'string') {
						return branch[0].json.output;
					}
				}
			}
		}

		return undefined;
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

	async sendHumanMessage(res: Response, user: User, payload: HumanMessagePayload) {
		const {
			sessionId,
			messageId,
			message,
			model,
			credentials,
			previousMessageId,
			tools,
			attachments,
			timeZone,
		} = payload;
		const tz = timeZone ?? this.globalConfig.generic.timezone;

		const credentialId = this.getModelCredential(model, credentials);

		// Store attachments early to populate 'id' field via BinaryDataService
		const processedAttachments = await this.chatHubAttachmentService.store(
			sessionId,
			messageId,
			attachments,
		);

		let executionData: IRunExecutionData;
		let workflowData: IWorkflowBase;
		let responseMode: ChatTriggerResponseMode;

		try {
			const result = await this.messageRepository.manager.transaction(async (trx) => {
				let session = await this.getChatSession(user, sessionId, trx);
				session ??= await this.createChatSession(user, sessionId, model, credentialId, tools, trx);

				await this.ensurePreviousMessage(previousMessageId, sessionId, trx);
				const messages = Object.fromEntries((session.messages ?? []).map((m) => [m.id, m]));
				const history = this.buildMessageHistory(messages, previousMessageId);

				await this.saveHumanMessage(
					payload,
					processedAttachments,
					user,
					previousMessageId,
					model,
					undefined,
					trx,
				);

				return await this.prepareReplyWorkflow(
					user,
					sessionId,
					credentials,
					model,
					history,
					message,
					tools,
					processedAttachments,
					tz,
					trx,
				);
			});

			executionData = result.executionData;
			workflowData = result.workflowData;
			responseMode = result.responseMode;
		} catch (error) {
			if (processedAttachments.length > 0) {
				try {
					// Rollback stored attachments if transaction fails
					await this.chatHubAttachmentService.deleteAttachments(processedAttachments);
				} catch (error) {
					this.errorReporter.warn(`Could not clean up ${processedAttachments.length} files`);
				}
			}

			throw error;
		}

		await this.executeChatWorkflowWithCleanup(
			res,
			user,
			workflowData,
			executionData,
			sessionId,
			messageId,
			model,
			null,
			responseMode,
		);

		// Generate title for the session on receiving the first human message.
		// This could be moved on a separate API call perhaps, maybe triggered after the first message is sent?
		if (previousMessageId === null) {
			await this.generateSessionTitle(
				user,
				sessionId,
				message,
				processedAttachments,
				credentials,
				model,
			).catch((error) => {
				this.logger.error(`Title generation failed: ${error}`);
			});
		}
	}

	async editMessage(res: Response, user: User, payload: EditMessagePayload) {
		const { sessionId, editId, messageId, message, model, credentials, timeZone } = payload;
		const tz = timeZone ?? this.globalConfig.generic.timezone;

		const workflow = await this.messageRepository.manager.transaction(async (trx) => {
			const session = await this.getChatSession(user, sessionId, trx);
			if (!session) {
				throw new NotFoundError('Chat session not found');
			}

			const messageToEdit = await this.getChatMessage(session.id, editId, [], trx);

			if (messageToEdit.type === 'ai') {
				// AI edits just change the original message without revisioning or response generation
				await this.messageRepository.updateChatMessage(editId, { content: payload.message }, trx);
				return null;
			}

			if (messageToEdit.type === 'human') {
				const messages = Object.fromEntries((session.messages ?? []).map((m) => [m.id, m]));
				const history = this.buildMessageHistory(messages, messageToEdit.previousMessageId);

				// If the message to edit isn't the original message, we want to point to the original message
				const revisionOfMessageId = messageToEdit.revisionOfMessageId ?? messageToEdit.id;

				// Attachments are already processed (from the original message)
				const attachments = messageToEdit.attachments ?? [];

				await this.saveHumanMessage(
					payload,
					attachments,
					user,
					messageToEdit.previousMessageId,
					model,
					revisionOfMessageId,
					trx,
				);

				return await this.prepareReplyWorkflow(
					user,
					sessionId,
					credentials,
					model,
					history,
					message,
					session.tools,
					attachments,
					tz,
					trx,
				);
			}

			throw new BadRequestError('Only human and AI messages can be edited');
		});

		if (!workflow) {
			return;
		}

		const { workflowData, executionData, responseMode } = workflow;

		await this.executeChatWorkflowWithCleanup(
			res,
			user,
			workflowData,
			executionData,
			sessionId,
			messageId,
			model,
			null,
			responseMode,
		);
	}

	async regenerateAIMessage(res: Response, user: User, payload: RegenerateMessagePayload) {
		const { sessionId, retryId, model, credentials, timeZone } = payload;
		const tz = timeZone ?? this.globalConfig.generic.timezone;

		const {
			workflow: { workflowData, executionData, responseMode },
			retryOfMessageId,
			previousMessageId,
		} = await this.messageRepository.manager.transaction(async (trx) => {
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

			// Remove any (AI) messages that came after the last human message
			const lastHumanMessageIndex = history.indexOf(lastHumanMessage);
			if (lastHumanMessageIndex !== -1) {
				history.splice(lastHumanMessageIndex + 1);
			}

			// Rerun the workflow, replaying the last human message

			// If the message being retried is itself a retry, we want to point to the original message
			const retryOfMessageId = messageToRetry.retryOfMessageId ?? messageToRetry.id;
			const message = lastHumanMessage ? lastHumanMessage.content : '';
			const attachments = lastHumanMessage.attachments ?? [];
			const workflow = await this.prepareReplyWorkflow(
				user,
				sessionId,
				credentials,
				model,
				history,
				message,
				session.tools,
				attachments,
				tz,
				trx,
			);

			return {
				workflow,
				previousMessageId: lastHumanMessage.id,
				retryOfMessageId,
			};
		});

		await this.executeChatWorkflowWithCleanup(
			res,
			user,
			workflowData,
			executionData,
			sessionId,
			previousMessageId,
			model,
			retryOfMessageId,
			responseMode,
		);
	}

	private async prepareReplyWorkflow(
		user: User,
		sessionId: ChatSessionId,
		credentials: INodeCredentials,
		model: ChatHubConversationModel,
		history: ChatHubMessage[],
		message: string,
		tools: INode[],
		attachments: IBinaryData[],
		timeZone: string,
		trx: EntityManager,
	) {
		if (model.provider === 'n8n') {
			return await this.prepareCustomAgentWorkflow(
				user,
				sessionId,
				model.workflowId,
				message,
				attachments,
			);
		}

		if (model.provider === 'custom-agent') {
			return await this.prepareChatAgentWorkflow(
				model.agentId,
				user,
				sessionId,
				history,
				message,
				attachments,
				timeZone,
				trx,
			);
		}

		return await this.prepareBaseChatWorkflow(
			user,
			sessionId,
			credentials,
			model,
			history,
			message,
			undefined,
			tools,
			attachments,
			timeZone,
			trx,
		);
	}

	private async prepareBaseChatWorkflow(
		user: User,
		sessionId: ChatSessionId,
		credentials: INodeCredentials,
		model: ChatHubBaseLLMModel,
		history: ChatHubMessage[],
		message: string,
		systemMessage: string | undefined,
		tools: INode[],
		attachments: IBinaryData[],
		timeZone: string,
		trx: EntityManager,
	) {
		await this.chatHubSettingsService.ensureModelIsAllowed(model);
		const credential = await this.chatHubCredentialsService.ensureCredentials(
			user,
			model.provider,
			credentials,
			trx,
		);

		return await this.chatHubWorkflowService.createChatWorkflow(
			user.id,
			sessionId,
			credential.projectId,
			history,
			message,
			attachments,
			credentials,
			model,
			systemMessage,
			tools,
			timeZone,
			trx,
		);
	}

	private async prepareChatAgentWorkflow(
		agentId: string,
		user: User,
		sessionId: ChatSessionId,
		history: ChatHubMessage[],
		message: string,
		attachments: IBinaryData[],
		timeZone: string,
		trx: EntityManager,
	) {
		const agent = await this.chatHubAgentService.getAgentById(agentId, user.id);

		if (!agent) {
			throw new BadRequestError('Agent not found');
		}

		if (!agent.provider || !agent.model) {
			throw new BadRequestError('Provider or model not set for agent');
		}

		const credentialId = agent.credentialId;
		if (!credentialId) {
			throw new BadRequestError('Credentials not set for agent');
		}

		const systemMessage =
			agent.systemPrompt + '\n\n' + this.chatHubWorkflowService.getSystemMessageMetadata(timeZone);

		const model: ChatHubBaseLLMModel = {
			provider: agent.provider,
			model: agent.model,
		};

		const credentials: INodeCredentials = {
			[PROVIDER_CREDENTIAL_TYPE_MAP[agent.provider]]: {
				id: credentialId,
				name: '',
			},
		};

		const { tools } = agent;

		return await this.prepareBaseChatWorkflow(
			user,
			sessionId,
			credentials,
			model,
			history,
			message,
			systemMessage,
			tools,
			attachments,
			timeZone,
			trx,
		);
	}

	private async prepareCustomAgentWorkflow(
		user: User,
		sessionId: ChatSessionId,
		workflowId: string,
		message: string,
		attachments: IBinaryData[],
	) {
		const workflow = await this.workflowFinderService.findWorkflowForUser(
			workflowId,
			user,
			['workflow:execute-chat'],
			{ includeTags: false, includeParentFolder: false, includeActiveVersion: true },
		);

		if (!workflow?.activeVersion) {
			throw new BadRequestError('Workflow not found');
		}

		const chatTriggers = workflow.activeVersion.nodes.filter(
			(node) => node.type === CHAT_TRIGGER_NODE_TYPE,
		);

		if (chatTriggers.length !== 1) {
			throw new BadRequestError('Workflow must have exactly one chat trigger');
		}

		const chatTrigger = chatTriggers[0];

		if (chatTrigger.typeVersion < 1.4) {
			throw new BadRequestError(
				'Chat Trigger node version is too old to support Chat. Please update the node.',
			);
		}

		const chatTriggerParams = chatTriggerParamsShape.safeParse(chatTrigger.parameters).data;
		if (!chatTriggerParams) {
			throw new BadRequestError('Chat Trigger node has invalid parameters');
		}

		if (!chatTriggerParams.availableInChat) {
			throw new BadRequestError('Chat Trigger node must be made available in Chat');
		}

		const responseMode = chatTriggerParams.options?.responseMode ?? 'streaming';
		if (responseMode !== 'streaming') {
			throw new BadRequestError(
				'Chat Trigger node response mode must be set to streaming to use the workflow on Chat',
			);
		}

		const chatResponseNodes = workflow.activeVersion.nodes.filter(
			(node) => node.type === RESPOND_TO_CHAT_NODE_TYPE,
		);

		if (chatResponseNodes.length > 0) {
			throw new BadRequestError(
				'Respond to Chat nodes are not supported in custom agent workflows',
			);
		}

		const agentNodes = workflow.activeVersion.nodes?.filter(
			(node) => node.type === AGENT_LANGCHAIN_NODE_TYPE,
		);

		// Agents older than this can't do streaming
		if (agentNodes.some((node) => node.typeVersion < TOOLS_AGENT_NODE_MIN_VERSION)) {
			throw new BadRequestError(
				'Agent node version is too old to support streaming responses. Please update the node.',
			);
		}

		const nodeExecutionStack = this.chatHubWorkflowService.prepareExecutionData(
			chatTrigger,
			sessionId,
			message,
			attachments,
		);

		const executionData = createRunExecutionData({
			executionData: {
				nodeExecutionStack,
			},
			manualData: {
				userId: user.id,
			},
		});

		const workflowData: IWorkflowBase = {
			...workflow,
			nodes: workflow.activeVersion.nodes,
			connections: workflow.activeVersion.connections,
		};

		return {
			workflowData,
			executionData,
			responseMode,
		};
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
	}

	async stopGeneration(user: User, sessionId: ChatSessionId, messageId: ChatMessageId) {
		const session = await this.getChatSession(user, sessionId);
		if (!session) {
			throw new NotFoundError('Chat session not found');
		}

		const message = await this.getChatMessage(session.id, messageId, [
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

		await this.executionService.stop(message.execution.id, [message.execution.workflowId]);
		await this.messageRepository.updateChatMessage(messageId, { status: 'cancelled' });
	}

	private async executeChatWorkflow(
		res: Response,
		user: User,
		workflowData: IWorkflowBase,
		executionData: IRunExecutionData,
		sessionId: ChatSessionId,
		previousMessageId: ChatMessageId,
		model: ChatHubConversationModel,
		retryOfMessageId: ChatMessageId | null = null,
		executionMode: WorkflowExecuteMode = 'chat',
		responseMode: ChatTriggerResponseMode,
	) {
		this.logger.debug(
			`Starting execution of workflow "${workflowData.name}" with ID ${workflowData.id}`,
		);

		if (responseMode !== 'streaming') {
			throw new BadRequestError(`Response mode "${responseMode}" is not supported yet.`);
		}

		// Capture the streaming response as it's being generated to save
		// partial messages in the database when generation gets cancelled.
		let executionId: string | undefined = undefined;

		const aggregator = createStructuredChunkAggregator(previousMessageId, retryOfMessageId, {
			onBegin: async (message) => {
				await this.saveAIMessage({
					...message,
					sessionId,
					executionId,
					model,
					retryOfMessageId,
				});
			},
			onItem: (_message, _chunk) => {
				// We could save partial messages to DB here if we wanted to,
				// but they would be very frequent updates.
			},
			onEnd: async (message) => {
				await this.messageRepository.updateChatMessage(message.id, {
					content: message.content,
					status: message.status,
				});
			},
			onError: async (message, _errorText) => {
				await this.messageRepository.manager.transaction(async (trx) => {
					// Always update the content to whatever was generated so far, including the possible error text
					await this.messageRepository.updateChatMessage(
						message.id,
						{
							content: message.content,
						},
						trx,
					);

					// When messages are cancelled they're already marked cancelled on `stopGeneration`
					const savedMessage = await this.messageRepository.getOneById(
						message.id,
						sessionId,
						[],
						trx,
					);
					if (savedMessage?.status === 'cancelled') {
						return;
					}

					// Otherwise mark them as errored
					await this.messageRepository.updateChatMessage(
						message.id,
						{
							status: 'error',
						},
						trx,
					);
				});
			},
		});

		const transform = (text: string) => {
			const trimmed = text.trim();
			if (!trimmed) return text;

			let chunk: StructuredChunk | null = null;
			try {
				chunk = jsonParse<StructuredChunk>(trimmed);
			} catch {
				return text;
			}

			const message = aggregator.ingest(chunk);
			const enriched: EnrichedStructuredChunk = {
				...chunk,
				metadata: {
					...chunk.metadata,
					messageId: message.id,
					previousMessageId: message.previousMessageId,
					retryOfMessageId: message.retryOfMessageId,
					executionId: executionId ? +executionId : null,
				},
			};

			return jsonStringify(enriched) + '\n';
		};

		const stream = interceptResponseWrites(res, transform);

		stream.on('finish', aggregator.finalizeAll);
		stream.on('close', aggregator.finalizeAll);

		stream.writeHead(200, JSONL_STREAM_HEADERS);
		stream.flushHeaders();

		const execution = await this.workflowExecutionService.executeChatWorkflow(
			workflowData,
			executionData,
			user,
			stream,
			true,
			executionMode,
		);

		executionId = execution.executionId;

		if (!executionId) {
			throw new OperationalError('There was a problem starting the chat execution.');
		}

		await this.waitForExecutionCompletion(executionId);
	}

	private async waitForExecutionCompletion(executionId: string): Promise<void> {
		if (this.instanceSettings.isMultiMain) {
			return await this.waitForExecutionPoller(executionId);
		} else {
			return await this.waitForExecutionPromise(executionId);
		}
	}

	private async waitForExecutionPoller(executionId: string): Promise<void> {
		return await new Promise<void>((resolve, reject) => {
			const poller = setInterval(async () => {
				try {
					const result = await this.executionRepository.findSingleExecution(executionId, {
						includeData: false,
						unflattenData: false,
					});

					// Stop polling when execution is done (or missing if instance doesn't save executions)
					if (!result || EXECUTION_FINISHED_STATUSES.includes(result.status)) {
						this.logger.debug(
							`Execution ${executionId} finished with status ${result?.status ?? 'missing'}`,
						);
						clearInterval(poller);
						resolve();
					}
				} catch (error) {
					this.logger.error(`Stopping polling for execution ${executionId} due to error.`);
					clearInterval(poller);

					if (error instanceof Error) {
						this.logger.error(`Error while polling execution ${executionId}: ${error.message}`, {
							error,
						});
					} else {
						this.logger.error(`Unknown error while polling execution ${executionId}`, { error });
					}

					if (error instanceof Error) {
						reject(error);
					} else {
						reject(new Error('Unknown error while polling execution status'));
					}
				}
			}, EXECUTION_POLL_INTERVAL);
		});
	}

	private async waitForExecutionPromise(executionId: string): Promise<void> {
		try {
			// Wait until the execution finishes (or errors) so that we don't delete the workflow too early
			const result = await this.activeExecutions.getPostExecutePromise(executionId);
			if (!result) {
				throw new OperationalError('There was a problem executing the chat workflow.');
			}
		} catch (error: unknown) {
			if (error instanceof ManualExecutionCancelledError) {
				return;
			}

			if (error instanceof Error) {
				this.logger.error(`Error during chat workflow execution: ${error}`);
			}
			throw error;
		}
	}

	private async executeChatWorkflowWithCleanup(
		res: Response,
		user: User,
		workflowData: IWorkflowBase,
		executionData: IRunExecutionData,
		sessionId: ChatSessionId,
		previousMessageId: ChatMessageId,
		model: ChatHubConversationModel,
		retryOfMessageId: ChatMessageId | null,
		responseMode: ChatTriggerResponseMode,
	) {
		try {
			// 'n8n' provider executions count towards execution limits and they are run with the usual 'webhook' mode.
			// Chats with base LLM providers use 'chat' execution mode that doesn't count towards limits.
			const executionMode = model.provider === 'n8n' ? 'webhook' : 'chat';

			await this.executeChatWorkflow(
				res,
				user,
				workflowData,
				executionData,
				sessionId,
				previousMessageId,
				model,
				retryOfMessageId,
				executionMode,
				responseMode,
			);
		} finally {
			if (model.provider !== 'n8n') {
				await this.deleteChatWorkflow(workflowData.id);
			}
		}
	}

	private async generateSessionTitle(
		user: User,
		sessionId: ChatSessionId,
		humanMessage: string,
		attachments: IBinaryData[],
		credentials: INodeCredentials,
		model: ChatHubConversationModel,
	) {
		const { executionData, workflowData } = await this.prepareTitleGenerationWorkflow(
			user,
			sessionId,
			humanMessage,
			attachments,
			credentials,
			model,
		);

		try {
			const title = await this.runTitleWorkflowAndGetTitle(user, workflowData, executionData);
			if (title) {
				await this.sessionRepository.updateChatTitle(sessionId, title);
			}
		} catch (error: unknown) {
			if (error instanceof Error) {
				this.logger.error(`Error during session title generation workflow execution: ${error}`);
			}
			throw error;
		} finally {
			await this.deleteChatWorkflow(workflowData.id);
		}
	}

	private async prepareTitleGenerationWorkflow(
		user: User,
		sessionId: ChatSessionId,
		humanMessage: string,
		attachments: IBinaryData[],
		incomingCredentials: INodeCredentials,
		incomingModel: ChatHubConversationModel,
	) {
		return await this.messageRepository.manager.transaction(async (trx) => {
			const { resolvedCredentials, resolvedModel, credential } =
				await this.resolveCredentialsAndModelForTitle(
					user,
					incomingModel,
					incomingCredentials,
					trx,
				);

			if (!credential) {
				throw new BadRequestError('Could not determine credentials for title generation');
			}

			this.logger.debug(
				`Using credential ID ${credential.id} for title generation in project ${credential.projectId}, model ${jsonStringify(resolvedModel)}`,
			);

			return await this.chatHubWorkflowService.createTitleGenerationWorkflow(
				user.id,
				sessionId,
				credential.projectId,
				humanMessage,
				attachments,
				resolvedCredentials,
				resolvedModel,
				trx,
			);
		});
	}

	private async resolveCredentialsAndModelForTitle(
		user: User,
		model: ChatHubConversationModel,
		credentials: INodeCredentials,
		trx: EntityManager,
	): Promise<{
		resolvedCredentials: INodeCredentials;
		resolvedModel: ChatHubConversationModel;
		credential: { id: string; projectId: string };
	}> {
		if (model.provider === 'n8n') {
			return await this.resolveFromN8nWorkflow(user, model, trx);
		}

		if (model.provider === 'custom-agent') {
			return await this.resolveFromCustomAgent(user, model, trx);
		}

		const credential = await this.chatHubCredentialsService.ensureCredentials(
			user,
			model.provider,
			credentials,
			trx,
		);

		return {
			resolvedCredentials: credentials,
			resolvedModel: model,
			credential,
		};
	}

	private async resolveFromN8nWorkflow(
		user: User,
		{ workflowId }: ChatHubN8nModel,
		trx: EntityManager,
	): Promise<{
		resolvedCredentials: INodeCredentials;
		resolvedModel: ChatHubConversationModel;
		credential: { id: string; projectId: string };
	}> {
		const workflowEntity = await this.workflowFinderService.findWorkflowForUser(
			workflowId,
			user,
			['workflow:execute-chat'],
			{ includeTags: false, includeParentFolder: false, includeActiveVersion: true, em: trx },
		);

		if (!workflowEntity?.activeVersion) {
			throw new BadRequestError('Workflow not found for title generation');
		}

		const modelNodes = this.findSupportedLLMNodes(workflowEntity.activeVersion.nodes);
		this.logger.debug(
			`Found ${modelNodes.length} LLM nodes in workflow ${workflowEntity.id} for title generation`,
		);

		if (modelNodes.length === 0) {
			throw new BadRequestError('No supported Model nodes found in workflow for title generation');
		}

		const modelNode = modelNodes[0];
		const llmModel = (modelNode.node.parameters?.model as INodeParameters)?.value;
		if (!llmModel) {
			throw new BadRequestError(
				`No model set on Model node "${modelNode.node.name}" for title generation`,
			);
		}

		if (typeof llmModel !== 'string' || llmModel.length === 0 || llmModel.startsWith('=')) {
			throw new BadRequestError(
				`Invalid model set on Model node "${modelNode.node.name}" for title generation`,
			);
		}

		const llmCredentials = modelNode.node.credentials;
		if (!llmCredentials) {
			throw new BadRequestError(
				`No credentials found on Model node "${modelNode.node.name}" for title generation`,
			);
		}

		const credential = await this.chatHubCredentialsService.ensureWorkflowCredentials(
			modelNode.provider,
			llmCredentials,
			workflowId,
		);

		const resolvedModel: ChatHubConversationModel = {
			provider: modelNode.provider,
			model: llmModel,
		};

		const resolvedCredentials: INodeCredentials = {
			[PROVIDER_CREDENTIAL_TYPE_MAP[modelNode.provider]]: {
				id: credential.id,
				name: '',
			},
		};

		return { resolvedCredentials, resolvedModel, credential };
	}

	private findSupportedLLMNodes(nodes: INode[]) {
		return nodes.reduce<Array<{ node: INode; provider: ChatHubLLMProvider }>>((acc, node) => {
			const supportedProvider = Object.entries(PROVIDER_NODE_TYPE_MAP).find(
				([_provider, { name }]) => node.type === name,
			);
			if (supportedProvider) {
				const [provider] = supportedProvider;
				acc.push({ node, provider: provider as ChatHubLLMProvider });
			}
			return acc;
		}, []);
	}

	private async resolveFromCustomAgent(
		user: User,
		model: ChatHubCustomAgentModel,
		trx: EntityManager,
	): Promise<{
		resolvedCredentials: INodeCredentials;
		resolvedModel: ChatHubConversationModel;
		credential: { id: string; projectId: string };
	}> {
		const agent = await this.chatHubAgentService.getAgentById(model.agentId, user.id);
		if (!agent) {
			throw new BadRequestError('Agent not found for title generation');
		}

		const credentialId = agent.credentialId;
		if (!credentialId) {
			throw new BadRequestError('Credentials not set for agent');
		}

		const resolvedModel: ChatHubConversationModel = {
			provider: agent.provider,
			model: agent.model,
		};

		const resolvedCredentials: INodeCredentials = {
			[PROVIDER_CREDENTIAL_TYPE_MAP[agent.provider]]: {
				id: credentialId,
				name: '',
			},
		};

		const credential = await this.chatHubCredentialsService.ensureCredentials(
			user,
			agent.provider,
			resolvedCredentials,
			trx,
		);

		return { resolvedCredentials, resolvedModel, credential };
	}

	private async runTitleWorkflowAndGetTitle(
		user: User,
		workflowData: IWorkflowBase,
		executionData: IRunExecutionData,
	): Promise<string | null> {
		const { executionId } = await this.workflowExecutionService.executeChatWorkflow(
			workflowData,
			executionData,
			user,
			undefined,
			false,
			'chat',
		);

		await this.waitForExecutionCompletion(executionId);

		const execution = await this.executionRepository.findWithUnflattenedData(executionId, [
			workflowData.id,
		]);

		if (!execution) {
			throw new OperationalError(`Could not find execution with ID ${executionId}`);
		}

		if (!execution.status || execution.status !== 'success') {
			const message = this.getErrorMessage(execution) ?? 'Failed to generate a response';
			throw new OperationalError(message);
		}

		const title = this.getAIOutput(execution, NODE_NAMES.TITLE_GENERATOR_AGENT);
		return title ?? null;
	}

	private async saveHumanMessage(
		payload: HumanMessagePayload | EditMessagePayload,
		attachments: IBinaryData[],
		user: User,
		previousMessageId: ChatMessageId | null,
		model: ChatHubConversationModel,
		revisionOfMessageId?: ChatMessageId,
		trx?: EntityManager,
	) {
		await this.messageRepository.createChatMessage(
			{
				id: payload.messageId,
				sessionId: payload.sessionId,
				type: 'human',
				status: 'success',
				content: payload.message,
				previousMessageId,
				revisionOfMessageId,
				name: user.firstName || 'User',
				attachments,
				...model,
			},
			trx,
		);
	}

	private async saveAIMessage({
		id,
		sessionId,
		executionId,
		previousMessageId,
		content,
		model,
		retryOfMessageId,
		status,
	}: {
		id: ChatMessageId;
		sessionId: ChatSessionId;
		previousMessageId: ChatMessageId | null;
		content: string;
		model: ChatHubConversationModel;
		executionId?: string;
		retryOfMessageId: ChatMessageId | null;
		editOfMessageId?: ChatMessageId;
		status?: ChatHubMessageStatus;
	}) {
		await this.messageRepository.createChatMessage({
			id,
			sessionId,
			previousMessageId,
			executionId: executionId ? parseInt(executionId, 10) : null,
			type: 'ai',
			name: 'AI',
			status,
			content,
			retryOfMessageId,
			...model,
		});
	}

	private getModelCredential(model: ChatHubConversationModel, credentials: INodeCredentials) {
		const credentialId =
			model.provider !== 'n8n' ? this.pickCredentialId(model.provider, credentials) : null;

		return credentialId;
	}

	private async getChatSession(user: User, sessionId: ChatSessionId, trx?: EntityManager) {
		return await this.sessionRepository.getOneById(sessionId, user.id, trx);
	}

	private async getAgentNameAndIcon(
		user: User,
		model: ChatHubConversationModel,
	): Promise<Pick<ChatModelDto, 'name' | 'icon'>> {
		if (model.provider === 'custom-agent') {
			return await this.chatHubAgentService.getAgentById(model.agentId, user.id);
		}

		if (model.provider === 'n8n') {
			const agents = await this.chatHubWorkflowService.fetchAgentWorkflowsAsModelsByIds([
				model.workflowId,
			]);

			return { icon: agents[0]?.icon ?? null, name: agents[0]?.name ?? '' };
		}

		return { icon: null, name: model.model };
	}

	private async createChatSession(
		user: User,
		sessionId: ChatSessionId,
		model: ChatHubConversationModel,
		credentialId: string | null,
		tools: INode[],
		trx?: EntityManager,
	) {
		await this.ensureValidModel(user, model);

		const nameAndIcon = await this.getAgentNameAndIcon(user, model);

		return await this.sessionRepository.createChatSession(
			{
				id: sessionId,
				ownerId: user.id,
				title: 'New Chat',
				agentName: nameAndIcon.name,
				agentIcon: nameAndIcon.icon,
				tools,
				credentialId,
				...model,
			},
			trx,
		);
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
			data: data.map((session) => ({
				id: session.id,
				title: session.title,
				ownerId: session.ownerId,
				lastMessageAt: session.lastMessageAt?.toISOString() ?? null,
				credentialId: session.credentialId,
				provider: session.provider,
				model: session.model,
				workflowId: session.workflowId,
				agentId: session.agentId,
				agentName: session.agentName ?? '',
				agentIcon: session.agentIcon,
				createdAt: session.createdAt.toISOString(),
				updatedAt: session.updatedAt.toISOString(),
				tools: session.tools,
			})),
			nextCursor,
			hasMore,
		};
	}

	/**
	 * Get a single conversation with messages and ready to render timeline of latest messages
	 * */
	async getConversation(userId: string, sessionId: string): Promise<ChatHubConversationResponse> {
		const session = await this.sessionRepository.getOneById(sessionId, userId);
		if (!session) {
			throw new NotFoundError('Chat session not found');
		}

		const messages = await this.messageRepository.getManyBySessionId(sessionId);

		return {
			session: {
				id: session.id,
				title: session.title,
				ownerId: session.ownerId,
				lastMessageAt: session.lastMessageAt?.toISOString() ?? null,
				credentialId: session.credentialId,
				provider: session.provider,
				model: session.model,
				workflowId: session.workflowId,
				agentId: session.agentId,
				agentName: session.agentName ?? '',
				agentIcon: session.agentIcon,
				createdAt: session.createdAt.toISOString(),
				updatedAt: session.updatedAt.toISOString(),
				tools: session.tools,
			},
			conversation: {
				messages: Object.fromEntries(messages.map((m) => [m.id, this.convertMessageToDto(m)])),
			},
		};
	}

	private convertMessageToDto(message: ChatHubMessage): ChatHubMessageDto {
		return {
			id: message.id,
			sessionId: message.sessionId,
			type: message.type,
			name: message.name,
			content: message.content,
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
		await this.chatHubAttachmentService.deleteAll();
		const result = await this.sessionRepository.deleteAll();
		return result;
	}

	/**
	 * Updates the title of a session
	 */
	async updateSessionTitle(userId: string, sessionId: ChatSessionId, title: string) {
		const session = await this.sessionRepository.getOneById(sessionId, userId);

		if (!session) {
			throw new NotFoundError('Session not found');
		}

		return await this.sessionRepository.updateChatTitle(sessionId, title);
	}

	/**
	 * Updates a session with the provided fields
	 */
	async updateSession(
		user: User,
		sessionId: ChatSessionId,
		updates: ChatHubUpdateConversationRequest,
	) {
		const session = await this.sessionRepository.getOneById(sessionId, user.id);

		if (!session) {
			throw new NotFoundError('Session not found');
		}

		// Prepare the actual updates to be sent to the repository
		const sessionUpdates: Partial<ChatHubSession> = {};

		if (updates.model) {
			await this.ensureValidModel(user, updates.model);

			const nameAndIcon = await this.getAgentNameAndIcon(user, updates.model);

			sessionUpdates.agentName = nameAndIcon.name;
			sessionUpdates.agentIcon = nameAndIcon.icon;
			sessionUpdates.provider = updates.model.provider;
			sessionUpdates.model = null;
			sessionUpdates.credentialId = null;
			sessionUpdates.agentId = null;
			sessionUpdates.workflowId = null;

			if (updates.model.provider === 'n8n') {
				sessionUpdates.workflowId = updates.model.workflowId;
			} else if (updates.model.provider === 'custom-agent') {
				sessionUpdates.agentId = updates.model.agentId;
			} else {
				sessionUpdates.model = updates.model.model;
			}
		}

		if (updates.title !== undefined) sessionUpdates.title = updates.title;
		if (updates.credentialId !== undefined) sessionUpdates.credentialId = updates.credentialId;
		if (updates.tools !== undefined) sessionUpdates.tools = updates.tools;

		return await this.sessionRepository.updateChatSession(sessionId, sessionUpdates);
	}

	/**
	 * Deletes a session
	 */
	async deleteSession(userId: string, sessionId: ChatSessionId) {
		const session = await this.sessionRepository.getOneById(sessionId, userId);

		if (!session) {
			throw new NotFoundError('Session not found');
		}

		await this.chatHubAttachmentService.deleteAllBySessionId(sessionId);
		await this.sessionRepository.deleteChatHubSession(sessionId);
	}

	private async ensureValidModel(user: User, model: ChatHubConversationModel) {
		if (model.provider === 'custom-agent') {
			// Find the agent to get its name
			const agent = await this.chatHubAgentService.getAgentById(model.agentId, user.id);
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
				{ includeTags: false, includeParentFolder: false, includeActiveVersion: true },
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
}

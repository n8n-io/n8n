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
	ChatHubBaseLLMModel,
	ChatHubN8nModel,
	ChatHubCustomAgentModel,
	type ChatHubUpdateConversationRequest,
	type ChatHubSessionDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { ExecutionRepository, IExecutionResponse, User, WorkflowRepository } from '@n8n/db';
import type { EntityManager } from '@n8n/db';
import { Service } from '@n8n/di';
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
	CHAT_NODE_TYPE,
	IRunExecutionData,
	INodeParameters,
	INode,
	type IBinaryData,
	createRunExecutionData,
	WorkflowExecuteMode,
	AGENT_LANGCHAIN_NODE_TYPE,
	UserError,
	UnexpectedError,
	NodeConnectionTypes,
	INodeExecutionData,
	sleep,
} from 'n8n-workflow';
import { v4 as uuidv4 } from 'uuid';

import { ChatHubAgentService } from './chat-hub-agent.service';
import { ChatHubCredentialsService } from './chat-hub-credentials.service';
import { ChatHubAuthenticationMetadata } from './chat-hub-extractor';
import type { ChatHubMessage } from './chat-hub-message.entity';
import type { ChatHubSession, IChatHubSession } from './chat-hub-session.entity';
import { ChatHubWorkflowService } from './chat-hub-workflow.service';
import { ChatHubAttachmentService } from './chat-hub.attachment.service';
import {
	CHAT_TRIGGER_NODE_MIN_VERSION,
	EXECUTION_FINISHED_STATUSES,
	EXECUTION_POLL_INTERVAL,
	NODE_NAMES,
	PROVIDER_NODE_TYPE_MAP,
	SUPPORTED_RESPONSE_MODES,
	TOOLS_AGENT_NODE_MIN_VERSION,
} from './chat-hub.constants';
import { ChatHubModelsService } from './chat-hub.models.service';
import { ChatHubSettingsService } from './chat-hub.settings.service';
import {
	HumanMessagePayload,
	RegenerateMessagePayload,
	EditMessagePayload,
	chatTriggerParamsShape,
	ChatTriggerResponseMode,
	NonStreamingResponseMode,
	PreparedChatWorkflow,
} from './chat-hub.types';
import { ChatHubMessageRepository } from './chat-message.repository';
import { ChatHubSessionRepository } from './chat-session.repository';
import { ChatStreamService } from './chat-stream.service';
import { createStructuredChunkAggregator } from './stream-capturer';
import { getLastNodeExecuted, shouldResumeImmediately } from '../../chat/utils';

import { ActiveExecutions } from '@/active-executions';
import { ChatExecutionManager } from '@/chat/chat-execution-manager';
import { ExecutionNotFoundError } from '@/errors/execution-not-found-error';
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
		private readonly executionManager: ChatExecutionManager,
		private readonly sessionRepository: ChatHubSessionRepository,
		private readonly messageRepository: ChatHubMessageRepository,
		private readonly chatHubAgentService: ChatHubAgentService,
		private readonly chatHubCredentialsService: ChatHubCredentialsService,
		private readonly chatHubWorkflowService: ChatHubWorkflowService,
		private readonly chatHubModelsService: ChatHubModelsService,
		private readonly chatHubSettingsService: ChatHubSettingsService,
		private readonly chatHubAttachmentService: ChatHubAttachmentService,
		private readonly chatStreamService: ChatStreamService,
		private readonly instanceSettings: InstanceSettings,
		private readonly globalConfig: GlobalConfig,
	) {
		this.logger = this.logger.scoped('chat-hub');
	}

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
		executionMetadata: ChatHubAuthenticationMetadata,
	) {
		if (model.provider === 'n8n') {
			return await this.prepareWorkflowAgentWorkflow(
				user,
				sessionId,
				model.workflowId,
				message,
				attachments,
				trx,
				executionMetadata,
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
				executionMetadata,
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
			executionMetadata,
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
		executionMetadata: ChatHubAuthenticationMetadata,
	) {
		await this.chatHubSettingsService.ensureModelIsAllowed(model);
		this.chatHubCredentialsService.findProviderCredential(model.provider, credentials);
		const { id: projectId } = await this.chatHubCredentialsService.findPersonalProject(user, trx);

		return await this.chatHubWorkflowService.createChatWorkflow(
			user.id,
			sessionId,
			projectId,
			history,
			message,
			attachments,
			credentials,
			model,
			systemMessage,
			tools,
			timeZone,
			executionMetadata,
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
		executionMetadata: ChatHubAuthenticationMetadata,
	) {
		const agent = await this.chatHubAgentService.getAgentById(agentId, user.id, trx);

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
			executionMetadata,
		);
	}

	private async prepareWorkflowAgentWorkflow(
		user: User,
		sessionId: ChatSessionId,
		workflowId: string,
		message: string,
		attachments: IBinaryData[],
		trx: EntityManager,
		executionMetadata: ChatHubAuthenticationMetadata,
	) {
		const workflow = await this.workflowFinderService.findWorkflowForUser(
			workflowId,
			user,
			['workflow:execute-chat'],
			{ includeTags: false, includeParentFolder: false, includeActiveVersion: true, em: trx },
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

		if (chatTrigger.typeVersion < CHAT_TRIGGER_NODE_MIN_VERSION) {
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
		if (!SUPPORTED_RESPONSE_MODES.includes(responseMode)) {
			throw new BadRequestError(
				'Chat Trigger node response mode must be set to "When Last Node Finishes", "Using Response Nodes" or "Streaming" to use the workflow on Chat',
			);
		}

		const chatResponseNodes = workflow.activeVersion.nodes.filter(
			(node) => node.type === CHAT_NODE_TYPE,
		);

		if (chatResponseNodes.length > 0 && responseMode !== 'responseNodes') {
			throw new BadRequestError(
				'Chat nodes are not supported with the selected response mode. Please set the response mode to "Using Response Nodes" or remove the nodes from the workflow.',
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
			executionMetadata,
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
			// Force saving data on successful executions for custom agent workflows
			// to be able to read the results after execution.
			settings: {
				...workflow.settings,
				saveDataSuccessExecution: 'all',
			},
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

		await this.executionService.stop(message.execution.id, [message.execution.workflowId]);
		await this.messageRepository.updateChatMessage(messageId, { status: 'cancelled' });
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
					const execution = await this.executionRepository.findSingleExecution(executionId, {
						includeData: false,
						unflattenData: false,
					});

					// Stop polling when execution is done (or missing if instance doesn't save executions)
					if (!execution || EXECUTION_FINISHED_STATUSES.includes(execution.status)) {
						this.logger.debug(
							`Execution ${executionId} finished with status ${execution?.status ?? 'missing'}`,
						);
						clearInterval(poller);

						if (execution?.status === 'canceled') {
							reject(new ManualExecutionCancelledError(executionId));
						} else {
							resolve();
						}
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
			if (error instanceof ExecutionNotFoundError) {
				return;
			}

			if (error instanceof ManualExecutionCancelledError) {
				throw error;
			}

			if (error instanceof Error) {
				this.logger.error(`Error during chat workflow execution: ${error}`);
			}
			throw error;
		}
	}

	/**
	 * Wait for error details to be available in execution DB using exponential backoff
	 * @param executionId - The execution ID to fetch error details from
	 * @param workflowId - The workflow ID for the execution
	 * @returns The error message if found, undefined otherwise
	 */
	private async waitForErrorDetails(
		executionId: string,
		workflowId: string,
	): Promise<string | undefined> {
		const maxRetries = 5;
		let retries = 0;
		let errorText: string | undefined;

		while (!errorText) {
			try {
				const execution = await this.executionRepository.findWithUnflattenedData(executionId, [
					workflowId,
				]);
				if (execution && EXECUTION_FINISHED_STATUSES.includes(execution.status)) {
					errorText = this.getErrorMessage(execution);
					break;
				}
			} catch (error) {
				this.logger.debug(
					`Failed to fetch execution ${executionId} for error extraction: ${String(error)}`,
				);
			}

			retries++;

			if (maxRetries <= retries) {
				break;
			}

			// Wait with exponential backoff (double wait time, cap at 2 second)
			await sleep(Math.min(500 * Math.pow(2, retries), 2000));
		}

		return errorText;
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
				await this.sessionRepository.updateChatSession(sessionId, { title });
			}
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
			const { resolvedCredentials, resolvedModel, credentialId, projectId } =
				await this.resolveCredentialsAndModelForTitle(
					user,
					incomingModel,
					incomingCredentials,
					trx,
				);

			if (!credentialId || !projectId) {
				throw new BadRequestError('Could not determine credentials for title generation');
			}

			this.logger.debug(
				`Using credential ID ${credentialId} for title generation in project ${projectId}, model ${jsonStringify(resolvedModel)}`,
			);

			return await this.chatHubWorkflowService.createTitleGenerationWorkflow(
				user.id,
				sessionId,
				projectId,
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
		credentialId: string;
		projectId: string;
	}> {
		if (model.provider === 'n8n') {
			return await this.resolveFromN8nWorkflow(user, model, trx);
		}

		if (model.provider === 'custom-agent') {
			return await this.resolveFromCustomAgent(user, model, trx);
		}

		const credentialId = this.chatHubCredentialsService.findProviderCredential(
			model.provider,
			credentials,
		);

		const { id: projectId } = await this.chatHubCredentialsService.findPersonalProject(user, trx);

		return {
			resolvedCredentials: credentials,
			resolvedModel: model,
			credentialId,
			projectId,
		};
	}

	private async resolveFromN8nWorkflow(
		user: User,
		{ workflowId }: ChatHubN8nModel,
		trx: EntityManager,
	): Promise<{
		resolvedCredentials: INodeCredentials;
		resolvedModel: ChatHubConversationModel;
		credentialId: string;
		projectId: string;
	}> {
		const workflowEntity = await this.workflowFinderService.findWorkflowForUser(
			workflowId,
			user,
			['workflow:execute-chat'],
			{ includeTags: false, includeParentFolder: false, includeActiveVersion: true, em: trx },
		);

		if (!workflowEntity?.activeVersion) {
			throw new UserError('Workflow not found for title generation');
		}

		const modelNodes = this.findSupportedLLMNodes(workflowEntity.activeVersion.nodes);
		this.logger.debug(
			`Found ${modelNodes.length} LLM nodes in workflow ${workflowEntity.id} for title generation`,
		);

		if (modelNodes.length === 0) {
			throw new UserError('No supported Model nodes found in workflow for title generation');
		}

		const modelNode = modelNodes[0];
		const llmModel = (modelNode.node.parameters?.model as INodeParameters)?.value;
		if (!llmModel) {
			throw new UserError(
				`No model set on Model node "${modelNode.node.name}" for title generation`,
			);
		}

		if (typeof llmModel !== 'string' || llmModel.length === 0 || llmModel.startsWith('=')) {
			throw new UserError(
				`Invalid model set on Model node "${modelNode.node.name}" for title generation`,
			);
		}

		const llmCredentials = modelNode.node.credentials;
		if (!llmCredentials) {
			throw new UserError(
				`No credentials found on Model node "${modelNode.node.name}" for title generation`,
			);
		}

		const { credentialId, projectId } =
			await this.chatHubCredentialsService.findWorkflowCredentialAndProject(
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
				id: credentialId,
				name: '',
			},
		};

		return { resolvedCredentials, resolvedModel, credentialId, projectId };
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
		credentialId: string;
		projectId: string;
	}> {
		const agent = await this.chatHubAgentService.getAgentById(model.agentId, user.id, trx);
		if (!agent) {
			throw new BadRequestError('Agent not found for title generation');
		}

		if (!agent.credentialId) {
			throw new BadRequestError('Credentials not set for agent');
		}

		const resolvedModel: ChatHubConversationModel = {
			provider: agent.provider,
			model: agent.model,
		};

		const resolvedCredentials: INodeCredentials = {
			[PROVIDER_CREDENTIAL_TYPE_MAP[agent.provider]]: {
				id: agent.credentialId,
				name: '',
			},
		};

		const credentialId = this.chatHubCredentialsService.findProviderCredential(
			agent.provider,
			resolvedCredentials,
		);

		const { id: projectId } = await this.chatHubCredentialsService.findPersonalProject(user, trx);

		return { resolvedCredentials, resolvedModel, credentialId, projectId };
	}

	private async runTitleWorkflowAndGetTitle(
		user: User,
		workflowData: IWorkflowBase,
		executionData: IRunExecutionData,
	): Promise<string | null> {
		const { executionId } = await this.workflowExecutionService.executeChatWorkflow(
			user,
			workflowData,
			executionData,
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

	private async createChatSession(
		user: User,
		sessionId: ChatSessionId,
		model: ChatHubConversationModel,
		credentialId: string | null,
		tools: INode[],
		agentName?: string,
		trx?: EntityManager,
	) {
		await this.ensureValidModel(user, model, trx);

		return await this.sessionRepository.createChatSession(
			{
				id: sessionId,
				ownerId: user.id,
				title: 'New Chat',
				lastMessageAt: new Date(),
				agentName,
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

		return {
			session: this.convertSessionEntityToDto(session),
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
		await this.chatHubAttachmentService.deleteAll();
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
		if (updates.tools !== undefined) sessionUpdates.tools = updates.tools;

		return await this.sessionRepository.updateChatSession(sessionId, sessionUpdates);
	}

	/**
	 * Deletes a session
	 */
	async deleteSession(userId: string, sessionId: ChatSessionId) {
		await this.messageRepository.manager.transaction(async (trx) => {
			await this.ensureConversation(userId, sessionId, trx);
			await this.chatHubAttachmentService.deleteAllBySessionId(sessionId, trx);
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
			tools,
			attachments,
			timeZone,
		} = payload;
		const tz = timeZone ?? this.globalConfig.generic.timezone;

		const credentialId = this.getModelCredential(model, credentials);

		let processedAttachments: IBinaryData[] = [];
		let workflow: PreparedChatWorkflow;
		let previousMessage: ChatHubMessage | undefined;
		try {
			const result = await this.messageRepository.manager.transaction(async (trx) => {
				let session = await this.getChatSession(user, sessionId, trx);
				session ??= await this.createChatSession(
					user,
					sessionId,
					model,
					credentialId,
					tools,
					payload.agentName,
					trx,
				);

				const previousMessage = await this.ensurePreviousMessage(previousMessageId, sessionId, trx);
				const messages = Object.fromEntries((session.messages ?? []).map((m) => [m.id, m]));
				const history = this.buildMessageHistory(messages, previousMessageId);

				// Store attachments to populate 'id' field via BinaryDataService
				processedAttachments = await this.chatHubAttachmentService.store(
					sessionId,
					messageId,
					attachments,
				);

				await this.saveHumanMessage(
					payload,
					processedAttachments,
					user,
					previousMessageId,
					model,
					undefined,
					trx,
				);

				const replyWorkflow = await this.prepareReplyWorkflow(
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
					executionMetadata,
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

			void this.resumeChatExecution(
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
			workflow.workflowData,
			workflow.executionData,
			sessionId,
			messageId,
			null,
			workflow.responseMode,
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
			result = await this.messageRepository.manager.transaction(async (trx) => {
				const session = await this.getChatSession(user, sessionId, trx);
				if (!session) {
					throw new NotFoundError('Chat session not found');
				}

				const messageToEdit = await this.getChatMessage(session.id, editId, [], trx);

				if (messageToEdit.type === 'ai') {
					if (model.provider === 'n8n') {
						throw new BadRequestError(
							'Editing AI messages with n8n workflow agents is not supported',
						);
					}

					// AI edits just change the original message without revisioning or response generation
					await this.messageRepository.updateChatMessage(editId, { content: payload.message }, trx);
					return { workflow: null, combinedAttachments: [] };
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
							? await this.chatHubAttachmentService.store(
									sessionId,
									messageId,
									payload.newAttachments,
								)
							: [];

					const attachments = [...keptAttachments, ...newStoredAttachments];

					await this.saveHumanMessage(
						payload,
						attachments,
						user,
						messageToEdit.previousMessageId,
						model,
						revisionOfMessageId,
						trx,
					);

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
						executionMetadata,
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

		const { workflowData, executionData, responseMode } = result.workflow;

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
			workflowData,
			executionData,
			sessionId,
			messageId,
			null,
			responseMode,
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
					executionMetadata,
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
			workflow.workflowData,
			workflow.executionData,
			sessionId,
			previousMessageId,
			retryOfMessageId,
			workflow.responseMode,
			null,
			{},
			'',
			[],
		);
	}

	/**
	 * Execute a chat workflow with cleanup and streaming
	 */
	private async executeChatWorkflowWithCleanup(
		user: User,
		model: ChatHubConversationModel,
		workflowData: IWorkflowBase,
		executionData: IRunExecutionData,
		sessionId: ChatSessionId,
		previousMessageId: ChatMessageId,
		retryOfMessageId: ChatMessageId | null,
		responseMode: ChatTriggerResponseMode,
		originalPreviousMessageId: ChatMessageId | null,
		credentials: INodeCredentials,
		humanMessage: string,
		processedAttachments: IBinaryData[],
	) {
		try {
			const executionMode = model.provider === 'n8n' ? 'webhook' : 'chat';

			await this.executeChatWorkflow(
				user,
				model,
				workflowData,
				executionData,
				sessionId,
				previousMessageId,
				retryOfMessageId,
				executionMode,
				responseMode,
			);
		} catch (error) {
			this.logger.error(`Error in chat execution: ${error}`);

			const errorMessageId = uuidv4();
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';

			await this.saveAIMessage({
				id: errorMessageId,
				sessionId,
				previousMessageId,
				content: errorMessage,
				model,
				retryOfMessageId,
				status: 'error',
			});

			await this.chatStreamService.sendErrorDirect(
				user.id,
				sessionId,
				errorMessageId,
				errorMessage,
			);
			await this.chatStreamService.endExecution(user.id, sessionId, 'error');
		} finally {
			if (model.provider !== 'n8n') {
				await this.deleteChatWorkflow(workflowData.id);
			}
		}

		// Generate title for the session on receiving the first human message
		if (originalPreviousMessageId === null && humanMessage) {
			try {
				await this.generateSessionTitle(
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

	/**
	 * Execute a chat workflow
	 */
	private async executeChatWorkflow(
		user: User,
		model: ChatHubConversationModel,
		workflowData: IWorkflowBase,
		executionData: IRunExecutionData,
		sessionId: ChatSessionId,
		previousMessageId: ChatMessageId,
		retryOfMessageId: ChatMessageId | null,
		executionMode: WorkflowExecuteMode,
		responseMode: ChatTriggerResponseMode,
	) {
		this.logger.debug(
			`Starting execution of workflow "${workflowData.name}" with ID ${workflowData.id}`,
		);

		if (!SUPPORTED_RESPONSE_MODES.includes(responseMode)) {
			throw new BadRequestError(`Response mode "${responseMode}" is not supported yet.`);
		}

		if (responseMode === 'lastNode' || responseMode === 'responseNodes') {
			return await this.executeLastNode(
				user,
				model,
				workflowData,
				executionData,
				sessionId,
				previousMessageId,
				retryOfMessageId,
				executionMode,
				responseMode,
			);
		} else if (responseMode === 'streaming') {
			return await this.executeWithStreaming(
				user,
				model,
				workflowData,
				executionData,
				sessionId,
				previousMessageId,
				retryOfMessageId,
				executionMode,
			);
		}
	}

	/**
	 * Execute a workflow and wait for completion (for lastNode and responseNodes modes)
	 */
	private async executeLastNode(
		user: User,
		model: ChatHubConversationModel,
		workflowData: IWorkflowBase,
		executionData: IRunExecutionData,
		sessionId: string,
		previousMessageId: string,
		retryOfMessageId: string | null,
		executionMode: WorkflowExecuteMode,
		responseMode: NonStreamingResponseMode,
	) {
		const running = await this.workflowExecutionService.executeChatWorkflow(
			user,
			workflowData,
			executionData,
			undefined,
			false,
			executionMode,
		);

		const messageId = uuidv4();
		const executionId = running.executionId;

		if (!executionId) {
			throw new OperationalError('There was a problem starting the chat execution.');
		}

		// Start the execution via WebSocket
		await this.chatStreamService.startExecution(user.id, sessionId);

		// Save the AI message as running
		await this.saveAIMessage({
			id: messageId,
			content: '',
			sessionId,
			executionId,
			model,
			previousMessageId,
			retryOfMessageId,
			status: 'running',
		});

		// Send begin event via WebSocket
		await this.chatStreamService.startStream({
			userId: user.id,
			sessionId,
			messageId,
			previousMessageId,
			retryOfMessageId,
			executionId: parseInt(executionId, 10),
		});

		try {
			await this.waitForExecutionCompletion(executionId);
			const execution = await this.executionRepository.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			});
			if (!execution) {
				throw new OperationalError(
					'Chat execution not found after completion - make sure your instance is saving executions.',
				);
			}

			// Check for execution errors
			if (!['success', 'waiting', 'canceled'].includes(execution.status)) {
				const errorMessage = this.getErrorMessage(execution) ?? 'Failed to generate a response';
				throw new OperationalError(errorMessage);
			}

			const message = this.getMessageFromExecution(execution, responseMode);
			const status = execution?.status === 'waiting' ? 'waiting' : 'success';

			// Send the message content via WebSocket
			if (message) {
				await this.chatStreamService.sendChunk(sessionId, messageId, message);
			}

			// Update message in DB
			await this.messageRepository.updateChatMessage(messageId, {
				content: message ?? '',
				status,
			});

			// End the stream
			await this.chatStreamService.endStream(sessionId, messageId, status);

			// End the execution
			await this.chatStreamService.endExecution(
				user.id,
				sessionId,
				status === 'waiting' ? 'success' : status,
			);

			if (status === 'waiting' && responseMode === 'responseNodes') {
				const lastNode = getLastNodeExecuted(execution);
				if (lastNode && shouldResumeImmediately(lastNode)) {
					this.logger.debug(
						`Resuming execution ${execution.id} immediately after wait in node ${lastNode.name}`,
					);
					await this.resumeChatExecution(
						execution,
						'',
						sessionId,
						user,
						messageId,
						model,
						responseMode,
					);
				}
			}
		} catch (e: unknown) {
			if (e instanceof ManualExecutionCancelledError) {
				// When messages are cancelled they're already marked cancelled on `stopGeneration`
				await this.chatStreamService.endExecution(user.id, sessionId, 'cancelled');
				return;
			}

			const errorMessage =
				e instanceof Error ? e.message : 'Unknown error occurred during chat execution';

			// Update message with error
			await this.messageRepository.updateChatMessage(messageId, {
				content: errorMessage,
				status: 'error',
			});

			// Send error via WebSocket
			await this.chatStreamService.sendChunk(sessionId, messageId, errorMessage);
			await this.chatStreamService.endStream(sessionId, messageId, 'error');
			await this.chatStreamService.endExecution(user.id, sessionId, 'error');
		}
	}

	/**
	 * Resume a chat execution (for responseNodes mode when execution is waiting)
	 */
	private async resumeChatExecution(
		execution: IExecutionResponse,
		message: string,
		sessionId: ChatSessionId,
		user: User,
		previousMessageId: ChatMessageId,
		model: ChatHubConversationModel,
		responseMode: 'responseNodes',
	) {
		let currentExecution = execution;
		let currentMessage = message;
		let currentPreviousMessageId = previousMessageId;

		while (true) {
			await this.resumeExecution(sessionId, currentExecution, currentMessage);
			const messageId = uuidv4();

			// Start new stream for the resumed execution
			await this.chatStreamService.startExecution(user.id, sessionId);

			// Save the AI message as running
			await this.saveAIMessage({
				id: messageId,
				content: '',
				sessionId,
				executionId: currentExecution.id,
				model,
				previousMessageId: currentPreviousMessageId,
				retryOfMessageId: null,
				status: 'running',
			});

			await this.chatStreamService.startStream({
				userId: user.id,
				sessionId,
				messageId,
				previousMessageId: currentPreviousMessageId,
				retryOfMessageId: null,
				executionId: parseInt(currentExecution.id, 10),
			});

			await this.waitForExecutionCompletion(currentExecution.id);

			const completed = await this.executionRepository.findSingleExecution(currentExecution.id, {
				includeData: true,
				unflattenData: true,
			});

			if (!completed) {
				throw new OperationalError(
					'Chat execution not found after completion - make sure your instance is saving executions.',
				);
			}

			if (!['success', 'waiting', 'canceled'].includes(completed.status)) {
				const errorMessage = this.getErrorMessage(completed) ?? 'Failed to generate a response';
				throw new OperationalError(errorMessage);
			}

			const reply = this.getMessageFromExecution(completed, responseMode);
			const status = completed?.status === 'waiting' ? 'waiting' : 'success';

			// Send the message content via WebSocket
			if (reply) {
				await this.chatStreamService.sendChunk(sessionId, messageId, reply);
			}

			// Update message in DB
			await this.messageRepository.updateChatMessage(messageId, {
				content: reply ?? '',
				status,
			});

			// End the stream
			await this.chatStreamService.endStream(sessionId, messageId, status);
			await this.chatStreamService.endExecution(
				user.id,
				sessionId,
				status === 'waiting' ? 'success' : status,
			);

			const lastNode = getLastNodeExecuted(completed);
			if (status === 'waiting' && lastNode && shouldResumeImmediately(lastNode)) {
				// Resuming execution immediately, so mark the last message as successful
				this.logger.debug(
					`Resuming execution ${completed.id} immediately after wait in node ${lastNode.name}`,
				);
				await this.messageRepository.updateChatMessage(messageId, {
					status: 'success',
				});

				// There's no new human input
				currentMessage = '';
				currentExecution = completed;
				currentPreviousMessageId = messageId;
			} else {
				// Finished or waiting for user input
				return;
			}
		}
	}

	/**
	 * Returns the message from the last executed node
	 */
	private getMessageFromExecution(
		execution: IExecutionResponse,
		responseMode: ChatTriggerResponseMode,
	) {
		const nodeName = this.getLastNodeExecutedName(execution);
		if (!nodeName) return undefined;

		const outputs = this.getNodeOutputs(execution, nodeName);
		const entry = this.getFirstOutputEntry(outputs);
		if (!entry) return undefined;

		const message = this.extractMessageFromEntry(entry, responseMode);
		if (typeof message === 'object' && message !== null) {
			return jsonStringify(message);
		}

		return message;
	}

	private getLastNodeExecutedName(execution: IExecutionResponse): string | undefined {
		const lastNodeExecuted = execution.data.resultData.lastNodeExecuted;
		return typeof lastNodeExecuted === 'string' ? lastNodeExecuted : undefined;
	}

	private getNodeOutputs(execution: IExecutionResponse, nodeName: string) {
		const runData = execution.data.resultData.runData[nodeName];
		if (!runData || runData.length === 0) return [];
		const runIndex = runData.length - 1;
		const data = runData[runIndex]?.data;

		return data?.main ?? data?.[NodeConnectionTypes.AiTool] ?? [];
	}

	private getFirstOutputEntry(
		outputs: Array<INodeExecutionData[] | null>,
	): INodeExecutionData | undefined {
		for (const branch of outputs) {
			if (!Array.isArray(branch) || branch.length === 0) continue;

			return branch[0];
		}

		return undefined;
	}

	private extractMessageFromEntry(
		entry: INodeExecutionData,
		responseMode: ChatTriggerResponseMode,
	) {
		if (responseMode === 'responseNodes') {
			return entry.sendMessage ?? '';
		}

		if (responseMode === 'lastNode') {
			const response: Record<string, unknown> = entry.json ?? {};
			const message = response.output ?? response.text ?? response.message ?? '';
			return typeof message === 'string' ? message : jsonStringify(message);
		}

		return undefined;
	}

	/**
	 * Resume a paused execution with new input
	 */
	private async resumeExecution(
		sessionId: ChatSessionId,
		execution: IExecutionResponse,
		message: string,
	) {
		await this.executionManager.runWorkflow(execution, {
			action: 'sendMessage',
			chatInput: message,
			sessionId,
		});
	}

	/**
	 * Execute a workflow with streaming output
	 */
	private async executeWithStreaming(
		user: User,
		model: ChatHubConversationModel,
		workflowData: IWorkflowBase,
		executionData: IRunExecutionData,
		sessionId: string,
		previousMessageId: string,
		retryOfMessageId: string | null,
		executionMode: WorkflowExecuteMode,
	) {
		let executionId: string | undefined;
		let executionStatus: 'success' | 'error' | 'cancelled' = 'success';

		const workflowId = workflowData.id;

		// Start the execution (tracks state for the whole streaming session)
		await this.chatStreamService.startExecution(user.id, sessionId);

		// Create aggregator to handle multiple messages (e.g., tool calls followed by response)
		const aggregator = createStructuredChunkAggregator(previousMessageId, retryOfMessageId, {
			onBegin: async (message) => {
				// Save the AI message to DB
				await this.saveAIMessage({
					id: message.id,
					sessionId,
					previousMessageId: message.previousMessageId ?? previousMessageId,
					content: '',
					model,
					executionId,
					retryOfMessageId: message.retryOfMessageId,
					status: 'running',
				});

				// Start the stream for this message
				await this.chatStreamService.startStream({
					userId: user.id,
					sessionId,
					messageId: message.id,
					previousMessageId: message.previousMessageId,
					retryOfMessageId: message.retryOfMessageId,
					executionId: executionId ? parseInt(executionId, 10) : null,
				});
			},
			onItem: async (message, chunk) => {
				await this.chatStreamService.sendChunk(sessionId, message.id, chunk);
			},
			onEnd: async (message) => {
				// Update the message in the database
				await this.messageRepository.updateChatMessage(message.id, {
					content: message.content,
					status: message.status,
				});

				// End the stream for this message
				await this.chatStreamService.endStream(sessionId, message.id, message.status);
			},
			onError: async (message, errorText) => {
				let contentToSave = message.content;
				if (!contentToSave && errorText) {
					contentToSave = errorText;
				} else if (!contentToSave) {
					contentToSave = executionId
						? ((await this.waitForErrorDetails(executionId, workflowId)) ?? 'Unknown error')
						: 'Request was not processed';
				}

				await this.messageRepository.manager.transaction(async (trx) => {
					await this.messageRepository.updateChatMessage(
						message.id,
						{ content: contentToSave },
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
						executionStatus = 'cancelled';
						// End the stream with cancelled status
						await this.chatStreamService.endStream(sessionId, message.id, 'cancelled');
						return;
					}

					// Otherwise mark them as errored
					executionStatus = 'error';
					await this.messageRepository.updateChatMessage(message.id, { status: 'error' }, trx);

					await this.chatStreamService.sendError(sessionId, message.id, contentToSave);
					await this.chatStreamService.endStream(sessionId, message.id, 'error');
				});
			},
			onCancel: async (message) => {
				// Save content that was generated so far
				await this.messageRepository.updateChatMessage(message.id, {
					content: message.content,
					status: 'cancelled',
				});

				// End stream with cancelled status
				await this.chatStreamService.endStream(sessionId, message.id, 'cancelled');
			},
		});

		// Create a fake Response-like object that routes to ChatStreamService via aggregator
		const { adapter: streamAdapter, waitForPendingOperations } =
			this.createStreamAdapter(aggregator);

		try {
			const execution = await this.workflowExecutionService.executeChatWorkflow(
				user,
				workflowData,
				executionData,
				streamAdapter,
				true,
				executionMode,
			);

			executionId = execution.executionId;

			if (!executionId) {
				throw new OperationalError('There was a problem starting the chat execution.');
			}

			await this.waitForExecutionCompletion(executionId);

			// Wait for all pending aggregator operations to complete (message status updates, etc.)
			await waitForPendingOperations();
		} catch (error) {
			if (error instanceof ManualExecutionCancelledError) {
				executionStatus = 'cancelled';
				// On multi-main, the stream doesn't send an error chunk on cancellation,
				// so we need to explicitly cancel all active messages.
				// On single-main, the onError handler already handles this via the error chunk.
				if (this.instanceSettings.isMultiMain) {
					await aggregator.cancelAll();
				}
			} else {
				executionStatus = 'error';
				throw error;
			}
		} finally {
			// Wait for pending operations even on error to ensure proper cleanup
			await waitForPendingOperations();
			// End the execution (cleanup session state)
			await this.chatStreamService.endExecution(user.id, sessionId, executionStatus);
		}
	}

	/**
	 * Create a Response-like object that routes streaming data to ChatStreamService via aggregator
	 * Returns both the adapter and a function to wait for all pending operations to complete
	 */
	private createStreamAdapter(aggregator: ReturnType<typeof createStructuredChunkAggregator>): {
		adapter: Response;
		waitForPendingOperations: () => Promise<void>;
	} {
		// Chain for sequential processing of chunks to avoid race conditions
		// Each chunk must complete before the next one starts (e.g., 'begin' must finish
		// setting up the message before 'item' or 'end' tries to use it)
		let processingChain = Promise.resolve();

		// Create a minimal Response-like object
		const adapter = {
			headersSent: false,
			writableEnded: false,

			writeHead: (_statusCode: number, _headers?: Record<string, string>) => {
				adapter.headersSent = true;
				return adapter;
			},

			flushHeaders: () => {},

			write: (chunk: string | Buffer, _encoding?: BufferEncoding, doneCb?: () => void) => {
				const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk;

				// Process each line (JSONL format) through the aggregator
				const lines = text.split('\n').filter((line) => line.trim());
				for (const line of lines) {
					try {
						const parsed = jsonParse<StructuredChunk>(line.trim());
						// Chain the ingest calls to ensure sequential processing
						// This prevents race conditions where 'item' arrives before 'begin' finishes
						processingChain = processingChain.then(async () => {
							await aggregator.ingest(parsed);
						});
					} catch {
						// Not valid JSON, ignore
					}
				}

				if (doneCb) doneCb();
				return true;
			},

			end: (_chunk?: unknown, _encoding?: BufferEncoding, doneCb?: () => void) => {
				adapter.writableEnded = true;
				if (doneCb) doneCb();
				return adapter;
			},

			flush: () => {},

			on: (_event: string, _handler: (...args: unknown[]) => void) => adapter,
			once: (_event: string, _handler: (...args: unknown[]) => void) => adapter,
			emit: (_event: string, ..._args: unknown[]) => true,
		};

		const waitForPendingOperations = async () => {
			await processingChain;
		};

		return { adapter: adapter as unknown as Response, waitForPendingOperations };
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

	private convertSessionEntityToDto(session: ChatHubSession): ChatHubSessionDto {
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
			tools: session.tools,
		};
	}
}

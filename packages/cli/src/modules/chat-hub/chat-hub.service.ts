import {
	PROVIDER_CREDENTIAL_TYPE_MAP,
	type ChatHubProvider,
	type ChatModelsResponse,
	type ChatHubConversationsResponse,
	type ChatHubConversationResponse,
	chatHubProviderSchema,
	ChatHubMessageDto,
	type ChatMessageId,
	type ChatSessionId,
	ChatHubConversationModel,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	ExecutionRepository,
	IExecutionResponse,
	ProjectRepository,
	SharedWorkflow,
	SharedWorkflowRepository,
	User,
	WorkflowEntity,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { Response } from 'express';
import {
	AGENT_LANGCHAIN_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	OperationalError,
	type IConnections,
	type INode,
	type INodeCredentials,
	type INodeTypeNameVersion,
	type ITaskData,
	type IWorkflowBase,
	type IWorkflowExecuteAdditionalData,
	type StartNodeData,
} from 'n8n-workflow';
import { v4 as uuidv4 } from 'uuid';

import { ActiveExecutions } from '@/active-executions';
import { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { getBase } from '@/workflow-execute-additional-data';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

import { ChatHubMessage } from './chat-hub-message.entity';
import type {
	HumanMessagePayload,
	RegenerateMessagePayload,
	EditMessagePayload,
	MessageRecord,
	ModelWithCredentials,
} from './chat-hub.types';
import { ChatHubMessageRepository } from './chat-message.repository';
import { ChatHubSessionRepository } from './chat-session.repository';

const providerNodeTypeMapping: Record<ChatHubProvider, INodeTypeNameVersion> = {
	openai: {
		name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
		version: 1.2,
	},
	anthropic: {
		name: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
		version: 1.3,
	},
	google: {
		name: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
		version: 1.2,
	},
};

@Service()
export class ChatHubService {
	constructor(
		private readonly logger: Logger,
		private readonly credentialsService: CredentialsService,
		private readonly nodeParametersService: DynamicNodeParametersService,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowExecutionService: WorkflowExecutionService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly activeExecutions: ActiveExecutions,
		private readonly sessionRepository: ChatHubSessionRepository,
		private readonly messageRepository: ChatHubMessageRepository,
	) {}

	async getModels(
		user: User,
		credentialIds: Record<ChatHubProvider, string | null>,
	): Promise<ChatModelsResponse> {
		const additionalData = await getBase({ userId: user.id });

		const responses = await Promise.all(
			chatHubProviderSchema.options.map<
				Promise<[ChatHubProvider, ChatModelsResponse[ChatHubProvider]]>
			>(async (provider) => {
				const credentialId = credentialIds[provider];

				if (!credentialId) {
					return [provider, { models: [] }];
				}

				// Ensure the user has the permission to read the credential
				await this.credentialsService.getOne(user, credentialId, false);

				try {
					const credentials = {
						[PROVIDER_CREDENTIAL_TYPE_MAP[provider]]: { name: '', id: credentialId },
					};

					return [
						provider,
						await this.fetchModelsForProvider(provider, credentials, additionalData),
					];
				} catch {
					return [
						provider,
						{ models: [], error: 'Could not retrieve models. Verify credentials.' },
					];
				}
			}),
		);

		return responses.reduce<ChatModelsResponse>(
			(acc, [provider, res]) => {
				acc[provider] = res;
				return acc;
			},
			{
				openai: { models: [] },
				anthropic: { models: [] },
				google: { models: [] },
			},
		);
	}

	private async fetchModelsForProvider(
		provider: ChatHubProvider,
		credentials: INodeCredentials,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<ChatModelsResponse[ChatHubProvider]> {
		switch (provider) {
			case 'openai':
				return await this.fetchOpenAiModels(credentials, additionalData);
			case 'anthropic':
				return await this.fetchAnthropicModels(credentials, additionalData);
			case 'google':
				return await this.fetchGoogleModels(credentials, additionalData);
		}
	}

	private async fetchOpenAiModels(
		credentials: INodeCredentials,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<ChatModelsResponse[ChatHubProvider]> {
		const resourceLocatorResults = await this.nodeParametersService.getResourceLocatorResults(
			'searchModels',
			'parameters.model',
			additionalData,
			providerNodeTypeMapping.openai,
			{},
			credentials,
		);

		return {
			models: resourceLocatorResults.results.map((result) => ({ name: String(result.value) })),
		};
	}

	private async fetchAnthropicModels(
		credentials: INodeCredentials,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<ChatModelsResponse[ChatHubProvider]> {
		const resourceLocatorResults = await this.nodeParametersService.getResourceLocatorResults(
			'searchModels',
			'parameters.model',
			additionalData,
			providerNodeTypeMapping.anthropic,
			{},
			credentials,
		);

		return {
			models: resourceLocatorResults.results.map((result) => ({ name: String(result.value) })),
		};
	}

	private async fetchGoogleModels(
		credentials: INodeCredentials,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<ChatModelsResponse[ChatHubProvider]> {
		const results = await this.nodeParametersService.getOptionsViaLoadOptions(
			{
				// From Gemini node
				// https://github.com/n8n-io/n8n/blob/master/packages/%40n8n/nodes-langchain/nodes/llms/LmChatGoogleGemini/LmChatGoogleGemini.node.ts#L75
				routing: {
					request: {
						method: 'GET',
						url: '/v1beta/models',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'models',
								},
							},
							{
								type: 'filter',
								properties: {
									pass: "={{ !$responseItem.name.includes('embedding') }}",
								},
							},
							{
								type: 'setKeyValue',
								properties: {
									name: '={{$responseItem.name}}',
									value: '={{$responseItem.name}}',
									description: '={{$responseItem.description}}',
								},
							},
							{
								type: 'sort',
								properties: {
									key: 'name',
								},
							},
						],
					},
				},
			},
			additionalData,
			providerNodeTypeMapping.google,
			{},
			credentials,
		);

		return {
			models: results.map((result) => ({ name: String(result.value) })),
		};
	}

	private async createChatWorkflow(
		user: User,
		sessionId: ChatSessionId,
		history: ChatHubMessage[],
		humanMessage: string,
		credentials: INodeCredentials,
		model: ChatHubConversationModel,
	): Promise<{
		workflowData: IWorkflowBase;
		startNodes: StartNodeData[];
		triggerToStartFrom: { name: string; data: ITaskData };
	}> {
		const { nodes, connections, startNodes, triggerToStartFrom } = this.prepareChatWorkflow(
			history,
			humanMessage,
			credentials,
			model,
		);

		const { manager } = this.projectRepository;
		const existing = await this.workflowRepository.findOneBy({ id: sessionId });
		if (existing) {
			return {
				workflowData: {
					...existing,
					nodes,
					connections,
					versionId: uuidv4(),
				},
				startNodes,
				triggerToStartFrom,
			};
		}

		return await manager.transaction(async (trx) => {
			const project = await this.projectRepository.getPersonalProjectForUser(user.id, trx);
			if (!project) {
				throw new NotFoundError('Could not find a personal project for this user');
			}

			const newWorkflow = new WorkflowEntity();
			newWorkflow.versionId = uuidv4();
			newWorkflow.id = sessionId;
			newWorkflow.name = `Chat ${sessionId}`;
			newWorkflow.active = false;
			newWorkflow.nodes = nodes;
			newWorkflow.connections = connections;

			const workflow = await trx.save<WorkflowEntity>(newWorkflow);

			await trx.save<SharedWorkflow>(
				this.sharedWorkflowRepository.create({
					role: 'workflow:owner',
					projectId: project.id,
					workflow,
				}),
			);

			return {
				workflowData: {
					...workflow,
					nodes,
					connections,
					versionId: uuidv4(),
				},
				startNodes,
				triggerToStartFrom,
			};
		});
	}

	private getMessage(execution: IExecutionResponse): string | undefined {
		const lastNodeExecuted = execution.data.resultData.lastNodeExecuted;
		if (typeof lastNodeExecuted !== 'string') return undefined;

		const runIndex = execution.data.resultData.runData[lastNodeExecuted].length - 1;
		const mainOutputs = execution.data.resultData.runData[lastNodeExecuted][runIndex]?.data?.main;

		// Check all main output branches for a message
		if (mainOutputs && Array.isArray(mainOutputs)) {
			for (const branch of mainOutputs) {
				if (branch && Array.isArray(branch) && branch.length > 0 && branch[0].json?.output) {
					return branch[0].json.output as string;
				}
			}
		}

		return undefined;
	}

	private getCredentialId(provider: ChatHubProvider, credentials: INodeCredentials): string | null {
		return credentials[PROVIDER_CREDENTIAL_TYPE_MAP[provider]]?.id ?? null;
	}

	async sendHumanMessage(res: Response, user: User, payload: HumanMessagePayload) {
		const { sessionId, messageId, replyId, message } = payload;
		const selectedModel: ModelWithCredentials = {
			...payload.model,
			credentialId: this.getCredentialId(payload.model.provider, payload.credentials),
		};

		const session = await this.getChatSession(user, sessionId, selectedModel, true, message);

		const turnId = messageId;
		await this.saveHumanMessage(payload, user, turnId, payload.previousMessageId, selectedModel);

		const history = session.messages ?? [];

		const workflow = await this.createChatWorkflow(
			user,
			session.id,
			history,
			message,
			payload.credentials,
			payload.model,
		);

		await this.executeChatWorkflow(
			res,
			user,
			workflow,
			replyId,
			sessionId,
			messageId,
			turnId,
			selectedModel,
		);
	}

	async editHumanMessage(res: Response, user: User, payload: EditMessagePayload) {
		const { sessionId, editId, messageId, message, replyId } = payload;

		const selectedModel: ModelWithCredentials = {
			...payload.model,
			credentialId: this.getCredentialId(payload.model.provider, payload.credentials),
		};

		const session = await this.getChatSession(user, sessionId, selectedModel);
		const messages = session.messages ?? [];
		const messageToEdit = await this.getChatMessage(session.id, editId);

		if (messageToEdit.type !== 'human') {
			throw new BadRequestError('Can only edit human messages');
		}

		const historyIds = messageToEdit.previousMessageId
			? this.buildActiveMessageChain(messages, messageToEdit.previousMessageId)
			: [];

		const history = historyIds.flatMap((id) => {
			return messages.find((m) => m.id === id) ?? [];
		});

		// If the message to edit isn't the original message, we want to point to the original message
		const revisionOfMessageId = messageToEdit.revisionOfMessageId ?? messageToEdit.id;
		const otherRuns = messages.filter((m) => m.revisionOfMessageId === revisionOfMessageId);
		const runIndex = otherRuns.length + 1;

		await this.messageRepository.updateChatMessage(revisionOfMessageId, { state: 'replaced' });
		for (const run of otherRuns) {
			if (run.state === 'active') {
				await this.messageRepository.updateChatMessage(run.id, { state: 'replaced' });
			}
		}

		const turnId = payload.messageId;
		await this.saveHumanMessage(
			payload,
			user,
			turnId,
			messageToEdit.previousMessageId,
			selectedModel,
			revisionOfMessageId,
			runIndex,
		);

		const workflow = await this.createChatWorkflow(
			user,
			session.id,
			history,
			message,
			payload.credentials,
			payload.model,
		);

		await this.executeChatWorkflow(
			res,
			user,
			workflow,
			replyId,
			sessionId,
			messageId,
			turnId,
			selectedModel,
		);
	}

	async regenerateAiMessage(res: Response, user: User, payload: RegenerateMessagePayload) {
		const { sessionId, retryId, replyId } = payload;

		const selectedModel: ModelWithCredentials = {
			...payload.model,
			credentialId: this.getCredentialId(payload.model.provider, payload.credentials),
		};

		const session = await this.getChatSession(user, sessionId, selectedModel);
		const messages = session.messages ?? [];
		const messageToRetry = await this.getChatMessage(session.id, retryId);

		if (messageToRetry.type !== 'ai') {
			throw new BadRequestError('Can only retry AI messages');
		}

		const historyIds = messageToRetry.previousMessageId
			? this.buildActiveMessageChain(messages, messageToRetry.previousMessageId)
			: [];

		const history = historyIds.flatMap((id) => {
			return messages.find((m) => m.id === id) ?? [];
		});

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
		const workflow = await this.createChatWorkflow(
			user,
			session.id,
			history,
			lastHumanMessage ? lastHumanMessage.content : '',
			payload.credentials,
			payload.model,
		);

		// If the message being retried is itself a retry, we want to point to the original message
		const retryOfMessageId = messageToRetry.retryOfMessageId ?? messageToRetry.id;
		const otherRuns = messages.filter((m) => m.retryOfMessageId === retryOfMessageId);
		const runIndex = otherRuns.length + 1;

		await this.messageRepository.updateChatMessage(retryOfMessageId, { state: 'replaced' });
		for (const run of otherRuns) {
			if (run.state === 'active') {
				await this.messageRepository.updateChatMessage(run.id, { state: 'replaced' });
			}
		}

		await this.executeChatWorkflow(
			res,
			user,
			workflow,
			replyId,
			sessionId,
			lastHumanMessage.id,
			messageToRetry.turnId,
			selectedModel,
			retryOfMessageId,
			runIndex,
		);
	}

	private async executeChatWorkflow(
		res: Response,
		user: User,
		workflow: {
			workflowData: IWorkflowBase;
			startNodes: StartNodeData[];
			triggerToStartFrom: { name: string; data?: ITaskData };
		},
		replyId: ChatMessageId,
		sessionId: ChatSessionId,
		previousMessageId: ChatMessageId,
		turnId: ChatMessageId,
		selectedModel: ModelWithCredentials,
		retryOfMessageId?: ChatMessageId,
		runIndex?: number,
	) {
		const { workflowData, startNodes, triggerToStartFrom } = workflow;

		this.logger.debug(
			`Starting execution of workflow "${workflowData.name}" with ID ${workflowData.id}`,
		);

		const { executionId } = await this.workflowExecutionService.executeManually(
			{
				workflowData,
				startNodes,
				triggerToStartFrom,
			},
			user,
			undefined,
			true,
			res,
		);
		if (!executionId) {
			throw new OperationalError('There was a problem starting the chat execution.');
		}

		const result = await this.activeExecutions.getPostExecutePromise(executionId);
		if (!result) {
			throw new OperationalError('There was a problem executing the chat workflow.');
		}

		const execution = await this.executionRepository.findWithUnflattenedData(executionId, [
			workflowData.id,
		]);
		if (!execution) {
			throw new NotFoundError(`Could not find execution with ID ${executionId}`);
		}
		const message = this.getMessage(execution);

		if (message) {
			await this.saveAiMessage(
				replyId,
				sessionId,
				turnId,
				execution.id,
				previousMessageId,
				message,
				selectedModel,
				retryOfMessageId,
				runIndex,
			);
		}
	}

	private prepareChatWorkflow(
		history: ChatHubMessage[],
		humanMessage: string,
		credentials: INodeCredentials,
		model: ChatHubConversationModel,
	) {
		/* eslint-disable @typescript-eslint/naming-convention */
		const nodes: INode[] = [
			{
				parameters: {
					public: true,
					mode: 'webhook',
					options: { responseMode: 'streaming' },
				},
				type: CHAT_TRIGGER_NODE_TYPE,
				typeVersion: 1.3,
				position: [0, 0],
				id: uuidv4(),
				name: 'When chat message received',
				webhookId: uuidv4(),
			},
			{
				parameters: {
					promptType: 'define',
					text: "={{ $('When chat message received').item.json.chatInput }}",
					options: {
						enableStreaming: true,
					},
				},
				type: AGENT_LANGCHAIN_NODE_TYPE,
				typeVersion: 3,
				position: [600, 0],
				id: uuidv4(),
				name: 'AI Agent',
			},
			this.createModelNode(credentials, model),
			{
				parameters: {
					sessionIdType: 'customKey',
					sessionKey: "={{ $('When chat message received').item.json.sessionId }}",
				},
				type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
				typeVersion: 1.3,
				position: [500, 200],
				id: uuidv4(),
				name: 'Memory',
			},
			{
				parameters: {
					mode: 'insert',
					messages: {
						messageValues: history.map((message) => {
							const typeMap: Record<string, MessageRecord['type']> = {
								human: 'user',
								ai: 'ai',
								system: 'system',
							};

							// TODO: Tools ?
							return {
								type: typeMap[message.type] || 'system',
								message: message.content,
								hideFromUI: false,
							};
						}),
					},
				},
				type: '@n8n/n8n-nodes-langchain.memoryManager',
				typeVersion: 1.1,
				position: [200, 0],
				id: uuidv4(),
				name: 'Restore Chat Memory',
			},
		];

		const connections: IConnections = {
			'When chat message received': {
				main: [[{ node: 'Restore Chat Memory', type: 'main', index: 0 }]],
			},
			'Restore Chat Memory': {
				main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
			},
			'Chat Model': {
				ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
			},
			Memory: {
				ai_memory: [
					[
						{ node: 'AI Agent', type: 'ai_memory', index: 0 },
						{ node: 'Restore Chat Memory', type: 'ai_memory', index: 0 },
					],
				],
			},
		};

		const startNodes: StartNodeData[] = [{ name: 'Restore Chat Memory', sourceData: null }];
		const triggerToStartFrom: {
			name: string;
			data: ITaskData;
		} = {
			name: 'When chat message received',
			data: {
				startTime: Date.now(),
				executionTime: 0,
				executionIndex: 0,
				executionStatus: 'success',
				data: {
					main: [
						[
							{
								json: {
									// TODO: Instead of initializing more and more memory sessions,
									// load the previous messages from DB and replace the current session with this.
									// Currently this is just leaking memory, but that shouldn't be a big deal as in memory sessions are short-lived.
									sessionId: crypto.randomUUID(),
									action: 'sendMessage',
									chatInput: humanMessage,
								},
							},
						],
					],
				},
				source: [null],
			},
		};
		/* eslint-enable @typescript-eslint/naming-convention */

		return { nodes, connections, startNodes, triggerToStartFrom };
	}

	private async saveHumanMessage(
		payload: HumanMessagePayload | EditMessagePayload,
		user: User,
		turnId: string,
		previousMessageId: ChatMessageId | null,
		selectedModel: ModelWithCredentials,
		revisionOfMessageId?: ChatMessageId,
		runIndex?: number,
	) {
		await this.messageRepository.createChatMessage({
			id: payload.messageId,
			sessionId: payload.sessionId,
			type: 'human',
			name: user.firstName || 'User',
			state: 'active',
			content: payload.message,
			turnId,
			previousMessageId,
			revisionOfMessageId,
			runIndex,
			...selectedModel,
		});
	}

	private async saveAiMessage(
		id: ChatMessageId,
		sessionId: ChatSessionId,
		turnId: ChatMessageId,
		executionId: string,
		previousMessageId: ChatMessageId,
		message: string,
		selectedModel: ModelWithCredentials,
		retryOfMessageId?: ChatMessageId,
		runIndex?: number,
	) {
		await this.messageRepository.createChatMessage({
			id,
			sessionId,
			turnId,
			previousMessageId,
			executionId: parseInt(executionId, 10),
			type: 'ai',
			name: 'AI',
			state: 'active',
			content: message,
			retryOfMessageId,
			runIndex,
			...selectedModel,
		});
	}

	private async getChatSession(
		user: User,
		sessionId: ChatSessionId,
		selectedModel: ModelWithCredentials,
		initialize: boolean = false,
		title: string | null = null,
	) {
		// TODO: Handle session ID conflicts better (different user, same ID)

		const existing = await this.sessionRepository.getOneById(sessionId, user.id);
		if (existing) {
			return existing;
		} else if (!initialize) {
			throw new NotFoundError('Chat session not found');
		}

		return await this.sessionRepository.createChatSession({
			id: sessionId,
			ownerId: user.id,
			title: title ?? 'New Chat',
			...selectedModel,
		});
	}

	private async getChatMessage(sessionId: ChatSessionId, messageId: ChatMessageId) {
		const message = await this.messageRepository.getOneById(messageId, sessionId);
		if (!message) {
			throw new NotFoundError('Chat message not found');
		}
		return message;
	}

	private createModelNode(
		credentials: INodeCredentials,
		{ provider, model }: ChatHubConversationModel,
	): INode {
		const common = {
			position: [600, 200] as [number, number],
			id: uuidv4(),
			name: 'Chat Model',
			credentials,
			type: providerNodeTypeMapping[provider].name,
			typeVersion: providerNodeTypeMapping[provider].version,
		};

		switch (provider) {
			case 'openai':
				return {
					...common,
					parameters: {
						model: { __rl: true, mode: 'list', value: model },
						options: {},
					},
				};
			case 'anthropic':
				return {
					...common,
					parameters: {
						model: {
							__rl: true,
							mode: 'list',
							value: model,
							cachedResultName: model,
						},
						options: {},
					},
				};
			case 'google':
				return {
					...common,
					parameters: {
						model: { __rl: true, mode: 'list', value: model },
						options: {},
					},
				};
		}
	}

	/**
	 * Get all conversations for a user
	 */
	async getConversations(userId: string): Promise<ChatHubConversationsResponse> {
		const sessions = await this.sessionRepository.getManyByUserId(userId);

		return sessions.map((session) => ({
			id: session.id,
			title: session.title,
			ownerId: session.ownerId,
			lastMessageAt: session.lastMessageAt?.toISOString() ?? null,
			credentialId: session.credentialId,
			provider: session.provider,
			model: session.model,
			workflowId: session.workflowId,
			createdAt: session.createdAt.toISOString(),
			updatedAt: session.updatedAt.toISOString(),
		}));
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
		const messagesGraph: Record<ChatMessageId, ChatHubMessageDto> = Object.fromEntries(
			messages.map((m) => [m.id, this.convertMessageToDto(m)]),
		);

		const rootIds = messages.filter((r) => r.previousMessageId === null).map((r) => r.id);
		const activeMessages = messages.filter((m) => m.state === 'active');
		const latest = activeMessages[activeMessages.length - 1]; // Messages are sorted by createdAt

		const activeMessageChain = latest ? this.buildActiveMessageChain(messages, latest.id) : [];

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
				createdAt: session.createdAt.toISOString(),
				updatedAt: session.updatedAt.toISOString(),
			},
			conversation: {
				messages: messagesGraph,
				rootIds,
				activeMessageChain,
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
			executionId: message.executionId,
			state: message.state,
			createdAt: message.createdAt.toISOString(),
			updatedAt: message.updatedAt.toISOString(),

			previousMessageId: message.previousMessageId,
			turnId: message.turnId,
			retryOfMessageId: message.retryOfMessageId,
			revisionOfMessageId: message.revisionOfMessageId,
			runIndex: message.runIndex,
		};
	}

	/**
	 * Build the active message chain ending to the message with ID `lastMessageId`
	 */
	private buildActiveMessageChain(messages: ChatHubMessage[], lastMessageId: ChatMessageId) {
		const nodes = new Map(messages.map((m) => [m.id, m]));

		const visited = new Set<string>();
		const activeMessageChain = [];

		let current: ChatMessageId | null = lastMessageId;

		while (current && !visited.has(current)) {
			activeMessageChain.unshift(current);
			visited.add(current);
			current = nodes.get(current)?.previousMessageId ?? null;
		}

		return activeMessageChain;
	}

	async deleteAllSessions() {
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
	 * Deletes a session
	 */
	async deleteSession(userId: string, sessionId: ChatSessionId) {
		const session = await this.sessionRepository.getOneById(sessionId, userId);

		if (!session) {
			throw new NotFoundError('Session not found');
		}

		await this.sessionRepository.deleteChatHubSession(sessionId);
	}
}

import {
	PROVIDER_CREDENTIAL_TYPE_MAP,
	type ChatHubProvider,
	type ChatHubLLMProvider,
	type ChatModelsResponse,
	type ChatHubConversationsResponse,
	type ChatHubConversationResponse,
	ChatHubMessageDto,
	type ChatMessageId,
	type ChatSessionId,
	ChatHubConversationModel,
	ChatHubMessageStatus,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	ExecutionRepository,
	IExecutionResponse,
	SharedWorkflow,
	SharedWorkflowRepository,
	User,
	withTransaction,
	WorkflowEntity,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import type { Response } from 'express';
import {
	AGENT_LANGCHAIN_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	NodeConnectionTypes,
	OperationalError,
	ManualExecutionCancelledError,
	type IConnections,
	type INode,
	type INodeCredentials,
	type INodeTypeNameVersion,
	type ITaskData,
	type IWorkflowBase,
	type IWorkflowExecuteAdditionalData,
	type IRun,
	jsonParse,
	StructuredChunk,
	RESPOND_TO_CHAT_NODE_TYPE,
} from 'n8n-workflow';
import { v4 as uuidv4 } from 'uuid';

import { ActiveExecutions } from '@/active-executions';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ExecutionService } from '@/executions/execution.service';
import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { getBase } from '@/workflow-execute-additional-data';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

import type { ChatHubMessage } from './chat-hub-message.entity';
import { CONVERSATION_TITLE_GENERATION_PROMPT } from './chat-hub.constants';
import type {
	HumanMessagePayload,
	RegenerateMessagePayload,
	EditMessagePayload,
	MessageRecord,
	ModelWithCredentials,
} from './chat-hub.types';
import { ChatHubMessageRepository } from './chat-message.repository';
import { ChatHubSessionRepository } from './chat-session.repository';
import { getMaxContextWindowTokens } from './context-limits';
import { captureResponseWrites } from './stream-capturer';

const providerNodeTypeMapping: Record<ChatHubLLMProvider, INodeTypeNameVersion> = {
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

const NODE_NAMES = {
	CHAT_TRIGGER: 'When chat message received',
	REPLY_AGENT: 'AI Agent',
	TITLE_GENERATOR_AGENT: 'Title Generator Agent',
	CHAT_MODEL: 'Chat Model',
	MEMORY: 'Memory',
	RESTORE_CHAT_MEMORY: 'Restore Chat Memory',
	CLEAR_CHAT_MEMORY: 'Clear Chat Memory',
} as const;

/* eslint-disable @typescript-eslint/naming-convention */
const JSONL_STREAM_HEADERS = {
	'Content-Type': 'application/json-lines; charset=utf-8',
	'Transfer-Encoding': 'chunked',
	'Cache-Control': 'no-cache',
	Connection: 'keep-alive',
};
/* eslint-enable @typescript-eslint/naming-convention */

@Service()
export class ChatHubService {
	constructor(
		private readonly logger: Logger,
		private readonly executionService: ExecutionService,
		private readonly nodeParametersService: DynamicNodeParametersService,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowExecutionService: WorkflowExecutionService,
		private readonly workflowService: WorkflowService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly activeExecutions: ActiveExecutions,
		private readonly sessionRepository: ChatHubSessionRepository,
		private readonly messageRepository: ChatHubMessageRepository,
		private readonly credentialsFinderService: CredentialsFinderService,
	) {}

	async getModels(
		user: User,
		credentialIds: Record<ChatHubLLMProvider, string | null>,
	): Promise<ChatModelsResponse> {
		const additionalData = await getBase({ userId: user.id });
		// The n8n provider is disabled for now.
		// const providers = chatHubProviderSchema.options;
		const providers = ['openai', 'anthropic', 'google'] as ChatHubLLMProvider[];

		const allCredentials = await this.credentialsFinderService.findCredentialsForUser(user, [
			'credential:read',
		]);

		const responses = await Promise.all(
			providers.map<Promise<[ChatHubProvider, ChatModelsResponse[ChatHubProvider]]>>(
				async (provider: ChatHubProvider) => {
					const credentials: INodeCredentials = {};

					if (provider !== 'n8n') {
						const credentialId = credentialIds[provider];
						if (!credentialId) {
							return [provider, { models: [] }];
						}

						// Ensure the user has the permission to read the credential
						if (!allCredentials.some((credential) => credential.id === credentialId)) {
							return [
								provider,
								{ models: [], error: 'Could not retrieve models. Verify credentials.' },
							];
						}

						credentials[PROVIDER_CREDENTIAL_TYPE_MAP[provider]] = { name: '', id: credentialId };
					}

					try {
						return [
							provider,
							await this.fetchModelsForProvider(user, provider, credentials, additionalData),
						];
					} catch {
						return [
							provider,
							{ models: [], error: 'Could not retrieve models. Verify credentials.' },
						];
					}
				},
			),
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
				n8n: { models: [] },
			},
		);
	}

	private async fetchModelsForProvider(
		user: User,
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
			case 'n8n':
				return await this.fetchCustomAgentWorkflows(user);
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
			models: resourceLocatorResults.results.map((result) => ({
				provider: 'openai',
				name: String(result.value),
				model: String(result.value),
			})),
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
			models: resourceLocatorResults.results.map((result) => ({
				provider: 'anthropic',
				name: String(result.value),
				model: String(result.value),
			})),
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
			models: results.map((result) => ({
				provider: 'google',
				name: String(result.value),
				model: String(result.value),
			})),
		};
	}

	private async fetchCustomAgentWorkflows(
		user: User,
	): Promise<ChatModelsResponse[ChatHubProvider]> {
		const nodeTypes = [CHAT_TRIGGER_NODE_TYPE];
		const workflows = await this.workflowService.getWorkflowsWithNodesIncluded(user, nodeTypes);

		return {
			models: workflows
				.filter((workflow) => workflow.active)
				.map((workflow) => ({
					provider: 'n8n',
					name: workflow.name ?? 'Unnamed workflow',
					workflowId: workflow.id,
				})),
		};
	}

	private async createChatWorkflow(
		sessionId: ChatSessionId,
		projectId: string,
		history: ChatHubMessage[],
		humanMessage: string,
		credentials: INodeCredentials,
		model: ChatHubConversationModel,
		generateConversationTitle: boolean,
		trx?: EntityManager,
	): Promise<{
		workflowData: IWorkflowBase;
		triggerToStartFrom: { name: string; data: ITaskData };
	}> {
		return await withTransaction(this.workflowRepository.manager, trx, async (em) => {
			const { nodes, connections, triggerToStartFrom } = this.prepareChatWorkflow({
				sessionId,
				history,
				humanMessage,
				credentials,
				model,
				generateConversationTitle,
			});

			const newWorkflow = new WorkflowEntity();
			newWorkflow.versionId = uuidv4();
			newWorkflow.name = `Chat ${sessionId}`;
			newWorkflow.active = false;
			newWorkflow.nodes = nodes;
			newWorkflow.connections = connections;

			const workflow = await em.save<WorkflowEntity>(newWorkflow);

			await em.save<SharedWorkflow>(
				this.sharedWorkflowRepository.create({
					role: 'workflow:owner',
					projectId,
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
				triggerToStartFrom,
			};
		});
	}

	private async ensureCredentials(
		user: User,
		model: ChatHubConversationModel,
		credentials: INodeCredentials,
		trx?: EntityManager,
	) {
		const allCredentials = await this.credentialsFinderService.findAllCredentialsForUser(
			user,
			['credential:read'],
			trx,
		);

		const credentialId = this.pickCredentialId(model.provider, credentials);
		if (!credentialId) {
			throw new BadRequestError('No credentials provided for the selected model provider');
		}

		// If credential is shared through multiple projects just pick the first one.
		const credential = allCredentials.find((c) => c.id === credentialId);
		if (!credential) {
			throw new ForbiddenError("You don't have access to the provided credentials");
		}
		return credential;
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
		if (provider === 'n8n') {
			return null;
		}

		return credentials[PROVIDER_CREDENTIAL_TYPE_MAP[provider]]?.id ?? null;
	}

	async sendHumanMessage(res: Response, user: User, payload: HumanMessagePayload) {
		const { sessionId, messageId, replyId, message } = payload;
		const provider = payload.model.provider;

		const selectedModel: ModelWithCredentials = {
			...payload.model,
			credentialId:
				provider !== 'n8n' ? this.pickCredentialId(provider, payload.credentials) : null,
		};

		const workflow = await this.messageRepository.manager.transaction(async (trx) => {
			const session = await this.getChatSession(user, sessionId, selectedModel, true, trx);
			await this.ensurePreviousMessage(payload.previousMessageId, sessionId, trx);
			const messages = Object.fromEntries((session.messages ?? []).map((m) => [m.id, m]));
			const history = this.buildMessageHistory(messages, payload.previousMessageId);

			await this.saveHumanMessage(
				payload,
				user,
				payload.previousMessageId,
				selectedModel,
				undefined,
				trx,
			);

			if (provider !== 'n8n') {
				return await this.prepareBaseChatWorkflow(user, payload, sessionId, history, message, trx);
			}

			return await this.prepareCustomAgentWorkflow(
				user,
				sessionId,
				payload.model.workflowId,
				message,
			);
		});

		try {
			await this.executeChatWorkflow(
				res,
				user,
				workflow,
				replyId,
				sessionId,
				messageId,
				selectedModel,
			);
		} finally {
			if (provider !== 'n8n') {
				await this.deleteChatWorkflow(workflow.workflowData.id);
			}
		}
	}

	private async prepareBaseChatWorkflow(
		user: User,
		payload: HumanMessagePayload,
		sessionId: ChatSessionId,
		history: ChatHubMessage[],
		message: string,
		trx: EntityManager,
	) {
		const credential = await this.ensureCredentials(user, payload.model, payload.credentials, trx);

		return await this.createChatWorkflow(
			sessionId,
			credential.projectId,
			history,
			message,
			payload.credentials,
			payload.model,
			payload.previousMessageId === null, // generate title on receiving the first human message only
			trx,
		);
	}

	private async prepareCustomAgentWorkflow(
		user: User,
		sessionId: ChatSessionId,
		workflowId: string,
		message: string,
	) {
		const workflowEntity = await this.workflowFinderService.findWorkflowForUser(
			workflowId,
			user,
			['workflow:read'],
			{ includeTags: false, includeParentFolder: false },
		);

		if (!workflowEntity) {
			throw new BadRequestError('Workflow not found');
		}

		const chatTriggers = workflowEntity.nodes.filter(
			(node) => node.type === CHAT_TRIGGER_NODE_TYPE,
		);

		if (chatTriggers.length !== 1) {
			throw new BadRequestError('Workflow must have exactly one chat trigger');
		}

		const chatResponseNodes = workflowEntity.nodes.filter(
			(node) => node.type === RESPOND_TO_CHAT_NODE_TYPE,
		);

		if (chatResponseNodes.length > 0) {
			throw new BadRequestError(
				'Respond to Chat nodes are not supported in custom agent workflows',
			);
		}

		const agents = workflowEntity.nodes.filter((node) => node.type === AGENT_LANGCHAIN_NODE_TYPE);
		if (agents.length !== 1) {
			throw new BadRequestError('Workflow must have exactly one AI Agent node');
		}

		return {
			workflowData: {
				...workflowEntity,
				// Since this mechanism executes workflows as manual one-off executions
				// we need to clear any pinData the WF might have.
				// TODO: Implement a separate execution mode for chats to avoid such workarounds.
				pinData: {},
			},
			triggerToStartFrom: {
				name: chatTriggers[0].name,
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
										sessionId,
										action: 'sendMessage',
										chatInput: message,
									},
								},
							],
						],
					},
					source: [null],
				} satisfies ITaskData,
			},
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

	async editMessage(res: Response, user: User, payload: EditMessagePayload) {
		const { sessionId, editId, messageId, replyId } = payload;
		const selectedModel: ModelWithCredentials = {
			...payload.model,
			credentialId:
				payload.model.provider !== 'n8n'
					? this.pickCredentialId(payload.model.provider, payload.credentials)
					: null,
		};

		const workflow = await this.messageRepository.manager.transaction(async (trx) => {
			const credential = await this.ensureCredentials(
				user,
				payload.model,
				payload.credentials,
				trx,
			);
			const session = await this.getChatSession(user, sessionId, undefined, false, trx);
			const messageToEdit = await this.getChatMessage(session.id, editId, [], trx);

			if (!['ai', 'human'].includes(messageToEdit.type)) {
				throw new BadRequestError('Only human and AI messages can be edited');
			}

			if (messageToEdit.type === 'ai') {
				// AI edits just change the original message without revisioning or response generation
				await this.messageRepository.updateChatMessage(editId, { content: payload.message }, trx);
				return null;
			}

			if (messageToEdit.type === 'human') {
				// Human messages branch the conversation and trigger an AI reply
				const { message } = payload;
				const messages = Object.fromEntries((session.messages ?? []).map((m) => [m.id, m]));
				const history = this.buildMessageHistory(messages, messageToEdit.previousMessageId);

				// If the message to edit isn't the original message, we want to point to the original message
				const revisionOfMessageId = messageToEdit.revisionOfMessageId ?? messageToEdit.id;

				await this.saveHumanMessage(
					payload,
					user,
					messageToEdit.previousMessageId,
					selectedModel,
					revisionOfMessageId,
					trx,
				);

				return await this.createChatWorkflow(
					session.id,
					credential.projectId,
					history,
					message,
					payload.credentials,
					payload.model,
					messageToEdit.previousMessageId === null,
					trx,
				);
			}

			return null;
		});

		if (!workflow) {
			return;
		}

		try {
			await this.executeChatWorkflow(
				res,
				user,
				workflow,
				replyId,
				sessionId,
				messageId,
				selectedModel,
			);
		} finally {
			await this.deleteChatWorkflow(workflow.workflowData.id);
		}
	}

	async regenerateAIMessage(res: Response, user: User, payload: RegenerateMessagePayload) {
		const { sessionId, retryId, replyId } = payload;
		const selectedModel: ModelWithCredentials = {
			...payload.model,
			credentialId:
				payload.model.provider !== 'n8n'
					? this.pickCredentialId(payload.model.provider, payload.credentials)
					: null,
		};

		const { workflow, retryOfMessageId, previousMessageId } =
			await this.messageRepository.manager.transaction(async (trx) => {
				const credential = await this.ensureCredentials(
					user,
					payload.model,
					payload.credentials,
					trx,
				);
				const session = await this.getChatSession(user, sessionId, undefined, false, trx);
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
				const workflow = await this.createChatWorkflow(
					session.id,
					credential.projectId,
					history,
					lastHumanMessage ? lastHumanMessage.content : '',
					payload.credentials,
					payload.model,
					false,
					trx,
				);

				return {
					workflow,
					previousMessageId: lastHumanMessage.id,
					retryOfMessageId,
				};
			});

		try {
			await this.executeChatWorkflow(
				res,
				user,
				workflow,
				replyId,
				sessionId,
				previousMessageId,
				selectedModel,
				retryOfMessageId,
			);
		} finally {
			await this.deleteChatWorkflow(workflow.workflowData.id);
		}
	}

	async stopGeneration(user: User, sessionId: ChatSessionId, messageId: ChatMessageId) {
		const session = await this.getChatSession(user, sessionId);
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
		workflow: {
			workflowData: IWorkflowBase;
			triggerToStartFrom: { name: string; data?: ITaskData };
		},
		replyId: ChatMessageId,
		sessionId: ChatSessionId,
		previousMessageId: ChatMessageId,
		selectedModel: ModelWithCredentials,
		retryOfMessageId?: ChatMessageId,
	) {
		const { workflowData, triggerToStartFrom } = workflow;

		this.logger.debug(
			`Starting execution of workflow "${workflowData.name}" with ID ${workflowData.id}`,
		);

		// Capture the streaming response as it's being generated to save
		// partial messages in the database when generation gets cancelled.
		let partialMessage = '';
		const onChunk = (chunk: string) => {
			const data = jsonParse<StructuredChunk>(chunk);
			if (data && data.type === 'item' && typeof data.content === 'string') {
				partialMessage += data.content;
			}
		};

		const stream = captureResponseWrites(res, onChunk);
		stream.writeHead(200, JSONL_STREAM_HEADERS);
		stream.flushHeaders();

		const { executionId } = await this.workflowExecutionService.executeManually(
			{
				workflowData,
				triggerToStartFrom,
			},
			user,
			undefined,
			true,
			stream,
		);
		if (!executionId) {
			throw new OperationalError('There was a problem starting the chat execution.');
		}

		await this.saveAIMessage({
			id: replyId,
			sessionId,
			executionId,
			previousMessageId,
			message: partialMessage,
			selectedModel,
			retryOfMessageId,
			status: 'running',
		});

		try {
			let result: IRun | undefined;
			try {
				result = await this.activeExecutions.getPostExecutePromise(executionId);
				if (!result) {
					throw new OperationalError('There was a problem executing the chat workflow.');
				}
			} catch (error: unknown) {
				if (error instanceof ManualExecutionCancelledError) {
					const execution = await this.executionRepository.findWithUnflattenedData(executionId, [
						workflowData.id,
					]);
					if (!execution) {
						throw new OperationalError(`Could not find execution with ID ${executionId}`);
					}

					if (execution.status === 'canceled') {
						await this.messageRepository.updateChatMessage(replyId, {
							content: partialMessage || 'Generation cancelled.',
							status: 'cancelled',
						});
						return;
					}
				}

				throw error;
			}

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

			// TODO: We should consider can we just save the output from the captured stream always instead
			// of parsing it from execution data, which seems error prone, especially with custom workflows.
			// That could make handling multiple agents, multiple runes, tool executions etc easier...?
			// const output = this.getAIOutput(execution, NODE_NAMES.REPLY_AGENT);
			// if (!output) {
			// 	throw new OperationalError('No response generated');
			// }

			await this.messageRepository.updateChatMessage(replyId, {
				content: partialMessage,
				status: 'success',
			});

			const title = this.getAIOutput(execution, NODE_NAMES.TITLE_GENERATOR_AGENT);
			if (title) {
				await this.sessionRepository.updateChatTitle(sessionId, title);
			}
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			await this.messageRepository.updateChatMessage(replyId, {
				content: `Error: ${message}`,
				status: 'error',
			});
		}
	}

	private prepareChatWorkflow({
		sessionId,
		history,
		humanMessage,
		credentials,
		model,
		generateConversationTitle,
	}: {
		sessionId: ChatSessionId;
		history: ChatHubMessage[];
		humanMessage: string;
		credentials: INodeCredentials;
		model: ChatHubConversationModel;
		generateConversationTitle: boolean;
	}) {
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
				name: NODE_NAMES.CHAT_TRIGGER,
				webhookId: uuidv4(),
			},
			{
				parameters: {
					promptType: 'define',
					text: "={{ $('When chat message received').item.json.chatInput }}",
					options: {
						enableStreaming: true,
						maxTokensFromMemory:
							model.provider !== 'n8n'
								? getMaxContextWindowTokens(model.provider, model.model)
								: undefined,
					},
				},
				type: AGENT_LANGCHAIN_NODE_TYPE,
				typeVersion: 3,
				position: [600, 0],
				id: uuidv4(),
				name: NODE_NAMES.REPLY_AGENT,
			},
			this.createModelNode(credentials, model),
			{
				parameters: {
					sessionIdType: 'customKey',
					sessionKey: `={{ $('${NODE_NAMES.CHAT_TRIGGER}').item.json.sessionId }}`,
					contextWindowLength: 20, // TODO: Decide this based on selected model & chat history token size
				},
				type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
				typeVersion: 1.3,
				position: [480, 208],
				id: uuidv4(),
				name: NODE_NAMES.MEMORY,
			},
			{
				parameters: {
					mode: 'insert',
					insertMode: 'override',
					messages: {
						messageValues: history.map((message) => {
							const typeMap: Record<string, MessageRecord['type']> = {
								human: 'user',
								ai: 'ai',
								system: 'system',
							};

							// TODO: Tool messages ?
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
				position: [224, 0],
				id: uuidv4(),
				name: NODE_NAMES.RESTORE_CHAT_MEMORY,
			},
			{
				parameters: {
					mode: 'delete',
					deleteMode: 'all',
				},
				type: '@n8n/n8n-nodes-langchain.memoryManager',
				typeVersion: 1.1,
				position: [976, 0],
				id: uuidv4(),
				name: NODE_NAMES.CLEAR_CHAT_MEMORY,
			},
			{
				disabled: !generateConversationTitle,
				parameters: {
					promptType: 'define',
					text: "={{ $('When chat message received').item.json.chatInput }}",
					options: {
						enableStreaming: false,
						systemMessage: CONVERSATION_TITLE_GENERATION_PROMPT,
					},
				},
				type: AGENT_LANGCHAIN_NODE_TYPE,
				typeVersion: 3,
				position: [224, 360],
				id: uuidv4(),
				name: NODE_NAMES.TITLE_GENERATOR_AGENT,
			},
		];

		const connections: IConnections = {
			[NODE_NAMES.CHAT_TRIGGER]: {
				main: [
					[{ node: NODE_NAMES.RESTORE_CHAT_MEMORY, type: NodeConnectionTypes.Main, index: 0 }],
				],
			},
			[NODE_NAMES.RESTORE_CHAT_MEMORY]: {
				main: [
					[
						{ node: NODE_NAMES.REPLY_AGENT, type: NodeConnectionTypes.Main, index: 0 },
						{ node: NODE_NAMES.TITLE_GENERATOR_AGENT, type: NodeConnectionTypes.Main, index: 0 },
					],
				],
			},
			[NODE_NAMES.CHAT_MODEL]: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				ai_languageModel: [
					[
						{ node: NODE_NAMES.REPLY_AGENT, type: NodeConnectionTypes.AiLanguageModel, index: 0 },
						{
							node: NODE_NAMES.TITLE_GENERATOR_AGENT,
							type: NodeConnectionTypes.AiLanguageModel,
							index: 0,
						},
					],
				],
			},
			[NODE_NAMES.MEMORY]: {
				ai_memory: [
					[
						{ node: NODE_NAMES.REPLY_AGENT, type: NodeConnectionTypes.AiMemory, index: 0 },
						{ node: NODE_NAMES.RESTORE_CHAT_MEMORY, type: NodeConnectionTypes.AiMemory, index: 0 },
						{ node: NODE_NAMES.CLEAR_CHAT_MEMORY, type: NodeConnectionTypes.AiMemory, index: 0 },
					],
				],
			},
			[NODE_NAMES.REPLY_AGENT]: {
				main: [
					[
						{
							node: NODE_NAMES.CLEAR_CHAT_MEMORY,
							type: NodeConnectionTypes.Main,
							index: 0,
						},
					],
				],
			},
		};

		const triggerToStartFrom: {
			name: string;
			data: ITaskData;
		} = {
			name: NODE_NAMES.CHAT_TRIGGER,
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
									sessionId,
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

		return { nodes, connections, triggerToStartFrom };
	}

	private async saveHumanMessage(
		payload: HumanMessagePayload | EditMessagePayload,
		user: User,
		previousMessageId: ChatMessageId | null,
		selectedModel: ModelWithCredentials,
		revisionOfMessageId?: ChatMessageId,
		trx?: EntityManager,
	) {
		await this.messageRepository.createChatMessage(
			{
				id: payload.messageId,
				sessionId: payload.sessionId,
				type: 'human',
				name: user.firstName || 'User',
				status: 'success',
				content: payload.message,
				previousMessageId,
				revisionOfMessageId,
				...selectedModel,
			},
			trx,
		);
	}

	private async saveAIMessage({
		id,
		sessionId,
		executionId,
		previousMessageId,
		message,
		selectedModel,
		retryOfMessageId,
		status,
	}: {
		id: ChatMessageId;
		sessionId: ChatSessionId;
		executionId: string;
		previousMessageId: ChatMessageId;
		message: string;
		selectedModel: ModelWithCredentials;
		retryOfMessageId?: ChatMessageId;
		editOfMessageId?: ChatMessageId;
		status?: ChatHubMessageStatus;
	}) {
		await this.messageRepository.createChatMessage({
			id,
			sessionId,
			previousMessageId,
			executionId: parseInt(executionId, 10),
			type: 'ai',
			name: 'AI',
			status,
			content: message,
			retryOfMessageId,
			...selectedModel,
		});
	}

	private async getChatSession(
		user: User,
		sessionId: ChatSessionId,
		selectedModel?: ModelWithCredentials,
		initialize: boolean = false,
		trx?: EntityManager,
	) {
		const existing = await this.sessionRepository.getOneById(sessionId, user.id, trx);
		if (existing) {
			return existing;
		} else if (!initialize) {
			throw new NotFoundError('Chat session not found');
		}

		return await this.sessionRepository.createChatSession(
			{
				id: sessionId,
				ownerId: user.id,
				title: 'New Chat',
				...selectedModel,
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

	private createModelNode(
		credentials: INodeCredentials,
		conversationModel: ChatHubConversationModel,
	): INode {
		if (conversationModel.provider === 'n8n') {
			throw new OperationalError('Custom agent workflows do not require a model node');
		}

		const { provider, model } = conversationModel;
		const common = {
			position: [600, 500] as [number, number],
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
			executionId: message.executionId,
			status: message.status,
			createdAt: message.createdAt.toISOString(),
			updatedAt: message.updatedAt.toISOString(),

			previousMessageId: message.previousMessageId,
			retryOfMessageId: message.retryOfMessageId,
			revisionOfMessageId: message.revisionOfMessageId,
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

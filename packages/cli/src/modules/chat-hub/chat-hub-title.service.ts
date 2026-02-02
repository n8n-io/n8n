import {
	PROVIDER_CREDENTIAL_TYPE_MAP,
	type ChatHubLLMProvider,
	type ChatSessionId,
	ChatHubConversationModel,
	ChatHubN8nModel,
	ChatHubCustomAgentModel,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ExecutionRepository, User } from '@n8n/db';
import type { EntityManager } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	OperationalError,
	type INodeCredentials,
	type IWorkflowBase,
	jsonStringify,
	IRunExecutionData,
	INodeParameters,
	INode,
	type IBinaryData,
	UserError,
} from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { ChatHubAgentService } from './chat-hub-agent.service';
import { ChatHubCredentialsService } from './chat-hub-credentials.service';
import { ChatHubExecutionService } from './chat-hub-execution.service';
import { ChatHubWorkflowService } from './chat-hub-workflow.service';
import { NODE_NAMES, PROVIDER_NODE_TYPE_MAP } from './chat-hub.constants';
import { ChatHubSessionRepository } from './chat-session.repository';

@Service()
export class ChatHubTitleService {
	constructor(
		private readonly logger: Logger,
		private readonly chatHubWorkflowService: ChatHubWorkflowService,
		private readonly chatHubCredentialsService: ChatHubCredentialsService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly executionService: ChatHubExecutionService,
		private readonly sessionRepository: ChatHubSessionRepository,
		private readonly executionRepository: ExecutionRepository,
		private readonly chatHubAgentService: ChatHubAgentService,
	) {
		this.logger = this.logger.scoped('chat-hub');
	}

	async generateSessionTitle(
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
			await this.chatHubWorkflowService.deleteChatWorkflow(workflowData.id);
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
		return await this.sessionRepository.manager.transaction(async (trx) => {
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

	private async runTitleWorkflowAndGetTitle(
		user: User,
		workflowData: IWorkflowBase,
		executionData: IRunExecutionData,
	): Promise<string | null> {
		const { executionId } = await this.executionService.execute(user, workflowData, executionData);

		await this.executionService.waitForExecutionCompletion(executionId);

		const execution = await this.executionRepository.findWithUnflattenedData(executionId, [
			workflowData.id,
		]);

		if (!execution) {
			throw new OperationalError(`Could not find execution with ID ${executionId}`);
		}

		if (!execution.status || execution.status !== 'success') {
			const message =
				this.executionService.getErrorMessage(execution) ?? 'Failed to generate a response';
			throw new OperationalError(message);
		}

		const title = this.executionService.getAIOutput(execution, NODE_NAMES.TITLE_GENERATOR_AGENT);
		return title ?? null;
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
}

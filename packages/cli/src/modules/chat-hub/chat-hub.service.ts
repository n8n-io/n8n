import {
	PROVIDER_CREDENTIAL_TYPE_MAP,
	type ChatHubProvider,
	type ChatHubConversationModel,
	type ChatModelsResponse,
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
	OperationalError,
	type IConnections,
	type INode,
	type INodeCredentialsDetails,
	type ITaskData,
	type IWorkflowBase,
	type StartNodeData,
} from 'n8n-workflow';
import { v4 as uuidv4 } from 'uuid';

import type { ChatPayloadWithCredentials } from './chat-hub.types';

import { CredentialsHelper } from '@/credentials-helper';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { getBase } from '@/workflow-execute-additional-data';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

@Service()
export class ChatHubService {
	constructor(
		private readonly logger: Logger,
		private readonly credentialsHelper: CredentialsHelper,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowExecutionService: WorkflowExecutionService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	async getModels(
		userId: string,
		credentialIds: Record<ChatHubProvider, string | null>,
	): Promise<ChatModelsResponse> {
		const models: ChatHubConversationModel[] = [];
		const additionalData = await getBase({ userId });

		for (const [providerKey, credentialId] of Object.entries(credentialIds)) {
			if (!credentialId) {
				continue;
			}

			// Type assertion is safe here because credentialIds type guarantees valid keys
			const provider = providerKey as ChatHubProvider;
			const credentialType = PROVIDER_CREDENTIAL_TYPE_MAP[provider];

			try {
				// Get the decrypted credential data
				const nodeCredentials: INodeCredentialsDetails = {
					id: credentialId,
					name: credentialType,
				};

				const credentials = await this.credentialsHelper.getDecrypted(
					additionalData,
					nodeCredentials,
					credentialType,
					'internal',
					undefined,
					true,
				);

				// Extract API key from credentials based on provider
				const apiKey = this.extractApiKey(provider, credentials);
				if (!apiKey) {
					continue;
				}

				// Fetch models dynamically from the provider
				const providerModels = await this.fetchModelsForProvider(provider, apiKey);
				models.push(...providerModels);
			} catch (error) {
				this.logger.debug(`Failed to get models for ${provider}: ${error}`);
			}
		}

		return models;
	}

	private async fetchModelsForProvider(
		provider: ChatHubProvider,
		apiKey: string,
	): Promise<ChatHubConversationModel[]> {
		switch (provider) {
			case 'openai':
				return await this.fetchOpenAiModels(apiKey);
			case 'anthropic':
				return await this.fetchAnthropicModels(apiKey);
			case 'google':
				return await this.fetchGoogleModels(apiKey);
		}
	}

	private async fetchOpenAiModels(apiKey: string): Promise<ChatHubConversationModel[]> {
		try {
			const response = await fetch('https://api.openai.com/v1/models', {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${apiKey}`,
				},
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch OpenAI models: ${response.statusText}`);
			}

			const data = await response.json();
			const models: ChatHubConversationModel[] = [];

			// Filter for chat models only (GPT models)
			const chatModels = data.data.filter(
				(model: { id: string }) =>
					model.id.includes('gpt') && !model.id.includes('instruct') && !model.id.includes('audio'),
			);

			for (const model of chatModels) {
				models.push({
					provider: 'openai',
					model: model.id,
				});
			}

			return models;
		} catch (error) {
			this.logger.debug(`Failed to fetch OpenAI models: ${error}`);
			return [];
		}
	}

	private async fetchAnthropicModels(apiKey: string): Promise<ChatHubConversationModel[]> {
		// Anthropic doesn't have a public models list endpoint, so we'll use a curated list
		// but validate the API key first
		try {
			const response = await fetch('https://api.anthropic.com/v1/messages', {
				method: 'POST',
				headers: {
					'x-api-key': apiKey,
					'anthropic-version': '2023-06-01',
					'content-type': 'application/json',
				},
				body: JSON.stringify({
					model: 'claude-3-haiku-20240307',
					max_tokens: 1,
					messages: [{ role: 'user', content: 'test' }],
				}),
			});

			// If authentication fails, don't return models
			if (response.status === 401 || response.status === 403) {
				return [];
			}

			// Return known Anthropic models
			return [
				{
					provider: 'anthropic',
					model: 'claude-3-5-sonnet-20241022',
				},
				{
					provider: 'anthropic',
					model: 'claude-3-opus-20240229',
				},
				{
					provider: 'anthropic',
					model: 'claude-3-sonnet-20240229',
				},
				{
					provider: 'anthropic',
					model: 'claude-3-haiku-20240307',
				},
			];
		} catch (error) {
			this.logger.debug(`Failed to validate Anthropic API key: ${error}`);
			return [];
		}
	}

	private async fetchGoogleModels(apiKey: string): Promise<ChatHubConversationModel[]> {
		try {
			const response = await fetch(
				`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
				{
					method: 'GET',
				},
			);

			if (!response.ok) {
				throw new Error(`Failed to fetch Google models: ${response.statusText}`);
			}

			const data = await response.json();
			const models: ChatHubConversationModel[] = [];

			// Filter for Gemini chat models
			const chatModels = data.models?.filter(
				(model: { name: string; supportedGenerationMethods?: string[] }) =>
					model.name.includes('gemini') &&
					model.supportedGenerationMethods?.includes('generateContent'),
			);

			for (const model of chatModels || []) {
				// Extract model ID from the full name (e.g., "models/gemini-1.5-pro" -> "gemini-1.5-pro")
				const modelId = model.name.split('/').pop();
				models.push({
					provider: 'google',
					model: modelId,
				});
			}

			return models;
		} catch (error) {
			this.logger.debug(`Failed to fetch Google models: ${error}`);
			return [];
		}
	}

	private extractApiKey(provider: ChatHubProvider, credentials: unknown): string | undefined {
		if (typeof credentials !== 'object' || credentials === null) {
			return undefined;
		}

		const creds = credentials as Record<string, unknown>;

		switch (provider) {
			case 'openai':
			case 'anthropic':
			case 'google':
				// All providers use 'apiKey' field
				return typeof creds.apiKey === 'string' ? creds.apiKey : undefined;
		}
	}

	private async createChatWorkflow(
		user: User,
		sessionId: string,
		nodes: INode[],
		connections: IConnections,
	) {
		const { manager } = this.projectRepository;
		const existing = await this.workflowRepository.findOneBy({ id: sessionId });
		if (existing) {
			return existing;
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

			return workflow;
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

	async askN8n(res: Response, user: User, payload: ChatPayloadWithCredentials) {
		/* eslint-disable @typescript-eslint/naming-convention */
		const nodes: INode[] = [
			{
				parameters: {
					public: true,
					mode: 'webhook',
					options: { responseMode: 'streaming' },
				},
				type: '@n8n/n8n-nodes-langchain.chatTrigger',
				typeVersion: 1.3,
				position: [0, 0],
				id: uuidv4(),
				name: 'When chat message received',
				webhookId: uuidv4(),
			},
			{
				parameters: {
					options: {
						enableStreaming: true,
					},
				},
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 3,
				position: [200, 0],
				id: uuidv4(),
				name: 'AI Agent',
			},
			{
				parameters: {
					model: { __rl: true, mode: 'list', value: payload.model },
					options: {},
				},
				type: payload.provider,
				typeVersion: 1.2,
				position: [80, 200],
				id: uuidv4(),
				name: 'Chat Model',
				credentials: payload.credentials,
			},
		];

		const connections: IConnections = {
			'When chat message received': {
				main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
			},
			'Chat Model': {
				ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
			},
		};

		const workflow = await this.createChatWorkflow(user, payload.sessionId, nodes, connections);
		const workflowData: IWorkflowBase = {
			...workflow,
			nodes,
			connections,
			versionId: uuidv4(),
		};
		/* eslint-enable @typescript-eslint/naming-convention */

		const startNodes: StartNodeData[] = [{ name: 'AI Agent', sourceData: null }];
		const triggerToStartFrom: {
			name: string;
			data?: ITaskData;
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
									sessionId: payload.sessionId,
									action: 'sendMessage',
									chatInput: payload.message,
								},
							},
						],
					],
				},
				source: [null],
			},
		};

		this.logger.debug(`Starting execution of workflow "${workflow.name}" with ID ${workflow.id}`);

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

		// TODO: The execution finishes after a while, how do we store the full AI response on the database?
		// Is there a better way to listen for the execution to finish?
		const onClose = async () => {
			this.logger.debug(`Connection closed by client, execution ID: ${executionId}`);

			// TODO: we could maybe stop executions here if user disconnected early?
			// if (execution && ['running', 'waiting'].includes(execution.status)) {
			// 	await this.executionService.stop(executionId, [workflow.id]);
			// }

			const execution = await this.executionRepository.findWithUnflattenedData(executionId, [
				workflow.id,
			]);

			// Persist the assistant message to the database
			if (execution?.data?.resultData) {
				// resultData is only available if the execution finished
				const message = this.getMessage(execution);
				this.logger.debug(`Assistant: ${message} (${payload.replyId})`);
			}
		};

		res.on('close', onClose);
		res.on('error', onClose);
	}
}

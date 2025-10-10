import {
	PROVIDER_CREDENTIAL_TYPE_MAP,
	type ChatHubProvider,
	type ChatModelsResponse,
	chatHubProviderSchema,
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
	type ITaskData,
	type IWorkflowBase,
	type StartNodeData,
} from 'n8n-workflow';
import { v4 as uuidv4 } from 'uuid';

import type { ChatPayloadWithCredentials, ChatMessage } from './chat-hub.types';

import { CredentialsHelper } from '@/credentials-helper';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { getBase } from '@/workflow-execute-additional-data';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { ActiveExecutions } from '@/active-executions';

@Service()
export class ChatHubService {
	private sesssions: Map<string, ChatMessage[]>;

	constructor(
		private readonly logger: Logger,
		private readonly credentialsService: CredentialsService,
		private readonly credentialsHelper: CredentialsHelper,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowExecutionService: WorkflowExecutionService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly activeExecutions: ActiveExecutions,
	) {
		this.sesssions = new Map<string, ChatMessage[]>();
	}

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

				const credentials = await this.credentialsHelper.getDecrypted(
					additionalData,
					{
						id: credentialId,
						name: PROVIDER_CREDENTIAL_TYPE_MAP[provider],
					},
					PROVIDER_CREDENTIAL_TYPE_MAP[provider],
					'internal',
					undefined,
					true,
				);

				// Extract API key from credentials based on provider
				const apiKey = this.extractApiKey(provider, credentials);

				if (!apiKey) {
					return [provider, { models: [] }];
				}

				try {
					return [provider, await this.fetchModelsForProvider(provider, apiKey)];
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
		apiKey: string,
	): Promise<ChatModelsResponse[ChatHubProvider]> {
		switch (provider) {
			case 'openai':
				return await this.fetchOpenAiModels(apiKey);
			case 'anthropic':
				return await this.fetchAnthropicModels(apiKey);
			case 'google':
				return await this.fetchGoogleModels(apiKey);
		}
	}

	private async fetchOpenAiModels(apiKey: string): Promise<ChatModelsResponse[ChatHubProvider]> {
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

		return {
			models: data.data
				.filter(
					(model: { id: string }) =>
						model.id.includes('gpt') &&
						!model.id.includes('instruct') &&
						!model.id.includes('audio'),
				)
				.map((model: { id: string }) => ({ name: model.id })),
		};
	}

	private async fetchAnthropicModels(apiKey: string): Promise<ChatModelsResponse[ChatHubProvider]> {
		const response = await fetch('https://api.anthropic.com/v1/models', {
			method: 'GET',
			headers: {
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01',
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch Anthropic models: ${response.statusText}`);
		}

		const data = (await response.json()) as {
			data: Array<{ id: string; display_name: string; type: string; created_at: string }>;
		};

		return {
			models: (data.data || [])
				.sort((a, b) => {
					const dateA = new Date(a.created_at);
					const dateB = new Date(b.created_at);
					return dateB.getTime() - dateA.getTime();
				})
				.map((model) => ({ name: model.id })),
		};
	}

	private async fetchGoogleModels(apiKey: string): Promise<ChatModelsResponse[ChatHubProvider]> {
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

		return {
			models: data.models
				?.filter(
					(model: { name: string; supportedGenerationMethods?: string[] }) =>
						model.name.includes('gemini') &&
						model.supportedGenerationMethods?.includes('generateContent'),
				)
				.map((model: { name: string }) => {
					// Extract model ID from the full name (e.g., "models/gemini-1.5-pro" -> "gemini-1.5-pro")
					const modelId = model.name.split('/').pop();

					return { name: modelId };
				}),
		};
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
		let session = this.sesssions.get(payload.sessionId);
		if (!session) {
			session = [];
			this.sesssions.set(payload.sessionId, session);
		}

		const chatHistory = session.map((msg) => ({
			type: msg.type,
			message: msg.message,
		}));

		session.push({
			id: payload.messageId,
			message: payload.message,
			type: 'user',
			createdAt: new Date(),
		});

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
			this.createModelNode(payload),
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
						messageValues: chatHistory,
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

		const workflow = await this.createChatWorkflow(user, payload.sessionId, nodes, connections);
		const workflowData: IWorkflowBase = {
			...workflow,
			nodes,
			connections,
			versionId: uuidv4(),
		};
		/* eslint-enable @typescript-eslint/naming-convention */

		const startNodes: StartNodeData[] = [{ name: 'Restore Chat Memory', sourceData: null }];
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
									sessionId: `${payload.sessionId}-${payload.messageId}`,
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

		const result = await this.activeExecutions.getPostExecutePromise(executionId);
		if (!result) {
			throw new OperationalError('There was a problem executing the chat workflow.');
		}

		const execution = await this.executionRepository.findWithUnflattenedData(executionId, [
			workflow.id,
		]);
		if (!execution) {
			throw new NotFoundError(`Could not find execution with ID ${executionId}`);
		}

		const message = this.getMessage(execution);
		if (message) {
			this.logger.debug(`Assistant: ${message} (${payload.replyId})`);
			session.push({
				id: payload.replyId,
				message,
				type: 'ai',
				createdAt: new Date(),
			});
		}
	}

	private createModelNode(payload: ChatPayloadWithCredentials): INode {
		const common = {
			position: [600, 200] as [number, number],
			id: uuidv4(),
			name: 'Chat Model',
			credentials: payload.credentials,
		};

		switch (payload.model.provider) {
			case 'openai':
				return {
					...common,
					parameters: {
						model: { __rl: true, mode: 'list', value: payload.model.model },
						options: {},
					},
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					typeVersion: 1.2,
				};
			case 'anthropic':
				return {
					...common,
					parameters: {
						model: {
							__rl: true,
							mode: 'list',
							value: payload.model.model,
							cachedResultName: payload.model.model,
						},
						options: {},
					},
					type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
					typeVersion: 1.3,
				};
			case 'google':
				return {
					...common,
					parameters: {
						model: { __rl: true, mode: 'list', value: payload.model.model },
						options: {},
					},
					type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
					typeVersion: 1.2,
				};
		}
	}
}

/**
 * A2A Agent Node
 *
 * Implements the A2A (Agent-to-Agent) protocol for n8n.
 * This node exposes a JSON-RPC endpoint that allows other agents
 * to communicate with it using the A2A protocol.
 *
 * Features:
 * - JSON-RPC endpoint for message/send
 * - Agent Card endpoint for capability discovery
 * - Push notifications for async responses
 * - Memory and tools integration
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseChatMemory } from '@langchain/classic/memory';
import { AgentExecutor, createToolCallingAgent } from '@langchain/classic/agents';
import {
	ChatPromptTemplate,
	MessagesPlaceholder,
	HumanMessagePromptTemplate,
	SystemMessagePromptTemplate,
} from '@langchain/core/prompts';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { Node, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type {
	IDataObject,
	INodeExecutionData,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { v4 as uuidv4 } from 'uuid';

import { isChatInstance, getConnectedTools } from '@utils/helpers';

import type { A2AMessageSendParams, A2APushNotification, JsonRpcRequest } from './a2a.types';
import { JsonRpcErrorCodes } from './a2a.types';
import { mapExecutionStatusToA2A } from './a2a-status-mapper';
import {
	createA2AMessage,
	createA2ATask,
	createAgentCard,
	createJsonRpcErrorResponse,
	createJsonRpcResponse,
	extractMessageText,
	parseMessageSendParams,
	sendPushNotification,
	validateJsonRpcRequest,
} from './a2a.utils';
import { storeTask, getTask, type StoredTask } from './a2a-task-store';

const A2A_PATH_IDENTIFIER = 'a2a';
const AGENT_CARD_PATH = '.well-known/agent.json';

export class A2AAgent extends Node {
	description: INodeTypeDescription = {
		displayName: 'A2A Agent',
		name: 'a2aAgent',
		icon: 'fa:robot',
		iconColor: 'purple',
		group: ['trigger'],
		version: 1,
		description: 'AI Agent that exposes an A2A (Agent-to-Agent) protocol endpoint',
		defaults: {
			name: 'A2A Agent',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Agents', 'Root Nodes'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.a2aagent/',
					},
				],
			},
		},
		maxNodes: 1,
		inputs: [
			{
				type: NodeConnectionTypes.AiLanguageModel,
				displayName: 'Chat Model',
				required: true,
				maxConnections: 1,
			},
			{
				type: NodeConnectionTypes.AiMemory,
				displayName: 'Memory',
				required: false,
				maxConnections: 1,
			},
			{
				type: NodeConnectionTypes.AiTool,
				displayName: 'Tool',
				required: false,
			},
		],
		outputs: [NodeConnectionTypes.Main],
		webhooks: [
			{
				name: 'setup',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: AGENT_CARD_PATH,
				ndvHideUrl: true,
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: A2A_PATH_IDENTIFIER,
			},
		],
		eventTriggerDescription: 'Waiting for A2A protocol requests',
		activationMessage: 'Your A2A Agent is now active and ready to receive requests.',
		triggerPanel: false,
		properties: [
			{
				displayName: 'Agent Name',
				name: 'agentName',
				type: 'string',
				default: 'n8n AI Agent',
				required: true,
				description: 'The name of this agent as shown in the Agent Card',
			},
			{
				displayName: 'Agent Description',
				name: 'agentDescription',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				default: 'An AI agent powered by n8n workflow automation',
				description: 'Description of what this agent can do',
			},
			{
				displayName: 'System Message',
				name: 'systemMessage',
				type: 'string',
				typeOptions: {
					rows: 6,
				},
				default: 'You are a helpful AI assistant. Respond concisely and accurately.',
				description: 'The system message that defines the agent behavior',
			},
			{
				displayName: 'Skills',
				name: 'skills',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: { values: [] },
				placeholder: 'Add Skill',
				options: [
					{
						name: 'values',
						displayName: 'Skill',
						values: [
							{
								displayName: 'Skill ID',
								name: 'id',
								type: 'string',
								default: '',
								description: 'Unique identifier for the skill',
							},
							{
								displayName: 'Skill Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Human-readable name for the skill',
							},
							{
								displayName: 'Skill Description',
								name: 'description',
								type: 'string',
								default: '',
								description: 'Description of what the skill does',
							},
						],
					},
				],
			},
		],
	};

	/**
	 * Get the chat model from input connections
	 */
	private async getChatModel(ctx: IWebhookFunctions): Promise<BaseChatModel> {
		const model = await ctx.getInputConnectionData(NodeConnectionTypes.AiLanguageModel, 0);

		if (!model) {
			throw new NodeOperationError(ctx.getNode(), 'Please connect a Chat Model to the A2A Agent');
		}

		const chatModel = Array.isArray(model) ? model[0] : model;

		if (!isChatInstance(chatModel) || !chatModel.bindTools) {
			throw new NodeOperationError(
				ctx.getNode(),
				'A2A Agent requires a Chat Model that supports tool calling',
			);
		}

		return chatModel as BaseChatModel;
	}

	/**
	 * Get optional memory from input connections
	 */
	private async getOptionalMemory(ctx: IWebhookFunctions): Promise<BaseChatMemory | undefined> {
		return (await ctx.getInputConnectionData(NodeConnectionTypes.AiMemory, 0)) as
			| BaseChatMemory
			| undefined;
	}

	/**
	 * Handle Agent Card request (GET /.well-known/agent.json)
	 */
	private handleAgentCardRequest(ctx: IWebhookFunctions): IWebhookResponseData {
		const res = ctx.getResponseObject();
		const agentName = ctx.getNodeParameter('agentName', 'n8n AI Agent') as string;
		const agentDescription = ctx.getNodeParameter('agentDescription', '') as string;
		const skillsParam = ctx.getNodeParameter('skills.values', []) as Array<{
			id: string;
			name: string;
			description?: string;
		}>;

		// Get the webhook URL for the A2A endpoint
		const webhookUrl = ctx.getNodeWebhookUrl('default') ?? '';
		const baseUrl = webhookUrl.replace(/\/a2a$/, '');

		const skills = skillsParam.map((skill) => ({
			id: skill.id || uuidv4(),
			name: skill.name,
			description: skill.description,
		}));

		const agentCard = createAgentCard(agentName, baseUrl, agentDescription, skills);

		// Send the Agent Card as JSON response
		res.setHeader('Content-Type', 'application/json');
		res.status(200).json(agentCard);

		return {
			noWebhookResponse: true,
		};
	}

	/**
	 * Helper to send JSON-RPC response
	 */
	private sendJsonRpcResponse(
		ctx: IWebhookFunctions,
		data: object,
		statusCode: number = 200,
	): IWebhookResponseData {
		const res = ctx.getResponseObject();
		res.setHeader('Content-Type', 'application/json');
		res.status(statusCode).json(data);
		return { noWebhookResponse: true };
	}

	/**
	 * Handle message/send JSON-RPC method
	 */
	private async handleMessageSend(
		ctx: IWebhookFunctions,
		request: JsonRpcRequest<A2AMessageSendParams>,
	): Promise<IWebhookResponseData> {
		// Validate params
		const validation = parseMessageSendParams(request.params);
		if (!validation.valid || !validation.data) {
			return this.sendJsonRpcResponse(
				ctx,
				createJsonRpcErrorResponse(
					request.id,
					JsonRpcErrorCodes.INVALID_PARAMS,
					validation.error ?? 'Invalid params',
				),
				400,
			);
		}

		const { message, pushNotification } = validation.data;

		// Extract text from message
		const inputText = extractMessageText(message);
		if (!inputText) {
			return this.sendJsonRpcResponse(
				ctx,
				createJsonRpcErrorResponse(
					request.id,
					JsonRpcErrorCodes.INVALID_PARAMS,
					'Message must contain at least one text part',
				),
				400,
			);
		}

		// Generate a unique task ID
		const taskId = uuidv4();

		// Get model, memory, and tools upfront (needed for validation)
		let model: BaseChatModel;
		try {
			model = await this.getChatModel(ctx);
		} catch (error) {
			return this.sendJsonRpcResponse(
				ctx,
				createJsonRpcErrorResponse(
					request.id,
					JsonRpcErrorCodes.INTERNAL_ERROR,
					error instanceof Error ? error.message : 'Failed to get chat model',
				),
				500,
			);
		}

		const memory = await this.getOptionalMemory(ctx);

		// Debug: Try to get tools with explicit logging
		let tools: Awaited<ReturnType<typeof getConnectedTools>> = [];
		try {
			tools = await getConnectedTools(ctx, true, false);
			ctx.logger.info('A2A Agent: Tools resolved successfully', {
				toolCount: tools.length,
				toolNames: tools.map((t) => t.name),
				toolDescriptions: tools.map((t) => t.description?.substring(0, 50)),
			});
		} catch (error) {
			ctx.logger.error('A2A Agent: Failed to get connected tools', {
				error: error instanceof Error ? error.message : 'Unknown error',
			});
		}

		const systemMessage = ctx.getNodeParameter('systemMessage', '') as string;

		ctx.logger.info('A2A Agent: Configuration', {
			systemMessage: systemMessage.substring(0, 100),
			hasMemory: !!memory,
			toolCount: tools.length,
		});

		// Store task immediately with "working" status
		const storedTask: StoredTask = {
			taskId,
			status: {
				state: 'working',
			},
			messages: [
				{
					role: 'user',
					parts: [{ type: 'text', text: inputText }],
				},
			],
			artifacts: [],
			createdAt: new Date(),
			updatedAt: new Date(),
			executionId: ctx.getExecutionId?.() ?? undefined,
		};
		storeTask(storedTask);

		// Send "working" response IMMEDIATELY (before agent execution)
		const workingTask = createA2ATask(taskId, 'working');
		const res = ctx.getResponseObject();
		res.setHeader('Content-Type', 'application/json');
		res.status(200).json(createJsonRpcResponse(request.id, workingTask));

		// NOW execute agent synchronously (tools work because we're still in execution context)
		const { outputText, a2aState } = await this.executeAgent(
			ctx,
			taskId,
			inputText,
			model,
			memory,
			tools,
			systemMessage,
		);

		// Update stored task with final result
		storedTask.status = { state: a2aState };
		storedTask.messages.push({
			role: 'agent',
			parts: [{ type: 'text', text: outputText }],
		});
		storedTask.updatedAt = new Date();

		// Create the completed task for push notification
		const responseMessage = createA2AMessage('agent', outputText);
		const completedTask = createA2ATask(taskId, a2aState, responseMessage);

		// Send push notification if configured (with final result)
		if (pushNotification?.url) {
			void sendPushNotification(ctx, pushNotification as A2APushNotification, completedTask);
		}

		// Return workflow data
		const executionId = ctx.getExecutionId?.() ?? undefined;
		const returnData: INodeExecutionData[] = [
			{
				json: {
					taskId,
					executionId,
					input: inputText,
					output: outputText,
					state: a2aState,
					pushNotificationUrl: pushNotification?.url,
				},
			},
		];

		return {
			noWebhookResponse: true,
			workflowData: [returnData],
		};
	}

	/**
	 * Execute agent synchronously and return result
	 */
	private async executeAgent(
		ctx: IWebhookFunctions,
		taskId: string,
		inputText: string,
		model: BaseChatModel,
		memory: BaseChatMemory | undefined,
		tools: StructuredToolInterface[],
		systemMessage: string,
	): Promise<{ outputText: string; a2aState: import('./a2a.types').A2ATaskState }> {
		let outputText: string;
		let executionState: 'success' | 'error' = 'success';

		try {
			ctx.logger.info('A2A Agent: Starting execution', {
				taskId,
				toolCount: tools.length,
				toolNames: tools.map((t) => t.name),
				hasMemory: !!memory,
			});

			if (tools.length > 0) {
				// Use AgentExecutor for tool-calling agents
				// This handles the loop: model -> tool call -> tool result -> model -> ...

				// Create the prompt template
				const prompt = ChatPromptTemplate.fromMessages([
					SystemMessagePromptTemplate.fromTemplate(
						systemMessage || 'You are a helpful AI assistant.',
					),
					new MessagesPlaceholder('chat_history'),
					HumanMessagePromptTemplate.fromTemplate('{input}'),
					new MessagesPlaceholder('agent_scratchpad'),
				]);

				// Create the agent
				const agent = createToolCallingAgent({
					llm: model,
					tools,
					prompt,
					streamRunnable: false,
				});

				// Create the executor
				const executor = AgentExecutor.fromAgentAndTools({
					agent,
					tools,
					memory,
					maxIterations: 10,
					returnIntermediateSteps: true,
				});

				ctx.logger.info('A2A Agent: Invoking executor', { taskId, input: inputText });

				// Invoke the executor
				const result = await executor.invoke({
					input: inputText,
					chat_history: memory ? await memory.chatHistory.getMessages() : [],
				});

				ctx.logger.info('A2A Agent: Executor completed', {
					taskId,
					output:
						typeof result.output === 'string' ? result.output.substring(0, 200) : 'non-string',
					intermediateSteps: result.intermediateSteps?.length ?? 0,
				});

				outputText = result.output as string;
			} else {
				// No tools - simple model invocation
				const chatHistory = memory ? await memory.chatHistory.getMessages() : [];

				const messages = [
					...(systemMessage ? [{ role: 'system' as const, content: systemMessage }] : []),
					...chatHistory.map((msg) => ({
						role: msg._getType() === 'human' ? ('user' as const) : ('assistant' as const),
						content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
					})),
					{ role: 'user' as const, content: inputText },
				];

				const response = await model.invoke(messages);
				outputText =
					typeof response.content === 'string'
						? response.content
						: JSON.stringify(response.content);

				// Save to memory if connected
				if (memory) {
					await memory.chatHistory.addUserMessage(inputText);
					await memory.chatHistory.addAIMessage(outputText);
				}
			}
		} catch (error) {
			executionState = 'error';
			outputText = error instanceof Error ? error.message : 'Agent execution failed';
			ctx.logger.error('A2A Agent execution failed', { error: outputText, taskId });
		}

		// Map execution state to A2A state and return
		const a2aState = mapExecutionStatusToA2A(executionState);

		ctx.logger.info('A2A Agent execution completed', {
			taskId,
			state: a2aState,
		});

		return { outputText, a2aState };
	}

	/**
	 * Query n8n execution status via internal API
	 */
	private async getExecutionStatus(
		ctx: IWebhookFunctions,
		executionId: string,
	): Promise<{ status: string; finished: boolean } | null> {
		try {
			// Get the request to extract the host for internal API call
			const req = ctx.getRequestObject();
			const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
			const host = req.headers.host || 'localhost:5678';
			const baseUrl = `${protocol}://${host}`;

			// Query the execution via n8n's internal API
			// Note: This requires the API to be accessible from the same host
			const response = await ctx.helpers.httpRequest({
				method: 'GET',
				url: `${baseUrl}/api/v1/executions/${executionId}`,
				headers: {
					// Forward any auth headers from the original request
					...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
					...(req.headers['x-n8n-api-key']
						? { 'X-N8N-API-KEY': req.headers['x-n8n-api-key'] }
						: {}),
				},
				returnFullResponse: false,
				json: true,
			});

			if (response && typeof response === 'object' && 'status' in response) {
				return {
					status: response.status as string,
					finished: response.finished as boolean,
				};
			}
			return null;
		} catch (error) {
			ctx.logger.warn('Failed to query execution status', {
				executionId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			return null;
		}
	}

	/**
	 * Handle tasks/get request (polling for task status)
	 */
	private async handleTasksGet(
		ctx: IWebhookFunctions,
		request: JsonRpcRequest,
	): Promise<IWebhookResponseData> {
		// Extract taskId from params
		const params = request.params as { taskId?: string } | undefined;
		const taskId = params?.taskId;

		if (!taskId) {
			return this.sendJsonRpcResponse(
				ctx,
				createJsonRpcErrorResponse(
					request.id,
					JsonRpcErrorCodes.INVALID_PARAMS,
					'taskId is required',
				),
				400,
			);
		}

		// Look up task in memory store
		const storedTask = getTask(taskId);

		if (!storedTask) {
			return this.sendJsonRpcResponse(
				ctx,
				createJsonRpcErrorResponse(
					request.id,
					JsonRpcErrorCodes.TASK_NOT_FOUND,
					`Task not found: ${taskId}`,
				),
				404,
			);
		}

		// Try to get live execution status from n8n API
		let liveStatus = storedTask.status;
		if (storedTask.executionId) {
			const executionStatus = await this.getExecutionStatus(ctx, storedTask.executionId);
			if (executionStatus) {
				// Map n8n execution status to A2A state
				const a2aState = mapExecutionStatusToA2A(
					executionStatus.status as import('n8n-workflow').ExecutionStatus,
				);
				liveStatus = {
					state: a2aState,
					message: storedTask.status.message,
				};

				// Update the stored task with live status
				storedTask.status = liveStatus;
				storedTask.updatedAt = new Date();
			}
		}

		// Convert stored task to A2A task response
		const task = {
			type: 'task' as const,
			id: storedTask.taskId,
			sessionId: storedTask.sessionId,
			status: liveStatus,
			history: storedTask.messages.map((msg) => ({
				type: 'message' as const,
				role: msg.role,
				parts: msg.parts,
			})),
			artifacts: storedTask.artifacts.map((artifact) => ({
				type: artifact.type,
				...(artifact.data as object),
			})),
		};

		// Return the task
		return this.sendJsonRpcResponse(ctx, createJsonRpcResponse(request.id, task), 200);
	}

	/**
	 * Main webhook handler
	 */
	async webhook(ctx: IWebhookFunctions): Promise<IWebhookResponseData> {
		const webhookName = ctx.getWebhookName();

		// Handle Agent Card request (GET request)
		if (webhookName === 'setup') {
			return this.handleAgentCardRequest(ctx);
		}

		// Handle JSON-RPC request
		const bodyData = ctx.getBodyData() as IDataObject;

		// Validate JSON-RPC request
		const validation = validateJsonRpcRequest(bodyData);
		if (!validation.valid || !validation.request) {
			return this.sendJsonRpcResponse(ctx, validation.error ?? {}, 400);
		}

		const request = validation.request;

		// Route based on method
		switch (request.method) {
			case 'message/send':
				return await this.handleMessageSend(ctx, request as JsonRpcRequest<A2AMessageSendParams>);

			case 'tasks/get':
				return await this.handleTasksGet(ctx, request);

			case 'tasks/cancel':
				// Not implemented in minimal version
				return this.sendJsonRpcResponse(
					ctx,
					createJsonRpcErrorResponse(
						request.id,
						JsonRpcErrorCodes.UNSUPPORTED_OPERATION,
						'tasks/cancel is not supported in this version',
					),
				);

			default:
				return this.sendJsonRpcResponse(
					ctx,
					createJsonRpcErrorResponse(
						request.id,
						JsonRpcErrorCodes.METHOD_NOT_FOUND,
						`Unknown method: ${request.method}`,
					),
				);
		}
	}
}

import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import {
	ChatHubProxyProvider,
	IChatHubMemoryService,
	ChatHubMemoryEntry,
	INode,
	Workflow,
	UnexpectedError,
	CHAT_TRIGGER_NODE_TYPE,
	CHAT_HUB_MEMORY_TYPE,
	IToolCall,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { ChatHubMemory } from './chat-hub-memory.entity';
import { ChatHubMemoryRepository } from './chat-hub-memory.repository';
import { ChatHubSessionRepository } from './chat-session.repository';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

const ALLOWED_NODES = [CHAT_HUB_MEMORY_TYPE] as const;
const NAME_FALLBACK = 'Workflow Chat';

type AllowedNode = (typeof ALLOWED_NODES)[number];

export function isAllowedNode(s: string): s is AllowedNode {
	return ALLOWED_NODES.includes(s as AllowedNode);
}

@Service()
export class ChatHubProxyService implements ChatHubProxyProvider {
	constructor(
		private readonly memoryRepository: ChatHubMemoryRepository,
		private readonly sessionRepository: ChatHubSessionRepository,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('chat-hub');
	}

	private validateRequest(node: INode) {
		if (!isAllowedNode(node.type)) {
			throw new UnexpectedError('This proxy is only available for Chat Hub Memory nodes');
		}
	}

	async getChatHubProxy(
		workflow: Workflow,
		node: INode,
		sessionId: string,
		memoryNodeId: string,
		turnId: string | null,
		previousTurnIds: string[] | null,
		ownerId?: string,
	): Promise<IChatHubMemoryService> {
		this.validateRequest(node);

		const workflowId = workflow.id;
		const agentName = this.extractAgentName(workflow);
		const service = this.makeChatHubOperations(
			sessionId,
			memoryNodeId,
			turnId,
			previousTurnIds,
			ownerId,
			workflowId,
			agentName,
		);

		await service.ensureSession();

		return service;
	}

	/**
	 * Extract agent name from the chat trigger node's agentName parameter,
	 * falling back to workflow name if not set.
	 */
	private extractAgentName(workflow: Workflow): string {
		const chatTriggerNode = Object.values(workflow.nodes).find(
			(n) => n.type === CHAT_TRIGGER_NODE_TYPE,
		);

		if (
			typeof chatTriggerNode?.parameters?.agentName === 'string' &&
			chatTriggerNode.parameters.agentName.trim() !== ''
		) {
			return String(chatTriggerNode.parameters.agentName);
		}

		if (workflow.name && workflow.name.trim() !== '') {
			return workflow.name;
		}

		return NAME_FALLBACK;
	}

	private makeChatHubOperations(
		sessionId: string,
		memoryNodeId: string,
		providedTurnId: string | null,
		previousTurnIds: string[] | null,
		ownerId: string | undefined,
		workflowId: string | undefined,
		agentName: string,
	): IChatHubMemoryService {
		const memoryRepository = this.memoryRepository;
		const sessionRepository = this.sessionRepository;
		const logger = this.logger;

		// turnId is a correlation ID generated before chat workflow execution starts.
		// It links memory entries created during this execution to the AI message that will be saved later.
		// For manual executions (turnId is null), we generate a random one to enable basic linear history.
		const turnId = providedTurnId ?? uuid();

		return {
			getOwnerId() {
				return ownerId;
			},

			async getMemory(): Promise<ChatHubMemoryEntry[]> {
				let memoryEntries: ChatHubMemory[];

				if (!previousTurnIds) {
					// Manual and Chat trigger executions load all memory for the node
					logger.debug('Loading all memory for node', {
						sessionId,
						memoryNodeId,
					});

					memoryEntries = await memoryRepository.getAllMemoryForNode(sessionId, memoryNodeId);
				} else {
					// Chat Hub executions inject previousTurnIds to only load specified turns of the history
					logger.debug('Loading memory for specified turns', {
						sessionId,
						memoryNodeId,
						previousTurnIds,
					});

					memoryEntries = await memoryRepository.getMemoryByTurnIds(
						sessionId,
						memoryNodeId,
						previousTurnIds,
					);
				}

				return memoryEntries.map((entry) => ({
					id: entry.id,
					role: entry.role,
					content: entry.content,
					name: entry.name,
					createdAt: entry.createdAt,
				}));
			},

			async addHumanMessage(content: string): Promise<void> {
				const id = uuid();
				await memoryRepository.createMemoryEntry({
					id,
					sessionId,
					memoryNodeId,
					turnId,
					role: 'human',
					content: { content },
					name: 'User',
				});
				logger.debug('Added human message to memory', {
					sessionId,
					memoryNodeId,
					memoryId: id,
					turnId,
				});
			},

			async addAIMessage(content: string, toolCalls: IToolCall[]): Promise<void> {
				const id = uuid();
				await memoryRepository.createMemoryEntry({
					id,
					sessionId,
					memoryNodeId,
					turnId,
					role: 'ai',
					content: { content, toolCalls },
					name: 'AI',
				});
				logger.debug('Added AI message to memory', {
					sessionId,
					memoryNodeId,
					memoryId: id,
					turnId,
				});
			},

			async addToolMessage(
				toolCallId: string,
				toolName: string,
				toolInput: unknown,
				toolOutput: unknown,
			): Promise<void> {
				const id = uuid();
				await memoryRepository.createMemoryEntry({
					id,
					sessionId,
					memoryNodeId,
					turnId,
					role: 'tool',
					content: { toolCallId, toolName, toolInput, toolOutput },
					name: toolName,
				});
				logger.debug('Added tool message to memory', {
					sessionId,
					memoryNodeId,
					memoryId: id,
					toolName,
					turnId,
				});
			},

			async clearMemory(): Promise<void> {
				await memoryRepository.deleteBySessionAndNode(sessionId, memoryNodeId);
				logger.debug('Cleared memory for node', { sessionId, memoryNodeId });
			},

			async ensureSession(): Promise<void> {
				const exists = await sessionRepository.existsById(sessionId, ownerId);
				if (!exists) {
					const sessionTitle = agentName;
					try {
						await sessionRepository.createChatSession({
							id: sessionId,
							ownerId: ownerId ?? null,
							title: sessionTitle,
							lastMessageAt: new Date(),
							tools: [],
							provider: 'n8n',
							credentialId: null,
							model: null,
							workflowId: workflowId ?? null,
							agentId: null,
							agentName,
						});
						logger.debug('Created new chat hub session', {
							sessionId,
							ownerId: ownerId ?? null,
							title: sessionTitle,
							workflowId,
							agentName,
						});
					} catch (error) {
						logger.warn('Failed to create chat hub session', {
							sessionId,
							ownerId: ownerId ?? null,
							error,
						});
						throw new ForbiddenError('You are not allowed to access this session');
					}
				}
			},
		};
	}
}

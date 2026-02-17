import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import {
	ChatMemoryProxyProvider,
	IChatMemoryService,
	ChatMemoryEntry,
	INode,
	Workflow,
	UnexpectedError,
	CHAT_TRIGGER_NODE_TYPE,
	IToolCall,
	MEMORY_BUFFER_WINDOW_NODE_TYPE,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { OwnershipService } from '@/services/ownership.service';

import { ChatMemorySessionRepository } from './chat-memory-session.repository';
import { ChatMemory } from './chat-memory.entity';
import { ChatMemoryRepository } from './chat-memory.repository';

const ALLOWED_NODES = [MEMORY_BUFFER_WINDOW_NODE_TYPE] as const;
const NAME_FALLBACK = 'Workflow Chat';

type AllowedNode = (typeof ALLOWED_NODES)[number];

export function isAllowedNode(s: string): s is AllowedNode {
	return ALLOWED_NODES.includes(s as AllowedNode);
}

@Service()
export class ChatMemoryProxyService implements ChatMemoryProxyProvider {
	constructor(
		private readonly memoryRepository: ChatMemoryRepository,
		private readonly memorySessionRepository: ChatMemorySessionRepository,
		private readonly ownershipService: OwnershipService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('chat-memory');
	}

	private validateRequest(node: INode) {
		if (!isAllowedNode(node.type)) {
			throw new UnexpectedError('This proxy is only available for Chat Hub Memory nodes');
		}
	}

	private async getProjectId(workflow: Workflow): Promise<string> {
		const project = await this.ownershipService.getWorkflowProjectCached(workflow.id);
		return project.id;
	}

	async getChatMemoryProxy(
		workflow: Workflow,
		node: INode,
		sessionKey: string,
		turnId: string | null,
		previousTurnIds: string[] | null,
	): Promise<IChatMemoryService> {
		this.validateRequest(node);

		const workflowId = workflow.id;
		const agentName = this.extractAgentName(workflow);
		const projectId = await this.getProjectId(workflow);
		const service = this.makeChatMemoryOperations(
			sessionKey,
			turnId,
			previousTurnIds,
			projectId,
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

	private makeChatMemoryOperations(
		sessionKey: string,
		providedTurnId: string | null,
		previousTurnIds: string[] | null,
		projectId: string,
		workflowId: string | undefined,
		_agentName: string,
	): IChatMemoryService {
		const memoryRepository = this.memoryRepository;
		const memorySessionRepository = this.memorySessionRepository;
		const logger = this.logger;

		// turnId is a correlation ID generated before chat workflow execution starts.
		// It links memory entries created during this execution to the AI message that will be saved later.
		// For manual executions (turnId is null), we generate a random one to enable basic linear history.
		const turnId = providedTurnId ?? uuid();

		return {
			async getMemory(): Promise<ChatMemoryEntry[]> {
				let memoryEntries: ChatMemory[];

				if (!previousTurnIds) {
					// Manual and Chat trigger executions load all memory for the node
					logger.debug('Loading all memory for node', {
						sessionKey,
					});

					memoryEntries = await memoryRepository.getAllMemoryForNode(sessionKey);
				} else {
					// Chat Hub executions inject previousTurnIds to only load specified turns of the history
					logger.debug('Loading memory for specified turns', {
						sessionKey,
						previousTurnIds,
					});

					memoryEntries = await memoryRepository.getMemoryByTurnIds(sessionKey, previousTurnIds);
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
					sessionKey,
					turnId,
					role: 'human',
					content: { content },
					name: 'User',
				});
				logger.debug('Added human message to memory', {
					sessionKey,
					memoryId: id,
					turnId,
				});
			},

			async addAIMessage(content: string, toolCalls: IToolCall[]): Promise<void> {
				const id = uuid();
				await memoryRepository.createMemoryEntry({
					id,
					sessionKey,
					turnId,
					role: 'ai',
					content: { content, toolCalls },
					name: 'AI',
				});
				logger.debug('Added AI message to memory', {
					sessionKey,
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
					sessionKey,
					turnId,
					role: 'tool',
					content: { toolCallId, toolName, toolInput, toolOutput },
					name: toolName,
				});
				logger.debug('Added tool message to memory', {
					sessionKey,
					memoryId: id,
					toolName,
					turnId,
				});
			},

			async clearMemory(): Promise<void> {
				await memoryRepository.deleteBySessionKey(sessionKey);
				logger.debug('Cleared memory for node', { sessionKey });
			},

			async ensureSession(): Promise<void> {
				const existing = await memorySessionRepository.getBySessionKey(sessionKey);
				if (existing) return;

				await memorySessionRepository.createSession({
					sessionKey,
					projectId,
					workflowId: workflowId ?? null,
				});
				logger.debug('Created new memory session', {
					sessionKey,
					projectId,
					workflowId,
				});
			},
		};
	}
}

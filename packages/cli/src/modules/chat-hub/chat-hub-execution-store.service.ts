import type { ChatHubConversationModel, ChatMessageId, ChatSessionId } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ChatHubConfig, ExecutionsConfig, GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { Cluster, Redis } from 'ioredis';
import { InstanceSettings } from 'n8n-core';

import { RedisClientService } from '@/services/redis-client.service';

import type { NonStreamingResponseMode } from './chat-hub.types';

/**
 * Context stored for a non-streaming chat hub execution.
 * This tracks executions from start to completion (including waiting states).
 */
export interface ChatHubExecutionContext {
	/** The n8n execution ID */
	executionId: string;
	/** Chat session ID */
	sessionId: ChatSessionId;
	/** User ID who triggered the execution */
	userId: string;
	/** Current AI message ID being generated */
	messageId: ChatMessageId;
	/** Previous message ID (human message or prior AI message) */
	previousMessageId: ChatMessageId | null;
	/** The conversation model configuration */
	model: ChatHubConversationModel;
	/** Response mode: 'lastNode' or 'responseNodes' */
	responseMode: NonStreamingResponseMode;
	/** True when execution is waiting to be resumed later */
	awaitingResume: boolean;
	/** True if a new message needs to be created when execution resumes (resume caused by chat-hub external reasons) */
	createMessageOnResume: boolean;
	/** Workflow ID (for cleanup of temporary workflows) */
	workflowId?: string;
}

/**
 * Service responsible for storing execution context for non-streaming chat hub executions.
 * This enables the event-driven architecture where the watcher service can handle
 * execution completion via lifecycle events.
 *
 * Uses in-memory storage for single-main mode and Redis for multi-main/queue mode.
 */
@Service()
export class ChatHubExecutionStore {
	private readonly memoryStore = new Map<string, ChatHubExecutionContext>();
	private readonly cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();

	private readonly useRedis: boolean;
	private readonly redisPrefix: string;
	private readonly cleanupDelayMs: number;
	private redisClient: Redis | Cluster | null = null;

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly globalConfig: GlobalConfig,
		private readonly chatHubConfig: ChatHubConfig,
		private readonly redisClientService: RedisClientService,
	) {
		this.logger = this.logger.scoped('chat-hub');
		this.useRedis = this.instanceSettings.isMultiMain || this.executionsConfig.mode === 'queue';
		this.redisPrefix = `${this.globalConfig.redis.prefix}:chat-hub:exec:`;
		this.cleanupDelayMs = this.chatHubConfig.executionContextTtl * Time.seconds.toMilliseconds;

		if (this.useRedis) {
			this.redisClient = this.redisClientService.createClient({ type: 'subscriber(n8n)' });
		}
	}

	/**
	 * Register a new execution context
	 */
	async register(context: ChatHubExecutionContext): Promise<void> {
		const { executionId } = context;

		if (this.useRedis) {
			await this.setRedisContext(executionId, context);
		} else {
			this.memoryStore.set(executionId, context);
			this.scheduleCleanup(executionId);
		}
	}

	/**
	 * Get execution context by execution ID
	 */
	async get(executionId: string): Promise<ChatHubExecutionContext | null> {
		if (this.useRedis) {
			return await this.getRedisContext(executionId);
		}
		return this.memoryStore.get(executionId) ?? null;
	}

	/**
	 * Update an existing execution context
	 */
	async update(
		executionId: string,
		updates: Partial<Omit<ChatHubExecutionContext, 'executionId'>>,
	): Promise<void> {
		const context = await this.get(executionId);
		if (!context) {
			this.logger.warn(`Attempted to update non-existent execution context: ${executionId}`);
			return;
		}

		const updatedContext = { ...context, ...updates };

		if (this.useRedis) {
			await this.setRedisContext(executionId, updatedContext);
		} else {
			this.memoryStore.set(executionId, updatedContext);
			// Reset cleanup timer
			this.scheduleCleanup(executionId);
		}
	}

	/**
	 * Remove an execution context
	 */
	async remove(executionId: string): Promise<void> {
		if (this.useRedis) {
			await this.deleteRedisContext(executionId);
		} else {
			this.memoryStore.delete(executionId);
			this.cancelCleanup(executionId);
		}
	}

	/**
	 * Clean up on shutdown
	 */
	@OnShutdown()
	shutdown(): void {
		// Clear all cleanup timers
		for (const timer of this.cleanupTimers.values()) {
			clearTimeout(timer);
		}
		this.cleanupTimers.clear();
		this.memoryStore.clear();

		// Disconnect Redis client
		if (this.redisClient) {
			this.redisClient.disconnect();
		}
	}

	private getContextKey(executionId: string): string {
		return `${this.redisPrefix}${executionId}`;
	}

	private async getRedisContext(executionId: string): Promise<ChatHubExecutionContext | null> {
		if (!this.redisClient) return null;

		try {
			const data = await this.redisClient.get(this.getContextKey(executionId));
			if (!data) return null;
			return JSON.parse(data) as ChatHubExecutionContext;
		} catch (error) {
			this.logger.error(`Failed to get Redis context for execution ${executionId}`, { error });
			return null;
		}
	}

	private async setRedisContext(
		executionId: string,
		context: ChatHubExecutionContext,
	): Promise<void> {
		if (!this.redisClient) return;

		try {
			await this.redisClient.set(
				this.getContextKey(executionId),
				JSON.stringify(context),
				'EX',
				this.chatHubConfig.executionContextTtl,
			);
		} catch (error) {
			this.logger.error(`Failed to set Redis context for execution ${executionId}`, { error });
		}
	}

	private async deleteRedisContext(executionId: string): Promise<void> {
		if (!this.redisClient) return;

		try {
			await this.redisClient.del(this.getContextKey(executionId));
		} catch (error) {
			this.logger.error(`Failed to delete Redis context for execution ${executionId}`, { error });
		}
	}

	private scheduleCleanup(executionId: string): void {
		this.cancelCleanup(executionId);

		const timer = setTimeout(() => {
			this.memoryStore.delete(executionId);
			this.cleanupTimers.delete(executionId);
			this.logger.debug(`Cleaned up expired execution context for ${executionId}`);
		}, this.cleanupDelayMs);

		this.cleanupTimers.set(executionId, timer);
	}

	private cancelCleanup(executionId: string): void {
		const timer = this.cleanupTimers.get(executionId);
		if (timer) {
			clearTimeout(timer);
			this.cleanupTimers.delete(executionId);
		}
	}
}

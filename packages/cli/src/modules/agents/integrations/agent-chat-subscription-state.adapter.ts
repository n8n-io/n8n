import type { AgentIntegrationConfig } from '@n8n/api-types';
import type { Lock, QueueEntry, StateAdapter } from 'chat';

import type { PubSubCommandMap } from '@/scaling/pubsub/pubsub.event-map';

import {
	type AgentChatSubscriptionRepository,
	type AgentChatSubscriptionScope,
} from '../repositories/agent-chat-subscription.repository';

export type SubscriptionAction = PubSubCommandMap['agent-chat-subscription-changed']['action'];

const NEGATIVE_SUBSCRIPTION_CACHE_TTL_MS = 30_000;

export function scopeKey(scope: AgentChatSubscriptionScope): string {
	return `${scope.agentId}:${scope.integrationType}:${scope.credentialId}`;
}

export class AgentChatSubscriptionStateAdapter implements StateAdapter {
	private connected = false;

	private readonly negativeSubscriptionCache = new Map<string, number>();

	constructor(
		private readonly scope: AgentChatSubscriptionScope,
		private readonly integration: AgentIntegrationConfig,
		private readonly delegate: StateAdapter,
		private readonly repository: AgentChatSubscriptionRepository,
		private readonly publishChange: (
			integration: AgentIntegrationConfig,
			threadId: string,
			action: SubscriptionAction,
		) => Promise<void>,
		private readonly onDisconnect: (state: AgentChatSubscriptionStateAdapter) => void,
	) {}

	get key(): string {
		return scopeKey(this.scope);
	}

	async connect(): Promise<void> {
		await this.delegate.connect();
		this.connected = true;
		this.negativeSubscriptionCache.clear();
		for (const threadId of await this.repository.listThreadIdsForConnection(this.scope)) {
			await this.delegate.subscribe(threadId);
		}
	}

	async disconnect(): Promise<void> {
		try {
			await this.delegate.disconnect();
		} finally {
			this.connected = false;
			this.onDisconnect(this);
		}
	}

	async subscribe(threadId: string): Promise<void> {
		await this.repository.subscribe(this.scope, threadId);
		this.negativeSubscriptionCache.delete(threadId);
		await this.delegate.subscribe(threadId);
		await this.publishChange(this.integration, threadId, 'subscribe');
	}

	async unsubscribe(threadId: string): Promise<void> {
		await this.repository.unsubscribe(this.scope, threadId);
		await this.delegate.unsubscribe(threadId);
		this.rememberNegativeSubscription(threadId);
		await this.publishChange(this.integration, threadId, 'unsubscribe');
	}

	async isSubscribed(threadId: string): Promise<boolean> {
		if (await this.delegate.isSubscribed(threadId)) return true;
		if (!this.connected) return false;

		if (this.hasFreshNegativeSubscription(threadId)) return false;

		if (await this.repository.isSubscribed(this.scope, threadId)) {
			this.negativeSubscriptionCache.delete(threadId);
			await this.delegate.subscribe(threadId);
			return true;
		}

		this.rememberNegativeSubscription(threadId);
		return false;
	}

	async applyRemoteChange(threadId: string, action: SubscriptionAction): Promise<void> {
		if (!this.connected) return;
		if (action === 'subscribe') {
			this.negativeSubscriptionCache.delete(threadId);
			await this.delegate.subscribe(threadId);
			return;
		}
		await this.delegate.unsubscribe(threadId);
		this.rememberNegativeSubscription(threadId);
	}

	private hasFreshNegativeSubscription(threadId: string): boolean {
		const expiresAt = this.negativeSubscriptionCache.get(threadId);
		if (expiresAt === undefined) return false;
		if (expiresAt > Date.now()) return true;
		this.negativeSubscriptionCache.delete(threadId);
		return false;
	}

	private rememberNegativeSubscription(threadId: string): void {
		const now = Date.now();
		this.pruneExpiredNegativeSubscriptions(now);
		this.negativeSubscriptionCache.set(threadId, now + NEGATIVE_SUBSCRIPTION_CACHE_TTL_MS);
	}

	private pruneExpiredNegativeSubscriptions(now: number): void {
		for (const [threadId, expiresAt] of this.negativeSubscriptionCache) {
			if (expiresAt <= now) this.negativeSubscriptionCache.delete(threadId);
		}
	}

	async acquireLock(threadId: string, ttlMs: number): Promise<Lock | null> {
		return await this.delegate.acquireLock(threadId, ttlMs);
	}

	async appendToList(
		key: string,
		value: unknown,
		options?: { maxLength?: number; ttlMs?: number },
	): Promise<void> {
		await this.delegate.appendToList(key, value, options);
	}

	async delete(key: string): Promise<void> {
		await this.delegate.delete(key);
	}

	async dequeue(threadId: string): Promise<QueueEntry | null> {
		return await this.delegate.dequeue(threadId);
	}

	async enqueue(threadId: string, entry: QueueEntry, maxSize: number): Promise<number> {
		return await this.delegate.enqueue(threadId, entry, maxSize);
	}

	async extendLock(lock: Lock, ttlMs: number): Promise<boolean> {
		return await this.delegate.extendLock(lock, ttlMs);
	}

	async forceReleaseLock(threadId: string): Promise<void> {
		await this.delegate.forceReleaseLock(threadId);
	}

	async get<T = unknown>(key: string): Promise<T | null> {
		return await this.delegate.get<T>(key);
	}

	async getList<T = unknown>(key: string): Promise<T[]> {
		return await this.delegate.getList<T>(key);
	}

	async queueDepth(threadId: string): Promise<number> {
		return await this.delegate.queueDepth(threadId);
	}

	async releaseLock(lock: Lock): Promise<void> {
		await this.delegate.releaseLock(lock);
	}

	async set<T = unknown>(key: string, value: T, ttlMs?: number): Promise<void> {
		await this.delegate.set<T>(key, value, ttlMs);
	}

	async setIfNotExists(key: string, value: unknown, ttlMs?: number): Promise<boolean> {
		return await this.delegate.setIfNotExists(key, value, ttlMs);
	}
}

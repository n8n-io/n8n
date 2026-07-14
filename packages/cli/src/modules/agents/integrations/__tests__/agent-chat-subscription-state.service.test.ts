import type { Mocked } from 'vitest';
import type { GlobalConfig } from '@n8n/config';
import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'vitest-mock-extended';
import type { StateAdapter, Lock, QueueEntry } from 'chat';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

import { AgentChatSubscriptionStateService } from '../agent-chat-subscription-state.service';
import type { AgentChatSubscriptionRepository } from '../../repositories/agent-chat-subscription.repository';
import type { AgentIntegrationConfig } from '@n8n/api-types';

const slackIntegration: AgentIntegrationConfig = {
	type: 'slack',
	credentialId: 'cred-1',
};

function makeDelegate(): Mocked<StateAdapter> {
	const subscriptions = new Set<string>();
	const delegate = {
		connect: vi.fn().mockResolvedValue(undefined),
		disconnect: vi.fn().mockResolvedValue(undefined),
		subscribe: vi.fn(async (threadId: string) => {
			subscriptions.add(threadId);
		}),
		unsubscribe: vi.fn(async (threadId: string) => {
			subscriptions.delete(threadId);
		}),
		isSubscribed: vi.fn(async (threadId: string) => subscriptions.has(threadId)),
		acquireLock: vi.fn(async () => null as Lock | null),
		appendToList: vi.fn().mockResolvedValue(undefined),
		delete: vi.fn().mockResolvedValue(undefined),
		dequeue: vi.fn(async () => null as QueueEntry | null),
		enqueue: vi.fn(async () => 1),
		extendLock: vi.fn(async () => true),
		forceReleaseLock: vi.fn().mockResolvedValue(undefined),
		get: vi.fn(async () => null),
		getList: vi.fn(async () => []),
		queueDepth: vi.fn(async () => 0),
		releaseLock: vi.fn().mockResolvedValue(undefined),
		set: vi.fn().mockResolvedValue(undefined),
		setIfNotExists: vi.fn(async () => true),
	};
	return delegate as unknown as Mocked<StateAdapter>;
}

function makeService(multiMainEnabled = true) {
	const repository = mock<AgentChatSubscriptionRepository>();
	repository.listThreadIdsForConnection.mockResolvedValue([]);
	repository.isSubscribed.mockResolvedValue(false);
	const publisher = mock<Publisher>();
	publisher.publishCommand.mockResolvedValue(undefined);
	const globalConfig = mock<GlobalConfig>({
		multiMainSetup: { enabled: multiMainEnabled },
	} as Partial<GlobalConfig>);
	const logger = mockLogger();
	const service = new AgentChatSubscriptionStateService(
		logger,
		repository,
		publisher,
		globalConfig,
	);

	return { service, repository, publisher, logger };
}

describe('AgentChatSubscriptionStateService', () => {
	it('reloads persisted subscriptions from the DB on connect, then serves known subscriptions from memory', async () => {
		const { service, repository } = makeService();
		repository.listThreadIdsForConnection.mockResolvedValue(['thread-1', 'thread-2']);
		const delegate = makeDelegate();

		const state = service.createStateAdapter({
			agentId: 'agent-1',
			integration: slackIntegration,
			delegate,
		});

		// Before connect the in-memory delegate is cold: a persisted thread is not
		// yet known, and no DB read has happened.
		await expect(state.isSubscribed('thread-1')).resolves.toBe(false);
		expect(repository.listThreadIdsForConnection).not.toHaveBeenCalled();

		await state.connect();

		// connect() performs a single DB read and hydrates the delegate from it.
		expect(repository.listThreadIdsForConnection).toHaveBeenCalledTimes(1);
		expect(delegate.connect).toHaveBeenCalledTimes(1);
		expect(delegate.subscribe).toHaveBeenCalledWith('thread-1');
		expect(delegate.subscribe).toHaveBeenCalledWith('thread-2');

		// After hydration every check is served from the in-memory delegate — the
		// DB is never consulted again, no matter how many times we check.
		await expect(state.isSubscribed('thread-1')).resolves.toBe(true);
		await expect(state.isSubscribed('thread-2')).resolves.toBe(true);
		expect(repository.isSubscribed).not.toHaveBeenCalled();
		expect(repository.listThreadIdsForConnection).toHaveBeenCalledTimes(1);
	});

	it('falls back to the DB on a memory miss and hydrates the local delegate when found', async () => {
		const { service, repository } = makeService();
		repository.isSubscribed.mockResolvedValue(true);
		const delegate = makeDelegate();
		const state = service.createStateAdapter({
			agentId: 'agent-1',
			integration: slackIntegration,
			delegate,
		});
		await state.connect();
		delegate.subscribe.mockClear();

		await expect(state.isSubscribed('thread-from-peer')).resolves.toBe(true);

		expect(repository.isSubscribed).toHaveBeenCalledWith(
			{
				agentId: 'agent-1',
				integrationType: 'slack',
				credentialId: 'cred-1',
			},
			'thread-from-peer',
		);
		expect(delegate.subscribe).toHaveBeenCalledWith('thread-from-peer');

		repository.isSubscribed.mockClear();
		delegate.subscribe.mockClear();

		await expect(state.isSubscribed('thread-from-peer')).resolves.toBe(true);
		expect(repository.isSubscribed).not.toHaveBeenCalled();
		expect(delegate.subscribe).not.toHaveBeenCalled();
	});

	it('negative-caches DB misses briefly, then retries after the cache expires', async () => {
		const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000);
		try {
			const { service, repository } = makeService();
			repository.isSubscribed.mockResolvedValue(false);
			const state = service.createStateAdapter({
				agentId: 'agent-1',
				integration: slackIntegration,
				delegate: makeDelegate(),
			});
			await state.connect();

			await expect(state.isSubscribed('unknown-thread')).resolves.toBe(false);
			await expect(state.isSubscribed('unknown-thread')).resolves.toBe(false);
			expect(repository.isSubscribed).toHaveBeenCalledTimes(1);

			repository.isSubscribed.mockResolvedValue(true);
			dateNowSpy.mockReturnValue(31_001);

			await expect(state.isSubscribed('unknown-thread')).resolves.toBe(true);
			expect(repository.isSubscribed).toHaveBeenCalledTimes(2);
		} finally {
			dateNowSpy.mockRestore();
		}
	});

	it('prunes expired negative-cache entries when recording a new miss', async () => {
		const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000);
		try {
			const { service, repository } = makeService();
			repository.isSubscribed.mockResolvedValue(false);
			const state = service.createStateAdapter({
				agentId: 'agent-1',
				integration: slackIntegration,
				delegate: makeDelegate(),
			});
			await state.connect();

			await expect(state.isSubscribed('stale-thread-1')).resolves.toBe(false);
			await expect(state.isSubscribed('stale-thread-2')).resolves.toBe(false);

			const negativeSubscriptionCache = (
				state as unknown as { negativeSubscriptionCache: Map<string, number> }
			).negativeSubscriptionCache;
			expect([...negativeSubscriptionCache.keys()]).toEqual(['stale-thread-1', 'stale-thread-2']);

			dateNowSpy.mockReturnValue(31_001);

			await expect(state.isSubscribed('fresh-thread')).resolves.toBe(false);

			expect([...negativeSubscriptionCache.keys()]).toEqual(['fresh-thread']);
		} finally {
			dateNowSpy.mockRestore();
		}
	});

	it('persists and broadcasts subscriptions in multi-main mode', async () => {
		const { service, repository, publisher } = makeService(true);
		const delegate = makeDelegate();
		const state = service.createStateAdapter({
			agentId: 'agent-1',
			integration: slackIntegration,
			delegate,
		});
		await state.connect();

		await state.subscribe('thread-1');

		expect(repository.subscribe).toHaveBeenCalledWith(
			{
				agentId: 'agent-1',
				integrationType: 'slack',
				credentialId: 'cred-1',
			},
			'thread-1',
		);
		expect(delegate.subscribe).toHaveBeenCalledWith('thread-1');
		expect(publisher.publishCommand).toHaveBeenCalledWith({
			command: 'agent-chat-subscription-changed',
			payload: {
				agentId: 'agent-1',
				integration: slackIntegration,
				threadId: 'thread-1',
				action: 'subscribe',
			},
		});
	});

	it('does not publish subscription changes when multi-main is disabled', async () => {
		const { service, publisher } = makeService(false);
		const state = service.createStateAdapter({
			agentId: 'agent-1',
			integration: slackIntegration,
			delegate: makeDelegate(),
		});
		await state.connect();

		await state.subscribe('thread-1');

		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});

	it('applies remote subscription changes to active local state without rebroadcasting', async () => {
		const { service, publisher } = makeService(true);
		const delegate = makeDelegate();
		const state = service.createStateAdapter({
			agentId: 'agent-1',
			integration: slackIntegration,
			delegate,
		});
		await state.connect();
		publisher.publishCommand.mockClear();

		await service.handleSubscriptionChanged({
			agentId: 'agent-1',
			integration: slackIntegration,
			threadId: 'thread-1',
			action: 'subscribe',
		});

		expect(delegate.subscribe).toHaveBeenCalledWith('thread-1');
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});

	it('persists the removal and broadcasts an unsubscribe in multi-main mode', async () => {
		const { service, repository, publisher } = makeService(true);
		const delegate = makeDelegate();
		const state = service.createStateAdapter({
			agentId: 'agent-1',
			integration: slackIntegration,
			delegate,
		});
		await state.connect();
		await state.subscribe('thread-1');
		publisher.publishCommand.mockClear();

		await state.unsubscribe('thread-1');

		expect(repository.unsubscribe).toHaveBeenCalledWith(
			{
				agentId: 'agent-1',
				integrationType: 'slack',
				credentialId: 'cred-1',
			},
			'thread-1',
		);
		expect(delegate.unsubscribe).toHaveBeenCalledWith('thread-1');
		await expect(state.isSubscribed('thread-1')).resolves.toBe(false);
		expect(publisher.publishCommand).toHaveBeenCalledWith({
			command: 'agent-chat-subscription-changed',
			payload: {
				agentId: 'agent-1',
				integration: slackIntegration,
				threadId: 'thread-1',
				action: 'unsubscribe',
			},
		});
	});

	it('applies a remote unsubscribe to active local state without rebroadcasting', async () => {
		const { service, publisher } = makeService(true);
		const delegate = makeDelegate();
		const state = service.createStateAdapter({
			agentId: 'agent-1',
			integration: slackIntegration,
			delegate,
		});
		await state.connect();
		await state.subscribe('thread-1');
		publisher.publishCommand.mockClear();

		await service.handleSubscriptionChanged({
			agentId: 'agent-1',
			integration: slackIntegration,
			threadId: 'thread-1',
			action: 'unsubscribe',
		});

		expect(delegate.unsubscribe).toHaveBeenCalledWith('thread-1');
		await expect(state.isSubscribed('thread-1')).resolves.toBe(false);
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});

	it('ignores remote subscription changes before the adapter is connected', async () => {
		const { service } = makeService(true);
		const delegate = makeDelegate();
		// Deliberately skip connect() — the adapter is registered but not live yet.
		service.createStateAdapter({
			agentId: 'agent-1',
			integration: slackIntegration,
			delegate,
		});

		await service.handleSubscriptionChanged({
			agentId: 'agent-1',
			integration: slackIntegration,
			threadId: 'thread-1',
			action: 'subscribe',
		});

		expect(delegate.subscribe).not.toHaveBeenCalled();
	});

	it('unregisters the adapter on disconnect so later remote changes are dropped', async () => {
		const { service } = makeService(true);
		const delegate = makeDelegate();
		const state = service.createStateAdapter({
			agentId: 'agent-1',
			integration: slackIntegration,
			delegate,
		});
		await state.connect();

		await state.disconnect();
		delegate.subscribe.mockClear();

		await service.handleSubscriptionChanged({
			agentId: 'agent-1',
			integration: slackIntegration,
			threadId: 'thread-1',
			action: 'subscribe',
		});

		expect(delegate.disconnect).toHaveBeenCalledTimes(1);
		expect(delegate.subscribe).not.toHaveBeenCalled();
	});

	it('swallows and logs a failure to publish a subscription change', async () => {
		const { service, repository, publisher, logger } = makeService(true);
		publisher.publishCommand.mockRejectedValueOnce(new Error('redis down'));
		const delegate = makeDelegate();
		const state = service.createStateAdapter({
			agentId: 'agent-1',
			integration: slackIntegration,
			delegate,
		});
		await state.connect();

		// The local subscription still succeeds even though the broadcast fails.
		await expect(state.subscribe('thread-1')).resolves.toBeUndefined();

		expect(repository.subscribe).toHaveBeenCalledWith(
			{
				agentId: 'agent-1',
				integrationType: 'slack',
				credentialId: 'cred-1',
			},
			'thread-1',
		);
		expect(delegate.subscribe).toHaveBeenCalledWith('thread-1');
		expect(logger.warn).toHaveBeenCalledWith(
			'[AgentChatSubscriptionStateService] Failed to publish subscription change',
			expect.objectContaining({ threadId: 'thread-1', action: 'subscribe', error: 'redis down' }),
		);
	});

	it('deletes persisted subscriptions for an integration connection', async () => {
		const { service, repository } = makeService();

		await service.deleteSubscriptionsForIntegration('agent-1', slackIntegration);

		expect(repository.deleteForConnection).toHaveBeenCalledWith({
			agentId: 'agent-1',
			integrationType: 'slack',
			credentialId: 'cred-1',
		});
	});
});

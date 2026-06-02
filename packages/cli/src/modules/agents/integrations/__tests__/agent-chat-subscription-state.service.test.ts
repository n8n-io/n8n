import type { GlobalConfig } from '@n8n/config';
import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';
import type { StateAdapter, Lock, QueueEntry } from 'chat';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

import { AgentChatSubscriptionStateService } from '../agent-chat-subscription-state.service';
import type { AgentChatSubscriptionRepository } from '../../repositories/agent-chat-subscription.repository';
import type { AgentIntegrationConfig } from '@n8n/api-types';

const slackIntegration: AgentIntegrationConfig = {
	type: 'slack',
	credentialId: 'cred-1',
};

function makeDelegate(): jest.Mocked<StateAdapter> {
	const subscriptions = new Set<string>();
	const delegate = {
		connect: jest.fn().mockResolvedValue(undefined),
		disconnect: jest.fn().mockResolvedValue(undefined),
		subscribe: jest.fn(async (threadId: string) => {
			subscriptions.add(threadId);
		}),
		unsubscribe: jest.fn(async (threadId: string) => {
			subscriptions.delete(threadId);
		}),
		isSubscribed: jest.fn(async (threadId: string) => subscriptions.has(threadId)),
		acquireLock: jest.fn(async () => null as Lock | null),
		appendToList: jest.fn().mockResolvedValue(undefined),
		delete: jest.fn().mockResolvedValue(undefined),
		dequeue: jest.fn(async () => null as QueueEntry | null),
		enqueue: jest.fn(async () => 1),
		extendLock: jest.fn(async () => true),
		forceReleaseLock: jest.fn().mockResolvedValue(undefined),
		get: jest.fn(async () => null),
		getList: jest.fn(async () => []),
		queueDepth: jest.fn(async () => 0),
		releaseLock: jest.fn().mockResolvedValue(undefined),
		set: jest.fn().mockResolvedValue(undefined),
		setIfNotExists: jest.fn(async () => true),
	};
	return delegate as unknown as jest.Mocked<StateAdapter>;
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
	const service = new AgentChatSubscriptionStateService(
		mockLogger(),
		repository,
		publisher,
		globalConfig,
	);

	return { service, repository, publisher };
}

describe('AgentChatSubscriptionStateService', () => {
	it('hydrates persisted subscriptions into a new active state adapter', async () => {
		const { service, repository } = makeService();
		repository.listThreadIdsForConnection.mockResolvedValue(['thread-1', 'thread-2']);
		repository.isSubscribed.mockResolvedValue(true);
		const delegate = makeDelegate();

		const state = service.createStateAdapter({
			agentId: 'agent-1',
			integration: slackIntegration,
			delegate,
		});

		await state.connect();

		expect(delegate.connect).toHaveBeenCalledTimes(1);
		expect(delegate.subscribe).toHaveBeenCalledWith('thread-1');
		expect(delegate.subscribe).toHaveBeenCalledWith('thread-2');
		await expect(state.isSubscribed('thread-1')).resolves.toBe(true);
		expect(repository.isSubscribed).toHaveBeenCalledWith(
			{
				agentId: 'agent-1',
				integrationType: 'slack',
				credentialId: 'cred-1',
			},
			'thread-1',
		);
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
});

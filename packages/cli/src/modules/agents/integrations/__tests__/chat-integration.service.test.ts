import type { Mock, MockInstance } from 'vitest';
import type { Logger } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type { CredentialsEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import type { StateAdapter } from 'chat';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { Publisher } from '@/scaling/pubsub/publisher.service';
import type { UrlService } from '@/services/url.service';

import { AgentExecutionOrchestratorService } from '../../agent-execution-orchestrator.service';
import type { Agent } from '../../entities/agent.entity';
import type { AgentRepository } from '../../repositories/agent.repository';
import { AgentChatBridge } from '../agent-chat-bridge';
import {
	AgentChatIntegration,
	ChatIntegrationRegistry,
	type AgentChatIntegrationContext,
} from '../agent-chat-integration';
import type { AgentChatSubscriptionStateService } from '../agent-chat-subscription-state.service';
import { ChatIntegrationService } from '../chat-integration.service';
import * as esmLoader from '../esm-loader';
import {
	LEADER_CHANNEL_REQUEST_TIMEOUT_MS,
	type LeaderChannelRelayService,
} from '../leader-channel-relay.service';
import type { AgentIntegrationConfig } from '@n8n/api-types';

/**
 * The peer-reconciliation and leader-request handlers deliberately call the
 * local-only variants, so the spies have to reach past the routing wrappers.
 */
interface PrivateChannelMethods {
	connectLocal: ChatIntegrationService['connect'];
	disconnectLocal: (
		agentId: string,
		integration: { credentialId: string; type: string },
		options?: { skipExternalHooks?: boolean },
	) => Promise<void>;
	disconnectOne: (key: string, options?: { skipExternalHooks?: boolean }) => Promise<void>;
}

const spyOnPrivate = <K extends keyof PrivateChannelMethods>(
	service: ChatIntegrationService,
	method: K,
) => vi.spyOn(service as unknown as PrivateChannelMethods, method);

/**
 * Test double — exposes the registry without invoking the real Chat SDK
 * adapters. We never call `createAdapter()` in these tests because we stub
 * `connect()` itself.
 */
class FakeIntegration extends AgentChatIntegration {
	constructor(
		readonly type: string,
		private readonly leaderOnly: boolean,
	) {
		super();
	}

	readonly credentialTypes = [`${this.type}Api`];
	readonly displayLabel = this.type;
	readonly displayIcon = this.type;

	override requiresLeader({ ingressEnabled } = { ingressEnabled: true }): boolean {
		// Mirrors the real integrations: an outbound connection opens no poller.
		return this.leaderOnly && ingressEnabled;
	}

	async createAdapter(_ctx: AgentChatIntegrationContext): Promise<unknown> {
		throw new Error('createAdapter should not be invoked from these tests');
	}
}

function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		id: 'agent-1',
		projectId: 'project-1',
		integrations: [],
		activeVersionId: null,
		activeVersion: null,
		...overrides,
	} as unknown as Agent;
}

const slackIntegration: AgentIntegrationConfig = {
	type: 'slack',
	credentialId: 'cred-1',
};

const linearIntegration: AgentIntegrationConfig = {
	type: 'linear',
	credentialId: 'cred-2',
};

const telegramIntegration: AgentIntegrationConfig = {
	type: 'telegram',
	credentialId: 'cred-3',
	settings: {
		accessMode: 'public',
		allowedUsers: [],
	},
};

/** Configures a CredentialsService mock so `decryptCredentialForProject` finds `cred`. */
function mockProjectCredential(
	credentialsService: ReturnType<typeof mock<CredentialsService>>,
	cred: CredentialsEntity,
) {
	credentialsService.findAllCredentialIdsForProject.mockResolvedValue([cred]);
	credentialsService.findAllGlobalCredentialIds.mockResolvedValue([]);
	credentialsService.decrypt.mockResolvedValue({});
}

function buildServiceWith(
	opts: {
		isLeader?: boolean;
		multiMainEnabled?: boolean;
		registry?: ChatIntegrationRegistry;
		agentRepository?: ReturnType<typeof mock<AgentRepository>>;
		credentialsService?: ReturnType<typeof mock<CredentialsService>>;
		publisher?: ReturnType<typeof mock<Publisher>>;
		urlService?: ReturnType<typeof mock<UrlService>>;
		chatSubscriptionStateService?: ReturnType<typeof mock<AgentChatSubscriptionStateService>>;
		leaderChannelRelay?: ReturnType<typeof mock<LeaderChannelRelayService>>;
	} = {},
) {
	const registry = opts.registry ?? new ChatIntegrationRegistry();
	const agentRepository = opts.agentRepository ?? mock<AgentRepository>();
	const credentialsService = opts.credentialsService ?? mock<CredentialsService>();
	const publisher = opts.publisher ?? mock<Publisher>();
	const urlService = opts.urlService ?? mock<UrlService>();
	const chatSubscriptionStateService =
		opts.chatSubscriptionStateService ?? mock<AgentChatSubscriptionStateService>();
	const leaderChannelRelay = opts.leaderChannelRelay ?? mock<LeaderChannelRelayService>();
	const logger = mockLogger();
	const instanceSettings = mock<InstanceSettings>({ isLeader: opts.isLeader ?? true });
	const globalConfig = mock<GlobalConfig>({
		multiMainSetup: { enabled: opts.multiMainEnabled ?? false },
	} as Partial<GlobalConfig>);

	const service = new ChatIntegrationService(
		logger,
		agentRepository,
		credentialsService,
		urlService,
		registry,
		instanceSettings,
		publisher,
		globalConfig,
		chatSubscriptionStateService,
		leaderChannelRelay,
	);

	return {
		service,
		registry,
		agentRepository,
		credentialsService,
		publisher,
		urlService,
		chatSubscriptionStateService,
		leaderChannelRelay,
		instanceSettings,
		logger,
	};
}

describe('ChatIntegrationService.syncToConfig — publish gate', () => {
	let service: ChatIntegrationService;
	let chatSubscriptionStateService: ReturnType<typeof mock<AgentChatSubscriptionStateService>>;
	let connectSpy: MockInstance;
	let disconnectSpy: MockInstance;
	let broadcastSpy: MockInstance;

	beforeEach(() => {
		Container.reset();
		({ service, chatSubscriptionStateService } = buildServiceWith());
		connectSpy = vi.spyOn(service, 'connect').mockResolvedValue();
		disconnectSpy = vi.spyOn(service, 'disconnect').mockResolvedValue();
		broadcastSpy = vi.spyOn(service, 'broadcastIntegrationChange').mockResolvedValue();
	});

	it('skips connect when the agent is not published', async () => {
		const agent = makeAgent({ activeVersionId: null });

		await service.syncToConfig(agent, [], [slackIntegration]);

		expect(connectSpy).not.toHaveBeenCalled();
	});

	it('still disconnects removed integrations even when the agent is not published', async () => {
		const agent = makeAgent({ activeVersionId: null });

		await service.syncToConfig(agent, [slackIntegration], []);

		expect(disconnectSpy).toHaveBeenCalledWith('agent-1', slackIntegration);
		expect(connectSpy).not.toHaveBeenCalled();
	});

	it('deletes persisted subscriptions when an integration is removed', async () => {
		const agent = makeAgent({ activeVersionId: 'published-version-1' });

		await service.syncToConfig(agent, [slackIntegration], []);

		expect(chatSubscriptionStateService.deleteSubscriptionsForIntegration).toHaveBeenCalledWith(
			'agent-1',
			slackIntegration,
		);
	});

	it('removes only the requested integration from a mixed channel list', async () => {
		const agent = makeAgent({ activeVersionId: 'published-version-1' });

		await service.syncToConfig(
			agent,
			[slackIntegration, linearIntegration, telegramIntegration],
			[slackIntegration, telegramIntegration],
		);

		expect(disconnectSpy).toHaveBeenCalledTimes(1);
		expect(disconnectSpy).toHaveBeenCalledWith('agent-1', linearIntegration);
		expect(chatSubscriptionStateService.deleteSubscriptionsForIntegration).toHaveBeenCalledTimes(1);
		expect(chatSubscriptionStateService.deleteSubscriptionsForIntegration).toHaveBeenCalledWith(
			'agent-1',
			linearIntegration,
		);
	});

	it('disconnects a channel everywhere and removes persisted subscriptions', async () => {
		await service.disconnectChannel('agent-1', slackIntegration);

		expect(disconnectSpy).toHaveBeenCalledWith('agent-1', slackIntegration);
		expect(broadcastSpy).toHaveBeenCalledWith('agent-1', slackIntegration, 'disconnect');
		expect(chatSubscriptionStateService.deleteSubscriptionsForIntegration).toHaveBeenCalledWith(
			'agent-1',
			slackIntegration,
		);
	});

	it('can disconnect a channel while preserving persisted subscriptions', async () => {
		await service.disconnectChannel('agent-1', slackIntegration, { deleteSubscriptions: false });

		expect(disconnectSpy).toHaveBeenCalledWith('agent-1', slackIntegration);
		expect(broadcastSpy).toHaveBeenCalledWith('agent-1', slackIntegration, 'disconnect');
		expect(chatSubscriptionStateService.deleteSubscriptionsForIntegration).not.toHaveBeenCalled();
	});

	it('does not reconnect an already-live integration when republishing', async () => {
		const agent = makeAgent({ activeVersionId: 'published-version-1' });
		const internal = service as unknown as { connections: Map<string, unknown> };
		internal.connections.set('agent-1:slack:cred-1', {});

		await service.syncToConfig(agent, [], [slackIntegration]);

		expect(connectSpy).not.toHaveBeenCalled();
	});
});

describe('ChatIntegrationService', () => {
	const logger = mock<Logger>();

	const buildService = () =>
		new ChatIntegrationService(
			logger,
			mock(),
			mock(),
			mock(),
			mock(),
			mock<InstanceSettings>({ isLeader: true }),
			mock(),
			mock<GlobalConfig>({ multiMainSetup: { enabled: false } } as Partial<GlobalConfig>),
			mock<AgentChatSubscriptionStateService>(),
			mock<LeaderChannelRelayService>(),
		);

	it('disconnects subscription state when setup fails before chat initialization starts', async () => {
		const createAdapter = vi.fn().mockResolvedValue({ name: 'slack' });
		const integration = new FakeIntegration('slack', false);
		(integration as unknown as { createAdapter: typeof createAdapter }).createAdapter =
			createAdapter;
		const registry = new ChatIntegrationRegistry();
		registry.register(integration);

		const credentialsService = mock<CredentialsService>();
		mockProjectCredential(credentialsService, { id: 'cred-1' } as CredentialsEntity);
		const urlService = mock<UrlService>();
		urlService.getWebhookBaseUrl.mockReturnValue('https://n8n.test/');

		const state = mock<StateAdapter>();
		state.disconnect.mockResolvedValue(undefined);
		const chatSubscriptionStateService = mock<AgentChatSubscriptionStateService>();
		chatSubscriptionStateService.createStateAdapter.mockReturnValue(state);

		const loadMemoryStateSpy = vi.spyOn(esmLoader, 'loadMemoryState').mockResolvedValue({
			createMemoryState: vi.fn(() => mock<StateAdapter>()),
		} as never);
		const loadChatSdkSpy = vi.spyOn(esmLoader, 'loadChatSdk').mockResolvedValue({
			Chat: vi.fn(() => {
				throw new Error('chat construction failed');
			}),
		} as never);

		try {
			const { service } = buildServiceWith({
				registry,
				credentialsService,
				urlService,
				chatSubscriptionStateService,
			});

			await expect(service.connect('agent-1', slackIntegration, 'project-1')).rejects.toThrow(
				'chat construction failed',
			);

			expect(chatSubscriptionStateService.createStateAdapter).toHaveBeenCalledTimes(1);
			expect(state.disconnect).toHaveBeenCalledTimes(1);
		} finally {
			loadMemoryStateSpy.mockRestore();
			loadChatSdkSpy.mockRestore();
		}
	});

	it('releases per-connection state when the connect fails', async () => {
		const createAdapter = vi.fn().mockResolvedValue({ name: 'slack' });
		const onDisconnected = vi.fn().mockResolvedValue(undefined);
		const integration = new FakeIntegration('slack', false);
		(integration as unknown as { createAdapter: typeof createAdapter }).createAdapter =
			createAdapter;
		(integration as unknown as { onDisconnected: typeof onDisconnected }).onDisconnected =
			onDisconnected;
		const registry = new ChatIntegrationRegistry();
		registry.register(integration);

		const credentialsService = mock<CredentialsService>();
		mockProjectCredential(credentialsService, { id: 'cred-1' } as CredentialsEntity);
		const urlService = mock<UrlService>();
		urlService.getWebhookBaseUrl.mockReturnValue('https://n8n.test/');

		const state = mock<StateAdapter>();
		state.disconnect.mockResolvedValue(undefined);
		const chatSubscriptionStateService = mock<AgentChatSubscriptionStateService>();
		chatSubscriptionStateService.createStateAdapter.mockReturnValue(state);

		const loadMemoryStateSpy = vi.spyOn(esmLoader, 'loadMemoryState').mockResolvedValue({
			createMemoryState: vi.fn(() => mock<StateAdapter>()),
		} as never);
		const loadChatSdkSpy = vi.spyOn(esmLoader, 'loadChatSdk').mockResolvedValue({
			Chat: vi.fn(() => {
				throw new Error('chat construction failed');
			}),
		} as never);

		try {
			const { service } = buildServiceWith({
				registry,
				credentialsService,
				urlService,
				chatSubscriptionStateService,
			});

			await expect(service.connect('agent-1', slackIntegration, 'project-1')).rejects.toThrow(
				'chat construction failed',
			);

			expect(onDisconnected).toHaveBeenCalledTimes(1);
			expect(onDisconnected).toHaveBeenCalledWith(
				expect.objectContaining({
					agentId: 'agent-1',
					projectId: 'project-1',
					credentialId: 'cred-1',
				}),
			);
		} finally {
			loadMemoryStateSpy.mockRestore();
			loadChatSdkSpy.mockRestore();
		}
	});

	describe('connect — project-scoped credential resolution', () => {
		it('connects using a project-accessible credential without any user', async () => {
			const createAdapter = vi.fn().mockResolvedValue({ name: 'slack' });
			const integration = new FakeIntegration('slack', false);
			(integration as unknown as { createAdapter: typeof createAdapter }).createAdapter =
				createAdapter;
			const registry = new ChatIntegrationRegistry();
			registry.register(integration);

			const cred = { id: 'cred-1' } as CredentialsEntity;
			const credentialsService = mock<CredentialsService>();
			mockProjectCredential(credentialsService, cred);
			const urlService = mock<UrlService>();
			urlService.getWebhookBaseUrl.mockReturnValue('https://n8n.test/');

			const state = mock<StateAdapter>();
			state.disconnect.mockResolvedValue(undefined);
			const chatSubscriptionStateService = mock<AgentChatSubscriptionStateService>();
			chatSubscriptionStateService.createStateAdapter.mockReturnValue(state);

			const loadMemoryStateSpy = vi.spyOn(esmLoader, 'loadMemoryState').mockResolvedValue({
				createMemoryState: vi.fn(() => mock<StateAdapter>()),
			} as never);
			// Chat construction is unrelated to credential resolution — fail fast
			// here so the test doesn't need to stand up the full bridge/orchestrator.
			const loadChatSdkSpy = vi.spyOn(esmLoader, 'loadChatSdk').mockResolvedValue({
				Chat: vi.fn(() => {
					throw new Error('chat construction failed');
				}),
			} as never);

			try {
				const { service } = buildServiceWith({
					registry,
					credentialsService,
					urlService,
					chatSubscriptionStateService,
				});

				await expect(service.connect('agent-1', slackIntegration, 'project-1')).rejects.toThrow(
					'chat construction failed',
				);

				expect(credentialsService.findAllCredentialIdsForProject).toHaveBeenCalledWith('project-1');
				expect(credentialsService.decrypt).toHaveBeenCalledWith(cred, true);
			} finally {
				loadMemoryStateSpy.mockRestore();
				loadChatSdkSpy.mockRestore();
			}
		});

		it('fails to connect when the credential is not accessible to the project', async () => {
			const createAdapter = vi.fn();
			const integration = new FakeIntegration('slack', false);
			(integration as unknown as { createAdapter: typeof createAdapter }).createAdapter =
				createAdapter;
			const registry = new ChatIntegrationRegistry();
			registry.register(integration);

			const credentialsService = mock<CredentialsService>();
			credentialsService.findAllCredentialIdsForProject.mockResolvedValue([]);
			credentialsService.findAllGlobalCredentialIds.mockResolvedValue([]);

			const { service } = buildServiceWith({ registry, credentialsService });

			await expect(service.connect('agent-1', slackIntegration, 'project-1')).rejects.toThrow(
				'not accessible to project',
			);

			expect(createAdapter).not.toHaveBeenCalled();
		});
	});

	describe('disconnectAll', () => {
		it('shuts down every active connection and empties the connection map', async () => {
			const service = buildService();
			const shutdownA = vi.fn().mockResolvedValue(undefined);
			const shutdownB = vi.fn().mockResolvedValue(undefined);

			// Seed two connections via the private map.
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const internal = service as any;
			internal.connections.set('agent-1:slack:cred-1', {
				chat: {
					shutdown: shutdownA,
					webhooks: {},
					onAction: vi.fn(),
					onNewMention: vi.fn(),
					onSubscribedMessage: vi.fn(),
					initialize: vi.fn(),
				},
			});
			internal.connections.set('agent-2:telegram:cred-2', {
				chat: {
					shutdown: shutdownB,
					webhooks: {},
					onAction: vi.fn(),
					onNewMention: vi.fn(),
					onSubscribedMessage: vi.fn(),
					initialize: vi.fn(),
				},
			});

			await service.disconnectAll();

			expect(shutdownA).toHaveBeenCalledTimes(1);
			expect(shutdownB).toHaveBeenCalledTimes(1);
			expect(internal.connections.size).toBe(0);
		});

		it('does not throw when there are no active connections', async () => {
			const service = buildService();
			await expect(service.disconnectAll()).resolves.toBeUndefined();
		});

		it('continues disconnecting remaining connections when one shutdown rejects', async () => {
			const service = buildService();
			const shutdownA = vi.fn().mockRejectedValue(new Error('boom'));
			const shutdownB = vi.fn().mockResolvedValue(undefined);

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const internal = service as any;
			internal.connections.set('agent-1:slack:cred-1', {
				chat: {
					shutdown: shutdownA,
					webhooks: {},
					onAction: vi.fn(),
					onNewMention: vi.fn(),
					onSubscribedMessage: vi.fn(),
					initialize: vi.fn(),
				},
			});
			internal.connections.set('agent-2:telegram:cred-2', {
				chat: {
					shutdown: shutdownB,
					webhooks: {},
					onAction: vi.fn(),
					onNewMention: vi.fn(),
					onSubscribedMessage: vi.fn(),
					initialize: vi.fn(),
				},
			});

			await expect(service.disconnectAll()).resolves.toBeUndefined();

			expect(shutdownA).toHaveBeenCalledTimes(1);
			expect(shutdownB).toHaveBeenCalledTimes(1);
			expect(internal.connections.size).toBe(0);
		});
	});
});

describe('ChatIntegrationService — outbound Preview connections', () => {
	beforeEach(() => {
		Container.reset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('lazily creates and reuses a memory-only outbound connection without enabling ingress', async () => {
		const createAdapter = vi.fn().mockResolvedValue({ name: 'slack' });
		const onBeforeConnect = vi.fn().mockResolvedValue(undefined);
		const onAfterConnect = vi.fn().mockResolvedValue(undefined);
		const integration = new FakeIntegration('slack', false);
		(integration as unknown as { createAdapter: typeof createAdapter }).createAdapter =
			createAdapter;
		(integration as unknown as { onBeforeConnect: typeof onBeforeConnect }).onBeforeConnect =
			onBeforeConnect;
		(integration as unknown as { onAfterConnect: typeof onAfterConnect }).onAfterConnect =
			onAfterConnect;
		const registry = new ChatIntegrationRegistry();
		registry.register(integration);

		const agentRepository = mock<AgentRepository>();
		agentRepository.findOne.mockResolvedValue(
			makeAgent({ integrations: [slackIntegration], activeVersionId: null }),
		);
		const credentialsService = mock<CredentialsService>();
		mockProjectCredential(credentialsService, { id: 'cred-1' } as CredentialsEntity);
		const chatSubscriptionStateService = mock<AgentChatSubscriptionStateService>();
		const publisher = mock<Publisher>();
		const memoryState = mock<StateAdapter>();
		memoryState.disconnect.mockResolvedValue(undefined);
		const createMemoryState = vi.fn(() => memoryState);
		vi.spyOn(esmLoader, 'loadMemoryState').mockResolvedValue({ createMemoryState } as never);

		const chatInstance = {
			initialize: vi.fn().mockResolvedValue(undefined),
			shutdown: vi.fn().mockResolvedValue(undefined),
			webhooks: { slack: vi.fn() },
			onNewMention: vi.fn(),
			onSubscribedMessage: vi.fn(),
			onAction: vi.fn(),
			getAdapter: vi.fn(),
			openDM: vi.fn(),
			thread: vi.fn(),
			channel: vi.fn(),
			getUser: vi.fn(),
		};
		const Chat = vi.fn(function ChatMock() {
			return chatInstance;
		});
		vi.spyOn(esmLoader, 'loadChatSdk').mockResolvedValue({ Chat } as never);
		const bridgeCreateSpy = vi.spyOn(AgentChatBridge, 'create');

		const { service, logger } = buildServiceWith({
			registry,
			agentRepository,
			credentialsService,
			publisher,
			chatSubscriptionStateService,
		});

		const first = service.getChatInstanceForTools('agent-1', slackIntegration);
		const second = service.getChatInstanceForTools('agent-1', slackIntegration);
		const [firstChat, secondChat] = await Promise.all([first, second]);
		const reusedChat = await service.getChatInstanceForTools('agent-1', slackIntegration);

		expect(logger.warn).not.toHaveBeenCalled();
		expect(firstChat).toBe(chatInstance);
		expect(secondChat).toBe(chatInstance);
		expect(reusedChat).toBe(chatInstance);
		expect(agentRepository.findOne).toHaveBeenCalledTimes(3);
		expect(Chat).toHaveBeenCalledTimes(1);
		expect(Chat).toHaveBeenCalledWith(expect.objectContaining({ state: memoryState }));
		expect(createAdapter).toHaveBeenCalledWith(expect.objectContaining({ ingressEnabled: false }));
		expect(chatInstance.initialize).toHaveBeenCalledTimes(1);
		expect(chatSubscriptionStateService.createStateAdapter).not.toHaveBeenCalled();
		expect(bridgeCreateSpy).not.toHaveBeenCalled();
		expect(onBeforeConnect).not.toHaveBeenCalled();
		expect(onAfterConnect).not.toHaveBeenCalled();
		expect(service.getWebhookHandler('agent-1', 'slack')).toBeUndefined();
		expect(service.getChatInstance('agent-1', slackIntegration)).toBeUndefined();
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});

	it('does not create an outbound fallback for a published agent', async () => {
		const agentRepository = mock<AgentRepository>();
		agentRepository.findOne.mockResolvedValue(
			makeAgent({ integrations: [slackIntegration], activeVersionId: 'version-1' }),
		);
		const { service, credentialsService } = buildServiceWith({ agentRepository });

		await expect(
			service.getChatInstanceForTools('agent-1', slackIntegration),
		).resolves.toBeUndefined();

		expect(credentialsService.decrypt).not.toHaveBeenCalled();
	});

	it('disposes a stale outbound connection when the agent is published', async () => {
		const onDisconnected = vi.fn().mockResolvedValue(undefined);
		const integration = new FakeIntegration('slack', false);
		(integration as unknown as { onDisconnected: typeof onDisconnected }).onDisconnected =
			onDisconnected;
		const registry = new ChatIntegrationRegistry();
		registry.register(integration);

		const agentRepository = mock<AgentRepository>();
		agentRepository.findOne.mockResolvedValue(
			makeAgent({ integrations: [slackIntegration], activeVersionId: 'version-1' }),
		);
		const { service } = buildServiceWith({ agentRepository, registry });
		const shutdown = vi.fn().mockResolvedValue(undefined);
		const outboundContext = {
			agentId: 'agent-1',
			projectId: 'project-1',
			credentialId: 'cred-1',
			credential: {},
			ingressEnabled: false,
			webhookUrlFor: () => 'https://n8n.test/webhook',
		};
		const internal = service as unknown as {
			outboundConnections: Map<string, unknown>;
		};
		internal.outboundConnections.set('agent-1:slack:cred-1', {
			chat: { shutdown },
			context: outboundContext,
		});

		await expect(
			service.getChatInstanceForTools('agent-1', slackIntegration),
		).resolves.toBeUndefined();

		expect(shutdown).toHaveBeenCalledTimes(1);
		expect(onDisconnected).toHaveBeenCalledTimes(1);
		expect(onDisconnected).toHaveBeenCalledWith(outboundContext);
		expect(internal.outboundConnections.size).toBe(0);
	});

	it('waits for stale outbound initialization before rejecting a published fallback', async () => {
		const agentRepository = mock<AgentRepository>();
		agentRepository.findOne.mockResolvedValue(
			makeAgent({ integrations: [slackIntegration], activeVersionId: 'version-1' }),
		);
		const { service } = buildServiceWith({ agentRepository });
		const shutdown = vi.fn().mockResolvedValue(undefined);
		const outboundChat = { shutdown };
		let resolveInitialization: (chat: unknown) => void = () => {};
		const initialization = new Promise<unknown>((resolve) => {
			resolveInitialization = resolve;
		});
		const internal = service as unknown as {
			outboundConnections: Map<string, unknown>;
			outboundConnectionInitializations: Map<string, Promise<unknown>>;
		};
		internal.outboundConnectionInitializations.set('agent-1:slack:cred-1', initialization);

		const result = service.getChatInstanceForTools('agent-1', slackIntegration);
		internal.outboundConnections.set('agent-1:slack:cred-1', { chat: outboundChat });
		resolveInitialization(outboundChat);

		await expect(result).resolves.toBeUndefined();
		expect(shutdown).toHaveBeenCalledTimes(1);
		expect(internal.outboundConnections.size).toBe(0);
	});

	it('disposes a matching outbound connection before replacing it with a live connection', async () => {
		const createAdapter = vi.fn().mockResolvedValue({ name: 'slack' });
		const integration = new FakeIntegration('slack', false);
		(integration as unknown as { createAdapter: typeof createAdapter }).createAdapter =
			createAdapter;
		const registry = new ChatIntegrationRegistry();
		registry.register(integration);
		const credentialsService = mock<CredentialsService>();
		mockProjectCredential(credentialsService, { id: 'cred-1' } as CredentialsEntity);
		const liveState = mock<StateAdapter>();
		liveState.disconnect.mockResolvedValue(undefined);
		const chatSubscriptionStateService = mock<AgentChatSubscriptionStateService>();
		chatSubscriptionStateService.createStateAdapter.mockReturnValue(liveState);
		vi.spyOn(esmLoader, 'loadMemoryState').mockResolvedValue({
			createMemoryState: vi.fn(() => mock<StateAdapter>()),
		} as never);

		const outboundChat = {
			shutdown: vi.fn().mockResolvedValue(undefined),
		};
		const liveChat = {
			initialize: vi.fn().mockResolvedValue(undefined),
			shutdown: vi.fn().mockResolvedValue(undefined),
			webhooks: {},
			onNewMention: vi.fn(),
			onSubscribedMessage: vi.fn(),
			onAction: vi.fn(),
			getAdapter: vi.fn(),
			openDM: vi.fn(),
			thread: vi.fn(),
			channel: vi.fn(),
			getUser: vi.fn(),
		};
		const Chat = vi.fn(function ChatMock() {
			return liveChat;
		});
		vi.spyOn(esmLoader, 'loadChatSdk').mockResolvedValue({ Chat } as never);
		const bridge = mock<AgentChatBridge>();
		vi.spyOn(AgentChatBridge, 'create').mockReturnValue(bridge);
		Container.set(AgentExecutionOrchestratorService, mock());

		const { service } = buildServiceWith({
			registry,
			credentialsService,
			chatSubscriptionStateService,
		});
		const internal = service as unknown as {
			outboundConnections: Map<string, unknown>;
		};
		internal.outboundConnections.set('agent-1:slack:cred-1', {
			chat: outboundChat,
			context: {
				agentId: 'agent-1',
				projectId: 'project-1',
				credentialId: 'cred-1',
				credential: {},
				ingressEnabled: false,
				webhookUrlFor: () => 'https://n8n.test/webhook',
			},
		});

		await service.connect('agent-1', slackIntegration, 'project-1');

		expect(outboundChat.shutdown).toHaveBeenCalledTimes(1);
		expect(outboundChat.shutdown.mock.invocationCallOrder[0]).toBeLessThan(
			liveChat.initialize.mock.invocationCallOrder[0],
		);
		expect(service.getChatInstance('agent-1', slackIntegration)).toBe(liveChat);
		expect(internal.outboundConnections.size).toBe(0);
	});
});

describe('ChatIntegrationService — onBeforeDisconnect plumbing', () => {
	type ConnectionStub = {
		chat: {
			shutdown: Mock;
			webhooks: Record<string, unknown>;
			onAction: Mock;
			onNewMention: Mock;
			onSubscribedMessage: Mock;
			initialize: Mock;
		};
		context: AgentChatIntegrationContext;
	};

	const seedConnection = (
		service: ChatIntegrationService,
		key: string,
		ctx: AgentChatIntegrationContext,
	): ConnectionStub => {
		const stub: ConnectionStub = {
			chat: {
				shutdown: vi.fn().mockResolvedValue(undefined),
				webhooks: {},
				onAction: vi.fn(),
				onNewMention: vi.fn(),
				onSubscribedMessage: vi.fn(),
				initialize: vi.fn(),
			},
			context: ctx,
		};
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(service as any).connections.set(key, stub);
		return stub;
	};

	const makeCtx = (
		overrides: Partial<AgentChatIntegrationContext> = {},
	): AgentChatIntegrationContext => ({
		agentId: 'agent-1',
		projectId: 'project-1',
		integration: slackIntegration,
		credentialId: 'cred-1',
		credential: { accessToken: 'bot-token' },
		ingressEnabled: true,
		webhookUrlFor: () => 'https://n8n.example.com/wh',
		...overrides,
	});

	beforeEach(() => {
		Container.reset();
	});

	it('invokes the integration onBeforeDisconnect hook with the captured context on user-initiated disconnect', async () => {
		const onBeforeDisconnect = vi.fn().mockResolvedValue(undefined);
		const telegram = new FakeIntegration('telegram', false);
		(telegram as unknown as { onBeforeDisconnect: typeof onBeforeDisconnect }).onBeforeDisconnect =
			onBeforeDisconnect;

		const registry = new ChatIntegrationRegistry();
		registry.register(telegram);

		const { service } = buildServiceWith({ registry });
		const ctx = makeCtx();
		const stub = seedConnection(service, 'agent-1:telegram:cred-1', ctx);

		await service.disconnect('agent-1', { type: 'telegram', credentialId: 'cred-1' });

		expect(onBeforeDisconnect).toHaveBeenCalledTimes(1);
		expect(onBeforeDisconnect).toHaveBeenCalledWith(ctx);
		expect(onBeforeDisconnect.mock.invocationCallOrder[0]).toBeLessThan(
			stub.chat.shutdown.mock.invocationCallOrder[0],
		);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		expect((service as any).connections.size).toBe(0);
	});

	it('swallows errors from onBeforeDisconnect and still tears down local state', async () => {
		const onBeforeDisconnect = vi.fn().mockRejectedValue(new Error('telegram 500'));
		const telegram = new FakeIntegration('telegram', false);
		(telegram as unknown as { onBeforeDisconnect: typeof onBeforeDisconnect }).onBeforeDisconnect =
			onBeforeDisconnect;

		const registry = new ChatIntegrationRegistry();
		registry.register(telegram);

		const { service } = buildServiceWith({ registry });
		const stub = seedConnection(service, 'agent-1:telegram:cred-1', makeCtx());

		await expect(
			service.disconnect('agent-1', { type: 'telegram', credentialId: 'cred-1' }),
		).resolves.toBeUndefined();

		expect(onBeforeDisconnect).toHaveBeenCalledTimes(1);
		expect(stub.chat.shutdown).toHaveBeenCalledTimes(1);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		expect((service as any).connections.size).toBe(0);
	});

	it('skips onBeforeDisconnect when caller passes skipExternalHooks: true', async () => {
		const onBeforeDisconnect = vi.fn().mockResolvedValue(undefined);
		const telegram = new FakeIntegration('telegram', false);
		(telegram as unknown as { onBeforeDisconnect: typeof onBeforeDisconnect }).onBeforeDisconnect =
			onBeforeDisconnect;

		const registry = new ChatIntegrationRegistry();
		registry.register(telegram);

		const { service } = buildServiceWith({ registry });
		seedConnection(service, 'agent-1:telegram:cred-1', makeCtx());

		await service.disconnect(
			'agent-1',
			{ type: 'telegram', credentialId: 'cred-1' },
			{ skipExternalHooks: true },
		);

		expect(onBeforeDisconnect).not.toHaveBeenCalled();
	});

	it('disconnectAll never runs onBeforeDisconnect — graceful shutdown must not release remote state', async () => {
		const onBeforeDisconnect = vi.fn().mockResolvedValue(undefined);
		const telegram = new FakeIntegration('telegram', false);
		(telegram as unknown as { onBeforeDisconnect: typeof onBeforeDisconnect }).onBeforeDisconnect =
			onBeforeDisconnect;

		const registry = new ChatIntegrationRegistry();
		registry.register(telegram);

		const { service } = buildServiceWith({ registry });
		seedConnection(service, 'agent-1:telegram:cred-1', makeCtx());

		await service.disconnectAll();

		expect(onBeforeDisconnect).not.toHaveBeenCalled();
	});
});

describe('ChatIntegrationService — multi-main role-aware behavior', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Container.reset();
	});

	describe('reconnectAll', () => {
		it('skips integrations that require the leader when this main is a follower', async () => {
			const registry = new ChatIntegrationRegistry();
			registry.register(new FakeIntegration('telegram', true));
			registry.register(new FakeIntegration('linear', false));

			const agentRepository = mock<AgentRepository>();
			agentRepository.findPublished.mockResolvedValue([
				makeAgent({
					integrations: [
						{ type: 'telegram', credentialId: 'c1' },
						{ type: 'linear', credentialId: 'c2' },
					],
				}),
			]);

			const { service } = buildServiceWith({
				isLeader: false,
				registry,
				agentRepository,
			});

			const connectSpy = vi.spyOn(service, 'connect').mockResolvedValue();

			await service.reconnectAll();

			expect(connectSpy).toHaveBeenCalledTimes(1);
			// Followers must not run external hooks during startup reconnect. The
			// leader owns external setup; followers only build local runtime state.
			expect(connectSpy).toHaveBeenCalledWith(
				'agent-1',
				{ type: 'linear', credentialId: 'c2' },
				'project-1',
				{ skipExternalHooks: true },
			);
		});

		it('connects every integration when this main is the leader and runs external hooks', async () => {
			const registry = new ChatIntegrationRegistry();
			registry.register(new FakeIntegration('telegram', true));
			registry.register(new FakeIntegration('linear', false));

			const agentRepository = mock<AgentRepository>();
			agentRepository.findPublished.mockResolvedValue([
				makeAgent({
					integrations: [
						{ type: 'telegram', credentialId: 'c1' },
						{ type: 'linear', credentialId: 'c2' },
					],
				}),
			]);

			const { service } = buildServiceWith({
				isLeader: true,
				registry,
				agentRepository,
			});

			const connectSpy = vi.spyOn(service, 'connect').mockResolvedValue();

			await service.reconnectAll();

			expect(connectSpy).toHaveBeenCalledTimes(2);
			for (const call of connectSpy.mock.calls) {
				expect(call[3]).toEqual({ skipExternalHooks: false });
			}
		});

		it('skips integrations that are already connected', async () => {
			const registry = new ChatIntegrationRegistry();
			registry.register(new FakeIntegration('linear', false));

			const agentRepository = mock<AgentRepository>();
			agentRepository.findPublished.mockResolvedValue([
				makeAgent({
					integrations: [{ type: 'linear', credentialId: 'c1' }],
				}),
			]);

			const { service } = buildServiceWith({
				isLeader: true,
				registry,
				agentRepository,
			});

			// Pretend this integration is already connected (e.g. leader-takeover
			// scenario where webhook integrations were already running on the
			// former-follower).
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const internal = service as any;
			internal.connections.set('agent-1:linear:c1', {});

			const connectSpy = vi.spyOn(service, 'connect').mockResolvedValue();

			await service.reconnectAll();

			expect(connectSpy).not.toHaveBeenCalled();
		});
	});

	describe('disconnectLeaderOnlyIntegrations', () => {
		it('only tears down integrations that require the leader', async () => {
			const registry = new ChatIntegrationRegistry();
			registry.register(new FakeIntegration('telegram', true));
			registry.register(new FakeIntegration('linear', false));

			const { service } = buildServiceWith({ registry });

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const internal = service as any;
			internal.connections.set('agent-1:telegram:c1', {});
			internal.connections.set('agent-1:linear:c2', {});

			const disconnectOneSpy = spyOnPrivate(service, 'disconnectOne').mockResolvedValue();

			await service.disconnectLeaderOnlyIntegrations();

			expect(disconnectOneSpy).toHaveBeenCalledTimes(1);
			// Leader stepdown is a role transition, not a user-initiated disconnect.
			// Only local runtime state should be cleared here.
			expect(disconnectOneSpy).toHaveBeenCalledWith('agent-1:telegram:c1', {
				skipExternalHooks: true,
			});
		});

		it('gives up on a stuck leader operation instead of stalling the stepdown', async () => {
			vi.useFakeTimers();
			try {
				const registry = new ChatIntegrationRegistry();
				registry.register(new FakeIntegration('telegram', true));
				const agentRepository = mock<AgentRepository>();
				agentRepository.findOne.mockResolvedValue(makeAgent({ id: 'agent-1', projectId: 'p1' }));
				const { service } = buildServiceWith({ registry, agentRepository });

				const connectLocal = spyOnPrivate(service, 'connectLocal').mockReturnValue(
					new Promise(() => {}),
				);
				void service.handleLeaderChannelRequest({
					requestId: 'lch_1',
					replyTo: 'follower-1',
					agentId: 'agent-1',
					integration: { type: 'telegram', credentialId: 'c1' },
					action: 'connect',
				});
				await vi.waitFor(() => expect(connectLocal).toHaveBeenCalled());

				const steppingDown = service.disconnectLeaderOnlyIntegrations();
				await vi.advanceTimersByTimeAsync(LEADER_CHANNEL_REQUEST_TIMEOUT_MS);

				// A platform call that never returns must not hold the demotion open;
				// the straggler releases itself via the leadership re-check.
				await expect(steppingDown).resolves.toBeUndefined();
			} finally {
				vi.useRealTimers();
			}
		});

		it('drains an in-flight leader-side connect before sweeping', async () => {
			const registry = new ChatIntegrationRegistry();
			registry.register(new FakeIntegration('telegram', true));

			const agentRepository = mock<AgentRepository>();
			agentRepository.findOne.mockResolvedValue(makeAgent({ id: 'agent-1', projectId: 'p1' }));
			const { service } = buildServiceWith({ registry, agentRepository });

			// A connect that is still starting up when the stepdown begins: the sweep
			// has to see the connection it registers, not miss it and leave a poller
			// running on a main that no longer leads.
			let finishConnect: () => void = () => {};
			const connectLocal = spyOnPrivate(service, 'connectLocal').mockImplementation(
				async () =>
					await new Promise<void>((resolve) => {
						finishConnect = () => {
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							(service as any).connections.set('agent-1:telegram:c1', {});
							resolve();
						};
					}),
			);
			const disconnectOneSpy = spyOnPrivate(service, 'disconnectOne').mockResolvedValue();

			const connecting = service.handleLeaderChannelRequest({
				requestId: 'lch_1',
				replyTo: 'follower-1',
				agentId: 'agent-1',
				integration: { type: 'telegram', credentialId: 'c1' },
				action: 'connect',
			});
			// Let the handler reach `connectLocal` before the stepdown starts draining.
			await vi.waitFor(() => expect(connectLocal).toHaveBeenCalled());

			const steppingDown = service.disconnectLeaderOnlyIntegrations();
			finishConnect();
			await Promise.all([connecting, steppingDown]);

			expect(disconnectOneSpy).toHaveBeenCalledWith('agent-1:telegram:c1', {
				skipExternalHooks: true,
			});
		});
	});

	describe('leader-only channel routing', () => {
		const telegram: AgentIntegrationConfig = { type: 'telegram', credentialId: 'c1' };

		/** A follower in multi-main mode with a leader-only telegram integration. */
		function buildFollower() {
			const registry = new ChatIntegrationRegistry();
			registry.register(new FakeIntegration('telegram', true));
			registry.register(new FakeIntegration('linear', false));

			const built = buildServiceWith({ isLeader: false, multiMainEnabled: true, registry });
			built.leaderChannelRelay.requestWithoutAck.mockResolvedValue();
			const connectLocal = spyOnPrivate(built.service, 'connectLocal').mockResolvedValue();
			const disconnectLocal = spyOnPrivate(built.service, 'disconnectLocal').mockResolvedValue();

			return { ...built, connectLocal, disconnectLocal };
		}

		it('hands a connect to the leader and builds nothing locally', async () => {
			const { service, leaderChannelRelay, connectLocal, disconnectLocal } = buildFollower();
			leaderChannelRelay.request.mockResolvedValue();

			await service.connect('agent-1', telegram, 'project-1');

			expect(leaderChannelRelay.request).toHaveBeenCalledWith({
				agentId: 'agent-1',
				integration: telegram,
				action: 'connect',
			});
			// The whole point: a follower must never end up owning a poller.
			expect(connectLocal).not.toHaveBeenCalled();
			// Anything it still held for the key goes, with external teardown left to
			// the leader.
			expect(disconnectLocal).toHaveBeenCalledWith('agent-1', telegram, {
				skipExternalHooks: true,
			});
		});

		it('hands a disconnect to the leader', async () => {
			const { service, leaderChannelRelay, disconnectLocal } = buildFollower();
			leaderChannelRelay.request.mockResolvedValue();

			await service.disconnect('agent-1', telegram);

			expect(leaderChannelRelay.request).toHaveBeenCalledWith({
				agentId: 'agent-1',
				integration: telegram,
				action: 'disconnect',
			});
			// Only local state — the cluster-wide release is the leader's to run.
			expect(disconnectLocal).toHaveBeenCalledWith('agent-1', telegram, {
				skipExternalHooks: true,
			});
		});

		it('surfaces the failure and releases the leader runtime when the ack does not arrive', async () => {
			const { service, leaderChannelRelay } = buildFollower();
			leaderChannelRelay.request.mockRejectedValue(new Error('no acknowledgement'));

			await expect(service.connect('agent-1', telegram, 'project-1')).rejects.toThrow(
				'no acknowledgement',
			);

			// A leader that started polling but lost its ack would otherwise keep a
			// runtime claim for a channel this request just reported as failed.
			expect(leaderChannelRelay.requestWithoutAck).toHaveBeenCalledWith({
				agentId: 'agent-1',
				integration: telegram,
				action: 'disconnect',
			});
		});

		it('still reports the original failure when the release cannot be delivered', async () => {
			const { service, leaderChannelRelay } = buildFollower();
			leaderChannelRelay.request.mockRejectedValue(new Error('no acknowledgement'));
			leaderChannelRelay.requestWithoutAck.mockRejectedValue(new Error('redis is down'));

			await expect(service.connect('agent-1', telegram, 'project-1')).rejects.toThrow(
				'no acknowledgement',
			);
		});

		it('connects locally on the leader without a round-trip', async () => {
			const registry = new ChatIntegrationRegistry();
			registry.register(new FakeIntegration('telegram', true));
			const { service, leaderChannelRelay } = buildServiceWith({
				isLeader: true,
				multiMainEnabled: true,
				registry,
			});
			const connectLocal = spyOnPrivate(service, 'connectLocal').mockResolvedValue();

			await service.connect('agent-1', telegram, 'project-1');

			expect(connectLocal).toHaveBeenCalledWith('agent-1', telegram, 'project-1', {});
			expect(leaderChannelRelay.request).not.toHaveBeenCalled();
		});

		it('connects locally in a single-main setup', async () => {
			const registry = new ChatIntegrationRegistry();
			registry.register(new FakeIntegration('telegram', true));
			// A single main is never the leader in the multi-main sense, but there is
			// no other instance to hand the work to.
			const { service, leaderChannelRelay } = buildServiceWith({
				isLeader: false,
				multiMainEnabled: false,
				registry,
			});
			const connectLocal = spyOnPrivate(service, 'connectLocal').mockResolvedValue();

			await service.connect('agent-1', telegram, 'project-1');

			expect(connectLocal).toHaveBeenCalled();
			expect(leaderChannelRelay.request).not.toHaveBeenCalled();
		});

		it('keeps outbound preview connections local on a follower', async () => {
			const { service, leaderChannelRelay, connectLocal } = buildFollower();

			// Ingress off means no poller (Telegram forces webhook mode), so every
			// main builds these for itself.
			await service.connect('agent-1', telegram, 'project-1', { ingressEnabled: false });

			expect(connectLocal).toHaveBeenCalled();
			expect(leaderChannelRelay.request).not.toHaveBeenCalled();
		});

		it('keeps a webhook integration local on a follower', async () => {
			const { service, leaderChannelRelay, connectLocal } = buildFollower();

			await service.connect('agent-1', { type: 'linear', credentialId: 'c2' }, 'project-1');

			expect(connectLocal).toHaveBeenCalled();
			expect(leaderChannelRelay.request).not.toHaveBeenCalled();
		});

		it('clears a local draft reference without involving the leader', async () => {
			const { service, leaderChannelRelay, disconnectLocal } = buildFollower();

			// A builder draft entry (`credentialId: ''`) is not a real connection
			// anywhere, so there is nothing for the leader to release.
			await service.disconnect('agent-1', { type: 'telegram', credentialId: '' });

			expect(leaderChannelRelay.request).not.toHaveBeenCalled();
			// Local-only cleanup, and external teardown is not skipped: nothing else
			// in the cluster is going to run it for a reference only this main holds.
			expect(disconnectLocal).toHaveBeenCalledWith(
				'agent-1',
				{ type: 'telegram', credentialId: '' },
				{},
			);
		});
	});

	describe('disconnectChannel', () => {
		it('still tells peers to drop the channel when the teardown failed', async () => {
			const registry = new ChatIntegrationRegistry();
			registry.register(new FakeIntegration('telegram', true));
			const { service, publisher } = buildServiceWith({
				isLeader: false,
				multiMainEnabled: true,
				registry,
			});
			spyOnPrivate(service, 'disconnectLocal').mockResolvedValue();
			// A leader that never acknowledged is exactly when peers are most likely to
			// be holding runtime for a channel that is going away.
			(service as unknown as { leaderChannelRelay: { request: Mock } }).leaderChannelRelay.request =
				vi.fn().mockRejectedValue(new Error('no acknowledgement'));

			await service.disconnectChannel('agent-1', { type: 'telegram', credentialId: 'c1' });

			expect(publisher.publishCommand).toHaveBeenCalledWith(
				expect.objectContaining({
					command: 'agent-chat-integration-changed',
					payload: expect.objectContaining({ action: 'disconnect' }),
				}),
			);
		});
	});

	describe('handleLeaderChannelRequest', () => {
		const telegram: AgentIntegrationConfig = { type: 'telegram', credentialId: 'c1' };
		const request = {
			requestId: 'lch_1',
			replyTo: 'follower-1',
			agentId: 'agent-1',
			integration: telegram,
			action: 'connect' as const,
		};

		/** A leader ready to execute a relayed request. */
		function buildLeader(opts: { isLeader?: boolean } = {}) {
			const registry = new ChatIntegrationRegistry();
			registry.register(new FakeIntegration('telegram', true));

			const agentRepository = mock<AgentRepository>();
			agentRepository.findOne.mockResolvedValue(makeAgent({ id: 'agent-1', projectId: 'p1' }));

			return buildServiceWith({
				isLeader: opts.isLeader ?? true,
				multiMainEnabled: true,
				registry,
				agentRepository,
			});
		}

		it('connects locally and acknowledges success', async () => {
			const { service, leaderChannelRelay } = buildLeader();
			const connectLocal = spyOnPrivate(service, 'connectLocal').mockResolvedValue();

			await service.handleLeaderChannelRequest(request);

			expect(connectLocal).toHaveBeenCalledWith('agent-1', telegram, 'p1');
			expect(leaderChannelRelay.respond).toHaveBeenCalledWith(request);
		});

		it('joins a concurrent request for the same channel instead of running it twice', async () => {
			const { service, leaderChannelRelay } = buildLeader();
			const connectLocal = spyOnPrivate(service, 'connectLocal').mockResolvedValue();

			await Promise.all([
				service.handleLeaderChannelRequest(request),
				service.handleLeaderChannelRequest({ ...request, requestId: 'lch_2' }),
			]);

			// Re-running would tear down the runtime the first request is building.
			expect(connectLocal).toHaveBeenCalledTimes(1);
			expect(leaderChannelRelay.respond).toHaveBeenCalledTimes(2);
		});

		it('runs a request for a different channel independently', async () => {
			const { service } = buildLeader();
			const connectLocal = spyOnPrivate(service, 'connectLocal').mockResolvedValue();

			await Promise.all([
				service.handleLeaderChannelRequest(request),
				service.handleLeaderChannelRequest({
					...request,
					requestId: 'lch_2',
					integration: { type: 'telegram', credentialId: 'c2' },
				}),
			]);

			expect(connectLocal).toHaveBeenCalledTimes(2);
		});

		it('releases the channel after a failed request so the next one retries', async () => {
			const { service } = buildLeader();
			const connectLocal = spyOnPrivate(service, 'connectLocal')
				.mockRejectedValueOnce(new Error('bot token already in use'))
				.mockResolvedValue();

			await service.handleLeaderChannelRequest(request);
			await service.handleLeaderChannelRequest({ ...request, requestId: 'lch_2' });

			expect(connectLocal).toHaveBeenCalledTimes(2);
		});

		it('joins a duplicate request for the action already running', async () => {
			const { service, leaderChannelRelay } = buildLeader();
			let finishConnect: () => void = () => {};
			const connectLocal = spyOnPrivate(service, 'connectLocal').mockImplementation(
				async () =>
					await new Promise<void>((resolve) => {
						finishConnect = resolve;
					}),
			);

			const first = service.handleLeaderChannelRequest(request);
			await vi.waitFor(() => expect(connectLocal).toHaveBeenCalled());
			const retry = service.handleLeaderChannelRequest({ ...request, requestId: 'lch_2' });
			finishConnect();
			await Promise.all([first, retry]);

			// A retry, or a request whose ack was lost, must not restart a startup that
			// is already under way.
			expect(connectLocal).toHaveBeenCalledTimes(1);
			expect(leaderChannelRelay.respond).toHaveBeenCalledTimes(2);
		});

		it('rebuilds a live channel, so a settings-only save reaches the runtime', async () => {
			const { service, leaderChannelRelay } = buildLeader();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(service as any).connections.set('agent-1:telegram:c1', {});
			const connectLocal = spyOnPrivate(service, 'connectLocal').mockResolvedValue();
			const settings = { accessMode: 'private' as const, allowedUsers: ['@someone'] };

			await service.handleLeaderChannelRequest({
				...request,
				integration: { ...telegram, settings },
			});

			// The connection key excludes settings, so a live key is exactly what a
			// settings edit arrives on — skipping the rebuild would keep the leader
			// enforcing the previous allowlist.
			expect(connectLocal).toHaveBeenCalledWith('agent-1', { ...telegram, settings }, 'p1');
			expect(leaderChannelRelay.respond).toHaveBeenCalledWith(
				expect.objectContaining({ requestId: 'lch_1' }),
			);
		});

		it('queues a disconnect behind an in-flight connect instead of joining it', async () => {
			const { service, leaderChannelRelay } = buildLeader();
			const order: string[] = [];
			let finishConnect: () => void = () => {};
			const connectLocal = spyOnPrivate(service, 'connectLocal').mockImplementation(
				async () =>
					await new Promise<void>((resolve) => {
						finishConnect = () => {
							order.push('connect');
							resolve();
						};
					}),
			);
			const disconnectLocal = spyOnPrivate(service, 'disconnectLocal').mockImplementation(
				async () => {
					order.push('disconnect');
				},
			);

			const connecting = service.handleLeaderChannelRequest(request);
			await vi.waitFor(() => expect(connectLocal).toHaveBeenCalled());
			const disconnecting = service.handleLeaderChannelRequest({
				...request,
				requestId: 'lch_2',
				action: 'disconnect',
			});
			finishConnect();
			await Promise.all([connecting, disconnecting]);

			// Joining the connect would have acknowledged the removal as done while
			// leaving the leader polling a channel the caller has already deleted.
			expect(disconnectLocal).toHaveBeenCalledTimes(1);
			expect(order).toEqual(['connect', 'disconnect']);
			expect(leaderChannelRelay.respond).toHaveBeenCalledTimes(2);
		});

		it('tears the runtime down and reports failure when leadership was lost mid-startup', async () => {
			const { service, leaderChannelRelay, instanceSettings } = buildLeader();
			spyOnPrivate(service, 'connectLocal').mockImplementation(async () => {
				Object.defineProperty(instanceSettings, 'isLeader', { value: false, writable: true });
			});
			const disconnectOne = spyOnPrivate(service, 'disconnectOne').mockResolvedValue();

			await service.handleLeaderChannelRequest(request);

			expect(disconnectOne).toHaveBeenCalledWith('agent-1:telegram:c1', {
				skipExternalHooks: true,
			});
			expect(leaderChannelRelay.respond).toHaveBeenCalledWith(
				request,
				expect.objectContaining({ message: expect.stringContaining('stopped being the leader') }),
			);
		});

		it('reports failure when the connect throws', async () => {
			const { service, leaderChannelRelay } = buildLeader();
			spyOnPrivate(service, 'connectLocal').mockRejectedValue(
				new Error('bot token already in use'),
			);

			await service.handleLeaderChannelRequest(request);

			expect(leaderChannelRelay.respond).toHaveBeenCalledWith(
				request,
				expect.objectContaining({ message: 'bot token already in use' }),
			);
		});

		it('reports failure when the agent no longer exists', async () => {
			const { service, leaderChannelRelay, agentRepository } = buildLeader();
			agentRepository.findOne.mockResolvedValue(null);

			await service.handleLeaderChannelRequest(request);

			expect(leaderChannelRelay.respond).toHaveBeenCalledWith(
				request,
				expect.objectContaining({ message: expect.stringContaining('not found') }),
			);
		});

		it('tears down locally on a disconnect request and acknowledges', async () => {
			const { service, leaderChannelRelay } = buildLeader();
			const disconnectLocal = spyOnPrivate(service, 'disconnectLocal').mockResolvedValue();
			const disconnectRequest = { ...request, action: 'disconnect' as const };

			await service.handleLeaderChannelRequest(disconnectRequest);

			expect(disconnectLocal).toHaveBeenCalledWith('agent-1', telegram);
			expect(leaderChannelRelay.respond).toHaveBeenCalledWith(disconnectRequest);
		});
	});

	describe('handleIntegrationChanged', () => {
		it("tears down the peer's local runtime on disconnect and skips external hooks", async () => {
			const { service } = buildServiceWith();
			const disconnectSpy = spyOnPrivate(service, 'disconnectLocal').mockResolvedValue();

			await service.handleIntegrationChanged({
				agentId: 'a1',
				integration: { type: 'linear', credentialId: 'c1' },
				action: 'disconnect',
			});

			// External teardown already ran on the originator. The peer must skip it
			// so cluster-wide remote state is released exactly once.
			expect(disconnectSpy).toHaveBeenCalledWith(
				'a1',
				{ type: 'linear', credentialId: 'c1' },
				{ skipExternalHooks: true },
			);
		});

		it('skips connect for a leader-only integration on a follower', async () => {
			const registry = new ChatIntegrationRegistry();
			registry.register(new FakeIntegration('telegram', true));

			const { service } = buildServiceWith({ isLeader: false, registry });

			const connectSpy = spyOnPrivate(service, 'connectLocal').mockResolvedValue();

			await service.handleIntegrationChanged({
				agentId: 'a1',
				integration: { type: 'telegram', credentialId: 'c1' },
				action: 'connect',
			});

			expect(connectSpy).not.toHaveBeenCalled();
		});

		it('connects a webhook integration on a follower and skips external hooks', async () => {
			const registry = new ChatIntegrationRegistry();
			registry.register(new FakeIntegration('linear', false));

			const agentRepository = mock<AgentRepository>();
			agentRepository.findOne.mockResolvedValue(makeAgent({ id: 'a1', projectId: 'p1' }));

			const { service } = buildServiceWith({
				isLeader: false,
				registry,
				agentRepository,
			});

			const connectSpy = spyOnPrivate(service, 'connectLocal').mockResolvedValue();

			await service.handleIntegrationChanged({
				agentId: 'a1',
				integration: { type: 'linear', credentialId: 'c1' },
				action: 'connect',
			});

			// External hooks already ran on the originator. The peer must skip them
			// to avoid duplicate external side effects.
			expect(connectSpy).toHaveBeenCalledWith('a1', { type: 'linear', credentialId: 'c1' }, 'p1', {
				skipExternalHooks: true,
			});
		});

		it('logs and does not throw when the credential is not accessible to the project', async () => {
			const registry = new ChatIntegrationRegistry();
			registry.register(new FakeIntegration('linear', false));

			const agentRepository = mock<AgentRepository>();
			agentRepository.findOne.mockResolvedValue(makeAgent({ id: 'a1', projectId: 'p1' }));

			const { service } = buildServiceWith({
				registry,
				agentRepository,
			});

			spyOnPrivate(service, 'connectLocal').mockRejectedValue(
				new Error('not accessible to project'),
			);

			await expect(
				service.handleIntegrationChanged({
					agentId: 'a1',
					integration: { type: 'linear', credentialId: 'c1' },
					action: 'connect',
				}),
			).resolves.toBeUndefined();
		});

		it('no-ops when the agent has been deleted', async () => {
			const registry = new ChatIntegrationRegistry();
			registry.register(new FakeIntegration('linear', false));

			const agentRepository = mock<AgentRepository>();
			agentRepository.findOne.mockResolvedValue(null);

			const { service } = buildServiceWith({ registry, agentRepository });

			const connectSpy = spyOnPrivate(service, 'connectLocal').mockResolvedValue();

			await service.handleIntegrationChanged({
				agentId: 'gone',
				integration: { type: 'linear', credentialId: 'c1' },
				action: 'connect',
			});

			expect(connectSpy).not.toHaveBeenCalled();
		});

		it('skips connect when the integration is already connected', async () => {
			const registry = new ChatIntegrationRegistry();
			registry.register(new FakeIntegration('linear', false));

			const { service } = buildServiceWith({ registry });

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const internal = service as any;
			internal.connections.set('a1:linear:c1', {});

			const connectSpy = spyOnPrivate(service, 'connectLocal').mockResolvedValue();

			await service.handleIntegrationChanged({
				agentId: 'a1',
				integration: { type: 'linear', credentialId: 'c1' },
				action: 'connect',
			});

			expect(connectSpy).not.toHaveBeenCalled();
		});
	});

	describe('getWebhookHandler', () => {
		const seedConnection = (
			service: ChatIntegrationService,
			credentialId: string,
			credential: Record<string, unknown>,
			handler: unknown,
		) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(service as any).connections.set(`agent-1:discord:${credentialId}`, {
				chat: { webhooks: { discord: handler } },
				context: {
					agentId: 'agent-1',
					projectId: 'project-1',
					credentialId,
					credential,
					webhookUrlFor: () => 'https://n8n.example.com/wh',
				},
			});
		};

		it('uses the integration matcher to select a connection', () => {
			const registry = new ChatIntegrationRegistry();
			const integration = new FakeIntegration('discord', false);
			integration.matchesWebhookConnection = (credential, selector) =>
				credential.applicationId === selector;
			registry.register(integration);
			const { service } = buildServiceWith({ registry });
			const handlerA = vi.fn();
			const handlerB = vi.fn();
			seedConnection(service, 'cred-a', { applicationId: 'app-a' }, handlerA);
			seedConnection(service, 'cred-b', { applicationId: 'app-b' }, handlerB);

			expect(service.getWebhookHandler('agent-1', 'discord', 'app-b')).toBe(handlerB);
			expect(service.getWebhookHandler('agent-1', 'discord', 'app-a')).toBe(handlerA);
			expect(service.getWebhookHandler('agent-1', 'discord', 'app-unknown')).toBeUndefined();
		});

		it('does not fall back to the first connection when a selector has no matcher', () => {
			const registry = new ChatIntegrationRegistry();
			registry.register(new FakeIntegration('discord', false));
			const { service } = buildServiceWith({ registry });
			seedConnection(service, 'cred-a', { applicationId: 'app-a' }, vi.fn());

			expect(service.getWebhookHandler('agent-1', 'discord', 'app-a')).toBeUndefined();
		});
	});

	describe('broadcastIntegrationChange', () => {
		it('does nothing when multi-main is disabled', async () => {
			const publisher = mock<Publisher>();
			const { service } = buildServiceWith({ multiMainEnabled: false, publisher });

			await service.broadcastIntegrationChange(
				'a1',
				{ type: 'linear', credentialId: 'c1' },
				'connect',
			);

			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('publishes the change when multi-main is enabled', async () => {
			const publisher = mock<Publisher>();
			const { service } = buildServiceWith({ multiMainEnabled: true, publisher });

			await service.broadcastIntegrationChange(
				'a1',
				{ type: 'linear', credentialId: 'c1' },
				'disconnect',
			);

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'agent-chat-integration-changed',
				payload: {
					agentId: 'a1',
					integration: { type: 'linear', credentialId: 'c1' },
					action: 'disconnect',
				},
			});
		});

		it('publishes settings alongside a connect broadcast', async () => {
			const publisher = mock<Publisher>();
			const { service } = buildServiceWith({ multiMainEnabled: true, publisher });
			const integration: AgentIntegrationConfig = {
				type: 'telegram',
				credentialId: 'c1',
				settings: {
					accessMode: 'private' as const,
					allowedUsers: ['123'],
				},
			};

			await service.broadcastIntegrationChange('a1', integration, 'connect');

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'agent-chat-integration-changed',
				payload: {
					agentId: 'a1',
					integration,
					action: 'connect',
				},
			});
		});

		it('swallows publisher failures so the user-facing flow keeps succeeding', async () => {
			const publisher = mock<Publisher>();
			publisher.publishCommand.mockRejectedValue(new Error('redis is down'));

			const { service } = buildServiceWith({ multiMainEnabled: true, publisher });

			await expect(
				service.broadcastIntegrationChange('a1', { type: 'linear', credentialId: 'c1' }, 'connect'),
			).resolves.toBeUndefined();
		});
	});
});

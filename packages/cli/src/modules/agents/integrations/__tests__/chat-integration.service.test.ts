import type { AgentCredentialIntegration } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import { ProjectRelationRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

import type { Agent } from '../../entities/agent.entity';
import type { AgentRepository } from '../../repositories/agent.repository';
import {
	AgentChatIntegration,
	ChatIntegrationRegistry,
	type AgentChatIntegrationContext,
} from '../agent-chat-integration';
import { ChatIntegrationService } from '../chat-integration.service';

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

	override requiresLeader(): boolean {
		return this.leaderOnly;
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
		publishedVersion: null,
		...overrides,
	} as unknown as Agent;
}

const slackIntegration: AgentCredentialIntegration = {
	type: 'slack',
	credentialId: 'cred-1',
	credentialName: 'Acme Slack',
};

function buildServiceWith(
	opts: {
		isLeader?: boolean;
		multiMainEnabled?: boolean;
		registry?: ChatIntegrationRegistry;
		agentRepository?: ReturnType<typeof mock<AgentRepository>>;
		publisher?: ReturnType<typeof mock<Publisher>>;
		projectRelationRepository?: ReturnType<typeof mock<ProjectRelationRepository>>;
	} = {},
) {
	const registry = opts.registry ?? new ChatIntegrationRegistry();
	const agentRepository = opts.agentRepository ?? mock<AgentRepository>();
	const publisher = opts.publisher ?? mock<Publisher>();
	const projectRelationRepository =
		opts.projectRelationRepository ?? mock<ProjectRelationRepository>();
	const instanceSettings = mock<InstanceSettings>({ isLeader: opts.isLeader ?? true });
	const globalConfig = mock<GlobalConfig>({
		multiMainSetup: { enabled: opts.multiMainEnabled ?? false },
	} as Partial<GlobalConfig>);

	Container.set(ProjectRelationRepository, projectRelationRepository);

	const service = new ChatIntegrationService(
		mockLogger(),
		agentRepository,
		mock(),
		mock(),
		mock(),
		registry,
		instanceSettings,
		publisher,
		globalConfig,
	);

	return { service, registry, agentRepository, publisher, projectRelationRepository };
}

describe('ChatIntegrationService.syncToConfig — publish gate', () => {
	let service: ChatIntegrationService;
	let connectSpy: jest.SpyInstance;
	let disconnectSpy: jest.SpyInstance;

	beforeEach(() => {
		Container.reset();
		({ service } = buildServiceWith());
		connectSpy = jest.spyOn(service, 'connect').mockResolvedValue();
		disconnectSpy = jest.spyOn(service, 'disconnect').mockResolvedValue();
	});

	it('skips connect when the agent is not published', async () => {
		const agent = makeAgent({ publishedVersion: null });

		await service.syncToConfig(agent, [], [slackIntegration]);

		expect(connectSpy).not.toHaveBeenCalled();
	});

	it('still disconnects removed integrations even when the agent is not published', async () => {
		const agent = makeAgent({ publishedVersion: null });

		await service.syncToConfig(agent, [slackIntegration], []);

		expect(disconnectSpy).toHaveBeenCalledWith('agent-1', 'slack', 'cred-1');
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
			mock(),
			mock<InstanceSettings>({ isLeader: true }),
			mock(),
			mock<GlobalConfig>({ multiMainSetup: { enabled: false } } as Partial<GlobalConfig>),
		);

	describe('disconnectAll', () => {
		it('shuts down every active connection and empties the connection map', async () => {
			const service = buildService();
			const shutdownA = jest.fn().mockResolvedValue(undefined);
			const shutdownB = jest.fn().mockResolvedValue(undefined);
			const disposeA = jest.fn();
			const disposeB = jest.fn();

			// Seed two connections via the private map.
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const internal = service as any;
			internal.connections.set('agent-1:slack:cred-1', {
				chat: {
					shutdown: shutdownA,
					webhooks: {},
					onAction: jest.fn(),
					onNewMention: jest.fn(),
					onSubscribedMessage: jest.fn(),
					initialize: jest.fn(),
				},
				bridge: { dispose: disposeA },
			});
			internal.connections.set('agent-2:telegram:cred-2', {
				chat: {
					shutdown: shutdownB,
					webhooks: {},
					onAction: jest.fn(),
					onNewMention: jest.fn(),
					onSubscribedMessage: jest.fn(),
					initialize: jest.fn(),
				},
				bridge: { dispose: disposeB },
			});

			await service.disconnectAll();

			expect(shutdownA).toHaveBeenCalledTimes(1);
			expect(shutdownB).toHaveBeenCalledTimes(1);
			expect(disposeA).toHaveBeenCalledTimes(1);
			expect(disposeB).toHaveBeenCalledTimes(1);
			expect(internal.connections.size).toBe(0);
		});

		it('does not throw when there are no active connections', async () => {
			const service = buildService();
			await expect(service.disconnectAll()).resolves.toBeUndefined();
		});

		it('continues disconnecting remaining connections when one shutdown rejects', async () => {
			const service = buildService();
			const shutdownA = jest.fn().mockRejectedValue(new Error('boom'));
			const shutdownB = jest.fn().mockResolvedValue(undefined);
			const disposeA = jest.fn();
			const disposeB = jest.fn();

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const internal = service as any;
			internal.connections.set('agent-1:slack:cred-1', {
				chat: {
					shutdown: shutdownA,
					webhooks: {},
					onAction: jest.fn(),
					onNewMention: jest.fn(),
					onSubscribedMessage: jest.fn(),
					initialize: jest.fn(),
				},
				bridge: { dispose: disposeA },
			});
			internal.connections.set('agent-2:telegram:cred-2', {
				chat: {
					shutdown: shutdownB,
					webhooks: {},
					onAction: jest.fn(),
					onNewMention: jest.fn(),
					onSubscribedMessage: jest.fn(),
					initialize: jest.fn(),
				},
				bridge: { dispose: disposeB },
			});

			await expect(service.disconnectAll()).resolves.toBeUndefined();

			expect(shutdownA).toHaveBeenCalledTimes(1);
			expect(shutdownB).toHaveBeenCalledTimes(1);
			expect(disposeA).toHaveBeenCalledTimes(1);
			expect(disposeB).toHaveBeenCalledTimes(1);
			expect(internal.connections.size).toBe(0);
		});
	});
});

describe('ChatIntegrationService — multi-main role-aware behavior', () => {
	beforeEach(() => {
		jest.clearAllMocks();
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
						{ type: 'telegram', credentialId: 'c1', credentialName: 'Tg' },
						{ type: 'linear', credentialId: 'c2', credentialName: 'Ln' },
					],
				}),
			]);

			const projectRelationRepository = mock<ProjectRelationRepository>();
			projectRelationRepository.findUserIdsByProjectId.mockResolvedValue(['u1']);

			const { service } = buildServiceWith({
				isLeader: false,
				registry,
				agentRepository,
				projectRelationRepository,
			});

			const connectSpy = jest.spyOn(service, 'connect').mockResolvedValue();

			await service.reconnectAll();

			expect(connectSpy).toHaveBeenCalledTimes(1);
			// Followers must not run external hooks during startup reconnect — the
			// leader owns Telegram setWebhook etc., so a follower racing it would
			// just trip Telegram's 1/sec rate limit.
			expect(connectSpy).toHaveBeenCalledWith('agent-1', 'c2', 'linear', 'u1', 'project-1', {
				skipExternalHooks: true,
			});
		});

		it('connects every integration when this main is the leader and runs external hooks', async () => {
			const registry = new ChatIntegrationRegistry();
			registry.register(new FakeIntegration('telegram', true));
			registry.register(new FakeIntegration('linear', false));

			const agentRepository = mock<AgentRepository>();
			agentRepository.findPublished.mockResolvedValue([
				makeAgent({
					integrations: [
						{ type: 'telegram', credentialId: 'c1', credentialName: 'Tg' },
						{ type: 'linear', credentialId: 'c2', credentialName: 'Ln' },
					],
				}),
			]);

			const projectRelationRepository = mock<ProjectRelationRepository>();
			projectRelationRepository.findUserIdsByProjectId.mockResolvedValue(['u1']);

			const { service } = buildServiceWith({
				isLeader: true,
				registry,
				agentRepository,
				projectRelationRepository,
			});

			const connectSpy = jest.spyOn(service, 'connect').mockResolvedValue();

			await service.reconnectAll();

			expect(connectSpy).toHaveBeenCalledTimes(2);
			for (const call of connectSpy.mock.calls) {
				expect(call[5]).toEqual({ skipExternalHooks: false });
			}
		});

		it('skips integrations that are already connected', async () => {
			const registry = new ChatIntegrationRegistry();
			registry.register(new FakeIntegration('linear', false));

			const agentRepository = mock<AgentRepository>();
			agentRepository.findPublished.mockResolvedValue([
				makeAgent({
					integrations: [{ type: 'linear', credentialId: 'c1', credentialName: 'Ln' }],
				}),
			]);

			const projectRelationRepository = mock<ProjectRelationRepository>();
			projectRelationRepository.findUserIdsByProjectId.mockResolvedValue(['u1']);

			const { service } = buildServiceWith({
				isLeader: true,
				registry,
				agentRepository,
				projectRelationRepository,
			});

			// Pretend this integration is already connected (e.g. leader-takeover
			// scenario where webhook integrations were already running on the
			// former-follower).
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const internal = service as any;
			internal.connections.set('agent-1:linear:c1', {});

			const connectSpy = jest.spyOn(service, 'connect').mockResolvedValue();

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

			const disconnectOneSpy = jest
				.spyOn(
					service as unknown as { disconnectOne: (k: string) => Promise<void> },
					'disconnectOne',
				)
				.mockImplementation(async () => undefined);

			await service.disconnectLeaderOnlyIntegrations();

			expect(disconnectOneSpy).toHaveBeenCalledTimes(1);
			expect(disconnectOneSpy).toHaveBeenCalledWith('agent-1:telegram:c1');
		});
	});

	describe('handleIntegrationChanged', () => {
		it('routes disconnect actions to disconnect()', async () => {
			const { service } = buildServiceWith();
			const disconnectSpy = jest.spyOn(service, 'disconnect').mockResolvedValue();

			await service.handleIntegrationChanged({
				agentId: 'a1',
				type: 'linear',
				credentialId: 'c1',
				action: 'disconnect',
			});

			expect(disconnectSpy).toHaveBeenCalledWith('a1', 'linear', 'c1');
		});

		it('skips connect for a leader-only integration on a follower', async () => {
			const registry = new ChatIntegrationRegistry();
			registry.register(new FakeIntegration('telegram', true));

			const { service } = buildServiceWith({ isLeader: false, registry });

			const connectSpy = jest.spyOn(service, 'connect').mockResolvedValue();

			await service.handleIntegrationChanged({
				agentId: 'a1',
				type: 'telegram',
				credentialId: 'c1',
				action: 'connect',
			});

			expect(connectSpy).not.toHaveBeenCalled();
		});

		it('connects a webhook integration on a follower and skips external hooks', async () => {
			const registry = new ChatIntegrationRegistry();
			registry.register(new FakeIntegration('linear', false));

			const agentRepository = mock<AgentRepository>();
			agentRepository.findOne.mockResolvedValue(makeAgent({ id: 'a1', projectId: 'p1' }));

			const projectRelationRepository = mock<ProjectRelationRepository>();
			projectRelationRepository.findUserIdsByProjectId.mockResolvedValue(['u1']);

			const { service } = buildServiceWith({
				isLeader: false,
				registry,
				agentRepository,
				projectRelationRepository,
			});

			const connectSpy = jest.spyOn(service, 'connect').mockResolvedValue();

			await service.handleIntegrationChanged({
				agentId: 'a1',
				type: 'linear',
				credentialId: 'c1',
				action: 'connect',
			});

			// External hooks (Telegram setWebhook, DB validation) already ran on
			// the originator — the peer must skip them to avoid duplicate API
			// calls and the resulting 429 rate-limit failure.
			expect(connectSpy).toHaveBeenCalledWith('a1', 'c1', 'linear', 'u1', 'p1', {
				skipExternalHooks: true,
			});
		});

		it('falls through user list until one succeeds', async () => {
			const registry = new ChatIntegrationRegistry();
			registry.register(new FakeIntegration('linear', false));

			const agentRepository = mock<AgentRepository>();
			agentRepository.findOne.mockResolvedValue(makeAgent({ id: 'a1', projectId: 'p1' }));

			const projectRelationRepository = mock<ProjectRelationRepository>();
			projectRelationRepository.findUserIdsByProjectId.mockResolvedValue([
				'u-no-access',
				'u-with-access',
			]);

			const { service } = buildServiceWith({
				registry,
				agentRepository,
				projectRelationRepository,
			});

			const connectSpy = jest
				.spyOn(service, 'connect')
				.mockImplementationOnce(async () => {
					throw new Error('no access');
				})
				.mockImplementationOnce(async () => undefined);

			await service.handleIntegrationChanged({
				agentId: 'a1',
				type: 'linear',
				credentialId: 'c1',
				action: 'connect',
			});

			expect(connectSpy).toHaveBeenCalledTimes(2);
			expect(connectSpy).toHaveBeenLastCalledWith('a1', 'c1', 'linear', 'u-with-access', 'p1', {
				skipExternalHooks: true,
			});
		});

		it('no-ops when the agent has been deleted', async () => {
			const registry = new ChatIntegrationRegistry();
			registry.register(new FakeIntegration('linear', false));

			const agentRepository = mock<AgentRepository>();
			agentRepository.findOne.mockResolvedValue(null);

			const { service } = buildServiceWith({ registry, agentRepository });

			const connectSpy = jest.spyOn(service, 'connect').mockResolvedValue();

			await service.handleIntegrationChanged({
				agentId: 'gone',
				type: 'linear',
				credentialId: 'c1',
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

			const connectSpy = jest.spyOn(service, 'connect').mockResolvedValue();

			await service.handleIntegrationChanged({
				agentId: 'a1',
				type: 'linear',
				credentialId: 'c1',
				action: 'connect',
			});

			expect(connectSpy).not.toHaveBeenCalled();
		});
	});

	describe('broadcastIntegrationChange', () => {
		it('does nothing when multi-main is disabled', async () => {
			const publisher = mock<Publisher>();
			const { service } = buildServiceWith({ multiMainEnabled: false, publisher });

			await service.broadcastIntegrationChange('a1', 'linear', 'c1', 'connect');

			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('publishes the change when multi-main is enabled', async () => {
			const publisher = mock<Publisher>();
			const { service } = buildServiceWith({ multiMainEnabled: true, publisher });

			await service.broadcastIntegrationChange('a1', 'linear', 'c1', 'disconnect');

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'agent-chat-integration-changed',
				payload: {
					agentId: 'a1',
					type: 'linear',
					credentialId: 'c1',
					action: 'disconnect',
				},
			});
		});

		it('swallows publisher failures so the user-facing flow keeps succeeding', async () => {
			const publisher = mock<Publisher>();
			publisher.publishCommand.mockRejectedValue(new Error('redis is down'));

			const { service } = buildServiceWith({ multiMainEnabled: true, publisher });

			await expect(
				service.broadcastIntegrationChange('a1', 'linear', 'c1', 'connect'),
			).resolves.toBeUndefined();
		});
	});
});

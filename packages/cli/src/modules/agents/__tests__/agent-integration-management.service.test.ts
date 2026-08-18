/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import type { AgentIntegrationConfig } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentIntegrationManagementService } from '../agent-integration-management.service';
import type { AgentIntegrationPersistenceService } from '../agent-integration-persistence.service';
import type { Agent } from '../entities/agent.entity';
import type {
	AgentChatIntegration,
	ChatIntegrationRegistry,
} from '../integrations/agent-chat-integration';
import type { ChatIntegrationService } from '../integrations/chat-integration.service';
import type { AgentRepository } from '../repositories/agent.repository';

describe('AgentIntegrationManagementService', () => {
	const user = { id: 'user-1' };
	const integration = {
		type: 'slack',
		credentialId: 'credential-1',
	} satisfies AgentIntegrationConfig;
	const replaced = { type: 'slack', credentialId: 'credential-0' } satisfies AgentIntegrationConfig;

	function makeAgent(overrides: Partial<Agent> = {}): Agent {
		return {
			id: 'agent-1',
			projectId: 'project-1',
			activeVersionId: 'version-1',
			integrations: [],
			...overrides,
		} as Agent;
	}

	function makeService() {
		const persistenceService = mock<AgentIntegrationPersistenceService>();
		const credentialsService = mock<CredentialsService>();
		const chatService = mock<ChatIntegrationService>();
		const registry = mock<ChatIntegrationRegistry>();
		const logger = mock<Logger>();
		const agentRepository = mock<AgentRepository>();
		const implementation = mock<AgentChatIntegration>({
			type: 'slack',
			displayLabel: 'Slack',
			credentialTypes: ['slackApi'],
		});
		registry.require.mockReturnValue(implementation);
		registry.get.mockReturnValue(implementation);
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{ id: integration.credentialId, type: 'slackApi' },
		] as never);
		persistenceService.applyIntegrationDelta.mockImplementation(async (agent) => ({
			agent,
			changed: true,
		}));
		return {
			service: new AgentIntegrationManagementService(
				persistenceService,
				credentialsService,
				chatService,
				registry,
				logger,
				agentRepository,
			),
			persistenceService,
			credentialsService,
			chatService,
			implementation,
			agentRepository,
		};
	}

	/**
	 * Mirrors what the real delta does to the entity: it corrects `activeVersionId`
	 * to the row it read, which is what callers derive their response from.
	 */
	function deltaResult(agent: Agent, published: boolean, extra: object = {}) {
		agent.activeVersionId = published ? 'version-1' : null;
		return { agent, changed: true, published, ...extra };
	}

	/** Stub the persisted row the mutation reads before it touches the runtime. */
	function stubRow(
		agentRepository: ReturnType<typeof mock<AgentRepository>>,
		integrations: AgentIntegrationConfig[],
		activeVersionId: string | null = 'version-1',
	) {
		agentRepository.findIntegrationState.mockResolvedValue({
			integrations,
			versionId: 'draft-1',
			activeVersionId,
		});
	}

	/** First call order of a mock, for asserting one step ran before another. */
	function order(fn: { mock: { invocationCallOrder: number[] } }): number {
		const [first] = fn.mock.invocationCallOrder;
		expect(first).toBeDefined();
		return first;
	}

	describe('adding a channel', () => {
		it('brings the connection up before the durable write, then broadcasts it', async () => {
			const { service, persistenceService, chatService, implementation } = makeService();
			const agent = makeAgent();

			await service.connect({ agent, user: user as never, integration });

			expect(implementation.validateConfig).toHaveBeenCalledWith(integration);
			expect(chatService.connect).toHaveBeenCalledWith(agent.id, integration, agent.projectId);
			expect(persistenceService.applyIntegrationDelta).toHaveBeenCalledWith(
				agent,
				{ add: integration },
				{ user, modifiedBy: 'user' },
			);
			expect(order(chatService.connect)).toBeLessThan(
				order(persistenceService.applyIntegrationDelta),
			);
			expect(chatService.broadcastIntegrationChange).toHaveBeenCalledWith(
				agent.id,
				integration,
				'connect',
			);
			expect(order(persistenceService.applyIntegrationDelta)).toBeLessThan(
				order(chatService.broadcastIntegrationChange),
			);
		});

		it('persists nothing when the connection fails to start', async () => {
			const { service, persistenceService, chatService } = makeService();
			const startupError = new Error('Slack connect failed');
			chatService.connect.mockRejectedValue(startupError);

			await expect(
				service.connect({ agent: makeAgent(), user: user as never, integration }),
			).rejects.toBe(startupError);

			expect(persistenceService.applyIntegrationDelta).not.toHaveBeenCalled();
			expect(chatService.broadcastIntegrationChange).not.toHaveBeenCalled();
		});

		it('releases the new connection when the durable write fails', async () => {
			const { service, persistenceService, chatService } = makeService();
			const writeError = new Error('write failed');
			persistenceService.applyIntegrationDelta.mockRejectedValue(writeError);
			const agent = makeAgent();

			await expect(service.connect({ agent, user: user as never, integration })).rejects.toBe(
				writeError,
			);

			expect(chatService.connect).toHaveBeenCalled();
			// Local teardown only: nothing durable changed, so a broadcast would have
			// peers tear down runtimes that are still persisted and still healthy.
			expect(chatService.disconnect).toHaveBeenCalledWith(agent.id, integration);
			expect(chatService.disconnectChannel).not.toHaveBeenCalled();
			expect(chatService.broadcastIntegrationChange).not.toHaveBeenCalled();
		});

		it('puts a restarted channel back on its persisted entry when the write fails', async () => {
			// Re-saving a channel (e.g. a settings-only edit) restarts its runtime. The
			// row never changed, so the channel must end up running what the row holds
			// — not the settings this failed write was trying to persist.
			const { service, persistenceService, chatService, agentRepository } = makeService();
			const persistedEntry = { type: 'slack', credentialId: 'credential-1' } as const;
			const agent = makeAgent({ integrations: [persistedEntry] });
			stubRow(agentRepository, [persistedEntry]);
			chatService.getChatInstance.mockReturnValue({} as never);
			persistenceService.applyIntegrationDelta.mockRejectedValue(new Error('write failed'));

			await expect(service.connect({ agent, user: user as never, integration })).rejects.toThrow(
				'write failed',
			);

			// Restoring is enough on its own: `connect` releases the existing key
			// before rebuilding. No broadcast, so peers keep their healthy runtimes.
			expect(chatService.connect).toHaveBeenLastCalledWith(
				agent.id,
				persistedEntry,
				agent.projectId,
			);
			expect(chatService.disconnectChannel).not.toHaveBeenCalled();
			expect(chatService.broadcastIntegrationChange).not.toHaveBeenCalled();
		});

		it('restores the previous runtime when the restart itself fails', async () => {
			// `connect` releases the live connection before building the new one, so a
			// failed rebuild would otherwise strand a still-persisted channel.
			const { service, persistenceService, chatService, agentRepository } = makeService();
			const persistedEntry = { type: 'slack', credentialId: 'credential-1' } as const;
			const agent = makeAgent({ integrations: [persistedEntry] });
			stubRow(agentRepository, [persistedEntry]);
			chatService.getChatInstance.mockReturnValue({} as never);
			chatService.connect.mockRejectedValueOnce(new Error('Slack connect failed'));

			await expect(service.connect({ agent, user: user as never, integration })).rejects.toThrow(
				'Slack connect failed',
			);

			expect(chatService.connect).toHaveBeenCalledTimes(2);
			expect(chatService.connect).toHaveBeenLastCalledWith(
				agent.id,
				persistedEntry,
				agent.projectId,
			);
			expect(persistenceService.applyIntegrationDelta).not.toHaveBeenCalled();
		});

		it('does not strand a channel this call created when the restart fails', async () => {
			const { service, chatService } = makeService();
			chatService.connect.mockRejectedValue(new Error('Slack connect failed'));

			await expect(
				service.connect({ agent: makeAgent(), user: user as never, integration }),
			).rejects.toThrow('Slack connect failed');

			// Nothing was live and nothing is persisted, so there is nothing to restore.
			expect(chatService.connect).toHaveBeenCalledTimes(1);
		});

		it('persists an unpublished agent without starting a runtime', async () => {
			const { service, persistenceService, chatService } = makeService();
			const agent = makeAgent({ activeVersionId: null });

			await service.connect({ agent, user: user as never, integration });

			expect(chatService.validateBeforeConnect).toHaveBeenCalledWith(
				agent.id,
				integration,
				agent.projectId,
			);
			expect(chatService.connect).not.toHaveBeenCalled();
			expect(chatService.broadcastIntegrationChange).not.toHaveBeenCalled();
			expect(persistenceService.applyIntegrationDelta).toHaveBeenCalledWith(
				agent,
				{ add: integration },
				{ user, modifiedBy: 'user' },
			);
		});

		it('persists nothing when the unpublished pre-connect check rejects', async () => {
			const { service, persistenceService, chatService } = makeService();
			const conflict = new Error('credential already in use');
			chatService.validateBeforeConnect.mockRejectedValue(conflict);

			await expect(
				service.connect({
					agent: makeAgent({ activeVersionId: null }),
					user: user as never,
					integration,
				}),
			).rejects.toBe(conflict);

			expect(persistenceService.applyIntegrationDelta).not.toHaveBeenCalled();
		});

		it('rejects a credential the user cannot use', async () => {
			const { service, persistenceService, credentialsService, chatService } = makeService();
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([]);

			await expect(
				service.connect({ agent: makeAgent(), user: user as never, integration }),
			).rejects.toThrow(NotFoundError);

			expect(chatService.connect).not.toHaveBeenCalled();
			expect(persistenceService.applyIntegrationDelta).not.toHaveBeenCalled();
		});

		it('rejects a credential of the wrong type for the platform', async () => {
			const { service, persistenceService, credentialsService, chatService } = makeService();
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
				{ id: integration.credentialId, type: 'telegramApi' },
			] as never);

			await expect(
				service.connect({ agent: makeAgent(), user: user as never, integration }),
			).rejects.toThrow(BadRequestError);

			expect(chatService.connect).not.toHaveBeenCalled();
			expect(persistenceService.applyIntegrationDelta).not.toHaveBeenCalled();
		});
	});

	describe('publication state changing mid-request', () => {
		it('starts the runtime when the agent was published while the request was in flight', async () => {
			// Loaded as a draft, so step 1 only pre-validated; the write saw it published.
			const { service, persistenceService, chatService } = makeService();
			const agent = makeAgent({ activeVersionId: null });
			persistenceService.applyIntegrationDelta.mockImplementation(async () =>
				deltaResult(agent, true),
			);

			const { savedAgent } = await service.connect({ agent, user: user as never, integration });

			expect(chatService.validateBeforeConnect).toHaveBeenCalled();
			expect(chatService.connect).toHaveBeenCalledWith(agent.id, integration, agent.projectId);
			// The controller reports "configured" vs "connected" off this value, so a
			// started runtime must not come back looking unpublished.
			expect(savedAgent.activeVersionId).not.toBeNull();
			expect(order(persistenceService.applyIntegrationDelta)).toBeLessThan(
				order(chatService.connect),
			);
			expect(chatService.broadcastIntegrationChange).toHaveBeenCalledWith(
				agent.id,
				integration,
				'connect',
			);
		});

		it('does not report a connection when the post-publish start fails', async () => {
			const { service, persistenceService, chatService } = makeService();
			const agent = makeAgent({ activeVersionId: null });
			persistenceService.applyIntegrationDelta.mockImplementation(async () =>
				deltaResult(agent, true),
			);
			chatService.connect.mockRejectedValue(new Error('Slack connect failed'));

			// The entry is already durable, so this must not fail the request.
			await expect(
				service.connect({ agent, user: user as never, integration }),
			).resolves.toMatchObject({ integration });
			expect(chatService.broadcastIntegrationChange).not.toHaveBeenCalled();
		});

		it('releases the runtime when the agent was unpublished while the request was in flight', async () => {
			// Loaded as published, so step 1 connected; the write saw it unpublished.
			const { service, persistenceService, chatService } = makeService();
			const agent = makeAgent();
			persistenceService.applyIntegrationDelta.mockImplementation(async () =>
				deltaResult(agent, false),
			);

			const { savedAgent } = await service.connect({ agent, user: user as never, integration });

			expect(chatService.connect).toHaveBeenCalled();
			// An unpublished agent must not receive events, and must not be announced
			// to peers as connected. Subscriptions survive for a later publish.
			expect(chatService.disconnectChannel).toHaveBeenCalledWith(agent.id, integration, {
				deleteSubscriptions: false,
			});
			expect(chatService.broadcastIntegrationChange).not.toHaveBeenCalled();
			// ...and the response must not claim it is connected.
			expect(savedAgent.activeVersionId).toBeNull();
		});

		it('restarts the runtime when a peer tore it down mid-mutation', async () => {
			const { service, persistenceService, chatService, agentRepository } = makeService();
			const agent = makeAgent();
			stubRow(agentRepository, []);
			// Never live: not before the connect, and gone again by the time the write
			// finished — as if a peer's disconnect broadcast landed in between.
			chatService.getChatInstance.mockReturnValue(undefined);
			persistenceService.applyIntegrationDelta.mockImplementation(async () =>
				deltaResult(agent, true),
			);

			await service.connect({ agent, user: user as never, integration });

			expect(chatService.connect).toHaveBeenCalledTimes(2);
			expect(chatService.broadcastIntegrationChange).toHaveBeenCalledWith(
				agent.id,
				integration,
				'connect',
			);
		});

		it('leaves an unpublished agent alone when the write agrees it is unpublished', async () => {
			const { service, persistenceService, chatService } = makeService();
			const agent = makeAgent({ activeVersionId: null });
			persistenceService.applyIntegrationDelta.mockImplementation(async () =>
				deltaResult(agent, false),
			);

			await service.connect({ agent, user: user as never, integration });

			expect(chatService.connect).not.toHaveBeenCalled();
			expect(chatService.disconnectChannel).not.toHaveBeenCalled();
			expect(chatService.broadcastIntegrationChange).not.toHaveBeenCalled();
		});
	});

	describe('removing a channel', () => {
		it('runs platform cleanup after durable removal and returns its warning', async () => {
			const { service, persistenceService, chatService, implementation, agentRepository } =
				makeService();
			const agent = makeAgent({ integrations: [integration] });
			const warning = {
				integrationType: 'slack',
				code: 'app_not_deleted',
				action: { type: 'open_url', url: 'https://example.test/settings' },
			} as const;
			const removal = mock<Required<Pick<AgentChatIntegration, 'onRemove'>>>();
			stubRow(agentRepository, [integration]);
			removal.onRemove.mockResolvedValue(warning);
			implementation.onRemove = removal.onRemove;
			persistenceService.applyIntegrationDelta.mockResolvedValue({
				agent,
				changed: true,
				removed: integration,
			});

			await expect(
				service.disconnect({
					agent,
					user: user as never,
					type: integration.type,
					credentialId: integration.credentialId,
					deleteExternalResource: true,
				}),
			).resolves.toMatchObject({ warning });

			expect(order(persistenceService.applyIntegrationDelta)).toBeLessThan(order(removal.onRemove));
			expect(order(removal.onRemove)).toBeLessThan(order(chatService.disconnectChannel));
		});

		it('tears down the runtime when platform cleanup fails after durable removal', async () => {
			const { service, persistenceService, chatService, implementation } = makeService();
			const agent = makeAgent({ integrations: [integration] });
			const cleanupError = new Error('Slack cleanup failed');
			const removal = mock<Required<Pick<AgentChatIntegration, 'onRemove'>>>();
			removal.onRemove.mockRejectedValue(cleanupError);
			implementation.onRemove = removal.onRemove;
			persistenceService.applyIntegrationDelta.mockResolvedValue({
				agent,
				changed: true,
				removed: integration,
			});

			await expect(
				service.disconnect({
					agent,
					user: user as never,
					type: integration.type,
					credentialId: integration.credentialId,
					deleteExternalResource: true,
				}),
			).rejects.toBe(cleanupError);

			expect(chatService.disconnectChannel).toHaveBeenCalledWith(agent.id, integration);
			expect(order(persistenceService.applyIntegrationDelta)).toBeLessThan(order(removal.onRemove));
			expect(order(removal.onRemove)).toBeLessThan(order(chatService.disconnectChannel));
		});

		it('removes persistence before tearing down the runtime channel', async () => {
			const { service, persistenceService, chatService } = makeService();
			const agent = makeAgent({ integrations: [integration] });
			persistenceService.applyIntegrationDelta.mockResolvedValue({
				agent,
				changed: true,
				removed: integration,
			});

			await service.disconnect({
				agent,
				user: user as never,
				type: integration.type,
				credentialId: integration.credentialId,
				modifiedBy: 'mcp',
			});

			expect(persistenceService.applyIntegrationDelta).toHaveBeenCalledWith(
				agent,
				{ remove: { type: integration.type, credentialId: integration.credentialId } },
				{ user, modifiedBy: 'mcp' },
			);
			expect(chatService.disconnectChannel).toHaveBeenCalledWith(agent.id, integration);
			expect(order(persistenceService.applyIntegrationDelta)).toBeLessThan(
				order(chatService.disconnectChannel),
			);
		});

		it('leaves the channel and its managed resources intact when durable removal fails', async () => {
			const { service, persistenceService, chatService, implementation, agentRepository } =
				makeService();
			const removalError = new Error('write failed');
			persistenceService.applyIntegrationDelta.mockRejectedValue(removalError);
			stubRow(agentRepository, [integration]);

			await expect(
				service.disconnect({
					agent: makeAgent({ integrations: [integration] }),
					user: user as never,
					type: integration.type,
					credentialId: integration.credentialId,
					deleteExternalResource: true,
				}),
			).rejects.toBe(removalError);

			expect(implementation.onRemove).not.toHaveBeenCalled();
			expect(chatService.disconnectChannel).not.toHaveBeenCalled();
			expect(chatService.disconnect).not.toHaveBeenCalled();
		});

		it('clears a stray runtime connection when nothing was persisted under that reference', async () => {
			const { service, persistenceService, chatService } = makeService();
			const agent = makeAgent();
			persistenceService.applyIntegrationDelta.mockResolvedValue({ agent, changed: false });

			await service.disconnect({
				agent,
				user: user as never,
				type: 'slack',
				credentialId: '',
			});

			expect(chatService.disconnectChannel).not.toHaveBeenCalled();
			expect(chatService.disconnect).toHaveBeenCalledWith(agent.id, {
				type: 'slack',
				credentialId: '',
			});
			// A draft reference is not a real connection anywhere, so it stays local.
			expect(chatService.broadcastIntegrationChange).not.toHaveBeenCalled();
		});

		it('tells peer mains about a stray connection that is no longer persisted', async () => {
			const { service, persistenceService, chatService } = makeService();
			const agent = makeAgent();
			persistenceService.applyIntegrationDelta.mockResolvedValue({ agent, changed: false });

			await service.disconnect({
				agent,
				user: user as never,
				type: integration.type,
				credentialId: integration.credentialId,
			});

			expect(chatService.disconnect).toHaveBeenCalledWith(agent.id, integration);
			expect(chatService.broadcastIntegrationChange).toHaveBeenCalledWith(
				agent.id,
				integration,
				'disconnect',
			);
		});
	});

	describe('concurrent mutations on the same agent', () => {
		it('does not let a removal tear down a connection a queued re-connect made', async () => {
			const { service, persistenceService, chatService } = makeService();
			const agent = makeAgent({ integrations: [integration] });
			let releaseWrite!: () => void;
			const writeGate = new Promise<void>((resolve) => {
				releaseWrite = resolve;
			});

			persistenceService.applyIntegrationDelta.mockImplementationOnce(async () => {
				await writeGate;
				return { agent, changed: true, published: true, removed: integration };
			});
			persistenceService.applyIntegrationDelta.mockImplementation(async () => ({
				agent,
				changed: true,
				published: true,
			}));

			const removal = service.disconnect({
				agent,
				user: user as never,
				type: integration.type,
				credentialId: integration.credentialId,
			});
			const reconnect = service.connect({ agent, user: user as never, integration });

			// Give the re-connect every chance to run while the removal's write is
			// still pending. Queued, it cannot have touched the runtime yet;
			// interleaved, it would already have connected — and the removal's release
			// would then tear that connection down and leave the row configured with
			// nothing running.
			for (let tick = 0; tick < 10; tick++) await new Promise((resolve) => setTimeout(resolve, 0));
			expect(chatService.connect).not.toHaveBeenCalled();

			releaseWrite();
			await Promise.all([removal, reconnect]);

			expect(order(chatService.disconnectChannel)).toBeLessThan(order(chatService.connect));
		});
	});

	describe('replacing a channel', () => {
		it('starts the new channel, swaps in one write, then releases the old one', async () => {
			const { service, persistenceService, chatService, implementation } = makeService();
			const agent = makeAgent({ integrations: [replaced] });
			persistenceService.applyIntegrationDelta.mockResolvedValue({
				agent,
				changed: true,
				removed: replaced,
			});

			await service.connect({
				agent,
				user: user as never,
				integration,
				replaces: { type: replaced.type, credentialId: replaced.credentialId },
			});

			expect(persistenceService.applyIntegrationDelta).toHaveBeenCalledWith(
				agent,
				{ add: integration, remove: { type: 'slack', credentialId: replaced.credentialId } },
				{ user, modifiedBy: 'user' },
			);
			expect(order(chatService.connect)).toBeLessThan(
				order(persistenceService.applyIntegrationDelta),
			);
			expect(implementation.onRemove).not.toHaveBeenCalled();
			expect(chatService.disconnectChannel).toHaveBeenCalledWith(agent.id, replaced);
			expect(order(persistenceService.applyIntegrationDelta)).toBeLessThan(
				order(chatService.disconnectChannel),
			);
		});

		it('does not release the connection it just made when asked to replace it with itself', async () => {
			const { service, persistenceService, chatService } = makeService();
			const agent = makeAgent({ integrations: [integration] });

			await service.connect({
				agent,
				user: user as never,
				integration,
				replaces: { type: integration.type, credentialId: integration.credentialId },
			});

			expect(persistenceService.applyIntegrationDelta).toHaveBeenCalledWith(
				agent,
				{ add: integration, remove: undefined },
				{ user, modifiedBy: 'user' },
			);
			expect(chatService.disconnectChannel).not.toHaveBeenCalled();
			expect(chatService.disconnect).not.toHaveBeenCalled();
			expect(chatService.broadcastIntegrationChange).toHaveBeenCalledWith(
				agent.id,
				integration,
				'connect',
			);
		});

		it('keeps the old channel live and persisted when the new one fails to start', async () => {
			const { service, persistenceService, chatService } = makeService();
			chatService.connect.mockRejectedValue(new Error('Slack connect failed'));

			await expect(
				service.connect({
					agent: makeAgent({ integrations: [replaced] }),
					user: user as never,
					integration,
					replaces: { type: replaced.type, credentialId: replaced.credentialId },
				}),
			).rejects.toThrow('Slack connect failed');

			expect(persistenceService.applyIntegrationDelta).not.toHaveBeenCalled();
			expect(chatService.disconnectChannel).not.toHaveBeenCalled();
		});

		it('keeps the old channel live when the swap fails to persist', async () => {
			const { service, persistenceService, chatService, implementation } = makeService();
			persistenceService.applyIntegrationDelta.mockRejectedValue(new Error('write failed'));
			const agent = makeAgent({ integrations: [replaced] });

			await expect(
				service.connect({
					agent,
					user: user as never,
					integration,
					replaces: { type: replaced.type, credentialId: replaced.credentialId },
				}),
			).rejects.toThrow('write failed');

			// Only the connection we just brought up is released, locally, and the old
			// one stays — on this main and on every peer.
			expect(chatService.disconnect).toHaveBeenCalledWith(agent.id, integration);
			expect(implementation.onRemove).not.toHaveBeenCalled();
			expect(chatService.disconnectChannel).not.toHaveBeenCalled();
			expect(chatService.broadcastIntegrationChange).not.toHaveBeenCalled();
		});
	});

	it.each([
		['unpublished', null, undefined, true],
		['published', 'version-1', undefined, false],
		['unpublished with an explicit opt-out', null, false, false],
		['published with an explicit opt-in', 'version-1', true, true],
	])(
		'uses the expected external deletion policy for %s agents',
		async (_scenario, activeVersionId, deleteExternalResource, expected) => {
			const { service, persistenceService, implementation, agentRepository } = makeService();
			const connectedAgent = makeAgent({ activeVersionId, integrations: [integration] });
			stubRow(agentRepository, [integration], activeVersionId);
			persistenceService.applyIntegrationDelta.mockResolvedValue({
				agent: connectedAgent,
				changed: true,
				removed: integration,
			});

			await service.disconnect({
				agent: connectedAgent,
				user: user as never,
				type: integration.type,
				credentialId: integration.credentialId,
				deleteExternalResource,
			});

			expect(implementation.onRemove).toHaveBeenCalledWith({
				agentId: connectedAgent.id,
				projectId: connectedAgent.projectId,
				credentialId: integration.credentialId,
				user,
				deleteExternalResource: expected,
			});
		},
	);
});

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
		const implementation = mock<AgentChatIntegration>({
			type: 'slack',
			displayLabel: 'Slack',
			credentialTypes: ['slackApi'],
		});
		registry.require.mockReturnValue(implementation);
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
			),
			persistenceService,
			credentialsService,
			chatService,
			implementation,
		};
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
			// Thread subscriptions are never deleted on a rollback — that is not
			// recoverable, and the row this call failed to change may still want them.
			expect(chatService.disconnectChannel).toHaveBeenCalledWith(agent.id, integration, {
				deleteSubscriptions: false,
			});
			expect(chatService.broadcastIntegrationChange).not.toHaveBeenCalled();
		});

		it('keeps an already-live channel running when the durable write fails', async () => {
			// Re-saving a channel (e.g. a settings-only edit) restarts its runtime.
			// The row never changed, so the restarted channel must stay up.
			const { service, persistenceService, chatService } = makeService();
			chatService.getChatInstance.mockReturnValue({} as never);
			persistenceService.applyIntegrationDelta.mockRejectedValue(new Error('write failed'));

			await expect(
				service.connect({
					agent: makeAgent({ integrations: [integration] }),
					user: user as never,
					integration,
				}),
			).rejects.toThrow('write failed');

			expect(chatService.connect).toHaveBeenCalled();
			expect(chatService.disconnectChannel).not.toHaveBeenCalled();
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
			persistenceService.applyIntegrationDelta.mockResolvedValue({
				agent,
				changed: true,
				published: true,
			});

			await service.connect({ agent, user: user as never, integration });

			expect(chatService.validateBeforeConnect).toHaveBeenCalled();
			expect(chatService.connect).toHaveBeenCalledWith(agent.id, integration, agent.projectId);
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
			persistenceService.applyIntegrationDelta.mockResolvedValue({
				agent,
				changed: true,
				published: true,
			});
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
			persistenceService.applyIntegrationDelta.mockResolvedValue({
				agent,
				changed: true,
				published: false,
			});

			await service.connect({ agent, user: user as never, integration });

			expect(chatService.connect).toHaveBeenCalled();
			// An unpublished agent must not receive events, and must not be announced
			// to peers as connected. Subscriptions survive for a later publish.
			expect(chatService.disconnectChannel).toHaveBeenCalledWith(agent.id, integration, {
				deleteSubscriptions: false,
			});
			expect(chatService.broadcastIntegrationChange).not.toHaveBeenCalled();
		});

		it('leaves an unpublished agent alone when the write agrees it is unpublished', async () => {
			const { service, persistenceService, chatService } = makeService();
			const agent = makeAgent({ activeVersionId: null });
			persistenceService.applyIntegrationDelta.mockResolvedValue({
				agent,
				changed: true,
				published: false,
			});

			await service.connect({ agent, user: user as never, integration });

			expect(chatService.connect).not.toHaveBeenCalled();
			expect(chatService.disconnectChannel).not.toHaveBeenCalled();
			expect(chatService.broadcastIntegrationChange).not.toHaveBeenCalled();
		});
	});

	describe('removing a channel', () => {
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

		it('leaves the channel live when the durable removal fails', async () => {
			const { service, persistenceService, chatService } = makeService();
			const removalError = new Error('write failed');
			persistenceService.applyIntegrationDelta.mockRejectedValue(removalError);

			await expect(
				service.disconnect({
					agent: makeAgent({ integrations: [integration] }),
					user: user as never,
					type: integration.type,
					credentialId: integration.credentialId,
				}),
			).rejects.toBe(removalError);

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

	describe('replacing a channel', () => {
		it('starts the new channel, swaps in one write, then releases the old one', async () => {
			const { service, persistenceService, chatService } = makeService();
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
			const { service, persistenceService, chatService } = makeService();
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

			// Only the connection we just brought up is released; the old one stays.
			expect(chatService.disconnectChannel).toHaveBeenCalledTimes(1);
			expect(chatService.disconnectChannel).toHaveBeenCalledWith(agent.id, integration, {
				deleteSubscriptions: false,
			});
		});
	});
});

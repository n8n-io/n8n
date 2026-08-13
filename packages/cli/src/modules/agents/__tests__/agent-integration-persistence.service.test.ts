/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import type { AgentIntegrationConfig, AgentJsonConfig } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { OperationalError, UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { EventService } from '@/events/event.service';
import type { Telemetry } from '@/telemetry';

import { AgentIntegrationPersistenceService } from '../agent-integration-persistence.service';
import { AgentModificationTelemetryService } from '../agent-modification-telemetry.service';
import type { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import type { AgentSetupCompletionService } from '../agent-setup-completion.service';
import type { Agent } from '../entities/agent.entity';
import type { ChatIntegrationRegistry } from '../integrations/agent-chat-integration';
import type { AgentIntegrationState, AgentRepository } from '../repositories/agent.repository';

const agentId = 'agent-1';
const projectId = 'project-1';
const user = { id: 'user-1' } as User;
const byUser = { user, modifiedBy: 'user' as const };

const blankConfig: AgentJsonConfig = {
	name: 'Support Agent',
	model: '',
	instructions: '',
};

const configuredConfig: AgentJsonConfig = {
	name: 'Support Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Help users',
};

type SetupOptions = {
	/** Persisted channels; also seeds the caller's entity unless `stale` overrides it. */
	integrations?: AgentIntegrationConfig[];
	/** What the caller's entity believes is persisted, when that has gone stale. */
	stale?: AgentIntegrationConfig[];
	versionId?: string | null;
	activeVersionId?: string | null;
	schema?: AgentJsonConfig | null;
};

/**
 * Backs the repository with a mutable row so the delta projection and the
 * compare-and-set are actually exercised, and assertions can read the persisted
 * result rather than inspect a save call.
 */
function setup(options: SetupOptions = {}) {
	const agentRepository = mock<AgentRepository>();
	const runtimeCacheService = mock<AgentRuntimeCacheService>();
	const chatIntegrationRegistry = mock<ChatIntegrationRegistry>();
	const eventService = mock<EventService>();
	const telemetry = mock<Telemetry>();
	const credentialsService = mock<CredentialsService>();
	const setupCompletionService = mock<AgentSetupCompletionService>();

	const row: AgentIntegrationState = {
		integrations: options.integrations ?? [],
		versionId: options.versionId ?? 'version-1',
		activeVersionId: options.activeVersionId === undefined ? 'version-1' : options.activeVersionId,
	};

	agentRepository.findIntegrationState.mockImplementation(async () => ({
		...row,
		integrations: [...(row.integrations ?? [])],
	}));
	agentRepository.updateIntegrations.mockImplementation(
		async (_id, integrations, expected, versionId) => {
			// Mirrors the real WHERE clause: both guarded columns must still match.
			if (row.versionId !== expected.versionId) return false;
			if (row.activeVersionId !== expected.activeVersionId) return false;
			row.integrations = integrations;
			row.versionId = versionId;
			return true;
		},
	);
	setupCompletionService.recordIfSetupComplete.mockResolvedValue(null);

	const agent = {
		id: agentId,
		projectId,
		versionId: row.versionId,
		activeVersionId: row.activeVersionId,
		schema: options.schema === undefined ? configuredConfig : options.schema,
		integrations: options.stale ?? [...(row.integrations ?? [])],
		setupCompletedAt: null,
		updatedAt: new Date('2025-01-01T00:00:00Z'),
	} as Agent;

	return {
		service: new AgentIntegrationPersistenceService(
			agentRepository,
			runtimeCacheService,
			chatIntegrationRegistry,
			eventService,
			new AgentModificationTelemetryService(telemetry),
			credentialsService,
			setupCompletionService,
		),
		agent,
		row,
		agentRepository,
		runtimeCacheService,
		chatIntegrationRegistry,
		eventService,
		telemetry,
		credentialsService,
		setupCompletionService,
	};
}

describe('AgentIntegrationPersistenceService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('lists public descriptor metadata from the integration registry', () => {
		const { service, chatIntegrationRegistry } = setup();
		chatIntegrationRegistry.list.mockReturnValue([
			{
				type: 'n8n_chat',
				displayLabel: 'n8n Chat',
				displayIcon: 'message-square',
				credentialTypes: [],
				internal: true,
			},
		] as never);
		chatIntegrationRegistry.listPublic.mockReturnValue([
			{
				type: 'slack',
				displayLabel: 'Slack',
				displayIcon: 'slack',
				credentialTypes: ['slackApi'],
				builderGuidance: { capabilities: ['respond'] },
			},
		] as never);

		expect(service.listChatIntegrations()).toEqual([
			{
				type: 'slack',
				label: 'Slack',
				icon: 'slack',
				credentialTypes: ['slackApi'],
				capabilities: ['respond'],
				useIntegrationWhen: undefined,
				useNodeToolWhen: undefined,
			},
		]);
		expect(chatIntegrationRegistry.listPublic).toHaveBeenCalled();
		expect(chatIntegrationRegistry.list).not.toHaveBeenCalled();
	});

	describe('adding a channel', () => {
		it('appends to an empty list, starts a draft, and invalidates the runtime cache', async () => {
			const { service, agent, row, runtimeCacheService, eventService } = setup();

			const result = await service.applyIntegrationDelta(
				agent,
				{ add: { type: 'slack', credentialId: 'slack-1' } },
				byUser,
			);

			expect(result.changed).toBe(true);
			expect(row.integrations).toEqual([{ type: 'slack', credentialId: 'slack-1' }]);
			expect(row.versionId).not.toBe(row.activeVersionId);
			expect(agent.integrations).toEqual(row.integrations);
			expect(agent.versionId).toBe(row.versionId);
			expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
			expect(eventService.emit).toHaveBeenCalledWith('agent-saved', { agentId });
		});

		it('writes only the integration columns, never the whole entity', async () => {
			const { service, agent, agentRepository } = setup();

			await service.applyIntegrationDelta(
				agent,
				{ add: { type: 'slack', credentialId: 'slack-1' } },
				byUser,
			);

			expect(agentRepository.save).not.toHaveBeenCalled();
			expect(agentRepository.updateIntegrations).toHaveBeenCalledWith(
				agentId,
				[{ type: 'slack', credentialId: 'slack-1' }],
				// Both guarded columns, so a publish landing after the read is caught.
				{ versionId: 'version-1', activeVersionId: 'version-1' },
				expect.not.stringMatching('^version-1$'),
			);
		});

		it('projects onto the persisted row, not the stale entity the caller loaded', async () => {
			// A concurrent request added Linear after this caller loaded the agent.
			const { service, agent, row } = setup({
				integrations: [{ type: 'linear', credentialId: 'linear-1' }],
				stale: [],
			});

			await service.applyIntegrationDelta(
				agent,
				{ add: { type: 'slack', credentialId: 'slack-1' } },
				byUser,
			);

			expect(row.integrations).toEqual([
				{ type: 'linear', credentialId: 'linear-1' },
				{ type: 'slack', credentialId: 'slack-1' },
			]);
		});

		it('consumes a same-type draft entry when connecting a real credential', async () => {
			const { service, agent, row } = setup({
				integrations: [{ type: 'slack', credentialId: '' }],
			});

			await service.applyIntegrationDelta(
				agent,
				{ add: { type: 'slack', credentialId: 'c1' } },
				byUser,
			);

			expect(row.integrations).toEqual([{ type: 'slack', credentialId: 'c1' }]);
		});

		it('updates in place when the same type and credential is already persisted', async () => {
			const { service, agent, row } = setup({
				integrations: [
					{
						type: 'telegram',
						credentialId: 'telegram-1',
						settings: { accessMode: 'public', allowedUsers: [] },
					},
					{ type: 'linear', credentialId: 'linear-1' },
				],
			});

			await service.applyIntegrationDelta(
				agent,
				{
					add: {
						type: 'telegram',
						credentialId: 'telegram-1',
						settings: { accessMode: 'private', allowedUsers: ['@alice'] },
					},
				},
				byUser,
			);

			expect(row.integrations).toEqual([
				{
					type: 'telegram',
					credentialId: 'telegram-1',
					settings: { accessMode: 'private', allowedUsers: ['@alice'] },
				},
				{ type: 'linear', credentialId: 'linear-1' },
			]);
		});

		it('rotates the draft version even when the agent is already dirty', async () => {
			// The version is the compare-and-set token, so it has to move on every
			// write or a concurrent channel write would match the same value.
			const { service, agent, row } = setup({ versionId: 'draft-9', activeVersionId: 'version-1' });

			await service.applyIntegrationDelta(
				agent,
				{ add: { type: 'slack', credentialId: 'slack-1' } },
				byUser,
			);

			expect(row.versionId).not.toBe('draft-9');
			expect(row.versionId).not.toBe(row.activeVersionId);
			expect(agent.versionId).toBe(row.versionId);
		});

		it.each([
			['already dirty', { versionId: 'draft-9', activeVersionId: 'version-1' }],
			['in sync with its published version', { versionId: 'v', activeVersionId: 'v' }],
			['never published', { versionId: 'v', activeVersionId: null }],
		])('advances the compare-and-set token for an agent %s', async (_case, versions) => {
			// A write that guards on a value it also writes back cannot detect a
			// concurrent writer that read the same value.
			const { service, agent, agentRepository } = setup(versions);

			await service.applyIntegrationDelta(
				agent,
				{ add: { type: 'slack', credentialId: 'slack-1' } },
				byUser,
			);

			const [, , expected, writtenVersionId] = agentRepository.updateIntegrations.mock.calls[0];
			expect(expected.versionId).toBe(versions.versionId);
			expect(writtenVersionId).not.toBe(expected.versionId);
		});

		it('rejects payloads that would persist a channel without a credential', async () => {
			const { service, agent, agentRepository } = setup();

			await expect(
				service.applyIntegrationDelta(agent, { add: { type: 'slack', credentialId: '' } }, byUser),
			).rejects.toThrow(UserError);
			expect(agentRepository.updateIntegrations).not.toHaveBeenCalled();
		});
	});

	describe('removing a channel', () => {
		it('removes only the matching entry and reports it for runtime teardown', async () => {
			const { service, agent, row, runtimeCacheService } = setup({
				integrations: [
					{ type: 'slack', credentialId: 'slack-1' },
					{ type: 'linear', credentialId: 'linear-1' },
				],
			});

			const result = await service.applyIntegrationDelta(
				agent,
				{ remove: { type: 'slack', credentialId: 'slack-1' } },
				byUser,
			);

			expect(result.changed).toBe(true);
			expect(result.removed).toEqual({ type: 'slack', credentialId: 'slack-1' });
			expect(row.integrations).toEqual([{ type: 'linear', credentialId: 'linear-1' }]);
			expect(row.versionId).not.toBe(row.activeVersionId);
			expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
		});

		it('writes nothing when the list is empty', async () => {
			const { service, agent, agentRepository, telemetry } = setup();

			const result = await service.applyIntegrationDelta(
				agent,
				{ remove: { type: 'slack', credentialId: 'slack-1' } },
				byUser,
			);

			expect(result.changed).toBe(false);
			expect(result.removed).toBeUndefined();
			expect(agentRepository.updateIntegrations).not.toHaveBeenCalled();
			expect(telemetry.track).not.toHaveBeenCalled();
		});

		it('writes nothing when the entry is already gone', async () => {
			const { service, agent, agentRepository, telemetry } = setup({
				integrations: [{ type: 'linear', credentialId: 'linear-1' }],
			});

			const result = await service.applyIntegrationDelta(
				agent,
				{ remove: { type: 'slack', credentialId: 'slack-1' } },
				byUser,
			);

			expect(result.changed).toBe(false);
			expect(result.removed).toBeUndefined();
			expect(agentRepository.updateIntegrations).not.toHaveBeenCalled();
			expect(telemetry.track).not.toHaveBeenCalled();
		});
	});

	describe('replacing a channel', () => {
		it('swaps both entries in a single write', async () => {
			const { service, agent, row, agentRepository } = setup({
				integrations: [
					{ type: 'slack', credentialId: 'old' },
					{ type: 'linear', credentialId: 'linear-1' },
				],
			});

			const result = await service.applyIntegrationDelta(
				agent,
				{
					add: { type: 'slack', credentialId: 'new' },
					remove: { type: 'slack', credentialId: 'old' },
				},
				byUser,
			);

			expect(row.integrations).toEqual([
				{ type: 'linear', credentialId: 'linear-1' },
				{ type: 'slack', credentialId: 'new' },
			]);
			expect(result.removed).toEqual({ type: 'slack', credentialId: 'old' });
			expect(agentRepository.updateIntegrations).toHaveBeenCalledTimes(1);
		});

		it('reports no removal when the replaced credential is the added one', async () => {
			const { service, agent, row } = setup({
				integrations: [{ type: 'slack', credentialId: 'same' }],
			});

			const result = await service.applyIntegrationDelta(
				agent,
				{
					add: { type: 'slack', credentialId: 'same' },
					remove: { type: 'slack', credentialId: 'same' },
				},
				byUser,
			);

			expect(row.integrations).toEqual([{ type: 'slack', credentialId: 'same' }]);
			expect(result.removed).toBeUndefined();
		});

		it('still adds the new channel when the replaced entry is already gone', async () => {
			const { service, agent, row } = setup();

			const result = await service.applyIntegrationDelta(
				agent,
				{
					add: { type: 'slack', credentialId: 'new' },
					remove: { type: 'slack', credentialId: 'old' },
				},
				byUser,
			);

			expect(row.integrations).toEqual([{ type: 'slack', credentialId: 'new' }]);
			expect(result.changed).toBe(true);
			expect(result.removed).toBeUndefined();
		});
	});

	describe('publication state', () => {
		it('reports the state of the row, not the entity the caller loaded', async () => {
			// The caller loaded the agent while it was still a draft; a publish landed
			// before this write.
			const { service, agent, row } = setup({ versionId: 'v', activeVersionId: null });
			agent.activeVersionId = null;
			row.activeVersionId = 'version-1';

			const result = await service.applyIntegrationDelta(
				agent,
				{ add: { type: 'slack', credentialId: 'slack-1' } },
				byUser,
			);

			expect(result.published).toBe(true);
			// Callers derive their response from the entity, so it has to agree.
			expect(result.agent.activeVersionId).toBe('version-1');
		});

		it('reports an unpublished row even when the caller thought it was published', async () => {
			const { service, agent, row } = setup({ versionId: 'v', activeVersionId: 'version-1' });
			agent.activeVersionId = 'version-1';
			row.activeVersionId = null;

			const result = await service.applyIntegrationDelta(
				agent,
				{ add: { type: 'slack', credentialId: 'slack-1' } },
				byUser,
			);

			expect(result.published).toBe(false);
			expect(result.agent.activeVersionId).toBeNull();
		});

		it('corrects the entity even when the delta turned out to be a no-op', async () => {
			const { service, agent, row } = setup({ versionId: 'v', activeVersionId: null });
			agent.activeVersionId = null;
			row.activeVersionId = 'version-1';

			const result = await service.applyIntegrationDelta(
				agent,
				{ remove: { type: 'slack', credentialId: 'gone' } },
				byUser,
			);

			expect(result.changed).toBe(false);
			expect(result.published).toBe(true);
			expect(result.agent.activeVersionId).toBe('version-1');
		});
	});

	describe('concurrent writers', () => {
		it('re-reads and reapplies the delta when it loses the compare-and-set', async () => {
			const { service, agent, row, agentRepository } = setup();
			// A concurrent publish bumps the version between our read and our write.
			agentRepository.updateIntegrations.mockImplementationOnce(async () => {
				row.versionId = 'version-2';
				row.integrations = [{ type: 'linear', credentialId: 'linear-1' }];
				return false;
			});

			const result = await service.applyIntegrationDelta(
				agent,
				{ add: { type: 'slack', credentialId: 'slack-1' } },
				byUser,
			);

			expect(result.changed).toBe(true);
			expect(agentRepository.findIntegrationState).toHaveBeenCalledTimes(2);
			// The winner's change survives, and ours is applied on top of it.
			expect(row.integrations).toEqual([
				{ type: 'linear', credentialId: 'linear-1' },
				{ type: 'slack', credentialId: 'slack-1' },
			]);
		});

		it('re-reads when a publication lands between the read and the write', async () => {
			// A publish writes only `activeVersionId`, so `versionId` is untouched and
			// that guard alone cannot catch it.
			const { service, agent, row, agentRepository } = setup({
				versionId: 'v',
				activeVersionId: null,
			});
			agentRepository.findIntegrationState.mockImplementationOnce(async () => {
				const snapshot = { ...row, integrations: [...(row.integrations ?? [])] };
				row.activeVersionId = 'version-1';
				return snapshot;
			});

			const result = await service.applyIntegrationDelta(
				agent,
				{ add: { type: 'slack', credentialId: 'slack-1' } },
				byUser,
			);

			// The first attempt is refused, and the retry guards on what is now there.
			expect(agentRepository.updateIntegrations).toHaveBeenCalledTimes(2);
			expect(agentRepository.updateIntegrations.mock.calls[0][2]).toEqual({
				versionId: 'v',
				activeVersionId: null,
			});
			expect(agentRepository.updateIntegrations.mock.calls[1][2]).toEqual({
				versionId: 'v',
				activeVersionId: 'version-1',
			});
			// The point of guarding it: the caller must not gate runtime work on the
			// publication state that was read before the publish landed.
			expect(result.published).toBe(true);
			expect(result.agent.activeVersionId).toBe('version-1');
			expect(row.integrations).toEqual([{ type: 'slack', credentialId: 'slack-1' }]);
		});

		it('re-reads when an unpublish lands between the read and the write', async () => {
			const { service, agent, row, agentRepository } = setup({
				versionId: 'v',
				activeVersionId: 'version-1',
			});
			agentRepository.findIntegrationState.mockImplementationOnce(async () => {
				const snapshot = { ...row, integrations: [...(row.integrations ?? [])] };
				row.activeVersionId = null;
				return snapshot;
			});

			const result = await service.applyIntegrationDelta(
				agent,
				{ add: { type: 'slack', credentialId: 'slack-1' } },
				byUser,
			);

			expect(agentRepository.updateIntegrations).toHaveBeenCalledTimes(2);
			// Reported unpublished, so the caller releases the runtime instead of
			// leaving an unpublished agent receiving events.
			expect(result.published).toBe(false);
			expect(result.agent.activeVersionId).toBeNull();
			expect(row.integrations).toEqual([{ type: 'slack', credentialId: 'slack-1' }]);
		});

		it('gives up rather than write blindly when the row keeps changing', async () => {
			const { service, agent, agentRepository, eventService, telemetry } = setup();
			agentRepository.updateIntegrations.mockResolvedValue(false);

			await expect(
				service.applyIntegrationDelta(
					agent,
					{ add: { type: 'slack', credentialId: 'slack-1' } },
					byUser,
				),
			).rejects.toThrow(OperationalError);

			expect(agentRepository.updateIntegrations).toHaveBeenCalledTimes(3);
			expect(eventService.emit).not.toHaveBeenCalled();
			expect(telemetry.track).not.toHaveBeenCalled();
		});

		it('fails when the agent was deleted underneath the mutation', async () => {
			const { service, agent, agentRepository } = setup();
			agentRepository.findIntegrationState.mockResolvedValue(null);

			await expect(
				service.applyIntegrationDelta(
					agent,
					{ add: { type: 'slack', credentialId: 'slack-1' } },
					byUser,
				),
			).rejects.toThrow(UserError);
			expect(agentRepository.updateIntegrations).not.toHaveBeenCalled();
		});
	});

	describe('setup completion', () => {
		it('evaluates the gate against the pending state and reports only after the write lands', async () => {
			const { service, agent, agentRepository, credentialsService, setupCompletionService } =
				setup();
			const emitSetupCompleted = vi.fn(async () => {});
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([]);
			setupCompletionService.recordIfSetupComplete.mockImplementation(
				async (candidate, candidateProjectId, credentialProvider, actingUser) => {
					expect(candidate.integrations).toEqual([{ type: 'slack', credentialId: 'slack-1' }]);
					expect(candidateProjectId).toBe(projectId);
					expect(actingUser).toBe(user);
					expect(agentRepository.updateIntegrations).not.toHaveBeenCalled();
					await credentialProvider.list();
					return emitSetupCompleted;
				},
			);

			await service.applyIntegrationDelta(
				agent,
				{ add: { type: 'slack', credentialId: 'slack-1' } },
				byUser,
			);

			expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).toHaveBeenCalledWith(user, {
				projectId,
			});
			expect(emitSetupCompleted).toHaveBeenCalledOnce();
			expect(agentRepository.updateIntegrations.mock.invocationCallOrder[0]).toBeLessThan(
				emitSetupCompleted.mock.invocationCallOrder[0],
			);
		});

		it('never reports a completion for a write that failed', async () => {
			const { service, agent, agentRepository, setupCompletionService } = setup();
			const emitSetupCompleted = vi.fn(async () => {});
			setupCompletionService.recordIfSetupComplete.mockResolvedValue(emitSetupCompleted);
			agentRepository.updateIntegrations.mockRejectedValue(new Error('write failed'));

			await expect(
				service.applyIntegrationDelta(
					agent,
					{ add: { type: 'slack', credentialId: 'slack-1' } },
					byUser,
				),
			).rejects.toThrow('write failed');

			expect(emitSetupCompleted).not.toHaveBeenCalled();
		});
	});

	describe('modification telemetry', () => {
		it('reports the first channel on a blank agent as a creation', async () => {
			const { service, agent, telemetry } = setup({ schema: blankConfig });

			await service.applyIntegrationDelta(
				agent,
				{ add: { type: 'slack', credentialId: 'slack-1' } },
				byUser,
			);

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.USER_CREATED_AGENT,
				expect.objectContaining({
					agent_id: agentId,
					project_id: projectId,
					user_id: user.id,
					changed_parts: ['triggers'],
					trigger_count: 1,
					event_version: '2',
				}),
			);
			expect(telemetry.track).not.toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT,
				expect.anything(),
			);
		});

		it('reports a channel change on a configured agent as a modification', async () => {
			const { service, agent, telemetry } = setup({
				integrations: [{ type: 'linear', credentialId: 'linear-1' }],
			});

			await service.applyIntegrationDelta(
				agent,
				{ add: { type: 'slack', credentialId: 'slack-1' } },
				byUser,
			);

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT,
				expect.objectContaining({
					agent_id: agentId,
					changed_parts: ['triggers'],
					trigger_count: 2,
					event_version: '1',
				}),
			);
			expect(telemetry.track).not.toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.USER_CREATED_AGENT,
				expect.anything(),
			);
		});

		it('diffs against the persisted row so a concurrent addition is not counted as ours', async () => {
			const { service, agent, telemetry } = setup({
				integrations: [{ type: 'linear', credentialId: 'linear-1' }],
				stale: [],
			});

			await service.applyIntegrationDelta(
				agent,
				{ add: { type: 'slack', credentialId: 'slack-1' } },
				byUser,
			);

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT,
				expect.objectContaining({ changed_parts: ['triggers'], trigger_count: 2 }),
			);
		});
	});
});

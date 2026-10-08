import type { BuiltTool, CredentialProvider } from '@n8n/agents';
import type { AgentJsonConfig, AgentSkill } from '@n8n/api-types';
import type { Settings, SettingsRepository, User } from '@n8n/db';
import type { InstanceAiCredentialService } from '@n8n/instance-ai';
import { Like } from '@n8n/typeorm';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError, NotFoundError } from '@n8n/errors';
import * as checkAccess from '@/permissions.ee/check-access';

import type { AgentsService } from '../agents.service';
import { AgentsSettingsService } from '../agents-settings.service';
import type { AgentsBuilderToolsService } from '../builder/agents-builder-tools.service';
import type { AgentThreadEntity } from '../entities/agent-thread.entity';
import type { Agent } from '../entities/agent.entity';
import { InstanceAiBuilderDelegateAdapterService } from '../instance-ai-builder-delegate.adapter';
import type { AgentConfigService } from '../agent-config.service';
import { getAgentConfigHash } from '../utils/agent-config-hash';
import type { AgentSkillsService } from '../agent-skills.service';
import type { N8nMemory, N8nMemoryImpl } from '../integrations/n8n-memory';
import type { AgentThreadRepository } from '../repositories/agent-thread.repository';

vi.mock('../builder/agent-builder-session-context', () => ({
	buildBuilderSessionContext: vi.fn(
		async (projectId: string, agentId: string) =>
			await Promise.resolve(`## Session context ${projectId}/${agentId}`),
	),
}));

function setup(options: { useEvalModelCatalog?: boolean; resumeAgentBuild?: boolean } = {}) {
	const agentsService = mock<AgentsService>();
	const agentsBuilderToolsService = mock<AgentsBuilderToolsService>();
	const n8nMemory = mock<N8nMemory>();
	const agentThreadRepository = mock<AgentThreadRepository>();
	const agentConfig = mock<AgentConfigService>();
	const agentSkills = mock<AgentSkillsService>();
	const credentialService = mock<InstanceAiCredentialService>();
	const settingsRepository = mock<SettingsRepository>();
	const agentsSettingsService = new AgentsSettingsService(
		settingsRepository,
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
	);

	const service = new InstanceAiBuilderDelegateAdapterService(
		agentsService,
		agentsBuilderToolsService,
		n8nMemory,
		agentThreadRepository,
		agentConfig,
		agentSkills,
		agentsSettingsService,
	);

	const user = mock<User>({ id: 'user-1' });
	const credentialProvider = mock<CredentialProvider>();
	const credentialProviderFor = vi.fn().mockReturnValue(credentialProvider);
	const delegate = service.createDelegate(
		user,
		'project-1',
		credentialProviderFor,
		credentialService,
		options,
	);

	return {
		service,
		delegate,
		user,
		agentsService,
		agentsBuilderToolsService,
		n8nMemory,
		agentThreadRepository,
		agentConfig,
		agentSkills,
		credentialProviderFor,
		credentialService,
		settingsRepository,
	};
}

const session = { threadId: 'thread-1', runId: 'run-1' };

/** Call `getBuilderTools` and return the target resolver it hands the tools service. */
function captureTargetResolver(
	ctx: ReturnType<typeof setup>,
	resolveTargetAgentId: () => Promise<string | undefined>,
): () => Promise<string> {
	ctx.delegate.getBuilderTools(resolveTargetAgentId, session);
	const [resolver] = ctx.agentsBuilderToolsService.getToolsForResolvedTarget.mock.calls[0];
	return resolver;
}

describe('InstanceAiBuilderDelegateAdapterService', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('getBuilderTools', () => {
		it('returns the tools built for the resolved target, without the builder agent-context tool', () => {
			const ctx = setup();
			const tools = [mock<BuiltTool>({ name: 'agent_builder_write_config' })];
			ctx.agentsBuilderToolsService.getToolsForResolvedTarget.mockReturnValue(tools);

			expect(ctx.delegate.getBuilderTools(async () => 'agent-1', session)).toBe(tools);
			expect(ctx.agentsBuilderToolsService.getToolsForResolvedTarget).toHaveBeenCalledWith(
				expect.any(Function),
				'project-1',
				ctx.credentialProviderFor,
				ctx.credentialService,
				ctx.user,
				{ threadId: 'thread-1', runId: 'run-1', excludeToolNames: ['agent-context'] },
			);
		});

		it('enables deterministic model catalogs for eval sessions', () => {
			const ctx = setup({ useEvalModelCatalog: true });

			ctx.delegate.getBuilderTools(async () => 'agent-1', session);

			const [, , , , , options] =
				ctx.agentsBuilderToolsService.getToolsForResolvedTarget.mock.calls[0];
			expect(options).toEqual(expect.objectContaining({ useEvalModelCatalog: true }));
		});

		it('resolves the selected agent after the access checks', async () => {
			const ctx = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);

			const resolver = captureTargetResolver(ctx, async () => 'agent-1');

			await expect(resolver()).resolves.toBe('agent-1');
			expect(checkAccess.userHasScopes).toHaveBeenCalledWith(ctx.user, ['agent:update'], false, {
				projectId: 'project-1',
			});
		});

		it('fails a tool call when no agent is selected', async () => {
			const ctx = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);

			const resolver = captureTargetResolver(ctx, async () => undefined);

			await expect(resolver()).rejects.toThrow(UserError);
		});

		it.each([
			{ hasScope: false, enabled: true },
			{ hasScope: true, enabled: false },
		])(
			'rejects a tool call with scope $hasScope and Agents enabled $enabled',
			async ({ hasScope, enabled }) => {
				const ctx = setup();
				vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(hasScope);
				ctx.settingsRepository.findByKeyInContext.mockResolvedValue(
					mock<Settings>({ value: String(enabled) }),
				);
				const resolveTargetAgentId = vi.fn(async () => 'agent-1');

				const resolver = captureTargetResolver(ctx, resolveTargetAgentId);

				await expect(resolver()).rejects.toThrow(ForbiddenError);
				expect(resolveTargetAgentId).not.toHaveBeenCalled();
			},
		);

		it('lets a resumed build continue after Agents were disabled', async () => {
			const ctx = setup({ resumeAgentBuild: true });
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			ctx.settingsRepository.findByKeyInContext.mockResolvedValue(
				mock<Settings>({ value: 'false' }),
			);

			const resolver = captureTargetResolver(ctx, async () => 'agent-1');

			await expect(resolver()).resolves.toBe('agent-1');
		});
	});

	describe('getRuntimeSkills', () => {
		it('returns the builder runtime skills', () => {
			const { delegate } = setup();

			expect(delegate.getRuntimeSkills().map((skill) => skill.id)).toContain(
				'agent-builder-config',
			);
		});
	});

	describe('getBuilderSessionContext', () => {
		it('builds the session context for the agent in this project', async () => {
			const { delegate } = setup();

			await expect(delegate.getBuilderSessionContext('agent-1')).resolves.toBe(
				'## Session context project-1/agent-1',
			);
		});
	});

	describe('readAgentArtifact', () => {
		const CONFIG = { name: 'Support Triage' } as unknown as AgentJsonConfig;

		it('returns the config, the skill bodies, and the builder-s own config hash', async () => {
			const { delegate, agentConfig, agentSkills } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentConfig.getConfig.mockResolvedValue(CONFIG);
			const skills = { skill_triage_rules: mock<AgentSkill>({ name: 'Triage rules' }) };
			agentSkills.listSkills.mockResolvedValue(skills);

			const result = await delegate.readAgentArtifact!('agent-1');

			expect(agentConfig.getConfig).toHaveBeenCalledWith('agent-1', 'project-1');
			expect(agentSkills.listSkills).toHaveBeenCalledWith('agent-1', 'project-1');
			// The same value agent-context hands the model, so a consumer can dedupe on it.
			expect(result).toEqual({ config: CONFIG, skills, configHash: getAgentConfigHash(CONFIG) });
		});

		it('returns null for an agent with no config yet, rather than throwing', async () => {
			// A freshly created agent the builder has not written to: nothing to
			// snapshot, and not a failure worth surfacing on a build.
			const { delegate, agentConfig, agentSkills } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentConfig.getConfig.mockRejectedValue(new UserError('Agent has no JSON config yet.'));

			await expect(delegate.readAgentArtifact!('agent-1')).resolves.toBeNull();
			expect(agentSkills.listSkills).not.toHaveBeenCalled();
		});

		it('propagates a read failure instead of reporting it as no config', async () => {
			// A missing agent or a dead DB is not "nothing to snapshot" — the callers
			// treat a throw as no snapshot and log it, so it stays diagnosable.
			const { delegate, agentConfig } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentConfig.getConfig.mockRejectedValue(new NotFoundError('Agent not found'));

			await expect(delegate.readAgentArtifact!('agent-1')).rejects.toThrow('Agent not found');
		});

		it('rejects when the user lacks agent:read scope', async () => {
			const { delegate, agentConfig } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);

			await expect(delegate.readAgentArtifact!('agent-1')).rejects.toThrow(ForbiddenError);
			expect(agentConfig.getConfig).not.toHaveBeenCalled();
		});
	});

	describe('createAgent', () => {
		it('enforces agent:create scope and delegates to AgentsService', async () => {
			const { delegate, agentsService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsService.createOrAdopt.mockResolvedValue({
				agent: mock<Agent>({ id: 'agent-9', name: 'New agent' }),
				adopted: false,
			});

			const result = await delegate.createAgent('New agent');

			expect(agentsService.createOrAdopt).toHaveBeenCalledWith('project-1', 'New agent', {
				actor: { kind: 'user', user: expect.objectContaining({ id: 'user-1' }) },
			});
			expect(result).toEqual({
				agentId: 'agent-9',
				projectId: 'project-1',
				name: 'New agent',
				adopted: false,
			});
		});

		it('creates under the id the caller minted for its unsaved artifact', async () => {
			const { delegate, agentsService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsService.createOrAdopt.mockResolvedValue({
				agent: mock<Agent>({ id: 'aBcDeFgHiJkLmNoP', name: 'New agent' }),
				adopted: false,
			});

			await delegate.createAgent('New agent', {
				id: 'aBcDeFgHiJkLmNoP',
				adoptOnCollision: true,
			});

			expect(agentsService.createOrAdopt).toHaveBeenCalledWith('project-1', 'New agent', {
				actor: { kind: 'user', user: expect.objectContaining({ id: 'user-1' }) },
				id: 'aBcDeFgHiJkLmNoP',
				adoptOnCollision: true,
			});
		});

		it('rejects when the user lacks agent:create scope', async () => {
			const { delegate, agentsService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);

			await expect(delegate.createAgent('New agent')).rejects.toThrow(ForbiddenError);
			expect(agentsService.createOrAdopt).not.toHaveBeenCalled();
		});

		it('reports the persisted name and adoption when the id collided', async () => {
			const { delegate, agentsService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsService.createOrAdopt.mockResolvedValue({
				agent: mock<Agent>({ id: 'aBcDeFgHiJkLmNoP', name: 'Support Triage' }),
				adopted: true,
			});

			await expect(
				delegate.createAgent('New agent', { id: 'aBcDeFgHiJkLmNoP', adoptOnCollision: true }),
			).resolves.toEqual({
				agentId: 'aBcDeFgHiJkLmNoP',
				projectId: 'project-1',
				name: 'Support Triage',
				adopted: true,
			});
		});

		it('additionally requires agent:update to adopt on a collision', async () => {
			const { delegate, agentsService } = setup();
			const userHasScopes = vi
				.spyOn(checkAccess, 'userHasScopes')
				.mockImplementation(async (_user, scopes) => !scopes.includes('agent:update'));

			await expect(
				delegate.createAgent('New agent', { id: 'aBcDeFgHiJkLmNoP', adoptOnCollision: true }),
			).rejects.toThrow(ForbiddenError);
			expect(agentsService.createOrAdopt).not.toHaveBeenCalled();
			expect(userHasScopes).toHaveBeenCalledWith(
				expect.anything(),
				['agent:create', 'agent:update'],
				false,
				expect.objectContaining({ projectId: 'project-1' }),
			);
		});
	});

	describe('resolveAgentName', () => {
		it('returns the agent display name', async () => {
			const { delegate, agentsService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsService.findById.mockResolvedValue(mock<Agent>({ id: 'agent-1', name: 'Support Bot' }));

			await expect(delegate.resolveAgentName('agent-1')).resolves.toBe('Support Bot');
			expect(agentsService.findById).toHaveBeenCalledWith('agent-1', 'project-1');
		});

		it('returns undefined when the agent does not exist', async () => {
			const { delegate, agentsService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsService.findById.mockResolvedValue(null);

			await expect(delegate.resolveAgentName('agent-missing')).resolves.toBeUndefined();
		});

		it('rejects when the user lacks agent:read scope', async () => {
			const { delegate, agentsService, user } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);

			await expect(delegate.resolveAgentName('agent-1')).rejects.toThrow(ForbiddenError);
			expect(agentsService.findById).not.toHaveBeenCalled();
			expect(checkAccess.userHasScopes).toHaveBeenCalledWith(user, ['agent:read'], false, {
				projectId: 'project-1',
			});
		});
	});

	describe('deleteBuilderSessions', () => {
		it('deletes messages and thread state for every builder session of the instance thread, scoped per target agent', async () => {
			const { service, n8nMemory, agentThreadRepository } = setup();
			agentThreadRepository.find.mockResolvedValue([
				{ id: 'ia-builder:t1:agent-1' },
				{ id: 'ia-builder:t1:agent-2' },
			] as AgentThreadEntity[]);
			const impls = [mock<N8nMemoryImpl>(), mock<N8nMemoryImpl>()];
			n8nMemory.getImplementation.mockReturnValueOnce(impls[0]).mockReturnValueOnce(impls[1]);

			await service.deleteBuilderSessions('t1');

			expect(agentThreadRepository.find).toHaveBeenCalledWith({
				select: { id: true },
				where: { id: Like('ia-builder:t1:%') },
			});
			expect(n8nMemory.getImplementation).toHaveBeenCalledWith('agent-1');
			expect(n8nMemory.getImplementation).toHaveBeenCalledWith('agent-2');
			expect(impls[0].deleteThread).toHaveBeenCalledWith('ia-builder:t1:agent-1');
			expect(impls[1].deleteThread).toHaveBeenCalledWith('ia-builder:t1:agent-2');
		});

		it('is a no-op when the instance thread has no builder sessions', async () => {
			const { service, n8nMemory, agentThreadRepository } = setup();
			agentThreadRepository.find.mockResolvedValue([]);

			await service.deleteBuilderSessions('t1');

			expect(n8nMemory.getImplementation).not.toHaveBeenCalled();
		});
	});
});

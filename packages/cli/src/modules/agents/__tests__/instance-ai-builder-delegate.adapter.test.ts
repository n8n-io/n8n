import type { BuiltTool, CredentialProvider, ToolContext } from '@n8n/agents';
import type { AgentJsonConfig, AgentSkill } from '@n8n/api-types';
import type { User } from '@n8n/db';
import type { InstanceAiCredentialService } from '@n8n/instance-ai';
import { Like } from '@n8n/typeorm';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import * as checkAccess from '@/permissions.ee/check-access';

import type { AgentsService } from '../agents.service';
import type {
	AgentsBuilderToolsService,
	BuilderTools,
} from '../builder/agents-builder-tools.service';
import type { AgentThreadEntity } from '../entities/agent-thread.entity';
import type { Agent } from '../entities/agent.entity';
import { InstanceAiBuilderDelegateAdapterService } from '../instance-ai-builder-delegate.adapter';
import type { AgentConfigService } from '../agent-config.service';
import { AGENT_CAPABILITIES, AGENT_LIMITATIONS } from '../agent-capabilities';
import type { AgentIntegrationPersistenceService } from '../agent-integration-persistence.service';
import { getAgentConfigHash } from '../utils/agent-config-hash';
import type { AgentSkillsService } from '../agent-skills.service';
import type { N8nMemory, N8nMemoryImpl } from '../integrations/n8n-memory';
import type { AgentThreadRepository } from '../repositories/agent-thread.repository';

function setup(options: { useEvalModelCatalog?: boolean } = {}) {
	const agentsService = mock<AgentsService>();
	const agentsBuilderToolsService = mock<AgentsBuilderToolsService>();
	const n8nMemory = mock<N8nMemory>();
	const agentThreadRepository = mock<AgentThreadRepository>();
	const agentConfig = mock<AgentConfigService>();
	const agentSkills = mock<AgentSkillsService>();
	const credentialService = mock<InstanceAiCredentialService>();
	const agentIntegrationPersistenceService = mock<AgentIntegrationPersistenceService>();

	const service = new InstanceAiBuilderDelegateAdapterService(
		agentsService,
		agentsBuilderToolsService,
		n8nMemory,
		agentThreadRepository,
		agentConfig,
		agentSkills,
		agentIntegrationPersistenceService,
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
		agentIntegrationPersistenceService,
		credentialProvider,
		credentialProviderFor,
		credentialService,
	};
}

/** Builder tools whose `read_config` handler reports the agent id it was built for. */
function fakeBuilderTools(agentId: string): BuilderTools {
	const readConfig: BuiltTool = {
		name: 'read_config',
		description: 'Read the agent config',
		handler: async () => await Promise.resolve({ ok: true, builtFor: agentId }),
	};
	return { json: [readConfig], shared: [] };
}

function findTool(tools: BuiltTool[], name: string): BuiltTool {
	const tool = tools.find((candidate) => candidate.name === name);
	if (!tool?.handler) throw new Error(`Missing tool ${name}`);
	return tool;
}

const toolContext = mock<ToolContext>();

describe('InstanceAiBuilderDelegateAdapterService', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('createBuilderTools', () => {
		function setupTools(options: { useEvalModelCatalog?: boolean } = {}) {
			const context = setup(options);
			context.agentsBuilderToolsService.getTools.mockImplementation((agentId) =>
				fakeBuilderTools(agentId),
			);
			const resolveTargetAgentId = vi.fn().mockResolvedValue('agent-1');
			const tools = context.delegate.createBuilderTools({
				resolveTargetAgentId,
				threadId: 'thread-1',
				runId: 'run-1',
			});
			return { ...context, tools, resolveTargetAgentId };
		}

		it('routes each call to the tools built for the current target agent', async () => {
			const { tools, resolveTargetAgentId } = setupTools();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			const readConfig = findTool(tools, 'read_config');

			await expect(readConfig.handler!({}, toolContext)).resolves.toEqual({
				ok: true,
				builtFor: 'agent-1',
			});

			resolveTargetAgentId.mockResolvedValue('agent-2');
			await expect(readConfig.handler!({}, toolContext)).resolves.toEqual({
				ok: true,
				builtFor: 'agent-2',
			});
		});

		it('adds the planner todos tool', () => {
			const { tools } = setupTools();

			expect(tools.map((tool) => tool.name)).toEqual(['read_config', 'write_todos']);
		});

		it('passes the run identity and deterministic model catalogs to the builder tools', async () => {
			const { tools, agentsBuilderToolsService } = setupTools({ useEvalModelCatalog: true });
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);

			await findTool(tools, 'read_config').handler!({}, toolContext);

			expect(agentsBuilderToolsService.getTools).toHaveBeenLastCalledWith(
				'agent-1',
				'project-1',
				expect.anything(),
				expect.anything(),
				expect.anything(),
				{ threadId: 'thread-1', runId: 'run-1', useEvalModelCatalog: true },
			);
		});

		it('rejects when the user lacks agent:update scope', async () => {
			const { tools, resolveTargetAgentId } = setupTools();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);

			await expect(findTool(tools, 'read_config').handler!({}, toolContext)).rejects.toThrow(
				ForbiddenError,
			);
			expect(resolveTargetAgentId).not.toHaveBeenCalled();
		});

		it('builds the credential provider from the concrete target agent id', async () => {
			const { tools, credentialProviderFor } = setupTools();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);

			await findTool(tools, 'read_config').handler!({}, toolContext);

			expect(credentialProviderFor).toHaveBeenCalledWith('agent-1');
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
			// The same value read_config hands the model, so a consumer can dedupe on it.
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

			expect(agentsService.createOrAdopt).toHaveBeenCalledWith('project-1', 'New agent', {});
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

	describe('listAgents', () => {
		it('maps agent entities to listing rows, most recently updated first', async () => {
			const { delegate, agentsService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsService.findByProjectId.mockResolvedValue([
				mock<Agent>({
					id: 'agent-1',
					name: 'Published Agent',
					activeVersionId: 'v1',
					updatedAt: new Date('2026-07-14T00:00:00.000Z'),
				}),
				mock<Agent>({
					id: 'agent-2',
					name: 'Draft Agent',
					activeVersionId: null,
					updatedAt: new Date('2026-07-10T00:00:00.000Z'),
				}),
			]);

			const result = await delegate.listAgents();

			expect(agentsService.findByProjectId).toHaveBeenCalledWith('project-1');
			expect(result).toEqual([
				{
					agentId: 'agent-1',
					name: 'Published Agent',
					published: true,
					updatedAt: '2026-07-14T00:00:00.000Z',
				},
				{
					agentId: 'agent-2',
					name: 'Draft Agent',
					published: false,
					updatedAt: '2026-07-10T00:00:00.000Z',
				},
			]);
		});

		it('rejects when the user lacks agent:read scope', async () => {
			const { delegate, agentsService, user } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);

			await expect(delegate.listAgents()).rejects.toThrow(ForbiddenError);
			expect(agentsService.findByProjectId).not.toHaveBeenCalled();
			expect(checkAccess.userHasScopes).toHaveBeenCalledWith(user, ['agent:read'], false, {
				projectId: 'project-1',
			});
		});
	});

	describe('listAgentCapabilities', () => {
		it('returns channels from the registry plus the module agent capabilities and limitations', async () => {
			const { delegate, agentIntegrationPersistenceService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			const channels = [
				{
					type: 'slack',
					label: 'Slack',
					icon: 'slack',
					credentialTypes: ['slackApi'],
					capabilities: ['send messages'],
					useIntegrationWhen: ['the agent should reply in Slack'],
					useNodeToolWhen: ['only operating on Slack data'],
				},
			];
			agentIntegrationPersistenceService.listChatIntegrations.mockReturnValue(channels);

			await expect(delegate.listAgentCapabilities()).resolves.toEqual({
				channels,
				agentCapabilities: [...AGENT_CAPABILITIES],
				limitations: [...AGENT_LIMITATIONS],
			});
			expect(agentIntegrationPersistenceService.listChatIntegrations).toHaveBeenCalledWith();
		});

		it('rejects when the user lacks agent:read scope', async () => {
			const { delegate, agentIntegrationPersistenceService, user } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);

			await expect(delegate.listAgentCapabilities()).rejects.toThrow(ForbiddenError);
			expect(agentIntegrationPersistenceService.listChatIntegrations).not.toHaveBeenCalled();
			expect(checkAccess.userHasScopes).toHaveBeenCalledWith(user, ['agent:read'], false, {
				projectId: 'project-1',
			});
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
			expect(impls[0].deleteMessagesByThread).toHaveBeenCalledWith('ia-builder:t1:agent-1');
			expect(impls[0].deleteThread).toHaveBeenCalledWith('ia-builder:t1:agent-1');
			expect(impls[1].deleteMessagesByThread).toHaveBeenCalledWith('ia-builder:t1:agent-2');
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

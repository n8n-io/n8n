import type { Mocked } from 'vitest';
import type { AgentJsonConfig } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';

import { AgentConfigService } from '../agent-config.service';
import type { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import type { AgentSkillsService } from '../agent-skills.service';
import type { Agent } from '../entities/agent.entity';
import type { AgentTaskRepository } from '../repositories/agent-task.repository';
import type { AgentRepository } from '../repositories/agent.repository';

const agentId = 'agent-1';
const projectId = 'project-1';

const baseConfig: AgentJsonConfig = {
	name: 'Support Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Help users',
};

function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		id: agentId,
		name: 'Support Agent',
		projectId,
		versionId: 'draft-version',
		activeVersionId: null,
		schema: baseConfig,
		tools: {},
		skills: {},
		integrations: [],
		updatedAt: new Date('2025-01-01T00:00:00Z'),
		...overrides,
	} as unknown as Agent;
}

function makeService() {
	const agentRepository = mock<AgentRepository>();
	const agentTaskRepository = mock<AgentTaskRepository>();
	const agentSkillsService = mock<AgentSkillsService>();
	const runtimeCacheService = mock<AgentRuntimeCacheService>();
	const credentialsService = mock<CredentialsService>();

	agentRepository.save.mockImplementation(async (agent) => agent as Agent);
	credentialsService.findAllCredentialIdsForProject.mockResolvedValue([]);
	credentialsService.findAllGlobalCredentialIds.mockResolvedValue([]);
	agentTaskRepository.findByAgentId.mockResolvedValue([]);
	agentSkillsService.removeUnreferencedSkills.mockImplementation((agent, config) => {
		const ids = new Set((config.skills ?? []).map((skill) => skill.id));
		agent.skills = Object.fromEntries(
			Object.entries(agent.skills ?? {}).filter(([id]) => ids.has(id)),
		);
	});

	const service = new AgentConfigService(
		mockLogger(),
		agentRepository,
		agentTaskRepository,
		agentSkillsService,
		runtimeCacheService,
		credentialsService,
	);

	return {
		service,
		agentRepository,
		agentTaskRepository,
		agentSkillsService,
		runtimeCacheService,
		credentialsService,
	};
}

function mockAccessibleCredentials(
	credentialsService: Mocked<CredentialsService>,
	credentialIds: string[],
) {
	credentialsService.findAllCredentialIdsForProject.mockResolvedValue(
		credentialIds.map((id) => ({ id, type: 'openAiApi', name: id }) as never),
	);
}

describe('AgentConfigService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('validateConfig', () => {
		it('rejects unsafe node tool schemas before deeper validation', async () => {
			const { service } = makeService();

			const result = await service.validateConfig({
				...baseConfig,
				tools: [
					{
						type: 'node',
						name: 'HTTP Request',
						inputSchema: { type: 'object' },
						node: { nodeType: 'n8n-nodes-base.httpRequestTool', nodeTypeVersion: 4 },
					},
				],
			});

			expect(result).toEqual({
				valid: false,
				error: 'Node tool configs must not include inputSchema.',
			});
		});

		it('accepts draft credentials that are not checked until update sanitization', async () => {
			const { service } = makeService();

			await expect(
				service.validateConfig({
					...baseConfig,
					credential: 'unknown-top-level',
					mcpServers: [
						{
							name: 'github',
							url: 'https://example.com/mcp',
							transport: 'streamableHttp',
							authentication: 'bearerAuth',
							credential: '',
						},
					],
				}),
			).resolves.toMatchObject({ valid: true });
		});
	});

	describe('updateConfig', () => {
		it('preserves omitted stored fields but clears explicitly empty integrations', async () => {
			const { service, agentRepository, credentialsService, runtimeCacheService } = makeService();
			const agent = makeAgent({
				schema: {
					...baseConfig,
					description: 'Legacy description',
					credential: 'stored-cred',
					memory: { enabled: true, storage: 'n8n' },
					tools: [{ type: 'custom', id: 'tool-1' }],
				} as unknown as AgentJsonConfig,
				integrations: [{ type: 'slack', credentialId: 'slack-cred' }],
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			mockAccessibleCredentials(credentialsService, ['stored-cred']);

			await service.updateConfig(agentId, projectId, {
				...baseConfig,
				instructions: 'Updated instructions',
			});
			let saved = agentRepository.save.mock.calls.at(-1)?.[0] as Agent;
			expect(saved.schema).toEqual(
				expect.objectContaining({
					instructions: 'Updated instructions',
					credential: 'stored-cred',
					memory: { enabled: true, storage: 'n8n' },
					tools: [{ type: 'custom', id: 'tool-1' }],
				}),
			);
			expect(saved.schema).not.toHaveProperty('description');
			expect(saved.integrations).toEqual([{ type: 'slack', credentialId: 'slack-cred' }]);

			await service.updateConfig(agentId, projectId, { ...baseConfig, integrations: [] });
			saved = agentRepository.save.mock.calls.at(-1)?.[0] as Agent;
			expect(saved.integrations).toEqual([]);
			expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
		});

		it('removes config refs and stored bodies that no longer have matching definitions', async () => {
			const {
				service,
				agentRepository,
				agentTaskRepository,
				agentSkillsService,
				runtimeCacheService,
			} = makeService();
			const agent = makeAgent({
				tools: {
					tool_1: {
						code: 'a',
						descriptor: { name: 'tool_1', description: 'a', inputSchema: {} },
					},
					tool_2: {
						code: 'b',
						descriptor: { name: 'tool_2', description: 'b', inputSchema: {} },
					},
				} as unknown as Agent['tools'],
				skills: {
					'skill-1': { name: 'Skill', description: 'desc', instructions: 'Use it' },
				},
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentTaskRepository.findByAgentId.mockResolvedValue([
				{ id: 'task-1' },
				{ id: 'task-2' },
			] as never);

			await service.updateConfig(agentId, projectId, {
				...baseConfig,
				tools: [
					{ type: 'custom', id: 'tool_1' },
					{ type: 'custom', id: 'missing_tool' },
				],
				skills: [
					{ type: 'skill', id: 'skill-1' },
					{ type: 'skill', id: 'missing-skill' },
				],
				tasks: [
					{ type: 'task', id: 'task-1', enabled: true },
					{ type: 'task', id: 'missing-task', enabled: true },
				],
			});

			const saved = agentRepository.save.mock.calls[0][0] as Agent;
			expect(saved.schema?.tools).toEqual([{ type: 'custom', id: 'tool_1' }]);
			expect(saved.schema?.skills).toEqual([{ type: 'skill', id: 'skill-1' }]);
			expect(saved.schema?.tasks).toEqual([{ type: 'task', id: 'task-1', enabled: true }]);
			expect(Object.keys(saved.tools)).toEqual(['tool_1']);
			expect(agentTaskRepository.delete).toHaveBeenCalledWith(['task-2']);
			expect(agentSkillsService.removeUnreferencedSkills).toHaveBeenCalled();
			expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
		});

		it('sanitizes inaccessible credentials before saving nested config', async () => {
			const { service, agentRepository, credentialsService } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
			mockAccessibleCredentials(credentialsService, ['known-cred']);

			await service.updateConfig(agentId, projectId, {
				...baseConfig,
				credential: 'unknown-top-level',
				memory: {
					enabled: true,
					storage: 'n8n',
					observationalMemory: {
						observerModel: { model: 'openai/gpt-4o', credential: 'unknown-nested' },
						reflectorModel: { model: 'openai/gpt-4o', credential: 'known-cred' },
					},
				},
				integrations: [{ type: 'slack', credentialId: 'unknown-integration' }],
				mcpServers: [
					{
						name: 'github',
						url: 'https://example.com/mcp',
						transport: 'streamableHttp',
						authentication: 'bearerAuth',
						credential: 'unknown-mcp',
					},
				],
			});

			const saved = agentRepository.save.mock.calls[0][0] as Agent;
			const savedConfig = saved.schema as AgentJsonConfig;
			expect(savedConfig.credential).toBe('');
			expect(savedConfig.memory?.observationalMemory?.observerModel?.credential).toBe('');
			expect(savedConfig.memory?.observationalMemory?.reflectorModel?.credential).toBe(
				'known-cred',
			);
			expect(saved.integrations).toEqual([{ type: 'slack', credentialId: '' }]);
			expect(savedConfig.mcpServers?.[0].credential).toBe('');
		});

		it('stores only existing published subagents and rejects invalid subagent refs', async () => {
			const { service, agentRepository } = makeService();
			const agent = makeAgent();
			const publishedSubAgent = makeAgent({ id: 'agent-2', activeVersionId: 'published-v2' });
			const unpublishedSubAgent = makeAgent({ id: 'agent-3', activeVersionId: null });
			agentRepository.findByIdAndProjectId.mockImplementation(async (id) => {
				if (id === agentId) return agent;
				if (id === 'agent-2') return publishedSubAgent;
				if (id === 'agent-3') return unpublishedSubAgent;
				return null;
			});

			await service.updateConfig(agentId, projectId, {
				...baseConfig,
				subAgents: {
					maxChildren: 3,
					agents: [
						{ agentId: 'missing-agent', useWhen: 'Use for missing work.' },
						{ agentId: 'agent-2', useWhen: 'Use for billing escalations.' },
						{ agentId: 'agent-2', useWhen: 'Use for duplicate work.' },
					],
				},
			});

			expect((agentRepository.save.mock.calls[0][0] as Agent).schema?.subAgents).toEqual({
				maxChildren: 3,
				agents: [{ agentId: 'agent-2', useWhen: 'Use for billing escalations.' }],
			});
			expect(
				agentRepository.findByIdAndProjectId.mock.calls.filter(([id]) => id === 'agent-2'),
			).toHaveLength(1);

			await expect(
				service.updateConfig(agentId, projectId, {
					...baseConfig,
					subAgents: {
						agents: [{ agentId: 'agent-3', useWhen: 'Use for unpublished work.' }],
					},
				}),
			).rejects.toThrow('must be published');

			await expect(
				service.updateConfig(agentId, projectId, {
					...baseConfig,
					subAgents: { agents: [{ agentId, useWhen: 'Use for self-delegation.' }] },
				}),
			).rejects.toThrow('cannot use itself');
		});
	});
});

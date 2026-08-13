import type { Mocked } from 'vitest';
import { DEFAULT_AGENT_PERSONALISATION, type AgentJsonConfig } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { User, WorkflowRepository } from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { EventService } from '@/events/event.service';

import type { Telemetry } from '@/telemetry';

import { AgentConfigService } from '../agent-config.service';
import { AgentModificationTelemetryService } from '../agent-modification-telemetry.service';
import type { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import { AgentSetupCompletionService } from '../agent-setup-completion.service';
import type { AgentSkillsService } from '../agent-skills.service';
import type { AgentValidationService } from '../agent-validation.service';
import type { Agent } from '../entities/agent.entity';
import type { NodeToolAiGatewayService } from '../json-config/node-tool-ai-gateway.service';
import type { AgentTaskRepository } from '../repositories/agent-task.repository';
import type { AgentRepository } from '../repositories/agent.repository';
import type { AgentSecureRuntime } from '../runtime/agent-secure-runtime';

const agentId = 'agent-1';
const projectId = 'project-1';
const user = { id: 'user-1' } as User;
const byUser = { modifiedBy: 'user' } as const;

const baseConfig: AgentJsonConfig = {
	name: 'Support Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Help users',
};

const storedCustomTool = {
	tool_1: { code: 'a', descriptor: { name: 'tool_1', description: 'a', inputSchema: {} } },
} as unknown as Agent['tools'];

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
		setupCompletedAt: null,
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
	const workflowRepository = mock<WorkflowRepository>();
	const nodeToolAiGatewayService = mock<NodeToolAiGatewayService>();
	const eventService = mock<EventService>();
	const agentValidationService = mock<AgentValidationService>();
	const telemetry = mock<Telemetry>();
	const secureRuntime = mock<AgentSecureRuntime>();

	agentValidationService.validateLoadedAgentConfiguration.mockResolvedValue({
		status: 'valid',
		issues: [],
	});
	agentRepository.save.mockImplementation(async (agent) => agent as Agent);
	agentRepository.claimSetupCompleted.mockResolvedValue(true);
	// `manager` is a TypeORM getter, not auto-mocked; run transaction callbacks
	// against a manager that records saves (imported task rows + agent).
	const txManager = { save: vi.fn(async (entity: unknown) => entity) };
	Object.defineProperty(agentRepository, 'manager', {
		value: {
			transaction: vi.fn(
				async (cb: (manager: typeof txManager) => Promise<unknown>) => await cb(txManager),
			),
		},
	});
	credentialsService.findAllCredentialIdsForProject.mockResolvedValue([]);
	credentialsService.findAllGlobalCredentialIds.mockResolvedValue([]);
	credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([]);
	agentTaskRepository.findByAgentId.mockResolvedValue([]);
	agentTaskRepository.findOwningAgentIds.mockResolvedValue(new Map());
	agentTaskRepository.create.mockImplementation((data) => data as never);
	workflowRepository.findManyByAgentToolReferences.mockResolvedValue([]);
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
		workflowRepository,
		nodeToolAiGatewayService,
		eventService,
		new AgentSetupCompletionService(agentValidationService, telemetry, agentRepository),
		new AgentModificationTelemetryService(telemetry),
		secureRuntime,
	);

	return {
		service,
		secureRuntime,
		txManager,
		agentRepository,
		agentTaskRepository,
		agentSkillsService,
		runtimeCacheService,
		credentialsService,
		workflowRepository,
		nodeToolAiGatewayService,
		eventService,
		agentValidationService,
		telemetry,
	};
}

function mockAccessibleCredentials(
	credentialsService: Mocked<CredentialsService>,
	credentialIds: string[],
) {
	const credentials = credentialIds.map((id) => ({ id, type: 'openAiApi', name: id }) as never);
	credentialsService.findAllCredentialIdsForProject.mockResolvedValue(credentials);
	credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(credentials);
}

describe('AgentConfigService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
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

		it('rejects a vector store whose derived tool name collides with a configured tool', async () => {
			const { service } = makeService();

			const result = await service.validateConfig({
				...baseConfig,
				tools: [{ type: 'custom', id: 'search_product_docs' }],
				vectorStores: [
					{
						provider: 'qdrant',
						name: 'product_docs',
						credential: 'qdrant-cred',
						useWhen: 'Search product docs',
						embedding: { model: 'openai/text-embedding-3-small', credential: 'embed-cred' },
						collectionName: 'product-docs',
					},
				],
			});

			expect(result).toEqual({
				valid: false,
				error: 'Vector store tool name collides with an existing tool: search_product_docs',
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

		it('returns a human-readable Zod error for an invalid MCP server name', async () => {
			const { service } = makeService();

			const result = await service.validateConfig({
				...baseConfig,
				mcpServers: [
					{
						name: '   ',
						url: 'https://example.com/mcp',
						transport: 'streamableHttp',
						authentication: 'none',
					},
				],
			});

			expect(result.valid).toBe(false);
			if (result.valid) return;
			expect(result.error).toContain('mcpServers.0.name');
			expect(result.error).toContain('MCP server name cannot be blank');
			expect(result.error).not.toContain('"validation": "regex"');
		});
	});

	describe('updateConfig', () => {
		it('persists an explicit web-search disable and clears native provider tools', async () => {
			// Regression: previously the disable was stripped on write and resurrected
			// on read, so the config hash never changed and the builder looped.
			const { service, agentRepository, eventService } = makeService();
			const agent = makeAgent({
				schema: {
					...baseConfig,
					config: { webSearch: { enabled: true } },
					providerTools: { 'anthropic.web_search': { maxUses: 5 } },
				} as unknown as AgentJsonConfig,
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const result = await service.updateConfig(
				agentId,
				projectId,
				{
					...baseConfig,
					config: { webSearch: { enabled: false } },
					providerTools: { 'anthropic.web_search': { maxUses: 5 } },
				} as unknown as AgentJsonConfig,
				user,
				byUser,
			);

			const saved = agentRepository.save.mock.calls.at(-1)?.[0] as Agent;
			expect(saved.schema?.config?.webSearch).toEqual({ enabled: false });
			expect(saved.schema?.providerTools).toEqual({});
			// The returned (composed) config reflects the persisted state so the tool
			// layer's freshness hash actually changes.
			expect(result.config?.config?.webSearch).toEqual({ enabled: false });
			expect(result.config?.providerTools).toEqual({});
			expect(eventService.emit).toHaveBeenCalledWith('agent-saved', { agentId });
		});

		it('runs node-tool gateway credential assignment on every write with tools, passing the owned credential types', async () => {
			const { service, agentRepository, credentialsService, nodeToolAiGatewayService } =
				makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
				{ id: 'slack-1', type: 'slackApi', name: 'My Slack' },
			] as never);

			await service.updateConfig(
				agentId,
				projectId,
				{
					...baseConfig,
					tools: [{ type: 'custom', id: 'tool_1' }],
				} as unknown as AgentJsonConfig,
				user,
				byUser,
			);

			expect(nodeToolAiGatewayService.assignManagedCredentials).toHaveBeenCalledWith(
				[{ type: 'custom', id: 'tool_1' }],
				new Set(['slackApi']),
			);
		});

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

			await service.updateConfig(
				agentId,
				projectId,
				{ ...baseConfig, instructions: 'Updated instructions' },
				user,
				byUser,
			);
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

			await service.updateConfig(
				agentId,
				projectId,
				{ ...baseConfig, integrations: [] },
				user,
				byUser,
			);
			saved = agentRepository.save.mock.calls.at(-1)?.[0] as Agent;
			expect(saved.integrations).toEqual([]);
			expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
		});

		it('drops stored optional fields omitted from the payload when clearOmittedOptionalFields is set', async () => {
			const { service, agentRepository, credentialsService } = makeService();
			const agent = makeAgent({
				schema: {
					...baseConfig,
					credential: 'stored-cred',
					memory: { enabled: true, storage: 'n8n' },
					tools: [{ type: 'custom', id: 'tool-1' }],
				} as unknown as AgentJsonConfig,
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			mockAccessibleCredentials(credentialsService, ['stored-cred']);

			const result = await service.updateConfig(
				agentId,
				projectId,
				{ ...baseConfig, memory: { enabled: false, storage: 'n8n' } },
				user,
				{ clearOmittedOptionalFields: true, ...byUser },
			);

			const saved = agentRepository.save.mock.calls.at(-1)?.[0] as Agent;
			// Provided fields keep their submitted value; omitted ones are removed
			// instead of retaining the stored value.
			expect(saved.schema?.memory).toEqual({ enabled: false, storage: 'n8n' });
			expect(saved.schema).not.toHaveProperty('credential');
			expect(saved.schema).not.toHaveProperty('tools');
			expect(result.config).not.toHaveProperty('credential');
		});

		it('resolves accessible credentials via the user when one is provided', async () => {
			const { service, agentRepository, credentialsService } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
				{ id: 'user-cred', type: 'openAiApi', name: 'user-cred' },
			] as never);
			await service.updateConfig(
				agentId,
				projectId,
				{ ...baseConfig, credential: 'user-cred' },
				user,
				byUser,
			);

			expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).toHaveBeenCalledWith(user, {
				projectId,
			});
			expect(credentialsService.findAllCredentialIdsForProject).not.toHaveBeenCalled();
			const saved = agentRepository.save.mock.calls.at(-1)?.[0] as Agent;
			expect((saved.schema as AgentJsonConfig).credential).toBe('user-cred');
		});

		it('rewrites an id-valued legacy ref without touching stable workflow refs', async () => {
			const { service, agentRepository, workflowRepository } = makeService();
			const agent = makeAgent();
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			workflowRepository.findManyByAgentToolReferences.mockResolvedValue([
				{ id: 'wf-id-1', name: 'Dice Roller' },
				{ id: 'wf-2', name: 'Existing Name' },
			] as never);

			await service.updateConfig(
				agentId,
				projectId,
				{
					...baseConfig,
					tools: [
						{
							type: 'workflow',
							workflow: 'wf-id-1',
							name: 'dice_roller',
							description: 'Roll dice',
						},
						{ type: 'workflow', workflow: 'Existing Name' },
						{ type: 'workflow', workflow: 'ghost' },
						{
							type: 'workflow',
							workflowId: 'wf-stable',
							workflow: 'Old Stable Name',
						},
					],
				},
				user,
				byUser,
			);

			const saved = agentRepository.save.mock.calls.at(-1)?.[0] as Agent;
			expect(saved.schema?.tools).toEqual([
				{
					type: 'workflow',
					workflow: 'Dice Roller',
					name: 'dice_roller',
					description: 'Roll dice',
				},
				{ type: 'workflow', workflow: 'Existing Name' },
				{ type: 'workflow', workflow: 'ghost' },
				{
					type: 'workflow',
					workflowId: 'wf-stable',
					workflow: 'Old Stable Name',
				},
			]);
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

			await service.updateConfig(
				agentId,
				projectId,
				{
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
				},
				user,
				byUser,
			);

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

			await service.updateConfig(
				agentId,
				projectId,
				{
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
					vectorStores: [
						{
							provider: 'qdrant',
							name: 'product_docs',
							credential: 'unknown-vector-store',
							useWhen: 'Search product docs',
							embedding: {
								model: 'openai/text-embedding-3-small',
								credential: 'unknown-embedding',
							},
							collectionName: 'docs',
						},
					],
				},
				user,
				byUser,
			);

			const saved = agentRepository.save.mock.calls[0][0] as Agent;
			const savedConfig = saved.schema as AgentJsonConfig;
			expect(savedConfig.credential).toBe('');
			expect(savedConfig.memory?.observationalMemory?.observerModel?.credential).toBe('');
			expect(savedConfig.memory?.observationalMemory?.reflectorModel?.credential).toBe(
				'known-cred',
			);
			expect(saved.integrations).toEqual([{ type: 'slack', credentialId: '' }]);
			expect(savedConfig.mcpServers?.[0].credential).toBe('');
			expect(savedConfig.vectorStores?.[0].credential).toBe('');
			expect(savedConfig.vectorStores?.[0].embedding.credential).toBe('');
		});

		it('persists personalisation changes from the config payload', async () => {
			const { service, agentRepository } = makeService();
			const agent = makeAgent({
				schema: {
					...baseConfig,
					personalisation: {
						icon: 'bot',
						gradient: {
							from: '#111111',
							to: '#222222',
							angle: 135,
							fromStop: 0,
							toStop: 100,
						},
					},
				},
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.updateConfig(
				agentId,
				projectId,
				{
					...baseConfig,
					personalisation: {
						icon: 'mail',
						gradient: {
							from: '#333333',
							to: '#444444',
							angle: 42,
							fromStop: 12,
							toStop: 88,
						},
					},
				},
				user,
				byUser,
			);

			const saved = agentRepository.save.mock.calls[0][0] as Agent;
			expect(saved.schema?.personalisation).toEqual({
				icon: 'mail',
				gradient: {
					from: '#333333',
					to: '#444444',
					angle: 42,
					fromStop: 12,
					toStop: 88,
				},
			});
		});

		it('preserves an existing personalisation gradient when only the icon changes', async () => {
			const { service, agentRepository } = makeService();
			const agent = makeAgent({
				schema: {
					...baseConfig,
					personalisation: {
						icon: 'bot',
						gradient: {
							from: '#111111',
							to: '#222222',
							angle: 42,
							fromStop: 12,
							toStop: 88,
						},
					},
				},
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.updateConfig(
				agentId,
				projectId,
				{ ...baseConfig, personalisation: { icon: 'mail' } },
				user,
				byUser,
			);

			const saved = agentRepository.save.mock.calls[0][0] as Agent;
			expect(saved.schema?.personalisation).toEqual({
				icon: 'mail',
				gradient: {
					from: '#111111',
					to: '#222222',
					angle: 42,
					fromStop: 12,
					toStop: 88,
				},
			});
		});

		it('resets an omitted gradient to the schema default when clearOmittedOptionalFields is set', async () => {
			const { service, agentRepository } = makeService();
			const agent = makeAgent({
				schema: {
					...baseConfig,
					personalisation: {
						icon: 'bot',
						gradient: {
							from: '#111111',
							to: '#222222',
							angle: 42,
							fromStop: 12,
							toStop: 88,
						},
					},
				},
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.updateConfig(
				agentId,
				projectId,
				{
					...baseConfig,
					personalisation: { icon: 'mail' },
				},
				user,
				{ clearOmittedOptionalFields: true, ...byUser },
			);

			const saved = agentRepository.save.mock.calls[0][0] as Agent;
			expect(saved.schema?.personalisation).toEqual({
				icon: 'mail',
				gradient: DEFAULT_AGENT_PERSONALISATION.gradient,
			});
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

			await service.updateConfig(
				agentId,
				projectId,
				{
					...baseConfig,
					subAgents: {
						maxChildren: 3,
						agents: [
							{ agentId: 'missing-agent', useWhen: 'Use for missing work.' },
							{ agentId: 'agent-2', useWhen: 'Use for billing escalations.' },
							{ agentId: 'agent-2', useWhen: 'Use for duplicate work.' },
						],
					},
				},
				user,
				byUser,
			);

			expect((agentRepository.save.mock.calls[0][0] as Agent).schema?.subAgents).toEqual({
				maxChildren: 3,
				agents: [{ agentId: 'agent-2', useWhen: 'Use for billing escalations.' }],
			});
			expect(
				agentRepository.findByIdAndProjectId.mock.calls.filter(([id]) => id === 'agent-2'),
			).toHaveLength(1);

			await expect(
				service.updateConfig(
					agentId,
					projectId,
					{
						...baseConfig,
						subAgents: {
							agents: [{ agentId: 'agent-3', useWhen: 'Use for unpublished work.' }],
						},
					},
					user,
					byUser,
				),
			).rejects.toThrow('must be published');

			await expect(
				service.updateConfig(
					agentId,
					projectId,
					{
						...baseConfig,
						subAgents: { agents: [{ agentId, useWhen: 'Use for self-delegation.' }] },
					},
					user,
					byUser,
				),
			).rejects.toThrow('cannot use itself');
		});

		it('reports setup completion after claiming the marker', async () => {
			const { service, agentRepository, telemetry } = makeService();
			const agent = makeAgent({ tools: storedCustomTool });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.updateConfig(
				agentId,
				projectId,
				{ ...baseConfig, tools: [{ type: 'custom', id: 'tool_1' }] } as unknown as AgentJsonConfig,
				user,
				byUser,
			);

			expect(agentRepository.claimSetupCompleted).toHaveBeenCalledWith(agentId, expect.any(Date));
			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.AGENT_SETUP_COMPLETED,
				expect.objectContaining({ agent_id: agentId, tool_count: 1 }),
			);
		});

		it('does not report setup completion when the save fails', async () => {
			const { service, agentRepository, telemetry } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(
				makeAgent({ tools: storedCustomTool }),
			);
			agentRepository.save.mockRejectedValue(new Error('db down'));

			await expect(
				service.updateConfig(
					agentId,
					projectId,
					{
						...baseConfig,
						tools: [{ type: 'custom', id: 'tool_1' }],
					} as unknown as AgentJsonConfig,
					user,
					byUser,
				),
			).rejects.toThrow('db down');

			expect(agentRepository.claimSetupCompleted).not.toHaveBeenCalled();
			expect(telemetry.track).not.toHaveBeenCalled();
		});
	});

	// Reproduces AGENT-582: a scheduled task's reference lives in the agent
	// schema, but its definition (name/objective/cronExpression) lives in the
	// separate `agent_task_definition` table. Export must carry the definition,
	// and import must recreate it — otherwise the task is silently lost when an
	// agent JSON leaves one instance and is imported into another.
	describe('scheduled task export/import round-trip', () => {
		const taskReference = { type: 'task', id: 'weekly_review', enabled: true } as const;
		const taskDefinition = {
			id: 'weekly_review',
			agentId,
			name: 'Weekly review',
			objective: 'Summarise the week and post the digest to Slack',
			cronExpression: '0 9 * * 1',
		};

		it('includes the full task definition in the exported config, not just the reference', async () => {
			const { service, agentRepository, agentTaskRepository } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(
				makeAgent({ schema: { ...baseConfig, tasks: [taskReference] } as AgentJsonConfig }),
			);
			agentTaskRepository.findByAgentId.mockResolvedValue([taskDefinition] as never);

			const exported = await service.getConfig(agentId, projectId);

			// The exported JSON carries only `{ type, id, enabled }`, so the
			// objective and schedule are lost the moment the config is downloaded.
			const exportedTask = exported.tasks?.[0] as Record<string, unknown> | undefined;
			expect(exportedTask).toMatchObject({
				id: 'weekly_review',
				name: 'Weekly review',
				objective: 'Summarise the week and post the digest to Slack',
				cronExpression: '0 9 * * 1',
			});
		});

		it('preserves a task when an exported config is imported into a fresh agent', async () => {
			const { service, agentRepository, agentTaskRepository, txManager } = makeService();

			const sourceAgentId = agentId;
			const targetAgentId = 'agent-imported';
			agentRepository.findByIdAndProjectId.mockImplementation(async (id) =>
				id === sourceAgentId
					? makeAgent({ schema: { ...baseConfig, tasks: [taskReference] } as AgentJsonConfig })
					: makeAgent({ id: targetAgentId, schema: baseConfig }),
			);
			agentTaskRepository.findByAgentId.mockImplementation(async (id) =>
				id === sourceAgentId ? ([taskDefinition] as never) : [],
			);

			// Export from the source agent, then import into a fresh agent whose
			// `agent_task_definition` table is empty.
			const exported = await service.getConfig(sourceAgentId, projectId);
			await service.updateConfig(targetAgentId, projectId, exported, user, byUser);

			// The task reference must survive the import instead of being dropped
			// for lack of a matching definition, and the recreated row must be
			// written in the same transaction as the agent.
			expect(agentRepository.manager.transaction).toHaveBeenCalledTimes(1);
			expect(txManager.save).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'weekly_review', agentId: targetAgentId }),
			);
			const saved = txManager.save.mock.calls.at(-1)?.[0] as Agent;
			expect(saved.schema?.tasks).toEqual([taskReference]);
		});

		it('drops a task ref whose inline cron expression is invalid', async () => {
			const { service, agentRepository, agentTaskRepository } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent({ schema: baseConfig }));

			await service.updateConfig(
				agentId,
				projectId,
				{
					...baseConfig,
					tasks: [{ ...taskReference, ...taskDefinition, cronExpression: 'not a cron' }],
				},
				user,
				byUser,
			);

			// No row is written and the ref is dropped as an orphan.
			expect(agentTaskRepository.save).not.toHaveBeenCalled();
			expect(agentRepository.manager.transaction).not.toHaveBeenCalled();
			const saved = agentRepository.save.mock.calls.at(-1)?.[0] as Agent;
			expect(saved.schema?.tasks).toEqual([]);
		});

		it('assigns a fresh id when the imported task id is already taken by another agent', async () => {
			const { service, agentRepository, agentTaskRepository, txManager } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent({ schema: baseConfig }));
			// The task id is the table's sole primary key; reusing it would hijack
			// the other agent's row. This happens on every same-instance import,
			// since the source agent still owns the exported id.
			agentTaskRepository.findOwningAgentIds.mockResolvedValue(
				new Map([['weekly_review', 'agent-other']]),
			);

			await service.updateConfig(
				agentId,
				projectId,
				{ ...baseConfig, tasks: [{ ...taskReference, ...taskDefinition }] },
				user,
				byUser,
			);

			const savedRow = txManager.save.mock.calls
				.map(([entity]) => entity as { id?: string; name?: string; agentId?: string })
				.find((entity) => entity.name === 'Weekly review');
			expect(savedRow?.agentId).toBe(agentId);
			expect(savedRow?.id).toMatch(/^task_/);
			expect(savedRow?.id).not.toBe('weekly_review');

			const saved = txManager.save.mock.calls.at(-1)?.[0] as Agent;
			expect(saved.schema?.tasks).toEqual([{ type: 'task', id: savedRow?.id, enabled: true }]);
		});

		it('writes no task rows when the update fails after task recreation', async () => {
			const { service, agentRepository, txManager } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent({ schema: baseConfig }));
			txManager.save.mockRejectedValue(new Error('save failed'));

			await expect(
				service.updateConfig(
					agentId,
					projectId,
					{ ...baseConfig, tasks: [{ ...taskReference, ...taskDefinition }] },
					user,
					byUser,
				),
			).rejects.toThrow('save failed');

			// Task rows are only written inside the agent-save transaction, so a
			// failed update can't leave orphan definitions behind.
			expect(agentRepository.manager.transaction).toHaveBeenCalledTimes(1);
			expect(agentRepository.save).not.toHaveBeenCalled();
		});
	});

	// Same round-trip as tasks, but for skill bodies, which live in the agent's
	// `skills` column rather than a separate table.
	describe('skill export/import round-trip', () => {
		const skillReference = { type: 'skill', id: 'skill_summarize' } as const;
		const skillBody = {
			name: 'Summarize thread',
			description: 'Summarise long conversation threads',
			instructions: 'Read the thread and produce a concise summary.',
		};

		it('includes the full skill body in the exported config, not just the reference', async () => {
			const { service, agentRepository } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(
				makeAgent({
					schema: { ...baseConfig, skills: [skillReference] } as AgentJsonConfig,
					skills: { [skillReference.id]: skillBody },
				}),
			);

			const exported = await service.getConfig(agentId, projectId);

			expect(exported.skills?.[0]).toMatchObject({
				id: skillReference.id,
				...skillBody,
			});
		});

		it('preserves a skill when an exported config is imported into a fresh agent', async () => {
			const { service, agentRepository } = makeService();

			const sourceAgentId = agentId;
			const targetAgentId = 'agent-imported';
			agentRepository.findByIdAndProjectId.mockImplementation(async (id) =>
				id === sourceAgentId
					? makeAgent({
							schema: { ...baseConfig, skills: [skillReference] } as AgentJsonConfig,
							skills: { [skillReference.id]: skillBody },
						})
					: makeAgent({ id: targetAgentId, schema: baseConfig }),
			);

			const exported = await service.getConfig(sourceAgentId, projectId);
			await service.updateConfig(targetAgentId, projectId, exported, user, byUser);

			const saved = agentRepository.save.mock.calls.at(-1)?.[0] as Agent;
			expect(saved.schema?.skills).toEqual([skillReference]);
			expect(saved.skills).toEqual({ [skillReference.id]: skillBody });
		});

		it('drops a skill ref whose inline body is incomplete', async () => {
			const { service, agentRepository } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent({ schema: baseConfig }));

			await service.updateConfig(
				agentId,
				projectId,
				{
					...baseConfig,
					skills: [{ type: 'skill', id: skillReference.id, name: skillBody.name }],
				},
				user,
				byUser,
			);

			const saved = agentRepository.save.mock.calls.at(-1)?.[0] as Agent;
			expect(saved.schema?.skills).toEqual([]);
			expect(saved.skills).toEqual({});
		});

		it('keeps the existing skill body when the imported id already exists on the agent', async () => {
			const { service, agentRepository } = makeService();
			const existingBody = {
				name: 'Existing summarizer',
				description: 'Already on this agent',
				instructions: 'Keep me.',
			};
			agentRepository.findByIdAndProjectId.mockResolvedValue(
				makeAgent({
					schema: { ...baseConfig, skills: [skillReference] } as AgentJsonConfig,
					skills: { [skillReference.id]: existingBody },
				}),
			);

			await service.updateConfig(
				agentId,
				projectId,
				{ ...baseConfig, skills: [{ ...skillReference, ...skillBody }] },
				user,
				byUser,
			);

			const saved = agentRepository.save.mock.calls.at(-1)?.[0] as Agent;
			expect(saved.schema?.skills).toEqual([skillReference]);
			expect(saved.skills).toEqual({ [skillReference.id]: existingBody });
		});

		it('imports a skill whose id collides with an Object.prototype key', async () => {
			const { service, agentRepository } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent({ schema: baseConfig }));

			// `skills['constructor']` is truthy on a plain object even when no such
			// skill exists, so the lookups must use own-property checks.
			await service.updateConfig(
				agentId,
				projectId,
				{ ...baseConfig, skills: [{ type: 'skill', id: 'constructor', ...skillBody }] },
				user,
				byUser,
			);

			const saved = agentRepository.save.mock.calls.at(-1)?.[0] as Agent;
			expect(saved.schema?.skills).toEqual([{ type: 'skill', id: 'constructor' }]);
			expect(saved.skills).toEqual({ constructor: skillBody });
		});

		it('skips an imported skill whose name collides with an existing skill', async () => {
			const { service, agentRepository, agentSkillsService } = makeService();
			agentSkillsService.isSkillNameTaken.mockReturnValue(true);
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent({ schema: baseConfig }));

			await service.updateConfig(
				agentId,
				projectId,
				{ ...baseConfig, skills: [{ ...skillReference, ...skillBody }] },
				user,
				byUser,
			);

			const saved = agentRepository.save.mock.calls.at(-1)?.[0] as Agent;
			expect(saved.schema?.skills).toEqual([]);
			expect(saved.skills).toEqual({});
		});
	});

	// Same round-trip for custom tools: only the source code is exported, and
	// the descriptor is re-derived from that code in the secure runtime on
	// import — never taken from the imported JSON.
	describe('custom tool export/import round-trip', () => {
		const toolReference = { type: 'custom', id: 'my_tool' } as const;
		const toolCode = 'export default new Tool("my_tool")';
		const toolDescriptor = { name: 'my_tool', description: 'demo' } as never;
		const storedTool = { code: toolCode, descriptor: toolDescriptor };

		it('includes the tool source code in the exported config, not just the reference', async () => {
			const { service, agentRepository } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(
				makeAgent({
					schema: { ...baseConfig, tools: [toolReference] } as AgentJsonConfig,
					tools: { [toolReference.id]: storedTool } as Agent['tools'],
				}),
			);

			const exported = await service.getConfig(agentId, projectId);

			expect(exported.tools?.[0]).toMatchObject({ id: toolReference.id, code: toolCode });
			// The descriptor is derived state and must not leak into the export.
			expect(exported.tools?.[0]).not.toHaveProperty('descriptor');
		});

		it('preserves a custom tool when an exported config is imported into a fresh agent', async () => {
			const { service, agentRepository, secureRuntime } = makeService();
			secureRuntime.describeToolSecurely.mockResolvedValue(toolDescriptor);

			const sourceAgentId = agentId;
			const targetAgentId = 'agent-imported';
			agentRepository.findByIdAndProjectId.mockImplementation(async (id) =>
				id === sourceAgentId
					? makeAgent({
							schema: { ...baseConfig, tools: [toolReference] } as AgentJsonConfig,
							tools: { [toolReference.id]: storedTool } as Agent['tools'],
						})
					: makeAgent({ id: targetAgentId, schema: baseConfig }),
			);

			const exported = await service.getConfig(sourceAgentId, projectId);
			await service.updateConfig(targetAgentId, projectId, exported, user, byUser);

			expect(secureRuntime.describeToolSecurely).toHaveBeenCalledWith(toolCode);
			const saved = agentRepository.save.mock.calls.at(-1)?.[0] as Agent;
			expect(saved.schema?.tools).toEqual([toolReference]);
			expect(saved.tools).toEqual({ [toolReference.id]: storedTool });
		});

		it('drops a custom tool ref whose inline code fails to compile', async () => {
			const { service, agentRepository, secureRuntime } = makeService();
			secureRuntime.describeToolSecurely.mockRejectedValue(new Error('compile error'));
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent({ schema: baseConfig }));

			await service.updateConfig(
				agentId,
				projectId,
				{ ...baseConfig, tools: [{ ...toolReference, code: 'not a tool' }] },
				user,
				byUser,
			);

			const saved = agentRepository.save.mock.calls.at(-1)?.[0] as Agent;
			expect(saved.schema?.tools).toEqual([]);
			expect(saved.tools).toEqual({});
		});

		it('drops a custom tool ref whose code declares a different tool name', async () => {
			const { service, agentRepository, secureRuntime } = makeService();
			secureRuntime.describeToolSecurely.mockResolvedValue({ name: 'other_tool' } as never);
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent({ schema: baseConfig }));

			await service.updateConfig(
				agentId,
				projectId,
				{ ...baseConfig, tools: [{ ...toolReference, code: toolCode }] },
				user,
				byUser,
			);

			const saved = agentRepository.save.mock.calls.at(-1)?.[0] as Agent;
			expect(saved.schema?.tools).toEqual([]);
			expect(saved.tools).toEqual({});
		});
	});

	describe('modification telemetry', () => {
		function modifiedEvent(telemetry: Mocked<Telemetry>, entry: unknown) {
			return telemetry.track.mock.calls.find(([called]) => called === entry)?.[1];
		}

		/** What `AgentsService.create` leaves behind: a row with nothing configured. */
		const blankConfig: AgentJsonConfig = {
			name: 'Support Agent',
			model: '',
			instructions: '',
		};

		it('reports the write that first configures an agent as a creation, not a modification', async () => {
			const { service, agentRepository, telemetry } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent({ schema: blankConfig }));

			await service.updateConfig(agentId, projectId, { ...baseConfig }, user, byUser);

			expect(modifiedEvent(telemetry, TELEMETRY_EVENT.AGENTS.USER_CREATED_AGENT)).toMatchObject({
				agent_id: agentId,
				project_id: projectId,
				user_id: user.id,
				event_version: '2',
				model: baseConfig.model,
			});
			expect(telemetry.track).not.toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT,
				expect.anything(),
			);
		});

		it('reports a save to an already-configured agent as a modification, not a second creation', async () => {
			const { service, agentRepository, telemetry } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());

			await service.updateConfig(
				agentId,
				projectId,
				{ ...baseConfig, instructions: 'Escalate billing questions' },
				user,
				byUser,
			);

			expect(modifiedEvent(telemetry, TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT)).toBeDefined();
			expect(telemetry.track).not.toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.USER_CREATED_AGENT,
				expect.anything(),
			);
		});

		it('stays silent when a write leaves the agent unconfigured, so a creation is always its first event', async () => {
			const { service, agentRepository, telemetry } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent({ schema: blankConfig }));

			await service.updateConfig(
				agentId,
				projectId,
				{ ...blankConfig, name: 'Renamed' },
				user,
				byUser,
			);

			expect(telemetry.track).not.toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.USER_CREATED_AGENT,
				expect.anything(),
			);
			expect(telemetry.track).not.toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT,
				expect.anything(),
			);
		});

		it('reports clearing the last model and instructions as a modification with zero capability counts', async () => {
			const { service, agentRepository, telemetry } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());

			await service.updateConfig(agentId, projectId, { ...blankConfig }, user, byUser);

			expect(modifiedEvent(telemetry, TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT)).toEqual(
				expect.objectContaining({
					agent_id: agentId,
					capability_count: 0,
					capability_kinds: [],
					has_published_version: false,
				}),
			);
			expect(telemetry.track).not.toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.USER_CREATED_AGENT,
				expect.anything(),
			);
		});

		it('reports only the parts the save actually changed', async () => {
			const { service, agentRepository, telemetry } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());

			await service.updateConfig(
				agentId,
				projectId,
				{ ...baseConfig, instructions: 'Escalate billing questions' },
				user,
				byUser,
			);

			expect(modifiedEvent(telemetry, TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT)).toEqual(
				expect.objectContaining({
					agent_id: agentId,
					project_id: projectId,
					user_id: user.id,
					event_version: '1',
					changed_parts: ['instructions'],
					has_published_version: false,
				}),
			);
		});

		it.each([
			['builder', TELEMETRY_EVENT.AGENTS.BUILDER_MODIFIED_AGENT],
			['mcp', TELEMETRY_EVENT.AGENTS.MCP_MODIFIED_AGENT],
		] as const)('routes a %s save to its own event', async (modifiedBy, entry) => {
			const { service, agentRepository, telemetry } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());

			await service.updateConfig(
				agentId,
				projectId,
				{ ...baseConfig, instructions: 'Escalate billing questions' },
				user,
				{ modifiedBy },
			);

			expect(modifiedEvent(telemetry, entry)).toEqual(
				expect.objectContaining({ agent_id: agentId, changed_parts: ['instructions'] }),
			);
			expect(telemetry.track).not.toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT,
				expect.anything(),
			);
		});

		it('emits nothing when the submitted config matches what is stored', async () => {
			const { service, agentRepository, telemetry } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());

			await service.updateConfig(agentId, projectId, { ...baseConfig }, user, byUser);

			expect(telemetry.track).not.toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT,
				expect.anything(),
			);
		});

		it('emits nothing when the save fails', async () => {
			const { service, agentRepository, telemetry } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
			agentRepository.save.mockRejectedValue(new Error('db down'));

			await expect(
				service.updateConfig(
					agentId,
					projectId,
					{ ...baseConfig, instructions: 'Escalate billing questions' },
					user,
					byUser,
				),
			).rejects.toThrow('db down');

			expect(telemetry.track).not.toHaveBeenCalled();
		});

		it('reports a published agent as having a live version', async () => {
			const { service, agentRepository, telemetry } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(
				makeAgent({ activeVersionId: 'published-v1' }),
			);

			await service.updateConfig(
				agentId,
				projectId,
				{ ...baseConfig, instructions: 'Escalate billing questions' },
				user,
				byUser,
			);

			expect(modifiedEvent(telemetry, TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT)).toMatchObject({
				has_published_version: true,
			});
		});

		it('counts an MCP server as its own capability rather than as a tool', async () => {
			const { service, agentRepository, telemetry } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(
				makeAgent({ tools: storedCustomTool }),
			);

			await service.updateConfig(
				agentId,
				projectId,
				{
					...baseConfig,
					tools: [{ type: 'custom', id: 'tool_1' }],
					mcpServers: [
						{
							name: 'github',
							url: 'https://example.com/mcp',
							transport: 'streamableHttp',
							authentication: 'none',
						},
					],
				} as unknown as AgentJsonConfig,
				user,
				byUser,
			);

			expect(modifiedEvent(telemetry, TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT)).toMatchObject({
				changed_parts: ['tools', 'mcpServers'],
				tool_count: 1,
				mcp_server_count: 1,
				capability_count: 2,
				capability_kinds: ['mcpServer', 'tool'],
				tool_types: ['custom', 'mcp'],
			});
		});

		it('reports a model credential switch, which no longer rides along on the model part', async () => {
			const { service, agentRepository, credentialsService, telemetry } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
			mockAccessibleCredentials(credentialsService, ['own-key']);

			await service.updateConfig(
				agentId,
				projectId,
				{ ...baseConfig, credential: 'own-key' },
				user,
				byUser,
			);

			expect(modifiedEvent(telemetry, TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT)).toMatchObject({
				changed_parts: ['credential'],
			});
		});

		it('reports a web-search toggle as config and providerTools parts', async () => {
			const { service, agentRepository, telemetry } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());

			await service.updateConfig(
				agentId,
				projectId,
				{ ...baseConfig, config: { webSearch: { enabled: true } } } as unknown as AgentJsonConfig,
				user,
				byUser,
			);

			expect(modifiedEvent(telemetry, TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT)).toMatchObject({
				changed_parts: ['config', 'providerTools'],
			});
		});

		it('reports a providerTools-only change', async () => {
			const { service, agentRepository, telemetry } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(
				makeAgent({
					schema: {
						...baseConfig,
						config: { webSearch: { enabled: true } },
						providerTools: { 'anthropic.web_search': { maxUses: 5 } },
					},
				}),
			);

			await service.updateConfig(
				agentId,
				projectId,
				{
					...baseConfig,
					config: { webSearch: { enabled: true } },
					providerTools: { 'anthropic.web_search': { maxUses: 10 } },
				} as unknown as AgentJsonConfig,
				user,
				byUser,
			);

			expect(modifiedEvent(telemetry, TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT)).toMatchObject({
				changed_parts: ['providerTools'],
			});
		});

		it('reports a channel change as a trigger part', async () => {
			const { service, agentRepository, credentialsService, telemetry } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
			mockAccessibleCredentials(credentialsService, ['slack-cred']);

			await service.updateConfig(
				agentId,
				projectId,
				{ ...baseConfig, integrations: [{ type: 'slack', credentialId: 'slack-cred' }] },
				user,
				byUser,
			);

			expect(modifiedEvent(telemetry, TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT)).toMatchObject({
				changed_parts: ['triggers'],
				trigger_count: 1,
			});
		});
	});
});

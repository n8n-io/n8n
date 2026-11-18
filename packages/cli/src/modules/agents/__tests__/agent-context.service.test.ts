import type { User } from '@n8n/db';
import type { AgentTaskDto } from '@n8n/api-types';
import { beforeEach, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import { ForbiddenError, NotFoundError, UserError } from '@n8n/errors';

import type { AgentConfigService } from '../agent-config.service';
import type {
	AgentExecutionService,
	ProductionTraceSessionDetail,
	ThreadDetail,
	ThreadListItem,
} from '../agent-execution.service';
import type { AgentIntegrationPersistenceService } from '../agent-integration-persistence.service';
import type { AgentSkillsService } from '../agent-skills.service';
import type { AgentTaskService } from '../agent-task.service';
import type { AgentsSettingsService } from '../agents-settings.service';
import type { AgentsToolsService } from '../agents-tools.service';
import type { AgentsService } from '../agents.service';
import type { AttachableWorkflowsService } from '../attachable-workflows.service';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { ProjectAgent } from '../entities/agent.entity';
import type { AgentPublishHistory } from '../entities/agent-publish-history.entity';
import type { AgentPublishHistoryRepository } from '../repositories/agent-publish-history.repository';
import { AgentContextService } from '../agent-context.service';
import { createAgentSkillRefsService, storedAgentConfig } from './test-utils/stored-agent-config';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

function makeService() {
	const agentsService = mock<AgentsService>();
	const agentSkillsService = mock<AgentSkillsService>();
	const agentTaskService = mock<AgentTaskService>();
	const agentExecutionService = mock<AgentExecutionService>();
	const agentIntegrationService = mock<AgentIntegrationPersistenceService>();
	const attachableWorkflowsService = mock<AttachableWorkflowsService>();
	const mcpRegistryService = mock<McpRegistryService>();
	const agentsToolsService = mock<AgentsToolsService>();
	const agentSkillRefs = createAgentSkillRefsService();
	const agentsSettingsService = mock<AgentsSettingsService>();
	const agentConfigService = mock<AgentConfigService>();
	const agentPublishHistoryRepository = mock<AgentPublishHistoryRepository>();
	agentsSettingsService.assertEnabled.mockResolvedValue(undefined);
	agentsSettingsService.getEnabled.mockResolvedValue(true);
	agentPublishHistoryRepository.findLatestForVersions.mockResolvedValue(new Map());
	const service = new AgentContextService(
		agentsService,
		agentSkillsService,
		agentTaskService,
		agentExecutionService,
		agentIntegrationService,
		attachableWorkflowsService,
		mcpRegistryService,
		agentsToolsService,
		agentSkillRefs,
		agentsSettingsService,
		agentConfigService,
		agentPublishHistoryRepository,
	);
	return {
		service,
		agentsService,
		agentSkillsService,
		agentTaskService,
		agentExecutionService,
		agentIntegrationService,
		attachableWorkflowsService,
		mcpRegistryService,
		agentsToolsService,
		agentSkillRefs,
		agentsSettingsService,
		agentConfigService,
		agentPublishHistoryRepository,
	};
}

const user = mock<User>({ id: 'user-1' });
const agent = {
	id: 'agent-1',
	projectId: 'project-1',
	name: 'Support Agent',
	schema: { name: 'Support Agent', model: '', instructions: 'Help users.' },
	integrations: [],
	tools: {},
	skills: {},
	versionId: 'draft-1',
	activeVersionId: 'published-1',
	updatedAt: new Date('2026-09-17T10:00:00.000Z'),
} as unknown as ProjectAgent;

describe('AgentContextService', () => {
	beforeEach(() => {
		vi.mocked(userHasScopes).mockReset();
		vi.mocked(userHasScopes).mockResolvedValue(true);
	});

	it('rejects lookups when Agents are turned off', async () => {
		const { service, agentsService, agentsSettingsService } = makeService();
		agentsSettingsService.assertEnabled.mockRejectedValue(
			new ForbiddenError(
				'Agents are disabled. Ask an instance admin to enable them in Settings > Agents.',
			),
		);

		await expect(
			service.createReader(user, 'project-1').lookup({ type: 'config', agentId: 'agent-1' }),
		).rejects.toThrow(UserError);
		expect(agentsService.findById).not.toHaveBeenCalled();
	});

	it('labels config as the current draft and includes publication state', async () => {
		const { service, agentsService, agentSkillRefs } = makeService();
		agentsService.findById.mockResolvedValue(agent);

		const result = await service.createReader(user, 'project-1').lookup({
			type: 'config',
			agentId: 'agent-1',
		});

		expect(agentsService.findById).toHaveBeenCalledWith('agent-1', 'project-1');
		// The config needs the skill refs, not the skill bodies.
		expect(agentSkillRefs.skillsForRefs).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			configState: 'current-draft',
			config: { name: 'Support Agent', model: '', instructions: 'Help users.' },
			configHash: expect.stringMatching(/^[a-f0-9]{64}$/),
			agent: {
				id: 'agent-1',
				published: true,
				draftVersionId: 'draft-1',
				activeVersionId: 'published-1',
			},
		});
	});

	it('lists agents in the bound project', async () => {
		const { service, agentsService } = makeService();
		agentsService.findByProjectId.mockResolvedValue([
			agent,
			{ ...agent, id: 'agent-2', name: 'Research Agent', activeVersionId: null },
			{ ...agent, id: 'agent-3', name: 'Archived Agent', isArchived: true },
		]);

		const result = await service.createReader(user, 'project-1').lookup({ type: 'agents' });

		expect(agentsService.findByProjectId).toHaveBeenCalledWith('project-1');
		expect(result).toEqual({
			agents: [
				{
					agentId: 'agent-1',
					name: 'Support Agent',
					published: true,
					updatedAt: '2026-09-17T10:00:00.000Z',
				},
				{
					agentId: 'agent-2',
					name: 'Research Agent',
					published: false,
					updatedAt: '2026-09-17T10:00:00.000Z',
				},
			],
		});
	});

	it('lists chat channels and searches callable integrations', async () => {
		const { service, agentIntegrationService, mcpRegistryService, agentsToolsService } =
			makeService();
		const channels = [
			{
				type: 'linear',
				label: 'Linear',
				icon: 'linear',
				credentialTypes: ['linearOAuth2Api'],
				capabilities: ['Receive Linear issue/comment events'],
				useIntegrationWhen: ['The agent receives Linear issue comments'],
				useNodeToolWhen: ['The agent creates Linear tickets'],
			},
		];
		agentIntegrationService.listBuilderChatIntegrations.mockResolvedValue(channels);
		mcpRegistryService.search.mockResolvedValue([]);
		agentsToolsService.searchAgentToolNodes.mockResolvedValue({
			results: '',
			queriesWithNoResults: ['linear'],
		});
		const reader = service.createReader(user, 'project-1');

		expect(await reader.lookup({ type: 'integrations' })).toEqual({ channels });
		expect(agentIntegrationService.listBuilderChatIntegrations).toHaveBeenCalledWith(user);
		expect(await reader.lookup({ type: 'integrations', queries: ['linear'] })).toEqual({
			kind: 'node',
			results: '',
			queriesWithNoResults: ['linear'],
		});
		expect(mcpRegistryService.search).toHaveBeenCalledWith(['linear']);
	});

	it('lists attachable workflows using the search term', async () => {
		const { service, attachableWorkflowsService } = makeService();
		const workflows = [
			{ id: 'wf-1', name: 'Billing follow-up', published: true, triggerType: 'executeWorkflow' },
		];
		attachableWorkflowsService.list.mockResolvedValue(workflows);

		const result = await service.createReader(user, 'project-1').lookup({
			type: 'attachable-workflows',
			searchTerm: 'billing',
		});

		expect(attachableWorkflowsService.list).toHaveBeenCalledWith(user, 'project-1', 'billing');
		expect(result).toEqual({ workflows });
	});

	it('lists configurable fields without an Agent id', async () => {
		const { service, agentsService } = makeService();

		const result = await service.createReader(user, 'project-1').lookup({
			type: 'config-schema',
		});

		expect(result.configurableProperties).toContain('maxIterations?: integer [1..200]');
		expect(result.configurableProperties).toContain('skills?:');
		expect(result.configurableProperties).toContain('tools?:');
		expect(agentsService.findById).not.toHaveBeenCalled();
	});

	it('reads skill references through the shared projection', async () => {
		const { service, agentsService, agentSkillsService } = makeService();
		agentsService.findById.mockResolvedValue(agent);
		agentSkillsService.getSkill.mockResolvedValue({
			name: 'Support',
			description: 'Handle support requests',
			instructions: 'Read the support guide.',
			references: [
				{ path: 'guide.md', content: 'Guide' },
				{ path: 'notes.md', content: 'Notes' },
			],
		});

		const result = await service.createReader(user, 'project-1').lookup({
			type: 'skill',
			agentId: 'agent-1',
			skillId: 'support',
			referencePaths: ['guide.md'],
		});

		expect(result).toMatchObject({
			id: 'support',
			skill: {
				references: [
					{ path: 'guide.md', characterCount: 5, content: 'Guide' },
					{ path: 'notes.md', characterCount: 5 },
				],
			},
		});
	});

	it.each([
		['missing', new NotFoundError('Skill not found')],
		['inaccessible', new ForbiddenError('Skill is not accessible')],
	])('returns an actionable error for skill access (%s)', async (_kind, error) => {
		const { service, agentsService, agentSkillsService } = makeService();
		agentsService.findById.mockResolvedValue(agent);
		agentSkillsService.getSkill.mockRejectedValue(error);

		const lookup = service.createReader(user, 'project-1').lookup({
			type: 'skill',
			agentId: 'agent-1',
			skillId: 'unknown',
		});
		await expect(lookup).rejects.toBeInstanceOf(UserError);
		await expect(lookup).rejects.toThrow(error.message);
	});

	it('lists the skills attached to the agent', async () => {
		const { service, agentsService, agentSkillRefs } = makeService();
		agentSkillRefs.bodies.notes = {
			name: 'Notes',
			description: 'Take notes',
			instructions: 'Write notes.',
		};
		agentsService.findById.mockResolvedValue({
			...agent,
			schema: storedAgentConfig({
				name: 'Support Agent',
				model: '',
				instructions: 'Help users.',
				skills: [{ type: 'skill', id: 'notes' }],
			}),
		} as ProjectAgent);

		const result = await service.createReader(user, 'project-1').lookup({
			type: 'skills',
			agentId: 'agent-1',
		});

		expect(result).toEqual({
			skills: [{ id: 'notes', name: 'Notes', description: 'Take notes', attached: true }],
		});
	});

	it('reads task enabled state from the current Agent config', async () => {
		const { service, agentsService, agentTaskService } = makeService();
		agentsService.findById.mockResolvedValue({
			...agent,
			schema: {
				...agent.schema,
				name: 'Support Agent',
				model: '',
				instructions: 'Help users.',
				tasks: [{ type: 'task', id: 'task-1', enabled: true }],
			},
		});
		agentTaskService.list.mockResolvedValue([
			mock<AgentTaskDto>({ id: 'task-1', name: 'Daily' }),
			mock<AgentTaskDto>({ id: 'task-2', name: 'Weekly' }),
		]);

		const result = await service.createReader(user, 'project-1').lookup({
			type: 'tasks',
			agentId: 'agent-1',
		});

		expect(result.tasks).toMatchObject([
			{ id: 'task-1', enabled: true },
			{ id: 'task-2', enabled: false },
		]);
	});

	it('scopes session filters to the bound project and Agent', async () => {
		const { service, agentsService, agentExecutionService } = makeService();
		agentsService.findById.mockResolvedValue(agent);
		agentExecutionService.getThreads.mockResolvedValue({
			threads: [
				{
					id: 'thread-1',
					agentId: 'agent-1',
					agentName: 'Support Agent',
					title: 'Failed request',
					sessionNumber: 2,
					createdAt: new Date('2026-09-17T10:00:00.000Z'),
					updatedAt: new Date('2026-09-17T10:05:00.000Z'),
					status: 'error',
					source: 'preview',
					failureSummary: null,
					totalPromptTokens: 10,
					totalCompletionTokens: 5,
					totalDuration: 100,
				} as ThreadListItem,
			],
			nextCursor: null,
		});

		const result = await service.createReader(user, 'project-1').lookup({
			type: 'sessions',
			agentId: 'agent-1',
			limit: 5,
			status: 'error',
		});

		expect(agentExecutionService.getThreads).toHaveBeenCalledWith(
			'project-1',
			'agent-1',
			'user-1',
			5,
			undefined,
			{ status: 'error' },
		);
		expect(result).toMatchObject({ sessions: [{ threadId: 'thread-1', status: 'error' }] });
	});

	it('reads scoped session details and reports missing sessions', async () => {
		const { service, agentsService, agentExecutionService } = makeService();
		const createdAt = new Date('2026-09-17T10:00:00.000Z');
		const updatedAt = new Date('2026-09-17T10:05:00.000Z');
		const detail: ThreadDetail = {
			thread: Object.assign(mock<ThreadDetail['thread']>(), {
				id: 'thread-1',
				agentId: 'agent-1',
				agentName: 'Support Agent',
				projectId: 'project-1',
				ownerId: user.id,
				accessScope: 'user',
				title: ' Failed request ',
				emoji: null,
				parentThreadId: null,
				parentAgentId: null,
				taskId: null,
				taskVersionId: null,
				sessionNumber: 2,
				createdAt,
				updatedAt,
				totalPromptTokens: 10,
				totalCompletionTokens: 5,
				totalDuration: 100,
				totalCost: 0.02,
			}),
			executions: [
				Object.assign(mock<ThreadDetail['executions'][number]>(), {
					id: 'execution-1',
					threadId: 'thread-1',
					status: 'error',
					inputMessageIds: ['message-1'],
					inputMessages: [
						{
							id: 'message-1',
							role: 'user',
							content: [{ type: 'text', text: 'Help with billing.' }],
						},
					],
					userMessage: 'Help with billing.',
					model: 'test-model',
					duration: 100,
					promptTokens: 10,
					completionTokens: 5,
					totalTokens: 15,
					cost: 0.02,
					error: 'Request failed',
					timeline: [
						{ type: 'input', messageId: 'message-1', timestamp: 1 },
						{ type: 'text', content: 'Checking billing.', timestamp: 2, endTime: 3 },
					],
					failureSummary: {
						count: 1,
						latest: { kind: 'execution', name: null, message: 'Request failed', occurredAt: 3 },
					},
					source: 'preview',
					startedAt: createdAt,
					stoppedAt: updatedAt,
					createdAt,
					updatedAt,
					author: null,
					attachments: [],
					hitlStatus: null,
					acceptsSteering: false,
					storedAt: 'db',
				}),
			],
		};
		agentsService.findById.mockResolvedValue(agent);
		agentExecutionService.getThreadDetail.mockResolvedValue(detail);
		const reader = service.createReader(user, 'project-1');
		const lookup = { type: 'session', agentId: 'agent-1', threadId: 'thread-1' } as const;

		expect(await reader.lookup(lookup)).toEqual({
			session: {
				threadId: 'thread-1',
				agentId: 'agent-1',
				agentName: 'Support Agent',
				title: 'Failed request',
				sessionNumber: 2,
				createdAt: '2026-09-17T10:00:00.000Z',
				updatedAt: '2026-09-17T10:05:00.000Z',
				status: 'error',
				origin: 'preview',
				failureCount: 1,
				totalPromptTokens: 10,
				totalCompletionTokens: 5,
				totalDuration: 100,
			},
			sessionDetail: {
				thread: {
					id: 'thread-1',
					agentId: 'agent-1',
					agentName: 'Support Agent',
					title: ' Failed request ',
					sessionNumber: 2,
					createdAt,
					updatedAt,
				},
				executions: [
					{
						id: 'execution-1',
						status: 'error',
						inputMessageIds: ['message-1'],
						inputMessages: [
							{
								id: 'message-1',
								role: 'user',
								content: [{ type: 'text', text: 'Help with billing.' }],
							},
						],
						userMessage: 'Help with billing.',
						model: 'test-model',
						duration: 100,
						totalTokens: 15,
						error: 'Request failed',
						timeline: [
							{ type: 'input', messageId: 'message-1', timestamp: 1 },
							{ type: 'text', content: 'Checking billing.', timestamp: 2, endTime: 3 },
						],
					},
				],
			},
		});
		expect(agentExecutionService.getThreadDetail).toHaveBeenCalledWith(
			'thread-1',
			'project-1',
			'agent-1',
			user.id,
		);

		agentExecutionService.getThreadDetail.mockResolvedValue(null);
		expect(await reader.lookup(lookup)).toEqual({ notFound: true });
	});

	it('does not read context when Agent read access is denied or revoked', async () => {
		const { service, agentsService } = makeService();
		const reader = service.createReader(user, 'project-1');
		vi.mocked(userHasScopes).mockResolvedValue(false);

		await expect(reader.lookup({ type: 'agents' })).rejects.toThrow(
			"You don't have permission to read Agents in this project.",
		);
		expect(agentsService.findByProjectId).not.toHaveBeenCalled();

		vi.mocked(userHasScopes).mockResolvedValue(true);
		agentsService.findByProjectId.mockResolvedValue([agent]);
		await expect(reader.lookup({ type: 'agents' })).resolves.toMatchObject({
			agents: [{ agentId: 'agent-1' }],
		});

		agentsService.findByProjectId.mockClear();
		vi.mocked(userHasScopes).mockResolvedValue(false);

		await expect(reader.lookup({ type: 'agents' })).rejects.toThrow(
			"You don't have permission to read Agents in this project.",
		);
		expect(agentsService.findByProjectId).not.toHaveBeenCalled();
	});

	it('ignores templated MCP results and falls back to node tools', async () => {
		const { service, mcpRegistryService, agentsToolsService } = makeService();
		mcpRegistryService.search.mockResolvedValue([
			{
				slug: 'templated-server',
				name: 'templatedServer',
				title: 'Templated server',
				description: 'Requires a credential value in its endpoint.',
				url: '={{$self["host"]}}/mcp',
				transport: 'streamableHttp',
				authentication: 'templatedApi',
				credentialType: 'templatedApi',
				tools: [],
				metadata: { nodeTypeName: '@n8n/mcp.templatedServer' },
				isTemplated: true,
			},
		]);
		agentsToolsService.searchAgentToolNodes.mockResolvedValue({
			results: '## HTTP Request',
			queriesWithNoResults: [],
		});

		const result = await service.createReader(user, 'project-1').lookup({
			type: 'integrations',
			queries: ['HTTP'],
		});

		expect(result).toEqual({
			kind: 'node',
			results: '## HTTP Request',
			queriesWithNoResults: [],
		});
	});

	it('distinguishes a fresh draft from a failed artifact read', async () => {
		const { service, agentConfigService } = makeService();
		agentConfigService.getConfig
			.mockRejectedValueOnce(new UserError('No config'))
			.mockRejectedValueOnce(new Error('Read failed'));
		expect(await service.readArtifact(user, 'project-1', 'agent-1')).toBeNull();
		await expect(service.readArtifact(user, 'project-1', 'agent-1')).rejects.toThrow('Read failed');
	});

	it('scopes session reads to the user and checks access on each read', async () => {
		const { service, agentExecutionService, agentsSettingsService } = makeService();
		agentExecutionService.getThreadDetail.mockResolvedValue(null);
		expect(await service.readSession(user, 'project-1', 'agent-1', 'thread-1')).toBeNull();
		expect(agentExecutionService.getThreadDetail).toHaveBeenCalledWith(
			'thread-1',
			'project-1',
			'agent-1',
			user.id,
		);
		vi.mocked(userHasScopes).mockResolvedValue(false);
		await expect(service.readSession(user, 'project-1', 'agent-1', 'thread-1')).rejects.toThrow(
			ForbiddenError,
		);
		agentsSettingsService.assertEnabled.mockRejectedValue(new NotFoundError('Agents are disabled'));
		await expect(service.readSession(user, 'project-1', 'agent-1', 'thread-1')).rejects.toThrow(
			'Agents are disabled',
		);
		expect(agentExecutionService.getThreadDetail).toHaveBeenCalledTimes(1);
	});

	it('lists sessions for the user and checks access on each list', async () => {
		const { service, agentExecutionService } = makeService();
		agentExecutionService.getThreads.mockResolvedValue({ threads: [], nextCursor: 'next' });

		await expect(
			service.listSessions(user, 'project-1', 'agent-1', {
				origin: 'mcp',
				updatedAfter: '2026-09-17T10:00:00.000Z',
			}),
		).resolves.toEqual({ sessions: [], nextCursor: 'next' });
		expect(agentExecutionService.getThreads).toHaveBeenCalledWith(
			'project-1',
			'agent-1',
			user.id,
			20,
			undefined,
			{ origin: 'mcp', updatedAfter: new Date('2026-09-17T10:00:00.000Z') },
		);

		vi.mocked(userHasScopes).mockResolvedValue(false);
		await expect(service.listSessions(user, 'project-1', 'agent-1', {})).rejects.toThrow(
			ForbiddenError,
		);
		expect(agentExecutionService.getThreads).toHaveBeenCalledTimes(1);
	});

	describe('listProjectAgents', () => {
		it('lists the agents that are not archived, with their publication state', async () => {
			const { service, agentsService } = makeService();
			agentsService.findByProjectId.mockResolvedValue([
				{ ...agent, isArchived: false },
				{ ...agent, id: 'agent-2', name: 'Draft Agent', activeVersionId: null, isArchived: false },
				{ ...agent, id: 'agent-3', name: 'Old Agent', isArchived: true },
			] as ProjectAgent[]);

			await expect(service.listProjectAgents('project-1')).resolves.toEqual([
				{ id: 'agent-1', name: 'Support Agent', published: true },
				{ id: 'agent-2', name: 'Draft Agent', published: false },
			]);
			expect(vi.mocked(userHasScopes)).not.toHaveBeenCalled();
		});

		it('returns an empty list when Agents are turned off', async () => {
			const { service, agentsService, agentsSettingsService } = makeService();
			agentsSettingsService.getEnabled.mockResolvedValue(false);

			await expect(service.listProjectAgents('project-1')).resolves.toEqual([]);
			expect(agentsService.findByProjectId).not.toHaveBeenCalled();
		});
	});

	describe('getPublishedVersion', () => {
		const cleanAgent = {
			...agent,
			isArchived: false,
			versionId: 'published-1',
			activeVersion: { versionId: 'published-1', createdAt: new Date('2026-09-01T00:00:00.000Z') },
		} as ProjectAgent;

		function makeCleanService() {
			const mocks = makeService();
			mocks.agentSkillRefs.versionSnapshot.mockResolvedValue(new Map());
			mocks.agentSkillRefs.matchesVersion.mockResolvedValue(true);
			return mocks;
		}

		it.each([
			['the agent does not exist', null],
			['the agent is archived', { ...cleanAgent, isArchived: true }],
			['the agent is not published', { ...cleanAgent, activeVersionId: null }],
		])('returns null when %s', async (_name, found) => {
			const { service, agentsService } = makeCleanService();
			agentsService.findById.mockResolvedValue(found as ProjectAgent | null);

			await expect(service.getPublishedVersion('project-1', 'agent-1')).resolves.toBeNull();
		});

		it('uses the time of the latest publication of the active version', async () => {
			const { service, agentsService, agentPublishHistoryRepository } = makeCleanService();
			agentsService.findById.mockResolvedValue(cleanAgent);
			const publishedAt = new Date('2026-09-10T00:00:00.000Z');
			agentPublishHistoryRepository.findLatestForVersions.mockResolvedValue(
				new Map([['published-1', { createdAt: publishedAt } as AgentPublishHistory]]),
			);

			await expect(service.getPublishedVersion('project-1', 'agent-1')).resolves.toEqual({
				versionId: 'published-1',
				publishedAt,
				agentName: 'Support Agent',
				clean: true,
			});
			expect(agentsService.findById).toHaveBeenCalledWith('agent-1', 'project-1');
			expect(agentPublishHistoryRepository.findLatestForVersions).toHaveBeenCalledWith(
				'agent-1',
				['published-1'],
				{},
			);
		});

		it('reads the publication time of one version', async () => {
			const { service, agentPublishHistoryRepository } = makeCleanService();
			const publishedAt = new Date('2026-09-10T00:00:00.000Z');
			agentPublishHistoryRepository.findLatestForVersions.mockResolvedValue(
				new Map([['old-version', { createdAt: publishedAt } as AgentPublishHistory]]),
			);

			await expect(service.getVersionPublishedAt('agent-1', 'old-version')).resolves.toEqual(
				publishedAt,
			);
			await expect(service.getVersionPublishedAt('agent-1', 'other')).resolves.toBeNull();
		});

		it('uses the save time of the version when it has no publication row', async () => {
			const { service, agentsService } = makeCleanService();
			agentsService.findById.mockResolvedValue(cleanAgent);

			await expect(service.getPublishedVersion('project-1', 'agent-1')).resolves.toMatchObject({
				publishedAt: new Date('2026-09-01T00:00:00.000Z'),
			});
		});

		it('is not clean when the draft version is not the published version', async () => {
			const { service, agentsService } = makeCleanService();
			agentsService.findById.mockResolvedValue({ ...cleanAgent, versionId: 'draft-1' });

			await expect(service.getPublishedVersion('project-1', 'agent-1')).resolves.toMatchObject({
				clean: false,
			});
		});

		it('is not clean when a followed skill has a newer version', async () => {
			const { service, agentsService, agentSkillRefs } = makeCleanService();
			agentsService.findById.mockResolvedValue(cleanAgent);
			agentSkillRefs.matchesVersion.mockResolvedValue(false);

			await expect(service.getPublishedVersion('project-1', 'agent-1')).resolves.toMatchObject({
				clean: false,
			});
		});

		it('is not clean when the draft refers to a skill that does not exist', async () => {
			const { service, agentsService, agentSkillRefs } = makeCleanService();
			agentsService.findById.mockResolvedValue(cleanAgent);
			agentSkillRefs.versionSnapshot.mockRejectedValue(new UserError('missing skills'));

			await expect(service.getPublishedVersion('project-1', 'agent-1')).resolves.toMatchObject({
				clean: false,
			});
		});
	});

	describe('production sessions', () => {
		const window = {
			after: new Date('2026-09-01T00:00:00.000Z'),
			until: new Date('2026-09-17T00:00:00.000Z'),
		};
		const filter = { projectId: 'project-1', agentId: 'agent-1', readerId: 'user-1', ...window };
		const firstTurn = {
			id: 'execution-1',
			threadId: 'thread-1',
			source: 'slack',
			createdAt: new Date('2026-09-10T08:00:00.000Z'),
			status: 'success',
			userMessage: 'x'.repeat(600),
			timeline: [
				{ type: 'text', content: 'One moment.', timestamp: 1 },
				{ type: 'tool-call', name: 'lookup_order' },
			],
			error: null,
			failureSummary: null,
			cost: 0.02,
			totalTokens: 1200,
			duration: 3400,
		} as unknown as AgentExecution;
		const secondTurn = {
			...firstTurn,
			id: 'execution-2',
			createdAt: new Date('2026-09-11T09:30:00.000Z'),
			status: 'error',
			userMessage: 'That is the wrong order.',
			timeline: [{ type: 'tool-call', name: 'lookup_customer' }],
			failureSummary: { count: 1, latest: { message: 'Order not found' } },
			cost: null,
			totalTokens: 300,
			duration: 600,
		} as unknown as AgentExecution;
		const summary = {
			sessionId: 'thread-1',
			source: 'slack',
			lastActivityAt: '2026-09-11T09:30:00.000Z',
			turnCount: 2,
			firstUserMessage: 'x'.repeat(500),
			toolNames: ['lookup_order', 'lookup_customer'],
			failure: 'Order not found',
			cost: 0.02,
			totalTokens: 1500,
			durationMs: 4000,
		};

		it('counts the sessions of the window as the user', async () => {
			const { service, agentExecutionService } = makeService();
			agentExecutionService.countProductionTraceSessions.mockResolvedValue(7);

			await expect(
				service.countProductionTraces(user, 'project-1', 'agent-1', window),
			).resolves.toBe(7);
			expect(agentExecutionService.countProductionTraceSessions).toHaveBeenCalledWith(filter);
		});

		it('lists one summary for each session from its turns in the window', async () => {
			const { service, agentExecutionService } = makeService();
			agentExecutionService.listProductionTraceSessions.mockResolvedValue([
				{ threadId: 'thread-1', turns: [firstTurn, secondTurn] },
			]);

			await expect(
				service.listProductionTraces(user, 'project-1', 'agent-1', window, {
					limit: 20,
					offset: 40,
				}),
			).resolves.toEqual([summary]);
			expect(agentExecutionService.listProductionTraceSessions).toHaveBeenCalledWith(filter, {
				limit: 20,
				offset: 40,
			});
		});

		it('gives null sums and a null source when no turn has a value', async () => {
			const { service, agentExecutionService } = makeService();
			agentExecutionService.listProductionTraceSessions.mockResolvedValue([
				{
					threadId: 'thread-1',
					turns: [{ ...firstTurn, source: null, cost: null, totalTokens: null } as AgentExecution],
				},
			]);

			const [listed] = await service.listProductionTraces(user, 'project-1', 'agent-1', window, {
				limit: 20,
				offset: 0,
			});

			expect(listed).toMatchObject({
				source: null,
				turnCount: 1,
				failure: null,
				cost: null,
				totalTokens: null,
				durationMs: 3400,
			});
		});

		it.each([
			[
				{ limit: 5000, offset: -3 },
				{ limit: 100, offset: 0 },
			],
			[
				{ limit: -1, offset: 2.7 },
				{ limit: 1, offset: 2 },
			],
			[
				{ limit: Number.NaN, offset: Number.NaN },
				{ limit: 1, offset: 0 },
			],
		])('keeps the page %o inside the allowed range', async (requested, used) => {
			const { service, agentExecutionService } = makeService();
			agentExecutionService.listProductionTraceSessions.mockResolvedValue([]);

			await service.listProductionTraces(user, 'project-1', 'agent-1', window, requested);

			expect(agentExecutionService.listProductionTraceSessions).toHaveBeenCalledWith(filter, used);
		});

		it('reads one session with every turn of its conversation', async () => {
			const { service, agentExecutionService } = makeService();
			const beforeWindow = { ...firstTurn, id: 'execution-0' } as AgentExecution;
			agentExecutionService.getProductionTraceSession.mockResolvedValue({
				thread: { id: 'thread-1', agentId: 'agent-1', agentName: 'Support Agent' },
				executions: [beforeWindow, firstTurn, secondTurn],
				turns: [firstTurn, secondTurn],
			} as ProductionTraceSessionDetail);

			const trace = await service.readProductionTrace(
				user,
				'project-1',
				'agent-1',
				'thread-1',
				window,
			);

			expect(agentExecutionService.getProductionTraceSession).toHaveBeenCalledWith(
				filter,
				'thread-1',
			);
			expect(trace).toMatchObject(summary);
			expect(trace?.session.thread.id).toBe('thread-1');
			expect(trace?.session.executions.map(({ id }) => id)).toEqual([
				'execution-0',
				'execution-1',
				'execution-2',
			]);
		});

		it('returns null when the session has no production turn in the window', async () => {
			const { service, agentExecutionService } = makeService();
			agentExecutionService.getProductionTraceSession.mockResolvedValue(null);

			await expect(
				service.readProductionTrace(user, 'project-1', 'agent-1', 'thread-9', window),
			).resolves.toBeNull();
		});

		it('rejects every session method when the user cannot read agents in the project', async () => {
			const { service, agentExecutionService } = makeService();
			vi.mocked(userHasScopes).mockResolvedValue(false);

			await expect(
				service.countProductionTraces(user, 'project-1', 'agent-1', window),
			).rejects.toThrow(ForbiddenError);
			await expect(
				service.listProductionTraces(user, 'project-1', 'agent-1', window, {
					limit: 20,
					offset: 0,
				}),
			).rejects.toThrow(ForbiddenError);
			await expect(
				service.readProductionTrace(user, 'project-1', 'agent-1', 'thread-1', window),
			).rejects.toThrow(ForbiddenError);
			expect(agentExecutionService.countProductionTraceSessions).not.toHaveBeenCalled();
			expect(agentExecutionService.listProductionTraceSessions).not.toHaveBeenCalled();
			expect(agentExecutionService.getProductionTraceSession).not.toHaveBeenCalled();
		});
	});
});

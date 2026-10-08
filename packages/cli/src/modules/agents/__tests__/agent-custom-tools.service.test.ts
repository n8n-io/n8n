import type { EventService } from '@n8n/backend-services';
import { Container } from '@n8n/di';
import type { ToolDescriptor } from '@n8n/agents';
import type { AgentJsonVectorStoreConfig } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'vitest-mock-extended';
import { UserError } from 'n8n-workflow';

import { ConflictError, NotFoundError } from '@n8n/errors';

import type { AgentModificationTelemetryService } from '../agent-modification-telemetry.service';
import { AgentSaveCompletionService } from '../agent-save-completion.service';
import { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import { AgentCustomToolsService } from '../agent-custom-tools.service';
import type { AgentUpdateBroadcaster } from '../agent-update-broadcaster';
import type { Agent } from '../entities/agent.entity';
import type { AgentRepository } from '../repositories/agent.repository';

const agentId = 'agent-1';
const projectId = 'project-1';
const toolId = '0Ab9ZkLm3Pq7Xy2N';
const telemetryContext = { user: { id: 'user-1' } as never, modifiedBy: 'user' as const };
const descriptor: ToolDescriptor = {
	name: 'lookup_customer',
	description: 'Look up a customer',
	systemInstruction: null,
	inputSchema: { type: 'object', properties: {} },
	outputSchema: null,
	hasSuspend: false,
	hasResume: false,
	hasToMessage: false,
	requireApproval: false,
	providerOptions: null,
};
const vectorStore: AgentJsonVectorStoreConfig = {
	provider: 'qdrant',
	name: 'docs',
	credential: 'vector-store-credential',
	useWhen: 'Search documentation',
	embedding: { model: 'openai/text-embedding-3-small', credential: 'embedding-credential' },
	collectionName: 'docs',
};

function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		id: agentId,
		projectId,
		versionId: 'version-1',
		activeVersionId: 'version-1',
		schema: {
			name: 'Support Agent',
			model: 'anthropic/claude-sonnet-4-5',
			instructions: 'Help users',
			tools: [],
			skills: [],
		},
		tools: {},
		skills: {},
		updatedAt: new Date('2025-01-01T00:00:00Z'),
		...overrides,
	} as unknown as Agent;
}

function makeService() {
	const agentRepository = mock<AgentRepository>();
	const runtimeCacheService = mock<AgentRuntimeCacheService>();
	const modificationTelemetry = mock<AgentModificationTelemetryService>();
	const agentUpdateBroadcaster = mock<AgentUpdateBroadcaster>();
	agentRepository.saveDraftFenced.mockResolvedValue(true);

	Container.set(AgentRuntimeCacheService, runtimeCacheService);
	const service = new AgentCustomToolsService(
		mockLogger(),
		agentRepository,
		new AgentSaveCompletionService(
			mock<EventService>(),
			agentUpdateBroadcaster,
			modificationTelemetry,
		),
	);

	return {
		service,
		agentRepository,
		runtimeCacheService,
		modificationTelemetry,
		agentUpdateBroadcaster,
	};
}

describe('AgentCustomToolsService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Container.reset();
	});

	it('builds and stores a custom tool, marks the draft dirty, and clears runtime cache', async () => {
		const { service, agentRepository, runtimeCacheService } = makeService();
		const agent = makeAgent();
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		const result = await service.buildCustomTool(
			agentId,
			projectId,
			'return 1;',
			descriptor,
			telemetryContext,
		);

		expect(result).toEqual({
			ok: true,
			id: expect.stringMatching(/^[A-Za-z0-9]{16}$/),
			descriptor,
			changed: true,
		});
		expect(agent.tools[result.id]).toEqual({ code: 'return 1;', descriptor });
		expect(agent.versionId).not.toBe(agent.activeVersionId);
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
		expect(agentRepository.saveDraftFenced).toHaveBeenCalledWith(agent, {});
	});

	it('keeps save effects silent when a custom tool loses the revision fence', async () => {
		const {
			service,
			agentRepository,
			runtimeCacheService,
			modificationTelemetry,
			agentUpdateBroadcaster,
		} = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		agentRepository.saveDraftFenced.mockResolvedValue(false);

		await expect(
			service.buildCustomTool(agentId, projectId, 'return 1;', descriptor, telemetryContext),
		).rejects.toThrow(ConflictError);
		expect(runtimeCacheService.clearRuntimes).not.toHaveBeenCalled();
		expect(agentUpdateBroadcaster.notify).not.toHaveBeenCalled();
		expect(modificationTelemetry.record).not.toHaveBeenCalled();
	});

	it('throws when building a tool for a missing agent', async () => {
		const { service, agentRepository, runtimeCacheService } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);

		await expect(
			service.buildCustomTool(agentId, projectId, 'return 1;', descriptor, telemetryContext),
		).rejects.toThrow(NotFoundError);
		expect(runtimeCacheService.clearRuntimes).not.toHaveBeenCalled();
	});

	it('reports an unchanged custom tool without writing the draft', async () => {
		const { service, agentRepository, runtimeCacheService } = makeService();
		const agent = makeAgent({ tools: { [toolId]: { code: 'return 1;', descriptor } } });
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		const result = await service.buildCustomTool(
			agentId,
			projectId,
			'return 1;',
			descriptor,
			telemetryContext,
		);

		expect(result.changed).toBe(false);
		expect(result.id).toBe(toolId);
		expect(agentRepository.saveDraftFenced).not.toHaveBeenCalled();
		expect(runtimeCacheService.clearRuntimes).not.toHaveBeenCalled();
	});

	it('keeps the ID and config reference when a disabled tool is renamed', async () => {
		const { service, agentRepository } = makeService();
		const agent = makeAgent({ tools: { [toolId]: { code: 'return 1;', descriptor } } });
		agent.schema!.tools = [{ type: 'custom', id: toolId, enabled: false }];
		agent.schema!.vectorStores = [vectorStore];
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		const renamed = { ...descriptor, name: 'search_docs' };

		const result = await service.buildCustomTool(
			agentId,
			projectId,
			'return 2;',
			renamed,
			telemetryContext,
			{ toolId },
		);

		expect(result).toEqual({ ok: true, id: toolId, descriptor: renamed, changed: true });
		expect(agent.tools).toEqual({ [toolId]: { code: 'return 2;', descriptor: renamed } });
		expect(agent.schema!.tools).toEqual([{ type: 'custom', id: toolId, enabled: false }]);
	});

	it('rejects a rename that collides with a vector store before changing the draft', async () => {
		const { service, agentRepository } = makeService();
		const agent = makeAgent({ tools: { [toolId]: { code: 'return 1;', descriptor } } });
		agent.schema!.tools = [{ type: 'custom', id: toolId, enabled: true }];
		agent.schema!.vectorStores = [vectorStore];
		const original = structuredClone(agent);
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		await expect(
			service.buildCustomTool(
				agentId,
				projectId,
				'return 2;',
				{ ...descriptor, name: 'search_docs' },
				telemetryContext,
				{ toolId },
			),
		).rejects.toThrow('Vector store tool name collides with an existing tool: search_docs');
		expect(agent).toEqual(original);
		expect(agentRepository.saveDraftFenced).not.toHaveBeenCalled();
	});

	it.each([
		{ targetId: 'missing', message: 'not found' },
		{ targetId: '1Cd8YkNm4Rz6Wv3M', message: 'already exists' },
	])(
		'rejects an update to $targetId without overwriting another tool',
		async ({ targetId, message }) => {
			const { service, agentRepository } = makeService();
			const tools = {
				[toolId]: { code: 'return 1;', descriptor },
				'1Cd8YkNm4Rz6Wv3M': {
					code: 'return 2;',
					descriptor: { ...descriptor, name: 'another_tool' },
				},
			};
			const agent = makeAgent({ tools: { ...tools } });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await expect(
				service.buildCustomTool(agentId, projectId, 'return 3;', descriptor, telemetryContext, {
					toolId: targetId,
				}),
			).rejects.toThrow(message);
			expect(agent.tools).toEqual(tools);
			expect(agentRepository.saveDraftFenced).not.toHaveBeenCalled();
		},
	);

	it('deletes a custom tool and removes its config reference', async () => {
		const { service, agentRepository, runtimeCacheService } = makeService();
		const agent = makeAgent({
			tools: {
				tool_keep: { code: 'return 2;', descriptor },
				tool_delete: { code: 'return 1;', descriptor },
			},
			schema: {
				name: 'Support Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Help users',
				tools: [
					{ type: 'custom', id: 'tool_keep' },
					{ type: 'custom', id: 'tool_delete' },
					{
						type: 'node',
						name: 'HTTP',
						node: {
							nodeType: 'n8n-nodes-base.httpRequest',
							nodeTypeVersion: 4,
							nodeParameters: {},
						},
					},
				],
				skills: [],
			},
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		await service.deleteCustomTool(agentId, projectId, 'tool_delete', telemetryContext);

		expect(agent.tools).toEqual({ tool_keep: { code: 'return 2;', descriptor } });
		expect(agent.schema?.tools).toEqual([
			{ type: 'custom', id: 'tool_keep' },
			{
				type: 'node',
				name: 'HTTP',
				node: {
					nodeType: 'n8n-nodes-base.httpRequest',
					nodeTypeVersion: 4,
					nodeParameters: {},
				},
			},
		]);
		expect(agent.versionId).not.toBe(agent.activeVersionId);
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
		expect(agentRepository.saveDraftFenced).toHaveBeenCalledWith(agent, {});
	});

	it('snapshots only configured custom tools', () => {
		const { service } = makeService();
		const tools = {
			tool_keep: { code: 'return 1;', descriptor },
			tool_disabled: { code: 'return 3;', descriptor },
			tool_orphan: { code: 'return 2;', descriptor },
		};

		expect(
			service.snapshotConfiguredTools(
				{
					name: 'Support Agent',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Help users',
					tools: [
						{ type: 'custom', id: 'tool_keep' },
						{ type: 'custom', id: 'tool_disabled', enabled: false },
						{ type: 'custom', id: 'tool_missing', enabled: false },
						{
							type: 'node',
							name: 'HTTP',
							node: {
								nodeType: 'n8n-nodes-base.httpRequest',
								nodeTypeVersion: 4,
								nodeParameters: {},
							},
						},
					],
				},
				tools,
			),
		).toEqual({ tool_keep: tools.tool_keep, tool_disabled: tools.tool_disabled });
	});

	it('throws when publishing a config that references a missing custom tool body', () => {
		const { service } = makeService();

		expect(() =>
			service.snapshotConfiguredTools(
				{
					name: 'Support Agent',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Help users',
					tools: [{ type: 'custom', id: 'tool_missing' }],
				},
				{},
			),
		).toThrow(UserError);
	});

	it('reports custom tool body changes through lifecycle telemetry', async () => {
		const { service, agentRepository, modificationTelemetry } = makeService();
		const agent = makeAgent({ integrations: [] });
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		await service.buildCustomTool(agentId, projectId, 'return 1;', descriptor, telemetryContext);

		expect(modificationTelemetry.record).toHaveBeenCalledWith(
			expect.objectContaining({
				by: 'user',
				changedParts: ['tools'],
				wasUnconfigured: false,
			}),
		);
	});
});

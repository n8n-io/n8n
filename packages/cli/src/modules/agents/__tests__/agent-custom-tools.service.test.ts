import type { EventService } from '@n8n/backend-services';
import { Container } from '@n8n/di';
import type { ToolDescriptor } from '@n8n/agents';
import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'vitest-mock-extended';
import { UserError } from 'n8n-workflow';

import { ConflictError, NotFoundError } from '@n8n/errors';

import type { AgentModificationTelemetryService } from '../agent-modification-telemetry.service';
import { AgentSaveCompletionService } from '../agent-save-completion.service';
import { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import { AgentCustomToolsService } from '../agent-custom-tools.service';
import type { AgentUpdateBroadcaster } from '../agent-update-broadcaster';
import type { ProjectAgent } from '../entities/agent.entity';
import type { AgentRepository } from '../repositories/agent.repository';

const agentId = 'agent-1';
const projectId = 'project-1';
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

function makeAgent(overrides: Partial<ProjectAgent> = {}): ProjectAgent {
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
	} as unknown as ProjectAgent;
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
			id: 'lookup_customer',
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
		const agent = makeAgent({ tools: { lookup_customer: { code: 'return 1;', descriptor } } });
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		const result = await service.buildCustomTool(
			agentId,
			projectId,
			'return 1;',
			descriptor,
			telemetryContext,
		);

		expect(result.changed).toBe(false);
		expect(agentRepository.saveDraftFenced).not.toHaveBeenCalled();
		expect(runtimeCacheService.clearRuntimes).not.toHaveBeenCalled();
	});

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

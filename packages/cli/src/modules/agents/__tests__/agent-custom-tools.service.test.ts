import type { ToolDescriptor } from '@n8n/agents';
import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';
import { UserError } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import { AgentCustomToolsService } from '../agent-custom-tools.service';
import type { Agent } from '../entities/agent.entity';
import type { AgentRepository } from '../repositories/agent.repository';

const agentId = 'agent-1';
const projectId = 'project-1';
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
	agentRepository.save.mockImplementation(async (agent) => agent as Agent);

	const service = new AgentCustomToolsService(mockLogger(), agentRepository, runtimeCacheService);

	return { service, agentRepository, runtimeCacheService };
}

describe('AgentCustomToolsService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('builds and stores a custom tool, marks the draft dirty, and clears runtime cache', async () => {
		const { service, agentRepository, runtimeCacheService } = makeService();
		const agent = makeAgent();
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		const result = await service.buildCustomTool(agentId, projectId, 'return 1;', descriptor);

		expect(result).toEqual({
			ok: true,
			id: 'lookup_customer',
			descriptor,
		});
		expect(agent.tools[result.id]).toEqual({ code: 'return 1;', descriptor });
		expect(agent.versionId).not.toBe(agent.activeVersionId);
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
		expect(agentRepository.save).toHaveBeenCalledWith(agent);
	});

	it('throws when building a tool for a missing agent', async () => {
		const { service, agentRepository, runtimeCacheService } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);

		await expect(
			service.buildCustomTool(agentId, projectId, 'return 1;', descriptor),
		).rejects.toThrow(NotFoundError);
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

		await service.deleteCustomTool(agentId, projectId, 'tool_delete');

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
		expect(agentRepository.save).toHaveBeenCalledWith(agent);
	});

	it('snapshots only configured custom tools', () => {
		const { service } = makeService();
		const tools = {
			tool_keep: { code: 'return 1;', descriptor },
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
		).toEqual({ tool_keep: tools.tool_keep });
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
});

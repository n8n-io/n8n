import type { Agent as RuntimeAgent } from '@n8n/agents';
import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import { OperationalError, UserError } from 'n8n-workflow';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

import type { AgentRuntimeReconstructionService } from '../agent-runtime-reconstruction.service';
import { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import type { Agent } from '../entities/agent.entity';
import type { AgentRepository } from '../repositories/agent.repository';
import type { ToolRegistry } from '../tool-registry';

const agentId = 'agent-1';
const projectId = 'project-1';
const userId = 'user-1';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		id: agentId,
		projectId,
		versionId: 'draft-version',
		activeVersionId: null,
		activeVersion: null,
		schema: { name: 'Draft', model: 'openai:gpt-4o', instructions: 'Help', tools: [], skills: [] },
		tools: {},
		skills: {},
		...overrides,
	} as unknown as Agent;
}

function makeRuntime() {
	return {
		agent: { close: jest.fn().mockResolvedValue(undefined) } as unknown as RuntimeAgent & {
			close: jest.Mock;
		},
		toolRegistry: mock<ToolRegistry>(),
	};
}

function makeService({ multiMain = false }: { multiMain?: boolean } = {}) {
	const agentRepository = mock<AgentRepository>();
	const publisher = mock<Publisher>();
	const reconstructionService = mock<AgentRuntimeReconstructionService>();
	const credentialsService = mock<CredentialsService>();
	const globalConfig = { multiMainSetup: { enabled: multiMain } } as GlobalConfig;

	publisher.publishCommand.mockResolvedValue();

	const service = new AgentRuntimeCacheService(
		mockLogger(),
		agentRepository,
		publisher,
		globalConfig,
		reconstructionService,
		credentialsService,
	);

	return { service, agentRepository, publisher, reconstructionService };
}

describe('AgentRuntimeCacheService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('reconstructs a draft runtime once and reuses the cached instance', async () => {
		const { service, agentRepository, reconstructionService } = makeService();
		const agent = makeAgent();
		const runtime = makeRuntime();

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		reconstructionService.reconstructFromAgentEntity.mockResolvedValue(runtime);

		const first = await service.getRuntime({ agentId, projectId, n8nUserId: userId });
		const second = await service.getRuntime({ agentId, projectId, n8nUserId: userId });

		expect(first).toBe(second);
		expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenCalledTimes(1);
		expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenCalledWith(
			agent,
			expect.anything(),
			userId,
			undefined,
		);
	});

	it('loads published snapshot data and publishedById when running a published runtime', async () => {
		const { service, agentRepository, reconstructionService } = makeService();
		const activeVersion = {
			schema: {
				name: 'Published',
				model: 'openai:gpt-4o',
				instructions: 'Ship',
				tools: [],
				skills: [],
			},
			tools: { tool: { name: 'Tool' } },
			skills: { skill: { name: 'Skill' } },
			publishedById: 'publisher-1',
		};
		const runtime = makeRuntime();

		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({ activeVersion: activeVersion as unknown as Agent['activeVersion'] }),
		);
		reconstructionService.reconstructFromAgentEntity.mockResolvedValue(runtime);

		await service.getRuntime({
			agentId,
			projectId,
			usePublishedVersion: true,
			integrationType: 'slack',
		});

		expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenCalledWith(
			expect.objectContaining({
				schema: activeVersion.schema,
				tools: activeVersion.tools,
				skills: activeVersion.skills,
			}),
			expect.anything(),
			'publisher-1',
			'slack',
		);
	});

	it('rejects missing agents, missing runtime owners, and unpublished runtime requests', async () => {
		const { service, agentRepository } = makeService();

		agentRepository.findByIdAndProjectId.mockResolvedValue(null);
		await expect(service.getRuntime({ agentId, projectId, n8nUserId: userId })).rejects.toThrow(
			`Agent ${agentId} not found`,
		);

		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		await expect(service.getRuntime({ agentId, projectId })).rejects.toThrow(UserError);
		await expect(
			service.getRuntime({ agentId, projectId, usePublishedVersion: true }),
		).rejects.toThrow(OperationalError);
	});

	it('clears matching runtimes, closes them, and broadcasts only when multi-main is enabled', async () => {
		const { service, agentRepository, publisher, reconstructionService } = makeService({
			multiMain: true,
		});
		const runtime = makeRuntime();

		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		reconstructionService.reconstructFromAgentEntity.mockResolvedValue(runtime);
		await service.getRuntime({ agentId, projectId, n8nUserId: userId });

		service.clearRuntimes(agentId);

		expect(runtime.agent.close).toHaveBeenCalled();
		expect(publisher.publishCommand).toHaveBeenCalledWith({
			command: 'agent-config-changed',
			payload: { agentId },
		});
	});

	it('handles peer cache invalidation without rebroadcasting', () => {
		const { service, publisher } = makeService({ multiMain: true });

		service.handleAgentConfigChanged({ agentId });

		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});
});

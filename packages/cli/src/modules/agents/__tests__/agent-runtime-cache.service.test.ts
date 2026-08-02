import type { Mock } from 'vitest';
import type { Agent as RuntimeAgent } from '@n8n/agents';
import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import { OperationalError } from 'n8n-workflow';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

import type { AgentRuntimeReconstructionService } from '../agent-runtime-reconstruction.service';
import { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import type { Agent } from '../entities/agent.entity';
import type { AgentRepository } from '../repositories/agent.repository';
import type { ToolRegistry } from '../tool-registry';

const agentId = 'agent-1';
const projectId = 'project-1';

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
		agent: { close: vi.fn().mockResolvedValue(undefined) } as unknown as RuntimeAgent & {
			close: Mock;
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
		vi.clearAllMocks();
	});

	it('reconstructs a draft runtime once and reuses the cached instance', async () => {
		const { service, agentRepository, reconstructionService } = makeService();
		const agent = makeAgent();
		const runtime = makeRuntime();

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		reconstructionService.reconstructFromAgentEntity.mockResolvedValue(runtime);

		const first = await service.getRuntime({ agentId, projectId });
		const second = await service.getRuntime({ agentId, projectId });

		expect(first).toBe(second);
		expect(first.telemetryConfiguration).toEqual(
			expect.objectContaining({
				model: 'openai:gpt-4o',
				memory_type: 'none',
			}),
		);
		expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenCalledTimes(1);
		expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenCalledWith(
			agent,
			expect.anything(),
			undefined,
			undefined,
		);
	});

	it('keeps draft runtimes separate by integration type', async () => {
		const { service, agentRepository, reconstructionService } = makeService();
		const agent = makeAgent();
		const chatRuntime = makeRuntime();
		const n8nChatRuntime = makeRuntime();

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		reconstructionService.reconstructFromAgentEntity
			.mockResolvedValueOnce(chatRuntime)
			.mockResolvedValueOnce(n8nChatRuntime);

		const first = await service.getRuntime({ agentId, projectId });
		const second = await service.getRuntime({
			agentId,
			projectId,
			integrationType: 'n8n_chat',
		});

		expect(first.agent).toBe(chatRuntime.agent);
		expect(second.agent).toBe(n8nChatRuntime.agent);
		expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenCalledTimes(2);
		expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenNthCalledWith(
			2,
			agent,
			expect.anything(),
			'n8n_chat',
			undefined,
		);
	});

	it('keys draft runtimes by user id so different users get separate runtimes, reused per user', async () => {
		const { service, agentRepository, reconstructionService } = makeService();
		const agent = makeAgent();
		const userARuntime = makeRuntime();
		const userBRuntime = makeRuntime();
		const userA = mock<User>({ id: 'user-a' });
		const userB = mock<User>({ id: 'user-b' });

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		reconstructionService.reconstructFromAgentEntity
			.mockResolvedValueOnce(userARuntime)
			.mockResolvedValueOnce(userBRuntime);

		const forUserA = await service.getRuntime({ agentId, projectId, user: userA });
		const forUserAAgain = await service.getRuntime({ agentId, projectId, user: userA });
		const forUserB = await service.getRuntime({ agentId, projectId, user: userB });

		expect(forUserA.agent).toBe(userARuntime.agent);
		expect(forUserAAgain.agent).toBe(userARuntime.agent);
		expect(forUserB.agent).toBe(userBRuntime.agent);
		expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenCalledTimes(2);
		expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenNthCalledWith(
			1,
			agent,
			expect.anything(),
			undefined,
			userA,
		);
		expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenNthCalledWith(
			2,
			agent,
			expect.anything(),
			undefined,
			userB,
		);
	});

	it('shares an in-flight runtime reconstruction for concurrent cache misses', async () => {
		const { service, agentRepository, reconstructionService } = makeService();
		const agent = makeAgent();
		const runtime = makeRuntime();
		let resolveRuntime: (runtime: ReturnType<typeof makeRuntime>) => void = () => {};
		const pendingRuntime = new Promise<ReturnType<typeof makeRuntime>>((resolve) => {
			resolveRuntime = resolve;
		});

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		reconstructionService.reconstructFromAgentEntity.mockReturnValue(pendingRuntime);

		const first = service.getRuntime({ agentId, projectId });
		const second = service.getRuntime({ agentId, projectId });

		await Promise.resolve();
		expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenCalledTimes(1);

		resolveRuntime(runtime);
		const [firstRuntime, secondRuntime] = await Promise.all([first, second]);

		expect(firstRuntime).toBe(secondRuntime);
		expect(firstRuntime.agent).toBe(runtime.agent);
	});

	it('clears failed in-flight runtime reconstructions so a later request can retry', async () => {
		const { service, agentRepository, reconstructionService } = makeService();
		const agent = makeAgent();
		const runtime = makeRuntime();

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		reconstructionService.reconstructFromAgentEntity
			.mockRejectedValueOnce(new Error('compile failed'))
			.mockResolvedValueOnce(runtime);

		await expect(
			Promise.all([
				service.getRuntime({ agentId, projectId }),
				service.getRuntime({ agentId, projectId }),
			]),
		).rejects.toThrow('compile failed');

		await expect(service.getRuntime({ agentId, projectId })).resolves.toEqual(
			expect.objectContaining({ agent: runtime.agent }),
		);
		expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenCalledTimes(2);
	});

	it('drops invalidated in-flight reconstructions so stale runtimes are not cached', async () => {
		const { service, agentRepository, reconstructionService } = makeService();
		const agent = makeAgent();
		const staleRuntime = makeRuntime();
		const freshRuntime = makeRuntime();
		let resolveStaleRuntime: (runtime: ReturnType<typeof makeRuntime>) => void = () => {};
		const staleRuntimeInitialization = new Promise<ReturnType<typeof makeRuntime>>((resolve) => {
			resolveStaleRuntime = resolve;
		});

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		reconstructionService.reconstructFromAgentEntity
			.mockReturnValueOnce(staleRuntimeInitialization)
			.mockResolvedValueOnce(freshRuntime);

		const staleRequest = service.getRuntime({ agentId, projectId });
		await Promise.resolve();

		service.clearRuntimes(agentId);

		await expect(service.getRuntime({ agentId, projectId })).resolves.toEqual(
			expect.objectContaining({ agent: freshRuntime.agent }),
		);

		resolveStaleRuntime(staleRuntime);
		await expect(staleRequest).rejects.toThrow(
			`Agent ${agentId} runtime initialization was invalidated`,
		);
		expect(staleRuntime.agent.close).toHaveBeenCalled();
		await expect(service.getRuntime({ agentId, projectId })).resolves.toEqual(
			expect.objectContaining({ agent: freshRuntime.agent }),
		);
		expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenCalledTimes(2);
	});

	it('loads published snapshot data when running a published runtime', async () => {
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
			'slack',
			undefined,
		);
	});

	it('rejects missing agents and unpublished runtime requests', async () => {
		const { service, agentRepository } = makeService();

		agentRepository.findByIdAndProjectId.mockResolvedValue(null);
		await expect(service.getRuntime({ agentId, projectId })).rejects.toThrow(
			`Agent ${agentId} not found`,
		);

		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
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
		await service.getRuntime({ agentId, projectId });

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

import type { Mock } from 'vitest';
import type { Agent as RuntimeAgent } from '@n8n/agents';
import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import { OperationalError } from 'n8n-workflow';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

import type { AgentRuntimeReconstructionService } from '../agent-runtime-reconstruction.service';
import { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import type { Agent } from '../entities/agent.entity';
import type { AgentRepository } from '../repositories/agent.repository';
import type { ToolRegistry, ToolRegistryEntry } from '../tool-registry';
import type { WorkflowToolWorkflowLoader } from '../tools/workflow-tool-workflow-loader.service';

const agentId = 'agent-1';
const projectId = 'project-1';
const runtimeCacheTtlMs = 30 * Time.minutes.toMilliseconds;

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

function makeWorkflowRegistry(
	entries: Array<{ toolName: string; workflowId: string; workflowVersionId: string }>,
): ToolRegistry {
	return new Map(
		entries.map(
			({ toolName, workflowId, workflowVersionId }) =>
				[
					toolName,
					{
						kind: 'workflow',
						workflowId,
						workflowName: toolName,
						workflowVersionId,
					},
				] satisfies [string, ToolRegistryEntry],
		),
	);
}

function makeRuntime(toolRegistry: ToolRegistry = new Map()) {
	return {
		agent: { close: vi.fn().mockResolvedValue(undefined) } as unknown as RuntimeAgent & {
			close: Mock;
		},
		toolRegistry,
	};
}

function makeService({ multiMain = false }: { multiMain?: boolean } = {}) {
	const agentRepository = mock<AgentRepository>();
	const publisher = mock<Publisher>();
	const reconstructionService = mock<AgentRuntimeReconstructionService>();
	const credentialsService = mock<CredentialsService>();
	const workflowLoader = mock<WorkflowToolWorkflowLoader>();
	const globalConfig = { multiMainSetup: { enabled: multiMain } } as GlobalConfig;

	publisher.publishCommand.mockResolvedValue();

	const service = new AgentRuntimeCacheService(
		mockLogger(),
		agentRepository,
		publisher,
		globalConfig,
		reconstructionService,
		credentialsService,
		workflowLoader,
	);

	return { service, agentRepository, publisher, reconstructionService, workflowLoader };
}

describe('AgentRuntimeCacheService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('reconstructs a draft runtime once and reuses the cached instance', async () => {
		const { service, agentRepository, reconstructionService, workflowLoader } = makeService();
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
			'test',
			undefined,
			undefined,
		);
		expect(workflowLoader.getPublishedVersionFingerprints).not.toHaveBeenCalled();
	});

	it('reuses a runtime when all workflow fingerprints are unchanged', async () => {
		const { service, agentRepository, reconstructionService, workflowLoader } = makeService();
		const registry = makeWorkflowRegistry([
			{ toolName: 'run-workflow', workflowId: 'workflow-1', workflowVersionId: 'version-1' },
		]);
		const runtime = makeRuntime(registry);

		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		reconstructionService.reconstructFromAgentEntity.mockResolvedValue(runtime);
		workflowLoader.getPublishedVersionFingerprints.mockResolvedValue(
			new Map([['workflow-1', 'version-1']]),
		);

		const first = await service.getRuntime({ agentId, projectId });
		const second = await service.getRuntime({ agentId, projectId });

		expect(first).toBe(second);
		expect(first.workflowVersionFingerprint).toEqual(new Map([['workflow-1', 'version-1']]));
		expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenCalledTimes(1);
		expect(workflowLoader.getPublishedVersionFingerprints).toHaveBeenCalledTimes(2);
		expect(runtime.agent.close).not.toHaveBeenCalled();
	});

	it('closes and rebuilds a runtime when a workflow is republished', async () => {
		const { service, agentRepository, publisher, reconstructionService, workflowLoader } =
			makeService({ multiMain: true });
		const oldRuntime = makeRuntime(
			makeWorkflowRegistry([
				{ toolName: 'run-workflow', workflowId: 'workflow-1', workflowVersionId: 'version-1' },
			]),
		);
		const newRuntime = makeRuntime(
			makeWorkflowRegistry([
				{ toolName: 'run-workflow', workflowId: 'workflow-1', workflowVersionId: 'version-2' },
			]),
		);

		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		reconstructionService.reconstructFromAgentEntity
			.mockResolvedValueOnce(oldRuntime)
			.mockResolvedValueOnce(newRuntime);
		workflowLoader.getPublishedVersionFingerprints
			.mockResolvedValueOnce(new Map([['workflow-1', 'version-1']]))
			.mockResolvedValueOnce(new Map([['workflow-1', 'version-2']]))
			.mockResolvedValueOnce(new Map([['workflow-1', 'version-2']]));

		await service.getRuntime({ agentId, projectId });
		const rebuilt = await service.getRuntime({ agentId, projectId });

		expect(rebuilt.agent).toBe(newRuntime.agent);
		expect(oldRuntime.agent.close).toHaveBeenCalledTimes(1);
		expect(newRuntime.agent.close).not.toHaveBeenCalled();
		expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenCalledTimes(2);
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});

	it('keeps a stale runtime alive until its active lease is released', async () => {
		const { service, agentRepository, reconstructionService, workflowLoader } = makeService();
		const oldRuntime = makeRuntime(
			makeWorkflowRegistry([
				{ toolName: 'run-workflow', workflowId: 'workflow-1', workflowVersionId: 'version-1' },
			]),
		);
		const newRuntime = makeRuntime(
			makeWorkflowRegistry([
				{ toolName: 'run-workflow', workflowId: 'workflow-1', workflowVersionId: 'version-2' },
			]),
		);

		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		reconstructionService.reconstructFromAgentEntity
			.mockResolvedValueOnce(oldRuntime)
			.mockResolvedValueOnce(newRuntime);
		workflowLoader.getPublishedVersionFingerprints
			.mockResolvedValueOnce(new Map([['workflow-1', 'version-1']]))
			.mockResolvedValueOnce(new Map([['workflow-1', 'version-2']]))
			.mockResolvedValueOnce(new Map([['workflow-1', 'version-2']]));

		const oldLease = await service.acquireRuntime({ agentId, projectId });
		const rebuilt = await service.getRuntime({ agentId, projectId });

		expect(rebuilt.agent).toBe(newRuntime.agent);
		expect(oldRuntime.agent.close).not.toHaveBeenCalled();

		oldLease.release();
		oldLease.release();

		expect(oldRuntime.agent.close).toHaveBeenCalledTimes(1);
	});

	it('closes and rebuilds an idle runtime when its cache entry expires', async () => {
		vi.useFakeTimers();
		try {
			const { service, agentRepository, reconstructionService } = makeService();
			const oldRuntime = makeRuntime();
			const newRuntime = makeRuntime();

			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
			reconstructionService.reconstructFromAgentEntity
				.mockResolvedValueOnce(oldRuntime)
				.mockResolvedValueOnce(newRuntime);

			const first = await service.getRuntime({ agentId, projectId });
			await vi.advanceTimersByTimeAsync(runtimeCacheTtlMs + 1);
			const rebuilt = await service.getRuntime({ agentId, projectId });

			expect(first.agent).toBe(oldRuntime.agent);
			expect(rebuilt.agent).toBe(newRuntime.agent);
			expect(oldRuntime.agent.close).toHaveBeenCalledOnce();
			expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenCalledTimes(2);
		} finally {
			vi.useRealTimers();
		}
	});

	it('defers closing an expired runtime until its active lease is released', async () => {
		vi.useFakeTimers();
		try {
			const { service, agentRepository, reconstructionService } = makeService();
			const oldRuntime = makeRuntime();
			const newRuntime = makeRuntime();

			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
			reconstructionService.reconstructFromAgentEntity
				.mockResolvedValueOnce(oldRuntime)
				.mockResolvedValueOnce(newRuntime);

			const oldLease = await service.acquireRuntime({ agentId, projectId });
			await vi.advanceTimersByTimeAsync(runtimeCacheTtlMs + 1);
			const newLease = await service.acquireRuntime({ agentId, projectId });

			expect(newLease.runtime.agent).toBe(newRuntime.agent);
			expect(oldRuntime.agent.close).not.toHaveBeenCalled();

			oldLease.release();
			oldLease.release();

			expect(oldRuntime.agent.close).toHaveBeenCalledOnce();
			newLease.release();
		} finally {
			vi.useRealTimers();
		}
	});

	it('reserves one borrower for every concurrent runtime acquisition', async () => {
		const { service, agentRepository, reconstructionService } = makeService();
		const runtime = makeRuntime();
		let resolveRuntime: (runtime: ReturnType<typeof makeRuntime>) => void = () => {};
		const pendingRuntime = new Promise<ReturnType<typeof makeRuntime>>((resolve) => {
			resolveRuntime = resolve;
		});

		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		reconstructionService.reconstructFromAgentEntity.mockReturnValue(pendingRuntime);

		const first = service.acquireRuntime({ agentId, projectId });
		const second = service.acquireRuntime({ agentId, projectId });
		resolveRuntime(runtime);
		const [firstLease, secondLease] = await Promise.all([first, second]);

		service.clearRuntimes(agentId);
		expect(runtime.agent.close).not.toHaveBeenCalled();

		firstLease.release();
		firstLease.release();
		expect(runtime.agent.close).not.toHaveBeenCalled();

		secondLease.release();
		expect(runtime.agent.close).toHaveBeenCalledTimes(1);
	});

	it('invalidates a runtime when a workflow is no longer published', async () => {
		const { service, agentRepository, reconstructionService, workflowLoader } = makeService();
		const oldRuntime = makeRuntime(
			makeWorkflowRegistry([
				{ toolName: 'run-workflow', workflowId: 'workflow-1', workflowVersionId: 'version-1' },
			]),
		);

		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		reconstructionService.reconstructFromAgentEntity
			.mockResolvedValueOnce(oldRuntime)
			.mockRejectedValueOnce(new Error('workflow unavailable'));
		workflowLoader.getPublishedVersionFingerprints
			.mockResolvedValueOnce(new Map([['workflow-1', 'version-1']]))
			.mockResolvedValueOnce(new Map());

		await service.getRuntime({ agentId, projectId });
		await expect(service.getRuntime({ agentId, projectId })).rejects.toThrow(
			'workflow unavailable',
		);

		expect(oldRuntime.agent.close).toHaveBeenCalledTimes(1);
		expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenCalledTimes(2);
	});

	it('propagates fingerprint lookup failures and leaves the cached runtime available to retry', async () => {
		const { service, agentRepository, reconstructionService, workflowLoader } = makeService();
		const runtime = makeRuntime(
			makeWorkflowRegistry([
				{ toolName: 'run-workflow', workflowId: 'workflow-1', workflowVersionId: 'version-1' },
			]),
		);

		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		reconstructionService.reconstructFromAgentEntity.mockResolvedValue(runtime);
		workflowLoader.getPublishedVersionFingerprints
			.mockResolvedValueOnce(new Map([['workflow-1', 'version-1']]))
			.mockRejectedValueOnce(new Error('database unavailable'))
			.mockResolvedValueOnce(new Map([['workflow-1', 'version-1']]));

		const first = await service.getRuntime({ agentId, projectId });
		await expect(service.getRuntime({ agentId, projectId })).rejects.toThrow(
			'database unavailable',
		);
		const retried = await service.getRuntime({ agentId, projectId });

		expect(retried).toBe(first);
		expect(runtime.agent.close).not.toHaveBeenCalled();
		expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenCalledTimes(1);
	});

	it('checks multiple workflow dependencies in one batch', async () => {
		const { service, agentRepository, reconstructionService, workflowLoader } = makeService();
		const runtime = makeRuntime(
			makeWorkflowRegistry([
				{ toolName: 'run-one', workflowId: 'workflow-1', workflowVersionId: 'version-1' },
				{ toolName: 'run-two', workflowId: 'workflow-2', workflowVersionId: 'version-2' },
			]),
		);

		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		reconstructionService.reconstructFromAgentEntity.mockResolvedValue(runtime);
		workflowLoader.getPublishedVersionFingerprints.mockResolvedValue(
			new Map([
				['workflow-1', 'version-1'],
				['workflow-2', 'version-2'],
			]),
		);

		await service.getRuntime({ agentId, projectId });
		workflowLoader.getPublishedVersionFingerprints.mockClear();
		await service.getRuntime({ agentId, projectId });

		expect(workflowLoader.getPublishedVersionFingerprints).toHaveBeenCalledOnce();
		expect(workflowLoader.getPublishedVersionFingerprints).toHaveBeenCalledWith(projectId, [
			'workflow-1',
			'workflow-2',
		]);
	});

	it('shares one workflow freshness check and rebuild across concurrent stale hits', async () => {
		const { service, agentRepository, reconstructionService, workflowLoader } = makeService();
		const oldRuntime = makeRuntime(
			makeWorkflowRegistry([
				{ toolName: 'run-workflow', workflowId: 'workflow-1', workflowVersionId: 'version-1' },
			]),
		);
		const newRuntime = makeRuntime(
			makeWorkflowRegistry([
				{ toolName: 'run-workflow', workflowId: 'workflow-1', workflowVersionId: 'version-2' },
			]),
		);

		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		reconstructionService.reconstructFromAgentEntity
			.mockResolvedValueOnce(oldRuntime)
			.mockResolvedValueOnce(newRuntime);
		workflowLoader.getPublishedVersionFingerprints
			.mockResolvedValueOnce(new Map([['workflow-1', 'version-1']]))
			.mockResolvedValueOnce(new Map([['workflow-1', 'version-2']]))
			.mockResolvedValueOnce(new Map([['workflow-1', 'version-2']]));

		await service.getRuntime({ agentId, projectId });
		const [first, second] = await Promise.all([
			service.getRuntime({ agentId, projectId }),
			service.getRuntime({ agentId, projectId }),
		]);

		expect(first).toBe(second);
		expect(first.agent).toBe(newRuntime.agent);
		expect(workflowLoader.getPublishedVersionFingerprints).toHaveBeenCalledTimes(3);
		expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenCalledTimes(2);
		expect(oldRuntime.agent.close).toHaveBeenCalledTimes(1);
	});

	it('invalidates a freshness result when runtimes are cleared during its lookup', async () => {
		const { service, agentRepository, reconstructionService, workflowLoader } = makeService();
		const runtime = makeRuntime(
			makeWorkflowRegistry([
				{ toolName: 'run-workflow', workflowId: 'workflow-1', workflowVersionId: 'version-1' },
			]),
		);
		let resolveFingerprint: (fingerprint: ReadonlyMap<string, string>) => void = () => {};
		const pendingFingerprint = new Promise<ReadonlyMap<string, string>>((resolve) => {
			resolveFingerprint = resolve;
		});

		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		reconstructionService.reconstructFromAgentEntity.mockResolvedValue(runtime);
		workflowLoader.getPublishedVersionFingerprints
			.mockResolvedValueOnce(new Map([['workflow-1', 'version-1']]))
			.mockReturnValueOnce(pendingFingerprint);

		await service.getRuntime({ agentId, projectId });
		const pendingRuntime = service.getRuntime({ agentId, projectId });
		await Promise.resolve();
		service.clearRuntimes(agentId);
		resolveFingerprint(new Map([['workflow-1', 'version-1']]));

		await expect(pendingRuntime).rejects.toThrow(
			`Agent ${agentId} runtime initialization was invalidated`,
		);
		expect(runtime.agent.close).toHaveBeenCalledTimes(1);
	});

	it('retries a reconstruction that changes publication version while it is building', async () => {
		const { service, agentRepository, reconstructionService, workflowLoader } = makeService();
		const changingRuntime = makeRuntime(
			makeWorkflowRegistry([
				{ toolName: 'run-workflow', workflowId: 'workflow-1', workflowVersionId: 'version-1' },
			]),
		);
		const stableRuntime = makeRuntime(
			makeWorkflowRegistry([
				{ toolName: 'run-workflow', workflowId: 'workflow-1', workflowVersionId: 'version-2' },
			]),
		);

		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		reconstructionService.reconstructFromAgentEntity
			.mockResolvedValueOnce(changingRuntime)
			.mockResolvedValueOnce(stableRuntime);
		workflowLoader.getPublishedVersionFingerprints.mockResolvedValue(
			new Map([['workflow-1', 'version-2']]),
		);

		const result = await service.getRuntime({ agentId, projectId });

		expect(result.agent).toBe(stableRuntime.agent);
		expect(changingRuntime.agent.close).toHaveBeenCalledTimes(1);
		expect(stableRuntime.agent.close).not.toHaveBeenCalled();
		expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenCalledTimes(2);
		expect(workflowLoader.getPublishedVersionFingerprints).toHaveBeenCalledTimes(2);
	});

	it('closes a reconstructed runtime with conflicting workflow versions', async () => {
		const { service, agentRepository, reconstructionService, workflowLoader } = makeService();
		const runtime = makeRuntime(
			makeWorkflowRegistry([
				{ toolName: 'run-one', workflowId: 'workflow-1', workflowVersionId: 'version-1' },
				{ toolName: 'run-two', workflowId: 'workflow-1', workflowVersionId: 'version-2' },
			]),
		);

		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		reconstructionService.reconstructFromAgentEntity.mockResolvedValue(runtime);

		await expect(service.getRuntime({ agentId, projectId })).rejects.toThrow(
			'conflicting published versions',
		);
		expect(runtime.agent.close).toHaveBeenCalledTimes(1);
		expect(workflowLoader.getPublishedVersionFingerprints).not.toHaveBeenCalled();
	});

	it('closes a reconstructed workflow runtime without a published version fingerprint', async () => {
		const { service, agentRepository, reconstructionService, workflowLoader } = makeService();
		const runtime = makeRuntime(
			new Map([
				[
					'run-workflow',
					{
						kind: 'workflow',
						workflowId: 'workflow-1',
						workflowName: 'Run workflow',
					} satisfies ToolRegistryEntry,
				],
			]),
		);

		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		reconstructionService.reconstructFromAgentEntity.mockResolvedValue(runtime);

		await expect(service.getRuntime({ agentId, projectId })).rejects.toThrow(
			'is missing its published version fingerprint',
		);
		expect(runtime.agent.close).toHaveBeenCalledTimes(1);
		expect(workflowLoader.getPublishedVersionFingerprints).not.toHaveBeenCalled();
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
			'test',
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
			'test',
			undefined,
			userA,
		);
		expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenNthCalledWith(
			2,
			agent,
			expect.anything(),
			'test',
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

	it('keeps draft and published runtimes separate and loads the published snapshot', async () => {
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
		const draftRuntime = makeRuntime();
		const publishedRuntime = makeRuntime();

		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({ activeVersion: activeVersion as unknown as Agent['activeVersion'] }),
		);
		reconstructionService.reconstructFromAgentEntity
			.mockResolvedValueOnce(draftRuntime)
			.mockResolvedValueOnce(publishedRuntime);

		const draft = await service.getRuntime({ agentId, projectId, integrationType: 'slack' });
		const published = await service.getRuntime({
			agentId,
			projectId,
			usePublishedVersion: true,
			integrationType: 'slack',
		});

		expect(draft.agent).toBe(draftRuntime.agent);
		expect(published.agent).toBe(publishedRuntime.agent);
		expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenCalledTimes(2);
		expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				schema: activeVersion.schema,
				tools: activeVersion.tools,
				skills: activeVersion.skills,
			}),
			expect.anything(),
			'production',
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

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
import { hashAgentSandboxPrincipal } from '../agent-sandbox-principal';
import type { AgentSandboxRuntimeService } from '../agent-sandbox-runtime.service';
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

function makeService({
	multiMain = false,
	sandboxEnabled = false,
}: { multiMain?: boolean; sandboxEnabled?: boolean } = {}) {
	const agentRepository = mock<AgentRepository>();
	const publisher = mock<Publisher>();
	const reconstructionService = mock<AgentRuntimeReconstructionService>();
	const credentialsService = mock<CredentialsService>();
	const sandboxRuntimeService = mock<AgentSandboxRuntimeService>({
		isEnabled: () => sandboxEnabled,
	});
	const globalConfig = { multiMainSetup: { enabled: multiMain } } as GlobalConfig;

	publisher.publishCommand.mockResolvedValue();

	const service = new AgentRuntimeCacheService(
		mockLogger(),
		agentRepository,
		publisher,
		globalConfig,
		reconstructionService,
		credentialsService,
		sandboxRuntimeService,
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
			'test',
			undefined,
			undefined,
			undefined,
			'manual',
			undefined,
		);
	});

	it('defers closing an expired runtime until its active lease is released', async () => {
		vi.useFakeTimers();
		try {
			vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
			const { service, agentRepository, reconstructionService } = makeService();
			const expiredRuntime = makeRuntime();
			const freshRuntime = makeRuntime();

			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
			reconstructionService.reconstructFromAgentEntity
				.mockResolvedValueOnce(expiredRuntime)
				.mockResolvedValueOnce(freshRuntime);

			const leasedRuntime = await service.getRuntime({ agentId, projectId });
			vi.setSystemTime(Date.now() + 30 * 60 * 1000 + 1);
			const result = await service.getRuntime({ agentId, projectId });

			expect(expiredRuntime.agent.close).not.toHaveBeenCalled();
			expect(result.agent).toBe(freshRuntime.agent);

			service.releaseRuntimeLease(leasedRuntime.agent);
			expect(expiredRuntime.agent.close).toHaveBeenCalledOnce();
		} finally {
			vi.useRealTimers();
		}
	});

	it('keeps an actively accessed runtime cached past the absolute TTL and still evicts idle ones', async () => {
		vi.useFakeTimers();
		try {
			vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
			const { service, agentRepository, reconstructionService } = makeService();
			const runtime = makeRuntime();
			const rebuiltRuntime = makeRuntime();

			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
			reconstructionService.reconstructFromAgentEntity
				.mockResolvedValueOnce(runtime)
				.mockResolvedValueOnce(rebuiltRuntime);

			await service.getRuntime({ agentId, projectId });

			// Access at t+20min slides the 30min TTL forward.
			vi.setSystemTime(Date.now() + 20 * 60 * 1000);
			await service.getRuntime({ agentId, projectId });

			// t+40min — past the original t+30min deadline, still cached thanks to the slide.
			vi.setSystemTime(Date.now() + 20 * 60 * 1000);
			const stillCached = await service.getRuntime({ agentId, projectId });
			expect(stillCached.agent).toBe(runtime.agent);
			expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenCalledTimes(1);

			// 30min without any access — evicted and reconstructed on next request.
			vi.setSystemTime(Date.now() + 30 * 60 * 1000 + 1);
			const fresh = await service.getRuntime({ agentId, projectId });
			expect(fresh.agent).toBe(rebuiltRuntime.agent);
			expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenCalledTimes(2);
		} finally {
			vi.useRealTimers();
		}
	});

	it('re-checks baked-in tool access after the debounce window and rebuilds when a grant is revoked', async () => {
		vi.useFakeTimers();
		try {
			vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
			const { service, agentRepository, reconstructionService } = makeService();
			const user = mock<User>({ id: 'user-a' });
			const snapshot = { credentialIds: ['cred-1'], workflowIds: ['wf-1'] };
			const originalRuntime = { ...makeRuntime(), userToolAccessSnapshot: snapshot };
			const rebuiltRuntime = makeRuntime();

			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
			reconstructionService.reconstructFromAgentEntity
				.mockResolvedValueOnce(originalRuntime)
				.mockResolvedValueOnce(rebuiltRuntime);
			reconstructionService.userStillHasToolAccess.mockResolvedValue(true);

			const first = await service.getRuntime({ agentId, projectId, user });
			service.releaseRuntimeLease(first.agent);

			// Inside the debounce window: served without any re-check.
			vi.setSystemTime(Date.now() + 30 * 1000);
			const second = await service.getRuntime({ agentId, projectId, user });
			service.releaseRuntimeLease(second.agent);
			expect(second.agent).toBe(originalRuntime.agent);
			expect(reconstructionService.userStillHasToolAccess).not.toHaveBeenCalled();

			// Past the window with grants intact: re-checked, same instance kept.
			vi.setSystemTime(Date.now() + 2 * 60 * 1000);
			const third = await service.getRuntime({ agentId, projectId, user });
			service.releaseRuntimeLease(third.agent);
			expect(reconstructionService.userStillHasToolAccess).toHaveBeenCalledWith(
				snapshot,
				projectId,
				user,
			);
			expect(third.agent).toBe(originalRuntime.agent);

			// Grant revoked: the next re-check retires the runtime and rebuilds it.
			reconstructionService.userStillHasToolAccess.mockResolvedValue(false);
			vi.setSystemTime(Date.now() + 2 * 60 * 1000);
			const fourth = await service.getRuntime({ agentId, projectId, user });

			expect(fourth.agent).toBe(rebuiltRuntime.agent);
			expect(originalRuntime.agent.close).toHaveBeenCalledOnce();
			expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenCalledTimes(2);
		} finally {
			vi.useRealTimers();
		}
	});

	it('keeps the cached runtime when a tool-access re-check fails and retries after the debounce window', async () => {
		vi.useFakeTimers();
		try {
			vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
			const { service, agentRepository, reconstructionService } = makeService();
			const user = mock<User>({ id: 'user-a' });
			const runtime = {
				...makeRuntime(),
				userToolAccessSnapshot: { credentialIds: ['cred-1'], workflowIds: ['wf-1'] },
			};

			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
			reconstructionService.reconstructFromAgentEntity.mockResolvedValue(runtime);
			reconstructionService.userStillHasToolAccess.mockRejectedValue(
				new Error('database unavailable'),
			);

			const initial = await service.getRuntime({ agentId, projectId, user });
			service.releaseRuntimeLease(initial.agent);
			vi.setSystemTime(Date.now() + 2 * 60 * 1000);

			const afterFailedRecheck = await service.getRuntime({ agentId, projectId, user });
			service.releaseRuntimeLease(afterFailedRecheck.agent);

			expect(afterFailedRecheck).toBe(initial);
			expect(afterFailedRecheck.agent).toBe(runtime.agent);
			expect(runtime.agent.close).not.toHaveBeenCalled();
			expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenCalledOnce();

			const withinDebounceWindow = await service.getRuntime({ agentId, projectId, user });
			service.releaseRuntimeLease(withinDebounceWindow.agent);
			expect(reconstructionService.userStillHasToolAccess).toHaveBeenCalledOnce();

			reconstructionService.userStillHasToolAccess.mockResolvedValue(true);
			vi.setSystemTime(Date.now() + 2 * 60 * 1000);
			const afterRetry = await service.getRuntime({ agentId, projectId, user });
			service.releaseRuntimeLease(afterRetry.agent);

			expect(afterRetry).toBe(initial);
			expect(reconstructionService.userStillHasToolAccess).toHaveBeenCalledTimes(2);
			expect(runtime.agent.close).not.toHaveBeenCalled();
			expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenCalledOnce();
		} finally {
			vi.useRealTimers();
		}
	});

	it('shares an in-flight tool-access re-check across concurrent cache hits', async () => {
		vi.useFakeTimers();
		try {
			vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
			const { service, agentRepository, reconstructionService } = makeService();
			const user = mock<User>({ id: 'user-a' });
			const runtime = {
				...makeRuntime(),
				userToolAccessSnapshot: { credentialIds: ['cred-1'], workflowIds: ['wf-1'] },
			};
			let resolveAccessCheck: (stillGranted: boolean) => void = () => {};
			const pendingAccessCheck = new Promise<boolean>((resolve) => {
				resolveAccessCheck = resolve;
			});

			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
			reconstructionService.reconstructFromAgentEntity.mockResolvedValue(runtime);
			reconstructionService.userStillHasToolAccess.mockReturnValue(pendingAccessCheck);

			const initial = await service.getRuntime({ agentId, projectId, user });
			service.releaseRuntimeLease(initial.agent);
			vi.setSystemTime(Date.now() + 2 * 60 * 1000);

			const first = service.getRuntime({ agentId, projectId, user });
			const second = service.getRuntime({ agentId, projectId, user });

			expect(reconstructionService.userStillHasToolAccess).toHaveBeenCalledOnce();
			resolveAccessCheck(true);
			const [firstRuntime, secondRuntime] = await Promise.all([first, second]);

			expect(firstRuntime).toBe(secondRuntime);
			expect(firstRuntime.agent).toBe(runtime.agent);
			service.releaseRuntimeLease(firstRuntime.agent);
			service.releaseRuntimeLease(secondRuntime.agent);
		} finally {
			vi.useRealTimers();
		}
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
			undefined,
			'manual',
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
			undefined,
			'manual',
			undefined,
		);
		expect(reconstructionService.reconstructFromAgentEntity).toHaveBeenNthCalledWith(
			2,
			agent,
			expect.anything(),
			'test',
			undefined,
			userB,
			undefined,
			'manual',
			undefined,
		);
	});

	it('reuses an attached runtime for the same principal and isolates different principals', async () => {
		const { service, agentRepository, reconstructionService } = makeService({
			sandboxEnabled: true,
		});
		const agent = makeAgent();
		const firstRuntime = makeRuntime();
		const secondRuntime = makeRuntime();
		const firstPrincipal = hashAgentSandboxPrincipal({ type: 'n8n-user', userId: 'user-a' });
		const secondPrincipal = hashAgentSandboxPrincipal({ type: 'n8n-user', userId: 'user-b' });

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		reconstructionService.reconstructFromAgentEntity
			.mockResolvedValueOnce(firstRuntime)
			.mockResolvedValueOnce(secondRuntime);

		const first = await service.getRuntime({
			agentId,
			projectId,
			sandboxPrincipalHash: firstPrincipal,
		});
		const repeated = await service.getRuntime({
			agentId,
			projectId,
			sandboxPrincipalHash: firstPrincipal,
		});
		const second = await service.getRuntime({
			agentId,
			projectId,
			sandboxPrincipalHash: secondPrincipal,
		});

		expect(repeated).toBe(first);
		expect(second).not.toBe(first);
		expect(
			reconstructionService.reconstructFromAgentEntity.mock.calls.map((call) => call[7]),
		).toEqual([firstPrincipal, secondPrincipal]);
	});

	it('requires a principal when sandbox workspaces are enabled', async () => {
		const enabled = makeService({ sandboxEnabled: true });
		await expect(enabled.service.getRuntime({ agentId, projectId })).rejects.toThrow(
			'workspace scope is missing',
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
			'production',
			'slack',
			undefined,
			undefined,
			'integrated',
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
		service.releaseRuntimeLease(runtime.agent);

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

import type {
	CommandResult,
	SandboxProvider,
	WorkspaceFilesystem,
	WorkspaceSandbox,
} from '@n8n/agents/sandbox';
import type { Logger } from '@n8n/backend-common';
import type { AgentsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { KnowledgeConsumerScope } from '@/modules/knowledge/knowledge-consumer-scope';
import type { SandboxSettingsService } from '@/services/sandbox-settings.service';

import type { ProjectAgent } from '../entities/agent.entity';
import {
	type AgentSandboxRuntime,
	AgentSandboxRuntimeService,
} from '../agent-sandbox-runtime.service';
import { AgentKnowledgeSandboxProvider } from '../knowledge-sandbox-provider.adapter';
import type { AgentRepository } from '../repositories/agent.repository';

const { createSandboxMock, createFilesystemMock } = vi.hoisted(() => ({
	createSandboxMock: vi.fn(),
	createFilesystemMock: vi.fn(),
}));

vi.mock('@n8n/agents/sandbox', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/agents/sandbox')>()),
	createSandbox: createSandboxMock,
	createFilesystem: createFilesystemMock,
}));

const scope: KnowledgeConsumerScope = { kind: 'agent', projectId: 'project-1', agentId: 'agent-1' };

describe('AgentKnowledgeSandboxProvider', () => {
	describe('delegation', () => {
		let runtimeService: ReturnType<typeof mock<AgentSandboxRuntimeService>>;
		let provider: AgentKnowledgeSandboxProvider;

		beforeEach(() => {
			runtimeService = mock<AgentSandboxRuntimeService>();
			provider = new AgentKnowledgeSandboxProvider(runtimeService);
		});

		it('asserts the sandbox configuration for the project and agent of the scope', () => {
			provider.assertConfiguration(scope);

			expect(runtimeService.assertSandboxConfiguration).toHaveBeenCalledWith(
				'project-1',
				'agent-1',
			);
		});

		it('acquires the knowledge sandbox of the scope and returns the runtime handle untouched', async () => {
			const runtime = mock<AgentSandboxRuntime<SandboxProvider>>({
				provider: 'daytona',
				cacheKey: 'daytona:knowledge:sandbox-1',
			});
			runtimeService.acquireKnowledgeSandbox.mockResolvedValue(runtime);

			await expect(provider.acquire(scope)).resolves.toBe(runtime);
			expect(runtimeService.acquireKnowledgeSandbox).toHaveBeenCalledWith('project-1', 'agent-1');
		});

		it('runs a command in the given sandbox with the given timeout', async () => {
			const sandbox = mock<WorkspaceSandbox>();
			const result = mock<CommandResult>({ exitCode: 0, stdout: 'ok' });
			runtimeService.executeSandboxCommand.mockResolvedValue(result);

			await expect(provider.executeCommand(sandbox, 'cat manifest', 120_000)).resolves.toBe(result);
			expect(runtimeService.executeSandboxCommand).toHaveBeenCalledWith(
				sandbox,
				'cat manifest',
				120_000,
			);
		});

		it('warms the knowledge sandbox of the scope', async () => {
			await provider.warm(scope);

			expect(runtimeService.warmKnowledgeSandbox).toHaveBeenCalledWith('project-1', 'agent-1');
		});

		it('destroys the knowledge sandbox of the scope', async () => {
			await provider.destroy(scope);

			expect(runtimeService.destroyKnowledgeSandbox).toHaveBeenCalledWith('project-1', 'agent-1');
		});
	});

	describe('sandbox identity', () => {
		// The id of (instance-1, project-1, agent-1), pinned so a scope change cannot
		// silently orphan existing knowledge sandboxes.
		const knowledgeSandboxName = 'agent-kb-a54b9053-9f50-51e5-b971-e02942ff7b6b';

		it('derives the same sandbox id from the scope as the runtime derives from the project and agent ids', async () => {
			const agentRepository = mock<AgentRepository>();
			agentRepository.findByIdAndProjectId.mockResolvedValue(
				mock<ProjectAgent>({ id: 'agent-1', projectId: 'project-1' }),
			);
			const sandboxSettingsService = mock<SandboxSettingsService>();
			sandboxSettingsService.isAgentSandboxEnabled.mockReturnValue(true);
			sandboxSettingsService.getProvider.mockReturnValue('daytona');
			sandboxSettingsService.resolveDaytonaSandboxConfig.mockImplementation(
				async (_projectId, options) => ({
					...options,
					daytonaApiUrl: 'https://daytona.example',
					daytonaApiKey: 'test-key',
				}),
			);
			const sandbox = mock<WorkspaceSandbox & Required<Pick<WorkspaceSandbox, '_start'>>>({
				id: knowledgeSandboxName,
				provider: 'daytona',
			});
			sandbox._start.mockResolvedValue();
			createSandboxMock.mockResolvedValue(sandbox);
			createFilesystemMock.mockReturnValue(mock<WorkspaceFilesystem>());

			const provider = new AgentKnowledgeSandboxProvider(
				new AgentSandboxRuntimeService(
					{
						sandboxImage: 'daytonaio/sandbox:0.5.0',
						sandboxSnapshot: '',
						sandboxTimeout: 300_000,
						sandboxEphemeral: false,
						sandboxProvider: '',
					} as AgentsConfig,
					mock<Logger>(),
					mock<InstanceSettings>({ instanceId: 'instance-1' }),
					agentRepository,
					sandboxSettingsService,
				),
			);

			const handle = await provider.acquire(scope);

			expect(createSandboxMock).toHaveBeenCalledWith(
				expect.objectContaining({
					provider: 'daytona',
					id: knowledgeSandboxName,
					name: knowledgeSandboxName,
					labels: {
						'n8n-agents-knowledgebase': 'true',
						'n8n-project-id': 'project-1',
						'n8n-agent-id': 'agent-1',
						'n8n-agent-sandbox-kind': 'knowledge',
					},
				}),
				expect.anything(),
			);
			expect(handle.sandbox).toBe(sandbox);
		});
	});
});

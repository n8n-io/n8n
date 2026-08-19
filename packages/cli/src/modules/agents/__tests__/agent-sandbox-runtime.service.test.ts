import type {
	DaytonaSandboxConfig,
	SandboxProvider,
	WorkspaceFilesystem,
	WorkspaceSandbox,
} from '@n8n/agents/sandbox';
import type { Logger } from '@n8n/backend-common';
import type { AgentsConfig } from '@n8n/config';
import type { AiAssistantClient } from '@n8n_io/ai-assistant-sdk';
import { mock } from 'vitest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { AiService } from '../../../services/ai.service';
import type { SandboxSettingsService } from '../../../services/sandbox-settings.service';

import type { Agent } from '../entities/agent.entity';
import { hashAgentSandboxPrincipal } from '../agent-sandbox-principal';
import { AgentSandboxRuntimeService } from '../agent-sandbox-runtime.service';
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

const instanceId = 'instance-1';
const projectId = 'project-1';
const agentId = 'agent-1';
const principalHash = hashAgentSandboxPrincipal({
	type: 'integration-user',
	connectionId: 'connection/raw:id',
	platform: 'slack',
	platformUserId: 'U/raw:123',
});
const otherPrincipalHash = hashAgentSandboxPrincipal({
	type: 'n8n-user',
	userId: 'user/123:raw',
});
const workspaceSandboxId = 'ed4a5e7b-acf0-5f78-b2b3-8fc4182d3c0c';
const otherWorkspaceSandboxId = '4197eecc-3092-54b8-9196-a4fecccea156';
const knowledgeSandboxId = 'a54b9053-9f50-51e5-b971-e02942ff7b6b';

type TestWorkspaceSandbox = WorkspaceSandbox &
	Required<Pick<WorkspaceSandbox, '_start' | 'destroy' | 'executeCommand'>>;

function makeAiService(overrides: Partial<AiService> = {}): AiService {
	const aiService = mock<AiService>();
	aiService.isProxyEnabled.mockReturnValue(false);
	return Object.assign(aiService, overrides);
}

function makeProxyAiService(): AiService {
	const client = mock<AiAssistantClient>();
	client.getBuilderApiProxyToken.mockResolvedValue({
		accessToken: 'proxy-token',
		tokenType: 'Bearer',
	});
	client.getSandboxProxyBaseUrl.mockReturnValue('https://sandbox-proxy.example');
	return makeAiService({
		isProxyEnabled: vi.fn().mockReturnValue(true),
		getClient: vi.fn().mockResolvedValue(client),
	});
}

function makeAgentRepository(): ReturnType<typeof mock<AgentRepository>> {
	const repository = mock<AgentRepository>();
	repository.findByIdAndProjectId.mockResolvedValue({
		id: agentId,
		projectId,
		activeVersionId: null,
	} as Agent);
	return repository;
}

function makeSandboxSettingsService(
	provider: SandboxProvider = 'daytona',
): ReturnType<typeof mock<SandboxSettingsService>> {
	const service = mock<SandboxSettingsService>();
	service.isAgentSandboxEnabled.mockReturnValue(true);
	service.getProvider.mockReturnValue(provider);
	service.resolveDaytonaConfig.mockResolvedValue({
		apiUrl: 'https://daytona.example',
		apiKey: 'test-key',
	});
	service.resolveN8nSandboxConfig.mockResolvedValue({
		serviceUrl: 'https://sandbox.example',
		apiKey: 'sandbox-key',
	});
	return service;
}

function makeService({
	configOverrides = {},
	logger = mock<Logger>(),
	aiService = makeAiService(),
	instanceSettings = mock<InstanceSettings>({ instanceId }),
	agentRepository = makeAgentRepository(),
	sandboxSettingsService = makeSandboxSettingsService(),
}: {
	configOverrides?: Partial<AgentsConfig>;
	logger?: Logger;
	aiService?: AiService;
	instanceSettings?: InstanceSettings;
	agentRepository?: AgentRepository;
	sandboxSettingsService?: SandboxSettingsService;
} = {}): AgentSandboxRuntimeService {
	return new AgentSandboxRuntimeService(
		{
			sandboxEnabled: true,
			sandboxImage: 'daytonaio/sandbox:0.5.0',
			sandboxSnapshot: '',
			sandboxTimeout: 300_000,
			sandboxEphemeral: false,
			...configOverrides,
		} as AgentsConfig,
		logger,
		aiService,
		instanceSettings,
		agentRepository,
		sandboxSettingsService,
	);
}

function makeSandbox(
	provider: SandboxProvider = 'daytona',
	id = 'sandbox-id',
): ReturnType<typeof mock<TestWorkspaceSandbox>> {
	const sandbox = mock<TestWorkspaceSandbox>({
		id,
		name: provider === 'daytona' ? 'DaytonaSandbox' : 'N8nSandboxServiceSandbox',
		provider,
		status: 'pending',
	});
	sandbox._start.mockResolvedValue();
	sandbox.destroy.mockResolvedValue();
	return sandbox;
}

describe('AgentSandboxRuntimeService', () => {
	let sandbox: ReturnType<typeof mock<TestWorkspaceSandbox>>;

	beforeEach(() => {
		vi.clearAllMocks();
		sandbox = makeSandbox();
		createSandboxMock.mockResolvedValue(sandbox);
		createFilesystemMock.mockReturnValue(mock<WorkspaceFilesystem>());
	});

	it('creates and starts the deterministic direct-mode Daytona knowledge sandbox', async () => {
		const aiService = makeAiService();
		const sandboxSettingsService = makeSandboxSettingsService();
		const service = makeService({
			configOverrides: {
				sandboxSnapshot: 'n8n/agent-knowledge:1.2.3',
				sandboxEphemeral: true,
			},
			aiService,
			sandboxSettingsService,
		});
		const expectedName = `agent-kb-${knowledgeSandboxId}`;

		await service.warmKnowledgeSandbox(projectId, agentId);

		expect(aiService.getClient).not.toHaveBeenCalled();
		expect(sandboxSettingsService.resolveDaytonaConfig).toHaveBeenCalled();
		expect(createSandboxMock).toHaveBeenCalledWith(
			expect.objectContaining({
				enabled: true,
				provider: 'daytona',
				id: expectedName,
				name: expectedName,
				daytonaApiUrl: 'https://daytona.example',
				daytonaApiKey: 'test-key',
				labels: {
					'n8n-agents-knowledgebase': 'true',
					'n8n-project-id': projectId,
					'n8n-agent-id': agentId,
					'n8n-agent-sandbox-kind': 'knowledge',
				},
				timeout: 300_000,
				createTimeoutSeconds: 300,
				image: 'daytonaio/sandbox:0.5.0',
				snapshot: 'n8n/agent-knowledge:1.2.3',
				ephemeral: true,
				autoStopInterval: 15,
				autoArchiveInterval: 60,
			}),
			expect.anything(),
		);
		expect(
			(createSandboxMock.mock.calls[0][0] as DaytonaSandboxConfig).autoDeleteInterval,
		).toBeUndefined();
		expect(sandbox._start).toHaveBeenCalled();
		expect(createFilesystemMock).toHaveBeenCalledWith(sandbox);
	});

	it('single-flights concurrent knowledge acquisition for the same project and agent', async () => {
		let resolveCreation: (value: WorkspaceSandbox) => void;
		createSandboxMock.mockReturnValue(
			new Promise((resolve) => {
				resolveCreation = resolve;
			}),
		);
		const service = makeService();

		const first = service.warmKnowledgeSandbox(projectId, agentId);
		const second = service.warmKnowledgeSandbox(projectId, agentId);
		await vi.waitFor(() => expect(createSandboxMock).toHaveBeenCalledTimes(1));
		resolveCreation!(sandbox);
		await Promise.all([first, second]);
	});

	it('uses deterministic, isolated Daytona identities and labels', async () => {
		const service = makeService();

		await service.acquireWorkspaceSandbox(projectId, agentId, principalHash);
		await service.acquireWorkspaceSandbox(projectId, agentId, otherPrincipalHash);
		await service.acquireKnowledgeSandbox(projectId, agentId);

		const configs = createSandboxMock.mock.calls.map(([config]) => config as DaytonaSandboxConfig);
		expect(configs.map(({ id, name }) => ({ id, name }))).toEqual([
			{
				id: `agent-ws-${workspaceSandboxId}`,
				name: `agent-ws-${workspaceSandboxId}`,
			},
			{
				id: `agent-ws-${otherWorkspaceSandboxId}`,
				name: `agent-ws-${otherWorkspaceSandboxId}`,
			},
			{
				id: `agent-kb-${knowledgeSandboxId}`,
				name: `agent-kb-${knowledgeSandboxId}`,
			},
		]);
		expect(configs[0].labels).toEqual({
			'n8n-project-id': projectId,
			'n8n-agent-id': agentId,
			'n8n-agent-sandbox-kind': 'workspace',
			'n8n-agent-principal-hash': principalHash,
		});
		expect(
			configs.map(({ ephemeral, autoStopInterval, autoArchiveInterval, autoDeleteInterval }) => [
				ephemeral,
				autoStopInterval,
				autoArchiveInterval,
				autoDeleteInterval,
			]),
		).toEqual([
			[true, 5, undefined, undefined],
			[true, 5, undefined, undefined],
			[false, 15, 60, 10_080],
		]);
	});

	it('single-flights the same workspace identity without coalescing different principals', async () => {
		const resolveCreations: Array<(value: WorkspaceSandbox) => void> = [];
		createSandboxMock.mockImplementation(
			async () =>
				await new Promise((resolve) => {
					resolveCreations.push(resolve);
				}),
		);
		const service = makeService();

		const first = service.acquireWorkspaceSandbox(projectId, agentId, principalHash);
		const duplicate = service.acquireWorkspaceSandbox(projectId, agentId, principalHash);
		const distinct = service.acquireWorkspaceSandbox(projectId, agentId, otherPrincipalHash);
		await vi.waitFor(() => expect(createSandboxMock).toHaveBeenCalledTimes(2));
		for (const resolveCreation of resolveCreations) resolveCreation(sandbox);
		await Promise.all([first, duplicate, distinct]);
	});

	it('uses distinct deterministic workspace and knowledge IDs for the n8n sandbox', async () => {
		const service = makeService({
			sandboxSettingsService: makeSandboxSettingsService('n8n-sandbox'),
		});

		await service.acquireWorkspaceSandbox(projectId, agentId, principalHash);
		await service.acquireKnowledgeSandbox(projectId, agentId);

		expect(createSandboxMock.mock.calls.map(([config]) => config.id)).toEqual([
			workspaceSandboxId,
			knowledgeSandboxId,
		]);
		expect(createSandboxMock.mock.calls[1][0]).toEqual(
			expect.objectContaining({
				provider: 'n8n-sandbox',
				serviceUrl: 'https://sandbox.example',
				apiKey: 'sandbox-key',
			}),
		);
	});

	it('reports how to configure a missing n8n sandbox service URL', async () => {
		const settingsService = makeSandboxSettingsService('n8n-sandbox');
		settingsService.resolveN8nSandboxConfig.mockResolvedValue({});
		const service = makeService({ sandboxSettingsService: settingsService });

		await expect(service.warmKnowledgeSandbox(projectId, agentId)).rejects.toThrow(
			/N8N_SANDBOX_SERVICE_URL/,
		);
		expect(createSandboxMock).not.toHaveBeenCalled();
	});

	it('mints refreshable proxy tokens on demand with project scope', async () => {
		const client = mock<AiAssistantClient>();
		client.getBuilderApiProxyToken
			.mockResolvedValueOnce({ accessToken: 'proxy-token-1', tokenType: 'Bearer' })
			.mockResolvedValueOnce({ accessToken: 'proxy-token-2', tokenType: 'Bearer' });
		client.getSandboxProxyBaseUrl.mockReturnValue('https://sandbox-proxy.example');
		const aiService = makeAiService({
			isProxyEnabled: vi.fn().mockReturnValue(true),
			getClient: vi.fn().mockResolvedValue(client),
		});
		const service = makeService({
			configOverrides: { sandboxSnapshot: 'n8n/agent-knowledge:1.2.3' },
			aiService,
		});

		await service.warmKnowledgeSandbox(projectId, agentId);

		const config = createSandboxMock.mock.calls[0][0] as DaytonaSandboxConfig;
		expect(config.daytonaApiUrl).toBe('https://sandbox-proxy.example');
		expect(config.snapshot).toBe('n8n/agent-knowledge:1.2.3');
		expect(config.image).toBeUndefined();
		expect(client.getBuilderApiProxyToken).not.toHaveBeenCalled();

		await expect(config.getAuthToken?.()).resolves.toBe('proxy-token-1');
		await expect(config.getAuthToken?.()).resolves.toBe('proxy-token-2');
		expect(client.getBuilderApiProxyToken).toHaveBeenCalledTimes(2);
		expect(client.getBuilderApiProxyToken.mock.calls[0][0]).toEqual({ id: projectId });
		expect(client.getBuilderApiProxyToken.mock.calls[1][0]).toEqual({ id: projectId });
	});

	it('requires a proxy snapshot instead of creating from an image', async () => {
		const service = makeService({
			configOverrides: { sandboxSnapshot: '' },
			aiService: makeProxyAiService(),
		});

		await expect(service.warmKnowledgeSandbox(projectId, agentId)).rejects.toThrow(
			/requires a snapshot.*N8N_AGENTS_AI_SANDBOX_SNAPSHOT/s,
		);
		expect(createSandboxMock).not.toHaveBeenCalled();
	});

	it('surfaces a snapshot failure without falling back to an image', async () => {
		createSandboxMock.mockRejectedValueOnce(new Error('snapshot missing'));
		const service = makeService({
			configOverrides: { sandboxSnapshot: 'n8n/agent-knowledge:missing' },
			aiService: makeProxyAiService(),
		});

		await expect(service.warmKnowledgeSandbox(projectId, agentId)).rejects.toThrow(
			'snapshot missing',
		);
		const config = createSandboxMock.mock.calls[0][0] as DaytonaSandboxConfig;
		expect(config.snapshot).toBe('n8n/agent-knowledge:missing');
		expect(config.image).toBeUndefined();
	});

	it('best-effort destroys workspace and knowledge sandboxes by only their exact identities', async () => {
		const destroyedIds: string[] = [];
		createSandboxMock.mockImplementation(async (config) => {
			const target = makeSandbox(config.provider, config.id);
			target.destroy.mockImplementation(async () => {
				destroyedIds.push(config.id);
				if (config.id === `agent-kb-${knowledgeSandboxId}`) {
					throw new Error('remote unavailable');
				}
			});
			return target;
		});
		const service = makeService();

		await service.destroyWorkspaceSandbox(projectId, agentId, principalHash);
		await service.destroyKnowledgeSandbox(projectId, agentId);

		expect(destroyedIds).toEqual([
			`agent-ws-${workspaceSandboxId}`,
			workspaceSandboxId,
			`agent-kb-${knowledgeSandboxId}`,
			knowledgeSandboxId,
		]);
	});
});

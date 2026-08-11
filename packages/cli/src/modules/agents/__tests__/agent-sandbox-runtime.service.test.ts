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
import {
	AGENT_KNOWLEDGE_SANDBOX_NAME_PREFIX,
	AgentSandboxRuntimeService,
} from '../agent-sandbox-runtime.service';
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

type TestWorkspaceSandbox = WorkspaceSandbox &
	Required<Pick<WorkspaceSandbox, '_start' | 'destroy' | 'executeCommand'>>;

function buildExpectedSandboxName(): string {
	return `${AGENT_KNOWLEDGE_SANDBOX_NAME_PREFIX}${instanceId}-${projectId}-${agentId}`.toLowerCase();
}

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

	it('creates and starts a persistent deterministic direct-mode Daytona sandbox', async () => {
		const aiService = makeAiService();
		const sandboxSettingsService = makeSandboxSettingsService();
		const service = makeService({
			configOverrides: {
				sandboxSnapshot: 'n8n/agent-knowledge:1.2.3',
			},
			aiService,
			sandboxSettingsService,
		});
		const expectedName = buildExpectedSandboxName();

		await service.warmSandbox(projectId, agentId);

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
				},
				timeout: 300_000,
				createTimeoutSeconds: 300,
				image: 'daytonaio/sandbox:0.5.0',
				snapshot: 'n8n/agent-knowledge:1.2.3',
				ephemeral: false,
				autoStopInterval: 5,
			}),
			expect.anything(),
		);
		expect(sandbox._start).toHaveBeenCalled();
		expect(createFilesystemMock).toHaveBeenCalledWith(sandbox);
	});

	it('single-flights concurrent acquisition for the same project and agent', async () => {
		let resolveCreation: (value: WorkspaceSandbox) => void;
		createSandboxMock.mockReturnValue(
			new Promise((resolve) => {
				resolveCreation = resolve;
			}),
		);
		const service = makeService();

		const first = service.warmSandbox(projectId, agentId);
		const second = service.warmSandbox(projectId, agentId);
		await vi.waitFor(() => expect(createSandboxMock).toHaveBeenCalledTimes(1));
		resolveCreation!(sandbox);
		await Promise.all([first, second]);
	});

	it('uses a stable UUID for the n8n sandbox', async () => {
		const expectedId = 'eaa9416e-fd18-5dd5-bb92-5e8fc51eb5d0';
		const service = makeService({
			sandboxSettingsService: makeSandboxSettingsService('n8n-sandbox'),
		});

		await service.warmSandbox(projectId, agentId);

		expect(createSandboxMock).toHaveBeenCalledWith(
			expect.objectContaining({
				provider: 'n8n-sandbox',
				id: expectedId,
				serviceUrl: 'https://sandbox.example',
				apiKey: 'sandbox-key',
			}),
			expect.anything(),
		);
	});

	it('reports how to configure a missing n8n sandbox service URL', async () => {
		const settingsService = makeSandboxSettingsService('n8n-sandbox');
		settingsService.resolveN8nSandboxConfig.mockResolvedValue({});
		const service = makeService({ sandboxSettingsService: settingsService });

		await expect(service.warmSandbox(projectId, agentId)).rejects.toThrow(
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

		await service.warmSandbox(projectId, agentId);

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

		await expect(service.warmSandbox(projectId, agentId)).rejects.toThrow(
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

		await expect(service.warmSandbox(projectId, agentId)).rejects.toThrow('snapshot missing');
		const config = createSandboxMock.mock.calls[0][0] as DaytonaSandboxConfig;
		expect(config.snapshot).toBe('n8n/agent-knowledge:missing');
		expect(config.image).toBeUndefined();
	});

	it('best-effort destroys both provider sandboxes by their deterministic identities', async () => {
		const daytonaSandbox = makeSandbox('daytona', buildExpectedSandboxName());
		daytonaSandbox.destroy.mockRejectedValue(new Error('remote unavailable'));
		const n8nSandbox = makeSandbox('n8n-sandbox', 'eaa9416e-fd18-5dd5-bb92-5e8fc51eb5d0');
		createSandboxMock.mockImplementation(async (config) =>
			config.provider === 'daytona' ? daytonaSandbox : n8nSandbox,
		);
		const service = makeService({ configOverrides: { sandboxEnabled: false } });

		await service.destroySandbox(projectId, agentId);

		expect(createSandboxMock).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				provider: 'daytona',
				id: buildExpectedSandboxName(),
				name: buildExpectedSandboxName(),
			}),
			expect.anything(),
		);
		expect(createSandboxMock).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				provider: 'n8n-sandbox',
				id: 'eaa9416e-fd18-5dd5-bb92-5e8fc51eb5d0',
			}),
			expect.anything(),
		);
		expect(daytonaSandbox.destroy).toHaveBeenCalled();
		expect(n8nSandbox.destroy).toHaveBeenCalled();
	});
});

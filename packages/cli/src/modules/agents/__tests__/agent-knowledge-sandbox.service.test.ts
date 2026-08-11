import type { Mocked } from 'vitest';
import type {
	CommandResult,
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

import type { AgentKnowledgeFileStore } from '../agent-knowledge-file-store';
import type { Agent } from '../entities/agent.entity';
import type { AgentFile } from '../entities/agent-file.entity';
import { getAgentKnowledgePaths } from '../agent-knowledge-storage';
import {
	AGENT_KNOWLEDGE_SANDBOX_NAME_PREFIX,
	AgentKnowledgeSandboxService,
} from '../agent-knowledge-sandbox.service';
import type { AgentFileRepository } from '../repositories/agent-file.repository';
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
const knowledgePaths = getAgentKnowledgePaths('daytona');
const n8nKnowledgePaths = getAgentKnowledgePaths('n8n-sandbox');

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
	// Unpublished on purpose: the knowledge sandbox must not require a published version.
	repository.findByIdAndProjectId.mockResolvedValue({
		id: agentId,
		projectId,
		activeVersionId: null,
	} as Agent);
	return repository;
}

function makeKnowledgeFileStore(): Mocked<AgentKnowledgeFileStore> {
	const store = mock<AgentKnowledgeFileStore>();
	store.readAsBuffer.mockResolvedValue(Buffer.from('mock file content'));
	return store;
}

function makeSandboxSettingsService(
	provider: SandboxProvider = 'daytona',
): Mocked<SandboxSettingsService> {
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
	agentFileRepository = mock<AgentFileRepository>(),
	agentRepository = makeAgentRepository(),
	agentKnowledgeFileStore = makeKnowledgeFileStore(),
	sandboxSettingsService = makeSandboxSettingsService(),
}: {
	configOverrides?: Partial<AgentsConfig>;
	logger?: Logger;
	aiService?: AiService;
	instanceSettings?: InstanceSettings;
	agentFileRepository?: AgentFileRepository;
	agentRepository?: AgentRepository;
	agentKnowledgeFileStore?: AgentKnowledgeFileStore;
	sandboxSettingsService?: SandboxSettingsService;
} = {}): AgentKnowledgeSandboxService {
	return new AgentKnowledgeSandboxService(
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
		agentFileRepository,
		agentRepository,
		agentKnowledgeFileStore,
		sandboxSettingsService,
	);
}

function makeAgentFile(overrides: Partial<AgentFile> = {}): AgentFile {
	const id = overrides.id ?? 'file-id';
	const fileName = overrides.fileName ?? 'file.txt';
	return {
		id,
		agentId,
		storedAt: 'fs',
		storageKey: `agents/${agentId}/knowledge-files/${id}/content`,
		fileName,
		mimeType: 'text/plain',
		fileSizeBytes: 100,
		createdAt: new Date('2024-01-01T00:00:00.000Z'),
		updatedAt: new Date('2024-01-01T00:00:00.000Z'),
		...overrides,
	} as AgentFile;
}

function makeFilesystem(): Mocked<WorkspaceFilesystem> {
	return mock<WorkspaceFilesystem>();
}

function makeSandbox(
	provider: SandboxProvider = 'daytona',
	id = 'sandbox-id',
): Mocked<TestWorkspaceSandbox> {
	const sandbox = mock<TestWorkspaceSandbox>({
		id,
		name: provider === 'daytona' ? 'DaytonaSandbox' : 'N8nSandboxServiceSandbox',
		provider,
		status: 'pending',
	});
	sandbox._start.mockResolvedValue();
	sandbox.destroy.mockResolvedValue();
	sandbox.executeCommand.mockResolvedValue({
		success: true,
		exitCode: 0,
		stdout: '',
		stderr: '',
		executionTimeMs: 1,
	});
	return sandbox;
}

function makeCommandResult(stdout = '', stderr = '', exitCode = 0): CommandResult {
	return {
		success: exitCode === 0,
		exitCode,
		stdout,
		stderr,
		executionTimeMs: 1,
	};
}

describe('AgentKnowledgeSandboxService', () => {
	let sandbox: Mocked<TestWorkspaceSandbox>;
	let filesystem: Mocked<WorkspaceFilesystem>;

	beforeEach(() => {
		vi.clearAllMocks();
		sandbox = makeSandbox();
		filesystem = makeFilesystem();
		createSandboxMock.mockResolvedValue(sandbox);
		createFilesystemMock.mockReturnValue(filesystem);
	});

	it('creates and starts a deterministic direct-mode Daytona sandbox', async () => {
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
				ephemeral: true,
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

	it('fails with an actionable error instead of creating from an image when the proxy is enabled', async () => {
		const service = makeService({
			configOverrides: { sandboxSnapshot: '' },
			aiService: makeProxyAiService(),
		});

		await expect(service.warmSandbox(projectId, agentId)).rejects.toThrow(
			/requires a snapshot.*N8N_AGENTS_AI_SANDBOX_SNAPSHOT/s,
		);
		expect(createSandboxMock).not.toHaveBeenCalled();
	});

	it('surfaces the snapshot failure instead of falling back to an image when the proxy is enabled', async () => {
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

	describe('globKnowledgeFiles', () => {
		const fixtureFiles = [
			makeAgentFile({ id: 'file-alpha', fileName: 'alpha.pdf' }),
			makeAgentFile({ id: 'file-bravo', fileName: 'bravo.pdf' }),
			makeAgentFile({ id: 'file-charlie', fileName: 'charlie.txt' }),
			makeAgentFile({ id: 'file-delta', fileName: 'delta.md' }),
		];

		function makeGlobService(): AgentKnowledgeSandboxService {
			const agentFileRepository = mock<AgentFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue(fixtureFiles);
			const agentRepository = mock<AgentRepository>();
			agentRepository.existsBy.mockResolvedValue(true);
			return makeService({
				agentFileRepository,
				agentRepository,
			});
		}

		it('lists all files with a catch-all pattern, sorted by display name', async () => {
			const service = makeGlobService();

			const result = await service.globKnowledgeFiles(projectId, agentId, { pattern: '*' });

			expect(result.files.map((file) => file.displayName)).toEqual([
				'alpha.pdf',
				'bravo.pdf',
				'charlie.txt',
				'delta.md',
			]);
			expect(result.hasMore).toBe(false);
		});

		it('filters by extension pattern', async () => {
			const service = makeGlobService();

			const result = await service.globKnowledgeFiles(projectId, agentId, { pattern: '*.pdf' });

			expect(result.files.map((file) => file.displayName)).toEqual(['alpha.pdf', 'bravo.pdf']);
		});

		it('pages with offset', async () => {
			const service = makeGlobService();

			const firstPage = await service.globKnowledgeFiles(projectId, agentId, {
				pattern: '*',
				limit: 2,
				offset: 0,
			});
			expect(firstPage.files.map((file) => file.displayName)).toEqual(['alpha.pdf', 'bravo.pdf']);
			expect(firstPage.offset).toBe(0);
			expect(firstPage.hasMore).toBe(true);

			const secondPage = await service.globKnowledgeFiles(projectId, agentId, {
				pattern: '*',
				limit: 2,
				offset: 2,
			});
			expect(secondPage.files.map((file) => file.displayName)).toEqual(['charlie.txt', 'delta.md']);
			expect(secondPage.offset).toBe(2);
			expect(secondPage.hasMore).toBe(false);
		});

		it('still rejects unsafe patterns', async () => {
			const service = makeGlobService();

			await expect(
				service.globKnowledgeFiles(projectId, agentId, { pattern: '../secrets' }),
			).rejects.toThrow('Invalid knowledge file pattern');
		});
	});

	describe('destroySandbox', () => {
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

	describe('mirror sync', () => {
		function isManifestReadCommand(command: string): boolean {
			return command.startsWith('cat ') && command.includes('/manifest');
		}

		function isMirrorSyncCommand(command: string): boolean {
			return command.includes(`mkdir -p ${knowledgePaths.filesDir}`);
		}

		function makeMirrorFile(id: string, fileName: string): AgentFile {
			return makeAgentFile({ id, fileName });
		}

		it('syncs once, checks an unchanged repeat, and recopies a replaced file', async () => {
			let manifestState = '';
			sandbox.executeCommand.mockImplementation(async (command) =>
				makeCommandResult(isManifestReadCommand(command) ? manifestState : ''),
			);
			const agentFileRepository = mock<AgentFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue([
				makeMirrorFile('file-1', 'doc1.txt'),
				makeMirrorFile('file-2', 'doc2.txt'),
			]);
			const agentRepository = makeAgentRepository();
			agentRepository.existsBy.mockResolvedValue(true);
			const agentKnowledgeFileStore = makeKnowledgeFileStore();
			const service = makeService({
				agentFileRepository,
				agentRepository,
				agentKnowledgeFileStore,
			});

			await service.searchKnowledge(projectId, agentId, { pattern: 'foo' });
			let commands = sandbox.executeCommand.mock.calls.map(([command]) => command);
			expect(commands.filter(isManifestReadCommand)).toHaveLength(1);
			expect(commands.filter(isMirrorSyncCommand)).toHaveLength(1);
			expect(agentKnowledgeFileStore.readAsBuffer).toHaveBeenCalledTimes(2);
			const stagingDir = filesystem.mkdir.mock.calls[0][0];
			expect(stagingDir).toContain(`${knowledgePaths.stagingDir}/`);
			expect(filesystem.mkdir).toHaveBeenCalledWith(stagingDir, {
				recursive: true,
			});
			expect(filesystem.writeFile).toHaveBeenCalledTimes(2);
			expect(filesystem.writeFile.mock.calls[0][0]).toBe(`${stagingDir}/doc1.txt`);
			expect(filesystem.writeFile.mock.calls[1][0]).toBe(`${stagingDir}/doc2.txt`);
			expect(filesystem.writeFile.mock.invocationCallOrder[1]).toBeLessThan(
				sandbox.executeCommand.mock.invocationCallOrder[1],
			);
			expect(filesystem.rmdir).toHaveBeenCalledWith(stagingDir, {
				recursive: true,
				force: true,
			});
			manifestState = 'file-1\tdoc1.txt\nfile-2\tdoc2.txt\n';

			sandbox.executeCommand.mockClear();
			agentKnowledgeFileStore.readAsBuffer.mockClear();
			filesystem.writeFile.mockClear();
			await service.searchKnowledge(projectId, agentId, { pattern: 'bar' });
			commands = sandbox.executeCommand.mock.calls.map(([command]) => command);
			expect(commands.filter(isManifestReadCommand)).toHaveLength(1);
			expect(commands.filter(isMirrorSyncCommand)).toHaveLength(0);
			expect(agentKnowledgeFileStore.readAsBuffer).not.toHaveBeenCalled();
			expect(filesystem.writeFile).not.toHaveBeenCalled();

			sandbox.executeCommand.mockClear();
			agentKnowledgeFileStore.readAsBuffer.mockClear();
			filesystem.writeFile.mockClear();
			agentFileRepository.findByAgentId.mockResolvedValue([
				makeMirrorFile('file-1-replacement', 'doc1.txt'),
				makeMirrorFile('file-2', 'doc2.txt'),
			]);
			await service.searchKnowledge(projectId, agentId, { pattern: 'baz' });
			commands = sandbox.executeCommand.mock.calls.map(([command]) => command);
			expect(commands.filter(isManifestReadCommand)).toHaveLength(1);
			const syncCommands = commands.filter(isMirrorSyncCommand);
			expect(syncCommands).toHaveLength(1);
			expect(agentKnowledgeFileStore.readAsBuffer).toHaveBeenCalledTimes(1);
			expect(syncCommands[0]).toContain(`${knowledgePaths.stagingDir}/`);
			expect(syncCommands[0]).toContain('/doc1.txt');
			expect(syncCommands[0]).toContain('file-1-replacement\tdoc1.txt');
		});

		it('runs a queued mirror sync with a newer file snapshot after an in-flight sync', async () => {
			let releaseFirstManifestRead!: () => void;
			const firstManifestRead = new Promise<void>((resolve) => {
				releaseFirstManifestRead = resolve;
			});
			let blockManifestRead = true;
			sandbox.executeCommand.mockImplementation(async (command) => {
				if (isManifestReadCommand(command) && blockManifestRead) {
					blockManifestRead = false;
					await firstManifestRead;
				}
				return makeCommandResult();
			});
			const agentFileRepository = mock<AgentFileRepository>();
			agentFileRepository.findByAgentId
				.mockResolvedValueOnce([makeMirrorFile('file-1', 'doc1.txt')])
				.mockResolvedValueOnce([
					makeMirrorFile('file-1', 'doc1.txt'),
					makeMirrorFile('file-2', 'doc2.txt'),
				]);
			const agentRepository = makeAgentRepository();
			agentRepository.existsBy.mockResolvedValue(true);
			const service = makeService({
				agentFileRepository,
				agentRepository,
			});

			const firstSearch = service.searchKnowledge(projectId, agentId, { pattern: 'first' });
			await vi.waitFor(() =>
				expect(
					sandbox.executeCommand.mock.calls.filter(([command]) => isManifestReadCommand(command)),
				).toHaveLength(1),
			);

			const secondSearch = service.searchKnowledge(projectId, agentId, { pattern: 'second' });
			await vi.waitFor(() => expect(createFilesystemMock).toHaveBeenCalledTimes(2));
			await new Promise((resolve) => setTimeout(resolve, 0));
			releaseFirstManifestRead();

			await Promise.all([firstSearch, secondSearch]);

			expect(filesystem.writeFile.mock.calls.map(([filePath]) => filePath)).toContainEqual(
				expect.stringMatching(/\/doc2\.txt$/),
			);
		});

		it('uses the n8n sandbox home for the knowledge mirror', async () => {
			sandbox = makeSandbox('n8n-sandbox', 'n8n-sandbox-id');
			createSandboxMock.mockResolvedValue(sandbox);
			const agentFileRepository = mock<AgentFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
			const agentRepository = makeAgentRepository();
			agentRepository.existsBy.mockResolvedValue(true);
			const service = makeService({
				aiService: makeProxyAiService(),
				agentFileRepository,
				agentRepository,
				sandboxSettingsService: makeSandboxSettingsService('n8n-sandbox'),
			});

			await service.searchKnowledge(projectId, agentId, { pattern: 'foo' });

			expect(filesystem.mkdir.mock.calls[0][0]).toContain(`${n8nKnowledgePaths.stagingDir}/`);
			expect(filesystem.mkdir).toHaveBeenCalledWith(filesystem.mkdir.mock.calls[0][0], {
				recursive: true,
			});
			const searchCall = sandbox.executeCommand.mock.calls.find(([command]) =>
				command.includes(' rg '),
			);
			expect(searchCall?.[0]).toContain(`cd '\\''${n8nKnowledgePaths.filesDir}'\\''`);
		});

		it.each([
			{ provider: 'daytona', deterministicId: buildExpectedSandboxName() },
			{
				provider: 'n8n-sandbox',
				deterministicId: 'eaa9416e-fd18-5dd5-bb92-5e8fc51eb5d0',
			},
		] satisfies Array<{ provider: SandboxProvider; deterministicId: string }>)(
			'resyncs the mirror when a $provider sandbox is recreated under the same ID',
			async ({ provider, deterministicId }) => {
				const staleSandbox = makeSandbox(provider, deterministicId);
				const replacementSandbox = makeSandbox(provider, deterministicId);
				const staleFilesystem = makeFilesystem();
				const replacementFilesystem = makeFilesystem();
				createSandboxMock
					.mockResolvedValueOnce(staleSandbox)
					.mockResolvedValueOnce(replacementSandbox);
				createFilesystemMock
					.mockReturnValueOnce(staleFilesystem)
					.mockReturnValueOnce(replacementFilesystem);
				const agentFileRepository = mock<AgentFileRepository>();
				agentFileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
				const agentRepository = makeAgentRepository();
				agentRepository.existsBy.mockResolvedValue(true);
				const service = makeService({
					agentFileRepository,
					agentRepository,
					sandboxSettingsService: makeSandboxSettingsService(provider),
				});

				await service.searchKnowledge(projectId, agentId, { pattern: 'first' });
				await service.searchKnowledge(projectId, agentId, { pattern: 'second' });

				expect(staleFilesystem.writeFile).toHaveBeenCalledOnce();
				expect(replacementFilesystem.writeFile).toHaveBeenCalledOnce();
			},
		);

		it('redacts command stderr before reporting a failed knowledge operation', async () => {
			const secret = 'Authorization: Bearer abc.def-ghi_jkl/mno=012345678901234567890123456789';
			sandbox.executeCommand.mockImplementation(async (command) =>
				command.includes(' rg ')
					? makeCommandResult('', `failed with ${secret}`, 2)
					: makeCommandResult(),
			);
			const agentFileRepository = mock<AgentFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
			const agentRepository = makeAgentRepository();
			agentRepository.existsBy.mockResolvedValue(true);
			const service = makeService({
				agentFileRepository,
				agentRepository,
			});

			const error = await service
				.searchKnowledge(projectId, agentId, { pattern: 'foo' })
				.then(() => undefined)
				.catch((cause: Error) => cause);

			expect(error?.message).toContain('[REDACTED]');
			expect(error?.message).not.toContain('abc.def');
		});

		it('propagates filesystem write failures instead of finalizing a partial mirror', async () => {
			const providerError = new Error('provider write failed');
			filesystem.writeFile.mockRejectedValue(providerError);
			const agentFileRepository = mock<AgentFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
			const agentRepository = makeAgentRepository();
			agentRepository.existsBy.mockResolvedValue(true);
			const service = makeService({
				agentFileRepository,
				agentRepository,
			});

			await expect(service.searchKnowledge(projectId, agentId, { pattern: 'foo' })).rejects.toBe(
				providerError,
			);
			expect(
				sandbox.executeCommand.mock.calls.some(([command]) => isMirrorSyncCommand(command)),
			).toBe(false);
			expect(filesystem.rmdir).toHaveBeenCalledWith(filesystem.mkdir.mock.calls[0][0], {
				recursive: true,
				force: true,
			});
		});

		it('fails the operation instead of returning stale results when the sync command errors', async () => {
			sandbox.executeCommand.mockImplementation(async (command) =>
				isMirrorSyncCommand(command) ? makeCommandResult('', 'disk full', 1) : makeCommandResult(),
			);
			const agentFileRepository = mock<AgentFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
			const agentRepository = makeAgentRepository();
			agentRepository.existsBy.mockResolvedValue(true);
			const service = makeService({
				agentFileRepository,
				agentRepository,
			});

			await expect(service.searchKnowledge(projectId, agentId, { pattern: 'foo' })).rejects.toThrow(
				/Agent knowledge mirror sync failed/,
			);
		});

		it('skips a file that fails to load from the knowledge file store and retries it next sync', async () => {
			sandbox.executeCommand.mockResolvedValue(makeCommandResult());
			const agentFileRepository = mock<AgentFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
			const agentRepository = makeAgentRepository();
			agentRepository.existsBy.mockResolvedValue(true);
			const agentKnowledgeFileStore = makeKnowledgeFileStore();
			agentKnowledgeFileStore.readAsBuffer.mockRejectedValueOnce(new Error('missing on disk'));
			const logger = mock<Logger>();
			const service = makeService({
				logger,
				agentFileRepository,
				agentRepository,
				agentKnowledgeFileStore,
			});

			await expect(
				service.searchKnowledge(projectId, agentId, { pattern: 'foo' }),
			).resolves.toBeDefined();

			expect(filesystem.writeFile).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to load agent knowledge file for mirror sync',
				expect.objectContaining({ file: 'doc1.txt' }),
			);

			// The failed file remains absent from the remote manifest, so the
			// next sync retries it and `readAsBuffer` succeeds.
			await expect(
				service.searchKnowledge(projectId, agentId, { pattern: 'bar' }),
			).resolves.toBeDefined();

			expect(agentKnowledgeFileStore.readAsBuffer).toHaveBeenCalledTimes(2);
			expect(filesystem.writeFile).toHaveBeenCalledTimes(1);
		});
	});
});

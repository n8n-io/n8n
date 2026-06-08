import type { FileEntry } from '@n8n/agents/sandbox';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';

import { AgentsConfig } from '@n8n/config';

import type { AiService } from '@/services/ai.service';

import {
	AGENT_KNOWLEDGE_DAYTONA_PROXY_VOLUMES_UNSUPPORTED_MESSAGE,
	AGENT_KNOWLEDGE_N8N_SANDBOX_UNSUPPORTED_MESSAGE,
	AgentKnowledgeSandboxConfigService,
} from '../agent-knowledge-sandbox-config.service';
import { AgentKnowledgeSandboxWorkspaceService } from '../agent-knowledge-sandbox-workspace.service';
import { AgentKnowledgeService } from '../agent-knowledge.service';
import type { AgentFileRepository } from '../repositories/agent-file.repository';
import type { AgentRepository } from '../repositories/agent.repository';

const createSandboxMock = jest.fn();
const createFilesystemMock = jest.fn();

jest.mock('@n8n/agents/sandbox', () => ({
	createSandbox: (...args: unknown[]) => createSandboxMock(...args),
	createFilesystem: (...args: unknown[]) => createFilesystemMock(...args),
	DAYTONA_WORKSPACE_ROOT: '/home/daytona/workspace',
	N8N_SANDBOX_WORKSPACE_ROOT: '/home/user/workspace',
	normalizeSandboxProvider: (value?: string) => (value === 'daytona' ? 'daytona' : 'n8n-sandbox'),
}));

function makeSandbox(provider: 'n8n-sandbox' | 'daytona' = 'n8n-sandbox') {
	return {
		id: `sandbox-${provider}`,
		name: 'Sandbox',
		provider,
		status: 'running' as 'running' | 'destroyed',
		destroy: jest.fn(async () => {}),
	};
}

function makeFilesystem(provider: 'n8n-sandbox' | 'daytona' = 'n8n-sandbox') {
	return {
		id: `${provider}-fs`,
		name: 'Filesystem',
		provider,
		status: 'ready' as const,
		mkdir: jest.fn(async () => {}),
		readFile: jest.fn<Promise<string>, [string]>(async () => {
			throw new Error('manifest missing');
		}),
		writeFile: jest.fn(async () => {}),
		appendFile: jest.fn(async () => {}),
		deleteFile: jest.fn(async () => {}),
		copyFile: jest.fn(async () => {}),
		moveFile: jest.fn(async () => {}),
		exists: jest.fn<Promise<boolean>, [string]>(async () => true),
		rmdir: jest.fn(async () => {}),
		readdir: jest.fn<Promise<FileEntry[]>, [string]>(async () => []),
		stat: jest.fn(async () => ({
			name: 'agent-knowledge',
			path: '/home/user/workspace/agent-knowledge',
			type: 'directory' as const,
			size: 0,
			createdAt: new Date('2026-06-06T12:00:00.000Z'),
			modifiedAt: new Date('2026-06-06T12:00:00.000Z'),
		})),
	};
}

function buildExpectedManifest(corpusSignature = 'sig-current') {
	return {
		version: 1,
		agentId: 'agent-1',
		projectId: 'project-1',
		corpusSignature,
		files: [
			{
				id: 'file-1',
				relativePath: 'file-1.txt',
				fileSizeBytes: 10,
				binaryDataIdSha1: 'abc123',
			},
		],
	};
}

const syncedWorkspaceOptions = (expectedManifest = buildExpectedManifest()) => ({
	userId: 'user-1',
	expectedManifest,
});

function configureDirectDaytona(configService: AgentKnowledgeSandboxConfigService) {
	jest.spyOn(configService, 'isAvailable').mockReturnValue(true);
	jest.spyOn(configService, 'resolveConfig').mockReturnValue({
		enabled: true,
		provider: 'daytona',
		timeout: 300_000,
		name: undefined,
		image: 'daytonaio/sandbox:0.5.0',
	});
	jest.spyOn(configService, 'resolveDaytonaVolumeConfig').mockReturnValue({
		volumeId: 'vol-1',
		subpathPrefix: 'agent-knowledge/staging',
	});
	jest.spyOn(configService, 'resolveNamePrefix').mockReturnValue('Acme Eval');
}

function createDeferred() {
	let resolve!: () => void;
	const promise = new Promise<void>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

const flushMicrotasks = async () => {
	await new Promise<void>((resolve) => {
		setImmediate(resolve);
	});
};

describe('AgentKnowledgeSandboxWorkspaceService', () => {
	let logger: ReturnType<typeof mock<Logger>>;
	let configService: AgentKnowledgeSandboxConfigService;
	let aiService: ReturnType<typeof mock<AiService>>;
	let knowledgeService: AgentKnowledgeService;
	let service: AgentKnowledgeSandboxWorkspaceService;

	beforeEach(() => {
		jest.clearAllMocks();
		logger = mock<Logger>();
		aiService = mock<AiService>();
		aiService.isProxyEnabled.mockReturnValue(false);
		configService = new AgentKnowledgeSandboxConfigService(
			Object.assign(new AgentsConfig(), {
				aiSandboxEnabled: true,
				aiSandboxNamePrefix: '',
			}),
			aiService,
		);
		jest.spyOn(configService, 'resolveConfig').mockReturnValue({
			enabled: true,
			provider: 'n8n-sandbox',
			serviceUrl: 'https://sandbox.example.test',
			timeout: 300_000,
		});
		knowledgeService = new AgentKnowledgeService(
			mock<AgentRepository>(),
			mock<AgentFileRepository>(),
			mock(),
			logger,
		);
		service = new AgentKnowledgeSandboxWorkspaceService(logger, configService, knowledgeService);
	});

	it('rejects n8n-sandbox workspace creation before sandbox creation', async () => {
		await expect(
			service.withSyncedWorkspace(
				'project-1:agent-1:workspace',
				syncedWorkspaceOptions(),
				async () => {},
				async (entry) => entry,
			),
		).rejects.toThrow(AGENT_KNOWLEDGE_N8N_SANDBOX_UNSUPPORTED_MESSAGE);

		expect(createSandboxMock).not.toHaveBeenCalled();
	});

	it('rejects proxied Daytona before sandbox creation', async () => {
		jest.spyOn(configService, 'isDaytonaProxyEnabled').mockReturnValue(true);

		await expect(
			service.withSyncedWorkspace(
				'project-1:agent-1:workspace',
				syncedWorkspaceOptions(),
				async () => {},
				async (entry) => entry,
			),
		).rejects.toThrow(AGENT_KNOWLEDGE_DAYTONA_PROXY_VOLUMES_UNSUPPORTED_MESSAGE);

		expect(createSandboxMock).not.toHaveBeenCalled();
	});

	it('creates a Daytona volume workspace with a stable per-agent knowledge mount', async () => {
		configureDirectDaytona(configService);
		const sandbox = makeSandbox('daytona');
		const filesystem = makeFilesystem('daytona');
		const expectedManifest = buildExpectedManifest('sig-current');
		createSandboxMock.mockResolvedValue(sandbox);
		createFilesystemMock.mockReturnValue(filesystem);
		filesystem.readFile.mockResolvedValue(
			JSON.stringify({ ...expectedManifest, materializedAt: '2026-06-06T12:00:00.000Z' }),
		);

		await service.withSyncedWorkspace(
			'project-1:agent-1:workspace',
			syncedWorkspaceOptions(expectedManifest),
			async () => {},
			async (workspace) => workspace,
		);

		expect(createSandboxMock).toHaveBeenCalledWith(
			expect.objectContaining({
				provider: 'daytona',
				volumes: [
					{
						volumeId: 'vol-1',
						mountPath: '/home/daytona/workspace/agent-knowledge',
						subpath: 'agent-knowledge/staging/projects/project-1/agents/agent-1/knowledge',
					},
				],
				labels: expect.objectContaining({
					component: 'agent-knowledge',
					agent_id: 'agent-1',
					project_id: 'project-1',
				}),
			}),
			{ logger },
		);
		expect(sandbox.destroy).toHaveBeenCalledTimes(1);
	});

	it('withSyncedWorkspace skips repair when manifest identity and files are current', async () => {
		configureDirectDaytona(configService);
		const sandbox = makeSandbox('daytona');
		const filesystem = makeFilesystem('daytona');
		const expectedManifest = buildExpectedManifest();
		createSandboxMock.mockResolvedValue(sandbox);
		createFilesystemMock.mockReturnValue(filesystem);
		filesystem.readFile.mockResolvedValue(
			JSON.stringify({ ...expectedManifest, materializedAt: '2026-06-06T12:00:00.000Z' }),
		);
		const repair = jest.fn(async () => {});
		const operation = jest.fn(async () => 'ok');

		await service.withSyncedWorkspace(
			'project-1:agent-1:workspace',
			syncedWorkspaceOptions(expectedManifest),
			repair,
			operation,
		);

		expect(repair).not.toHaveBeenCalled();
		expect(operation).toHaveBeenCalledTimes(1);
		expect(sandbox.destroy).toHaveBeenCalledTimes(1);
	});

	it('withSyncedWorkspace repairs missing manifest before operation', async () => {
		configureDirectDaytona(configService);
		const sandbox = makeSandbox('daytona');
		const filesystem = makeFilesystem('daytona');
		createSandboxMock.mockResolvedValue(sandbox);
		createFilesystemMock.mockReturnValue(filesystem);
		const repair = jest.fn(async () => {});

		await service.withSyncedWorkspace(
			'project-1:agent-1:workspace',
			syncedWorkspaceOptions(),
			repair,
			async () => 'ok',
		);

		expect(repair).toHaveBeenCalledTimes(1);
		expect(sandbox.destroy).toHaveBeenCalledTimes(1);
	});

	it('withSyncedWorkspace repairs missing required file before operation', async () => {
		configureDirectDaytona(configService);
		const sandbox = makeSandbox('daytona');
		const filesystem = makeFilesystem('daytona');
		const expectedManifest = buildExpectedManifest();
		createSandboxMock.mockResolvedValue(sandbox);
		createFilesystemMock.mockReturnValue(filesystem);
		filesystem.readFile.mockResolvedValue(
			JSON.stringify({ ...expectedManifest, materializedAt: '2026-06-06T12:00:00.000Z' }),
		);
		filesystem.exists.mockImplementation(async (targetPath) => {
			return targetPath !== '/home/daytona/workspace/agent-knowledge/file-1.txt';
		});
		const repair = jest.fn(async () => {});

		await service.withSyncedWorkspace(
			'project-1:agent-1:workspace',
			syncedWorkspaceOptions(expectedManifest),
			repair,
			async () => 'ok',
		);

		expect(repair).toHaveBeenCalledTimes(1);
	});

	it('withSyncedWorkspace repairs drifted volume contents before running the operation', async () => {
		configureDirectDaytona(configService);
		const sandbox = makeSandbox('daytona');
		const filesystem = makeFilesystem('daytona');
		createSandboxMock.mockResolvedValue(sandbox);
		createFilesystemMock.mockReturnValue(filesystem);
		const expectedManifest = buildExpectedManifest('sig-current');
		filesystem.readFile.mockResolvedValue(
			JSON.stringify({
				...expectedManifest,
				corpusSignature: 'sig-stale',
				materializedAt: '2026-06-06T12:00:00.000Z',
			}),
		);
		filesystem.readdir.mockResolvedValue([
			{ name: 'file-1.txt', type: 'file' as const, size: 10 },
			{ name: '.agent-knowledge-internal', type: 'directory' as const, size: 0 },
		]);
		const repair = jest.fn(async () => {});

		await service.withSyncedWorkspace(
			'project-1:agent-1:workspace',
			syncedWorkspaceOptions(expectedManifest),
			repair,
			async () => 'ok',
		);

		expect(repair).toHaveBeenCalledTimes(1);
		expect(filesystem.deleteFile).toHaveBeenCalledWith(
			'/home/daytona/workspace/agent-knowledge/file-1.txt',
			{ recursive: true, force: true },
		);
	});

	it('syncDaytonaVolumeForAgent replaces volume contents and destroys the sync sandbox', async () => {
		configureDirectDaytona(configService);
		const sandbox = makeSandbox('daytona');
		const filesystem = makeFilesystem('daytona');
		createSandboxMock.mockResolvedValue(sandbox);
		createFilesystemMock.mockReturnValue(filesystem);
		const expectedManifest = buildExpectedManifest();
		const materializeAll = jest.fn(async () => {});

		await service.syncDaytonaVolumeForAgent(
			'project-1',
			'agent-1',
			'user-1',
			expectedManifest,
			materializeAll,
		);

		expect(materializeAll).toHaveBeenCalledTimes(1);
		expect(sandbox.destroy).toHaveBeenCalledTimes(1);
	});

	it('syncAgentKnowledgeVolume logs and resolves when materialization fails', async () => {
		configureDirectDaytona(configService);
		const sandbox = makeSandbox('daytona');
		createSandboxMock.mockResolvedValue(sandbox);
		createFilesystemMock.mockReturnValue(makeFilesystem('daytona'));
		const expectedManifest = buildExpectedManifest();
		jest.spyOn(knowledgeService, 'resolveCurrentSandboxManifest').mockResolvedValue({
			files: [],
			storedFiles: [],
			expectedManifest,
		});
		jest
			.spyOn(knowledgeService, 'materializeWorkspaceFilesIntoSandbox')
			.mockRejectedValue(new Error('materialization failed'));

		await expect(
			service.syncAgentKnowledgeVolume('project-1', 'agent-1', 'user-1'),
		).resolves.toBeUndefined();

		expect(logger.warn).toHaveBeenCalledWith(
			'Failed to sync agent knowledge Daytona volume',
			expect.objectContaining({
				projectId: 'project-1',
				agentId: 'agent-1',
				error: 'materialization failed',
			}),
		);
	});

	it('cleanupDaytonaVolumeForAgent deletes direct children under the agent volume subpath', async () => {
		configureDirectDaytona(configService);
		const sandbox = makeSandbox('daytona');
		const filesystem = makeFilesystem('daytona');
		createSandboxMock.mockResolvedValue(sandbox);
		createFilesystemMock.mockReturnValue(filesystem);
		filesystem.readdir.mockResolvedValue([
			{ name: 'knowledge', type: 'directory' as const, size: 0 },
			{ name: 'stale.txt', type: 'file' as const, size: 1 },
		]);

		await service.cleanupDaytonaVolumeForAgent('project-1', 'agent-1');

		expect(createSandboxMock).toHaveBeenCalledWith(
			expect.objectContaining({
				volumes: [
					expect.objectContaining({
						mountPath: '/home/daytona/workspace/agent-knowledge-cleanup',
						subpath: 'agent-knowledge/staging/projects/project-1/agents/agent-1',
					}),
				],
				labels: expect.objectContaining({ cleanup: 'agent-volume' }),
			}),
			{ logger },
		);
		expect(filesystem.deleteFile).toHaveBeenCalledWith(
			'/home/daytona/workspace/agent-knowledge-cleanup/knowledge',
			{ recursive: true, force: true },
		);
		expect(filesystem.deleteFile).toHaveBeenCalledWith(
			'/home/daytona/workspace/agent-knowledge-cleanup/stale.txt',
			{ recursive: true, force: true },
		);
		expect(sandbox.destroy).toHaveBeenCalledTimes(1);
	});

	it('serializes sync and search for the same agent key', async () => {
		configureDirectDaytona(configService);
		const syncSandbox = makeSandbox('daytona');
		const searchSandbox = makeSandbox('daytona');
		createSandboxMock.mockResolvedValueOnce(syncSandbox).mockResolvedValueOnce(searchSandbox);
		createFilesystemMock.mockReturnValue(makeFilesystem('daytona'));
		const syncGate = createDeferred();
		const started: string[] = [];
		const expectedManifest = buildExpectedManifest();

		const syncPromise = service.syncDaytonaVolumeForAgent(
			'project-1',
			'agent-1',
			'user-1',
			expectedManifest,
			async () => {
				started.push('sync');
				await syncGate.promise;
			},
		);
		const searchPromise = service.withSyncedWorkspace(
			'project-1:agent-1:workspace',
			syncedWorkspaceOptions(expectedManifest),
			async () => {},
			async () => {
				started.push('search');
				return 'search';
			},
		);

		await flushMicrotasks();
		expect(started).toEqual(['sync']);
		syncGate.resolve();
		await expect(Promise.all([syncPromise, searchPromise])).resolves.toEqual([undefined, 'search']);
		expect(started).toEqual(['sync', 'search']);
	});
});

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

function makeWorkspace(filesystem: ReturnType<typeof makeFilesystem>) {
	return {
		sandbox: makeSandbox(),
		filesystem,
		provider: 'n8n-sandbox' as const,
		storageMode: 'sandbox-local' as const,
		workspaceRoot: '/home/user/workspace',
		knowledgeRoot: '/home/user/workspace/agent-knowledge',
		internalRoot: '/home/user/workspace/.agent-knowledge-internal',
		manifestPath: '/home/user/workspace/.agent-knowledge-internal/manifest.json',
	};
}

function makeDaytonaVolumeWorkspace(filesystem: ReturnType<typeof makeFilesystem>) {
	return {
		...makeWorkspace(filesystem),
		provider: 'daytona' as const,
		storageMode: 'daytona-volume' as const,
		workspaceRoot: '/home/daytona/workspace',
		knowledgeRoot: '/home/daytona/workspace/agent-knowledge',
		internalRoot: '/home/daytona/workspace/agent-knowledge/.agent-knowledge-internal',
		manifestPath: '/home/daytona/workspace/agent-knowledge/.agent-knowledge-internal/manifest.json',
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

const workspaceOptions = (expectedManifest = buildExpectedManifest()) => ({
	userId: 'user-1',
	expectedManifest,
});

function configureDirectDaytona(configService: AgentKnowledgeSandboxConfigService) {
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
		service = new AgentKnowledgeSandboxWorkspaceService(
			logger,
			configService,
			new AgentKnowledgeService(mock<AgentRepository>(), mock<AgentFileRepository>(), mock()),
		);
	});

	it('rejects n8n-sandbox workspace creation before sandbox creation', async () => {
		await expect(
			service.withCachedWorkspace(
				'project-1:agent-1:workspace',
				workspaceOptions(),
				async (entry) => entry,
			),
		).rejects.toThrow(AGENT_KNOWLEDGE_N8N_SANDBOX_UNSUPPORTED_MESSAGE);

		expect(createSandboxMock).not.toHaveBeenCalled();
	});

	it('rejects proxied Daytona before sandbox creation', async () => {
		jest.spyOn(configService, 'isDaytonaProxyEnabled').mockReturnValue(true);

		await expect(
			service.withCachedWorkspace(
				'project-1:agent-1:workspace',
				workspaceOptions(),
				async (entry) => entry,
			),
		).rejects.toThrow(AGENT_KNOWLEDGE_DAYTONA_PROXY_VOLUMES_UNSUPPORTED_MESSAGE);

		expect(createSandboxMock).not.toHaveBeenCalled();
	});

	it('creates a Daytona volume workspace with signature-addressed mount', async () => {
		configureDirectDaytona(configService);
		const sandbox = makeSandbox('daytona');
		const filesystem = makeFilesystem('daytona');
		createSandboxMock.mockResolvedValue(sandbox);
		createFilesystemMock.mockReturnValue(filesystem);
		const expectedManifest = buildExpectedManifest('sig-current');

		const workspace = await service.withCachedWorkspace(
			'project-1:agent-1:workspace',
			workspaceOptions(expectedManifest),
			async (entry) => entry,
		);

		expect(createSandboxMock).toHaveBeenCalledWith(
			expect.objectContaining({
				provider: 'daytona',
				volumes: [
					{
						volumeId: 'vol-1',
						mountPath: '/home/daytona/workspace/agent-knowledge',
						subpath:
							'agent-knowledge/staging/projects/project-1/agents/agent-1/corpora/sig-current',
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
		expect(workspace).toMatchObject({
			provider: 'daytona',
			storageMode: 'daytona-volume',
			workspaceRoot: '/home/daytona/workspace',
			knowledgeRoot: '/home/daytona/workspace/agent-knowledge',
			internalRoot: '/home/daytona/workspace/agent-knowledge/.agent-knowledge-internal',
			manifestPath:
				'/home/daytona/workspace/agent-knowledge/.agent-knowledge-internal/manifest.json',
			corpusSignature: 'sig-current',
			volumeSubpath:
				'agent-knowledge/staging/projects/project-1/agents/agent-1/corpora/sig-current',
		});
		expect(filesystem.mkdir).toHaveBeenCalledWith(
			'/home/daytona/workspace/agent-knowledge/.agent-knowledge-internal',
			{ recursive: true },
		);
		expect(filesystem.mkdir).not.toHaveBeenCalledWith(
			'/home/daytona/workspace/agent-knowledge',
			expect.anything(),
		);
	});

	it('labels Daytona workspaces with stable agent identity', async () => {
		configureDirectDaytona(configService);
		createSandboxMock.mockResolvedValue(makeSandbox('daytona'));
		createFilesystemMock.mockReturnValue(makeFilesystem('daytona'));

		await service.withCachedWorkspace(
			'project-1:agent-1:workspace',
			workspaceOptions(),
			async (entry) => entry,
		);

		expect(createSandboxMock).toHaveBeenCalledWith(
			expect.objectContaining({
				name: expect.stringMatching(/^acme-eval-agents-knowledgebase-/),
				labels: expect.objectContaining({
					component: 'agent-knowledge',
					name_prefix: 'Acme-Eval',
					agent_id: 'agent-1',
					project_id: 'project-1',
				}),
			}),
			{ logger },
		);
	});

	it('creates separate cached workspaces for different corpus signatures', async () => {
		configureDirectDaytona(configService);
		createSandboxMock
			.mockResolvedValueOnce(makeSandbox('daytona'))
			.mockResolvedValueOnce(makeSandbox('daytona'));
		createFilesystemMock.mockReturnValue(makeFilesystem('daytona'));

		const first = await service.withCachedWorkspace(
			'project-1:agent-1:workspace',
			workspaceOptions(buildExpectedManifest('sig-one')),
			async (entry) => entry,
		);
		const second = await service.withCachedWorkspace(
			'project-1:agent-1:workspace',
			workspaceOptions(buildExpectedManifest('sig-two')),
			async (entry) => entry,
		);

		expect(first).not.toBe(second);
		expect(createSandboxMock).toHaveBeenCalledTimes(2);
		expect(service.getCachedWorkspaceCount()).toBe(2);
	});

	it('reuses cached workspace for the same corpus signature across users', async () => {
		configureDirectDaytona(configService);
		createSandboxMock.mockResolvedValue(makeSandbox('daytona'));
		createFilesystemMock.mockReturnValue(makeFilesystem('daytona'));
		const expectedManifest = buildExpectedManifest('sig-current');

		const first = await service.withCachedWorkspace(
			'project-1:agent-1:workspace',
			{ userId: 'user-1', expectedManifest },
			async (entry) => entry,
		);
		const second = await service.withCachedWorkspace(
			'project-1:agent-1:workspace',
			{ userId: 'user-2', expectedManifest },
			async (entry) => entry,
		);

		expect(first).toBe(second);
		expect(createSandboxMock).toHaveBeenCalledTimes(1);
	});

	it('reuses direct Daytona workspaces across users when auth is static', async () => {
		configureDirectDaytona(configService);
		createSandboxMock.mockResolvedValue(makeSandbox('daytona'));
		createFilesystemMock.mockReturnValue(makeFilesystem('daytona'));
		const expectedManifest = buildExpectedManifest('sig-current');

		const first = await service.withCachedWorkspace(
			'project-1:agent-1:workspace',
			{ userId: 'user-1', expectedManifest },
			async (entry) => entry,
		);
		const second = await service.withCachedWorkspace(
			'project-1:agent-1:workspace',
			{ userId: 'user-2', expectedManifest },
			async (entry) => entry,
		);

		expect(first).toBe(second);
		expect(createSandboxMock).toHaveBeenCalledTimes(1);
	});

	it('destroys cached workspaces for the requested agent only', async () => {
		configureDirectDaytona(configService);
		createSandboxMock
			.mockResolvedValueOnce(makeSandbox('daytona'))
			.mockResolvedValueOnce(makeSandbox('daytona'))
			.mockResolvedValueOnce(makeSandbox('daytona'));
		createFilesystemMock.mockReturnValue(makeFilesystem('daytona'));

		await service.withCachedWorkspace(
			'project-1:agent-1:workspace',
			workspaceOptions(buildExpectedManifest('sig-one')),
			async (entry) => entry,
		);
		await service.withCachedWorkspace(
			'project-1:agent-2:workspace',
			workspaceOptions(buildExpectedManifest('sig-other')),
			async (entry) => entry,
		);

		await service.destroyCachedWorkspacesForAgent('project-1', 'agent-1');

		expect(service.getCachedWorkspaceCount()).toBe(1);
		await service.withCachedWorkspace(
			'project-1:agent-1:workspace',
			workspaceOptions(buildExpectedManifest('sig-one')),
			async (entry) => entry,
		);
		expect(createSandboxMock).toHaveBeenCalledTimes(3);
	});

	it('destroyCachedWorkspacesForAgent destroys all corpus workspaces for the agent', async () => {
		configureDirectDaytona(configService);
		const firstSandbox = makeSandbox('daytona');
		const secondSandbox = makeSandbox('daytona');
		const otherSandbox = makeSandbox('daytona');
		createSandboxMock
			.mockResolvedValueOnce(firstSandbox)
			.mockResolvedValueOnce(secondSandbox)
			.mockResolvedValueOnce(otherSandbox);
		createFilesystemMock.mockReturnValue(makeFilesystem('daytona'));

		await service.withCachedWorkspace(
			'project-1:agent-1:workspace',
			workspaceOptions(buildExpectedManifest('sig-one')),
			async (entry) => entry,
		);
		await service.withCachedWorkspace(
			'project-1:agent-1:workspace',
			workspaceOptions(buildExpectedManifest('sig-two')),
			async (entry) => entry,
		);
		await service.withCachedWorkspace(
			'project-1:agent-2:workspace',
			workspaceOptions(buildExpectedManifest('sig-other')),
			async (entry) => entry,
		);

		await service.destroyCachedWorkspacesForAgent('project-1', 'agent-1');

		expect(firstSandbox.destroy).toHaveBeenCalledTimes(1);
		expect(secondSandbox.destroy).toHaveBeenCalledTimes(1);
		expect(otherSandbox.destroy).not.toHaveBeenCalled();
		expect(service.getCachedWorkspaceCount()).toBe(1);
	});

	it('serializes operations sharing a workspace key', async () => {
		configureDirectDaytona(configService);
		const createGate = createDeferred();
		createSandboxMock.mockImplementation(async () => {
			await createGate.promise;
			return makeSandbox('daytona');
		});
		createFilesystemMock.mockReturnValue(makeFilesystem('daytona'));
		const gate = createDeferred();
		const started: number[] = [];

		const first = service.withCachedWorkspace(
			'project-1:agent-1:workspace',
			workspaceOptions(),
			async () => {
				started.push(1);
				await gate.promise;
				return 'first';
			},
		);
		const second = service.withCachedWorkspace(
			'project-1:agent-1:workspace',
			workspaceOptions(),
			async () => {
				started.push(2);
				return 'second';
			},
		);

		await flushMicrotasks();
		expect(started).toEqual([]);
		createGate.resolve();
		await flushMicrotasks();
		expect(started).toEqual([1]);
		gate.resolve();
		await expect(Promise.all([first, second])).resolves.toEqual(['first', 'second']);
	});

	it('does not evict a stale workspace while an operation is active', async () => {
		configureDirectDaytona(configService);
		const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(0);
		const firstSandbox = makeSandbox('daytona');
		const secondSandbox = makeSandbox('daytona');
		createSandboxMock.mockResolvedValueOnce(firstSandbox).mockResolvedValueOnce(secondSandbox);
		createFilesystemMock.mockReturnValue(makeFilesystem('daytona'));
		const started = createDeferred();
		const release = createDeferred();

		const activeOperation = service.withCachedWorkspace(
			'project-1:agent-1:workspace',
			workspaceOptions(buildExpectedManifest('sig-active')),
			async () => {
				started.resolve();
				await release.promise;
				return 'active';
			},
		);
		await started.promise;

		nowSpy.mockReturnValue(10 * 60_000 + 1);
		await service.withCachedWorkspace(
			'project-1:agent-2:workspace',
			workspaceOptions(buildExpectedManifest('sig-other')),
			async () => 'other',
		);

		expect(firstSandbox.destroy).not.toHaveBeenCalled();
		release.resolve();
		await expect(activeOperation).resolves.toBe('active');
		nowSpy.mockRestore();
	});

	it('waits for active operations before destroying an agent workspace', async () => {
		configureDirectDaytona(configService);
		const sandbox = makeSandbox('daytona');
		createSandboxMock.mockResolvedValue(sandbox);
		createFilesystemMock.mockReturnValue(makeFilesystem('daytona'));
		const started = createDeferred();
		const release = createDeferred();

		const activeOperation = service.withCachedWorkspace(
			'project-1:agent-1:workspace',
			workspaceOptions(),
			async () => {
				started.resolve();
				await release.promise;
				return 'active';
			},
		);
		await started.promise;

		const destroyPromise = service.destroyCachedWorkspacesForAgent('project-1', 'agent-1');
		await flushMicrotasks();

		expect(sandbox.destroy).not.toHaveBeenCalled();
		release.resolve();
		await expect(activeOperation).resolves.toBe('active');
		await destroyPromise;
		expect(sandbox.destroy).toHaveBeenCalledTimes(1);
		expect(service.getCachedWorkspaceCount()).toBe(0);
	});

	it('skips materialization when required files are present and current', async () => {
		const filesystem = makeFilesystem();
		const workspace = makeWorkspace(filesystem);
		const expected = buildExpectedManifest();
		filesystem.readFile.mockResolvedValue(
			JSON.stringify({ ...expected, materializedAt: '2026-06-06T12:00:00.000Z' }),
		);
		const materialize = jest.fn(async () => {});

		await service.ensureWorkspaceContainsFiles(workspace, expected, materialize);

		expect(materialize).not.toHaveBeenCalled();
	});

	it('materializes only missing or changed required files', async () => {
		const filesystem = makeFilesystem();
		const workspace = makeWorkspace(filesystem);
		const expected = buildExpectedManifest();
		filesystem.readFile.mockResolvedValue(
			JSON.stringify({
				...expected,
				files: [{ ...expected.files[0], binaryDataIdSha1: 'stale-hash' }],
				materializedAt: '2026-06-06T12:00:00.000Z',
			}),
		);
		const materialize = jest.fn(async () => {});

		await service.ensureWorkspaceContainsFiles(workspace, expected, materialize);

		expect(filesystem.deleteFile).not.toHaveBeenCalled();
		expect(materialize).toHaveBeenCalledWith([
			expect.objectContaining({ id: 'file-1', relativePath: 'file-1.txt' }),
		]);
	});

	it('clears unrecoverable workspace state before rematerializing required files', async () => {
		const filesystem = makeFilesystem();
		const workspace = makeWorkspace(filesystem);
		const expected = buildExpectedManifest();
		filesystem.readFile.mockResolvedValue(
			JSON.stringify({ ...expected, agentId: 'other-agent', materializedAt: '2026-06-06' }),
		);
		const materialize = jest.fn(async () => {});

		await service.ensureWorkspaceContainsFiles(workspace, expected, materialize);

		expect(filesystem.deleteFile).toHaveBeenCalledWith(workspace.knowledgeRoot, {
			recursive: true,
			force: true,
		});
		expect(materialize).toHaveBeenCalledTimes(1);
	});

	it('clears unrecoverable workspace state when corpus signature differs', async () => {
		const filesystem = makeFilesystem();
		const workspace = makeWorkspace(filesystem);
		const expected = buildExpectedManifest();
		filesystem.readFile.mockResolvedValue(
			JSON.stringify({
				...expected,
				corpusSignature: 'sig-stale',
				materializedAt: '2026-06-06T12:00:00.000Z',
			}),
		);
		const materialize = jest.fn(async () => {});

		await service.ensureWorkspaceContainsFiles(workspace, expected, materialize);

		expect(filesystem.deleteFile).toHaveBeenCalledWith(workspace.knowledgeRoot, {
			recursive: true,
			force: true,
		});
		expect(materialize).toHaveBeenCalledWith([
			expect.objectContaining({ id: 'file-1', relativePath: 'file-1.txt' }),
		]);
	});

	it('skips materialization for fresh Daytona volume manifest and existing files', async () => {
		const filesystem = makeFilesystem('daytona');
		const workspace = makeDaytonaVolumeWorkspace(filesystem);
		const expected = buildExpectedManifest('sig-current');
		filesystem.readFile.mockResolvedValue(
			JSON.stringify({ ...expected, materializedAt: '2026-06-06T12:00:00.000Z' }),
		);
		filesystem.exists.mockResolvedValue(true);
		const materialize = jest.fn(async () => {});

		await service.ensureWorkspaceContainsFiles(workspace, expected, materialize);

		expect(materialize).not.toHaveBeenCalled();
		expect(filesystem.deleteFile).not.toHaveBeenCalled();
	});

	it('materializes only missing Daytona volume files when manifest identity is fresh', async () => {
		const filesystem = makeFilesystem('daytona');
		const workspace = makeDaytonaVolumeWorkspace(filesystem);
		const expected = {
			...buildExpectedManifest('sig-current'),
			files: [
				{
					id: 'file-1',
					relativePath: 'file-1.txt',
					fileSizeBytes: 10,
					binaryDataIdSha1: 'sha1-file-1',
				},
				{
					id: 'file-2',
					relativePath: 'file-2.txt',
					fileSizeBytes: 20,
					binaryDataIdSha1: 'sha1-file-2',
				},
			],
		};
		filesystem.readFile.mockResolvedValue(
			JSON.stringify({ ...expected, materializedAt: '2026-06-06T12:00:00.000Z' }),
		);
		filesystem.exists.mockImplementation(async (targetPath) => {
			return targetPath !== '/home/daytona/workspace/agent-knowledge/file-2.txt';
		});
		const materialize = jest.fn(async () => {});

		await service.ensureWorkspaceContainsFiles(workspace, expected, materialize);

		expect(materialize).toHaveBeenCalledWith([
			expect.objectContaining({ id: 'file-2', relativePath: 'file-2.txt' }),
		]);
		expect(filesystem.deleteFile).not.toHaveBeenCalled();
	});

	it('clears Daytona volume children before rematerializing wrong signature', async () => {
		const filesystem = makeFilesystem('daytona');
		const workspace = makeDaytonaVolumeWorkspace(filesystem);
		const expected = buildExpectedManifest('sig-current');
		filesystem.readFile.mockResolvedValue(
			JSON.stringify({
				...expected,
				corpusSignature: 'sig-stale',
				materializedAt: '2026-06-06T12:00:00.000Z',
			}),
		);
		filesystem.readdir.mockResolvedValue([
			{
				name: 'file-1.txt',
				type: 'file' as const,
				size: 10,
			},
			{
				name: '.agent-knowledge-internal',
				type: 'directory' as const,
				size: 0,
			},
		]);
		const materialize = jest.fn(async () => {});

		await service.ensureWorkspaceContainsFiles(workspace, expected, materialize);

		expect(filesystem.deleteFile).not.toHaveBeenCalledWith(
			workspace.knowledgeRoot,
			expect.anything(),
		);
		expect(filesystem.deleteFile).toHaveBeenCalledWith(
			'/home/daytona/workspace/agent-knowledge/file-1.txt',
			{ recursive: true, force: true },
		);
		expect(filesystem.deleteFile).toHaveBeenCalledWith(
			'/home/daytona/workspace/agent-knowledge/.agent-knowledge-internal',
			{ recursive: true, force: true },
		);
		expect(filesystem.mkdir).toHaveBeenCalledWith(workspace.internalRoot, { recursive: true });
		expect(materialize).toHaveBeenCalledWith([
			expect.objectContaining({ id: 'file-1', relativePath: 'file-1.txt' }),
		]);
	});

	it('does not materialize when Daytona volume root cannot be safely listed for stale cleanup', async () => {
		const filesystem = makeFilesystem('daytona');
		const workspace = makeDaytonaVolumeWorkspace(filesystem);
		const expected = buildExpectedManifest('sig-current');
		filesystem.readFile.mockResolvedValue(
			JSON.stringify({
				...expected,
				corpusSignature: 'sig-stale',
				materializedAt: '2026-06-06T12:00:00.000Z',
			}),
		);
		filesystem.readdir.mockRejectedValue(new Error('list failed'));
		const materialize = jest.fn(async () => {});

		await expect(
			service.ensureWorkspaceContainsFiles(workspace, expected, materialize),
		).rejects.toThrow('list failed');

		expect(materialize).not.toHaveBeenCalled();
		expect(filesystem.deleteFile).not.toHaveBeenCalledWith(
			workspace.knowledgeRoot,
			expect.anything(),
		);
	});

	it('legacy manifest without corpusSignature materializes required files', async () => {
		const filesystem = makeFilesystem();
		const workspace = makeWorkspace(filesystem);
		const expected = buildExpectedManifest();
		const { corpusSignature: _corpusSignature, ...legacyManifest } = expected;
		filesystem.readFile.mockResolvedValue(
			JSON.stringify({
				...legacyManifest,
				materializedAt: '2026-06-06T12:00:00.000Z',
			}),
		);
		const materialize = jest.fn(async () => {});

		await service.ensureWorkspaceContainsFiles(workspace, expected, materialize);

		expect(filesystem.deleteFile).not.toHaveBeenCalled();
		expect(materialize).toHaveBeenCalledWith([
			expect.objectContaining({ id: 'file-1', relativePath: 'file-1.txt' }),
		]);
	});
});

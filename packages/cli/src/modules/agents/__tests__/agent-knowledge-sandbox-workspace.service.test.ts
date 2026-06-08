import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';

import { AgentsConfig } from '@n8n/config';

import type { AiService } from '@/services/ai.service';

import { AgentKnowledgeSandboxConfigService } from '../agent-knowledge-sandbox-config.service';
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
		readdir: jest.fn(async () => []),
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
		workspaceRoot: '/home/user/workspace',
		knowledgeRoot: '/home/user/workspace/agent-knowledge',
		internalRoot: '/home/user/workspace/.agent-knowledge-internal',
		manifestPath: '/home/user/workspace/.agent-knowledge-internal/manifest.json',
	};
}

function buildExpectedManifest() {
	return {
		version: 1,
		agentId: 'agent-1',
		projectId: 'project-1',
		corpusSignature: 'sig-current',
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

	it('creates and reuses an n8n workspace with the manifest outside the knowledge root', async () => {
		const sandbox = makeSandbox();
		const filesystem = makeFilesystem();
		createSandboxMock.mockResolvedValue(sandbox);
		createFilesystemMock.mockReturnValue(filesystem);

		const first = await service.withCachedWorkspace('same-key', async (entry) => entry);
		const second = await service.withCachedWorkspace('same-key', async (entry) => entry);

		expect(first).toBe(second);
		expect(createSandboxMock).toHaveBeenCalledTimes(1);
		expect(createFilesystemMock).toHaveBeenCalledWith(sandbox);
		expect(first.knowledgeRoot).toBe('/home/user/workspace/agent-knowledge');
		expect(first.manifestPath).toBe('/home/user/workspace/.agent-knowledge-internal/manifest.json');
		expect(first.manifestPath.startsWith(`${first.knowledgeRoot}/`)).toBe(false);
		expect(filesystem.mkdir).toHaveBeenCalledWith(first.knowledgeRoot, { recursive: true });
	});

	it('labels Daytona workspaces with stable agent identity', async () => {
		jest.spyOn(configService, 'resolveConfig').mockReturnValue({
			enabled: true,
			provider: 'daytona',
			timeout: 300_000,
			name: undefined,
			image: 'daytonaio/sandbox:0.5.0',
		});
		jest.spyOn(configService, 'resolveNamePrefix').mockReturnValue('Acme Eval');
		createSandboxMock.mockResolvedValue(makeSandbox('daytona'));
		createFilesystemMock.mockReturnValue(makeFilesystem('daytona'));

		await service.withCachedWorkspace('project-1:agent-1:workspace', async (entry) => entry);

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

	it('creates separate cached workspaces for proxied Daytona per user', async () => {
		const cacheKey = 'project-1:agent-1:workspace';
		jest.spyOn(configService, 'isDaytonaProxyEnabled').mockReturnValue(true);
		jest.spyOn(configService, 'resolveConfigForUser').mockImplementation(async (userId) => ({
			enabled: true,
			provider: 'daytona',
			timeout: 300_000,
			daytonaApiUrl: 'https://proxy.example/sandbox',
			image: 'daytonaio/sandbox:proxy',
			getAuthToken: async () => `token-for-${userId}`,
		}));
		createSandboxMock
			.mockResolvedValueOnce(makeSandbox('daytona'))
			.mockResolvedValueOnce(makeSandbox('daytona'));
		createFilesystemMock.mockReturnValue(makeFilesystem('daytona'));

		const first = await service.withCachedWorkspace(
			cacheKey,
			{ userId: 'user-1' },
			async (entry) => entry,
		);
		const second = await service.withCachedWorkspace(
			cacheKey,
			{ userId: 'user-2' },
			async (entry) => entry,
		);

		expect(first).not.toBe(second);
		expect(createSandboxMock).toHaveBeenCalledTimes(2);
		expect(service.getCachedWorkspaceCount()).toBe(2);
	});

	it('does not resolve proxied Daytona config again for cached user workspace', async () => {
		const cacheKey = 'project-1:agent-1:workspace';
		jest.spyOn(configService, 'isDaytonaProxyEnabled').mockReturnValue(true);
		const resolveConfigForUser = jest
			.spyOn(configService, 'resolveConfigForUser')
			.mockResolvedValue({
				enabled: true,
				provider: 'daytona',
				timeout: 300_000,
				daytonaApiUrl: 'https://proxy.example/sandbox',
				image: 'daytonaio/sandbox:proxy',
				getAuthToken: async () => 'token-for-user-1',
			});
		createSandboxMock.mockResolvedValue(makeSandbox('daytona'));
		createFilesystemMock.mockReturnValue(makeFilesystem('daytona'));

		const first = await service.withCachedWorkspace(
			cacheKey,
			{ userId: 'user-1' },
			async (entry) => entry,
		);
		const second = await service.withCachedWorkspace(
			cacheKey,
			{ userId: 'user-1' },
			async (entry) => entry,
		);

		expect(first).toBe(second);
		expect(resolveConfigForUser).toHaveBeenCalledTimes(1);
		expect(createSandboxMock).toHaveBeenCalledTimes(1);
	});

	it('reuses direct Daytona workspaces across users when auth is static', async () => {
		const cacheKey = 'project-1:agent-1:workspace';
		jest.spyOn(configService, 'resolveConfigForUser').mockImplementation(async () => ({
			enabled: true,
			provider: 'daytona',
			timeout: 300_000,
			daytonaApiKey: 'dtn_static',
			image: 'daytonaio/sandbox:0.5.0',
		}));
		createSandboxMock.mockResolvedValue(makeSandbox('daytona'));
		createFilesystemMock.mockReturnValue(makeFilesystem('daytona'));

		const first = await service.withCachedWorkspace(
			cacheKey,
			{ userId: 'user-1' },
			async (entry) => entry,
		);
		const second = await service.withCachedWorkspace(
			cacheKey,
			{ userId: 'user-2' },
			async (entry) => entry,
		);

		expect(first).toBe(second);
		expect(createSandboxMock).toHaveBeenCalledTimes(1);
	});

	it('destroys cached workspaces for the requested agent only', async () => {
		createSandboxMock
			.mockResolvedValueOnce(makeSandbox())
			.mockResolvedValueOnce(makeSandbox())
			.mockResolvedValueOnce(makeSandbox());
		createFilesystemMock.mockReturnValue(makeFilesystem());

		await service.withCachedWorkspace('project-1:agent-1:workspace', async (entry) => entry);
		await service.withCachedWorkspace('project-1:agent-2:workspace', async (entry) => entry);

		await service.destroyCachedWorkspacesForAgent('project-1', 'agent-1');

		expect(service.getCachedWorkspaceCount()).toBe(1);
		await service.withCachedWorkspace('project-1:agent-1:workspace', async (entry) => entry);
		expect(createSandboxMock).toHaveBeenCalledTimes(3);
	});

	it('serializes operations sharing a workspace key', async () => {
		const createGate = createDeferred();
		createSandboxMock.mockImplementation(async () => {
			await createGate.promise;
			return makeSandbox();
		});
		createFilesystemMock.mockReturnValue(makeFilesystem());
		const gate = createDeferred();
		const started: number[] = [];

		const first = service.withCachedWorkspace('same-key', async () => {
			started.push(1);
			await gate.promise;
			return 'first';
		});
		const second = service.withCachedWorkspace('same-key', async () => {
			started.push(2);
			return 'second';
		});

		await flushMicrotasks();
		expect(started).toEqual([]);
		createGate.resolve();
		await flushMicrotasks();
		expect(started).toEqual([1]);
		gate.resolve();
		await expect(Promise.all([first, second])).resolves.toEqual(['first', 'second']);
	});

	it('does not evict a stale workspace while an operation is active', async () => {
		const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(0);
		const firstSandbox = makeSandbox();
		const secondSandbox = makeSandbox();
		createSandboxMock.mockResolvedValueOnce(firstSandbox).mockResolvedValueOnce(secondSandbox);
		createFilesystemMock.mockReturnValue(makeFilesystem());
		const started = createDeferred();
		const release = createDeferred();

		const activeOperation = service.withCachedWorkspace('active-key', async () => {
			started.resolve();
			await release.promise;
			return 'active';
		});
		await started.promise;

		nowSpy.mockReturnValue(10 * 60_000 + 1);
		await service.withCachedWorkspace('other-key', async () => 'other');

		expect(firstSandbox.destroy).not.toHaveBeenCalled();
		release.resolve();
		await expect(activeOperation).resolves.toBe('active');
		nowSpy.mockRestore();
	});

	it('waits for active operations before destroying an agent workspace', async () => {
		const sandbox = makeSandbox();
		createSandboxMock.mockResolvedValue(sandbox);
		createFilesystemMock.mockReturnValue(makeFilesystem());
		const started = createDeferred();
		const release = createDeferred();

		const activeOperation = service.withCachedWorkspace('project-1:agent-1:workspace', async () => {
			started.resolve();
			await release.promise;
			return 'active';
		});
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
});

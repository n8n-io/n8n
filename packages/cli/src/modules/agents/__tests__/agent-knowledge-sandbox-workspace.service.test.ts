import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';

import { AgentKnowledgeSandboxConfigService } from '../agent-knowledge-sandbox-config.service';
import { AgentKnowledgeSandboxWorkspaceService } from '../agent-knowledge-sandbox-workspace.service';
import { AgentKnowledgeService } from '../agent-knowledge.service';
import type { AgentFileRepository } from '../repositories/agent-file.repository';
import type { AgentRepository } from '../repositories/agent.repository';

const createSandboxMock = jest.fn();
const createFilesystemMock = jest.fn();

jest.mock('@n8n/ai-utilities/sandbox', () => ({
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
		status: 'running' as 'running' | 'destroyed' | 'destroying',
		destroy: jest.fn(async () => {}),
	};
}

function makeFilesystem(provider: 'n8n-sandbox' | 'daytona' = 'n8n-sandbox') {
	return {
		id: 'fs-1',
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
		sandbox: makeSandbox('n8n-sandbox'),
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
		cacheSignatureSha1: 'abc123',
		files: [
			{
				id: 'file-1',
				relativePath: 'file-1.txt',
				fileSizeBytes: 10,
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

async function flushMicrotasks(): Promise<void> {
	await new Promise<void>((resolve) => {
		setImmediate(resolve);
	});
}

describe('AgentKnowledgeSandboxWorkspaceService', () => {
	let logger: ReturnType<typeof mock<Logger>>;
	let configService: AgentKnowledgeSandboxConfigService;
	let knowledgeService: AgentKnowledgeService;
	let service: AgentKnowledgeSandboxWorkspaceService;

	beforeEach(() => {
		jest.clearAllMocks();
		logger = mock<Logger>();
		configService = new AgentKnowledgeSandboxConfigService(
			Object.assign(new (jest.requireActual('@n8n/config').InstanceAiConfig)(), {
				sandboxProvider: 'n8n-sandbox',
				n8nSandboxServiceUrl: 'https://sandbox.example.test',
			}),
			Object.assign(new (jest.requireActual('@n8n/config').AgentsConfig)(), {
				aiSandboxEnabled: true,
				aiSandboxNamePrefix: '',
			}),
		);
		knowledgeService = new AgentKnowledgeService(
			mock<AgentRepository>(),
			mock<AgentFileRepository>(),
			mock(),
		);
		service = new AgentKnowledgeSandboxWorkspaceService(logger, configService, knowledgeService);
	});

	function mockN8nSandboxWorkspace() {
		const sandbox = makeSandbox('n8n-sandbox');
		const filesystem = makeFilesystem('n8n-sandbox');
		createSandboxMock.mockResolvedValue(sandbox);
		createFilesystemMock.mockReturnValue(filesystem);
		return { sandbox, filesystem };
	}

	function mockDaytonaWorkspace() {
		const sandbox = makeSandbox('daytona');
		const filesystem = makeFilesystem('daytona');
		createSandboxMock.mockResolvedValue(sandbox);
		createFilesystemMock.mockReturnValue(filesystem);
		return { sandbox, filesystem };
	}

	it('keeps internal root outside knowledge root', async () => {
		const { filesystem } = mockN8nSandboxWorkspace();

		const workspace = await service.withCachedWorkspace('key-1', async (entry) => entry);

		expect(workspace.internalRoot.startsWith(`${workspace.knowledgeRoot}/`)).toBe(false);
		expect(workspace.manifestPath.startsWith(`${workspace.internalRoot}/`)).toBe(true);
		expect(filesystem.mkdir).toHaveBeenCalledWith(
			'/home/user/workspace/.agent-knowledge-internal',
			{ recursive: true },
		);
	});

	it('creates n8n sandbox workspace under /home/user/workspace/agent-knowledge', async () => {
		const { sandbox, filesystem } = mockN8nSandboxWorkspace();

		const workspace = await service.withCachedWorkspace('key-1', async (entry) => entry);

		expect(createSandboxMock).toHaveBeenCalledTimes(1);
		expect(createFilesystemMock).toHaveBeenCalledTimes(1);
		expect(createFilesystemMock).toHaveBeenCalledWith(sandbox);
		expect(filesystem.mkdir).toHaveBeenCalledWith('/home/user/workspace/agent-knowledge', {
			recursive: true,
		});
		expect(filesystem.mkdir).toHaveBeenCalledWith(
			'/home/user/workspace/.agent-knowledge-internal',
			{
				recursive: true,
			},
		);
		expect(workspace.manifestPath).toBe(
			'/home/user/workspace/.agent-knowledge-internal/manifest.json',
		);
	});

	it('creates daytona workspace under /home/daytona/workspace/agent-knowledge', async () => {
		jest.spyOn(configService, 'resolveConfig').mockReturnValue({
			enabled: true,
			provider: 'daytona',
			timeout: 300_000,
			name: undefined,
			image: 'daytonaio/sandbox:0.5.0',
		});
		const { sandbox, filesystem } = mockDaytonaWorkspace();

		const workspace = await service.withCachedWorkspace('key-daytona', async (entry) => entry);

		expect(createSandboxMock).toHaveBeenCalledTimes(1);
		expect(createSandboxMock).toHaveBeenCalledWith(
			expect.objectContaining({
				enabled: true,
				provider: 'daytona',
				image: 'daytonaio/sandbox:0.5.0',
				name: expect.stringMatching(/^agents-knowledgebase-[a-f0-9-]{36}$/),
				labels: expect.objectContaining({
					component: 'agent-knowledge',
				}),
			}),
			{ logger },
		);
		expect(createFilesystemMock).toHaveBeenCalledWith(sandbox);
		expect(filesystem.mkdir).toHaveBeenCalledWith('/home/daytona/workspace/agent-knowledge', {
			recursive: true,
		});
		expect(filesystem.mkdir).toHaveBeenCalledWith(
			'/home/daytona/workspace/.agent-knowledge-internal',
			{ recursive: true },
		);
		expect(workspace.knowledgeRoot).toBe('/home/daytona/workspace/agent-knowledge');
	});

	it('reuses cached workspace for the same key', async () => {
		mockN8nSandboxWorkspace();

		const first = await service.withCachedWorkspace('same-key', async (entry) => entry);
		const second = await service.withCachedWorkspace('same-key', async (entry) => entry);

		expect(createSandboxMock).toHaveBeenCalledTimes(1);
		expect(first).toBe(second);
	});

	it('uses configured Daytona name prefix and labels', async () => {
		jest.spyOn(configService, 'resolveConfig').mockReturnValue({
			enabled: true,
			provider: 'daytona',
			timeout: 300_000,
			name: undefined,
			image: 'daytonaio/sandbox:0.5.0',
		});
		jest.spyOn(configService, 'resolveNamePrefix').mockReturnValue('Acme Eval');
		mockDaytonaWorkspace();

		await service.withCachedWorkspace('project-1:agent-1:abc123', async (entry) => entry);

		expect(createSandboxMock).toHaveBeenCalledWith(
			expect.objectContaining({
				name: expect.stringMatching(/^acme-eval-agents-knowledgebase-[a-f0-9-]+$/),
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

	it('destroys cached workspaces for a matching agent and project', async () => {
		mockN8nSandboxWorkspace();

		await service.withCachedWorkspace('project-1:agent-1:signature-a', async (entry) => entry);
		await service.withCachedWorkspace('project-1:agent-2:signature-b', async (entry) => entry);
		expect(service.getCachedWorkspaceCount()).toBe(2);

		await service.destroyCachedWorkspacesForAgent('project-1', 'agent-1');

		expect(service.getCachedWorkspaceCount()).toBe(1);
		expect(createSandboxMock).toHaveBeenCalledTimes(2);
	});

	it('clears workspace locks when destroying cached agent workspaces', async () => {
		const sandbox = makeSandbox('n8n-sandbox');
		const filesystem = makeFilesystem('n8n-sandbox');
		createSandboxMock.mockResolvedValue(sandbox);
		createFilesystemMock.mockReturnValue(filesystem);

		const gate = createDeferred();
		const started: number[] = [];
		const cacheKey = 'project-1:agent-1:signature-a';

		const first = service.withCachedWorkspace(cacheKey, async () => {
			started.push(1);
			await gate.promise;
			return 'first';
		});

		await flushMicrotasks();
		expect(started).toEqual([1]);

		await service.destroyCachedWorkspacesForAgent('project-1', 'agent-1');

		const second = service.withCachedWorkspace(cacheKey, async () => {
			started.push(2);
			return 'second';
		});

		await flushMicrotasks();
		expect(started).toEqual([1, 2]);

		gate.resolve();
		await expect(Promise.all([first, second])).resolves.toEqual(['first', 'second']);
	});

	it('swallows workspace destroy failures during best-effort invalidation', async () => {
		jest
			.spyOn(service, 'destroyCachedWorkspacesForAgent')
			.mockRejectedValueOnce(new Error('provider unavailable'));

		await expect(
			service.invalidateCachedWorkspacesForAgent('project-1', 'agent-1'),
		).resolves.toBeUndefined();
		expect(logger.warn).toHaveBeenCalledWith(
			'Failed to destroy cached agent knowledge workspaces',
			expect.objectContaining({
				projectId: 'project-1',
				agentId: 'agent-1',
				error: 'provider unavailable',
			}),
		);
	});

	it('creates separate workspaces for different keys', async () => {
		createSandboxMock
			.mockResolvedValueOnce(makeSandbox('n8n-sandbox'))
			.mockResolvedValueOnce(makeSandbox('n8n-sandbox'));
		createFilesystemMock
			.mockReturnValueOnce(makeFilesystem('n8n-sandbox'))
			.mockReturnValueOnce(makeFilesystem('n8n-sandbox'));

		await service.withCachedWorkspace('key-a', async (entry) => entry);
		await service.withCachedWorkspace('key-b', async (entry) => entry);

		expect(createSandboxMock).toHaveBeenCalledTimes(2);
	});

	it('serializes operations for the same key', async () => {
		const sandbox = makeSandbox('n8n-sandbox');
		const filesystem = makeFilesystem('n8n-sandbox');
		const createGate = createDeferred();
		createSandboxMock.mockImplementation(async () => {
			await createGate.promise;
			return sandbox;
		});
		createFilesystemMock.mockReturnValue(filesystem);

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
		expect(started).toEqual([1, 2]);
	});

	it('does not serialize operations for different keys beyond global cap', async () => {
		createSandboxMock
			.mockResolvedValueOnce(makeSandbox('n8n-sandbox'))
			.mockResolvedValueOnce(makeSandbox('n8n-sandbox'));
		createFilesystemMock
			.mockReturnValueOnce(makeFilesystem('n8n-sandbox'))
			.mockReturnValueOnce(makeFilesystem('n8n-sandbox'));

		const gateA = createDeferred();
		const gateB = createDeferred();
		const started: string[] = [];

		const first = service.withCachedWorkspace('key-a', async () => {
			started.push('a');
			await gateA.promise;
			return 'a';
		});
		const second = service.withCachedWorkspace('key-b', async () => {
			started.push('b');
			await gateB.promise;
			return 'b';
		});

		await flushMicrotasks();
		expect(started.sort()).toEqual(['a', 'b']);
		gateA.resolve();
		gateB.resolve();
		await expect(Promise.all([first, second])).resolves.toEqual(['a', 'b']);
	});

	it('destroys unhealthy cached sandbox before recreating', async () => {
		const firstSandbox = makeSandbox('n8n-sandbox');
		const secondSandbox = makeSandbox('n8n-sandbox');
		createSandboxMock.mockResolvedValueOnce(firstSandbox).mockResolvedValueOnce(secondSandbox);
		createFilesystemMock
			.mockReturnValueOnce(makeFilesystem('n8n-sandbox'))
			.mockReturnValueOnce(makeFilesystem('n8n-sandbox'));

		await service.withCachedWorkspace('same-key', async (entry) => entry);
		firstSandbox.status = 'destroyed';

		await service.withCachedWorkspace('same-key', async (entry) => entry);

		expect(createSandboxMock).toHaveBeenCalledTimes(2);
		expect(firstSandbox.destroy).toHaveBeenCalledTimes(1);
	});

	it('destroys sandbox when workspace setup fails', async () => {
		const sandbox = makeSandbox('n8n-sandbox');
		const filesystem = makeFilesystem('n8n-sandbox');
		const setupError = new Error('mkdir failed');
		filesystem.mkdir.mockRejectedValueOnce(setupError);
		createSandboxMock.mockResolvedValue(sandbox);
		createFilesystemMock.mockReturnValue(filesystem);

		await expect(service.withCachedWorkspace('key-1', async (entry) => entry)).rejects.toThrow(
			setupError,
		);

		expect(sandbox.destroy).toHaveBeenCalledTimes(1);
		expect(service.getCachedWorkspaceCount()).toBe(0);
	});

	it('ensureWorkspaceMaterialized returns fresh without materializing when manifest matches', async () => {
		const filesystem = makeFilesystem();
		const workspace = makeWorkspace(filesystem);
		const expected = buildExpectedManifest();
		filesystem.readFile.mockResolvedValue(
			JSON.stringify({
				...expected,
				materializedAt: '2026-06-06T12:00:00.000Z',
			}),
		);
		const materialize = jest.fn(async () => []);

		const result = await service.ensureWorkspaceMaterialized(workspace, expected, materialize);

		expect(result).toEqual({ files: undefined, freshness: { status: 'fresh' } });
		expect(materialize).not.toHaveBeenCalled();
		expect(filesystem.deleteFile).not.toHaveBeenCalled();
	});

	it('ensureWorkspaceMaterialized clears and materializes when manifest is missing', async () => {
		const filesystem = makeFilesystem();
		const workspace = makeWorkspace(filesystem);
		const expected = buildExpectedManifest();
		const materialize = jest.fn(async () => [
			{
				id: 'file-1',
				fileName: 'notes.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 10,
				relativePath: 'file-1.txt',
			},
		]);

		const result = await service.ensureWorkspaceMaterialized(workspace, expected, materialize);

		expect(result.freshness).toEqual({ status: 'stale', reason: 'manifest-missing' });
		expect(filesystem.deleteFile).toHaveBeenCalledWith(workspace.knowledgeRoot, {
			recursive: true,
			force: true,
		});
		expect(filesystem.deleteFile).toHaveBeenCalledWith(workspace.manifestPath, { force: true });
		expect(filesystem.mkdir).toHaveBeenCalledWith(workspace.knowledgeRoot, { recursive: true });
		expect(filesystem.mkdir).toHaveBeenCalledWith(workspace.internalRoot, { recursive: true });
		expect(materialize).toHaveBeenCalledTimes(1);
	});

	it('ensureWorkspaceMaterialized clears and materializes when manifest signature is stale', async () => {
		const filesystem = makeFilesystem();
		const workspace = makeWorkspace(filesystem);
		const expected = buildExpectedManifest();
		filesystem.readFile.mockResolvedValue(
			JSON.stringify({
				...expected,
				cacheSignatureSha1: 'stale-signature',
				materializedAt: '2026-06-06T12:00:00.000Z',
			}),
		);
		const materialize = jest.fn(async () => []);

		const result = await service.ensureWorkspaceMaterialized(workspace, expected, materialize);

		expect(result.freshness).toEqual({ status: 'stale', reason: 'manifest-cache-signature' });
		expect(materialize).toHaveBeenCalledTimes(1);
		expect(filesystem.deleteFile).toHaveBeenCalledWith(workspace.knowledgeRoot, {
			recursive: true,
			force: true,
		});
	});

	it('ensureWorkspaceMaterialized treats invalid JSON as stale', async () => {
		const filesystem = makeFilesystem();
		const workspace = makeWorkspace(filesystem);
		const expected = buildExpectedManifest();
		filesystem.readFile.mockResolvedValue('not json');
		const materialize = jest.fn(async () => []);

		const result = await service.ensureWorkspaceMaterialized(workspace, expected, materialize);

		expect(result.freshness).toEqual({ status: 'stale', reason: 'manifest-invalid-json' });
		expect(materialize).toHaveBeenCalledTimes(1);
	});

	it('ensureWorkspaceMaterialized treats file list mismatch as stale', async () => {
		const filesystem = makeFilesystem();
		const workspace = makeWorkspace(filesystem);
		const expected = buildExpectedManifest();
		filesystem.readFile.mockResolvedValue(
			JSON.stringify({
				...expected,
				files: [
					{
						id: 'file-1',
						relativePath: 'file-1-renamed.txt',
						fileSizeBytes: 10,
					},
				],
				materializedAt: '2026-06-06T12:00:00.000Z',
			}),
		);
		const materialize = jest.fn(async () => []);

		const result = await service.ensureWorkspaceMaterialized(workspace, expected, materialize);

		expect(result.freshness).toEqual({ status: 'stale', reason: 'manifest-files-mismatch' });
		expect(materialize).toHaveBeenCalledTimes(1);
	});

	it('ensureWorkspaceMaterialized treats malformed manifest files as stale', async () => {
		const filesystem = makeFilesystem();
		const workspace = makeWorkspace(filesystem);
		const expected = buildExpectedManifest();
		filesystem.readFile.mockResolvedValue(
			JSON.stringify({
				...expected,
				files: [{}],
				materializedAt: '2026-06-06T12:00:00.000Z',
			}),
		);
		const materialize = jest.fn(async () => []);

		const result = await service.ensureWorkspaceMaterialized(workspace, expected, materialize);

		expect(result.freshness).toEqual({ status: 'stale', reason: 'manifest-files-mismatch' });
		expect(materialize).toHaveBeenCalledTimes(1);
	});

	it('ensureWorkspaceMaterialized re-materializes when knowledge root is missing', async () => {
		const filesystem = makeFilesystem();
		const workspace = makeWorkspace(filesystem);
		const expected = buildExpectedManifest();
		filesystem.readFile.mockResolvedValue(
			JSON.stringify({
				...expected,
				materializedAt: '2026-06-06T12:00:00.000Z',
			}),
		);
		filesystem.exists.mockResolvedValueOnce(false);
		const materialize = jest.fn(async () => []);

		const result = await service.ensureWorkspaceMaterialized(workspace, expected, materialize);

		expect(filesystem.exists).toHaveBeenCalledWith(workspace.knowledgeRoot);
		expect(result.freshness).toEqual({ status: 'stale', reason: 'knowledge-root-missing' });
		expect(materialize).toHaveBeenCalledTimes(1);
	});

	it('ensureWorkspaceMaterialized fails when stale knowledge root cannot be cleared', async () => {
		const filesystem = makeFilesystem();
		const workspace = makeWorkspace(filesystem);
		const expected = buildExpectedManifest();
		const cleanupError = new Error('delete failed');
		filesystem.deleteFile.mockRejectedValueOnce(cleanupError);
		filesystem.exists.mockResolvedValueOnce(true);
		const materialize = jest.fn(async () => []);

		await expect(
			service.ensureWorkspaceMaterialized(workspace, expected, materialize),
		).rejects.toThrow(cleanupError);

		expect(filesystem.exists).toHaveBeenCalledWith(workspace.knowledgeRoot);
		expect(materialize).not.toHaveBeenCalled();
	});

	it('destroyAll destroys cached sandboxes and clears cache', async () => {
		const sandboxA = makeSandbox('n8n-sandbox');
		const sandboxB = makeSandbox('n8n-sandbox');
		createSandboxMock.mockResolvedValueOnce(sandboxA).mockResolvedValueOnce(sandboxB);
		createFilesystemMock
			.mockReturnValueOnce(makeFilesystem('n8n-sandbox'))
			.mockReturnValueOnce(makeFilesystem('n8n-sandbox'));

		await service.withCachedWorkspace('key-a', async (entry) => entry);
		await service.withCachedWorkspace('key-b', async (entry) => entry);
		expect(service.getCachedWorkspaceCount()).toBe(2);

		await service.destroyAll();

		expect(sandboxA.destroy).toHaveBeenCalledTimes(1);
		expect(sandboxB.destroy).toHaveBeenCalledTimes(1);
		expect(service.getCachedWorkspaceCount()).toBe(0);
	});
});

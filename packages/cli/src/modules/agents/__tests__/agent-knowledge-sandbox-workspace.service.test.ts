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
	let service: AgentKnowledgeSandboxWorkspaceService;

	beforeEach(() => {
		jest.clearAllMocks();
		logger = mock<Logger>();
		configService = new AgentKnowledgeSandboxConfigService(
			Object.assign(new (jest.requireActual('@n8n/config').InstanceAiConfig)(), {
				n8nSandboxServiceUrl: 'https://sandbox.example.test',
			}),
			Object.assign(new (jest.requireActual('@n8n/config').AgentsConfig)(), {
				aiSandboxEnabled: true,
				aiSandboxNamePrefix: '',
			}),
		);
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

	it('skips materialization when required files are present and current', async () => {
		const filesystem = makeFilesystem();
		const workspace = makeWorkspace(filesystem);
		const expected = buildExpectedManifest();
		filesystem.readFile.mockResolvedValue(
			JSON.stringify({ ...expected, materializedAt: '2026-06-06T12:00:00.000Z' }),
		);
		const materialize = jest.fn(async () => []);

		const result = await service.ensureWorkspaceContainsFiles(workspace, expected, materialize);

		expect(result).toEqual({ files: undefined, freshness: { status: 'fresh' } });
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
		const materialize = jest.fn(async () => []);

		const result = await service.ensureWorkspaceContainsFiles(workspace, expected, materialize);

		expect(result.freshness).toEqual({ status: 'stale', reason: 'missing-required-files' });
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
		const materialize = jest.fn(async () => []);

		const result = await service.ensureWorkspaceContainsFiles(workspace, expected, materialize);

		expect(result.freshness).toEqual({ status: 'stale', reason: 'manifest-identity' });
		expect(filesystem.deleteFile).toHaveBeenCalledWith(workspace.knowledgeRoot, {
			recursive: true,
			force: true,
		});
		expect(materialize).toHaveBeenCalledTimes(1);
	});
});

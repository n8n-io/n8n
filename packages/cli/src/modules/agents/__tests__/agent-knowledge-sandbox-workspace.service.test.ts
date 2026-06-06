import type { Logger } from '@n8n/backend-common';
import type { CreateSandboxFromImageParams } from '@daytonaio/sdk';
import { mock } from 'jest-mock-extended';

import { AgentKnowledgeSandboxConfigService } from '../agent-knowledge-sandbox-config.service';
import type { AgentKnowledgeSandboxImageService } from '../agent-knowledge-sandbox-image.service';
import { AgentKnowledgeSandboxWorkspaceService } from '../agent-knowledge-sandbox-workspace.service';

const prepareDaytonaImageMock = jest.fn<
	Promise<CreateSandboxFromImageParams['image']>,
	[string?]
>();
const createSandboxMock = jest.fn();
const createFilesystemMock = jest.fn();

jest.mock('../agent-knowledge-sandbox-image.service', () => ({
	AgentKnowledgeSandboxImageService: jest.fn().mockImplementation(() => ({
		prepareDaytonaImage: prepareDaytonaImageMock,
	})),
}));

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
	};
}

function createDeferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((res) => {
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
	let imageService: AgentKnowledgeSandboxImageService;
	let service: AgentKnowledgeSandboxWorkspaceService;

	beforeEach(() => {
		jest.clearAllMocks();
		logger = mock<Logger>();
		configService = new AgentKnowledgeSandboxConfigService(
			Object.assign(new (jest.requireActual('@n8n/config').InstanceAiConfig)(), {
				sandboxProvider: 'n8n-sandbox',
				n8nSandboxServiceUrl: 'https://sandbox.example.test',
			}),
		);
		prepareDaytonaImageMock.mockResolvedValue({
			dockerfile: 'FROM test',
		} as CreateSandboxFromImageParams['image']);
		imageService = {
			prepareDaytonaImage: prepareDaytonaImageMock,
		} as unknown as AgentKnowledgeSandboxImageService;
		service = new AgentKnowledgeSandboxWorkspaceService(logger, configService, imageService);
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
		});
		const { sandbox, filesystem } = mockDaytonaWorkspace();

		const workspace = await service.withCachedWorkspace('key-daytona', async (entry) => entry);

		expect(createSandboxMock).toHaveBeenCalledTimes(1);
		expect(prepareDaytonaImageMock).toHaveBeenCalled();
		expect(createSandboxMock).toHaveBeenCalledWith(
			expect.objectContaining({
				enabled: true,
				provider: 'daytona',
				image: { dockerfile: 'FROM test' },
				name: expect.stringMatching(/^knowledge-[a-f0-9]{12}$/),
				labels: { component: 'agent-knowledge' },
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
		const createGate = createDeferred<void>();
		createSandboxMock.mockImplementation(async () => {
			await createGate.promise;
			return sandbox;
		});
		createFilesystemMock.mockReturnValue(filesystem);

		const gate = createDeferred<void>();
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

		const gateA = createDeferred<void>();
		const gateB = createDeferred<void>();
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

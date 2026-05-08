// Mock external SDKs and other workspace modules so we can drive the factory
// end-to-end in Jest without touching real sandboxes, filesystems, or the
// Mastra runtime.

interface DaytonaCreateParams {
	snapshot?: string;
	image?: { dockerfile: string };
	language?: string;
	ephemeral?: boolean;
	labels?: Record<string, string>;
}

interface DaytonaCreateOptions {
	timeout?: number;
}

const daytonaCreateMock = jest.fn<
	Promise<{ id: string }>,
	[DaytonaCreateParams, DaytonaCreateOptions?]
>();
const daytonaDeleteMock = jest.fn<Promise<void>, [unknown]>().mockResolvedValue(undefined);

jest.mock('@daytonaio/sdk', () => {
	class Daytona {
		create = daytonaCreateMock;
		delete = daytonaDeleteMock;
	}
	class DaytonaError extends Error {
		statusCode?: number;
		constructor(message: string, statusCode?: number) {
			super(message);
			this.statusCode = statusCode;
		}
	}
	class Image {
		dockerfile = 'FROM node:20';
		static base() {
			return new Image();
		}
		runCommands() {
			return this;
		}
	}
	return { Daytona, DaytonaError, Image };
});

jest.mock('@mastra/core/workspace', () => {
	class LocalSandbox {
		constructor(public opts: unknown) {}
	}
	class LocalFilesystem {
		constructor(public opts: unknown) {}
	}
	class Workspace {
		sandbox: { processes?: { list: jest.Mock; kill: jest.Mock; get: jest.Mock } } & {
			[k: string]: unknown;
		};
		filesystem: { writeFile: jest.Mock };
		constructor(public opts: { sandbox: unknown; filesystem: unknown }) {
			this.sandbox = {
				...(opts.sandbox as Record<string, unknown>),
				processes: {
					list: jest.fn().mockResolvedValue([]),
					kill: jest.fn().mockResolvedValue(undefined),
					get: jest.fn().mockResolvedValue(undefined),
				},
			};
			this.filesystem = { writeFile: jest.fn().mockResolvedValue(undefined) };
		}
		init = jest.fn().mockResolvedValue(undefined);
	}
	return { LocalSandbox, LocalFilesystem, Workspace };
});

jest.mock('@mastra/daytona', () => {
	class DaytonaSandbox {
		constructor(public opts: unknown) {}
	}
	return { DaytonaSandbox };
});

jest.mock('../daytona-filesystem', () => {
	class DaytonaFilesystem {
		writeFile = jest.fn().mockResolvedValue(undefined);
		constructor(public sandbox: unknown) {}
	}
	return { DaytonaFilesystem };
});

jest.mock('../n8n-sandbox-filesystem', () => {
	class N8nSandboxFilesystem {
		writeFile = jest.fn().mockResolvedValue(undefined);
		constructor(public sandbox: unknown) {}
	}
	return { N8nSandboxFilesystem };
});

type MockN8nSandbox = { destroy: jest.Mock };
const capturedSandboxes: MockN8nSandbox[] = [];

jest.mock('../n8n-sandbox-sandbox', () => ({
	N8nSandboxServiceSandbox: class {
		destroy = jest.fn(async () => {
			await Promise.resolve();
		});
		constructor(public opts: Record<string, unknown>) {
			capturedSandboxes.push(this as unknown as MockN8nSandbox);
		}
	},
}));

jest.mock('../n8n-sandbox-image-manager', () => ({
	N8nSandboxImageManager: class {
		getDockerfile() {
			return 'FROM node:20';
		}
	},
}));

jest.mock('../pack-workspace-sdk', () => ({
	packWorkspaceSdk: jest.fn().mockResolvedValue(null),
	isLinkWorkspaceSdkEnabled: jest.fn().mockReturnValue(false),
}));

jest.mock('../sandbox-setup', () => ({
	formatNodeCatalogLine: jest.fn((x: { name?: string }) => x.name ?? ''),
	getWorkspaceRoot: jest.fn(async () => await Promise.resolve('/home/daytona/workspace')),
	setupSandboxWorkspace: jest.fn(async () => await Promise.resolve()),
	PACKAGE_JSON: '{}',
	TSCONFIG_JSON: '{}',
	BUILD_MJS: '',
}));

jest.mock('../sandbox-fs', () => ({
	runInSandbox: jest.fn(async () => await Promise.resolve({ exitCode: 0, stdout: '', stderr: '' })),
	writeFileViaSandbox: jest.fn(async () => {
		await Promise.resolve();
	}),
}));

import type { Logger } from '../../logger';
import type { InstanceAiContext } from '../../types';
import { BuilderSandboxFactory } from '../builder-sandbox-factory';
import type { SandboxConfig } from '../create-workspace';
import { SnapshotManager } from '../snapshot-manager';

const NOOP_LOGGER: Logger = {
	info: () => {},
	warn: () => {},
	error: () => {},
	debug: () => {},
};

function makeContext(): InstanceAiContext {
	return {
		nodeService: {
			listSearchable: jest.fn().mockResolvedValue([{ name: 'node-a' }]),
		},
	} as never;
}

function makeDaytonaConfig(overrides: Partial<SandboxConfig> = {}): SandboxConfig {
	return {
		enabled: true,
		provider: 'daytona',
		daytonaApiKey: 'test-key',
		daytonaApiUrl: 'https://api.daytona.io',
		n8nVersion: '1.123.0',
		...overrides,
	} as SandboxConfig;
}

function makeN8nSandboxConfig(): SandboxConfig {
	return {
		enabled: true,
		provider: 'n8n-sandbox',
		serviceUrl: 'https://sandbox.example.com',
		apiKey: 'secret',
	} as SandboxConfig;
}

describe('BuilderSandboxFactory createDaytona snapshot branching', () => {
	beforeEach(() => {
		daytonaCreateMock.mockReset();
		daytonaCreateMock.mockResolvedValue({ id: 'sandbox-id' });
		daytonaDeleteMock.mockClear();
	});

	it('passes { snapshot } when ensureSnapshot returns a name', async () => {
		const config = makeDaytonaConfig();
		const snapshotManager = new SnapshotManager('node:20', NOOP_LOGGER, '1.123.0');
		jest.spyOn(snapshotManager, 'ensureSnapshot').mockResolvedValue('n8n/instance-ai:1.123.0');

		const factory = new BuilderSandboxFactory(config, snapshotManager, NOOP_LOGGER);
		await factory.create('builder-1', makeContext());

		expect(daytonaCreateMock).toHaveBeenCalledTimes(1);
		const [params] = daytonaCreateMock.mock.calls[0];
		expect(params.snapshot).toBe('n8n/instance-ai:1.123.0');
		expect(params.image).toBeUndefined();
	});

	it('passes { image } when ensureSnapshot returns null', async () => {
		const config = makeDaytonaConfig();
		const snapshotManager = new SnapshotManager('node:20', NOOP_LOGGER, '1.123.0');
		jest.spyOn(snapshotManager, 'ensureSnapshot').mockResolvedValue(null);
		const ensureImageSpy = jest.spyOn(snapshotManager, 'ensureImage');

		const factory = new BuilderSandboxFactory(config, snapshotManager, NOOP_LOGGER);
		await factory.create('builder-1', makeContext());

		expect(daytonaCreateMock).toHaveBeenCalledTimes(1);
		const [params] = daytonaCreateMock.mock.calls[0];
		expect(params.image).toBeDefined();
		expect(params.snapshot).toBeUndefined();
		expect(ensureImageSpy).toHaveBeenCalled();
	});

	it('passes mode "direct" to ensureSnapshot when getAuthToken is absent', async () => {
		const config = makeDaytonaConfig();
		const snapshotManager = new SnapshotManager('node:20', NOOP_LOGGER, '1.123.0');
		const ensureSnapshotSpy = jest.spyOn(snapshotManager, 'ensureSnapshot').mockResolvedValue(null);

		const factory = new BuilderSandboxFactory(config, snapshotManager, NOOP_LOGGER);
		await factory.create('builder-1', makeContext());

		expect(ensureSnapshotSpy).toHaveBeenCalledWith(expect.anything(), 'direct');
	});

	it('passes mode "proxy" to ensureSnapshot when getAuthToken is present', async () => {
		const config = makeDaytonaConfig({
			getAuthToken: jest.fn().mockResolvedValue('jwt-token'),
		} as Partial<SandboxConfig>);
		const snapshotManager = new SnapshotManager('node:20', NOOP_LOGGER, '1.123.0');
		const ensureSnapshotSpy = jest.spyOn(snapshotManager, 'ensureSnapshot').mockResolvedValue(null);

		const factory = new BuilderSandboxFactory(config, snapshotManager, NOOP_LOGGER);
		await factory.create('builder-1', makeContext());

		expect(ensureSnapshotSpy).toHaveBeenCalledWith(expect.anything(), 'proxy');
	});
});

describe('BuilderSandboxFactory createDaytona error reporting', () => {
	beforeEach(() => {
		daytonaCreateMock.mockReset();
		daytonaDeleteMock.mockClear();
	});

	function makeManager(): SnapshotManager {
		const manager = new SnapshotManager('node:20', NOOP_LOGGER, '1.123.0');
		jest.spyOn(manager, 'ensureSnapshot').mockResolvedValue('n8n/instance-ai:1.123.0');
		jest.spyOn(manager, 'ensureImage').mockReturnValue({ dockerfile: 'FROM node:20' } as never);
		return manager;
	}

	it('falls back to declarative image when create with snapshot fails', async () => {
		const config = makeDaytonaConfig();
		const snapshotManager = makeManager();
		const errorReporter = { error: jest.fn() };
		daytonaCreateMock
			.mockRejectedValueOnce(
				Object.assign(new Error('Snapshot n8n/instance-ai:1.123.0 not found'), {
					statusCode: 400,
				}),
			)
			.mockResolvedValueOnce({ id: 'sandbox-id' });

		const factory = new BuilderSandboxFactory(config, snapshotManager, NOOP_LOGGER, errorReporter);
		await factory.create('builder-1', makeContext());

		expect(daytonaCreateMock).toHaveBeenCalledTimes(2);
		expect(daytonaCreateMock.mock.calls[0][0].snapshot).toBe('n8n/instance-ai:1.123.0');
		expect(daytonaCreateMock.mock.calls[1][0].image).toBeDefined();
		expect(daytonaCreateMock.mock.calls[1][0].snapshot).toBeUndefined();
	});

	it('reports snapshot-strategy create failures to the error reporter', async () => {
		const config = makeDaytonaConfig();
		const snapshotManager = makeManager();
		const errorReporter = { error: jest.fn() };
		const error = Object.assign(new Error('Snapshot not found'), { statusCode: 400 });
		daytonaCreateMock.mockRejectedValueOnce(error).mockResolvedValueOnce({ id: 'sandbox-id' });

		const factory = new BuilderSandboxFactory(config, snapshotManager, NOOP_LOGGER, errorReporter);
		await factory.create('builder-1', makeContext());

		expect(errorReporter.error).toHaveBeenCalledWith(
			error,
			expect.objectContaining({
				tags: expect.objectContaining({
					component: 'builder-sandbox-factory',
					strategy: 'snapshot',
				}) as unknown,
			}),
		);
	});

	it('reports image-strategy create failures and rethrows', async () => {
		const config = makeDaytonaConfig();
		const snapshotManager = new SnapshotManager('node:20', NOOP_LOGGER, '1.123.0');
		jest.spyOn(snapshotManager, 'ensureSnapshot').mockResolvedValue(null);
		jest
			.spyOn(snapshotManager, 'ensureImage')
			.mockReturnValue({ dockerfile: 'FROM node:20' } as never);
		const errorReporter = { error: jest.fn() };
		const error = new Error('Daytona is on fire');
		daytonaCreateMock.mockRejectedValue(error);

		const factory = new BuilderSandboxFactory(config, snapshotManager, NOOP_LOGGER, errorReporter);

		await expect(factory.create('builder-1', makeContext())).rejects.toThrow('Daytona is on fire');
		expect(errorReporter.error).toHaveBeenCalledWith(
			error,
			expect.objectContaining({
				tags: expect.objectContaining({
					component: 'builder-sandbox-factory',
					strategy: 'image',
				}) as unknown,
			}),
		);
	});

	it('reports both strategies and rethrows when both fail', async () => {
		const config = makeDaytonaConfig();
		const snapshotManager = makeManager();
		const errorReporter = { error: jest.fn() };
		const snapshotError = Object.assign(new Error('Snapshot not found'), { statusCode: 400 });
		const imageError = new Error('Image build failed');
		daytonaCreateMock.mockRejectedValueOnce(snapshotError).mockRejectedValueOnce(imageError);

		const factory = new BuilderSandboxFactory(config, snapshotManager, NOOP_LOGGER, errorReporter);

		await expect(factory.create('builder-1', makeContext())).rejects.toThrow('Image build failed');
		expect(errorReporter.error).toHaveBeenCalledTimes(2);
		expect(errorReporter.error).toHaveBeenNthCalledWith(
			1,
			snapshotError,
			expect.objectContaining({
				tags: expect.objectContaining({ strategy: 'snapshot' }) as unknown,
			}),
		);
		expect(errorReporter.error).toHaveBeenNthCalledWith(
			2,
			imageError,
			expect.objectContaining({
				tags: expect.objectContaining({ strategy: 'image' }) as unknown,
			}),
		);
	});
});

describe('BuilderSandboxFactory.createN8nSandbox cleanup on failure', () => {
	beforeEach(() => {
		capturedSandboxes.length = 0;
	});

	it('destroys the remote sandbox when a post-creation step throws', async () => {
		// Force `getWorkspaceRoot` to throw so the post-creation workspace setup
		// fails. Any step after `new N8nSandboxServiceSandbox(...)` that can throw
		// (workspace.init, getWorkspaceRoot, catalog write, SDK link) should
		// funnel through the same destroy path.
		// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
		const sandboxSetup = require('../sandbox-setup') as typeof import('../sandbox-setup');
		(sandboxSetup.getWorkspaceRoot as jest.Mock).mockRejectedValueOnce(new Error('setup boom'));

		const factory = new BuilderSandboxFactory(makeN8nSandboxConfig(), undefined);

		await expect(factory.create('b-1', makeContext())).rejects.toThrow('setup boom');

		expect(capturedSandboxes).toHaveLength(1);
		expect(capturedSandboxes[0].destroy).toHaveBeenCalledTimes(1);
	});

	it('swallows destroy errors so the original failure is surfaced, not the cleanup error', async () => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
		const sandboxSetup = require('../sandbox-setup') as typeof import('../sandbox-setup');
		(sandboxSetup.getWorkspaceRoot as jest.Mock).mockRejectedValueOnce(new Error('setup boom'));

		const factory = new BuilderSandboxFactory(makeN8nSandboxConfig(), undefined);
		const createPromise = factory.create('b-2', makeContext());

		// Arrange: when createN8nSandbox tries to destroy after the error, that
		// call also throws. The user-facing error must still be the original.
		await expect(createPromise).rejects.toThrow('setup boom');

		expect(capturedSandboxes).toHaveLength(1);
		// The next spawn should also destroy cleanly even after a prior destroy failed.
		capturedSandboxes[0].destroy.mockRejectedValueOnce(new Error('destroy also failed'));
	});

	it('returns a cleanup handle that destroys the sandbox when create succeeds', async () => {
		const factory = new BuilderSandboxFactory(makeN8nSandboxConfig(), undefined);
		const bw = await factory.create('b-3', makeContext());

		expect(capturedSandboxes).toHaveLength(1);
		expect(capturedSandboxes[0].destroy).not.toHaveBeenCalled();

		await bw.cleanup();

		expect(capturedSandboxes[0].destroy).toHaveBeenCalledTimes(1);
	});
});

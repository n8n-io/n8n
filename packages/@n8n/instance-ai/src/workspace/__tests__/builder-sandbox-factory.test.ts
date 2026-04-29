// Mock external SDKs and other workspace modules so we can test the factory
// in isolation. The point of this test file is to verify the snapshot vs
// declarative-image branching in createDaytona — nothing else.

const daytonaCreateMock = jest.fn();
const daytonaDeleteMock = jest.fn().mockResolvedValue(undefined);

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
		sandbox: { processes?: { list: jest.Mock; kill: jest.Mock; get: jest.Mock } };
		filesystem: { writeFile: jest.Mock };
		constructor(public opts: { sandbox: unknown; filesystem: unknown }) {
			this.sandbox = {
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

jest.mock('../n8n-sandbox-sandbox', () => {
	class N8nSandboxServiceSandbox {
		constructor(public opts: unknown) {}
		destroy = jest.fn().mockResolvedValue(undefined);
	}
	return { N8nSandboxServiceSandbox };
});

jest.mock('../n8n-sandbox-image-manager', () => {
	class N8nSandboxImageManager {
		getDockerfile() {
			return 'FROM node:20';
		}
	}
	return { N8nSandboxImageManager };
});

jest.mock('../pack-workspace-sdk', () => ({
	packWorkspaceSdk: jest.fn().mockResolvedValue(null),
}));

jest.mock('../sandbox-setup', () => ({
	formatNodeCatalogLine: () => 'mock-catalog-line',
	getWorkspaceRoot: () => Promise.resolve('/home/daytona/workspace'),
	setupSandboxWorkspace: jest.fn().mockResolvedValue(undefined),
	PACKAGE_JSON: '{}',
	TSCONFIG_JSON: '{}',
	BUILD_MJS: '',
}));

jest.mock('../sandbox-fs', () => ({
	runInSandbox: jest.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' }),
	writeFileViaSandbox: jest.fn().mockResolvedValue(undefined),
}));

import type { SandboxConfig } from '../create-workspace';
import type { Logger } from '../../logger';
import type { InstanceAiContext } from '../../types';

import { BuilderSandboxFactory } from '../builder-sandbox-factory';
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
			listSearchable: jest.fn().mockResolvedValue([]),
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
				}),
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
				}),
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
			expect.objectContaining({ tags: expect.objectContaining({ strategy: 'snapshot' }) }),
		);
		expect(errorReporter.error).toHaveBeenNthCalledWith(
			2,
			imageError,
			expect.objectContaining({ tags: expect.objectContaining({ strategy: 'image' }) }),
		);
	});
});

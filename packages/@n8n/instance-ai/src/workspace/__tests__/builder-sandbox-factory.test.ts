// Hoisted mock instance the fake Daytona constructor returns — gives tests a
// single handle to inspect `create`, `delete`, and the snapshot namespace.
const mockDaytonaInstance: {
	snapshot: { get: jest.Mock; create: jest.Mock };
	create: jest.Mock;
	delete: jest.Mock;
} = {
	snapshot: { get: jest.fn(), create: jest.fn() },
	create: jest.fn(),
	delete: jest.fn(),
};

jest.mock('@daytonaio/sdk', () => {
	const Daytona = jest.fn(() => mockDaytonaInstance);
	return { Daytona, Image: { base: jest.fn() } };
});

jest.mock('@mastra/core/workspace', () => {
	class LocalSandbox {
		readonly type = 'local';
		constructor(public opts: { workingDirectory: string }) {}
	}
	class LocalFilesystem {
		readonly type = 'local-fs';
		constructor(public opts: { basePath: string }) {}
	}
	class Workspace {
		filesystem = { writeFile: jest.fn().mockResolvedValue(undefined) };
		sandbox = { processes: undefined };
		constructor(public opts: { sandbox: unknown; filesystem: unknown }) {}
		async init(): Promise<void> {}
	}
	return { LocalSandbox, LocalFilesystem, Workspace };
});

jest.mock('@mastra/daytona', () => {
	class DaytonaSandbox {
		readonly type = 'daytona';
		constructor(public opts: Record<string, unknown>) {}
	}
	return { DaytonaSandbox };
});

jest.mock('../daytona-filesystem', () => ({ DaytonaFilesystem: class {} }));
jest.mock('../n8n-sandbox-filesystem', () => ({ N8nSandboxFilesystem: class {} }));
jest.mock('../n8n-sandbox-sandbox', () => ({ N8nSandboxServiceSandbox: class {} }));
jest.mock('../n8n-sandbox-image-manager', () => ({ N8nSandboxImageManager: class {} }));

jest.mock('../sandbox-setup', () => ({
	formatNodeCatalogLine: (n: { nodeType: string }) => `line:${n.nodeType}`,
	getWorkspaceRoot: jest.fn().mockResolvedValue('/workspace'),
	setupSandboxWorkspace: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../sandbox-fs', () => ({
	writeFileViaSandbox: jest.fn().mockResolvedValue(undefined),
}));

import type { Logger } from '../../logger';
import type { InstanceAiContext } from '../../types';
import { BuilderSandboxFactory } from '../builder-sandbox-factory';
import type { SandboxConfig } from '../create-workspace';
import { SnapshotManager } from '../snapshot-manager';

function createLogger(): Logger {
	return {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
	};
}

function createContext(): InstanceAiContext {
	return {
		nodeService: {
			listSearchable: jest
				.fn()
				.mockResolvedValue([{ nodeType: 'n8n-nodes-base.set' }, { nodeType: 'n8n-nodes-base.if' }]),
		},
	} as unknown as InstanceAiContext;
}

describe('BuilderSandboxFactory.createDaytona', () => {
	const daytonaConfig: SandboxConfig = {
		enabled: true,
		provider: 'daytona',
		daytonaApiUrl: 'https://api.daytona.io',
		daytonaApiKey: 'test-key',
		n8nVersion: '1.97.0',
	};

	let snapshotManager: SnapshotManager;
	let ensureSnapshotSpy: jest.SpyInstance;

	beforeEach(() => {
		mockDaytonaInstance.snapshot.get.mockReset();
		mockDaytonaInstance.snapshot.create.mockReset();
		mockDaytonaInstance.create.mockReset().mockResolvedValue({ id: 'sb-test' });
		mockDaytonaInstance.delete.mockReset().mockResolvedValue(undefined);

		snapshotManager = new SnapshotManager(undefined, 'n8n-instance-ai-1.97.0', createLogger());
		ensureSnapshotSpy = jest
			.spyOn(snapshotManager, 'ensureSnapshot')
			.mockResolvedValue('n8n-instance-ai-1.97.0');
	});

	afterEach(() => {
		ensureSnapshotSpy.mockRestore();
	});

	it('calls daytona.create with the snapshot name and no image', async () => {
		const factory = new BuilderSandboxFactory(daytonaConfig, snapshotManager);

		await factory.create('builder-1', createContext());

		expect(mockDaytonaInstance.create).toHaveBeenCalledTimes(1);
		const [params] = mockDaytonaInstance.create.mock.calls[0] as [
			{
				snapshot: string;
				image?: unknown;
				language: string;
				ephemeral: boolean;
				labels: Record<string, string>;
			},
		];
		expect(params.snapshot).toBe('n8n-instance-ai-1.97.0');
		expect(params).not.toHaveProperty('image');
		expect(params.language).toBe('typescript');
		expect(params.ephemeral).toBe(true);
		expect(params.labels).toEqual({ 'n8n-builder': 'builder-1' });
	});

	it('awaits ensureSnapshot before calling daytona.create', async () => {
		const factory = new BuilderSandboxFactory(daytonaConfig, snapshotManager);
		const order: string[] = [];
		ensureSnapshotSpy.mockImplementation(async () => {
			await Promise.resolve();
			order.push('ensureSnapshot');
			return 'n8n-instance-ai-1.97.0';
		});
		mockDaytonaInstance.create.mockImplementation(async () => {
			await Promise.resolve();
			order.push('create');
			return { id: 'sb-test' };
		});

		await factory.create('builder-2', createContext());

		expect(order).toEqual(['ensureSnapshot', 'create']);
	});

	it('deletes the sandbox when post-create workspace init fails', async () => {
		const workspaceModule: { Workspace: { prototype: { init: jest.Mock } } } =
			jest.requireMock('@mastra/core/workspace');
		const initSpy = jest
			.spyOn(workspaceModule.Workspace.prototype, 'init')
			.mockRejectedValueOnce(new Error('init failed'));

		const factory = new BuilderSandboxFactory(daytonaConfig, snapshotManager);

		await expect(factory.create('builder-fail', createContext())).rejects.toThrow('init failed');
		expect(mockDaytonaInstance.delete).toHaveBeenCalledTimes(1);
		initSpy.mockRestore();
	});
});

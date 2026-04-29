// Tight mocks so we can drive `createN8nSandbox` end-to-end in Jest without
// touching real sandboxes, filesystems, or the Mastra runtime.
jest.mock('@mastra/core/workspace', () => {
	class Workspace {
		sandbox: unknown;
		filesystem: unknown;
		constructor(opts: { sandbox: unknown; filesystem: unknown }) {
			this.sandbox = opts.sandbox;
			this.filesystem = opts.filesystem;
		}
		async init(): Promise<void> {
			await Promise.resolve();
		}
	}
	class LocalSandbox {}
	class LocalFilesystem {}
	return { Workspace, LocalSandbox, LocalFilesystem };
});

jest.mock('@mastra/daytona', () => ({ DaytonaSandbox: class {} }));
jest.mock('@daytonaio/sdk', () => ({ Daytona: class {} }));

jest.mock('../daytona-filesystem', () => ({
	DaytonaFilesystem: class {
		constructor(public sandbox: unknown) {}
	},
}));

jest.mock('../n8n-sandbox-filesystem', () => ({
	N8nSandboxFilesystem: class {
		constructor(public sandbox: unknown) {}
		writeFile = jest.fn(async () => {
			await Promise.resolve();
		});
	},
}));

jest.mock('../n8n-sandbox-image-manager', () => ({
	N8nSandboxImageManager: class {
		getDockerfile() {
			return 'FROM node:20';
		}
	},
}));

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

jest.mock('../sandbox-fs', () => ({
	runInSandbox: jest.fn(async () => await Promise.resolve({ exitCode: 0, stdout: '', stderr: '' })),
	writeFileViaSandbox: jest.fn(async () => {
		await Promise.resolve();
	}),
}));

jest.mock('../sandbox-setup', () => ({
	getWorkspaceRoot: jest.fn(async () => await Promise.resolve('/workspace')),
	formatNodeCatalogLine: jest.fn((x: { name?: string }) => x.name ?? ''),
	setupSandboxWorkspace: jest.fn(async () => await Promise.resolve()),
}));

import type { InstanceAiContext } from '../../types';
import type { SandboxConfig } from '../create-workspace';

const { BuilderSandboxFactory } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../builder-sandbox-factory') as typeof import('../builder-sandbox-factory');

function makeContext(): InstanceAiContext {
	return {
		nodeService: {
			listSearchable: jest.fn(async () => await Promise.resolve([{ name: 'node-a' }])),
		},
	} as unknown as InstanceAiContext;
}

function makeConfig(): SandboxConfig {
	return {
		enabled: true,
		provider: 'n8n-sandbox',
		serviceUrl: 'https://sandbox.example.com',
		apiKey: 'secret',
	} as SandboxConfig;
}

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

		const factory = new BuilderSandboxFactory(makeConfig(), undefined);

		await expect(factory.create('b-1', makeContext())).rejects.toThrow('setup boom');

		expect(capturedSandboxes).toHaveLength(1);
		expect(capturedSandboxes[0].destroy).toHaveBeenCalledTimes(1);
	});

	it('swallows destroy errors so the original failure is surfaced, not the cleanup error', async () => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
		const sandboxSetup = require('../sandbox-setup') as typeof import('../sandbox-setup');
		(sandboxSetup.getWorkspaceRoot as jest.Mock).mockRejectedValueOnce(new Error('setup boom'));

		const factory = new BuilderSandboxFactory(makeConfig(), undefined);
		const createPromise = factory.create('b-2', makeContext());

		// Arrange: when createN8nSandbox tries to destroy after the error, that
		// call also throws. The user-facing error must still be the original.
		await expect(createPromise).rejects.toThrow('setup boom');

		expect(capturedSandboxes).toHaveLength(1);
		// The next spawn should also destroy cleanly even after a prior destroy failed.
		capturedSandboxes[0].destroy.mockRejectedValueOnce(new Error('destroy also failed'));
	});

	it('returns a cleanup handle that destroys the sandbox when create succeeds', async () => {
		const factory = new BuilderSandboxFactory(makeConfig(), undefined);
		const bw = await factory.create('b-3', makeContext());

		expect(capturedSandboxes).toHaveLength(1);
		expect(capturedSandboxes[0].destroy).not.toHaveBeenCalled();

		await bw.cleanup();

		expect(capturedSandboxes[0].destroy).toHaveBeenCalledTimes(1);
	});
});

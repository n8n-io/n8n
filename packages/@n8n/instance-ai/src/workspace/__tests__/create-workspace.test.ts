jest.mock('@mastra/core/workspace', () => {
	class LocalSandbox {
		readonly type = 'local';
		constructor(public opts: { workingDirectory: string }) {}
	}
	class LocalFilesystem {
		readonly type = 'local-fs';
		constructor(public opts: { basePath: string }) {}
	}
	class MockWorkspace {
		constructor(public opts: { sandbox: unknown; filesystem: unknown }) {}
	}
	return { LocalSandbox, LocalFilesystem, Workspace: MockWorkspace };
});

jest.mock('@mastra/daytona', () => {
	class DaytonaSandbox {
		readonly type = 'daytona';
		constructor(public opts: Record<string, unknown>) {}
	}
	return { DaytonaSandbox };
});

jest.mock('../daytona-filesystem', () => {
	class DaytonaFilesystem {
		readonly type = 'daytona-fs';
		constructor(public sandbox: unknown) {}
	}
	return { DaytonaFilesystem };
});

jest.mock('../n8n-sandbox-sandbox', () => {
	class N8nSandboxServiceSandbox {
		readonly type = 'n8n-sandbox';
		constructor(public opts: Record<string, unknown>) {}
	}
	return { N8nSandboxServiceSandbox };
});

jest.mock('../n8n-sandbox-filesystem', () => {
	class N8nSandboxFilesystem {
		readonly type = 'n8n-sandbox-fs';
		constructor(public sandbox: unknown) {}
	}
	return { N8nSandboxFilesystem };
});

// ---------------------------------------------------------------------------
// Typed mock classes — avoids `any` from jest.requireMock
// ---------------------------------------------------------------------------

interface MockWithOpts<T> {
	opts: T;
}

type MockLocalSandboxCtor = new (opts: {
	workingDirectory: string;
}) => MockWithOpts<{ workingDirectory: string }>;
type MockLocalFilesystemCtor = new (opts: { basePath: string }) => MockWithOpts<{
	basePath: string;
}>;
type MockWorkspaceCtor = new (opts: {
	sandbox: unknown;
	filesystem: unknown;
}) => MockWithOpts<{ sandbox: unknown; filesystem: unknown }>;
type MockDaytonaSandboxCtor = new (
	opts: Record<string, unknown>,
) => MockWithOpts<Record<string, unknown>>;
type MockDaytonaFilesystemCtor = new (sandbox: unknown) => { sandbox: unknown };
type MockN8nSandboxCtor = new (
	opts: Record<string, unknown>,
) => MockWithOpts<Record<string, unknown>>;
type MockN8nFilesystemCtor = new (sandbox: unknown) => { sandbox: unknown };

const {
	LocalSandbox,
	LocalFilesystem,
	Workspace: WorkspaceMock,
}: {
	LocalSandbox: MockLocalSandboxCtor;
	LocalFilesystem: MockLocalFilesystemCtor;
	Workspace: MockWorkspaceCtor;
} = jest.requireMock('@mastra/core/workspace');

const { DaytonaSandbox }: { DaytonaSandbox: MockDaytonaSandboxCtor } =
	jest.requireMock('@mastra/daytona');

const { DaytonaFilesystem }: { DaytonaFilesystem: MockDaytonaFilesystemCtor } =
	jest.requireMock('../daytona-filesystem');

const { N8nSandboxServiceSandbox }: { N8nSandboxServiceSandbox: MockN8nSandboxCtor } =
	jest.requireMock('../n8n-sandbox-sandbox');

const { N8nSandboxFilesystem }: { N8nSandboxFilesystem: MockN8nFilesystemCtor } = jest.requireMock(
	'../n8n-sandbox-filesystem',
);

import { type SandboxConfig, createSandbox, createWorkspace } from '../create-workspace';

describe('createSandbox', () => {
	const originalEnv = process.env.NODE_ENV;

	afterEach(() => {
		process.env.NODE_ENV = originalEnv;
	});

	it('should return undefined when sandbox is disabled', async () => {
		const config: SandboxConfig = { enabled: false, provider: 'local' };

		const result = await createSandbox(config);

		expect(result).toBeUndefined();
	});

	it('should return a DaytonaSandbox for "daytona" provider', async () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: 'https://api.daytona.io',
			daytonaApiKey: 'test-key',
			image: 'node:20',
			timeout: 60_000,
		};

		const result = await createSandbox(config);

		expect(result).toBeInstanceOf(DaytonaSandbox);
		expect((result as unknown as MockWithOpts<Record<string, unknown>>).opts).toEqual(
			expect.objectContaining({
				apiKey: 'test-key',
				apiUrl: 'https://api.daytona.io',
				image: 'node:20',
				language: 'typescript',
				timeout: 60_000,
			}),
		);
	});

	it('should resolve apiKey via getAuthToken in proxy mode', async () => {
		const getAuthToken = jest.fn().mockResolvedValue('jwt-token-123');
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: 'https://proxy.example.com',
			getAuthToken,
			timeout: 60_000,
		};

		const result = await createSandbox(config);

		expect(getAuthToken).toHaveBeenCalledTimes(1);
		expect(result).toBeInstanceOf(DaytonaSandbox);
		expect((result as unknown as MockWithOpts<Record<string, unknown>>).opts).toEqual(
			expect.objectContaining({
				apiKey: 'jwt-token-123',
				apiUrl: 'https://proxy.example.com',
			}),
		);
	});

	it('should use default timeout of 300_000 for "daytona" provider when not specified', async () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
		};

		const result = await createSandbox(config);

		expect(result).toBeInstanceOf(DaytonaSandbox);
		expect((result as unknown as MockWithOpts<Record<string, unknown>>).opts.timeout).toBe(300_000);
	});

	it('should not include image in DaytonaSandbox config when not specified', async () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
		};

		const result = await createSandbox(config);

		expect(result).toBeInstanceOf(DaytonaSandbox);
		expect((result as unknown as MockWithOpts<Record<string, unknown>>).opts).not.toHaveProperty(
			'image',
		);
	});

	it('should return a LocalSandbox for "local" provider in non-production', async () => {
		process.env.NODE_ENV = 'development';
		const config: SandboxConfig = { enabled: true, provider: 'local' };

		const result = await createSandbox(config);

		expect(result).toBeInstanceOf(LocalSandbox);
		expect((result as unknown as MockWithOpts<{ workingDirectory: string }>).opts).toEqual({
			workingDirectory: './workspace',
		});
	});

	it('should throw in production when provider is "local"', async () => {
		process.env.NODE_ENV = 'production';
		const config: SandboxConfig = { enabled: true, provider: 'local' };

		await expect(createSandbox(config)).rejects.toThrow(
			'LocalSandbox (provider: "local") is not allowed in production. Use "daytona" provider for isolated sandbox execution.',
		);
	});

	it('should return an N8nSandboxServiceSandbox for "n8n-sandbox" provider', async () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'n8n-sandbox',
			serviceUrl: 'https://sandbox.example.com',
			apiKey: 'sandbox-key',
			timeout: 45_000,
		};

		const result = await createSandbox(config);

		expect(result).toBeInstanceOf(N8nSandboxServiceSandbox);
		expect((result as unknown as MockWithOpts<Record<string, unknown>>).opts).toEqual({
			serviceUrl: 'https://sandbox.example.com',
			apiKey: 'sandbox-key',
			timeout: 45_000,
		});
	});
});

describe('createWorkspace', () => {
	it('should return undefined when sandbox is undefined', () => {
		const result = createWorkspace(undefined);

		expect(result).toBeUndefined();
	});

	it('should wrap LocalSandbox with LocalFilesystem', () => {
		const sandbox = new LocalSandbox({ workingDirectory: './workspace' });

		const result = createWorkspace(sandbox as unknown as Parameters<typeof createWorkspace>[0]);

		expect(result).toBeDefined();
		expect(result).toBeInstanceOf(WorkspaceMock);
		const workspace = result as unknown as MockWithOpts<{
			sandbox: unknown;
			filesystem: unknown;
		}>;
		expect(workspace.opts.sandbox).toBe(sandbox);
		expect(workspace.opts.filesystem).toBeInstanceOf(LocalFilesystem);
	});

	it('should wrap DaytonaSandbox with DaytonaFilesystem', () => {
		const sandbox = new DaytonaSandbox({ apiKey: 'key' });

		const result = createWorkspace(sandbox as unknown as Parameters<typeof createWorkspace>[0]);

		expect(result).toBeDefined();
		expect(result).toBeInstanceOf(WorkspaceMock);
		const workspace = result as unknown as MockWithOpts<{
			sandbox: unknown;
			filesystem: unknown;
		}>;
		expect(workspace.opts.sandbox).toBe(sandbox);
		expect(workspace.opts.filesystem).toBeInstanceOf(DaytonaFilesystem);
	});

	it('should wrap N8nSandboxServiceSandbox with N8nSandboxFilesystem', () => {
		const sandbox = new N8nSandboxServiceSandbox({ apiKey: 'key' });

		const result = createWorkspace(sandbox as unknown as Parameters<typeof createWorkspace>[0]);

		expect(result).toBeDefined();
		expect(result).toBeInstanceOf(WorkspaceMock);
		const workspace = result as unknown as MockWithOpts<{
			sandbox: unknown;
			filesystem: unknown;
		}>;
		expect(workspace.opts.sandbox).toBe(sandbox);
		expect(workspace.opts.filesystem).toBeInstanceOf(N8nSandboxFilesystem);
	});
});

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

import { type SandboxConfig, createSandbox, createWorkspace } from '../create-workspace';

describe('createSandbox', () => {
	const originalEnv = process.env.NODE_ENV;

	afterEach(() => {
		process.env.NODE_ENV = originalEnv;
	});

	it('should return undefined when sandbox is disabled', () => {
		const config: SandboxConfig = { enabled: false, provider: 'local' };

		const result = createSandbox(config);

		expect(result).toBeUndefined();
	});

	it('should return a DaytonaSandbox for "daytona" provider', () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: 'https://api.daytona.io',
			daytonaApiKey: 'test-key',
			image: 'node:20',
			timeout: 60_000,
		};

		const result = createSandbox(config);

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

	it('should use default timeout of 300_000 for "daytona" provider when not specified', () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
		};

		const result = createSandbox(config);

		expect(result).toBeInstanceOf(DaytonaSandbox);
		expect((result as unknown as MockWithOpts<Record<string, unknown>>).opts.timeout).toBe(300_000);
	});

	it('should not include image in DaytonaSandbox config when not specified', () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
		};

		const result = createSandbox(config);

		expect(result).toBeInstanceOf(DaytonaSandbox);
		expect((result as unknown as MockWithOpts<Record<string, unknown>>).opts).not.toHaveProperty(
			'image',
		);
	});

	it('should return a LocalSandbox for "local" provider in non-production', () => {
		process.env.NODE_ENV = 'development';
		const config: SandboxConfig = { enabled: true, provider: 'local' };

		const result = createSandbox(config);

		expect(result).toBeInstanceOf(LocalSandbox);
		expect((result as unknown as MockWithOpts<{ workingDirectory: string }>).opts).toEqual({
			workingDirectory: './workspace',
		});
	});

	it('should throw in production when provider is "local"', () => {
		process.env.NODE_ENV = 'production';
		const config: SandboxConfig = { enabled: true, provider: 'local' };

		expect(() => createSandbox(config)).toThrow(
			'LocalSandbox (provider: "local") is not allowed in production. Use "daytona" provider for isolated sandbox execution.',
		);
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
});

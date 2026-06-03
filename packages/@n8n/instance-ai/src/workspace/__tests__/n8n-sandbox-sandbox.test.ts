import { SandboxServiceError } from '@n8n/sandbox-client';

import { N8nSandboxServiceSandbox } from '../n8n-sandbox-sandbox';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCreateSandbox = jest.fn();
const mockGetSandbox = jest.fn();
const mockDeleteSandbox = jest.fn();
const mockExec = jest.fn();

jest.mock('@n8n/sandbox-client', () => {
	class MockSandboxServiceError extends Error {
		readonly status: number;

		constructor(message: string, status: number) {
			super(message);
			this.name = 'SandboxServiceError';
			this.status = status;
		}
	}

	return {
		SandboxServiceError: MockSandboxServiceError,
		SandboxClient: class {
			createSandbox = mockCreateSandbox;
			getSandbox = mockGetSandbox;
			deleteSandbox = mockDeleteSandbox;
			exec = mockExec;
		},
	};
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDefaultOptions() {
	return { apiKey: 'key', serviceUrl: 'https://sandbox.test' };
}

function makeSandboxRecord(overrides: Record<string, unknown> = {}) {
	return {
		id: 'sb-123',
		status: 'running',
		createdAt: 1700000000,
		lastActiveAt: 1700000100,
		...overrides,
	};
}

function makeExecResult(overrides: Record<string, unknown> = {}) {
	return {
		exitCode: 0,
		stdout: '',
		stderr: '',
		executionTimeMs: 42,
		timedOut: false,
		killed: false,
		success: true,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
	jest.clearAllMocks();
	mockCreateSandbox.mockResolvedValue(makeSandboxRecord());
	mockGetSandbox.mockResolvedValue(makeSandboxRecord());
	mockDeleteSandbox.mockResolvedValue(undefined);
	mockExec.mockResolvedValue(makeExecResult({ stdout: '/home/user\n' }));
});

describe('destroy()', () => {
	it('calls deleteSandbox when sandbox exists', async () => {
		const sandbox = new N8nSandboxServiceSandbox(makeDefaultOptions());
		await sandbox.start();
		await sandbox.destroy();

		expect(mockDeleteSandbox).toHaveBeenCalledWith('sb-123');
	});

	it('swallows 404 (sandbox already gone)', async () => {
		mockDeleteSandbox.mockRejectedValue(new SandboxServiceError('not found', 404));

		const sandbox = new N8nSandboxServiceSandbox(makeDefaultOptions());
		await sandbox.start();

		await expect(sandbox.destroy()).resolves.toBeUndefined();
	});

	it('re-throws non-404 errors', async () => {
		mockDeleteSandbox.mockRejectedValue(new SandboxServiceError('server error', 500));

		const sandbox = new N8nSandboxServiceSandbox(makeDefaultOptions());
		await sandbox.start();

		await expect(sandbox.destroy()).rejects.toThrow('server error');
	});

	it('is a no-op when no sandboxId is set', async () => {
		const sandbox = new N8nSandboxServiceSandbox(makeDefaultOptions());
		await sandbox.destroy();

		expect(mockDeleteSandbox).not.toHaveBeenCalled();
	});
});

describe('start()', () => {
	describe('fresh creation (no existing ID)', () => {
		it('creates a new sandbox', async () => {
			const sandbox = new N8nSandboxServiceSandbox(makeDefaultOptions());
			await sandbox.start();

			expect(mockCreateSandbox).toHaveBeenCalledTimes(1);
			expect(sandbox.id).toBe('sb-123');
		});
	});

	describe('reconnect to existing ID', () => {
		it('reconnects when sandbox exists', async () => {
			const sandbox = new N8nSandboxServiceSandbox({
				...makeDefaultOptions(),
				id: 'existing-sb',
			});
			mockGetSandbox.mockResolvedValue(makeSandboxRecord({ id: 'existing-sb' }));

			await sandbox.start();

			expect(mockGetSandbox).toHaveBeenCalledWith('existing-sb');
			expect(mockCreateSandbox).not.toHaveBeenCalled();
			expect(sandbox.id).toBe('existing-sb');
		});

		it('creates new when getSandbox returns 404', async () => {
			mockGetSandbox.mockRejectedValue(new SandboxServiceError('not found', 404));
			mockCreateSandbox.mockResolvedValue(makeSandboxRecord({ id: 'new-sb' }));

			const sandbox = new N8nSandboxServiceSandbox({
				...makeDefaultOptions(),
				id: 'gone-sb',
			});
			await sandbox.start();

			expect(mockCreateSandbox).toHaveBeenCalledTimes(1);
			expect(sandbox.id).toBe('new-sb');
		});

		it('re-throws non-404 errors from getSandbox', async () => {
			mockGetSandbox.mockRejectedValue(new SandboxServiceError('forbidden', 403));

			const sandbox = new N8nSandboxServiceSandbox({
				...makeDefaultOptions(),
				id: 'existing-sb',
			});

			await expect(sandbox.start()).rejects.toThrow('forbidden');
		});
	});
});

describe('getInstructions()', () => {
	it('includes runtime description, working directory, and timeout', async () => {
		const sandbox = new N8nSandboxServiceSandbox({
			...makeDefaultOptions(),
			timeout: 60_000,
		});
		await sandbox.start();

		const instructions = sandbox.getInstructions();
		expect(instructions).toContain('Cloud sandbox');
		expect(instructions).toContain('TypeScript');
		expect(instructions).toContain('Default working directory: /home/user/workspace');
		expect(instructions).toContain('60s');
	});
});

describe('executeCommand() env merging', () => {
	it('merges constructor env with per-command env', async () => {
		const sandbox = new N8nSandboxServiceSandbox({
			...makeDefaultOptions(),
			env: { BASE_KEY: 'base' },
		});
		await sandbox.start();
		mockExec.mockResolvedValue(makeExecResult());

		await sandbox.executeCommand('ls', [], { env: { CMD_KEY: 'cmd' } });

		expect(mockExec).toHaveBeenLastCalledWith(
			'sb-123',
			expect.objectContaining({
				env: { BASE_KEY: 'base', CMD_KEY: 'cmd' },
			}),
		);
	});

	it('per-command env overrides constructor env for same key', async () => {
		const sandbox = new N8nSandboxServiceSandbox({
			...makeDefaultOptions(),
			env: { KEY: 'base' },
		});
		await sandbox.start();
		mockExec.mockResolvedValue(makeExecResult());

		await sandbox.executeCommand('ls', [], { env: { KEY: 'override' } });

		expect(mockExec).toHaveBeenLastCalledWith(
			'sb-123',
			expect.objectContaining({
				env: { KEY: 'override' },
			}),
		);
	});

	it('filters out undefined values from env', async () => {
		const sandbox = new N8nSandboxServiceSandbox({
			...makeDefaultOptions(),
			env: { KEEP: 'yes' },
		});
		await sandbox.start();
		mockExec.mockResolvedValue(makeExecResult());

		await sandbox.executeCommand('ls', [], { env: { DROP: undefined } as NodeJS.ProcessEnv });

		expect(mockExec).toHaveBeenLastCalledWith(
			'sb-123',
			expect.objectContaining({
				env: { KEEP: 'yes' },
			}),
		);
	});

	it('passes undefined env when no env is configured', async () => {
		const sandbox = new N8nSandboxServiceSandbox(makeDefaultOptions());
		await sandbox.start();
		mockExec.mockResolvedValue(makeExecResult());

		await sandbox.executeCommand('ls');

		expect(mockExec).toHaveBeenLastCalledWith(
			'sb-123',
			expect.objectContaining({ env: undefined }),
		);
	});
});

describe('getInfo()', () => {
	it('includes locally tracked createdAt and workingDirectory', async () => {
		const sandbox = new N8nSandboxServiceSandbox(makeDefaultOptions());
		await sandbox.start();

		const info = await sandbox.getInfo();
		expect(info.createdAt).toBeInstanceOf(Date);
		expect(info.metadata).toEqual(
			expect.objectContaining({ workingDirectory: '/home/user/workspace' }),
		);
		expect(info.provider).toBe('n8n-sandbox');
	});
});

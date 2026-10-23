import { SandboxServiceError } from '@n8n/sandbox-client';

import { N8nSandboxServiceSandbox } from '../../../workspace/sandbox/n8n-sandbox-sandbox';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCreateSandbox = vi.fn();
const mockGetSandbox = vi.fn();
const mockDeleteSandbox = vi.fn();
const mockExec = vi.fn();

vi.mock('@n8n/sandbox-client', () => {
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
	vi.clearAllMocks();
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
		it('creates a new sandbox with a service-generated id', async () => {
			const sandbox = new N8nSandboxServiceSandbox(makeDefaultOptions());
			await sandbox.start();

			expect(mockCreateSandbox).toHaveBeenCalledTimes(1);
			expect(mockCreateSandbox).toHaveBeenCalledWith({});
			expect(sandbox.id).toBe('sb-123');
		});

		it('passes ephemeral through to createSandbox', async () => {
			const sandbox = new N8nSandboxServiceSandbox({ ...makeDefaultOptions(), ephemeral: true });
			await sandbox.start();

			expect(mockCreateSandbox).toHaveBeenCalledWith({ ephemeral: true });
		});

		it('times out stalled creation and removes a sandbox created after the timeout', async () => {
			let resolveCreation!: (record: ReturnType<typeof makeSandboxRecord>) => void;
			mockCreateSandbox.mockReturnValue(
				new Promise((resolve) => {
					resolveCreation = resolve;
				}),
			);
			const sandbox = new N8nSandboxServiceSandbox({
				...makeDefaultOptions(),
				timeout: 10,
			});

			await expect(sandbox.start()).rejects.toThrow(/abort|timeout/i);
			resolveCreation(makeSandboxRecord({ id: 'late-sandbox' }));

			await vi.waitFor(() => expect(mockDeleteSandbox).toHaveBeenCalledWith('late-sandbox'));
		});
	});

	describe('create-or-reconnect with a configured id', () => {
		it('creates or reconnects through the idempotent create endpoint', async () => {
			const id = '11111111-1111-4111-8111-111111111111';
			mockCreateSandbox.mockResolvedValue(makeSandboxRecord({ id }));

			const sandbox = new N8nSandboxServiceSandbox({
				...makeDefaultOptions(),
				id,
			});

			await sandbox.start();

			expect(mockCreateSandbox).toHaveBeenCalledWith({ id });
			expect(mockGetSandbox).not.toHaveBeenCalled();
			expect(sandbox.id).toBe(id);
		});

		it('passes ephemeral alongside the configured id', async () => {
			const id = '33333333-3333-4333-8333-333333333333';
			mockCreateSandbox.mockResolvedValue(makeSandboxRecord({ id }));

			const sandbox = new N8nSandboxServiceSandbox({
				...makeDefaultOptions(),
				id,
				ephemeral: true,
			});
			await sandbox.start();

			expect(mockCreateSandbox).toHaveBeenCalledWith({ id, ephemeral: true });
		});

		it('does not delete a deterministic sandbox when creation times out', async () => {
			let resolveCreation!: (record: ReturnType<typeof makeSandboxRecord>) => void;
			mockCreateSandbox.mockReturnValue(
				new Promise((resolve) => {
					resolveCreation = resolve;
				}),
			);
			const id = '22222222-2222-4222-8222-222222222222';
			const sandbox = new N8nSandboxServiceSandbox({
				...makeDefaultOptions(),
				id,
				timeout: 10,
			});

			await expect(sandbox.start()).rejects.toThrow(/abort|timeout/i);
			resolveCreation(makeSandboxRecord({ id }));
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(mockDeleteSandbox).not.toHaveBeenCalled();
		});

		it('reuses the last known id when restarted after a stop', async () => {
			mockCreateSandbox.mockResolvedValue(makeSandboxRecord({ id: 'sb-123' }));

			const sandbox = new N8nSandboxServiceSandbox(makeDefaultOptions());
			await sandbox.start();
			await sandbox.stop();
			await sandbox.start();

			expect(mockCreateSandbox).toHaveBeenLastCalledWith({ id: 'sb-123' });
			expect(sandbox.id).toBe('sb-123');
		});

		it('re-throws createSandbox errors', async () => {
			mockCreateSandbox.mockRejectedValue(new SandboxServiceError('forbidden', 403));

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

describe('recovery when the remote sandbox is gone', () => {
	const id = '44444444-4444-4444-8444-444444444444';
	const notFound = () => new SandboxServiceError('sandbox not found', 404);

	async function startedSandbox() {
		mockCreateSandbox.mockResolvedValue(makeSandboxRecord({ id }));
		const sandbox = new N8nSandboxServiceSandbox({ ...makeDefaultOptions(), id });
		await sandbox.ensureRunning();
		mockCreateSandbox.mockClear();
		return sandbox;
	}

	it('recreates the sandbox under the same id and retries the command once', async () => {
		const sandbox = await startedSandbox();
		mockExec
			.mockRejectedValueOnce(notFound())
			.mockResolvedValueOnce(makeExecResult({ stdout: 'ok' }));
		mockGetSandbox.mockRejectedValueOnce(notFound());

		const result = await sandbox.executeCommand('echo', ['ok']);

		expect(result.stdout).toBe('ok');
		expect(mockGetSandbox).toHaveBeenCalledWith(id);
		expect(mockCreateSandbox).toHaveBeenCalledTimes(1);
		expect(mockCreateSandbox).toHaveBeenCalledWith({ id });
		expect(mockExec).toHaveBeenCalledTimes(2);
	});

	it('does not recreate on a 404 while the sandbox still exists', async () => {
		const sandbox = await startedSandbox();
		const error = notFound();
		mockExec.mockRejectedValueOnce(error);

		await expect(sandbox.executeCommand('cat', ['missing'])).rejects.toBe(error);

		expect(mockGetSandbox).toHaveBeenCalledWith(id);
		expect(mockCreateSandbox).not.toHaveBeenCalled();
	});

	it('does not probe or recreate on errors other than 404', async () => {
		const sandbox = await startedSandbox();
		const error = new SandboxServiceError('server error', 500);
		mockExec.mockRejectedValueOnce(error);

		await expect(sandbox.executeCommand('ls')).rejects.toBe(error);

		expect(mockGetSandbox).not.toHaveBeenCalled();
		expect(mockCreateSandbox).not.toHaveBeenCalled();
	});

	it('retries only once', async () => {
		const sandbox = await startedSandbox();
		mockExec.mockRejectedValue(notFound());
		mockGetSandbox.mockRejectedValue(notFound());

		await expect(sandbox.executeCommand('ls')).rejects.toThrow('sandbox not found');

		expect(mockCreateSandbox).toHaveBeenCalledTimes(1);
		expect(mockExec).toHaveBeenCalledTimes(2);
	});

	it('shares one recreate between concurrent failed operations', async () => {
		const sandbox = await startedSandbox();
		mockExec
			.mockRejectedValueOnce(notFound())
			.mockRejectedValueOnce(notFound())
			.mockResolvedValue(makeExecResult());
		mockGetSandbox.mockRejectedValue(notFound());

		await Promise.all([sandbox.executeCommand('a'), sandbox.executeCommand('b')]);

		expect(mockCreateSandbox).toHaveBeenCalledTimes(1);
	});

	it('keeps the original error when the probe does not answer in time', async () => {
		mockCreateSandbox.mockResolvedValue(makeSandboxRecord({ id }));
		const sandbox = new N8nSandboxServiceSandbox({ ...makeDefaultOptions(), id, timeout: 10 });
		await sandbox.ensureRunning();
		mockCreateSandbox.mockClear();
		const error = notFound();
		mockExec.mockRejectedValueOnce(error);
		mockGetSandbox.mockReturnValueOnce(new Promise(() => {}));

		await expect(sandbox.executeCommand('ls')).rejects.toBe(error);

		expect(mockCreateSandbox).not.toHaveBeenCalled();
	});

	it('limits the probe to 10 seconds when the command timeout is longer', async () => {
		const sandbox = await startedSandbox();
		const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
		mockExec.mockRejectedValueOnce(notFound());

		await expect(sandbox.executeCommand('ls')).rejects.toThrow('sandbox not found');

		expect(timeoutSpy).toHaveBeenCalledWith(10_000);
		timeoutSpy.mockRestore();
	});
});

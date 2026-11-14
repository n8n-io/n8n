import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { MXC_MAX_OUTPUT_CHARS, MxcSandbox } from '../../../workspace/sandbox/mxc-sandbox';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockGetPlatformSupport, mockSpawn, MockMxcError } = vi.hoisted(() => {
	class MockMxcError extends Error {
		constructor(
			readonly code: string,
			message: string,
			readonly remediation?: string,
		) {
			super(message);
		}
	}
	return { mockGetPlatformSupport: vi.fn(), mockSpawn: vi.fn(), MockMxcError };
});

vi.mock('@microsoft/mxc-sdk/v1', () => ({
	getPlatformSupport: mockGetPlatformSupport,
	spawn: mockSpawn,
	MxcError: MockMxcError,
}));

function makeHandle(result: { exitCode: number; timedOut: boolean }, output: string[] = []) {
	const standardOutput = new EventEmitter();
	const standardError = new EventEmitter();
	let resolveWait: (value: typeof result) => void = () => {};
	const handle = {
		standardOutput,
		standardError,
		outputMetadata: undefined,
		kill: vi.fn(() => resolveWait({ exitCode: 137, timedOut: false })),
		dispose: vi.fn(),
		wait: vi.fn(
			async () =>
				await new Promise<typeof result>((resolve) => {
					resolveWait = resolve;
					setImmediate(() => {
						for (const chunk of output) standardOutput.emit('data', Buffer.from(chunk));
						resolve(result);
					});
				}),
		),
	};
	return handle;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MxcSandbox', () => {
	let root: string;

	beforeEach(() => {
		vi.clearAllMocks();
		root = mkdtempSync(join(tmpdir(), 'mxc-sandbox-test-'));
		mockGetPlatformSupport.mockReturnValue({ isSupported: true, reason: '' });
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	function makeSandbox(overrides: Partial<ConstructorParameters<typeof MxcSandbox>[0]> = {}) {
		return new MxcSandbox({
			id: 'ws-1',
			workspaceRoot: root,
			readonlyPaths: [join(root, 'inputs')],
			...overrides,
		});
	}

	it('fails closed when MXC is not supported on the host', async () => {
		mockGetPlatformSupport.mockReturnValue({ isSupported: false, reason: 'unsupported os' });
		const sandbox = makeSandbox();

		await expect(sandbox._start()).rejects.toThrow(/not available on this host: unsupported os/);
		expect(mockSpawn).not.toHaveBeenCalled();
	});

	it('rejects an id that could leave the workspace root', () => {
		expect(() => makeSandbox({ id: '../escape' })).toThrow(/Invalid mxc sandbox id/);
	});

	it('builds a deny-by-default policy around the workspace folder', () => {
		const sandbox = makeSandbox();
		const request = sandbox.buildRequest('python3 report.py');

		expect(request.workingDirectory).toBe(join(root, 'ws-1'));
		expect(request.filesystem?.readwritePaths).toEqual([join(root, 'ws-1')]);
		expect(request.filesystem?.readonlyPaths).toContain(join(root, 'inputs'));
		expect(request.network).toEqual({
			egress: { default: 'deny' },
			ingress: { default: 'deny', hostLoopback: 'deny' },
		});
	});

	it('does not pass the n8n process environment into the container', () => {
		vi.stubEnv('N8N_ENCRYPTION_KEY', 'top-secret');
		try {
			const request = makeSandbox().buildRequest('env');

			expect(request.inheritDefaultEnvironment).toBe(false);
			expect(request.environment).not.toHaveProperty('N8N_ENCRYPTION_KEY');
			expect(request.environment?.HOME).toBe(join(root, 'ws-1', '.home'));
			expect(request.environment?.TMPDIR).toBe(join(root, 'ws-1', '.tmp'));
			expect(request.environment?.PATH).toBe(process.env.PATH);
		} finally {
			vi.unstubAllEnvs();
		}
	});

	it('only wraps the command in a shell on Windows (MXC runs /bin/sh -c elsewhere)', () => {
		const request = makeSandbox().buildRequest("echo 'hi' > out.txt");

		if (process.platform === 'win32') {
			expect(request.command).toBe('cmd.exe /d /s /c "echo \'hi\' > out.txt"');
		} else {
			expect(request.command).toBe("echo 'hi' > out.txt");
		}
	});

	it('runs commands in a subfolder of the workspace', async () => {
		mockSpawn.mockResolvedValue(makeHandle({ exitCode: 0, timedOut: false }));
		mkdirSync(join(root, 'ws-1', 'reports'), { recursive: true });

		await makeSandbox().executeCommand('ls', [], { cwd: 'reports' });

		expect(mockSpawn).toHaveBeenCalledWith(
			expect.objectContaining({ workingDirectory: join(root, 'ws-1', 'reports') }),
		);
	});

	it.each(['../..', '/'])('refuses a working directory outside the workspace (%s)', async (cwd) => {
		const result = await makeSandbox().executeCommand('ls', [], { cwd });

		expect(result.success).toBe(false);
		expect(result.stderr).toMatch(/working directory must be inside/);
		expect(mockSpawn).not.toHaveBeenCalled();
	});

	it('streams output and maps the exit code', async () => {
		mockSpawn.mockResolvedValue(makeHandle({ exitCode: 0, timedOut: false }, ['hello\n']));
		const onStdout = vi.fn();

		const result = await makeSandbox().executeCommand('echo', ['hello'], { onStdout });

		expect(result.success).toBe(true);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toBe('hello\n');
		expect(onStdout).toHaveBeenCalledWith('hello\n');
	});

	it('keeps only the end of very large output', async () => {
		const chunk = 'x'.repeat(MXC_MAX_OUTPUT_CHARS);
		mockSpawn.mockResolvedValue(makeHandle({ exitCode: 0, timedOut: false }, [chunk, 'END']));

		const result = await makeSandbox().executeCommand('yes');

		expect(result.stdout.endsWith('END')).toBe(true);
		expect(result.stdout).toMatch(/^\[output truncated/);
		expect(result.stdout.length).toBeLessThan(MXC_MAX_OUTPUT_CHARS + 100);
	});

	it('reports a timeout as a failed command', async () => {
		mockSpawn.mockResolvedValue(makeHandle({ exitCode: 1, timedOut: true }));

		const result = await makeSandbox().executeCommand('sleep 10', [], { timeout: 10 });

		expect(mockSpawn).toHaveBeenCalledWith(expect.objectContaining({ timeoutMs: 10 }));
		expect(result.success).toBe(false);
		expect(result.timedOut).toBe(true);
	});

	it('kills the container when the run is aborted', async () => {
		const handle = makeHandle({ exitCode: 0, timedOut: false });
		handle.wait.mockImplementation(
			async () =>
				await new Promise((resolve) => {
					handle.kill.mockImplementation(() => resolve({ exitCode: 137, timedOut: false }));
				}),
		);
		mockSpawn.mockResolvedValue(handle);
		const controller = new AbortController();

		const pending = makeSandbox().executeCommand('sleep 30', [], {
			abortSignal: controller.signal,
		});
		await vi.waitFor(() => expect(handle.wait).toHaveBeenCalled());
		controller.abort();
		const result = await pending;

		expect(handle.kill).toHaveBeenCalled();
		expect(result.killed).toBe(true);
		expect(result.success).toBe(false);
		expect(handle.dispose).toHaveBeenCalled();
	});

	it('kills the container when the run is aborted while it starts', async () => {
		const controller = new AbortController();
		const handle = makeHandle({ exitCode: 0, timedOut: false });
		let wasKilled = false;
		handle.kill.mockImplementation(() => {
			wasKilled = true;
		});
		// Like the SDK, wait() resolves for a process that was killed before it was awaited.
		handle.wait.mockImplementation(async () =>
			wasKilled ? { exitCode: 137, timedOut: false } : await new Promise(() => {}),
		);
		mockSpawn.mockImplementation(async () => {
			controller.abort();
			return handle;
		});

		const result = await makeSandbox().executeCommand('sleep 30', [], {
			abortSignal: controller.signal,
		});

		expect(handle.kill).toHaveBeenCalled();
		expect(result.killed).toBe(true);
	});

	it('does not start a container when the run is already aborted', async () => {
		const controller = new AbortController();
		controller.abort();

		await expect(
			makeSandbox().executeCommand('ls', [], { abortSignal: controller.signal }),
		).rejects.toThrow();
		expect(mockSpawn).not.toHaveBeenCalled();
	});

	it('returns a policy rejection as a failed result the model can read, and logs it', async () => {
		mockSpawn.mockRejectedValue(
			new MockMxcError('policy_validation', 'policy invalid', 'Remove the unknown field'),
		);
		const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

		const result = await makeSandbox({ logger }).executeCommand('ls');

		expect(result.success).toBe(false);
		expect(result.stderr).toContain('policy_validation');
		expect(result.stderr).toContain('Remove the unknown field');
		expect(logger.warn).toHaveBeenCalledWith(
			'mxc sandbox command could not run',
			expect.objectContaining({ code: 'policy_validation' }),
		);
	});

	it('deletes the workspace folder on deleteRemote', async () => {
		const sandbox = makeSandbox();
		await sandbox._start();
		expect(existsSync(sandbox.workspaceDir)).toBe(true);

		await sandbox.deleteRemote();

		expect(existsSync(sandbox.workspaceDir)).toBe(false);
		expect(existsSync(root)).toBe(true);
	});
});

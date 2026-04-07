import { BaseSandbox } from '../../workspace/sandbox/base-sandbox';
import type {
	CommandResult,
	SandboxProcessManager,
	BaseSandboxOptions,
} from '../../workspace/types';
import { ProcessHandle } from '../../workspace/types';

class StubProcessHandle extends ProcessHandle {
	readonly pid: number;
	private resolvedExitCode: number | undefined;

	constructor(pid: number) {
		super();
		this.pid = pid;
	}

	get exitCode(): number | undefined {
		return this.resolvedExitCode;
	}

	async kill(): Promise<boolean> {
		this.resolvedExitCode = 137;
		return await Promise.resolve(true);
	}

	async sendStdin(_data: string): Promise<void> {}

	protected async _wait(): Promise<CommandResult> {
		this.resolvedExitCode = 0;
		this.emitStdout('ok\n');
		return await Promise.resolve({
			success: true,
			exitCode: 0,
			stdout: this.stdout,
			stderr: this.stderr,
			executionTimeMs: 1,
		});
	}
}

function makeStubProcessManager(): SandboxProcessManager & {
	spawnMock: jest.Mock;
} {
	const handle = new StubProcessHandle(1);
	const spawnMock = jest.fn().mockResolvedValue(handle);
	return {
		spawn: spawnMock,
		list: jest.fn().mockResolvedValue([]),
		get: jest.fn().mockResolvedValue(undefined),
		kill: jest.fn().mockResolvedValue(false),
		spawnMock,
	} as unknown as SandboxProcessManager & { spawnMock: jest.Mock };
}

class TestSandbox extends BaseSandbox {
	readonly id: string;
	readonly name: string;
	readonly provider = 'test';

	startFn = jest.fn().mockResolvedValue(undefined);
	stopFn = jest.fn().mockResolvedValue(undefined);
	destroyFn = jest.fn().mockResolvedValue(undefined);

	constructor(id: string, options?: BaseSandboxOptions) {
		super(options);
		this.id = id;
		this.name = `test-sandbox-${id}`;
	}

	async start(): Promise<void> {
		await this.startFn();
	}

	async stop(): Promise<void> {
		await this.stopFn();
	}

	async destroy(): Promise<void> {
		await this.destroyFn();
	}
}

describe('BaseSandbox', () => {
	describe('lifecycle state transitions', () => {
		it('starts in pending status', () => {
			const sb = new TestSandbox('1');
			expect(sb.status).toBe('pending');
		});

		it('transitions pending → starting → running on _start', async () => {
			const statuses: string[] = [];
			const sb = new TestSandbox('1');
			sb.startFn.mockImplementation(() => {
				statuses.push(sb.status);
			});

			await sb._start();

			expect(statuses).toContain('starting');
			expect(sb.status).toBe('running');
		});

		it('_start is idempotent when already running', async () => {
			const sb = new TestSandbox('1');
			await sb._start();
			sb.startFn.mockClear();

			await sb._start();

			expect(sb.startFn).not.toHaveBeenCalled();
			expect(sb.status).toBe('running');
		});

		it('transitions to error on start failure', async () => {
			const sb = new TestSandbox('1');
			sb.startFn.mockRejectedValue(new Error('start boom'));

			await expect(sb._start()).rejects.toThrow('start boom');
			expect(sb.status).toBe('error');
		});

		it('transitions running → stopping → stopped on _stop', async () => {
			const sb = new TestSandbox('1');
			await sb._start();

			const statuses: string[] = [];
			sb.stopFn.mockImplementation(() => {
				statuses.push(sb.status);
			});

			await sb._stop();

			expect(statuses).toContain('stopping');
			expect(sb.status).toBe('stopped');
		});

		it('_stop is no-op when already stopped', async () => {
			const sb = new TestSandbox('1');
			await sb._start();
			await sb._stop();
			sb.stopFn.mockClear();

			await sb._stop();

			expect(sb.stopFn).not.toHaveBeenCalled();
		});

		it('_stop is no-op when pending', async () => {
			const sb = new TestSandbox('1');
			await sb._stop();
			expect(sb.stopFn).not.toHaveBeenCalled();
		});

		it('transitions to error on stop failure', async () => {
			const sb = new TestSandbox('1');
			await sb._start();
			sb.stopFn.mockRejectedValue(new Error('stop boom'));

			await expect(sb._stop()).rejects.toThrow('stop boom');
			expect(sb.status).toBe('error');
		});

		it('transitions running → destroying → destroyed on _destroy', async () => {
			const sb = new TestSandbox('1');
			await sb._start();

			const statuses: string[] = [];
			sb.destroyFn.mockImplementation(() => {
				statuses.push(sb.status);
			});

			await sb._destroy();

			expect(statuses).toContain('destroying');
			expect(sb.status).toBe('destroyed');
		});

		it('_destroy from pending goes directly to destroyed', async () => {
			const sb = new TestSandbox('1');
			await sb._destroy();

			expect(sb.status).toBe('destroyed');
			expect(sb.destroyFn).not.toHaveBeenCalled();
		});

		it('_destroy is idempotent when already destroyed', async () => {
			const sb = new TestSandbox('1');
			await sb._start();
			await sb._destroy();
			sb.destroyFn.mockClear();

			await sb._destroy();

			expect(sb.destroyFn).not.toHaveBeenCalled();
		});

		it('throws when trying to _start a destroyed sandbox', async () => {
			const sb = new TestSandbox('1');
			await sb._start();
			await sb._destroy();

			await expect(sb._start()).rejects.toThrow('Cannot start a destroyed sandbox');
		});

		it('transitions to error on destroy failure', async () => {
			const sb = new TestSandbox('1');
			await sb._start();
			sb.destroyFn.mockRejectedValue(new Error('destroy boom'));

			await expect(sb._destroy()).rejects.toThrow('destroy boom');
			expect(sb.status).toBe('error');
		});
	});

	describe('lifecycle hooks', () => {
		it('calls onStart hook after successful start', async () => {
			const onStart = jest.fn();
			const sb = new TestSandbox('1', { onStart });

			await sb._start();

			expect(onStart).toHaveBeenCalledWith({ sandbox: sb });
		});

		it('does not fail when onStart hook throws', async () => {
			const onStart = jest.fn().mockRejectedValue(new Error('hook error'));
			const sb = new TestSandbox('1', { onStart });

			await sb._start();

			expect(sb.status).toBe('running');
		});

		it('calls onStop hook before stopping', async () => {
			const onStop = jest.fn();
			const sb = new TestSandbox('1', { onStop });
			await sb._start();

			await sb._stop();

			expect(onStop).toHaveBeenCalledWith({ sandbox: sb });
		});

		it('calls onDestroy hook before destroying', async () => {
			const onDestroy = jest.fn();
			const sb = new TestSandbox('1', { onDestroy });
			await sb._start();

			await sb._destroy();

			expect(onDestroy).toHaveBeenCalledWith({ sandbox: sb });
		});
	});

	describe('ensureRunning', () => {
		it('starts the sandbox if not running', async () => {
			const sb = new TestSandbox('1');
			await sb.ensureRunning();

			expect(sb.status).toBe('running');
			expect(sb.startFn).toHaveBeenCalled();
		});

		it('does nothing if already running', async () => {
			const sb = new TestSandbox('1');
			await sb._start();
			sb.startFn.mockClear();

			await sb.ensureRunning();

			expect(sb.startFn).not.toHaveBeenCalled();
		});

		it('throws if sandbox is destroyed', async () => {
			const sb = new TestSandbox('1');
			await sb._start();
			await sb._destroy();

			await expect(sb.ensureRunning()).rejects.toThrow('has been destroyed');
		});
	});

	describe('executeCommand', () => {
		it('spawns a process and returns results', async () => {
			const pm = makeStubProcessManager();
			const sb = new TestSandbox('1', { processes: pm });

			await sb._start();
			const result = await sb.executeCommand('echo', ['hello']);

			expect(pm.spawnMock).toHaveBeenCalledTimes(1);
			expect((pm.spawnMock.mock.calls as unknown as string[][])[0][0]).toBe('echo hello');
			expect(result.success).toBe(true);
			expect(result.stdout).toBe('ok\n');
		});

		it('auto-starts sandbox before executing', async () => {
			const pm = makeStubProcessManager();
			const sb = new TestSandbox('1', { processes: pm });

			const result = await sb.executeCommand('ls');

			expect(sb.status).toBe('running');
			expect(result.success).toBe(true);
		});

		it('throws when no process manager is available', async () => {
			const sb = new TestSandbox('1');
			await sb._start();

			await expect(sb.executeCommand('ls')).rejects.toThrow('no process manager');
		});
	});

	describe('getInstructions', () => {
		it('returns empty string by default', () => {
			const sb = new TestSandbox('1');
			expect(sb.getInstructions()).toBe('');
		});
	});

	describe('concurrent lifecycle calls', () => {
		it('deduplicates concurrent _start calls', async () => {
			const sb = new TestSandbox('1');
			let resolveStart: () => void;
			sb.startFn.mockImplementation(
				async () =>
					await new Promise<void>((r) => {
						resolveStart = r;
					}),
			);

			const p1 = sb._start();
			const p2 = sb._start();

			resolveStart!();
			await Promise.all([p1, p2]);

			expect(sb.startFn).toHaveBeenCalledTimes(1);
			expect(sb.status).toBe('running');
		});

		it('deduplicates concurrent _destroy calls', async () => {
			const sb = new TestSandbox('1');
			await sb._start();

			let resolveDestroy!: () => void;
			sb.destroyFn.mockImplementation(
				async () =>
					await new Promise<void>((r) => {
						resolveDestroy = r;
					}),
			);

			const p1 = sb._destroy();
			// Flush microtasks so executeDestroy reaches destroyFn
			await Promise.resolve();
			await Promise.resolve();
			const p2 = sb._destroy();

			resolveDestroy();
			await Promise.all([p1, p2]);

			expect(sb.destroyFn).toHaveBeenCalledTimes(1);
			expect(sb.status).toBe('destroyed');
		});
	});
});

vi.mock('node:fs', () => ({
	mkdirSync: vi.fn(),
	openSync: vi.fn(() => 42),
	closeSync: vi.fn(),
}));

import type { ChildProcess, spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { closeSync } from 'node:fs';

import { LocalInstanceProcess } from './local-instance-process';

/** Minimal child double: an EventEmitter with a `kill` spy. */
function makeChild() {
	const child = new EventEmitter() as unknown as ChildProcess;
	Object.assign(child, { kill: vi.fn() });
	return child;
}

function okResponse(status = 200): Response {
	return { ok: status === 200, status } as unknown as Response;
}

describe('LocalInstanceProcess', () => {
	const noSleep = async () => {};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('spawns via the app binary as Node and resolves once readiness returns 200', async () => {
		const child = makeChild();
		const spawnFn = vi.fn(() => child) as unknown as typeof spawn;
		const fetchFn = vi
			.fn<typeof fetch>()
			.mockRejectedValueOnce(new Error('ECONNREFUSED'))
			.mockResolvedValueOnce(okResponse(503))
			.mockResolvedValueOnce(okResponse(200));
		const proc = new LocalInstanceProcess({ spawnFn, fetchFn, sleep: noSleep });

		await proc.start({ N8N_PORT: '5680' });

		expect(proc.isRunning()).toBe(true);
		const [command, args, options] = vi.mocked(spawnFn).mock.calls[0] as unknown as [
			string,
			string[],
			{ env: Record<string, string>; stdio: unknown[] },
		];
		expect(command).toBe(process.execPath);
		expect(args[1]).toBe('start');
		expect(options.env).toMatchObject({ N8N_PORT: '5680', ELECTRON_RUN_AS_NODE: '1' });
		// The child must own its log fd — piping through the parent breaks its
		// stdout when the app quits first (EPIPE spin in the orphan).
		expect(options.stdio).toEqual(['ignore', 42, 42]);
		expect(closeSync).toHaveBeenCalledWith(42);
	});

	it('rejects when the child exits before becoming ready', async () => {
		const child = makeChild();
		const spawnFn = vi.fn(() => child) as unknown as typeof spawn;
		const fetchFn = vi.fn<typeof fetch>().mockImplementation(async () => {
			child.emit('exit', 1);
			return await Promise.reject(new Error('ECONNREFUSED'));
		});
		const proc = new LocalInstanceProcess({ spawnFn, fetchFn, sleep: noSleep });

		await expect(proc.start({})).rejects.toThrow('exited during startup');
		expect(proc.isRunning()).toBe(false);
	});

	it('emits exited when the running child dies', async () => {
		const child = makeChild();
		const spawnFn = vi.fn(() => child) as unknown as typeof spawn;
		const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(okResponse());
		const proc = new LocalInstanceProcess({ spawnFn, fetchFn, sleep: noSleep });
		const exited = vi.fn();
		proc.on('exited', exited);

		await proc.start({});
		child.emit('exit', 1);

		expect(exited).toHaveBeenCalledWith(1);
		expect(proc.isRunning()).toBe(false);
	});

	it('stops with SIGTERM and resolves on exit', async () => {
		const child = makeChild();
		const spawnFn = vi.fn(() => child) as unknown as typeof spawn;
		const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(okResponse());
		const proc = new LocalInstanceProcess({ spawnFn, fetchFn, sleep: noSleep });
		await proc.start({});

		vi.mocked(child.kill).mockImplementation(((signal: string) => {
			if (signal === 'SIGTERM') setImmediate(() => child.emit('exit', 0));
			return true;
		}) as typeof child.kill);

		await proc.stop();

		expect(child.kill).toHaveBeenCalledWith('SIGTERM');
		expect(child.kill).not.toHaveBeenCalledWith('SIGKILL');
		expect(proc.isRunning()).toBe(false);
	});

	it('escalates to SIGKILL when the child ignores SIGTERM', async () => {
		vi.useFakeTimers();
		try {
			const child = makeChild();
			const spawnFn = vi.fn(() => child) as unknown as typeof spawn;
			const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(okResponse());
			const proc = new LocalInstanceProcess({ spawnFn, fetchFn, sleep: noSleep });
			await proc.start({});

			vi.mocked(child.kill).mockImplementation(((signal: string) => {
				if (signal === 'SIGKILL') child.emit('exit', null);
				return true;
			}) as typeof child.kill);

			const stopping = proc.stop();
			await vi.advanceTimersByTimeAsync(10_000);
			await stopping;

			expect(child.kill).toHaveBeenCalledWith('SIGTERM');
			expect(child.kill).toHaveBeenCalledWith('SIGKILL');
		} finally {
			vi.useRealTimers();
		}
	});
});

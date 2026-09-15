import { type ChildProcess, execSync, spawn } from 'node:child_process';
import { existsSync, type FSWatcher, watch } from 'node:fs';
import path from 'node:path';

import {
	createSpinner,
	openUrl,
	runCommands,
	sleep,
	triggerReload,
	waitForN8n,
	watchStaticFiles,
} from './utils';

vi.mock('node:child_process');
vi.mock('node:fs');

function withPlatform(platform: string, fn: () => void): void {
	const original = process.platform;
	Object.defineProperty(process, 'platform', { value: platform });
	try {
		fn();
	} finally {
		Object.defineProperty(process, 'platform', { value: original });
	}
}

function createFakeChild() {
	return {
		pid: 4321,
		exitCode: null,
		signalCode: null,
		stdout: { on: vi.fn() },
		stderr: { on: vi.fn() },
		on: vi.fn(),
		kill: vi.fn(),
	};
}

function createFakeWatcher() {
	return { unref: vi.fn(), close: vi.fn() };
}

describe('dev utils', () => {
	describe('sleep', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should resolve after specified milliseconds', async () => {
			const promise = sleep(100);
			let resolved = false;

			void promise.then(() => {
				resolved = true;
			});

			vi.advanceTimersByTime(99);
			await Promise.resolve();

			expect(resolved).toBe(false);

			vi.advanceTimersByTime(1);
			await vi.runAllTimersAsync();

			expect(resolved).toBe(true);
			await expect(promise).resolves.toBeUndefined();
		});
	});

	describe('createSpinner', () => {
		it('should return a function that cycles through spinner frames', () => {
			const spinner = createSpinner('Loading');

			const frame1 = spinner();
			const frame2 = spinner();

			expect(frame1).toContain('Loading');
			expect(frame2).toContain('Loading');
			expect(frame1).not.toBe(frame2);
		});

		it('should cycle back to the first frame after all frames', () => {
			const spinner = createSpinner('Test');

			const frames = [];
			for (let i = 0; i < 11; i++) {
				frames.push(spinner());
			}

			expect(frames[0]).toBe(frames[10]);
		});
	});

	describe('openUrl', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should use "open" command on darwin platform', () => {
			const originalPlatform = process.platform;
			Object.defineProperty(process, 'platform', { value: 'darwin' });

			openUrl('http://localhost:5678');

			expect(execSync).toHaveBeenCalledWith('open "http://localhost:5678"');

			Object.defineProperty(process, 'platform', { value: originalPlatform });
		});

		it('should use "start" command on win32 platform with empty window title', () => {
			const originalPlatform = process.platform;
			Object.defineProperty(process, 'platform', { value: 'win32' });

			openUrl('http://localhost:5678');

			expect(execSync).toHaveBeenCalledWith('start "" "http://localhost:5678"');

			Object.defineProperty(process, 'platform', { value: originalPlatform });
		});

		it('should use "xdg-open" command on linux platform', () => {
			const originalPlatform = process.platform;
			Object.defineProperty(process, 'platform', { value: 'linux' });

			openUrl('http://localhost:5678');

			expect(execSync).toHaveBeenCalledWith('xdg-open "http://localhost:5678"');

			Object.defineProperty(process, 'platform', { value: originalPlatform });
		});

		it('should escape double quotes in URL', () => {
			const originalPlatform = process.platform;
			Object.defineProperty(process, 'platform', { value: 'darwin' });

			openUrl('http://localhost:5678?query="value"');

			expect(execSync).toHaveBeenCalledWith('open "http://localhost:5678?query=\\"value\\""');

			Object.defineProperty(process, 'platform', { value: originalPlatform });
		});

		it('should not throw if execSync fails', () => {
			vi.mocked(execSync).mockImplementation(() => {
				throw new Error('Command failed');
			});

			expect(() => openUrl('http://localhost:5678')).not.toThrow();
		});
	});

	describe('runCommands', () => {
		// A project path a developer could plausibly have, holding every character
		// a shell would expand or split on.
		const hostileDir = '/home/dev/a $b `c` ;d &e |f (g) *h ?i/project';

		beforeEach(() => {
			vi.clearAllMocks();
			vi.useFakeTimers();
			vi.mocked(spawn).mockReturnValue(createFakeChild() as unknown as ChildProcess);
			// Keep the render loop and the signal handlers out of the test run.
			vi.spyOn(process.stdout, 'write').mockReturnValue(true);
			vi.spyOn(process, 'on').mockReturnValue(process);
		});

		afterEach(() => {
			vi.useRealTimers();
			vi.restoreAllMocks();
		});

		it('should pass arguments to spawn verbatim rather than as a shell string', () => {
			withPlatform('linux', () => {
				runCommands({
					commands: [
						{ cmd: 'docker', args: ['run', '-v', `${hostileDir}:/mnt`], name: 'container' },
					],
				});
			});

			expect(spawn).toHaveBeenCalledTimes(1);
			const [file, args, options] = vi.mocked(spawn).mock.calls[0] as [
				string,
				string[],
				{ shell?: boolean; detached?: boolean },
			];

			expect(file).toBe('docker');
			expect(args).toEqual(['run', '-v', `${hostileDir}:/mnt`]);
			// No shell means nothing can expand `$b`, split on the spaces, or treat
			// `;`, `&` or `|` as separators.
			expect(options.shell).toBeUndefined();
			expect(options.detached).toBe(true);
		});

		it('should quote every argument when invoking cmd.exe on win32', () => {
			withPlatform('win32', () => {
				runCommands({
					commands: [{ cmd: 'npm', args: ['exec', '--', 'tsc', 'a&b'], name: 'tsc' }],
				});
			});

			const [file, args, options] = vi.mocked(spawn).mock.calls[0] as [
				string,
				string[],
				{ windowsVerbatimArguments?: boolean; detached?: boolean },
			];

			expect(file).toBe(process.env.ComSpec ?? 'cmd.exe');
			// `a&b` holds no whitespace, so libuv would leave it unquoted and cmd.exe
			// would read `&` as a command separator. Every argument is quoted instead.
			expect(args).toEqual(['/d', '/s', '/c', '""npm" "exec" "--" "tsc" "a&b""']);
			expect(options.windowsVerbatimArguments).toBe(true);
			// Windows tears the tree down with taskkill, not a process group.
			expect(options.detached).toBe(false);
		});

		it('should report a failure to start instead of throwing on the error event', () => {
			withPlatform('linux', () => {
				runCommands({ commands: [{ cmd: 'missing-binary', args: [], name: 'build' }] });
			});

			const child = vi.mocked(spawn).mock.results[0].value as ReturnType<typeof createFakeChild>;
			const onError = child.on.mock.calls.find((call) => call[0] === 'error')?.[1] as (
				error: Error,
			) => void;

			expect(onError).toBeDefined();
			expect(() => onError(new Error('spawn missing-binary ENOENT'))).not.toThrow();
		});
	});

	describe('waitForN8n', () => {
		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('should return false within the timeout when the server never responds', async () => {
			// Real timers on purpose: `AbortSignal.timeout` is not driven by fake ones.
			// A short timeout keeps this fast while still exercising the abort path.
			vi.stubGlobal(
				'fetch',
				vi.fn(async (_url: string, init?: { signal?: AbortSignal }) => {
					return await new Promise<Response>((_resolve, reject) => {
						init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
					});
				}),
			);

			const start = Date.now();
			await expect(waitForN8n('http://localhost:5678', 100)).resolves.toBe(false);

			// Without the abort signal this await never settles and the test times out.
			expect(Date.now() - start).toBeLessThan(2000);
		});

		it('should return true as soon as healthz answers', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => ({ ok: true })),
			);

			await expect(waitForN8n('http://localhost:5678', 5000)).resolves.toBe(true);
		});
	});

	describe('triggerReload', () => {
		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('should bound the request with an abort signal', async () => {
			const fetchMock = vi.fn(async () => ({ ok: true }));
			vi.stubGlobal('fetch', fetchMock);

			await triggerReload('http://localhost:5678');

			const [, init] = fetchMock.mock.calls[0] as unknown as [string, { signal?: AbortSignal }];
			expect(init.signal).toBeInstanceOf(AbortSignal);
		});

		it('should return false when the request exceeds its timeout', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => {
					throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
				}),
			);

			await expect(triggerReload('http://localhost:5678')).resolves.toBe(false);
		});
	});

	describe('watchStaticFiles', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should watch only the asset directories, never node_modules or the cwd', () => {
			vi.mocked(existsSync).mockReturnValue(true);
			vi.mocked(watch).mockImplementation(() => createFakeWatcher() as unknown as FSWatcher);

			watchStaticFiles(vi.fn());

			const watched = vi.mocked(watch).mock.calls.map((call) => call[0]);
			expect(watched).toEqual([
				path.join(process.cwd(), 'nodes'),
				path.join(process.cwd(), 'credentials'),
				path.join(process.cwd(), 'icons'),
			]);
			expect(watched).not.toContain(process.cwd());
			expect(watched.some((dir) => String(dir).includes('node_modules'))).toBe(false);
		});

		it('should skip asset directories that do not exist', () => {
			vi.mocked(existsSync).mockImplementation((target) => String(target).endsWith('nodes'));
			vi.mocked(watch).mockImplementation(() => createFakeWatcher() as unknown as FSWatcher);

			watchStaticFiles(vi.fn());

			expect(watch).toHaveBeenCalledTimes(1);
			expect(vi.mocked(watch).mock.calls[0][0]).toBe(path.join(process.cwd(), 'nodes'));
		});

		it('should close every watcher on cleanup', () => {
			const watchers = [createFakeWatcher(), createFakeWatcher(), createFakeWatcher()];
			let index = 0;
			vi.mocked(existsSync).mockReturnValue(true);
			vi.mocked(watch).mockImplementation(() => watchers[index++] as unknown as FSWatcher);

			watchStaticFiles(vi.fn())();

			for (const watcher of watchers) {
				expect(watcher.close).toHaveBeenCalledTimes(1);
			}
		});

		it('should only react to static asset changes', () => {
			const onChange = vi.fn();
			vi.mocked(existsSync).mockImplementation((target) => String(target).endsWith('nodes'));
			vi.mocked(watch).mockImplementation(() => createFakeWatcher() as unknown as FSWatcher);

			watchStaticFiles(onChange);

			const [, , listener] = vi.mocked(watch).mock.calls[0] as unknown as [
				string,
				unknown,
				(event: string, filename: string | null) => void,
			];

			listener('change', 'Example/example.svg');
			listener('change', 'Example/__schema__/v1.json');
			expect(onChange).toHaveBeenCalledTimes(2);

			listener('change', 'Example/Example.node.ts');
			listener('change', null);
			expect(onChange).toHaveBeenCalledTimes(2);
		});
	});
});

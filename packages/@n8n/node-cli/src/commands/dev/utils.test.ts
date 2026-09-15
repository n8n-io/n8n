import { type ChildProcess, execSync, spawn } from 'node:child_process';
import { type Dirent, type FSWatcher, readdirSync, statSync, watch } from 'node:fs';
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

function mockDirs(isDir: (target: string) => boolean): void {
	vi.mocked(statSync).mockImplementation((target) => {
		if (!isDir(String(target))) throw new Error('ENOENT');
		return { isDirectory: () => true } as unknown as ReturnType<typeof statSync>;
	});
}

function mockTopLevel(names: string[], dirs: string[] = names): void {
	vi.mocked(readdirSync).mockReturnValue(
		names.map(
			(name) => ({ name, isDirectory: () => dirs.includes(name) }) as unknown as Dirent,
		) as unknown as ReturnType<typeof readdirSync>,
	);
	mockDirs((target) => dirs.some((name) => target.endsWith(name)));
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

		it('should return true as soon as readiness answers', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => ({ ok: true })),
			);

			await expect(waitForN8n('http://localhost:5678', 5000)).resolves.toBe(true);
		});

		it('should wait on readiness, not on the plain health endpoint', async () => {
			const fetchMock = vi.fn(async (_url: string) => ({ ok: true }));
			vi.stubGlobal('fetch', fetchMock);

			await waitForN8n('http://localhost:5678', 5000);

			expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:5678/healthz/readiness');
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

		it('should report the url when the request exceeds its timeout', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => {
					throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
				}),
			);

			await expect(triggerReload('http://localhost:5678')).resolves.toEqual({
				ok: false,
				error: 'n8n not reachable at http://localhost:5678',
			});
		});

		it('should succeed without a reason', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => ({ ok: true })),
			);

			await expect(triggerReload('http://localhost:5678')).resolves.toEqual({
				ok: true,
				result: undefined,
			});
		});

		it('should explain a 404 as a missing reload endpoint', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => ({
					ok: false,
					status: 404,
					text: async () => '<!DOCTYPE html>',
				})),
			);

			const result = await triggerReload('http://localhost:5678');
			expect(result.ok).toBe(false);
			expect(result.ok ? '' : result.error).toContain('no reload endpoint');
		});

		it('should surface the error message n8n returned', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => ({
					ok: false,
					status: 500,
					text: async () => JSON.stringify({ message: 'Cannot find module ./broken' }),
				})),
			);

			await expect(triggerReload('http://localhost:5678')).resolves.toEqual({
				ok: false,
				error: 'Cannot find module ./broken',
			});
		});

		it('should fall back to the status when the body carries no message', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => ({
					ok: false,
					status: 503,
					text: async () => 'Service Unavailable',
				})),
			);

			await expect(triggerReload('http://localhost:5678')).resolves.toEqual({
				ok: false,
				error: 'n8n answered 503',
			});
		});
	});

	describe('watchStaticFiles', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		const watchedPaths = () => vi.mocked(watch).mock.calls.map((call) => String(call[0]));

		// The root watch passes its callback second, a recursive one passes it third.
		const listenerFor = (target: string) => {
			const call = vi.mocked(watch).mock.calls.find((args) => String(args[0]) === target);
			return call?.find((arg) => typeof arg === 'function') as unknown as (
				event: string,
				filename: string | null,
			) => void;
		};

		it('should watch every top-level directory, not just the asset ones', () => {
			mockTopLevel(['nodes', 'credentials', 'icons', 'assets', 'shared']);
			vi.mocked(watch).mockImplementation(() => createFakeWatcher() as unknown as FSWatcher);

			watchStaticFiles(vi.fn());

			expect(watchedPaths()).toContain(path.join(process.cwd(), 'assets'));
			expect(watchedPaths()).toContain(path.join(process.cwd(), 'shared'));
		});

		it('should never watch the shared ignore list or dotted directories', () => {
			mockTopLevel(['nodes', 'dist', 'node_modules', '.git', '.turbo']);
			vi.mocked(watch).mockImplementation(() => createFakeWatcher() as unknown as FSWatcher);

			watchStaticFiles(vi.fn());

			const recursive = watchedPaths().filter((target) => target !== process.cwd());
			expect(recursive).toEqual([path.join(process.cwd(), 'nodes')]);
		});

		it('should skip top-level entries that are not directories', () => {
			mockTopLevel(['nodes', 'package.json'], ['nodes']);
			vi.mocked(watch).mockImplementation(() => createFakeWatcher() as unknown as FSWatcher);

			watchStaticFiles(vi.fn());

			expect(watchedPaths()).not.toContain(path.join(process.cwd(), 'package.json'));
		});

		it('should react to an asset in the project root', () => {
			mockTopLevel(['nodes']);
			vi.mocked(watch).mockImplementation(() => createFakeWatcher() as unknown as FSWatcher);

			const onChange = vi.fn();
			watchStaticFiles(onChange);

			listenerFor(process.cwd())('change', 'logo.svg');
			expect(onChange).toHaveBeenCalledTimes(1);
		});

		it('should watch a directory created after startup', () => {
			mockTopLevel(['nodes']);
			vi.mocked(watch).mockImplementation(() => createFakeWatcher() as unknown as FSWatcher);

			const onChange = vi.fn();
			watchStaticFiles(onChange);

			mockDirs((target) => target.endsWith('nodes') || target.endsWith('icons'));
			listenerFor(process.cwd())('rename', 'icons');

			expect(watchedPaths()).toContain(path.join(process.cwd(), 'icons'));
			expect(onChange).toHaveBeenCalledTimes(1);
		});

		it('should not attach a second watcher when a directory is seen twice', () => {
			mockTopLevel(['nodes']);
			vi.mocked(watch).mockImplementation(() => createFakeWatcher() as unknown as FSWatcher);

			watchStaticFiles(vi.fn());
			const before = watchedPaths().length;

			listenerFor(process.cwd())('rename', 'nodes');

			expect(watchedPaths()).toHaveLength(before);
		});

		it('should ignore a non-directory appearing with a directory name', () => {
			mockTopLevel(['nodes']);
			vi.mocked(watch).mockImplementation(() => createFakeWatcher() as unknown as FSWatcher);

			watchStaticFiles(vi.fn());

			// `icons` exists as a file, so statSync never reports a directory.
			expect(() => listenerFor(process.cwd())('rename', 'icons')).not.toThrow();
			expect(watchedPaths()).not.toContain(path.join(process.cwd(), 'icons'));
		});

		it('should keep working when the project root cannot be read', () => {
			vi.mocked(readdirSync).mockImplementation(() => {
				throw new Error('EACCES');
			});
			vi.mocked(watch).mockImplementation(() => createFakeWatcher() as unknown as FSWatcher);

			expect(() => watchStaticFiles(vi.fn())).not.toThrow();
			expect(watchedPaths()).toEqual([process.cwd()]);
		});

		it('should close every watcher on cleanup', () => {
			const watchers = [createFakeWatcher(), createFakeWatcher(), createFakeWatcher()];
			let index = 0;
			mockTopLevel(['nodes', 'credentials']);
			vi.mocked(watch).mockImplementation(() => watchers[index++] as unknown as FSWatcher);

			watchStaticFiles(vi.fn())();

			for (const watcher of watchers) {
				expect(watcher.close).toHaveBeenCalledTimes(1);
			}
		});

		it('should only react to static asset changes', () => {
			const onChange = vi.fn();
			mockTopLevel(['nodes']);
			vi.mocked(watch).mockImplementation(() => createFakeWatcher() as unknown as FSWatcher);

			watchStaticFiles(onChange);

			const listener = listenerFor(path.join(process.cwd(), 'nodes'));

			listener('change', 'Example/example.svg');
			listener('change', 'Example/__schema__/v1.json');
			expect(onChange).toHaveBeenCalledTimes(2);

			listener('change', 'Example/Example.node.ts');
			listener('change', null);
			expect(onChange).toHaveBeenCalledTimes(2);
		});
	});
});

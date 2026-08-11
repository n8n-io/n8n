import { SandboxManager } from '@anthropic-ai/sandbox-runtime';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import type { Mock, Mocked, MockedFunction } from 'vitest';

import { textOf } from '../test-utils';
import type { AffectedResource } from '../types';
import { buildShellResource } from './build-shell-resource';
import { createShellExecuteTool } from './shell-execute';

vi.mock('child_process');
vi.mock('@vscode/ripgrep', () => ({ rgPath: '/usr/bin/rg' }));
vi.mock('@anthropic-ai/sandbox-runtime', () => ({
	// eslint-disable-next-line
	SandboxManager: {
		initialize: vi.fn().mockResolvedValue(undefined),
		wrapWithSandbox: vi.fn().mockImplementation(async (cmd: string) => await Promise.resolve(cmd)),
	},
}));

const mockSandboxManager = SandboxManager as Mocked<typeof SandboxManager>;

const mockSpawn = spawn as MockedFunction<typeof spawn>;

// Plumbing tests use the unsandboxed tool (sh -c) so spawn is called with the
// classic (executable, args, options) shape. Sandbox-mode behavior is covered in
// the cross-platform block below and in sandbox.test.ts.
const shellExecuteTool = createShellExecuteTool('unsandboxed');
const DUMMY_CONTEXT = { dir: '/test/base' };

function makeMockChild(
	overrides: Partial<{
		stdout: EventEmitter;
		stderr: EventEmitter;
		kill: Mock;
		on: Mock;
	}> = {},
) {
	const stdout = overrides.stdout ?? new EventEmitter();
	const stderr = overrides.stderr ?? new EventEmitter();
	const kill = overrides.kill ?? vi.fn();
	const on = overrides.on ?? vi.fn();
	return { stdout, stderr, kill, on };
}

function getCloseHandler(on: Mock): ((code: number) => void) | undefined {
	const call = on.mock.calls.find((args: unknown[]) => args[0] === 'close') as
		| [string, (code: number) => void]
		| undefined;
	return call?.[1];
}

function getErrorHandler(on: Mock): ((error: Error) => void) | undefined {
	const call = on.mock.calls.find((args: unknown[]) => args[0] === 'error') as
		| [string, (error: Error) => void]
		| undefined;
	return call?.[1];
}

/** Flush all pending microtasks. */
async function flushMicrotasks(ticks = 1) {
	for (let i = 0; i < ticks; i++) await Promise.resolve();
}
async function flushUntil(predicate: () => boolean, maxTicks = 50) {
	for (let i = 0; i < maxTicks && !predicate(); i++) await Promise.resolve();
}

describe('shell_execute tool', () => {
	const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');

	beforeEach(() => {
		// Default to linux to avoid the macOS async sandbox path in non-platform-specific tests
		Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
	});

	afterEach(() => {
		vi.clearAllMocks();
		if (originalPlatform) Object.defineProperty(process, 'platform', originalPlatform);
	});

	it('captures stdout and exits with code 0', async () => {
		const child = makeMockChild();
		mockSpawn.mockReturnValue(child as unknown as ReturnType<typeof spawn>);

		const resultPromise = shellExecuteTool.execute(
			{ command: 'echo hello', timeout: 5000 },
			DUMMY_CONTEXT,
		);

		// spawnCommand is async, so flush the microtask that registers child event handlers
		await flushMicrotasks();

		child.stdout.emit('data', Buffer.from('hello\n'));
		const closeHandler = getCloseHandler(child.on);
		closeHandler?.(0);

		const result = await resultPromise;
		// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
		const parsed = JSON.parse(textOf(result)) as {
			stdout: string;
			stderr: string;
			exitCode: number;
		};

		expect(parsed.stdout).toBe('hello\n');
		expect(parsed.stderr).toBe('');
		expect(parsed.exitCode).toBe(0);
		expect(result.isError).toBeUndefined();
	});

	it('captures stderr and exits with code 1', async () => {
		const child = makeMockChild();
		mockSpawn.mockReturnValue(child as unknown as ReturnType<typeof spawn>);

		const resultPromise = shellExecuteTool.execute(
			{ command: 'bad-cmd', timeout: 5000 },
			DUMMY_CONTEXT,
		);

		await flushMicrotasks();

		child.stderr.emit('data', Buffer.from('command not found\n'));
		const closeHandler = getCloseHandler(child.on);
		closeHandler?.(1);

		const result = await resultPromise;
		// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
		const parsed = JSON.parse(textOf(result)) as {
			stdout: string;
			stderr: string;
			exitCode: number;
		};

		expect(parsed.stderr).toBe('command not found\n');
		expect(parsed.exitCode).toBe(1);
		expect(result.isError).toBe(true);
	});

	it('captures both stdout and stderr', async () => {
		const child = makeMockChild();
		mockSpawn.mockReturnValue(child as unknown as ReturnType<typeof spawn>);

		const resultPromise = shellExecuteTool.execute(
			{ command: 'mixed', timeout: 5000 },
			DUMMY_CONTEXT,
		);

		await flushMicrotasks();

		child.stdout.emit('data', Buffer.from('out-line\n'));
		child.stderr.emit('data', Buffer.from('err-line\n'));
		const closeHandler = getCloseHandler(child.on);
		closeHandler?.(0);

		const result = await resultPromise;
		// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
		const parsed = JSON.parse(textOf(result)) as {
			stdout: string;
			stderr: string;
			exitCode: number;
		};

		expect(parsed.stdout).toBe('out-line\n');
		expect(parsed.stderr).toBe('err-line\n');
		expect(parsed.exitCode).toBe(0);
	});

	it('kills the child and returns timedOut:true when timeout is exceeded', async () => {
		vi.useFakeTimers();
		const child = makeMockChild();
		mockSpawn.mockReturnValue(child as unknown as ReturnType<typeof spawn>);

		const resultPromise = shellExecuteTool.execute(
			{ command: 'sleep 999', timeout: 1000 },
			DUMMY_CONTEXT,
		);

		await flushMicrotasks();

		vi.advanceTimersByTime(1001);

		const result = await resultPromise;
		// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
		const parsed = JSON.parse(textOf(result)) as {
			stdout: string;
			stderr: string;
			exitCode: null;
			timedOut: boolean;
		};

		expect(parsed.timedOut).toBe(true);
		expect(parsed.exitCode).toBeNull();
		expect(child.kill).toHaveBeenCalled();

		vi.useRealTimers();
	});

	it('resolves with an error result when spawn emits an error event', async () => {
		const child = makeMockChild();
		mockSpawn.mockReturnValue(child as unknown as ReturnType<typeof spawn>);

		const resultPromise = shellExecuteTool.execute(
			{ command: 'nonexistent-binary', timeout: 5000 },
			DUMMY_CONTEXT,
		);

		await flushMicrotasks();

		const errorHandler = getErrorHandler(child.on);
		errorHandler?.(new Error('spawn sh ENOENT'));

		const result = await resultPromise;

		expect(result.isError).toBe(true);
		// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
		const parsed = JSON.parse(textOf(result)) as { error: string };
		expect(parsed.error).toBe('Failed to start process: spawn sh ENOENT');
	});

	it('passes cwd option to spawn', async () => {
		const child = makeMockChild();
		mockSpawn.mockReturnValue(child as unknown as ReturnType<typeof spawn>);

		const resultPromise = shellExecuteTool.execute(
			{ command: 'pwd', timeout: 5000, cwd: '/custom/path' },
			DUMMY_CONTEXT,
		);

		await flushMicrotasks();

		const closeHandler = getCloseHandler(child.on);
		closeHandler?.(0);
		await resultPromise;

		const [, , spawnOptions] = mockSpawn.mock.calls[0];
		expect(spawnOptions?.cwd).toBe('/custom/path');
	});

	it('resolves a relative cwd against the configured directory before spawning', async () => {
		const child = makeMockChild();
		mockSpawn.mockReturnValue(child as unknown as ReturnType<typeof spawn>);

		const resultPromise = shellExecuteTool.execute(
			{ command: 'pwd', timeout: 5000, cwd: 'custom/path' },
			DUMMY_CONTEXT,
		);

		await flushMicrotasks();

		const closeHandler = getCloseHandler(child.on);
		closeHandler?.(0);
		await resultPromise;

		const [, , spawnOptions] = mockSpawn.mock.calls[0];
		expect(spawnOptions?.cwd).toBe('/test/base/custom/path');
	});

	it('binds the resolved cwd into the permission resource', async () => {
		const resources = await shellExecuteTool.getAffectedResources(
			{ command: 'ls', cwd: '/custom/path' },
			DUMMY_CONTEXT,
		);

		expect(resources).toEqual([
			{
				toolGroup: 'shell',
				resource: '/custom/path: ls',
				description: 'Execute shell command: ls in /custom/path',
			},
		]);
	});

	it('binds the configured directory when cwd is omitted', async () => {
		const resources = await shellExecuteTool.getAffectedResources({ command: 'ls' }, DUMMY_CONTEXT);

		expect(resources).toEqual([
			{
				toolGroup: 'shell',
				resource: '/test/base: ls',
				description: 'Execute shell command: ls in /test/base',
			},
		]);
	});

	it('does not collide with commands that include cwd-looking suffixes', async () => {
		const [explicitCwdResource] = await shellExecuteTool.getAffectedResources(
			{ command: 'cat .env #', cwd: '/tmp' },
			DUMMY_CONTEXT,
		);
		const [commandSuffixResource] = await shellExecuteTool.getAffectedResources(
			{ command: 'cat .env #(cwd: /tmp)' },
			DUMMY_CONTEXT,
		);

		expect(explicitCwdResource.resource).toBe('/tmp: cat .env #');
		expect(commandSuffixResource.resource).toBe('/test/base: cat .env #(cwd: /tmp)');
		expect(explicitCwdResource.resource).not.toBe(commandSuffixResource.resource);
	});

	describe('cross-platform shell selection', () => {
		it('uses cmd.exe /C on win32', async () => {
			Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

			const child = makeMockChild();
			mockSpawn.mockReturnValue(child as unknown as ReturnType<typeof spawn>);

			const resultPromise = shellExecuteTool.execute(
				{ command: 'dir', timeout: 5000 },
				DUMMY_CONTEXT,
			);

			await flushMicrotasks();

			const closeHandler = getCloseHandler(child.on);
			closeHandler?.(0);
			await resultPromise;

			const [executable, args] = mockSpawn.mock.calls[0];
			expect(executable).toBe('cmd.exe');
			expect(args).toEqual(['/C', 'dir']);
		});

		it('uses sh -c on non-win32 platforms', async () => {
			Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });

			const child = makeMockChild();
			mockSpawn.mockReturnValue(child as unknown as ReturnType<typeof spawn>);

			const resultPromise = shellExecuteTool.execute(
				{ command: 'ls', timeout: 5000 },
				DUMMY_CONTEXT,
			);

			await flushMicrotasks();

			const closeHandler = getCloseHandler(child.on);
			closeHandler?.(0);
			await resultPromise;

			const [executable, args] = mockSpawn.mock.calls[0];
			expect(executable).toBe('sh');
			expect(args).toEqual(['-c', 'ls']);
		});

		it('wraps the command with the sandbox when sandboxed, regardless of platform', async () => {
			mockSandboxManager.wrapWithSandbox.mockResolvedValue('sandboxed-ls');

			const child = makeMockChild();
			mockSpawn.mockReturnValue(child as unknown as ReturnType<typeof spawn>);

			const sandboxedTool = createShellExecuteTool('sandboxed');
			const resultPromise = sandboxedTool.execute({ command: 'ls', timeout: 5000 }, DUMMY_CONTEXT);

			// The sandboxed path lazy-imports the runtime and awaits the wrap, so wait
			// for the spawn rather than counting microtasks.
			await flushUntil(() => mockSpawn.mock.calls.length > 0);

			const closeHandler = getCloseHandler(child.on);
			closeHandler?.(0);
			await resultPromise;

			expect(mockSandboxManager.wrapWithSandbox).toHaveBeenCalledWith('ls');
			const [executable, spawnOptions] = mockSpawn.mock.calls[0];
			expect(executable).toBe('sandboxed-ls');
			expect(spawnOptions).toMatchObject({ shell: true });
		});
	});

	describe('result JSON structure', () => {
		it('returns content array with a single text item', async () => {
			const child = makeMockChild();
			mockSpawn.mockReturnValue(child as unknown as ReturnType<typeof spawn>);

			const resultPromise = shellExecuteTool.execute(
				{ command: 'true', timeout: 5000 },
				DUMMY_CONTEXT,
			);

			await flushMicrotasks();

			const closeHandler = getCloseHandler(child.on);
			closeHandler?.(0);

			const result = await resultPromise;

			expect(result.content).toHaveLength(1);
			expect(result.content[0].type).toBe('text');
			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse, @typescript-eslint/no-unsafe-return
			expect(() => JSON.parse(textOf(result))).not.toThrow();
		});
	});

	describe('exit code propagation', () => {
		it.each([
			[0, 'success'],
			[1, 'general error'],
			[127, 'command not found'],
		])('records exit code %i (%s) in result', async (exitCode, _description) => {
			const child = makeMockChild();
			mockSpawn.mockReturnValue(child as unknown as ReturnType<typeof spawn>);

			const resultPromise = shellExecuteTool.execute(
				{ command: 'cmd', timeout: 5000 },
				DUMMY_CONTEXT,
			);

			await flushMicrotasks();

			const closeHandler = getCloseHandler(child.on);
			closeHandler?.(exitCode);

			const result = await resultPromise;
			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			const parsed = JSON.parse(textOf(result)) as { exitCode: number };

			expect(parsed.exitCode).toBe(exitCode);
			if (exitCode === 0) {
				expect(result.isError).toBeUndefined();
			} else {
				expect(result.isError).toBe(true);
			}
		});
	});
});

describe('getAffectedResources', () => {
	it('uses buildShellResource for the resource and includes the full command in description', () => {
		const resources = shellExecuteTool.getAffectedResources(
			{ command: 'git status' },
			{ dir: '/tmp' },
		);
		expect(resources).toHaveLength(1);
		const [resource] = resources as AffectedResource[];
		expect(resource.toolGroup).toBe('shell');
		expect(resource.resource).toBe(buildShellResource('git status', '/tmp'));
		expect(resource.description).toContain('git status');
		expect(resource.description).toContain('/tmp');
	});
});

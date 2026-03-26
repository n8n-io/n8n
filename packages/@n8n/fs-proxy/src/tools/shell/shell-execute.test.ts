import { spawn } from 'child_process';
import { EventEmitter } from 'events';

import { textOf } from '../test-utils';
import type { AffectedResource } from '../types';
import { buildShellResource } from './build-shell-resource';
import { ShellModule } from './index';
import { shellExecuteTool } from './shell-execute';

jest.mock('child_process');

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

const DUMMY_CONTEXT = { dir: '/test/base' };

function makeMockChild(
	overrides: Partial<{
		stdout: EventEmitter;
		stderr: EventEmitter;
		kill: jest.Mock;
		on: jest.Mock;
	}> = {},
) {
	const stdout = overrides.stdout ?? new EventEmitter();
	const stderr = overrides.stderr ?? new EventEmitter();
	const kill = overrides.kill ?? jest.fn();
	const on = overrides.on ?? jest.fn();
	return { stdout, stderr, kill, on };
}

function getCloseHandler(on: jest.Mock): ((code: number) => void) | undefined {
	const call = on.mock.calls.find((args: unknown[]) => args[0] === 'close') as
		| [string, (code: number) => void]
		| undefined;
	return call?.[1];
}

describe('shell_execute tool', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it('captures stdout and exits with code 0', async () => {
		const child = makeMockChild();
		mockSpawn.mockReturnValue(child as unknown as ReturnType<typeof spawn>);

		const resultPromise = shellExecuteTool.execute(
			{ command: 'echo hello', timeout: 5000 },
			DUMMY_CONTEXT,
		);

		// Emit stdout data then close
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
	});

	it('captures stderr and exits with code 1', async () => {
		const child = makeMockChild();
		mockSpawn.mockReturnValue(child as unknown as ReturnType<typeof spawn>);

		const resultPromise = shellExecuteTool.execute(
			{ command: 'bad-cmd', timeout: 5000 },
			DUMMY_CONTEXT,
		);

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
	});

	it('captures both stdout and stderr', async () => {
		const child = makeMockChild();
		mockSpawn.mockReturnValue(child as unknown as ReturnType<typeof spawn>);

		const resultPromise = shellExecuteTool.execute(
			{ command: 'mixed', timeout: 5000 },
			DUMMY_CONTEXT,
		);

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
		jest.useFakeTimers();
		const child = makeMockChild();
		mockSpawn.mockReturnValue(child as unknown as ReturnType<typeof spawn>);

		const resultPromise = shellExecuteTool.execute(
			{ command: 'sleep 999', timeout: 1000 },
			DUMMY_CONTEXT,
		);

		jest.advanceTimersByTime(1001);

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

		jest.useRealTimers();
	});

	it('passes cwd option to spawn', async () => {
		const child = makeMockChild();
		mockSpawn.mockReturnValue(child as unknown as ReturnType<typeof spawn>);

		const resultPromise = shellExecuteTool.execute(
			{ command: 'pwd', timeout: 5000, cwd: '/custom/path' },
			DUMMY_CONTEXT,
		);

		const closeHandler = getCloseHandler(child.on);
		closeHandler?.(0);
		await resultPromise;

		const [, , spawnOptions] = mockSpawn.mock.calls[0];
		expect(spawnOptions?.cwd).toBe('/custom/path');
	});

	describe('cross-platform shell selection', () => {
		const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');

		afterEach(() => {
			if (originalPlatform) {
				Object.defineProperty(process, 'platform', originalPlatform);
			}
		});

		it('uses cmd.exe /C on win32', async () => {
			Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

			const child = makeMockChild();
			mockSpawn.mockReturnValue(child as unknown as ReturnType<typeof spawn>);

			const resultPromise = shellExecuteTool.execute(
				{ command: 'dir', timeout: 5000 },
				DUMMY_CONTEXT,
			);

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

			const closeHandler = getCloseHandler(child.on);
			closeHandler?.(0);
			await resultPromise;

			const [executable, args] = mockSpawn.mock.calls[0];
			expect(executable).toBe('sh');
			expect(args).toEqual(['-c', 'ls']);
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

			const closeHandler = getCloseHandler(child.on);
			closeHandler?.(exitCode);

			const result = await resultPromise;
			// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
			const parsed = JSON.parse(textOf(result)) as { exitCode: number };

			expect(parsed.exitCode).toBe(exitCode);
		});
	});
});

describe('ShellModule', () => {
	it('isSupported returns true', () => {
		expect(ShellModule.isSupported()).toBe(true);
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
		expect(resource.resource).toBe(buildShellResource('git status'));
		expect(resource.description).toContain('git status');
	});
});

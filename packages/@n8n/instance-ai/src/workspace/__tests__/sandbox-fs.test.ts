import type { Mock } from 'vitest';

import {
	escapeSingleQuotes,
	writeFileViaSandbox,
	readFileViaSandbox,
	runInSandbox,
} from '../sandbox-fs';

function createMockWorkspace(overrides?: {
	executeCommand?: Mock;
	processes?: { spawn: Mock };
}) {
	return {
		sandbox: {
			executeCommand: overrides?.executeCommand,
			processes: overrides?.processes,
			...(!overrides?.executeCommand && !overrides?.processes ? {} : {}),
		},
	} as never;
}

describe('escapeSingleQuotes', () => {
	it('should return the same string when no single quotes are present', () => {
		expect(escapeSingleQuotes('hello world')).toBe('hello world');
	});

	it('should escape single quotes using POSIX technique', () => {
		expect(escapeSingleQuotes("it's")).toBe("it'\\''s");
	});

	it('should escape multiple single quotes', () => {
		expect(escapeSingleQuotes("it's a 'test'")).toBe("it'\\''s a '\\''test'\\''");
	});

	it('should return an empty string unchanged', () => {
		expect(escapeSingleQuotes('')).toBe('');
	});
});

describe('runInSandbox', () => {
	it('should use executeCommand when available', async () => {
		const executeCommand = vi.fn().mockResolvedValue({
			exitCode: 0,
			stdout: 'output',
			stderr: '',
		});
		const workspace = createMockWorkspace({ executeCommand });

		const result = await runInSandbox(workspace, 'echo hello', '/home');

		expect(executeCommand).toHaveBeenCalledWith('echo hello', [], { cwd: '/home' });
		expect(result).toEqual({ exitCode: 0, stdout: 'output', stderr: '' });
	});

	it('should fall back to processes.spawn when executeCommand is not available', async () => {
		const waitFn = vi.fn().mockResolvedValue({
			exitCode: 0,
			stdout: 'spawned output',
			stderr: '',
		});
		const spawn = vi.fn().mockResolvedValue({ wait: waitFn });
		const workspace = createMockWorkspace({ processes: { spawn } });

		const result = await runInSandbox(workspace, 'ls -la', '/tmp');

		expect(spawn).toHaveBeenCalledWith('ls -la', { cwd: '/tmp' });
		expect(waitFn).toHaveBeenCalled();
		expect(result).toEqual({ exitCode: 0, stdout: 'spawned output', stderr: '' });
	});

	it('should throw when sandbox has neither executeCommand nor processes', async () => {
		const workspace = { sandbox: {} } as never;

		await expect(runInSandbox(workspace, 'echo test')).rejects.toThrow(
			'Sandbox has neither executeCommand nor processes available',
		);
	});

	it('should throw when workspace has no sandbox', async () => {
		const workspace = { sandbox: undefined } as never;

		await expect(runInSandbox(workspace, 'echo test')).rejects.toThrow('Workspace has no sandbox');
	});

	it('should return non-zero exit code without throwing', async () => {
		const executeCommand = vi.fn().mockResolvedValue({
			exitCode: 1,
			stdout: '',
			stderr: 'command not found',
		});
		const workspace = createMockWorkspace({ executeCommand });

		const result = await runInSandbox(workspace, 'invalid-cmd');

		expect(result).toEqual({ exitCode: 1, stdout: '', stderr: 'command not found' });
	});
});

describe('writeFileViaSandbox', () => {
	it('should create parent directory and write base64-encoded content', async () => {
		const executeCommand = vi.fn().mockResolvedValue({
			exitCode: 0,
			stdout: '',
			stderr: '',
		});
		const workspace = createMockWorkspace({ executeCommand });

		await writeFileViaSandbox(workspace, '/home/user/workspace/src/test.ts', 'const x = 1;');

		// First call: mkdir -p for parent directory
		expect(executeCommand).toHaveBeenCalledWith(
			expect.stringContaining('mkdir -p'),
			[],
			expect.objectContaining({}),
		);

		// Second call: base64 write
		const expectedB64 = Buffer.from('const x = 1;', 'utf-8').toString('base64');
		expect(executeCommand).toHaveBeenCalledWith(
			expect.stringContaining(expectedB64),
			[],
			expect.objectContaining({}),
		);
	});

	it('should throw when the write command fails', async () => {
		const executeCommand = vi
			.fn()
			.mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // mkdir
			.mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // temp file
			.mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: 'permission denied' }); // append chunk
		const workspace = createMockWorkspace({ executeCommand });

		await expect(writeFileViaSandbox(workspace, '/home/user/test.ts', 'content')).rejects.toThrow(
			'Failed to write file /home/user/test.ts: permission denied',
		);
	});

	it('should skip mkdir when file has no parent directory', async () => {
		const executeCommand = vi.fn().mockResolvedValue({
			exitCode: 0,
			stdout: '',
			stderr: '',
		});
		const workspace = createMockWorkspace({ executeCommand });

		await writeFileViaSandbox(workspace, 'test.ts', 'hello');

		// Temp file, append chunk, decode. No mkdir.
		expect(executeCommand).toHaveBeenCalledTimes(3);
		expect(executeCommand).toHaveBeenCalledWith(
			expect.stringContaining('base64'),
			[],
			expect.objectContaining({}),
		);
	});

	it('should split large content into multiple append commands', async () => {
		const executeCommand = vi.fn().mockResolvedValue({
			exitCode: 0,
			stdout: '',
			stderr: '',
		});
		const workspace = createMockWorkspace({ executeCommand });

		await writeFileViaSandbox(workspace, '/home/user/large.txt', 'x'.repeat(100_000));

		const commands = (executeCommand.mock.calls as Array<[string, ...unknown[]]>).map(
			([command]) => command,
		);
		const appendCommands = commands.filter((command) => command.startsWith("printf '%s'"));

		expect(appendCommands.length).toBeGreaterThan(1);
		expect(commands.every((command) => command.length < 40_000)).toBe(true);
		expect(commands.some((command) => command.includes('| base64 -d >'))).toBe(false);
	});

	it('does not assign to the read-only zsh builtin `status` when capturing exit code', async () => {
		const executeCommand = vi.fn().mockResolvedValue({
			exitCode: 0,
			stdout: '',
			stderr: '',
		});
		const workspace = createMockWorkspace({ executeCommand });

		await writeFileViaSandbox(workspace, '/home/user/test.ts', 'hello');

		const commands = (executeCommand.mock.calls as Array<[string, ...unknown[]]>).map(
			([command]) => command,
		);
		// `status` is read-only in zsh; assigning to it silently drops the
		// captured exit code. Confirm the decode command uses a different name.
		const decodeCommands = commands.filter((command) => command.includes('base64 -d'));
		expect(decodeCommands.length).toBeGreaterThan(0);
		expect(decodeCommands.every((command) => !/\bstatus=\$\?/.test(command))).toBe(true);
	});
});

describe('readFileViaSandbox', () => {
	it('should return file content on success', async () => {
		const executeCommand = vi.fn().mockResolvedValue({
			exitCode: 0,
			stdout: 'file content here',
			stderr: '',
		});
		const workspace = createMockWorkspace({ executeCommand });

		const result = await readFileViaSandbox(workspace, '/home/user/test.ts');

		expect(result).toBe('file content here');
		expect(executeCommand).toHaveBeenCalledWith(
			expect.stringContaining("cat '/home/user/test.ts'"),
			[],
			expect.objectContaining({}),
		);
	});

	it('should return null when file does not exist', async () => {
		const executeCommand = vi.fn().mockResolvedValue({
			exitCode: 1,
			stdout: '',
			stderr: '',
		});
		const workspace = createMockWorkspace({ executeCommand });

		const result = await readFileViaSandbox(workspace, '/nonexistent/file.ts');

		expect(result).toBeNull();
	});

	it('should escape single quotes in file paths', async () => {
		const executeCommand = vi.fn().mockResolvedValue({
			exitCode: 0,
			stdout: 'content',
			stderr: '',
		});
		const workspace = createMockWorkspace({ executeCommand });

		await readFileViaSandbox(workspace, "/home/user/it's a file.ts");

		expect(executeCommand).toHaveBeenCalledWith(
			expect.stringContaining("it'\\''s a file.ts"),
			[],
			expect.objectContaining({}),
		);
	});
});

import {
	escapeSingleQuotes,
	writeFileViaSandbox,
	readFileViaSandbox,
	runInSandbox,
} from '../sandbox-fs';

function createMockWorkspace(overrides?: {
	executeCommand?: jest.Mock;
	processes?: { spawn: jest.Mock };
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
		const executeCommand = jest.fn().mockResolvedValue({
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
		const waitFn = jest.fn().mockResolvedValue({
			exitCode: 0,
			stdout: 'spawned output',
			stderr: '',
		});
		const spawn = jest.fn().mockResolvedValue({ wait: waitFn });
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
		const executeCommand = jest.fn().mockResolvedValue({
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
		const executeCommand = jest.fn().mockResolvedValue({
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
		const executeCommand = jest
			.fn()
			.mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // mkdir
			.mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: 'permission denied' }); // write
		const workspace = createMockWorkspace({ executeCommand });

		await expect(writeFileViaSandbox(workspace, '/home/user/test.ts', 'content')).rejects.toThrow(
			'Failed to write file /home/user/test.ts: permission denied',
		);
	});

	it('should skip mkdir when file has no parent directory', async () => {
		const executeCommand = jest.fn().mockResolvedValue({
			exitCode: 0,
			stdout: '',
			stderr: '',
		});
		const workspace = createMockWorkspace({ executeCommand });

		await writeFileViaSandbox(workspace, 'test.ts', 'hello');

		// Only one call (the base64 write), no mkdir
		expect(executeCommand).toHaveBeenCalledTimes(1);
		expect(executeCommand).toHaveBeenCalledWith(
			expect.stringContaining('base64'),
			[],
			expect.objectContaining({}),
		);
	});
});

describe('readFileViaSandbox', () => {
	it('should return file content on success', async () => {
		const executeCommand = jest.fn().mockResolvedValue({
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
		const executeCommand = jest.fn().mockResolvedValue({
			exitCode: 1,
			stdout: '',
			stderr: '',
		});
		const workspace = createMockWorkspace({ executeCommand });

		const result = await readFileViaSandbox(workspace, '/nonexistent/file.ts');

		expect(result).toBeNull();
	});

	it('should escape single quotes in file paths', async () => {
		const executeCommand = jest.fn().mockResolvedValue({
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

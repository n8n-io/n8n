import {
	createRunJavascriptTool,
	runJavascriptInputSchema,
} from '../../workspace/tools/run-javascript';
import type { CommandResult, WorkspaceFilesystem, WorkspaceSandbox } from '../../workspace/types';

function makeFakeFilesystem(overrides: Partial<WorkspaceFilesystem> = {}): WorkspaceFilesystem {
	return {
		id: 'test-fs',
		name: 'TestFS',
		provider: 'test',
		status: 'ready',
		readFile: vi.fn().mockResolvedValue('file content'),
		writeFile: vi.fn().mockResolvedValue(undefined),
		appendFile: vi.fn().mockResolvedValue(undefined),
		deleteFile: vi.fn().mockResolvedValue(undefined),
		copyFile: vi.fn().mockResolvedValue(undefined),
		moveFile: vi.fn().mockResolvedValue(undefined),
		mkdir: vi.fn().mockResolvedValue(undefined),
		rmdir: vi.fn().mockResolvedValue(undefined),
		readdir: vi.fn().mockResolvedValue([]),
		exists: vi.fn().mockResolvedValue(true),
		stat: vi.fn().mockResolvedValue({
			name: 'test.js',
			path: '/test.js',
			type: 'file' as const,
			size: 100,
			createdAt: new Date('2024-01-01'),
			modifiedAt: new Date('2024-06-01'),
		}),
		...overrides,
	};
}

function makeFakeSandbox(result: Partial<CommandResult> = {}): WorkspaceSandbox {
	const mockResult: CommandResult = {
		success: true,
		exitCode: 0,
		stdout: 'ok',
		stderr: '',
		executionTimeMs: 12,
		...result,
	};
	return {
		id: 'test-sandbox',
		name: 'TestSandbox',
		provider: 'test',
		status: 'running',
		executeCommand: vi.fn().mockResolvedValue(mockResult),
	};
}

describe('runJavascriptInputSchema', () => {
	it('accepts exactly one of path or code', () => {
		expect(runJavascriptInputSchema.safeParse({ path: 'plot.js' }).success).toBe(true);
		expect(runJavascriptInputSchema.safeParse({ code: 'console.log(1)' }).success).toBe(true);
	});

	it('rejects both path and code', () => {
		const parsed = runJavascriptInputSchema.safeParse({ path: 'plot.js', code: 'console.log(1)' });
		expect(parsed.success).toBe(false);
		if (!parsed.success) {
			expect(parsed.error.message).toContain('Provide exactly one of path or code');
		}
	});

	it('rejects neither path nor code', () => {
		const parsed = runJavascriptInputSchema.safeParse({});
		expect(parsed.success).toBe(false);
		if (!parsed.success) {
			expect(parsed.error.message).toContain('Provide exactly one of path or code');
		}
	});
});

describe('createRunJavascriptTool', () => {
	it('writes a Scratch snippet then runs node with a 60 s timeout and no env or cwd', async () => {
		const filesystem = makeFakeFilesystem();
		const sandbox = makeFakeSandbox();
		const tool = createRunJavascriptTool(sandbox, filesystem);

		const result = await tool.handler!({ code: 'console.log(1)' }, {} as never);

		expect(filesystem.mkdir).toHaveBeenCalledWith('.n8n-run', {
			recursive: true,
			abortSignal: undefined,
		});
		expect(filesystem.writeFile).toHaveBeenCalledTimes(1);
		const scriptPath = vi.mocked(filesystem.writeFile).mock.calls[0]?.[0];
		expect(scriptPath).toMatch(/^\.n8n-run\/[0-9a-f-]{36}\.js$/);
		expect(filesystem.writeFile).toHaveBeenCalledWith(scriptPath, 'console.log(1)', {
			overwrite: true,
			abortSignal: undefined,
		});
		expect(sandbox.executeCommand).toHaveBeenCalledWith('node', [scriptPath], {
			timeout: 60_000,
			abortSignal: undefined,
		});
		expect(result).toEqual({
			exitCode: 0,
			stdout: 'ok',
			stderr: '',
			executionTimeMs: 12,
		});
	});

	it('runs an existing path with node and does not write a snippet', async () => {
		const filesystem = makeFakeFilesystem();
		const sandbox = makeFakeSandbox();
		const tool = createRunJavascriptTool(sandbox, filesystem);

		await tool.handler!({ path: 'plot.js' }, {} as never);

		expect(filesystem.writeFile).not.toHaveBeenCalled();
		expect(filesystem.mkdir).not.toHaveBeenCalled();
		expect(sandbox.executeCommand).toHaveBeenCalledWith('node', ['plot.js'], {
			timeout: 60_000,
			abortSignal: undefined,
		});
	});

	it('throws when exitCode is non-zero and includes stderr', async () => {
		const filesystem = makeFakeFilesystem();
		const sandbox = makeFakeSandbox({
			success: false,
			exitCode: 1,
			stdout: 'partial',
			stderr: 'ReferenceError: x is not defined',
		});
		const tool = createRunJavascriptTool(sandbox, filesystem);

		await expect(tool.handler!({ path: 'plot.js' }, {} as never)).rejects.toThrow(
			/exitCode=1[\s\S]*ReferenceError: x is not defined/,
		);
	});

	it('throws when the run times out and includes stderr', async () => {
		const filesystem = makeFakeFilesystem();
		const sandbox = makeFakeSandbox({
			success: false,
			exitCode: 1,
			timedOut: true,
			stdout: '',
			stderr: 'Command timed out',
		});
		const tool = createRunJavascriptTool(sandbox, filesystem);

		await expect(tool.handler!({ code: 'while (true) {}' }, {} as never)).rejects.toThrow(
			/timedOut=true[\s\S]*Command timed out/,
		);
	});
});

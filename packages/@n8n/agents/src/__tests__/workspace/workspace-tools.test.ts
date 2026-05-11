import { zodToJsonSchema } from '../../utils/zod';
import { createWorkspaceTools } from '../../workspace/tools/workspace-tools';
import type { WorkspaceFilesystem, WorkspaceSandbox, CommandResult } from '../../workspace/types';

function makeFakeFilesystem(overrides: Partial<WorkspaceFilesystem> = {}): WorkspaceFilesystem {
	return {
		id: 'test-fs',
		name: 'TestFS',
		provider: 'test',
		status: 'ready',
		readFile: jest.fn().mockResolvedValue('file content'),
		writeFile: jest.fn().mockResolvedValue(undefined),
		appendFile: jest.fn().mockResolvedValue(undefined),
		deleteFile: jest.fn().mockResolvedValue(undefined),
		copyFile: jest.fn().mockResolvedValue(undefined),
		moveFile: jest.fn().mockResolvedValue(undefined),
		mkdir: jest.fn().mockResolvedValue(undefined),
		rmdir: jest.fn().mockResolvedValue(undefined),
		readdir: jest.fn().mockResolvedValue([
			{ name: 'file1.txt', type: 'file' as const },
			{ name: 'subdir', type: 'directory' as const },
		]),
		exists: jest.fn().mockResolvedValue(true),
		stat: jest.fn().mockResolvedValue({
			name: 'test.txt',
			path: '/test.txt',
			type: 'file' as const,
			size: 100,
			createdAt: new Date('2024-01-01'),
			modifiedAt: new Date('2024-06-01'),
		}),
		...overrides,
	};
}

function makeFakeSandbox(overrides: Partial<WorkspaceSandbox> = {}): WorkspaceSandbox {
	const mockResult: CommandResult = {
		success: true,
		exitCode: 0,
		stdout: 'hello world',
		stderr: '',
		executionTimeMs: 42,
	};
	return {
		id: 'test-sandbox',
		name: 'TestSandbox',
		provider: 'test',
		status: 'running',
		executeCommand: jest.fn().mockResolvedValue(mockResult),
		...overrides,
	};
}

describe('createWorkspaceTools', () => {
	it('returns no tools when workspace has no providers', () => {
		const tools = createWorkspaceTools({});
		expect(tools).toEqual([]);
	});

	it('returns filesystem tools when filesystem is set', () => {
		const tools = createWorkspaceTools({ filesystem: makeFakeFilesystem() });
		const names = tools.map((t) => t.name);

		expect(names).toEqual([
			'workspace_read_file',
			'workspace_str_replace_file',
			'workspace_batch_str_replace_file',
			'workspace_write_file',
			'workspace_list_files',
			'workspace_file_stat',
			'workspace_mkdir',
			'workspace_delete_file',
			'workspace_append_file',
			'workspace_copy_file',
			'workspace_move_file',
			'workspace_rmdir',
		]);
	});

	it('returns execute_command when sandbox has executeCommand', () => {
		const tools = createWorkspaceTools({ sandbox: makeFakeSandbox() });
		const names = tools.map((t) => t.name);

		expect(names).toEqual(['workspace_execute_command']);
	});

	it('does not return execute_command when sandbox lacks executeCommand', () => {
		const tools = createWorkspaceTools({
			sandbox: makeFakeSandbox({ executeCommand: undefined }),
		});

		expect(tools).toEqual([]);
	});

	it('returns all tools when both filesystem and sandbox are set', () => {
		const tools = createWorkspaceTools({
			filesystem: makeFakeFilesystem(),
			sandbox: makeFakeSandbox(),
		});
		const names = tools.map((t) => t.name);

		expect(names).toContain('workspace_read_file');
		expect(names).toContain('workspace_str_replace_file');
		expect(names).toContain('workspace_batch_str_replace_file');
		expect(names).toContain('workspace_execute_command');
		expect(names).toHaveLength(13);
	});

	describe('tool handlers', () => {
		it('read_file handler calls filesystem.readFile', async () => {
			const fs = makeFakeFilesystem();
			const tools = createWorkspaceTools({ filesystem: fs });
			const readTool = tools.find((t) => t.name === 'workspace_read_file')!;

			const result = await readTool.handler!({ path: '/test.txt', encoding: 'utf-8' }, {} as never);

			expect(fs.readFile).toHaveBeenCalledWith('/test.txt', { encoding: 'utf-8' });
			expect(result).toEqual({ content: 'file content' });
		});

		it('targeted edit input schemas serialize with a top-level object type', () => {
			const tools = createWorkspaceTools({ filesystem: makeFakeFilesystem() });
			const strReplaceTool = tools.find((t) => t.name === 'workspace_str_replace_file')!;
			const batchStrReplaceTool = tools.find((t) => t.name === 'workspace_batch_str_replace_file')!;

			expect(zodToJsonSchema(strReplaceTool.inputSchema)).toMatchObject({ type: 'object' });
			expect(zodToJsonSchema(batchStrReplaceTool.inputSchema)).toMatchObject({
				type: 'object',
			});
		});

		it('str_replace_file handler reads then writes changed content', async () => {
			const fs = makeFakeFilesystem({
				readFile: jest.fn().mockResolvedValue('first\nsecond'),
			});
			const tools = createWorkspaceTools({ filesystem: fs });
			const strReplaceTool = tools.find((t) => t.name === 'workspace_str_replace_file')!;

			const result = await strReplaceTool.handler!(
				{
					path: '/test.txt',
					old_str: 'second',
					new_str: 'changed',
				},
				{} as never,
			);

			expect(fs.writeFile).toHaveBeenCalledWith('/test.txt', 'first\nchanged', {
				overwrite: true,
			});
			expect(result).toEqual({ success: true, result: 'Edit applied successfully.' });
		});

		it('str_replace_file handler returns errors without writing when replacement is not unique', async () => {
			const fs = makeFakeFilesystem({
				readFile: jest.fn().mockResolvedValue('same\nsame'),
			});
			const tools = createWorkspaceTools({ filesystem: fs });
			const strReplaceTool = tools.find((t) => t.name === 'workspace_str_replace_file')!;

			const result = await strReplaceTool.handler!(
				{
					path: '/test.txt',
					old_str: 'same',
					new_str: 'changed',
				},
				{} as never,
			);

			expect(fs.writeFile).not.toHaveBeenCalled();
			expect(result).toEqual({
				success: false,
				error: 'Found 2 matches. Please provide more context to make the replacement unique.',
			});
		});

		it('batch_str_replace_file handler applies all replacements atomically', async () => {
			const fs = makeFakeFilesystem({
				readFile: jest.fn().mockResolvedValue('const a = 1;\nconst b = 2;'),
			});
			const tools = createWorkspaceTools({ filesystem: fs });
			const batchStrReplaceTool = tools.find((t) => t.name === 'workspace_batch_str_replace_file')!;

			const result = await batchStrReplaceTool.handler!(
				{
					path: '/test.ts',
					replacements: [
						{ old_str: 'const a = 1;', new_str: 'const a = 10;' },
						{ old_str: 'const b = 2;', new_str: 'const b = 20;' },
					],
				},
				{} as never,
			);

			expect(fs.writeFile).toHaveBeenCalledWith('/test.ts', 'const a = 10;\nconst b = 20;', {
				overwrite: true,
			});
			expect(result).toEqual({
				success: true,
				result: 'All 2 replacements applied successfully.',
			});
		});

		it('batch_str_replace_file handler does not write when any replacement fails', async () => {
			const fs = makeFakeFilesystem({
				readFile: jest.fn().mockResolvedValue('const a = 1;\nconst b = 2;'),
			});
			const tools = createWorkspaceTools({ filesystem: fs });
			const batchStrReplaceTool = tools.find((t) => t.name === 'workspace_batch_str_replace_file')!;

			const result = await batchStrReplaceTool.handler!(
				{
					path: '/test.ts',
					replacements: [
						{ old_str: 'const a = 1;', new_str: 'const a = 10;' },
						{ old_str: 'const missing = 0;', new_str: 'const missing = 1;' },
					],
				},
				{} as never,
			);

			expect(fs.writeFile).not.toHaveBeenCalled();
			expect(result).toEqual({
				success: false,
				error: 'Batch replacement failed.',
				results: [
					{ index: 0, old_str: 'const a = 1;', status: 'success' },
					{
						index: 1,
						old_str: 'const missing = 0;',
						status: 'failed',
						error:
							'No exact match found for str_replace. The old_str content was not found in the file.',
					},
				],
			});
		});

		it('write_file handler calls filesystem.writeFile', async () => {
			const fs = makeFakeFilesystem();
			const tools = createWorkspaceTools({ filesystem: fs });
			const writeTool = tools.find((t) => t.name === 'workspace_write_file')!;

			const result = await writeTool.handler!(
				{ path: '/out.txt', content: 'hello', recursive: true },
				{} as never,
			);

			expect(fs.writeFile).toHaveBeenCalledWith('/out.txt', 'hello', { recursive: true });
			expect(result).toEqual({ success: true });
		});

		it('list_files handler calls filesystem.readdir', async () => {
			const fs = makeFakeFilesystem();
			const tools = createWorkspaceTools({ filesystem: fs });
			const listTool = tools.find((t) => t.name === 'workspace_list_files')!;

			const result = await listTool.handler!({ path: '/', recursive: false }, {} as never);

			expect(fs.readdir).toHaveBeenCalledWith('/', { recursive: false });
			expect(result).toEqual({
				entries: [
					{ name: 'file1.txt', type: 'file' },
					{ name: 'subdir', type: 'directory' },
				],
			});
		});

		it('file_stat handler calls filesystem.stat', async () => {
			const fs = makeFakeFilesystem();
			const tools = createWorkspaceTools({ filesystem: fs });
			const statTool = tools.find((t) => t.name === 'workspace_file_stat')!;

			const result = await statTool.handler!({ path: '/test.txt' }, {} as never);

			expect(fs.stat).toHaveBeenCalledWith('/test.txt');
			expect(result).toEqual({
				name: 'test.txt',
				path: '/test.txt',
				type: 'file',
				size: 100,
				createdAt: '2024-01-01T00:00:00.000Z',
				modifiedAt: '2024-06-01T00:00:00.000Z',
			});
		});

		it('mkdir handler calls filesystem.mkdir', async () => {
			const fs = makeFakeFilesystem();
			const tools = createWorkspaceTools({ filesystem: fs });
			const mkdirTool = tools.find((t) => t.name === 'workspace_mkdir')!;

			const result = await mkdirTool.handler!({ path: '/new-dir', recursive: true }, {} as never);

			expect(fs.mkdir).toHaveBeenCalledWith('/new-dir', { recursive: true });
			expect(result).toEqual({ success: true });
		});

		it('delete_file handler calls filesystem.deleteFile', async () => {
			const fs = makeFakeFilesystem();
			const tools = createWorkspaceTools({ filesystem: fs });
			const deleteTool = tools.find((t) => t.name === 'workspace_delete_file')!;

			const result = await deleteTool.handler!(
				{ path: '/old.txt', recursive: false, force: true },
				{} as never,
			);

			expect(fs.deleteFile).toHaveBeenCalledWith('/old.txt', { recursive: false, force: true });
			expect(result).toEqual({ success: true });
		});

		it('append_file handler calls filesystem.appendFile', async () => {
			const fs = makeFakeFilesystem();
			const tools = createWorkspaceTools({ filesystem: fs });
			const appendTool = tools.find((t) => t.name === 'workspace_append_file')!;

			const result = await appendTool.handler!(
				{ path: '/log.txt', content: 'new line' },
				{} as never,
			);

			expect(fs.appendFile).toHaveBeenCalledWith('/log.txt', 'new line');
			expect(result).toEqual({ success: true });
		});

		it('copy_file handler calls filesystem.copyFile', async () => {
			const fs = makeFakeFilesystem();
			const tools = createWorkspaceTools({ filesystem: fs });
			const copyTool = tools.find((t) => t.name === 'workspace_copy_file')!;

			const result = await copyTool.handler!(
				{ src: '/a.txt', dest: '/b.txt', overwrite: true },
				{} as never,
			);

			expect(fs.copyFile).toHaveBeenCalledWith('/a.txt', '/b.txt', { overwrite: true });
			expect(result).toEqual({ success: true });
		});

		it('move_file handler calls filesystem.moveFile', async () => {
			const fs = makeFakeFilesystem();
			const tools = createWorkspaceTools({ filesystem: fs });
			const moveTool = tools.find((t) => t.name === 'workspace_move_file')!;

			const result = await moveTool.handler!(
				{ src: '/old.txt', dest: '/new.txt', overwrite: false },
				{} as never,
			);

			expect(fs.moveFile).toHaveBeenCalledWith('/old.txt', '/new.txt', { overwrite: false });
			expect(result).toEqual({ success: true });
		});

		it('rmdir handler calls filesystem.rmdir', async () => {
			const fs = makeFakeFilesystem();
			const tools = createWorkspaceTools({ filesystem: fs });
			const rmdirTool = tools.find((t) => t.name === 'workspace_rmdir')!;

			const result = await rmdirTool.handler!(
				{ path: '/old-dir', recursive: true, force: false },
				{} as never,
			);

			expect(fs.rmdir).toHaveBeenCalledWith('/old-dir', { recursive: true, force: false });
			expect(result).toEqual({ success: true });
		});

		it('execute_command handler calls sandbox.executeCommand', async () => {
			const sb = makeFakeSandbox();
			const tools = createWorkspaceTools({ sandbox: sb });
			const execTool = tools.find((t) => t.name === 'workspace_execute_command')!;

			const result = await execTool.handler!(
				{ command: 'echo hello', cwd: '/tmp', timeout: 5000 },
				{} as never,
			);

			expect(sb.executeCommand).toHaveBeenCalledWith('echo hello', undefined, {
				cwd: '/tmp',
				timeout: 5000,
			});
			expect(result).toEqual({
				success: true,
				exitCode: 0,
				stdout: 'hello world',
				stderr: '',
				executionTimeMs: 42,
			});
		});
	});
});

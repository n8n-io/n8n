import {
	Workspace,
	type CommandResult,
	type WorkspaceFilesystem,
	type WorkspaceSandbox,
} from '@n8n/agents';

import { createLazyRuntimeWorkspace } from '../lazy-runtime-workspace';

function createMockWorkspace() {
	const executeCommand = vi.fn<
		(...args: Parameters<NonNullable<WorkspaceSandbox['executeCommand']>>) => Promise<CommandResult>
	>(
		async (_command, _args, options) =>
			await Promise.resolve({
				success: true,
				exitCode: 0,
				stdout: options?.env?.CUSTOM_ENV ?? '',
				stderr: '',
				executionTimeMs: 1,
			}),
	);
	const filesystem: WorkspaceFilesystem = {
		id: 'fs',
		name: 'Filesystem',
		provider: 'test',
		status: 'ready',
		destroy: vi.fn(async () => {
			filesystem.status = 'destroyed';
			await Promise.resolve();
		}),
		getInstructions: vi.fn(() => 'Real filesystem instructions.'),
		readFile: vi.fn(async () => await Promise.resolve('hello')),
		writeFile: vi.fn(async () => await Promise.resolve()),
		appendFile: vi.fn(async () => await Promise.resolve()),
		deleteFile: vi.fn(async () => await Promise.resolve()),
		copyFile: vi.fn(async () => await Promise.resolve()),
		moveFile: vi.fn(async () => await Promise.resolve()),
		mkdir: vi.fn(async () => await Promise.resolve()),
		rmdir: vi.fn(async () => await Promise.resolve()),
		readdir: vi.fn(async () => await Promise.resolve([])),
		exists: vi.fn(async () => await Promise.resolve(true)),
		stat: vi.fn(
			async (path: string) =>
				await Promise.resolve({
					name: path,
					path,
					type: 'file' as const,
					size: 5,
					createdAt: new Date('2026-01-01T00:00:00.000Z'),
					modifiedAt: new Date('2026-01-01T00:00:00.000Z'),
				}),
		),
	};
	const sandbox: WorkspaceSandbox = {
		id: 'sandbox',
		name: 'Sandbox',
		provider: 'test',
		status: 'running',
		stop: vi.fn(async () => {
			sandbox.status = 'stopped';
			await Promise.resolve();
		}),
		destroy: vi.fn(async () => {
			sandbox.status = 'destroyed';
			await Promise.resolve();
		}),
		getInstructions: vi.fn(() => 'Real sandbox instructions.'),
		getDefaultCommandEnv: vi.fn(() => ({ CUSTOM_ENV: 'enabled' })),
		executeCommand,
	};

	return {
		workspace: new Workspace({ filesystem, sandbox }),
		filesystem,
		sandbox,
		executeCommand,
	};
}

describe('createLazyRuntimeWorkspace', () => {
	it('advertises workspace tools without creating the real workspace', async () => {
		const { workspace } = createMockWorkspace();
		const ensureWorkspace = vi.fn(async () => await Promise.resolve(workspace));
		const lazyWorkspace = createLazyRuntimeWorkspace({ ensureWorkspace });

		const tools = lazyWorkspace.getTools();
		lazyWorkspace.getInstructions();

		expect(ensureWorkspace).not.toHaveBeenCalled();
		expect(tools.some((tool) => tool.name === 'workspace_read_file')).toBe(true);
		expect(tools.some((tool) => tool.name === 'workspace_execute_command')).toBe(true);

		const readFile = tools.find((tool) => tool.name === 'workspace_read_file');
		await readFile?.handler?.({ path: '/workspace/report.md' }, {});

		expect(ensureWorkspace).toHaveBeenCalledTimes(1);
	});

	it('merges sandbox default env after the real workspace is created', async () => {
		const { workspace, executeCommand } = createMockWorkspace();
		const ensureWorkspace = vi.fn(async () => await Promise.resolve(workspace));
		const lazyWorkspace = createLazyRuntimeWorkspace({ ensureWorkspace });
		const executeCommandTool = lazyWorkspace
			.getTools()
			.find((tool) => tool.name === 'workspace_execute_command');

		const result = await executeCommandTool?.handler?.({ command: 'echo $CUSTOM_ENV' }, {});

		expect(result).toMatchObject({ stdout: 'enabled' });
		expect(executeCommand.mock.calls[0]?.[0]).toBe('echo $CUSTOM_ENV');
		expect(executeCommand.mock.calls[0]?.[1]).toEqual([]);
		expect(executeCommand.mock.calls[0]?.[2]?.env).toMatchObject({
			CUSTOM_ENV: 'enabled',
		});
	});

	it('retries workspace creation after the first lazy initialization fails', async () => {
		const { workspace } = createMockWorkspace();
		const ensureWorkspace = vi
			.fn()
			.mockRejectedValueOnce(new Error('setup failed'))
			.mockResolvedValueOnce(workspace);
		const lazyWorkspace = createLazyRuntimeWorkspace({ ensureWorkspace });
		const readFile = lazyWorkspace.getTools().find((tool) => tool.name === 'workspace_read_file');

		await expect(readFile?.handler?.({ path: '/workspace/report.md' }, {})).rejects.toThrow(
			'setup failed',
		);
		await expect(readFile?.handler?.({ path: '/workspace/report.md' }, {})).resolves.toEqual({
			content: 'hello',
		});

		expect(ensureWorkspace).toHaveBeenCalledTimes(2);
	});

	it('retries workspace creation after the first lazy initialization returns unavailable', async () => {
		const { workspace } = createMockWorkspace();
		const ensureWorkspace = vi
			.fn()
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce(workspace);
		const lazyWorkspace = createLazyRuntimeWorkspace({ ensureWorkspace });
		const readFile = lazyWorkspace.getTools().find((tool) => tool.name === 'workspace_read_file');

		await expect(readFile?.handler?.({ path: '/workspace/report.md' }, {})).rejects.toThrow(
			'Instance AI runtime workspace is unavailable.',
		);
		await expect(readFile?.handler?.({ path: '/workspace/report.md' }, {})).resolves.toEqual({
			content: 'hello',
		});

		expect(ensureWorkspace).toHaveBeenCalledTimes(2);
	});

	it('reflects resolved provider statuses and instructions', async () => {
		const { workspace } = createMockWorkspace();
		const ensureWorkspace = vi.fn(async () => await Promise.resolve(workspace));
		const lazyWorkspace = createLazyRuntimeWorkspace({ ensureWorkspace });

		expect(lazyWorkspace.filesystem?.status).toBe('pending');
		expect(lazyWorkspace.sandbox?.status).toBe('pending');
		expect(lazyWorkspace.getInstructions()).toContain('create the runtime workspace on first use');

		await lazyWorkspace.filesystem?.readFile('/workspace/report.md');

		expect(lazyWorkspace.filesystem?.status).toBe('ready');
		expect(lazyWorkspace.sandbox?.status).toBe('running');
		expect(lazyWorkspace.getInstructions()).toContain('Real sandbox instructions.');
		expect(lazyWorkspace.getInstructions()).toContain('Real filesystem instructions.');
	});

	it('destroys the resolved workspace when the lazy workspace is destroyed', async () => {
		const { workspace, filesystem, sandbox } = createMockWorkspace();
		const ensureWorkspace = vi.fn(async () => await Promise.resolve(workspace));
		const lazyWorkspace = createLazyRuntimeWorkspace({ ensureWorkspace });

		await lazyWorkspace.filesystem?.readFile('/workspace/report.md');
		await lazyWorkspace.destroy();

		expect(sandbox.destroy).toHaveBeenCalledTimes(1);
		expect(filesystem.destroy).toHaveBeenCalledTimes(1);
		expect(lazyWorkspace.filesystem?.status).toBe('destroyed');
		expect(lazyWorkspace.sandbox?.status).toBe('destroyed');
	});
});

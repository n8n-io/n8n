import {
	Workspace,
	type CommandResult,
	type WorkspaceFilesystem,
	type WorkspaceSandbox,
} from '@n8n/agents';
import type { Mock } from 'vitest';

import { createScopedWorkspace } from '../scoped-workspace';

function createFilesystem(overrides: Partial<WorkspaceFilesystem> = {}): WorkspaceFilesystem {
	return {
		id: 'filesystem-1',
		name: 'filesystem',
		provider: 'test',
		status: 'ready',
		readFile: vi.fn(async () => await Promise.resolve('content')),
		writeFile: vi.fn(async () => {
			await Promise.resolve();
		}),
		appendFile: vi.fn(async () => {
			await Promise.resolve();
		}),
		deleteFile: vi.fn(async () => {
			await Promise.resolve();
		}),
		copyFile: vi.fn(async () => {
			await Promise.resolve();
		}),
		moveFile: vi.fn(async () => {
			await Promise.resolve();
		}),
		mkdir: vi.fn(async () => {
			await Promise.resolve();
		}),
		rmdir: vi.fn(async () => {
			await Promise.resolve();
		}),
		readdir: vi.fn(async () => await Promise.resolve([])),
		exists: vi.fn(async () => await Promise.resolve(true)),
		stat: vi.fn(
			async () =>
				await Promise.resolve({
					name: 'workflow.ts',
					path: '/workspace/builders/agent-1/src/workflow.ts',
					type: 'file' as const,
					size: 10,
					createdAt: new Date('2026-01-01T00:00:00.000Z'),
					modifiedAt: new Date('2026-01-01T00:00:00.000Z'),
				}),
		),
		...overrides,
	};
}

function createSandbox(executeCommand: Mock | null = vi.fn()): WorkspaceSandbox {
	const result: CommandResult = {
		success: true,
		exitCode: 0,
		stdout: 'ok',
		stderr: '',
		executionTimeMs: 1,
	};

	const sandbox: WorkspaceSandbox = {
		id: 'sandbox-1',
		name: 'sandbox',
		provider: 'test',
		status: 'ready',
	};

	if (executeCommand !== null) {
		executeCommand.mockResolvedValue(result);
		sandbox.executeCommand = executeCommand;
	}

	return sandbox;
}

describe('createScopedWorkspace', () => {
	const root = '/workspace/builders/agent-1';

	it('resolves relative filesystem paths inside the builder root', async () => {
		const filesystem = createFilesystem();
		const workspace = createScopedWorkspace(new Workspace({ filesystem }), root);

		await workspace.filesystem?.writeFile('src/workflow.ts', 'code', { recursive: true });

		expect(filesystem.writeFile).toHaveBeenCalledWith(
			'/workspace/builders/agent-1/src/workflow.ts',
			'code',
			{ recursive: true },
		);
	});

	it('rejects filesystem paths outside the builder root', async () => {
		const filesystem = createFilesystem();
		const workspace = createScopedWorkspace(new Workspace({ filesystem }), root);

		await expect(
			workspace.filesystem?.readFile('/workspace/builders/agent-2/src/workflow.ts'),
		).rejects.toThrow('Path escapes builder workspace root');
		expect(filesystem.readFile).not.toHaveBeenCalled();
	});

	it('runs commands from the builder root and merges scoped environment variables', async () => {
		const executeCommand = vi.fn();
		const sandbox = createSandbox(executeCommand);
		const workspace = createScopedWorkspace(new Workspace({ sandbox }), root, {
			N8N_WORKSPACE_DIR: root,
		});

		await workspace.sandbox?.executeCommand?.('npm test', [], { env: { USER_ENV: 'kept' } });

		expect(executeCommand).toHaveBeenCalledWith('npm test', [], {
			cwd: root,
			env: {
				N8N_WORKSPACE_DIR: root,
				USER_ENV: 'kept',
			},
		});
	});

	it('rejects command working directories outside the builder root', async () => {
		const executeCommand = vi.fn();
		const sandbox = createSandbox(executeCommand);
		const workspace = createScopedWorkspace(new Workspace({ sandbox }), root);

		await expect(
			workspace.sandbox?.executeCommand?.('npm test', [], {
				cwd: '/workspace/builders/agent-2',
			}),
		).rejects.toThrow('Path escapes builder workspace root');
		expect(executeCommand).not.toHaveBeenCalled();
	});

	it('preserves sandboxes without command execution support', () => {
		const sandbox = createSandbox(null);
		const workspace = createScopedWorkspace(new Workspace({ sandbox }), root);

		expect(workspace.sandbox?.executeCommand).toBeUndefined();
	});
});

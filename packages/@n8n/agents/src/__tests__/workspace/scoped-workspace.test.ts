import { mock } from 'vitest-mock-extended';

import { createScopedWorkspace } from '../../workspace/scoped-workspace';
import type { WorkspaceFilesystem, WorkspaceSandbox } from '../../workspace/types';
import { Workspace } from '../../workspace/workspace';

const root = '/home/daytona/workspace/subagents/thread-1';

function makeScopedWorkspace(options?: { ensureRootExists?: boolean }) {
	const filesystem = mock<WorkspaceFilesystem>();
	const sandbox = mock<WorkspaceSandbox>();
	const scoped = createScopedWorkspace(
		new Workspace({ filesystem, sandbox }),
		root,
		undefined,
		options,
	);
	return { filesystem, sandbox, scoped };
}

describe('createScopedWorkspace ensureRootExists', () => {
	it('creates the scope root once before the first filesystem operation', async () => {
		const { filesystem, scoped } = makeScopedWorkspace({ ensureRootExists: true });

		await Promise.all([
			scoped.filesystem!.writeFile('a.md', 'a'),
			scoped.filesystem!.writeFile('b.md', 'b'),
		]);
		await scoped.filesystem!.readdir('.');

		expect(filesystem.mkdir).toHaveBeenCalledOnce();
		expect(filesystem.mkdir).toHaveBeenCalledWith(root, { recursive: true });
		expect(filesystem.mkdir.mock.invocationCallOrder[0]).toBeLessThan(
			filesystem.writeFile.mock.invocationCallOrder[0],
		);
	});

	it('creates the scope root before executing a command', async () => {
		const { filesystem, sandbox, scoped } = makeScopedWorkspace({ ensureRootExists: true });

		await scoped.sandbox!.executeCommand!('ls', []);

		expect(filesystem.mkdir).toHaveBeenCalledOnce();
		expect(filesystem.mkdir).toHaveBeenCalledWith(root, { recursive: true });
		expect(sandbox.executeCommand).toHaveBeenCalledWith(
			'ls',
			[],
			expect.objectContaining({ cwd: root }),
		);
	});

	it('does not create the root when ensureRootExists is not set', async () => {
		const { filesystem, scoped } = makeScopedWorkspace();

		await scoped.filesystem!.writeFile('a.md', 'a');
		await scoped.sandbox!.executeCommand!('ls', []);

		expect(filesystem.mkdir).not.toHaveBeenCalled();
	});

	it('rejects escaping paths before creating the scope root', async () => {
		const { filesystem, scoped } = makeScopedWorkspace({ ensureRootExists: true });

		await expect(scoped.filesystem!.readFile('../outside.md')).rejects.toThrow(
			'Path escapes workspace root',
		);
		await expect(scoped.sandbox!.executeCommand!('ls', [], { cwd: '../../etc' })).rejects.toThrow(
			'Path escapes workspace root',
		);

		expect(filesystem.mkdir).not.toHaveBeenCalled();
	});

	it('does not start root creation for an already-aborted operation', async () => {
		const { filesystem, scoped } = makeScopedWorkspace({ ensureRootExists: true });
		const controller = new AbortController();
		controller.abort();

		await expect(
			scoped.filesystem!.writeFile('a.md', 'a', { abortSignal: controller.signal }),
		).rejects.toThrow('aborted');

		expect(filesystem.mkdir).not.toHaveBeenCalled();
		expect(filesystem.writeFile).not.toHaveBeenCalled();
	});

	it('unblocks an aborted operation while the root is still being created', async () => {
		const { filesystem, scoped } = makeScopedWorkspace({ ensureRootExists: true });
		filesystem.mkdir.mockImplementation(async () => await new Promise<void>(() => {}));
		const controller = new AbortController();

		const write = scoped.filesystem!.writeFile('a.md', 'a', {
			abortSignal: controller.signal,
		});
		controller.abort();

		await expect(write).rejects.toThrow('aborted');
		expect(filesystem.writeFile).not.toHaveBeenCalled();
	});
});

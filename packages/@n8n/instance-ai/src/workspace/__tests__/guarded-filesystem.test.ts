import type { WorkspaceFilesystem } from '@mastra/core/workspace';

import { createGuardedFilesystem } from '../guarded-filesystem';

function createFilesystemMock(): jest.Mocked<WorkspaceFilesystem> {
	return {
		id: 'fs-1',
		name: 'MockFilesystem',
		provider: 'mock',
		status: 'ready',
		readFile: jest.fn().mockResolvedValue('content'),
		writeFile: jest.fn().mockResolvedValue(undefined),
		appendFile: jest.fn().mockResolvedValue(undefined),
		deleteFile: jest.fn().mockResolvedValue(undefined),
		copyFile: jest.fn().mockResolvedValue(undefined),
		moveFile: jest.fn().mockResolvedValue(undefined),
		mkdir: jest.fn().mockResolvedValue(undefined),
		rmdir: jest.fn().mockResolvedValue(undefined),
		readdir: jest.fn().mockResolvedValue([]),
		exists: jest.fn().mockResolvedValue(true),
		stat: jest.fn().mockResolvedValue({
			name: 'workflow.ts',
			path: '/workspace/src/workflow.ts',
			type: 'file',
			size: 7,
			createdAt: new Date(0),
			modifiedAt: new Date(0),
		}),
	};
}

describe('createGuardedFilesystem', () => {
	it('allows reads and writes while no terminal remediation is set', async () => {
		const rawFilesystem = createFilesystemMock();
		const { filesystem } = createGuardedFilesystem(rawFilesystem);

		await expect(filesystem.readFile('/workspace/src/workflow.ts')).resolves.toBe('content');
		await expect(
			filesystem.writeFile('/workspace/src/workflow.ts', 'updated'),
		).resolves.toBeUndefined();

		expect(rawFilesystem.readFile).toHaveBeenCalledTimes(1);
		expect(rawFilesystem.writeFile).toHaveBeenCalledWith(
			'/workspace/src/workflow.ts',
			'updated',
			undefined,
		);
	});

	it('blocks mutating operations after terminal remediation', async () => {
		const rawFilesystem = createFilesystemMock();
		const { filesystem, setMutationGuard } = createGuardedFilesystem(rawFilesystem);
		setMutationGuard(() => ({ guidance: 'Stop editing.' }));

		await expect(filesystem.readFile('/workspace/src/workflow.ts')).resolves.toBe('content');
		await expect(filesystem.writeFile('/workspace/src/workflow.ts', 'updated')).rejects.toThrow(
			'Stop editing.',
		);
		await expect(filesystem.mkdir('/workspace/chunks')).rejects.toThrow('Stop editing.');
		await expect(filesystem.deleteFile('/workspace/src/workflow.ts')).rejects.toThrow(
			'Stop editing.',
		);

		expect(rawFilesystem.readFile).toHaveBeenCalledTimes(1);
		expect(rawFilesystem.writeFile).not.toHaveBeenCalled();
		expect(rawFilesystem.mkdir).not.toHaveBeenCalled();
		expect(rawFilesystem.deleteFile).not.toHaveBeenCalled();
	});

	it('can clear the mutation guard for a reused workspace', async () => {
		const rawFilesystem = createFilesystemMock();
		const { filesystem, setMutationGuard } = createGuardedFilesystem(rawFilesystem);

		setMutationGuard(() => ({ guidance: 'Stop editing.' }));
		await expect(filesystem.writeFile('/workspace/src/workflow.ts', 'blocked')).rejects.toThrow(
			'Stop editing.',
		);

		setMutationGuard(undefined);
		await expect(
			filesystem.writeFile('/workspace/src/workflow.ts', 'allowed'),
		).resolves.toBeUndefined();

		expect(rawFilesystem.writeFile).toHaveBeenCalledWith(
			'/workspace/src/workflow.ts',
			'allowed',
			undefined,
		);
	});
});

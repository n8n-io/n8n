import type { Config } from '@oclif/core';
import * as fs from 'node:fs';
import { describe, it, expect, vi, afterEach } from 'vitest';

import type { N8nClient } from '../client';
import PackageExport from '../commands/package/export';

vi.mock('node:fs');

const mockedWriteFileSync = vi.mocked(fs.writeFileSync);

/** The command methods we stub to isolate behaviour from oclif/networking. */
interface ExportInternals {
	parse: () => Promise<{
		flags: { workflowId?: string[]; folderId?: string[]; projectId?: string[]; output: string };
	}>;
	getClient: () => N8nClient;
	succeed: () => void;
	error: (message: string) => never;
}

function stubCommand(
	flags: { workflowId?: string[]; folderId?: string[]; projectId?: string[]; output: string },
	exportPackage = vi.fn().mockResolvedValue(Buffer.from([1, 2, 3])),
) {
	const command = new PackageExport([], {} as Config);
	const internals = command as unknown as ExportInternals;
	// Bypass oclif arg parsing, connection setup, and the success/exit path.
	vi.spyOn(internals, 'parse').mockResolvedValue({ flags });
	vi.spyOn(internals, 'getClient').mockReturnValue({ exportPackage } as unknown as N8nClient);
	vi.spyOn(internals, 'succeed').mockImplementation(() => {});
	vi.spyOn(internals, 'error').mockImplementation((message: string) => {
		throw new Error(message);
	});
	return { command, internals, exportPackage };
}

describe('package export command', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('forwards workflow ids (and an empty folder list) and writes the archive', async () => {
		const { command, exportPackage } = stubCommand({
			workflowId: ['wf-1', 'wf-2'],
			output: '/tmp/team.n8np',
		});

		await command.run();

		expect(exportPackage).toHaveBeenCalledWith({ workflowIds: ['wf-1', 'wf-2'], folderIds: [] });
		expect(mockedWriteFileSync).toHaveBeenCalledWith('/tmp/team.n8np', Buffer.from([1, 2, 3]));
	});

	it('supports a folder-only export', async () => {
		const { command, exportPackage } = stubCommand({
			folderId: ['fld-1'],
			output: '/tmp/folders.n8np',
		});

		await command.run();

		expect(exportPackage).toHaveBeenCalledWith({ workflowIds: [], folderIds: ['fld-1'] });
		expect(mockedWriteFileSync).toHaveBeenCalledWith('/tmp/folders.n8np', Buffer.from([1, 2, 3]));
	});

	it('supports exporting workflows and folders together', async () => {
		const { command, exportPackage } = stubCommand({
			workflowId: ['wf-1'],
			folderId: ['fld-1'],
			output: '/tmp/mixed.n8np',
		});

		await command.run();

		expect(exportPackage).toHaveBeenCalledWith({ workflowIds: ['wf-1'], folderIds: ['fld-1'] });
	});

	it('forwards project ids and writes the archive', async () => {
		const { command, exportPackage } = stubCommand({
			projectId: ['proj-1', 'proj-2'],
			output: '/tmp/projects.n8np',
		});

		await command.run();

		expect(exportPackage).toHaveBeenCalledWith({ projectIds: ['proj-1', 'proj-2'] });
		expect(mockedWriteFileSync).toHaveBeenCalledWith('/tmp/projects.n8np', Buffer.from([1, 2, 3]));
	});

	it('rejects providing both workflow and project IDs', async () => {
		const { command, exportPackage } = stubCommand({
			workflowId: ['wf-1'],
			projectId: ['proj-1'],
			output: '/tmp/export.n8np',
		});

		await expect(command.run()).rejects.toThrow(
			'Provide either --workflow-id/--folder-id or --project-id, not both',
		);
		expect(exportPackage).not.toHaveBeenCalled();
	});

	it('rejects providing both folder and project IDs', async () => {
		const { command, exportPackage } = stubCommand({
			folderId: ['fld-1'],
			projectId: ['proj-1'],
			output: '/tmp/export.n8np',
		});

		await expect(command.run()).rejects.toThrow(
			'Provide either --workflow-id/--folder-id or --project-id, not both',
		);
		expect(exportPackage).not.toHaveBeenCalled();
	});

	it('errors when neither a workflow, folder, nor project is given', async () => {
		const { command, exportPackage } = stubCommand({ output: '/tmp/empty.n8np' });

		await expect(command.run()).rejects.toThrow(/at least one/i);
		expect(exportPackage).not.toHaveBeenCalled();
	});
});

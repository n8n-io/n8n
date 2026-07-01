import type { Config } from '@oclif/core';
import * as fs from 'node:fs';
import { describe, it, expect, vi, afterEach } from 'vitest';

import type { N8nClient } from '../client';
import PackageExport from '../commands/package/export';

vi.mock('node:fs');

const mockedWriteFileSync = vi.mocked(fs.writeFileSync);

/** The command methods we stub to isolate the file-writing behaviour from oclif/networking. */
interface ExportInternals {
	parse: () => Promise<{
		flags: { workflowId?: string[]; projectId?: string[]; output: string };
	}>;
	getClient: () => N8nClient;
	succeed: () => void;
	error: (message: string) => never;
}

describe('package export command', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('writes workflow export bytes returned by the client to the --output path', async () => {
		const archive = Buffer.from([1, 2, 3]);
		const exportPackage = vi.fn().mockResolvedValue(archive);

		const command = new PackageExport([], {} as Config);
		const internals = command as unknown as ExportInternals;
		vi.spyOn(internals, 'parse').mockResolvedValue({
			flags: { workflowId: ['wf-1', 'wf-2'], output: '/tmp/team.n8np' },
		});
		vi.spyOn(internals, 'getClient').mockReturnValue({ exportPackage } as unknown as N8nClient);
		vi.spyOn(internals, 'succeed').mockImplementation(() => {});
		vi.spyOn(internals, 'error').mockImplementation((message: string) => {
			throw new Error(message);
		});

		await command.run();

		expect(exportPackage).toHaveBeenCalledWith({ workflowIds: ['wf-1', 'wf-2'] });
		expect(mockedWriteFileSync).toHaveBeenCalledWith('/tmp/team.n8np', archive);
	});

	it('writes project export bytes returned by the client to the --output path', async () => {
		const archive = Buffer.from([4, 5, 6]);
		const exportPackage = vi.fn().mockResolvedValue(archive);

		const command = new PackageExport([], {} as Config);
		const internals = command as unknown as ExportInternals;
		vi.spyOn(internals, 'parse').mockResolvedValue({
			flags: { projectId: ['proj-1', 'proj-2'], output: '/tmp/projects.n8np' },
		});
		vi.spyOn(internals, 'getClient').mockReturnValue({ exportPackage } as unknown as N8nClient);
		vi.spyOn(internals, 'succeed').mockImplementation(() => {});
		vi.spyOn(internals, 'error').mockImplementation((message: string) => {
			throw new Error(message);
		});

		await command.run();

		expect(exportPackage).toHaveBeenCalledWith({ projectIds: ['proj-1', 'proj-2'] });
		expect(mockedWriteFileSync).toHaveBeenCalledWith('/tmp/projects.n8np', archive);
	});

	it('rejects providing both workflow and project IDs', async () => {
		const command = new PackageExport([], {} as Config);
		const internals = command as unknown as ExportInternals;
		vi.spyOn(internals, 'parse').mockResolvedValue({
			flags: {
				workflowId: ['wf-1'],
				projectId: ['proj-1'],
				output: '/tmp/export.n8np',
			},
		});
		vi.spyOn(internals, 'error').mockImplementation((message: string) => {
			throw new Error(message);
		});

		await expect(command.run()).rejects.toThrow(
			'Provide either --workflow-id or --project-id, not both',
		);
	});
});

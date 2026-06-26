import type { Config } from '@oclif/core';
import * as fs from 'node:fs';
import { describe, it, expect, vi, afterEach } from 'vitest';

import type { N8nClient } from '../client';
import PackageExport from '../commands/package/export';

vi.mock('node:fs');

const mockedWriteFileSync = vi.mocked(fs.writeFileSync);

/** The command methods we stub to isolate the file-writing behaviour from oclif/networking. */
interface ExportInternals {
	parse: () => Promise<{ flags: { workflowId: string[]; output: string } }>;
	getClient: () => N8nClient;
	succeed: () => void;
}

describe('package export command', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('writes the bytes returned by the client to the --output path', async () => {
		const archive = Buffer.from([1, 2, 3]);
		const exportPackage = vi.fn().mockResolvedValue(archive);

		const command = new PackageExport([], {} as Config);
		const internals = command as unknown as ExportInternals;
		// Bypass oclif arg parsing, connection setup, and the success/exit path; the
		// behaviour under test is purely that the client's bytes land at flags.output.
		vi.spyOn(internals, 'parse').mockResolvedValue({
			flags: { workflowId: ['wf-1', 'wf-2'], output: '/tmp/team.n8np' },
		});
		vi.spyOn(internals, 'getClient').mockReturnValue({ exportPackage } as unknown as N8nClient);
		vi.spyOn(internals, 'succeed').mockImplementation(() => {});

		await command.run();

		expect(exportPackage).toHaveBeenCalledWith(['wf-1', 'wf-2']);
		expect(mockedWriteFileSync).toHaveBeenCalledWith('/tmp/team.n8np', archive);
	});
});

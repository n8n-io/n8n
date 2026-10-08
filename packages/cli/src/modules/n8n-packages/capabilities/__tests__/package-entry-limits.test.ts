import { PackageExportBlockedError } from '../../entities/package-export.errors';
import type { PackageWriter } from '../../io/package-writer';
import { EntryLimitedPackageWriter, type PackageEntryLimits } from '../package-entry-limits';

const limits: PackageEntryLimits = { maxEntryBytes: 10, maxEntries: 4, maxUncompressedBytes: 25 };

function recordingWriter() {
	const written: string[] = [];
	const writer: PackageWriter = {
		writeFile: (path) => {
			written.push(`file:${path}`);
		},
		writeDirectory: (path) => {
			written.push(`dir:${path}`);
		},
	};
	return { writer, written };
}

const setup = (overrides: Partial<PackageEntryLimits> = {}) => {
	const { writer, written } = recordingWriter();
	return { limited: new EntryLimitedPackageWriter(writer, { ...limits, ...overrides }), written };
};

describe('EntryLimitedPackageWriter', () => {
	it('passes files and folders within the limits to the writer', async () => {
		const { limited, written } = setup();

		await limited.writeDirectory('workflows/');
		await limited.writeFile('workflows/a.json', 'x'.repeat(10));
		await limited.writeFile('manifest.json', Buffer.alloc(10));
		await limited.writeFile('b.json', 'x'.repeat(5));

		expect(written).toEqual([
			'dir:workflows/',
			'file:workflows/a.json',
			'file:manifest.json',
			'file:b.json',
		]);
	});

	it('rejects a file over the limit for one file, names it and the setting, and writes nothing', async () => {
		const { limited, written } = setup({ maxEntryBytes: 1024, maxUncompressedBytes: 4096 });

		const write = limited.writeFile('workflows/daily/workflow.json', 'x'.repeat(2048));

		await expect(write).rejects.toThrow(PackageExportBlockedError);
		await expect(write).rejects.toThrow(
			'The workflow package has a file of 2KB ("workflows/daily/workflow.json"), and the limit for one file of a package is 1KB. An admin can change the limit with N8N_IMPORT_MAX_ENTRY_BYTES.',
		);
		expect(written).toEqual([]);
	});

	it('counts the bytes of text, not its characters', async () => {
		const { limited } = setup();

		// Five characters of two bytes each fill the limit of ten bytes exactly.
		await expect(limited.writeFile('a.json', 'ééééé')).resolves.toBeUndefined();
		await expect(limited.writeFile('b.json', 'éééééé')).rejects.toThrow(
			'N8N_IMPORT_MAX_ENTRY_BYTES',
		);
	});

	it('rejects the file that takes the package over the total limit, and names the setting', async () => {
		const { limited, written } = setup();
		await limited.writeFile('a.json', 'x'.repeat(10));
		await limited.writeFile('b.json', 'x'.repeat(10));
		await limited.writeFile('c.json', 'x'.repeat(5));

		const write = limited.writeFile('d.json', 'x');

		await expect(write).rejects.toThrow(
			'The workflow package is larger than the limit of 25B. An admin can change the limit with N8N_IMPORT_MAX_UNCOMPRESSED_BYTES.',
		);
		expect(written).toEqual(['file:a.json', 'file:b.json', 'file:c.json']);
	});

	it('counts files and folders against the number of entries, and names the setting', async () => {
		const { limited, written } = setup({ maxUncompressedBytes: 1000 });
		await limited.writeDirectory('workflows/');
		await limited.writeFile('a.json', 'x');
		await limited.writeDirectory('data-tables/');
		await limited.writeFile('b.json', 'x');

		await expect(limited.writeDirectory('folders/')).rejects.toThrow(
			'The workflow package has more than 4 files. An admin can change the limit with N8N_IMPORT_MAX_ENTRIES.',
		);
		await expect(limited.writeFile('c.json', 'x')).rejects.toThrow(PackageExportBlockedError);
		expect(written).toHaveLength(4);
	});
});

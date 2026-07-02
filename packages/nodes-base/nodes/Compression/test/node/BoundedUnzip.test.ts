import * as fflate from 'fflate';

import { boundedUnzip } from '../../decompress/BoundedUnzip';

type CompressionLevel = NonNullable<fflate.ZipOptions['level']>;

function createZipData(
	files: Record<string, number>,
	options?: { compressionLevel?: CompressionLevel },
): Buffer {
	const zippable: fflate.Zippable = {};
	for (const [name, size] of Object.entries(files)) {
		zippable[name] = [new Uint8Array(size), { level: options?.compressionLevel ?? 6 }];
	}
	return Buffer.from(fflate.zipSync(zippable));
}

/**
 * Builds a zip whose members are written with data descriptors (compressed size 0
 * in the local header), as many streaming zip writers do. Each member is itself a
 * small zip, mimicking a zip of office documents (xlsx/docx are zip archives).
 */
function createZipOfNestedArchivesWithDataDescriptors(memberNames: string[]): {
	archive: Buffer;
	innerArchive: Buffer;
} {
	const innerArchive = Buffer.from(
		fflate.zipSync({
			'[Content_Types].xml': [new Uint8Array(8), { level: 0 }],
			'_rels/.rels': [new Uint8Array(8), { level: 0 }],
			'xl/workbook.xml': [new Uint8Array(8), { level: 0 }],
			'xl/worksheets/sheet1.xml': [new Uint8Array(8), { level: 0 }],
		}),
	);

	const chunks: Uint8Array[] = [];
	const zipStream = new fflate.Zip((error, chunk) => {
		if (error) throw error;
		if (chunk) chunks.push(chunk);
	});
	for (const name of memberNames) {
		const member = new fflate.ZipPassThrough(name);
		zipStream.add(member);
		member.push(innerArchive, true);
	}
	zipStream.end();

	return { archive: Buffer.concat(chunks), innerArchive };
}

function createZipWithUnsupportedCompression(): Buffer {
	const compressed = createZipData({ 'file.txt': 1 });

	compressed[8] = 99;
	compressed[9] = 0;

	const centralDirectoryOffset = compressed.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
	if (centralDirectoryOffset === -1) throw new Error('Central directory header not found');

	compressed[centralDirectoryOffset + 10] = 99;
	compressed[centralDirectoryOffset + 11] = 0;

	return compressed;
}

describe('boundedUnzip', () => {
	it('should decompress a zip with files within the size limit', async () => {
		const compressed = createZipData({ 'file1.txt': 512, 'file2.txt': 256 });
		const result = await boundedUnzip(compressed, 2048, 100);

		expect(Object.keys(result)).toHaveLength(2);
		expect(result['file1.txt']).toBeInstanceOf(Buffer);
		expect(result['file1.txt'].length).toBe(512);
		expect(result['file2.txt'].length).toBe(256);
	});

	it('should reject when total decompressed output exceeds the size limit', async () => {
		const compressed = createZipData({ 'file1.txt': 1024, 'file2.txt': 1024 });

		await expect(boundedUnzip(compressed, 1500, 100)).rejects.toThrow(
			'The decompressed output exceeds the maximum allowed size of 0 MB',
		);
	});

	it('should reject a single entry whose declared size exceeds the limit', async () => {
		// A small compressed payload that declares a large uncompressed size,
		// rejected from the central directory before any inflation.
		const compressed = createZipData({ 'bomb.bin': 1024 * 1024 });

		await expect(boundedUnzip(compressed, 1024, 100)).rejects.toThrow(
			'The decompressed output exceeds the maximum allowed size of 0 MB',
		);
	});

	it('should reject when entry count exceeds the limit', async () => {
		const files: Record<string, number> = {};
		for (let i = 0; i < 5; i++) {
			files[`file${i}.txt`] = 10;
		}
		const compressed = createZipData(files);

		await expect(boundedUnzip(compressed, 1024 * 1024, 3)).rejects.toThrow(
			'The archive contains more than 3 entries',
		);
	});

	it('should handle empty zip archive', async () => {
		const compressed = createZipData({});
		const result = await boundedUnzip(compressed, 1024, 100);

		expect(Object.keys(result)).toHaveLength(0);
	});

	it('should skip directory entries', async () => {
		const zippable: fflate.Zippable = {
			folder: {},
			'folder/file.txt': [new Uint8Array(100), { level: 6 }],
		};
		const compressed = Buffer.from(fflate.zipSync(zippable));
		const result = await boundedUnzip(compressed, 1024, 100);

		expect(Object.keys(result)).toEqual(expect.arrayContaining(['folder/file.txt']));
		expect(result['folder']).toBeUndefined();
	});

	it('should handle stored (uncompressed) zip entries', async () => {
		const compressed = createZipData({ 'stored.txt': 256 }, { compressionLevel: 0 });
		const result = await boundedUnzip(compressed, 1024, 100);

		expect(result['stored.txt'].length).toBe(256);
	});

	it('should only extract the archive members, not entries nested inside them', async () => {
		const { archive, innerArchive } = createZipOfNestedArchivesWithDataDescriptors([
			'a.xlsx',
			'b.xlsx',
		]);

		const result = await boundedUnzip(archive, 1024 * 1024, 100);

		expect(Object.keys(result).sort()).toEqual(['a.xlsx', 'b.xlsx']);
		// the member must be returned intact, not truncated at a nested header
		expect(result['a.xlsx'].equals(innerArchive)).toBe(true);
		expect(result['b.xlsx'].equals(innerArchive)).toBe(true);
	});

	it('should reject truncated zip archives', async () => {
		const compressed = createZipData({ 'file.txt': 256 });
		const truncated = compressed.subarray(0, compressed.length - 10);

		await expect(boundedUnzip(truncated, 1024, 100)).rejects.toThrow('invalid zip data');
	});

	it('should reject invalid zip data', async () => {
		await expect(boundedUnzip(Buffer.from('invalid zip data'), 1024, 100)).rejects.toThrow(
			'invalid zip data',
		);
	});

	it('should surface zip decompression errors', async () => {
		const compressed = createZipWithUnsupportedCompression();

		await expect(boundedUnzip(compressed, 1024, 100)).rejects.toThrow(
			'unknown compression type 99',
		);
	});
});

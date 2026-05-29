import * as fflate from 'fflate';

import { boundedGunzip, boundedUnzip } from '../../utils';

type CompressionLevel = NonNullable<fflate.ZipOptions['level']>;

function createGzipData(uncompressedSize: number): Buffer {
	const data = new Uint8Array(uncompressedSize);
	return Buffer.from(fflate.gzipSync(data));
}

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

describe('boundedGunzip', () => {
	it('should decompress data within the size limit', async () => {
		const compressed = createGzipData(1024);
		const result = await boundedGunzip(compressed, 2048);

		expect(result).toBeInstanceOf(Buffer);
		expect(result.length).toBe(1024);
	});

	it('should decompress data exactly at the size limit', async () => {
		const compressed = createGzipData(1024);
		const result = await boundedGunzip(compressed, 1024);

		expect(result.length).toBe(1024);
	});

	it('should reject data exceeding the size limit', async () => {
		const compressed = createGzipData(2048);

		await expect(boundedGunzip(compressed, 1024)).rejects.toThrow(
			'The decompressed output exceeds the maximum allowed size of 0 MB',
		);
	});

	it('should handle empty gzip data', async () => {
		const compressed = createGzipData(0);
		const result = await boundedGunzip(compressed, 1024);

		expect(result.length).toBe(0);
	});

	it('should reject empty gzip input', async () => {
		await expect(boundedGunzip(Buffer.alloc(0), 1024)).rejects.toThrow('invalid gzip data');
	});
});

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

	it('should surface zip stream errors', async () => {
		const compressed = createZipWithUnsupportedCompression();

		await expect(boundedUnzip(compressed, 1024, 100)).rejects.toThrow(
			'ZIP entry "file.txt" couldn\'t be decompressed. Check the archive and try again. Original error: unknown compression type 99',
		);
	});
});

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

/**
 * Builds a valid, small ZIP64 archive holding a single entry. The entry's true
 * uncompressed size is stored in a ZIP64 extended-information extra field, while
 * the central-directory uncompressed-size field carries the 0xFFFFFFFF ZIP64
 * sentinel. A ZIP64 end-of-central-directory record and its locator are emitted
 * too, flagging the whole archive as ZIP64 — without that flag a spec-conforming
 * reader ignores the per-entry extra field. Several real-world writers always
 * emit ZIP64-format archives, so this mirrors the archive reported in NODE-5325.
 */
function createZip64Archive(realSize: number, options?: { leadingExtraField?: boolean }): Buffer {
	const base = Buffer.from(
		fflate.zipSync({ 'file.txt': [new Uint8Array(realSize), { level: 6 }] }),
	);

	const cdOffset = base.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
	const eocdOffset = base.indexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
	if (cdOffset === -1 || eocdOffset === -1) throw new Error('Could not locate zip records');

	// Optionally precede the ZIP64 block with an unrelated extra field, as real
	// writers do (e.g. an NTFS timestamp block), so the reader must skip it.
	// Header id 0x9999, data size 2: a 6-byte block so the ZIP64 block that
	// follows is not 4-byte aligned, forcing the reader to honour the declared
	// block length when skipping.
	const leading = options?.leadingExtraField
		? Buffer.from([0x99, 0x99, 0x02, 0x00, 0x00, 0x00])
		: Buffer.alloc(0);

	// ZIP64 extended-information extra field carrying the true uncompressed size.
	const zip64Extra = Buffer.alloc(12);
	zip64Extra.writeUInt16LE(0x0001, 0); // header id: ZIP64
	zip64Extra.writeUInt16LE(8, 2); // data size
	zip64Extra.writeBigUInt64LE(BigInt(realSize), 4);
	const extra = Buffer.concat([leading, zip64Extra]);

	const fnLen = base.readUInt16LE(cdOffset + 28);
	const cdHeader = Buffer.from(base.subarray(cdOffset, cdOffset + 46 + fnLen));
	cdHeader.writeUInt32LE(0xffffffff, 24); // uncompressed size -> ZIP64 sentinel
	cdHeader.writeUInt16LE(base.readUInt16LE(cdOffset + 30) + extra.length, 30); // grow extra field len

	const centralDir = Buffer.concat([cdHeader, extra]);
	const cdSize = centralDir.length;

	// ZIP64 end-of-central-directory record (56 bytes).
	const zip64Eocd = Buffer.alloc(56);
	zip64Eocd.writeUInt32LE(0x06064b50, 0); // signature
	zip64Eocd.writeBigUInt64LE(44n, 4); // size of the record following this field
	zip64Eocd.writeUInt16LE(45, 12); // version made by
	zip64Eocd.writeUInt16LE(45, 14); // version needed to extract
	zip64Eocd.writeBigUInt64LE(1n, 24); // entries on this disk
	zip64Eocd.writeBigUInt64LE(1n, 32); // total entries
	zip64Eocd.writeBigUInt64LE(BigInt(cdSize), 40); // central directory size
	zip64Eocd.writeBigUInt64LE(BigInt(cdOffset), 48); // central directory offset
	const zip64EocdOffset = cdOffset + cdSize;

	// ZIP64 end-of-central-directory locator (20 bytes).
	const zip64Locator = Buffer.alloc(20);
	zip64Locator.writeUInt32LE(0x07064b50, 0); // signature
	zip64Locator.writeBigUInt64LE(BigInt(zip64EocdOffset), 8); // offset of the ZIP64 EOCD record
	zip64Locator.writeUInt32LE(1, 16); // total number of disks

	const eocd = Buffer.from(base.subarray(eocdOffset));
	eocd.writeUInt32LE(cdSize, 12); // central directory size
	eocd.writeUInt32LE(cdOffset, 16); // central directory offset

	return Buffer.concat([base.subarray(0, cdOffset), centralDir, zip64Eocd, zip64Locator, eocd]);
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

	it('should decompress a small ZIP64 archive within the size limit', async () => {
		// NODE-5325: a 25 KB ZIP64 entry must not be mistaken for a ~4 GB one.
		const realSize = 25 * 1024;
		const compressed = createZip64Archive(realSize);

		const result = await boundedUnzip(compressed, 400 * 1024 * 1024, 100);

		expect(result['file.txt']).toBeInstanceOf(Buffer);
		expect(result['file.txt'].length).toBe(realSize);
	});

	it('should enforce the size bound against the resolved ZIP64 size, not the sentinel', async () => {
		// Bracket the resolved size exactly: it must pass at a bound equal to the
		// true size and fail one byte below it. This pins the value read from the
		// ZIP64 extra field rather than any sentinel/garbage substitute.
		const realSize = 25 * 1024;
		const compressed = createZip64Archive(realSize);

		const result = await boundedUnzip(compressed, realSize, 100);
		expect(result['file.txt'].length).toBe(realSize);

		await expect(boundedUnzip(compressed, realSize - 1, 100)).rejects.toThrow(
			'The decompressed output exceeds the maximum allowed size of 0 MB',
		);
	});

	it('should resolve the ZIP64 size when other extra fields precede it', async () => {
		// The ZIP64 block is rarely the first extra field; the parser must walk
		// past unrelated blocks to find it.
		const realSize = 25 * 1024;
		const compressed = createZip64Archive(realSize, { leadingExtraField: true });

		const result = await boundedUnzip(compressed, realSize, 100);
		expect(result['file.txt'].length).toBe(realSize);

		await expect(boundedUnzip(compressed, realSize - 1, 100)).rejects.toThrow(
			'The decompressed output exceeds the maximum allowed size of 0 MB',
		);
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

import * as fflate from 'fflate';

import { boundedUntar } from '../../decompress/BoundedUntar';

/**
 * Builds a minimal ustar header block (512 bytes) for a single entry.
 * typeflag: '0' regular file, '5' directory, '2' symbolic link.
 */
function tarHeader(name: string, size: number, typeflag = '0', linkname = ''): Buffer {
	const header = Buffer.alloc(512);
	header.write(name, 0, 100, 'utf-8');
	header.write('0000644\0', 100, 'ascii'); // mode
	header.write('0000000\0', 108, 'ascii'); // uid
	header.write('0000000\0', 116, 'ascii'); // gid
	header.write(size.toString(8).padStart(11, '0') + '\0', 124, 'ascii'); // size
	header.write('00000000000\0', 136, 'ascii'); // mtime
	header.write('        ', 148, 8, 'ascii'); // checksum placeholder (8 spaces)
	header.write(typeflag, 156, 'ascii');
	if (linkname) header.write(linkname, 157, 100, 'utf-8');
	header.write('ustar\0', 257, 'ascii'); // magic
	header.write('00', 263, 'ascii'); // version

	let sum = 0;
	for (let i = 0; i < 512; i++) sum += header[i];
	header.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');

	return header;
}

type TarEntry = { content?: Buffer | string; typeflag?: string; linkname?: string };

function createTar(entries: Record<string, TarEntry>): Buffer {
	const blocks: Buffer[] = [];
	for (const [name, entry] of Object.entries(entries)) {
		const data = Buffer.isBuffer(entry.content) ? entry.content : Buffer.from(entry.content ?? '');
		blocks.push(tarHeader(name, data.length, entry.typeflag ?? '0', entry.linkname));
		if (data.length > 0) {
			blocks.push(data);
			const remainder = data.length % 512;
			if (remainder !== 0) blocks.push(Buffer.alloc(512 - remainder));
		}
	}
	// archive terminates with two zero-filled blocks
	blocks.push(Buffer.alloc(1024));
	return Buffer.concat(blocks);
}

describe('boundedUntar', () => {
	it('should extract files from a plain tar within the size limit', async () => {
		const archive = createTar({
			'a.txt': { content: 'hello' },
			'sub/b.txt': { content: 'world!!' },
		});

		const result = await boundedUntar(archive, 1024, 100);

		expect(Object.keys(result).sort()).toEqual(['a.txt', 'sub/b.txt']);
		expect(result['a.txt'].toString()).toBe('hello');
		expect(result['sub/b.txt'].toString()).toBe('world!!');
	});

	it('should auto-detect and extract a gzip-compressed tar', async () => {
		const archive = Buffer.from(fflate.gzipSync(createTar({ 'a.txt': { content: 'hello' } })));

		const result = await boundedUntar(archive, 1024, 100);

		expect(Object.keys(result)).toEqual(['a.txt']);
		expect(result['a.txt'].toString()).toBe('hello');
	});

	it('should reject when total decompressed output exceeds the size limit', async () => {
		const archive = createTar({
			'a.bin': { content: Buffer.alloc(1024) },
			'b.bin': { content: Buffer.alloc(1024) },
		});

		await expect(boundedUntar(archive, 1500, 100)).rejects.toThrow(
			'The decompressed output exceeds the maximum allowed size of 0 MB',
		);
	});

	it('should reject a single entry whose declared size exceeds the limit', async () => {
		const archive = createTar({ 'bomb.bin': { content: Buffer.alloc(4096) } });

		await expect(boundedUntar(archive, 1024, 100)).rejects.toThrow(
			'The decompressed output exceeds the maximum allowed size of 0 MB',
		);
	});

	it('should reject when entry count exceeds the limit', async () => {
		const entries: Record<string, TarEntry> = {};
		for (let i = 0; i < 5; i++) {
			entries[`file${i}.txt`] = { content: 'x' };
		}
		const archive = createTar(entries);

		await expect(boundedUntar(archive, 1024 * 1024, 3)).rejects.toThrow(
			'The archive contains more than 3 entries',
		);
	});

	it('should skip directory entries', async () => {
		const archive = createTar({
			'folder/': { typeflag: '5' },
			'folder/file.txt': { content: 'data' },
		});

		const result = await boundedUntar(archive, 1024, 100);

		expect(Object.keys(result)).toEqual(['folder/file.txt']);
		expect(result['folder/']).toBeUndefined();
	});

	it('should skip symbolic link entries', async () => {
		const archive = createTar({
			'real.txt': { content: 'data' },
			'link.txt': { typeflag: '2', linkname: 'real.txt' },
		});

		const result = await boundedUntar(archive, 1024, 100);

		expect(Object.keys(result)).toEqual(['real.txt']);
		expect(result['link.txt']).toBeUndefined();
	});

	it('should skip entries whose path escapes the archive root', async () => {
		const archive = createTar({
			'safe.txt': { content: 'ok' },
			'../evil.txt': { content: 'bad' },
			'/abs.txt': { content: 'bad' },
			'nested/../../escape.txt': { content: 'bad' },
		});

		const result = await boundedUntar(archive, 1024, 100);

		expect(Object.keys(result)).toEqual(['safe.txt']);
	});

	it('should handle an empty tar archive', async () => {
		const archive = createTar({});

		const result = await boundedUntar(archive, 1024, 100);

		expect(Object.keys(result)).toHaveLength(0);
	});
});

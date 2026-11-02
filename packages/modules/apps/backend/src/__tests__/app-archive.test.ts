import { randomBytes } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { Header, type HeaderData } from 'tar';

import { AppsConfig } from '../apps.config';
import { AppArchive } from '../app-archive';

function archive(entries: Array<HeaderData & { content?: Buffer }>) {
	const blocks: Buffer[] = [];
	for (const { content = Buffer.alloc(0), ...entry } of entries) {
		const header = Buffer.alloc(512);
		new Header({ mode: 0o644, type: 'File', size: content.length, ...entry }).encode(header);
		blocks.push(header, content, Buffer.alloc((512 - (content.length % 512)) % 512));
	}
	return gzipSync(Buffer.concat([...blocks, Buffer.alloc(1024)]));
}

describe('AppArchive', () => {
	const config = new AppsConfig();
	const archives = new AppArchive(config);

	beforeEach(() => Object.assign(config, new AppsConfig()));

	it('preserves nested files, empty files, and binary content', async () => {
		const files = new Map([
			['src/main.ts', Buffer.from('export const value = 1;')],
			['public/image.png', randomBytes(256 * 1024)],
			['public/Image.png', randomBytes(256)],
			['empty.txt', Buffer.alloc(0)],
		]);
		const result = await archives.unpack(await archives.pack(files));
		expect(result).toEqual(files);
	});

	it('stores an empty source snapshot', async () => {
		expect(await archives.unpack(await archives.pack(new Map()))).toEqual(new Map());
	});

	it('lists sorted file names without directory entries', async () => {
		const body = archive([
			{ path: './', type: 'Directory' },
			{ path: './src/', type: 'Directory' },
			{ path: './src/main.ts', content: randomBytes(256 * 1024) },
			{ path: 'empty.txt' },
		]);

		expect(await archives.listFiles(body)).toEqual(['empty.txt', 'src/main.ts']);
	});

	it('reads one file by its normalized name', async () => {
		const content = randomBytes(256 * 1024);
		const body = archive([
			{ path: 'other.bin', content: randomBytes(256 * 1024) },
			{ path: './src/data.bin', content },
			{ path: 'empty.txt' },
		]);

		expect(await archives.readFile(body, 'src/data.bin')).toEqual(content);
		expect(await archives.readFile(body, './src/data.bin')).toEqual(content);
		expect(await archives.readFile(body, 'empty.txt')).toEqual(Buffer.alloc(0));
		expect(await archives.readFile(body, 'missing.txt')).toBeNull();
	});

	it('lists no files and returns null for an empty snapshot', async () => {
		const body = await archives.pack(new Map());

		expect(await archives.listFiles(body)).toEqual([]);
		expect(await archives.readFile(body, 'missing.txt')).toBeNull();
	});

	describe.each(['listFiles', 'readFile'] as const)('%s validation', (operation) => {
		const read = async (body: Buffer) =>
			operation === 'listFiles'
				? await archives.listFiles(body)
				: await archives.readFile(body, 'selected.txt');

		it.each<[string, HeaderData[]]>([
			['invalid paths', [{ path: '../outside' }]],
			['unsupported entries', [{ path: 'link', type: 'SymbolicLink', linkpath: 'target' }]],
			['duplicate paths', [{ path: 'other.txt' }, { path: './other.txt' }]],
			['conflicting paths', [{ path: 'src/main.ts' }, { path: 'src' }]],
		])('rejects %s in skipped entries', async (_name, entries) => {
			const body = archive([
				{ path: 'selected.txt', content: randomBytes(256 * 1024) },
				...entries,
			]);

			await expect(read(body)).rejects.toThrow();
		});

		it('counts skipped file sizes toward the unpacked limit', async () => {
			config.maxArtifactUnpackedSizeBytes = 10;
			const body = archive([
				{ path: 'selected.txt', content: Buffer.alloc(5) },
				{ path: 'other.txt', content: Buffer.alloc(6) },
			]);

			await expect(read(body)).rejects.toMatchObject({
				cause: expect.objectContaining({ message: expect.stringContaining('unpacked size') }),
			});
		});

		it('counts skipped directories and files toward the entry limit', async () => {
			config.maxArtifactEntries = 2;
			const body = archive([
				{ path: 'selected.txt' },
				{ path: 'src/', type: 'Directory' },
				{ path: 'src/main.ts' },
			]);

			await expect(read(body)).rejects.toMatchObject({
				cause: expect.objectContaining({ message: expect.stringContaining('entry limit') }),
			});
		});

		it('rejects a truncated archive after the selected file', async () => {
			const body = archive([
				{ path: 'selected.txt', content: Buffer.from('text') },
				{ path: 'other.bin', content: randomBytes(256 * 1024) },
			]);

			await expect(read(body.subarray(0, body.length - 100))).rejects.toThrow('invalid');
		});
	});

	it('rejects an invalid entry after a large file', async () => {
		const body = archive([
			{ path: 'data.bin', content: randomBytes(256 * 1024) },
			{ path: '../outside', content: Buffer.from('text') },
		]);

		await expect(archives.unpack(body)).rejects.toMatchObject({
			message: expect.stringContaining('invalid'),
			cause: expect.objectContaining({ message: expect.stringContaining('invalid file path') }),
		});
	});

	it.each([
		'../outside',
		'/absolute',
		'C:/absolute',
		'src/../../outside',
		'src\\outside',
		'src//file',
		'src/./file',
	])('rejects the path %s', async (filePath) => {
		await expect(archives.readFile(archive([]), filePath)).rejects.toThrow('invalid file path');
		await expect(archives.pack(new Map([[filePath, Buffer.from('text')]]))).rejects.toThrow(
			'invalid file path',
		);
		await expect(
			archives.unpack(archive([{ path: filePath, content: Buffer.from('text') }])),
		).rejects.toThrow('invalid');
	});

	it('rejects a source filename with a null character', async () => {
		await expect(archives.pack(new Map([['file\0name', Buffer.alloc(0)]]))).rejects.toThrow(
			'invalid file path',
		);
	});

	it.each(['SymbolicLink', 'Link', 'FIFO', 'CharacterDevice'] as const)(
		'rejects %s entries',
		async (type) => {
			await expect(
				archives.unpack(archive([{ path: 'entry', type, linkpath: 'target' }])),
			).rejects.toThrow('invalid');
		},
	);

	it('rejects duplicate paths and conflicting file paths', async () => {
		await expect(archives.unpack(archive([{ path: 'file' }, { path: './file' }]))).rejects.toThrow(
			'invalid',
		);
		await expect(
			archives.pack(
				new Map([
					['src', Buffer.alloc(0)],
					['src/file', Buffer.alloc(0)],
				]),
			),
		).rejects.toThrow('conflicting');
	});

	it('requires index.html only for bundles', async () => {
		const files = new Map([['main.ts', Buffer.from('code')]]);
		const body = await archives.pack(files);
		await expect(archives.unpack(body, true)).rejects.toThrow('index.html');
		await expect(archives.pack(files, true)).rejects.toThrow('index.html');
		const bundle = new Map([['index.html', Buffer.from('<html></html>')]]);
		expect(await archives.unpack(await archives.pack(bundle, true), true)).toEqual(bundle);
	});

	it('bounds compressed data before parsing', async () => {
		config.maxArtifactSizeBytes = 50;
		await expect(archives.pack(new Map([['file', randomBytes(1024)]]))).rejects.toThrow(
			'compressed size',
		);
		await expect(archives.unpack(Buffer.alloc(51))).rejects.toThrow('compressed size');
	});

	it('bounds declared file sizes before reading their content', async () => {
		config.maxArtifactUnpackedSizeBytes = 10;
		await expect(archives.pack(new Map([['file', Buffer.alloc(11)]]))).rejects.toThrow(
			'unpacked size',
		);
		await expect(
			archives.unpack(archive([{ path: 'file', content: Buffer.alloc(11) }])),
		).rejects.toThrow('invalid');
	});

	it('counts the root directory toward the entry limit when packing', async () => {
		config.maxArtifactEntries = 2;
		await expect(
			archives.pack(
				new Map([
					['one', Buffer.alloc(0)],
					['two', Buffer.alloc(0)],
				]),
			),
		).rejects.toThrow('entry limit');
	});

	it('counts directory entries toward the entry limit when unpacking', async () => {
		config.maxArtifactEntries = 2;
		await expect(
			archives.unpack(
				archive([
					{ path: 'one/', type: 'Directory' },
					{ path: 'two/', type: 'Directory' },
					{ path: 'file' },
				]),
			),
		).rejects.toMatchObject({
			message: expect.stringContaining('invalid'),
			cause: expect.objectContaining({ message: expect.stringContaining('entry limit') }),
		});
	});

	it('rejects malformed and truncated archives', async () => {
		await expect(archives.unpack(Buffer.from('not an archive'))).rejects.toThrow('gzip');
		const body = archive([{ path: 'file', content: randomBytes(1024) }]);
		await expect(archives.unpack(body.subarray(0, body.length - 100))).rejects.toThrow('invalid');
	});
});

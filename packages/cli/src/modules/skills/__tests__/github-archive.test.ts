import { Readable } from 'node:stream';
import { Header, Parser } from 'tar';
import { gzipSync } from 'zlib';

import {
	DEFAULT_ARCHIVE_LIMITS,
	archiveSize,
	readRepositoryArchive,
} from '../sources/github/github-archive';

/** A gzipped tarball of files under `top/`, built in memory. */
function archiveOf(files: Record<string, string>): Buffer {
	const blocks: Buffer[] = [];
	for (const [path, content] of Object.entries(files)) {
		const body = Buffer.from(content);
		const header = new Header({
			path: `top/${path}`,
			type: 'File',
			size: body.length,
			mode: 0o644,
			mtime: new Date(0),
		});
		header.encode();
		blocks.push(header.block as Buffer);
		blocks.push(body, Buffer.alloc((512 - (body.length % 512)) % 512));
	}
	blocks.push(Buffer.alloc(1024));
	return gzipSync(Buffer.concat(blocks));
}

function emptyFiles(count: number, folder = ''): Record<string, string> {
	const files: Record<string, string> = {};
	for (let index = 0; index < count; index += 1) files[`${folder}file-${index}.txt`] = '';
	return files;
}

const streamOf = (archive: Buffer) => Readable.from([archive]);

describe('readRepositoryArchive', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('reads the paths without the top folder', async () => {
		const { paths } = await readRepositoryArchive(streamOf(archiveOf(emptyFiles(2))));

		expect(paths).toEqual(['file-0.txt', 'file-1.txt']);
	});

	it('keeps the text of SKILL.md files and references only', async () => {
		const archive = await readRepositoryArchive(
			streamOf(
				archiveOf({
					'a/SKILL.md': 'skill',
					'a/references/x.md': 'reference',
					'a/scripts/run.sh': 'script',
				}),
			),
		);

		expect([...archive.text]).toEqual([
			['a/SKILL.md', 'skill'],
			['a/references/x.md', 'reference'],
		]);
		expect(archiveSize(archive)).toBe(
			'a/SKILL.md'.length +
				'a/references/x.md'.length +
				'a/scripts/run.sh'.length +
				'skill'.length +
				'reference'.length,
		);
	});

	it('stops reading the archive once it has too many entries', async () => {
		const abort = vi.spyOn(Parser.prototype, 'abort');

		await expect(
			readRepositoryArchive(streamOf(archiveOf(emptyFiles(50_001)))),
		).rejects.toMatchObject({ reason: 'archive_too_large' });
		expect(abort).toHaveBeenCalledTimes(1);
	});

	it('stops reading the archive once its files are over the uncompressed size', async () => {
		const limits = { ...DEFAULT_ARCHIVE_LIMITS, maxUncompressedBytes: 1000 };

		await expect(
			readRepositoryArchive(
				streamOf(archiveOf({ 'a.txt': 'x'.repeat(600), 'b.txt': 'x'.repeat(600) })),
				{
					limits,
				},
			),
		).rejects.toMatchObject({
			reason: 'archive_too_large',
			message: expect.stringContaining('Link to the folder of the skills.'),
		});
	});

	it('stops reading the archive once it downloaded too many bytes', async () => {
		const archive = archiveOf({ 'a.txt': 'x' });
		const limits = { ...DEFAULT_ARCHIVE_LIMITS, maxDownloadBytes: archive.length - 1 };

		await expect(readRepositoryArchive(streamOf(archive), { limits })).rejects.toMatchObject({
			reason: 'archive_too_large',
			message: 'The repository is too large for n8n to download.',
		});
	});

	it('stops reading the archive once it keeps too much text', async () => {
		const limits = { ...DEFAULT_ARCHIVE_LIMITS, maxTextBytes: 1000 };
		const files = { 'a/SKILL.md': 'x'.repeat(600), 'b/SKILL.md': 'x'.repeat(600) };

		await expect(
			readRepositoryArchive(streamOf(archiveOf(files)), { limits }),
		).rejects.toMatchObject({ reason: 'archive_too_large' });
	});

	it('keeps the path of a file over the text size, without its text', async () => {
		const limits = { ...DEFAULT_ARCHIVE_LIMITS, maxTextFileBytes: 10 };
		const archive = await readRepositoryArchive(
			streamOf(archiveOf({ 'a/SKILL.md': 'x'.repeat(10), 'b/SKILL.md': 'x'.repeat(11) })),
			{ limits },
		);

		expect(archive.paths).toEqual(['a/SKILL.md', 'b/SKILL.md']);
		expect([...archive.text.keys()]).toEqual(['a/SKILL.md']);
		expect([...archive.oversized]).toEqual(['b/SKILL.md']);
	});

	describe('under a folder', () => {
		it('keeps only the files under the folder', async () => {
			const archive = await readRepositoryArchive(
				streamOf(
					archiveOf({
						'skills/a/SKILL.md': 'a',
						'skills-more/b/SKILL.md': 'b',
						'other/SKILL.md': 'c',
					}),
				),
				{ root: 'skills' },
			);

			expect(archive.paths).toEqual(['skills/a/SKILL.md']);
			expect([...archive.text.keys()]).toEqual(['skills/a/SKILL.md']);
		});

		it('counts only the files under the folder toward the limits', async () => {
			const limits = { ...DEFAULT_ARCHIVE_LIMITS, maxEntries: 5, maxUncompressedBytes: 100 };
			const files = {
				...emptyFiles(20, 'big/'),
				'big/blob.bin': 'x'.repeat(1000),
				'skills/a/SKILL.md': 'a',
			};

			const archive = await readRepositoryArchive(streamOf(archiveOf(files)), {
				root: 'skills',
				limits,
			});

			expect(archive.paths).toEqual(['skills/a/SKILL.md']);
		});

		it('does not tell a folder link to link to a folder', async () => {
			const limits = { ...DEFAULT_ARCHIVE_LIMITS, maxEntries: 1 };

			await expect(
				readRepositoryArchive(streamOf(archiveOf(emptyFiles(2, 'skills/'))), {
					root: 'skills',
					limits,
				}),
			).rejects.toMatchObject({
				reason: 'archive_too_large',
				message: 'The folder is too large for n8n to read. Link to a smaller folder.',
			});
		});
	});

	it('fails as unreachable when the signal aborts', async () => {
		const deadline = new AbortController();
		const source = new Readable({ read() {} });
		const read = readRepositoryArchive(source, { signal: deadline.signal });

		deadline.abort();

		await expect(read).rejects.toMatchObject({ reason: 'unreachable' });
		expect(source.destroyed).toBe(true);
	});
});

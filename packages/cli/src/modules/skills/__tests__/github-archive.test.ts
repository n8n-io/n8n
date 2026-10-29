import { Header, Parser } from 'tar';
import { gzipSync } from 'zlib';

import { readRepositoryArchive } from '../sources/github/github-archive';

/** A gzipped tarball of empty files under `top/`, built in memory. */
function archiveOf(count: number): Buffer {
	const blocks: Buffer[] = [];
	for (let index = 0; index < count; index += 1) {
		const header = new Header({
			path: `top/file-${index}.txt`,
			type: 'File',
			size: 0,
			mode: 0o644,
			mtime: new Date(0),
		});
		header.encode();
		blocks.push(header.block as Buffer);
	}
	blocks.push(Buffer.alloc(1024));
	return gzipSync(Buffer.concat(blocks));
}

describe('readRepositoryArchive', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('reads the paths without the top folder', async () => {
		const { paths } = await readRepositoryArchive(archiveOf(2));

		expect(paths).toEqual(['file-0.txt', 'file-1.txt']);
	});

	it('stops reading the archive once it has too many entries', async () => {
		const abort = vi.spyOn(Parser.prototype, 'abort');

		await expect(readRepositoryArchive(archiveOf(50_001))).rejects.toMatchObject({
			reason: 'archive_too_large',
		});
		expect(abort).toHaveBeenCalledTimes(1);
	});
});

import { boundedUntar } from '../../decompress/BoundedUntar';
import { createTar } from '../../compress/CreateTar';

describe('createTar', () => {
	it('should create a tar archive containing the given files', async () => {
		const archive = await createTar([
			{ fileName: 'a.txt', data: Buffer.from('hello') },
			{ fileName: 'sub/b.txt', data: Buffer.from('world!!') },
		]);

		// plain tar is not gzip-compressed
		expect(archive[0] === 0x1f && archive[1] === 0x8b).toBe(false);

		const result = await boundedUntar(archive, 1024 * 1024, 100);
		expect(Object.keys(result).sort()).toEqual(['a.txt', 'sub/b.txt']);
		expect(result['a.txt'].toString()).toBe('hello');
		expect(result['sub/b.txt'].toString()).toBe('world!!');
	});

	it('should create a gzip-compressed tar when the gzip option is set', async () => {
		const archive = await createTar([{ fileName: 'a.txt', data: Buffer.from('hello') }], {
			gzip: true,
		});

		// gzip magic bytes
		expect(archive[0]).toBe(0x1f);
		expect(archive[1]).toBe(0x8b);

		const result = await boundedUntar(archive, 1024 * 1024, 100);
		expect(result['a.txt'].toString()).toBe('hello');
	});

	it('should create an empty tar archive when given no files', async () => {
		const archive = await createTar([]);

		const result = await boundedUntar(archive, 1024 * 1024, 100);
		expect(Object.keys(result)).toHaveLength(0);
	});
});

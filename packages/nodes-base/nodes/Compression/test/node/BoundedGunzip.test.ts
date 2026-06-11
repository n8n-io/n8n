import * as fflate from 'fflate';

import { boundedGunzip } from '../../decompress/BoundedGunzip';

function createGzipData(uncompressedSize: number): Buffer {
	const data = new Uint8Array(uncompressedSize);
	return Buffer.from(fflate.gzipSync(data));
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

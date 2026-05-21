import { UnexpectedError } from 'n8n-workflow';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';

import { binaryToBuffer, createFixedSizeChunker } from '@/binary-data/utils';

describe('BinaryData/utils', () => {
	describe('binaryToBuffer', () => {
		it('should handle buffer objects', async () => {
			const body = Buffer.from('test');
			expect((await binaryToBuffer(body)).toString()).toEqual('test');
		});

		it('should handle valid uncompressed Readable streams', async () => {
			const body = Readable.from(Buffer.from('test'));
			expect((await binaryToBuffer(body)).toString()).toEqual('test');
		});

		it('should handle valid compressed Readable streams', async () => {
			const gunzip = createGunzip();
			const body = Readable.from(
				Buffer.from('1f8b08000000000000032b492d2e01000c7e7fd804000000', 'hex'),
			).pipe(gunzip);
			expect((await binaryToBuffer(body)).toString()).toEqual('test');
		});

		it('should throw on invalid compressed Readable streams', async () => {
			const gunzip = createGunzip();
			const body = Readable.from(Buffer.from('0001f8b080000000000000000', 'hex')).pipe(gunzip);
			const promise = binaryToBuffer(body);
			await expect(promise).rejects.toThrow(UnexpectedError);
			await expect(promise).rejects.toThrow('Failed to decompress response');
		});
	});

	describe('createFixedSizeChunker', () => {
		const drain = async (source: Readable): Promise<Buffer[]> => {
			return await new Promise((resolve, reject) => {
				const out: Buffer[] = [];
				source.on('data', (chunk: Buffer) => out.push(Buffer.from(chunk)));
				source.on('end', () => resolve(out));
				source.on('error', reject);
			});
		};

		it('should emit chunks of exactly chunkSize with a smaller final chunk', async () => {
			const source = Readable.from([Buffer.from([1, 2]), Buffer.from([3, 4, 5, 6, 7, 8])]);
			const chunks = await drain(source.pipe(createFixedSizeChunker(3)));

			expect(chunks.map((chunk) => chunk.length)).toEqual([3, 3, 2]);
			expect(Buffer.concat(chunks)).toEqual(Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]));
		});

		it('should split a single large input into multiple sized chunks', async () => {
			const source = Readable.from([Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9])]);
			const chunks = await drain(source.pipe(createFixedSizeChunker(4)));

			expect(chunks.map((chunk) => chunk.length)).toEqual([4, 4, 1]);
			expect(Buffer.concat(chunks)).toEqual(Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9]));
		});

		it('should accumulate many small inputs into one full chunk', async () => {
			const source = Readable.from(Array.from({ length: 5 }, (_, i) => Buffer.from([i + 1])));
			const chunks = await drain(source.pipe(createFixedSizeChunker(5)));

			expect(chunks.map((chunk) => chunk.length)).toEqual([5]);
			expect(Buffer.concat(chunks)).toEqual(Buffer.from([1, 2, 3, 4, 5]));
		});

		it('should emit one undersized chunk when total bytes are less than chunkSize', async () => {
			const source = Readable.from([Buffer.from([1, 2, 3])]);
			const chunks = await drain(source.pipe(createFixedSizeChunker(10)));

			expect(chunks.map((chunk) => chunk.length)).toEqual([3]);
		});

		it('should emit nothing for an empty source', async () => {
			const source = Readable.from([] as Buffer[]);
			const chunks = await drain(source.pipe(createFixedSizeChunker(4)));

			expect(chunks).toEqual([]);
		});
	});
});

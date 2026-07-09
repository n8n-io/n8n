import { UnexpectedError } from 'n8n-workflow';
import { Readable } from 'node:stream';

import { createFixedSizeChunker } from '@/binary-data/utils';

describe('BinaryData/utils', () => {
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

		it.each([0, -1])('should throw when chunkSize is %s', (chunkSize) => {
			expect(() => createFixedSizeChunker(chunkSize)).toThrow(UnexpectedError);
		});
	});
});

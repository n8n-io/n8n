import { UnexpectedError } from 'n8n-workflow';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';

import { binaryToBuffer } from '@/binary-data/utils';

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
			await expect(binaryToBuffer(body)).rejects.toThrow(
				new UnexpectedError('Failed to decompress response'),
			);
		});
	});
});

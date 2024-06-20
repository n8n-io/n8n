import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import { toBuffer } from '@/BinaryData/utils';

describe('BinaryData/utils', () => {
	describe('toBuffer', () => {
		it('should handle buffer objects', async () => {
			const body = Buffer.from('test');
			expect((await toBuffer(body)).toString()).toEqual('test');
		});

		it('should handle valid uncompressed Readable streams', async () => {
			const body = Readable.from(Buffer.from('test'));
			expect((await toBuffer(body)).toString()).toEqual('test');
		});

		it('should handle valid compressed Readable streams', async () => {
			const gunzip = createGunzip();
			const body = Readable.from(
				Buffer.from('1f8b08000000000000032b492d2e01000c7e7fd804000000', 'hex'),
			).pipe(gunzip);
			expect((await toBuffer(body)).toString()).toEqual('test');
		});

		it('should throw on invalid compressed Readable streams', async () => {
			const gunzip = createGunzip();
			const body = Readable.from(Buffer.from('0001f8b080000000000000000', 'hex')).pipe(gunzip);
			await expect(toBuffer(body)).rejects.toThrow(new Error('Failed to decompress response'));
		});
	});
});

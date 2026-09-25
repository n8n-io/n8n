import { HttpRequestConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';

import { binaryToBuffer, streamToBuffer } from '../binary-buffer';

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

	it(
		'should reject when a stream closes without ending (truncated body)',
		{ timeout: 1000 },
		async () => {
			// Mirrors a half-open socket / truncated proxied body: some data arrives,
			// then the underlying stream is destroyed without a clean 'end'. Such a
			// stream emits only 'close' (no 'end', no 'error').
			const body = new Readable({ read() {} });
			body.push(Buffer.from('partial body'));
			setImmediate(() => body.destroy());

			const promise = binaryToBuffer(body);
			await expect(promise).rejects.toThrow(UnexpectedError);
			await expect(promise).rejects.toThrow('closed before completing');
		},
	);
});

describe('streamToBuffer inactivity timeout', () => {
	it('rejects when a stream stops producing data', { timeout: 1000 }, async () => {
		// A keep-alive socket with an unsatisfied length / a stalled decompression:
		// a chunk arrives, then nothing — no 'end', 'error' or 'close'.
		const stream = new Readable({ read() {} });
		stream.push(Buffer.from('partial body'));

		const promise = streamToBuffer(stream, 100);
		await expect(promise).rejects.toThrow(UnexpectedError);
		await expect(promise).rejects.toThrow('timed out');
	});

	it('rejects when a stream never produces any data', { timeout: 1000 }, async () => {
		const stream = new Readable({ read() {} });

		const promise = streamToBuffer(stream, 100);
		await expect(promise).rejects.toThrow('timed out');
	});

	it('does not interrupt a stream that keeps producing data', { timeout: 2000 }, async () => {
		// Emits a chunk every 40ms for ~200ms, then ends. The 300ms inactivity
		// timeout must never fire because the stream keeps making progress; the
		// wide margin keeps the test robust against scheduling jitter on CI.
		let remaining = 5;
		const stream = new Readable({
			read() {
				setTimeout(() => {
					if (remaining-- > 0) this.push(Buffer.from('chunk'));
					else this.push(null);
				}, 40);
			},
		});

		expect((await streamToBuffer(stream, 300)).toString()).toBe('chunkchunkchunkchunkchunk');
	});

	it('does not time out when disabled (non-positive timeout)', async () => {
		const stream = Readable.from(Buffer.from('done'));
		expect((await streamToBuffer(stream, 0)).toString()).toBe('done');
	});

	it('falls back to responseBodyReadTimeout from config when no timeout is given', async () => {
		Container.set(
			HttpRequestConfig,
			Object.assign(new HttpRequestConfig(), { responseBodyReadTimeout: 100 }),
		);
		try {
			const stream = new Readable({ read() {} });
			stream.push(Buffer.from('partial body'));

			await expect(streamToBuffer(stream)).rejects.toThrow('timed out');
		} finally {
			Container.set(HttpRequestConfig, new HttpRequestConfig());
		}
	});
});

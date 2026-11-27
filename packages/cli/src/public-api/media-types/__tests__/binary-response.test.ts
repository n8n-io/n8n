import type { BinaryResponse } from '@n8n/decorators';
import type { Response } from 'express';
import { Readable, Writable } from 'node:stream';
import { mock } from 'vitest-mock-extended';

import { sendBinaryResponse } from '../binary-response';

/** A live response mock whose `status` returns the response, as Express does. */
function mockResponse() {
	const res = mock<Response>();
	res.status.mockReturnValue(res);
	res.destroyed = false;
	return res;
}

describe('sendBinaryResponse', () => {
	const binaryResponse: BinaryResponse = {
		mediaType: 'application/gzip',
		headers: { 'X-Required': { description: 'Must be set.' } },
	};

	it('rejects a result that is missing a declared header, before the response is touched', async () => {
		const res = mockResponse();

		await expect(
			sendBinaryResponse(res, binaryResponse, 200, 'Widgets.method', { body: Buffer.from('x') }),
		).rejects.toThrow('Widgets.method did not set the declared response header(s): X-Required');

		expect(res.status).not.toHaveBeenCalled();
		expect(res.setHeader).not.toHaveBeenCalled();
	});

	it('matches a declared header name case-insensitively', async () => {
		const res = mockResponse();

		await sendBinaryResponse(res, binaryResponse, 200, 'Widgets.method', {
			body: Buffer.from('x'),
			headers: { 'x-required': '1' },
		});

		expect(res.end).toHaveBeenCalledWith(Buffer.from('x'));
	});

	it('rejects a result without a binary body', async () => {
		const res = mockResponse();

		await expect(
			sendBinaryResponse(res, binaryResponse, 200, 'Widgets.method', {
				body: 'not binary',
				headers: { 'X-Required': '1' },
			}),
		).rejects.toThrow('Widgets.method declares a binary @ApiResponse but returned no body');

		expect(res.status).not.toHaveBeenCalled();
	});

	it('ends an empty stream with a 200 and no body', async () => {
		const sent: Buffer[] = [];
		const client = new Writable({
			write(chunk: Buffer, _encoding, callback) {
				sent.push(chunk);
				callback();
			},
		});
		const res = Object.assign(client, {
			status: vi.fn(() => client),
			setHeader: vi.fn(() => client),
		});

		await sendBinaryResponse(res as unknown as Response, binaryResponse, 200, 'Widgets.method', {
			body: Readable.from([]),
			headers: { 'X-Required': '1' },
		});

		expect(res.status).toHaveBeenCalledWith(200);
		expect(client.writableFinished).toBe(true);
		expect(sent).toEqual([]);
	});

	it('resolves when the client disconnects after the first chunk', async () => {
		const sent: Buffer[] = [];
		const client = new Writable({
			write(chunk: Buffer, _encoding, callback) {
				sent.push(chunk);
				// Drop the connection on the second chunk, before its write completes.
				if (sent.length === 2) {
					client.destroy();
					return;
				}
				callback();
			},
		});
		const res = Object.assign(client, { status: () => client, setHeader: () => client });

		await expect(
			sendBinaryResponse(res as unknown as Response, binaryResponse, 200, 'Widgets.method', {
				body: Readable.from([Buffer.from('ab'), Buffer.from('cd'), Buffer.from('ef')]),
				headers: { 'X-Required': '1' },
			}),
		).resolves.toBeUndefined();

		expect(sent).toHaveLength(2);
	});

	it('destroys the stream when the client has already left', async () => {
		const client = new Writable({
			write(_chunk, _encoding, callback) {
				callback();
			},
		});
		client.destroy();
		const res = Object.assign(client, { status: () => client, setHeader: () => client });
		const body = Readable.from([Buffer.from('ab')]);

		await expect(
			sendBinaryResponse(res as unknown as Response, binaryResponse, 200, 'Widgets.method', {
				body,
				headers: { 'X-Required': '1' },
			}),
		).resolves.toBeUndefined();

		expect(body.destroyed).toBe(true);
	});

	it('destroys a returned stream when a declared header is missing', async () => {
		const body = Readable.from([Buffer.from('x')]);

		await expect(
			sendBinaryResponse(mockResponse(), binaryResponse, 200, 'Widgets.method', { body }),
		).rejects.toThrow('X-Required');

		expect(body.destroyed).toBe(true);
	});

	it('destroys the stream when the client leaves while the first chunk is pending', async () => {
		const client = new Writable({
			write(_chunk, _encoding, callback) {
				callback();
			},
		});
		const res = Object.assign(client, { status: () => client, setHeader: () => client });
		// A source that never produces a chunk.
		const body = new Readable({ read() {} });

		const sending = sendBinaryResponse(
			res as unknown as Response,
			binaryResponse,
			200,
			'Widgets.method',
			{
				body,
				headers: { 'X-Required': '1' },
			},
		);
		client.destroy();

		await expect(sending).resolves.toBeUndefined();
		expect(body.destroyed).toBe(true);
	});

	it('destroys a stalled stream when the client left before the response started', async () => {
		const client = new Writable({
			write(_chunk, _encoding, callback) {
				callback();
			},
		});
		client.destroy();
		// Let the close event fire before the response starts, so a listener added later never sees it.
		await new Promise((resolve) => setImmediate(resolve));
		const res = Object.assign(client, { status: () => client, setHeader: () => client });
		// A source that never produces a chunk.
		const body = new Readable({ read() {} });

		await expect(
			sendBinaryResponse(res as unknown as Response, binaryResponse, 200, 'Widgets.method', {
				body,
				headers: { 'X-Required': '1' },
			}),
		).resolves.toBeUndefined();

		expect(body.destroyed).toBe(true);
	});

	it('destroys the stream when setting a header throws', async () => {
		const res = mockResponse();
		res.setHeader.mockImplementation(() => {
			throw new Error('Invalid character in header content');
		});
		const body = Readable.from([Buffer.from('x')]);

		await expect(
			sendBinaryResponse(res, binaryResponse, 200, 'Widgets.method', {
				body,
				headers: { 'X-Required': '1' },
			}),
		).rejects.toThrow('Invalid character in header content');

		expect(body.destroyed).toBe(true);
	});
});

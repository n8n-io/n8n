import { ResponseError, STREAM_SEPARATOR, streamRequest, sseStreamRequest } from './utils';

describe('streamRequest', () => {
	it('should stream data from the API endpoint', async () => {
		const encoder = new TextEncoder();
		const mockResponse = new ReadableStream({
			start(controller) {
				controller.enqueue(encoder.encode(`${JSON.stringify({ chunk: 1 })}${STREAM_SEPARATOR}`));
				controller.enqueue(encoder.encode(`${JSON.stringify({ chunk: 2 })}${STREAM_SEPARATOR}`));
				controller.enqueue(encoder.encode(`${JSON.stringify({ chunk: 3 })}${STREAM_SEPARATOR}`));
				controller.close();
			},
		});

		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			body: mockResponse,
		});

		global.fetch = mockFetch;

		const onChunkMock = vi.fn();
		const onDoneMock = vi.fn();
		const onErrorMock = vi.fn();

		await streamRequest(
			{
				baseUrl: 'https://api.example.com',
				pushRef: '',
			},
			'/data',
			{ key: 'value' },
			onChunkMock,
			onDoneMock,
			onErrorMock,
		);

		expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/data', {
			method: 'POST',
			body: JSON.stringify({ key: 'value' }),
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
				'browser-id': expect.stringContaining('-'),
			},
		});

		expect(onChunkMock).toHaveBeenCalledTimes(3);
		expect(onChunkMock).toHaveBeenNthCalledWith(1, { chunk: 1 });
		expect(onChunkMock).toHaveBeenNthCalledWith(2, { chunk: 2 });
		expect(onChunkMock).toHaveBeenNthCalledWith(3, { chunk: 3 });

		expect(onDoneMock).toHaveBeenCalledTimes(1);
		expect(onErrorMock).not.toHaveBeenCalled();
	});

	it('should stream error response with error data from the API endpoint', async () => {
		const testError = { code: 500, message: 'Error happened' };
		const encoder = new TextEncoder();
		const mockResponse = new ReadableStream({
			start(controller) {
				controller.enqueue(encoder.encode(JSON.stringify(testError)));
				controller.close();
			},
		});

		const mockFetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 500,
			statusText: 'Internal Server Error',
			body: mockResponse,
		});

		global.fetch = mockFetch;

		const onChunkMock = vi.fn();
		const onDoneMock = vi.fn();
		const onErrorMock = vi.fn();

		await streamRequest(
			{
				baseUrl: 'https://api.example.com',
				pushRef: '',
			},
			'/data',
			{ key: 'value' },
			onChunkMock,
			onDoneMock,
			onErrorMock,
		);

		expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/data', {
			method: 'POST',
			body: JSON.stringify({ key: 'value' }),
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
				'browser-id': expect.stringContaining('-'),
			},
		});

		expect(onChunkMock).not.toHaveBeenCalled();
		expect(onDoneMock).not.toHaveBeenCalled();
		expect(onErrorMock).toHaveBeenCalledExactlyOnceWith(
			new ResponseError(testError.message, { httpStatusCode: 500 }),
		);
	});

	it('should call onError when stream ends immediately with non-ok status and no chunks', async () => {
		const mockResponse = new ReadableStream({
			start(controller) {
				// Empty stream that just closes without sending any chunks
				controller.close();
			},
		});

		const mockFetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 403,
			statusText: 'Forbidden',
			body: mockResponse,
		});

		global.fetch = mockFetch;

		const onChunkMock = vi.fn();
		const onDoneMock = vi.fn();
		const onErrorMock = vi.fn();

		await streamRequest(
			{
				baseUrl: 'https://api.example.com',
				pushRef: '',
			},
			'/data',
			{ key: 'value' },
			onChunkMock,
			onDoneMock,
			onErrorMock,
		);

		expect(onChunkMock).not.toHaveBeenCalled();
		expect(onDoneMock).not.toHaveBeenCalled();
		expect(onErrorMock).toHaveBeenCalledTimes(1);
		expect(onErrorMock).toHaveBeenCalledExactlyOnceWith(
			new ResponseError('Forbidden', { httpStatusCode: 403 }),
		);
	});

	it('should handle broken stream data', async () => {
		const encoder = new TextEncoder();
		const mockResponse = new ReadableStream({
			start(controller) {
				controller.enqueue(
					encoder.encode(`${JSON.stringify({ chunk: 1 })}${STREAM_SEPARATOR}{"chunk": `),
				);
				controller.enqueue(encoder.encode(`2}${STREAM_SEPARATOR}{"ch`));
				controller.enqueue(encoder.encode('unk":'));
				controller.enqueue(encoder.encode(`3}${STREAM_SEPARATOR}`));
				controller.close();
			},
		});

		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			body: mockResponse,
		});

		global.fetch = mockFetch;

		const onChunkMock = vi.fn();
		const onDoneMock = vi.fn();
		const onErrorMock = vi.fn();

		await streamRequest(
			{
				baseUrl: 'https://api.example.com',
				pushRef: '',
			},
			'/data',
			{ key: 'value' },
			onChunkMock,
			onDoneMock,
			onErrorMock,
		);

		expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/data', {
			method: 'POST',
			body: JSON.stringify({ key: 'value' }),
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
				'browser-id': expect.stringContaining('-'),
			},
		});

		expect(onChunkMock).toHaveBeenCalledTimes(3);
		expect(onChunkMock).toHaveBeenNthCalledWith(1, { chunk: 1 });
		expect(onChunkMock).toHaveBeenNthCalledWith(2, { chunk: 2 });
		expect(onChunkMock).toHaveBeenNthCalledWith(3, { chunk: 3 });

		expect(onDoneMock).toHaveBeenCalledTimes(1);
		expect(onErrorMock).not.toHaveBeenCalled();
	});
});

describe('sseStreamRequest', () => {
	const context = { baseUrl: 'https://api.example.com', pushRef: '' };
	const encoder = new TextEncoder();

	function sseFrame(event: string, data: object | string): string {
		const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
		return `event: ${event}\ndata: ${dataStr}\n\n`;
	}

	it('should parse multiple SSE events and call onChunk for each', async () => {
		const mockResponse = new ReadableStream({
			start(controller) {
				controller.enqueue(
					encoder.encode(
						sseFrame('text-delta', { type: 'text-delta', content: 'Hello' }) +
							sseFrame('text-delta', { type: 'text-delta', content: ' world' }),
					),
				);
				controller.enqueue(encoder.encode('data: [DONE]\n\n'));
				controller.close();
			},
		});

		global.fetch = vi.fn().mockResolvedValue({ ok: true, body: mockResponse });

		const onChunkMock = vi.fn();
		const onDoneMock = vi.fn();
		const onErrorMock = vi.fn();

		await sseStreamRequest(
			context,
			'/data',
			{ key: 'value' },
			onChunkMock,
			onDoneMock,
			onErrorMock,
		);

		expect(onChunkMock).toHaveBeenCalledTimes(2);
		expect(onChunkMock).toHaveBeenNthCalledWith(1, { type: 'text-delta', content: 'Hello' });
		expect(onChunkMock).toHaveBeenNthCalledWith(2, { type: 'text-delta', content: ' world' });
		expect(onDoneMock).toHaveBeenCalledTimes(1);
		expect(onErrorMock).not.toHaveBeenCalled();
	});

	it('should trigger onDone when data: [DONE] is received', async () => {
		const mockResponse = new ReadableStream({
			start(controller) {
				controller.enqueue(
					encoder.encode(sseFrame('text-delta', { type: 'text-delta', content: 'Hi' })),
				);
				controller.enqueue(encoder.encode('data: [DONE]\n\n'));
				controller.close();
			},
		});

		global.fetch = vi.fn().mockResolvedValue({ ok: true, body: mockResponse });

		const onChunkMock = vi.fn();
		const onDoneMock = vi.fn();

		await sseStreamRequest(context, '/data', {}, onChunkMock, onDoneMock);

		expect(onChunkMock).toHaveBeenCalledTimes(1);
		expect(onDoneMock).toHaveBeenCalledTimes(1);
	});

	it('should trigger onError when event: error is received', async () => {
		const mockResponse = new ReadableStream({
			start(controller) {
				controller.enqueue(
					encoder.encode(sseFrame('error', { type: 'error', content: 'An error occurred' })),
				);
				controller.close();
			},
		});

		global.fetch = vi.fn().mockResolvedValue({ ok: true, body: mockResponse });

		const onChunkMock = vi.fn();
		const onDoneMock = vi.fn();
		const onErrorMock = vi.fn();

		await sseStreamRequest(context, '/data', {}, onChunkMock, onDoneMock, onErrorMock);

		expect(onChunkMock).not.toHaveBeenCalled();
		expect(onErrorMock).toHaveBeenCalledTimes(1);
		expect(onErrorMock).toHaveBeenCalledWith(
			new ResponseError('An error occurred', { httpStatusCode: 500 }),
		);
	});

	it('should handle incomplete SSE frames split across chunks', async () => {
		const mockResponse = new ReadableStream({
			start(controller) {
				// First chunk: complete frame + start of second frame
				controller.enqueue(
					encoder.encode(
						sseFrame('text-delta', { type: 'text-delta', content: 'A' }) + 'event: text-delta\nda',
					),
				);
				// Second chunk: rest of second frame
				controller.enqueue(
					encoder.encode(`ta: ${JSON.stringify({ type: 'text-delta', content: 'B' })}\n\n`),
				);
				controller.enqueue(encoder.encode('data: [DONE]\n\n'));
				controller.close();
			},
		});

		global.fetch = vi.fn().mockResolvedValue({ ok: true, body: mockResponse });

		const onChunkMock = vi.fn();
		const onDoneMock = vi.fn();
		const onErrorMock = vi.fn();

		await sseStreamRequest(context, '/data', {}, onChunkMock, onDoneMock, onErrorMock);

		expect(onChunkMock).toHaveBeenCalledTimes(2);
		expect(onChunkMock).toHaveBeenNthCalledWith(1, { type: 'text-delta', content: 'A' });
		expect(onChunkMock).toHaveBeenNthCalledWith(2, { type: 'text-delta', content: 'B' });
		expect(onDoneMock).toHaveBeenCalledTimes(1);
		expect(onErrorMock).not.toHaveBeenCalled();
	});

	it('should skip keep-alive comments', async () => {
		const mockResponse = new ReadableStream({
			start(controller) {
				controller.enqueue(
					encoder.encode(
						sseFrame('text-delta', { type: 'text-delta', content: 'A' }) +
							': ping\n\n' +
							sseFrame('text-delta', { type: 'text-delta', content: 'B' }),
					),
				);
				controller.enqueue(encoder.encode('data: [DONE]\n\n'));
				controller.close();
			},
		});

		global.fetch = vi.fn().mockResolvedValue({ ok: true, body: mockResponse });

		const onChunkMock = vi.fn();
		const onDoneMock = vi.fn();

		await sseStreamRequest(context, '/data', {}, onChunkMock, onDoneMock);

		expect(onChunkMock).toHaveBeenCalledTimes(2);
		expect(onChunkMock).toHaveBeenNthCalledWith(1, { type: 'text-delta', content: 'A' });
		expect(onChunkMock).toHaveBeenNthCalledWith(2, { type: 'text-delta', content: 'B' });
		expect(onDoneMock).toHaveBeenCalledTimes(1);
	});

	it('should call onError on HTTP error status', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 403,
			statusText: 'Forbidden',
			body: new ReadableStream({
				start(c) {
					c.close();
				},
			}),
		});

		const onChunkMock = vi.fn();
		const onDoneMock = vi.fn();
		const onErrorMock = vi.fn();

		await sseStreamRequest(context, '/data', {}, onChunkMock, onDoneMock, onErrorMock);

		expect(onChunkMock).not.toHaveBeenCalled();
		expect(onDoneMock).not.toHaveBeenCalled();
		expect(onErrorMock).toHaveBeenCalledTimes(1);
		expect(onErrorMock).toHaveBeenCalledWith(
			new ResponseError('Forbidden', { httpStatusCode: 403 }),
		);
	});

	it('should support AbortSignal cancellation', async () => {
		const abortController = new AbortController();
		const abortError = new Error('The operation was aborted.');
		abortError.name = 'AbortError';

		global.fetch = vi.fn().mockRejectedValue(abortError);

		const onChunkMock = vi.fn();
		const onDoneMock = vi.fn();
		const onErrorMock = vi.fn();

		abortController.abort();

		await sseStreamRequest(
			context,
			'/data',
			{},
			onChunkMock,
			onDoneMock,
			onErrorMock,
			abortController.signal,
		);

		expect(onChunkMock).not.toHaveBeenCalled();
		expect(onDoneMock).not.toHaveBeenCalled();
		expect(onErrorMock).toHaveBeenCalledTimes(1);
	});

	it('should call onDone when stream ends without [DONE] sentinel', async () => {
		const mockResponse = new ReadableStream({
			start(controller) {
				controller.enqueue(
					encoder.encode(sseFrame('text-delta', { type: 'text-delta', content: 'Hi' })),
				);
				controller.close();
			},
		});

		global.fetch = vi.fn().mockResolvedValue({ ok: true, body: mockResponse });

		const onChunkMock = vi.fn();
		const onDoneMock = vi.fn();
		const onErrorMock = vi.fn();

		await sseStreamRequest(context, '/data', {}, onChunkMock, onDoneMock, onErrorMock);

		expect(onChunkMock).toHaveBeenCalledTimes(1);
		expect(onDoneMock).toHaveBeenCalledTimes(1);
		expect(onErrorMock).not.toHaveBeenCalled();
	});
});

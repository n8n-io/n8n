import { ResponseError, STREAM_SEPARATOR, streamRequest } from './utils';

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

	it('should stream error response from the API endpoint', async () => {
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
		expect(onErrorMock).toHaveBeenCalledTimes(1);
		expect(onErrorMock).toHaveBeenCalledWith(new ResponseError(testError.message));
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

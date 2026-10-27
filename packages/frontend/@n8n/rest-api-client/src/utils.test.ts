import {
	MfaRequiredError,
	ResponseError,
	STREAM_SEPARATOR,
	request,
	requestResponse,
	setUnauthorizedHandler,
	streamRequest,
} from './utils';

const { axiosRequest } = vi.hoisted(() => ({ axiosRequest: vi.fn() }));

vi.mock('axios', () => ({
	default: { request: axiosRequest },
}));

describe('request', () => {
	afterEach(() => {
		setUnauthorizedHandler(() => {});
	});

	const baseConfig = {
		method: 'GET' as const,
		baseURL: 'https://api.example.com',
		endpoint: '/workflows',
	};

	it('calls the registered unauthorized handler with the request baseURL on a 401 response', async () => {
		axiosRequest.mockRejectedValueOnce({
			response: { status: 401, data: { message: 'Unauthorized' } },
		});

		const handler = vi.fn();
		setUnauthorizedHandler(handler);

		await expect(request(baseConfig)).rejects.toThrow('Unauthorized');

		expect(handler).toHaveBeenCalledExactlyOnceWith(baseConfig.baseURL);
	});

	it('does not call the unauthorized handler on a non-401 error response', async () => {
		axiosRequest.mockRejectedValueOnce({
			response: { status: 500, data: { message: 'Internal Server Error' } },
		});

		const handler = vi.fn();
		setUnauthorizedHandler(handler);

		await expect(request(baseConfig)).rejects.toThrow('Internal Server Error');

		expect(handler).not.toHaveBeenCalled();
	});

	it('does not call the unauthorized handler on a 401 that is actually an MFA-required response', async () => {
		axiosRequest.mockRejectedValueOnce({
			response: { status: 401, data: { message: 'Unauthorized', mfaRequired: true } },
		});

		const handler = vi.fn();
		setUnauthorizedHandler(handler);

		await expect(request(baseConfig)).rejects.toThrow(MfaRequiredError);

		expect(handler).not.toHaveBeenCalled();
	});
});

describe('requestResponse', () => {
	afterEach(() => {
		setUnauthorizedHandler(() => {});
	});

	const baseConfig = {
		method: 'GET' as const,
		baseURL: 'https://api.example.com',
		endpoint: '/export',
	};

	it('returns the whole response and passes the response type to axios', async () => {
		const blob = new Blob(['a,b\r\n']);
		const response = { data: blob, headers: { 'content-disposition': 'attachment' }, status: 200 };
		axiosRequest.mockResolvedValueOnce(response);

		const result = await requestResponse({ ...baseConfig, responseType: 'blob' });

		expect(result).toBe(response);
		expect(axiosRequest).toHaveBeenCalledWith(expect.objectContaining({ responseType: 'blob' }));
	});

	/** A JSON error body as a Blob. jsdom's Blob has no `text()`, which every browser has. */
	function jsonBlob(body: object): Blob {
		const text = JSON.stringify(body);
		const blob = new Blob([text]);
		Object.defineProperty(blob, 'text', { value: async () => text });
		return blob;
	}

	it('reads a blob error body, so an MFA-required 401 on a blob request is still recognised', async () => {
		axiosRequest.mockRejectedValueOnce({
			response: { status: 401, data: jsonBlob({ message: 'Unauthorized', mfaRequired: true }) },
		});
		const handler = vi.fn();
		setUnauthorizedHandler(handler);

		await expect(requestResponse({ ...baseConfig, responseType: 'blob' })).rejects.toThrow(
			MfaRequiredError,
		);

		expect(handler).not.toHaveBeenCalled();
	});

	it('throws the server message from a blob error body', async () => {
		axiosRequest.mockRejectedValueOnce({
			response: { status: 403, data: jsonBlob({ message: 'Forbidden' }) },
		});

		await expect(requestResponse({ ...baseConfig, responseType: 'blob' })).rejects.toMatchObject({
			message: 'Forbidden',
			httpStatusCode: 403,
		});
	});

	it('keeps the top-level issues of an error body in meta', async () => {
		const issues = [{ type: 'missing-node-type', nodeType: 'n8n-nodes-base.foo' }];
		axiosRequest.mockRejectedValueOnce({
			response: { status: 422, data: { message: 'Import blocked', meta: { a: 1 }, issues } },
		});

		await expect(requestResponse({ ...baseConfig, method: 'POST' })).rejects.toMatchObject({
			message: 'Import blocked',
			httpStatusCode: 422,
			meta: { a: 1, issues },
		});
	});
});

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

	it('should call onError when an ok stream ends with unparseable leftover content', async () => {
		const encoder = new TextEncoder();
		const mockResponse = new ReadableStream({
			start(controller) {
				controller.enqueue(encoder.encode(`${JSON.stringify({ chunk: 1 })}${STREAM_SEPARATOR}`));
				// Plain-text error body appended to an already-started 200 stream
				controller.enqueue(encoder.encode('Something went wrong. Please try again later.'));
				controller.close();
			},
		});

		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
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

		expect(onChunkMock).toHaveBeenCalledExactlyOnceWith({ chunk: 1 });
		expect(onDoneMock).not.toHaveBeenCalled();
		expect(onErrorMock).toHaveBeenCalledExactlyOnceWith(
			new Error('Something went wrong. Please try again later.'),
		);
	});

	it('should call onError with a generic message when the stream is cut off mid-JSON', async () => {
		const encoder = new TextEncoder();
		const mockResponse = new ReadableStream({
			start(controller) {
				controller.enqueue(encoder.encode(`${JSON.stringify({ chunk: 1 })}${STREAM_SEPARATOR}`));
				// Stream ends abruptly in the middle of a JSON chunk
				controller.enqueue(encoder.encode('{"sessionId":"abc","messages":[{"role":"assi'));
				controller.close();
			},
		});

		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
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

		expect(onChunkMock).toHaveBeenCalledExactlyOnceWith({ chunk: 1 });
		expect(onDoneMock).not.toHaveBeenCalled();
		expect(onErrorMock).toHaveBeenCalledExactlyOnceWith(new Error('Connection lost'));
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

import axios from 'axios';

import { get, PublicApiResponseError } from './utils';

vi.mock('axios', () => ({
	default: {
		request: vi.fn(),
		isAxiosError: vi.fn(),
	},
}));

const context = { baseUrl: 'https://n8n.example.com/api/v1' };

describe('public-api-client utils', () => {
	afterEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	describe('get', () => {
		it('sends a GET request with the browser-id header and credentials included', async () => {
			vi.mocked(axios.request).mockResolvedValue({ data: { total: { value: 1 } } });

			const result = await get(context, '/insights/summary', { startDate: '2025-01-01' });

			expect(axios.request).toHaveBeenCalledWith({
				method: 'GET',
				baseURL: context.baseUrl,
				url: '/insights/summary',
				headers: { 'browser-id': expect.any(String) },
				withCredentials: true,
				params: { startDate: '2025-01-01' },
				paramsSerializer: expect.any(Function),
			});
			expect(result).toEqual({ total: { value: 1 } });
		});

		it('reuses the same browser id across calls', async () => {
			vi.mocked(axios.request).mockResolvedValue({ data: {} });

			await get(context, '/insights/summary');
			await get(context, '/insights/summary');

			const [firstCall, secondCall] = vi.mocked(axios.request).mock.calls;
			expect(firstCall[0].headers?.['browser-id']).toEqual(secondCall[0].headers?.['browser-id']);
		});

		it('percent-encodes reserved characters in query params, unlike axios defaults', async () => {
			vi.mocked(axios.request).mockResolvedValue({ data: {} });

			await get(context, '/insights/summary', {
				startDate: '2026-05-20T23:59:59Z',
				endDate: '2026-05-21T23:59:59Z',
			});

			const { paramsSerializer } = vi.mocked(axios.request).mock.calls[0][0];
			if (typeof paramsSerializer !== 'function') {
				throw new Error('Expected paramsSerializer to be a function');
			}
			expect(
				paramsSerializer({ startDate: '2026-05-20T23:59:59Z', endDate: '2026-05-21T23:59:59Z' }),
			).toBe('startDate=2026-05-20T23%3A59%3A59Z&endDate=2026-05-21T23%3A59%3A59Z');
		});
	});

	describe('error handling', () => {
		it('throws a PublicApiResponseError with the server message and status code', async () => {
			const axiosError = {
				response: { status: 404, data: { message: 'Not found' } },
			};
			vi.mocked(axios.request).mockRejectedValue(axiosError);
			vi.mocked(axios.isAxiosError).mockReturnValue(true);

			await expect(get(context, '/insights/summary')).rejects.toMatchObject({
				name: 'PublicApiResponseError',
				message: 'Not found',
				httpStatusCode: 404,
			});
		});

		it('falls back to the generic error message when the response has none', async () => {
			vi.mocked(axios.request).mockRejectedValue(new Error('Network Error'));
			vi.mocked(axios.isAxiosError).mockReturnValue(false);

			await expect(get(context, '/insights/summary')).rejects.toMatchObject({
				name: 'PublicApiResponseError',
				message: 'Network Error',
				httpStatusCode: undefined,
			});
		});
	});
});

describe('PublicApiResponseError', () => {
	it('carries the http status code', () => {
		const error = new PublicApiResponseError('boom', 500);

		expect(error.message).toBe('boom');
		expect(error.httpStatusCode).toBe(500);
		expect(error.name).toBe('PublicApiResponseError');
	});
});

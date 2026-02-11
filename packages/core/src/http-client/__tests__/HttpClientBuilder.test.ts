import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, IHttpRequestOptions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { httpClient } from '../HttpClientBuilder';

const mockNode = mock<INode>({ name: 'TestNode', type: 'test', typeVersion: 1 });

function createMockContext(httpRequestFn?: jest.Mock, httpRequestWithAuthFn?: jest.Mock) {
	const httpRequest = httpRequestFn ?? jest.fn().mockResolvedValue({});
	const httpRequestWithAuthentication = httpRequestWithAuthFn ?? jest.fn().mockResolvedValue({});

	const context = {
		getNode: jest.fn().mockReturnValue(mockNode),
		helpers: {
			httpRequest,
			httpRequestWithAuthentication,
		},
	} as unknown as IExecuteFunctions;

	return context;
}

describe('HttpClientBuilder', () => {
	describe('builder assembly', () => {
		it('should assemble correct IHttpRequestOptions', async () => {
			const httpRequest = jest.fn().mockResolvedValue({ data: 'test' });
			const ctx = createMockContext(httpRequest);

			await httpClient(ctx)
				.baseUrl('https://api.example.com')
				.endpoint('/users')
				.method('POST')
				.body({ name: 'Alice' })
				.query({ active: 'true' })
				.headers({ 'X-Custom': 'value' })
				.execute();

			expect(httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					baseURL: 'https://api.example.com',
					url: '/users',
					method: 'POST',
					body: { name: 'Alice' },
					qs: { active: 'true' },
					headers: { 'X-Custom': 'value' },
				}),
			);
		});

		it('should clean empty body objects', async () => {
			const httpRequest = jest.fn().mockResolvedValue({});
			const ctx = createMockContext(httpRequest);

			await httpClient(ctx).endpoint('/test').method('POST').body({}).execute();

			const calledOptions = httpRequest.mock.calls[0][0] as IHttpRequestOptions;
			expect(calledOptions.body).toBeUndefined();
		});

		it('should clean empty query objects', async () => {
			const httpRequest = jest.fn().mockResolvedValue({});
			const ctx = createMockContext(httpRequest);

			await httpClient(ctx).endpoint('/test').query({}).execute();

			const calledOptions = httpRequest.mock.calls[0][0] as IHttpRequestOptions;
			expect(calledOptions.qs).toBeUndefined();
		});

		it('should remove body from GET requests', async () => {
			const httpRequest = jest.fn().mockResolvedValue({});
			const ctx = createMockContext(httpRequest);

			await httpClient(ctx)
				.endpoint('/test')
				.method('GET')
				.body({ should: 'be removed' })
				.execute();

			const calledOptions = httpRequest.mock.calls[0][0] as IHttpRequestOptions;
			expect(calledOptions.body).toBeUndefined();
		});
	});

	describe('authentication', () => {
		it('should use httpRequestWithAuthentication when credential type is set', async () => {
			const httpRequestWithAuth = jest.fn().mockResolvedValue({ ok: true });
			const ctx = createMockContext(undefined, httpRequestWithAuth);

			await httpClient(ctx).endpoint('/test').withAuthentication('testApi').execute();

			expect(httpRequestWithAuth).toHaveBeenCalledWith('testApi', expect.any(Object));
		});

		it('should use httpRequest when no credential type is set', async () => {
			const httpRequest = jest.fn().mockResolvedValue({ ok: true });
			const ctx = createMockContext(httpRequest);

			await httpClient(ctx).endpoint('/test').execute();

			expect(httpRequest).toHaveBeenCalled();
		});
	});

	describe('error handling', () => {
		it('should wrap errors as NodeApiError', async () => {
			const error = new Error('Connection refused');
			const httpRequest = jest.fn().mockRejectedValue(error);
			const ctx = createMockContext(httpRequest);

			await expect(httpClient(ctx).endpoint('/test').execute()).rejects.toThrow(NodeApiError);
		});
	});

	describe('executeAll without pagination', () => {
		it('should throw when pagination is not configured', async () => {
			const ctx = createMockContext();

			await expect(httpClient(ctx).endpoint('/test').executeAll()).rejects.toThrow(
				'executeAll() requires withPagination() to be configured',
			);
		});
	});
});

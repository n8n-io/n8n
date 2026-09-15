import type {
	IDataObject,
	IExecuteFunctions,
	INode,
	IRequestOptions,
	IWorkflowDataProxyAdditionalKeys,
	PaginationOptions,
} from 'n8n-workflow';

import { applyPaginationRequestData, requestWithAuthenticationPaginated } from '../pagination';

describe('applyPaginationRequestData', () => {
	test('should merge pagination request data with original request options', () => {
		const originalRequestOptions: IRequestOptions = {
			uri: 'https://original.com/api',
			method: 'GET',
			qs: { page: 1 },
			headers: { 'X-Original-Header': 'original' },
		};

		const paginationRequestData: PaginationOptions['request'] = {
			url: 'https://pagination.com/api',
			body: { key: 'value' },
			headers: { 'X-Pagination-Header': 'pagination' },
		};

		const result = applyPaginationRequestData(originalRequestOptions, paginationRequestData);

		expect(result).toEqual({
			uri: 'https://pagination.com/api',
			url: 'https://pagination.com/api',
			method: 'GET',
			qs: { page: 1 },
			headers: {
				'X-Original-Header': 'original',
				'X-Pagination-Header': 'pagination',
			},
			body: { key: 'value' },
		});
	});

	test('should handle formData correctly', () => {
		const originalRequestOptions: IRequestOptions = {
			uri: 'https://original.com/api',
			method: 'POST',
			formData: { original: 'data' },
		};

		const paginationRequestData: PaginationOptions['request'] = {
			url: 'https://pagination.com/api',
			body: { key: 'value' },
		};

		const result = applyPaginationRequestData(originalRequestOptions, paginationRequestData);

		expect(result).toEqual({
			uri: 'https://pagination.com/api',
			url: 'https://pagination.com/api',
			method: 'POST',
			formData: { key: 'value', original: 'data' },
		});
	});

	test('should handle form data correctly', () => {
		const originalRequestOptions: IRequestOptions = {
			uri: 'https://original.com/api',
			method: 'POST',
			form: { original: 'data' },
		};

		const paginationRequestData: PaginationOptions['request'] = {
			url: 'https://pagination.com/api',
			body: { key: 'value' },
		};

		const result = applyPaginationRequestData(originalRequestOptions, paginationRequestData);

		expect(result).toEqual({
			uri: 'https://pagination.com/api',
			url: 'https://pagination.com/api',
			method: 'POST',
			form: { key: 'value', original: 'data' },
		});
	});

	test('should prefer pagination body over original body', () => {
		const originalRequestOptions: IRequestOptions = {
			uri: 'https://original.com/api',
			method: 'POST',
			body: { original: 'data' },
		};

		const paginationRequestData: PaginationOptions['request'] = {
			url: 'https://pagination.com/api',
			body: { key: 'value' },
		};

		const result = applyPaginationRequestData(originalRequestOptions, paginationRequestData);

		expect(result).toEqual({
			uri: 'https://pagination.com/api',
			url: 'https://pagination.com/api',
			method: 'POST',
			body: { key: 'value', original: 'data' },
		});
	});

	test('should merge complex request options', () => {
		const originalRequestOptions: IRequestOptions = {
			uri: 'https://original.com/api',
			method: 'GET',
			qs: { page: 1, limit: 10 },
			headers: { 'X-Original-Header': 'original' },
			body: { filter: 'active' },
		};

		const paginationRequestData: PaginationOptions['request'] = {
			url: 'https://pagination.com/api',
			body: { key: 'value' },
			headers: { 'X-Pagination-Header': 'pagination' },
			qs: { offset: 20 },
		};

		const result = applyPaginationRequestData(originalRequestOptions, paginationRequestData);

		expect(result).toEqual({
			uri: 'https://pagination.com/api',
			url: 'https://pagination.com/api',
			method: 'GET',
			qs: { offset: 20, limit: 10, page: 1 },
			headers: {
				'X-Original-Header': 'original',
				'X-Pagination-Header': 'pagination',
			},
			body: { key: 'value', filter: 'active' },
		});
	});

	test('should not re-apply qs keys already embedded in the next-page URL', () => {
		// When the next-page URL already carries a query param, keeping it in qs would
		// make the HTTP client duplicate it, which some APIs reject.
		const originalRequestOptions: IRequestOptions = {
			uri: 'https://graph.microsoft.com/v1.0/users',
			method: 'GET',
			qs: { $select: 'id,displayName' },
		};

		const paginationRequestData: PaginationOptions['request'] = {
			url: 'https://graph.microsoft.com/v1.0/users?$select=id,displayName&$skip=100',
		};

		const result = applyPaginationRequestData(originalRequestOptions, paginationRequestData);

		// The next-page URL already contains $select; the stale qs must not carry it over,
		// otherwise it gets duplicated by the HTTP client.
		expect(result.qs?.$select).toBeUndefined();
	});

	test('should keep the original qs when the next-page URL is relative/unparseable', () => {
		// A relative next-page URL can't be parsed, so there are no embedded params
		// to reconcile against - the original qs must be preserved untouched.
		const originalRequestOptions: IRequestOptions = {
			uri: 'https://graph.microsoft.com/v1.0/users',
			method: 'GET',
			qs: { $select: 'id,displayName' },
		};

		const paginationRequestData: PaginationOptions['request'] = {
			url: 'users?$skip=100',
		};

		const result = applyPaginationRequestData(originalRequestOptions, paginationRequestData);

		expect(result.qs).toEqual({ $select: 'id,displayName' });
	});

	test('should not throw when there is no qs and the next-page URL carries params', () => {
		const originalRequestOptions: IRequestOptions = {
			uri: 'https://graph.microsoft.com/v1.0/users',
			method: 'GET',
		};

		const paginationRequestData: PaginationOptions['request'] = {
			url: 'https://graph.microsoft.com/v1.0/users?$select=id&$skip=100',
		};

		const result = applyPaginationRequestData(originalRequestOptions, paginationRequestData);

		expect(result.qs).toBeUndefined();
	});

	test('should handle edge cases with empty pagination data', () => {
		const originalRequestOptions: IRequestOptions = {
			uri: 'https://original.com/api',
			method: 'GET',
		};

		const paginationRequestData: PaginationOptions['request'] = {};

		const result = applyPaginationRequestData(originalRequestOptions, paginationRequestData);

		expect(result).toEqual({
			uri: 'https://original.com/api',
			method: 'GET',
		});
	});
});

describe('requestWithAuthenticationPaginated', () => {
	const node = { typeVersion: 1 } as INode;

	const setup = () => {
		const requestOptions: IRequestOptions = {
			uri: 'https://example.com',
			headers: { 'x-secret': 'live-secret' },
		};

		const paginationOptions = {
			continue: '={{ false }}',
			request: { url: 'https://example.com/page' },
			maxRequests: 1,
		} as unknown as PaginationOptions;

		const capturedKeys: IWorkflowDataProxyAdditionalKeys[] = [];
		const resolveValue = vi.fn((parameterValue, _i, _r, _e, additionalKeys) => {
			if (additionalKeys) capturedKeys.push(additionalKeys);
			// The pagination request data is resolved at the top of each loop iteration
			if (parameterValue === paginationOptions.request) {
				return { url: 'https://example.com/page' };
			}
			// maxRequests -> stop after the first page
			return 1;
		});

		const request = vi.fn().mockResolvedValue({ body: {}, headers: {}, statusCode: 200 });
		const ctx = { helpers: { request } } as unknown as IExecuteFunctions;

		return { ctx, requestOptions, paginationOptions, resolveValue, request, capturedKeys };
	};

	test('exposes the provided sanitized request to pagination expressions', async () => {
		const { ctx, requestOptions, paginationOptions, resolveValue, capturedKeys } = setup();

		const sanitizedRequest: IDataObject = {
			uri: 'https://example.com',
			headers: { 'x-secret': '**hidden**' },
		};

		await requestWithAuthenticationPaginated.call(
			ctx,
			requestOptions,
			0,
			paginationOptions,
			resolveValue,
			node,
			undefined,
			undefined,
			sanitizedRequest,
		);

		expect(capturedKeys.length).toBeGreaterThan(0);
		expect(capturedKeys[0].$request).toBe(sanitizedRequest);
		expect((capturedKeys[0].$request as IDataObject).headers).toEqual({ 'x-secret': '**hidden**' });
	});

	test('uses the unmodified request options for the actual outgoing request', async () => {
		const { ctx, requestOptions, paginationOptions, resolveValue, request } = setup();

		const sanitizedRequest: IDataObject = {
			uri: 'https://example.com',
			headers: { 'x-secret': '**hidden**' },
		};

		await requestWithAuthenticationPaginated.call(
			ctx,
			requestOptions,
			0,
			paginationOptions,
			resolveValue,
			node,
			undefined,
			undefined,
			sanitizedRequest,
		);

		expect(request).toHaveBeenCalledTimes(1);
		const sentOptions = request.mock.calls[0][0] as IRequestOptions;
		expect((sentOptions.headers as IDataObject)['x-secret']).toBe('live-secret');
	});

	test('falls back to the request options when no sanitized request is provided', async () => {
		const { ctx, requestOptions, paginationOptions, resolveValue, capturedKeys } = setup();

		await requestWithAuthenticationPaginated.call(
			ctx,
			requestOptions,
			0,
			paginationOptions,
			resolveValue,
			node,
		);

		expect(capturedKeys[0].$request).toBe(requestOptions);
	});
});
